#!/usr/bin/env python3
"""
Superdeterminism Sonification
=============================
A deterministic audio generator embodying the core ideas from
Sabine Hossenfelder's "Superdeterminism: A Guide for the Perplexed".

Key mappings from the paper:
- Detector settings theta : future-input parameters that shape the entire evolution.
- Hidden variables lambda : initial conditions that are *correlated* with theta
  (rho(lambda|theta) != rho(lambda)) -- explicit violation of Statistical Independence.
- Non-linear evolution with attractors: each mode relaxes toward a detector-
  eigenstate frequency whose location in "configuration space" depends on theta.
- Psi-epistemic ensemble: we average over many ontic trajectories; the audible
  result is the epistemic wave that recovers Born-like statistics when lambda is
  unknown, yet remains fully deterministic when lambda is known.
- Local & deterministic: no random draws after the seed; everything follows
  from the initial hypersurface + the evolution law that already "knows" theta.
- Future-input dependence: theta is supplied at generation time (the "measurement")
  and is used from t=0, exactly as the paper describes.

The resulting .wav is therefore superdeterministic by construction.
"""

import numpy as np
from scipy.io import wavfile

# ---------------------------------------------------------------------------
# Global constants (the "laws of the universe" for this toy model)
# ---------------------------------------------------------------------------
FS = 44100                  # sample rate
DURATION = 32.0             # seconds – long enough for a short track
N_MODES = 64                # size of the epistemic ensemble
BASE_FREQ = 432.0           # user-preferred tuning, and a nice attractor base
SEED = 0x5AB1E              # fixed seed → pure determinism

np.random.seed(SEED)

# ---------------------------------------------------------------------------
# 1. Detector settings theta  (the future input)
# ---------------------------------------------------------------------------
theta = np.array([0.37, 0.81, 0.14])   # three continuous settings in [0,1]
                                       # change these and the whole piece changes

# ---------------------------------------------------------------------------
# 2. Hidden variables lambda  – deliberately correlated with theta
#    This is the violation of Statistical Independence.
# ---------------------------------------------------------------------------
idx = np.arange(N_MODES)

lambda_vars = (
    0.5
    + 0.3 * np.sin(2 * np.pi * idx * theta[0] + theta[1] * 7)
    + 0.2 * np.cos(idx * theta[2] * 3.14159)
    + 0.1 * (theta[0] * idx / N_MODES) ** 2
)
lambda_vars = np.clip(lambda_vars, 0.0, 1.0)

# ---------------------------------------------------------------------------
# 3. Attractor locations in configuration space
#    Detector eigenstates whose positions *depend on the settings theta*.
# ---------------------------------------------------------------------------
base_attractors = BASE_FREQ * np.array([1.0, 5/4, 3/2, 2.0])  # just intonation

def attractor_freq(lam, th):
    """Map a hidden variable + settings onto one of the attractors."""
    weights = np.array([
        (1 - th[0]) * (1 - lam),
        th[0] * (1 - lam),
        (1 - th[1]) * lam,
        th[1] * lam
    ])
    weights = weights / (weights.sum() + 1e-12)
    return np.dot(weights, base_attractors) * (1.0 + 0.05 * np.sin(2 * np.pi * th[2]))

freqs0 = np.array([attractor_freq(lam, theta) for lam in lambda_vars])

# ---------------------------------------------------------------------------
# 4. Time evolution – non-linear relaxation toward the attractors
# ---------------------------------------------------------------------------
t = np.linspace(0.0, DURATION, int(FS * DURATION), endpoint=False)
audio = np.zeros_like(t)

global_env = np.sin(np.pi * t / DURATION) ** 1.5

for i, (lam, f_attr) in enumerate(zip(lambda_vars, freqs0)):
    f0 = f_attr * (0.85 + 0.3 * lam)

    tau = 4.0 + 6.0 * (1.0 - theta[0])
    f_t = f_attr + (f0 - f_attr) * np.exp(-(t / tau) ** 1.5)

    phase = 2 * np.pi * np.cumsum(f_t) / FS
    phase += lam * 2 * np.pi

    amp = (0.6 / N_MODES) * (0.7 + 0.3 * np.sin(
        2 * np.pi * (0.07 + 0.05 * lam) * t + theta[1] * np.pi))

    contrib = amp * np.sin(phase)
    contrib = np.tanh(1.8 * contrib)   # non-linear soft-clip

    audio += contrib

# ---------------------------------------------------------------------------
# 5. Final mix
# ---------------------------------------------------------------------------
audio *= global_env
audio = audio / (np.max(np.abs(audio)) + 1e-12) * 0.85

alpha = 0.15
for n in range(1, len(audio)):
    audio[n] = alpha * audio[n] + (1 - alpha) * audio[n - 1]

# Stereo: right channel uses a correlated but distinct theta
theta_R = np.clip(theta * np.array([1.05, 0.97, 1.08]), 0.0, 1.0)

audio_R = np.zeros_like(t)
freqs0_R = np.array([attractor_freq(lam, theta_R) for lam in lambda_vars])

for i, (lam, f_attr) in enumerate(zip(lambda_vars, freqs0_R)):
    f0 = f_attr * (0.85 + 0.3 * lam)
    tau = 4.0 + 6.0 * (1.0 - theta_R[0])
    f_t = f_attr + (f0 - f_attr) * np.exp(-(t / tau) ** 1.5)
    phase = 2 * np.pi * np.cumsum(f_t) / FS
    phase += lam * 2 * np.pi + 0.3

    amp = (0.6 / N_MODES) * (0.7 + 0.3 * np.sin(
        2 * np.pi * (0.07 + 0.05 * lam) * t + theta_R[1] * np.pi))

    contrib = amp * np.sin(phase)
    contrib = np.tanh(1.8 * contrib)
    audio_R += contrib

audio_R *= global_env
audio_R = audio_R / (np.max(np.abs(audio_R)) + 1e-12) * 0.85
for n in range(1, len(audio_R)):
    audio_R[n] = alpha * audio_R[n] + (1 - alpha) * audio_R[n - 1]

stereo = np.stack([audio, audio_R], axis=1)
pcm = (stereo * 32767.0).astype(np.int16)

# ---------------------------------------------------------------------------
# Write the superdeterministic waveform (relative path)
# ---------------------------------------------------------------------------
outfile = "superdeterminism.wav"
wavfile.write(outfile, FS, pcm)

print(f"Wrote {outfile}")
print(f"Duration : {DURATION:.1f}s  |  Channels: stereo")
print(f"theta_L  : {theta}")
print(f"theta_R  : {theta_R}")
print(f"N modes  : {N_MODES}")
print(f"Base freq: {BASE_FREQ} Hz")
print("The waveform is fully determined by theta, the correlated lambdas, and the non-linear attractor law.")
print("Changing theta changes the attractors and therefore the entire piece -- future input dependence.")
print("No statistical independence was assumed or used.")
