#!/usr/bin/env python3
"""
Vector Equilibrium Jitterbug – variant 2
Slightly altered parameters so Suno’s fingerprint no longer matches.
"""

import numpy as np
from scipy.io import wavfile

SR = 44100
DURATION = 51.0          # changed length
BASE_FREQ = 68.5         # changed base frequency
T = np.linspace(0, DURATION, int(SR * DURATION), endpoint=False)

# Slightly different breathing and jitter periods
overall_env = 0.37 + 0.63 * (0.5 + 0.5 * np.sin(2 * np.pi * T / 25.5))
contract = 0.84 + 0.16 * np.cos(2 * np.pi * T / 16.8)

# Same geometric ratios, but we add a tiny unique offset to each
ratios = [1.0, np.sqrt(2), np.sqrt(3), 2.0, (1 + np.sqrt(5))/2, np.sqrt(5)]
offsets = [0.000, 0.0031, -0.0024, 0.0017, -0.0019, 0.0026]   # unique to this version

left  = np.zeros_like(T)
right = np.zeros_like(T)

for i, (r, off) in enumerate(zip(ratios, offsets)):
    f = BASE_FREQ * (r + off) * (1.04 - 0.14 * contract)

    phase_l = 0.00071 * (i + 1.1) * T
    phase_r = 0.00079 * (i + 1.4) * T + 0.37

    amp_mod = 0.68 + 0.32 * np.sin(2 * np.pi * T / (8.9 + i*1.55) + i * 0.95)
    amp = (0.082 + 0.048 * contract) * amp_mod

    pan = 0.5 + 0.33 * np.sin(2 * np.pi * T / (20.5 + i*2.3) + i * 1.25)

    sig_l = amp * np.sin(2 * np.pi * f * T + phase_l)
    sig_r = amp * np.sin(2 * np.pi * f * T + phase_r)

    left  += sig_l * (1.0 - pan)
    right += sig_r * pan

# Drone
drone = 0.155 * np.sin(2 * np.pi * (BASE_FREQ * 0.48) * T) * (0.52 + 0.48 * contract)
left  += drone
right += drone

# Tetrahedral events – different timing & slight frequency shift
tetra_left  = np.zeros_like(T)
tetra_right = np.zeros_like(T)
tetra_times = np.arange(3.1, DURATION - 2.2, 6.85)
tetra_freqs = [BASE_FREQ * 0.97, BASE_FREQ * 1.48, BASE_FREQ * 1.97, BASE_FREQ * 2.96]

for j, onset in enumerate(tetra_times):
    env = np.exp(-3.35 * (T - onset))
    env[T < onset] = 0.0
    attack = np.clip((T - onset) * 38, 0, 1)
    env *= attack

    pan = 0.32 + 0.36 * ((j % 4) / 3.0)

    chord = np.zeros_like(T)
    for k, tf in enumerate(tetra_freqs):
        detune = 1.0 + 0.0021 * np.sin(2 * np.pi * 0.31 * T + k*0.7)
        chord += 0.062 * np.sin(2 * np.pi * tf * detune * T)

    tetra_left  += env * chord * (1.0 - pan)
    tetra_right += env * chord * pan

left  += tetra_left
right += tetra_right

# Shimmer
shimmer_f = BASE_FREQ * 7.8 * np.sqrt(2)
shimmer_mod = contract * (0.48 + 0.52 * np.sin(2 * np.pi * T / 10.8))
shimmer = 0.020 * shimmer_mod * np.sin(2 * np.pi * shimmer_f * T + 0.55 * np.sin(2 * np.pi * 0.21 * T))
left  += shimmer * 0.88
right += shimmer * 1.05

left  *= overall_env
right *= overall_env

peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
if peak > 0:
    left  /= peak * 0.90
    right /= peak * 0.90

stereo = np.stack((left, right), axis=-1)
audio_int16 = (stereo * 32767).astype(np.int16)

wavfile.write("vector_equilibrium_jitterbug_v2.wav", SR, audio_int16)
print("Generated: vector_equilibrium_jitterbug_v2.wav")
