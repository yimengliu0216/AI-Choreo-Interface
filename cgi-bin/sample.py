# This code is based on https://github.com/openai/guided-diffusion
"""
Generate a large batch of image samples from a model and save them as a large
numpy array. This can be used to produce samples for FID evaluation.
"""
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

    def save_npy_mp4(self, out_path, ret_dict): # npy stores motion info, mp4 stores skeleton motion in a video
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
                npy_save_path = os.path.join(out_path, save_file + '.pkl' )
                with open(npy_save_path, 'wb') as f:
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

    def text_to_raw_motion(self, model_kwargs, model, n_frames):
        all_motions = []
        num_samples = 1

        # add CFG scale to batch
        if self.guidance_param != 1:
            model_kwargs['y']['scale'] = torch.ones(num_samples * self.num_repetitions, device=dist_util.dev()) * self.guidance_param
        
        sample_fn = self.diffusion.p_sample_loop

        sample = sample_fn(
            self.model,
            (num_samples * self.num_repetitions, model.njoints, model.nfeats, n_frames),
            clip_denoised=False,
            model_kwargs=model_kwargs,
            skip_timesteps=0,  
            init_image=None,
            progress=True,
            dump_steps=None,
            noise=None,
            const_noise=False,
            resizers=None,
            range_t=None
        )

        all_motions.append(sample.cpu())
        all_motions = torch.concat(all_motions, axis=0)
        
        return all_motions

    def infer(self, text_prompt, motion_length):
       
        out_path = os.path.join(
            self.output_dir, 
            text_prompt[0:30].replace(' ', '_') + '@' + hashlib.sha256(text_prompt.encode()).hexdigest())
        
        n_frames = min(self.max_frames, int(motion_length*self.fps))
        
        dist_util.setup_dist(self.device)
        
        texts = [text_prompt]
        num_samples = 1

        if self.guidance_param != 1:
            model = ClassifierFreeSampleModel(self.model)   # wrapping model with the classifier-free sampler
        else:
            model = self.model
        model.to(dist_util.dev())
        model.eval()  # disable random masking


        _, model_kwargs = collate(
            [{'inp': torch.tensor([[0.]]), 'target': 0, 'text': txt, 'tokens': None, 'lengths': n_frames}
            for txt in texts] * self.num_repetitions
        )

        resizers = range_t = None

        all_motions = []
        all_motions_raw = []
        all_lengths = []
        all_text = []

        # for rep_i in range(self.num_repetitions):
        if 1:
            print(f'### Start sampling')

            # add CFG scale to batch
            if self.guidance_param != 1:
                model_kwargs['y']['scale'] = torch.ones(num_samples * self.num_repetitions, device=dist_util.dev()) * self.guidance_param

            sample_fn = self.diffusion.p_sample_loop

            sample = sample_fn(
                self.model,
                (num_samples * self.num_repetitions, model.njoints, model.nfeats, n_frames),
                clip_denoised=False,
                model_kwargs=model_kwargs,
                skip_timesteps=0,  # 0 is the default value - i.e. don't skip any step
                init_image=None,
                progress=True,
                dump_steps=None,
                noise=None,
                const_noise=False,
                resizers=resizers,
                range_t=range_t
            )


            all_motions_raw.append(sample.cpu().numpy())
            # Recover XYZ *positions* from HumanML3D vector representation
            if model.data_rep == 'hml_vec':
                n_joints = 22 if sample.shape[1] == 263 else 21
                sample = self.data.dataset.t2m_dataset.inv_transform(sample.cpu().permute(0, 2, 3, 1)).float()
                sample = recover_from_ric(sample, n_joints)
                sample = sample.view(-1, *sample.shape[2:]).permute(0, 2, 3, 1)

            all_text += model_kwargs['y']['text']
            all_motions.append(sample.cpu().numpy())
            all_lengths.append(model_kwargs['y']['lengths'].cpu().numpy())

            print(f"created {len(all_motions) * num_samples * self.num_repetitions} samples")


        all_motions = np.concatenate(all_motions, axis=0)
        all_motions_raw = np.concatenate(all_motions_raw, axis=0) # [total_num_samples, 263, 1, length]
        # all_motions = all_motions[:total_num_samples]  # [bs, njoints, 6, seqlen]
        # all_text = all_text[:total_num_samples]
        all_lengths = np.concatenate(all_lengths, axis=0) #[:total_num_samples]

        ret_dict = {
            'motion': all_motions, 
            'motion_raw': all_motions_raw, 
            'text': all_text, 
            'lengths': all_lengths,
            'num_samples': num_samples, 
            'num_repetitions': self.num_repetitions
        }

        # save ret_dict as npy and animations for video display as mp4
        all_save_files = self.save_npy_mp4(out_path, ret_dict)

        return ret_dict, all_save_files
    
    def extend(self, active_url, extend_len):
        with open(active_url + '.pkl', 'rb') as f:
            active_motion = pickle.load(f)
        
        active_motion_text = active_motion['text']
        texts = [active_motion_text]
        active_motion_raw = active_motion['motion_raw']
        
        outpainting_frames = int(extend_len) * self.fps
        surfix_frames = 4 * self.fps # use the last 4s motion as condition for expanding
        outpainting_total_frames = surfix_frames + outpainting_frames
        n_frames = outpainting_total_frames

        extend_motion = np.zeros((list(active_motion_raw.shape[:-1]) + [n_frames]), dtype=active_motion_raw.dtype)
        
        # form input motions for prediction
        extend_motion[:, :, :, :surfix_frames] = active_motion_raw[0, :, :, -surfix_frames:]
        extend_motion = torch.from_numpy(extend_motion).to(dist_util.dev())

        _, model_kwargs = collate(
            [{'inp': torch.tensor([[0.]]), 'target': 0, 'text': txt, 'tokens': None, 'lengths': n_frames}
            for txt in texts] * self.num_repetitions
        )
        model_kwargs['y']['text'] = active_motion_text
        model_kwargs['y']['inpainted_motion'] = extend_motion
        model_kwargs['y']['inpainting_mask'] = torch.ones_like(extend_motion, dtype=torch.bool)    
        model_kwargs['y']['inpainting_mask'][0, :, :, surfix_frames:] = False 

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

            sample = torch.concat((
                torch.from_numpy(active_motion_raw[[0], :, :, :-surfix_frames]), 
                sample), dim = 3)

            all_motions_raw.append(sample.numpy())
            # Recover XYZ *positions* from HumanML3D vector representation
            if model.data_rep == 'hml_vec':
                n_joints = 22 if sample.shape[1] == 263 else 21
                sample = self.data.dataset.t2m_dataset.inv_transform(sample.permute(0, 2, 3, 1)).float()
                sample = recover_from_ric(sample, n_joints)
                sample = sample.view(-1, *sample.shape[2:]).permute(0, 2, 3, 1)

            all_text += model_kwargs['y']['text']
            all_motions.append(sample.numpy())
            all_lengths.append(active_motion_raw.shape[-1]
                               - surfix_frames 
                               + model_kwargs['y']['lengths'].cpu().numpy())

            print(f"created {len(all_motions) * num_samples } samples")

        all_motions = np.concatenate(all_motions, axis=0)
        all_lengths = np.concatenate(all_lengths, axis=0) 

        ret_dict = {'motion': all_motions, 'text': all_text, 'lengths': all_lengths,
                    'num_samples': num_samples, 'num_repetitions': 1}

        # save ret_dict as npy and animations for video display as mp4
        # out_path = os.path.join(
        #     self.output_dir, url1 + url2)
        # all_save_files = self.save_npy_mp4(out_path, ret_dict)

        return ret_dict # all_save_files


    def partial_edit(self, active_url, partial_body, partial_body_text):
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
        all_lengths = np.concatenate(all_lengths, axis=0) 

        ret_dict = {'motion': all_motions, 'text': all_text, 'lengths': all_lengths,
                    'num_samples': num_samples, 'num_repetitions': 1}

        # save ret_dict as npy and animations for video display as mp4
        # out_path = os.path.join(
        #     self.output_dir, url1 + url2)
        # all_save_files = self.save_npy_mp4(out_path, ret_dict)

        return ret_dict # all_save_files


    def connect(self, url1, url2): 
        # load selected motion pkls
        # with open('./vibe/new_joint_vecs_vibe/dance_vibe_motion_raw.pkl', 'rb') as f:
        #     motion1 = pickle.load(f)
        with open(url1 + '.pkl', 'rb') as f:
            motion1 = pickle.load(f)
        with open(url2 + '.pkl', 'rb') as f:
            motion2 = pickle.load(f)

        n_frames = 196
        connect_motions = np.zeros((list(motion1['motion_raw'].shape[:-1]) + [n_frames]), dtype=motion1['motion_raw'].dtype)
        # use percentage to decide surfix length
        surfix_percentage = 0.25
        surfix_frames = int(connect_motions.shape[-1] * surfix_percentage)
        # form input motions for prediction
        connect_motions[:, :, :, :surfix_frames] = motion1['motion_raw'][0, :, :, -surfix_frames:]
        connect_motions[:, :, :, -surfix_frames:] = motion2['motion_raw'][0, :, :, :surfix_frames]
        connect_motions = torch.from_numpy(connect_motions).to(dist_util.dev())

        # compute model_kwargs for sampling
        
        _, model_kwargs = collate(
            [{'inp': torch.tensor([[0.]]), 'target': 0, 'text': txt, 'tokens': None, 'lengths': n_frames}
            for txt in motion2['text']]
        )
        model_kwargs['y']['text'] = motion2['text']
        model_kwargs['y']['inpainted_motion'] = connect_motions
        model_kwargs['y']['inpainting_mask'] = torch.ones_like(connect_motions, dtype=torch.bool)    
        model_kwargs['y']['inpainting_mask'][0, :, :, surfix_frames : self.max_frames-surfix_frames] = False 

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

            sample = torch.concat((
                torch.from_numpy(motion1['motion_raw'][[0], :, :, :-surfix_frames]), 
                sample, 
                torch.from_numpy(motion2['motion_raw'][[0], :, :, surfix_frames:])
                ), dim = 3)

            all_motions_raw.append(sample.numpy())
            # Recover XYZ *positions* from HumanML3D vector representation
            if model.data_rep == 'hml_vec':
                n_joints = 22 if sample.shape[1] == 263 else 21
                sample = self.data.dataset.t2m_dataset.inv_transform(sample.permute(0, 2, 3, 1)).float()
                sample = recover_from_ric(sample, n_joints)
                sample = sample.view(-1, *sample.shape[2:]).permute(0, 2, 3, 1)

            all_text += model_kwargs['y']['text']
            all_motions.append(sample.numpy())
            all_lengths.append(motion1['motion_raw'].shape[-1] + motion2['motion_raw'].shape[-1]
                               - 2*surfix_frames 
                               + model_kwargs['y']['lengths'].cpu().numpy())

            print(f"created {len(all_motions) * num_samples } samples")

        all_motions = np.concatenate(all_motions, axis=0)
        all_lengths = np.concatenate(all_lengths, axis=0) 

        ret_dict = {'motion': all_motions, 'text': all_text, 'lengths': all_lengths,
                    'num_samples': num_samples, 'num_repetitions': 1}

        # save ret_dict as npy and animations for video display as mp4
        # out_path = os.path.join(
        #     self.output_dir, url1 + url2)
        # all_save_files = self.save_npy_mp4(out_path, ret_dict)

        return ret_dict # all_save_files


class QualityEditor:
    def __init__(self, args):

        print('Loading dataset...')
        self.max_frames = 196 if args.dataset in ['kit', 'humanml'] else 60
        self.fps = 12.5 if args.dataset == 'kit' else 20
        num_joints = None
        
        self.data = get_dataset_loader(name=args.dataset,
                                batch_size=args.batch_size,
                                num_frames=self.max_frames,
                                split='test',
                                hml_mode='text_only')
        # self.data.fixed_length = n_frames
        # total_num_samples = args.num_samples * args.num_repetitions

        print("Creating model and diffusion...")
        args.model_path = './cgi-bin/save/quality_models/Angry/Angry.pt'
        args.arch = 'qna'
        args.unconstrained = True
        args.latent_dim = 128

        self.model, self.diffusion = create_model_and_diffusion_quality_edit(args, self.data, num_joints)

        print(f"Loading checkpoints from [{args.model_path}]...")
        state_dict = torch.load(args.model_path, map_location='cpu')
        load_model(self.model, state_dict)

        self.device = args.device
        self.output_dir = args.output_dir
        self.guidance_param = args.guidance_param
        self.num_samples = 1
        self.num_repetitions = 1


    def quality_edit(self, active_url, quality):
        with open(active_url + '.pkl', 'rb') as f:
            active_motion = pickle.load(f)

        active_motion_raw = active_motion['motion_raw']
        n_frames = int(active_motion['lengths'])

        quality_edit_motion = torch.from_numpy(active_motion_raw).to(dist_util.dev())

        model_kwargs = {}
        model_kwargs['y'] = {}
        model_kwargs['y']['text'] = active_motion['text']
        model_kwargs['y']['lengths'] = torch.tensor(n_frames).repeat((self.num_samples))
        model_kwargs['y']['inpainted_motion'] = quality_edit_motion # samples, joints, 1, frames

        print("Creating ressizers...")
        motion = quality_edit_motion
        if quality_edit_motion.shape[-1] % 2 != 0:
            motion = quality_edit_motion[..., :-1]
            n_frames -= 1
        scale = 2
        range_t = 20
        down = partial(F.interpolate, mode='bilinear', align_corners=False, scale_factor=(1, 1/scale))
        up = partial(F.interpolate, mode='bilinear', align_corners=False, scale_factor=(1, scale))
        resizers = (down, up)
        model_kwargs["y"]["ref_img"] = motion
        print(motion.shape)

        # load model
        model = self.model
        model_dir = './cgi-bin/save/quality_models/'
        model_path = model_dir + quality + '/' + quality + '.pt'

        print(f"Loading checkpoints from [{model_path}]...")
        state_dict = torch.load(model_path, map_location='cpu')
        load_model(model, state_dict)

        model.to(dist_util.dev())
        model.eval()  # disable random masking

        all_motions = []
        all_motions_raw = []
        all_lengths = []
        all_text = []
        num_samples = 1
        # for rep_i in range(self.num_repetitions):
        if 1:
            print(f'### Start sampling')

            # # add CFG scale to batch
            # if self.guidance_param != 1:
            #     model_kwargs['y']['scale'] = torch.ones(num_samples * self.num_repetitions, device=dist_util.dev()) * self.guidance_param

            sample_fn = self.diffusion.p_sample_loop

            sample = sample_fn(
                self.model,
                (num_samples * self.num_repetitions, model.njoints, model.nfeats, n_frames),
                clip_denoised=False,
                model_kwargs=model_kwargs,
                skip_timesteps=0,  # 0 is the default value - i.e. don't skip any step
                init_image=None,
                progress=True,
                dump_steps=None,
                noise=None,
                const_noise=False,
                resizers=resizers,
                range_t=range_t
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
        all_lengths = np.concatenate(all_lengths, axis=0) 

        ret_dict = {'motion': all_motions, 'text': all_text, 'lengths': all_lengths,
                    'num_samples': num_samples, 'num_repetitions': self.num_repetitions}

        # save ret_dict as npy and animations for video display as mp4
        # out_path = os.path.join(
        #     self.output_dir, url1 + url2)
        # all_save_files = self.save_npy_mp4(out_path, ret_dict)

        return ret_dict # all_save_files



# if __name__ == "__main__":
#     args = sample_args()
#     sampler = Sampler(args)
#     # sampler.infer(args.text_prompt, args.motion_length)
#     sampler.infer('dance', 5)
