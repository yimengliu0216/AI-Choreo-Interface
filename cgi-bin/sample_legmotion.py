
from utils.fixseed import fixseed
import os
import numpy as np
import torch
from utils.parser_util import sample_args
from utils.model_util import create_model_and_diffusion, create_model_and_diffusion_quality_edit, load_model_wo_clip, load_model
from utils import dist_util
from model.cfg_sampler import ClassifierFreeSampleModel
from data_loaders.get_data import get_dataset_loader
from data_loaders.humanml.scripts.motion_process import recover_from_ric
import data_loaders.humanml.utils.paramUtil as paramUtil
from data_loaders.humanml.utils.plot_script import plot_3d_motion
from data_loaders import humanml_utils
import torch.nn.functional as F
from functools import partial
import shutil
from data_loaders.tensors import collate
import hashlib
import cv2
import pickle
from concurrent.futures import ThreadPoolExecutor as Executor

import sys
# sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cgi-bin'))

import visualize.vis_utils
from utils.parser_util import sample_args, edit_args
import json

class Sampler:
    def __init__(self, args):
        print('Loading dataset...')
        self.max_frames = 196 if args.dataset in ['kit', 'humanml'] else 60
        self.fps = 12.5 if args.dataset == 'kit' else 20
        
        self.data = get_dataset_loader(name=args.dataset,
                                batch_size=args.batch_size,
                                num_frames=self.max_frames,
                                split='test',
                                hml_mode='text_only')
        # self.data.fixed_length = n_frames
        # total_num_samples = args.num_samples * args.num_repetitions

        print("Creating model and diffusion...")
        self.model, self.diffusion = create_model_and_diffusion(args, self.data)

        print(f"Loading checkpoints from [{args.model_path}]...")
        state_dict = torch.load(args.model_path, map_location='cpu')
        load_model_wo_clip(self.model, state_dict)
        self.device = args.device
        self.output_dir = args.output_dir
        self.guidance_param = args.guidance_param
        self.num_samples = 1
        self.num_repetitions = args.num_repetitions

    def save_first_frame(self, video_path): # save first frame for motion preview (skeleton)
        vidcap = cv2.VideoCapture(video_path)
        success, image = vidcap.read()
        if success:
            cv2.imwrite(video_path[:-4] + '.png', image)     

    def save_pkl_mp4(self, out_path, ret_dict): # pkl stores motion info, mp4 stores skeleton motion in a video
        if not os.path.exists(out_path):
            os.makedirs(out_path)

        all_save_files = []

        skeleton = paramUtil.t2m_kinematic_chain
        for sample_i in range(self.num_samples):
            for rep_i in range(self.num_repetitions):
                # caption = all_text[rep_i*args.batch_size + sample_i]
                index = rep_i*self.num_samples + sample_i
                length = ret_dict['lengths'][index]
                motion = np.ascontiguousarray(ret_dict['motion'][[index],:,:,:length])
                motion_raw = np.ascontiguousarray(ret_dict['motion_raw'][[index],:,:,:length])
                text = ret_dict['text'][index]
                save_file = hashlib.sha256(motion.data).hexdigest()
                pkl_save_path = os.path.join(out_path, save_file + '.pkl' )
                with open(pkl_save_path, 'wb') as f:
                    pickle.dump(
                        {'motion': motion, 'motion_raw': motion_raw, 'text': [text], 
                        'lengths': np.array([length]), 'num_samples': 1, 'num_repetitions': 1},
                        f)
                
                animation_save_path = os.path.join(out_path, save_file + '.mp4')
                motion *= 1.3  # scale for visualization
                plot_3d_motion(animation_save_path, skeleton, motion[0].transpose(2, 0, 1), dataset=self.data.dataset, fps=self.fps)

                self.save_first_frame(animation_save_path)

                all_save_files.append(animation_save_path.replace('.mp4', ''))

        return all_save_files
    
    def partial_edit(self, active_url, partial_body, partial_body_text):
        self.num_samples = 1
        self.num_repetitions = 1

        with open(active_url + '.pkl', 'rb') as f:
            active_motion = pickle.load(f)
        
        texts = [partial_body_text]
        active_motion_raw = active_motion['motion_raw']
        
        n_frames = int(active_motion['lengths'])

        partial_edit_motion = torch.from_numpy(active_motion_raw).to(dist_util.dev())

        _, model_kwargs = collate(
            [{'inp': torch.tensor([[0.]]), 'target': 0, 'text': txt, 'tokens': None, 'lengths': n_frames}
            for txt in texts] * self.num_repetitions
        )
        model_kwargs['y']['text'] = partial_body_text
        model_kwargs['y']['inpainted_motion'] = partial_edit_motion
        model_kwargs['y']['inpainting_mask'] = torch.ones_like(partial_edit_motion, dtype=torch.bool)    

        if partial_body == 'Upper Body':
            model_kwargs['y']['inpainting_mask'] = torch.tensor(humanml_utils.HML_LOWER_BODY_MASK, 
                                                    dtype=torch.bool,
                                                    device=partial_edit_motion.device)  # True is lower body data
            model_kwargs['y']['inpainting_mask'] = model_kwargs['y']['inpainting_mask'].unsqueeze(0).unsqueeze(-1).unsqueeze(-1).repeat(
                                                    partial_edit_motion.shape[0], 
                                                    1, 
                                                    partial_edit_motion.shape[2], 
                                                    partial_edit_motion.shape[3])
        if partial_body == 'Lower Body':
            model_kwargs['y']['inpainting_mask'] = torch.tensor(humanml_utils.HML_UPPER_BODY_MASK, 
                                                    dtype=torch.bool,
                                                    device=partial_edit_motion.device)  # True is upper body data
            model_kwargs['y']['inpainting_mask'] = model_kwargs['y']['inpainting_mask'].unsqueeze(0).unsqueeze(-1).unsqueeze(-1).repeat(
                                                    partial_edit_motion.shape[0], 
                                                    1, 
                                                    partial_edit_motion.shape[2], 
                                                    partial_edit_motion.shape[3])

        # load model
        if self.guidance_param != 1:
            model = ClassifierFreeSampleModel(self.model)
        else:
            model = self.model
        model.to(dist_util.dev())
        model.eval()  # disable random masking

        # start sampling
        all_motions = []
        all_motions_raw = []
        all_lengths = []
        all_text = []
        num_samples = 1
        if 1:
            print(f'### Start sampling')

            # add CFG scale to batch
            if self.guidance_param != 1:
                model_kwargs['y']['scale'] = torch.ones(num_samples, device=dist_util.dev()) * self.guidance_param

            sample_fn = self.diffusion.p_sample_loop

            sample = sample_fn(
                self.model,
                (num_samples, model.njoints, model.nfeats, n_frames),
                clip_denoised=False,
                model_kwargs=model_kwargs,
                skip_timesteps=0,  # 0 is the default value - i.e. don't skip any step
                init_image=None,
                progress=True,
                dump_steps=None,
                noise=None,
                const_noise=False,
            )

            sample = sample.cpu()

            all_motions_raw.append(sample.numpy())
            # Recover XYZ *positions* from HumanML3D vector representation
            if model.data_rep == 'hml_vec':
                n_joints = 22 if sample.shape[1] == 263 else 21
                sample = self.data.dataset.t2m_dataset.inv_transform(sample.permute(0, 2, 3, 1)).float()
                sample = recover_from_ric(sample, n_joints)
                sample = sample.view(-1, *sample.shape[2:]).permute(0, 2, 3, 1)

            all_text += model_kwargs['y']['text']
            all_motions.append(sample.numpy())
            all_lengths.append(model_kwargs['y']['lengths'].cpu().numpy())

            print(f"created {len(all_motions) * num_samples } samples")

        all_motions = np.concatenate(all_motions, axis=0)
        all_motions_raw = np.concatenate(all_motions_raw, axis=0) # [total_num_samples, 263, 1, length]
        all_lengths = np.concatenate(all_lengths, axis=0) 


        ret_dict = {
            'motion': all_motions, 
            'motion_raw': all_motions_raw, 
            'text': all_text, 
            'lengths': all_lengths,
            'num_samples': num_samples, 
            'num_repetitions': self.num_repetitions
        }

        # save ret_dict as npy and animations for video display as mp4
        out_path = os.path.join(active_url + '_partialbody')
        all_save_files = self.save_pkl_mp4(out_path, ret_dict)

        return ret_dict, all_save_files
    

if __name__ == '__main__':
    args = sample_args()
    # fixseed(args.seed)
    sampler = Sampler(args)
    renderer = visualize.vis_utils.npyobj2dict()
    executer = Executor()

    motion_dir = 'vr_motion_input/vr_motion_1/vr_motion_1'
    partial_body = 'Lower Body'
    partial_body_text = 'The person is dancing.'
    # sampler.partial_edit(motion_dir, partial_body, partial_body_text)

    motion, all_save_files = sampler.partial_edit(motion_dir, partial_body, partial_body_text) # motion, partial body, text
    for fn in all_save_files:
        executer.submit(renderer.render2json, fn + '.pkl', fn + '.json')
    
    motion_json = json.dumps(renderer.render(motion))
