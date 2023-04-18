import numpy as np

smpl_params = np.load("assets/sample01_rep01_smpl_params.npy", allow_pickle=True)
# print(smpl_params)

results_npy = np.load("assets/results.npy", allow_pickle=True)
# print(results_npy)

from gltflib import GLTF
gltf = GLTF.load("assets/Hp-Bh-Lg-Ap.glb")
print(gltf)