#!/usr/bin/env python3
"""
E8 root-system sonification realised as a continuous violin-bowed electric guitar.
Deterministic, self-contained, pure NumPy + standard library.

Produces: e8_bowed_electric_guitar.wav
"""

import numpy as np
from itertools import combinations, product
import wave
import struct
import sys

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SR          = 44100
DURATION    = 48.0          # seconds (≈ 0.2 s per root transition)
N_PARTIALS  = 32
F_MIN       = 72.0          # Hz – low guitar territory
F_MAX       = 280.0         # Hz
DETUNE      = [0.0, +0.0038, -0.0051]  # relative detuning of the three layers
FADE_SEC    = 2.5
OUTFILE     = "e8_bowed_electric_guitar.wav"

# ---------------------------------------------------------------------------
# 1. Exact E8 roots
# ---------------------------------------------------------------------------
def generate_e8_roots():
    roots = []
    # 112 roots: all signed permutations of (±1, ±1, 0⁶)
    for i, j in combinations(range(8), 2):
        for s1, s2 in product([-1.0, 1.0], repeat=2):
            v = np.zeros(8, dtype=np.float64)
            v[i] = s1
            v[j] = s2
            roots.append(v)
    # 128 roots: (±½)⁸ with even number of minus signs
    for signs in product([-0.5, 0.5], repeat=8):
        if sum(1 for s in signs if s < 0) % 2 == 0:
            roots.append(np.asarray(signs, dtype=np.float64))
    roots = np.asarray(roots)
    assert len(roots) == 240
    assert np.allclose(np.sum(roots**2, axis=1), 2.0)
    return roots

# ---------------------------------------------------------------------------
# 2. Nearest-neighbour path (deterministic continuous trajectory)
# ---------------------------------------------------------------------------
def nearest_neighbour_path(roots):
    n = len(roots)
    visited = np.zeros(n, dtype=bool)
    path_idx = []
    # Start at the root with largest first coordinate
    current = int(np.argmax(roots[:, 0]))
    for _ in range(n):
        path_idx.append(current)
        visited[current] = True
        if visited.all():
            break
        dists = np.linalg.norm(roots - roots[current], axis=1)
        dists[visited] = np.inf
        current = int(np.argmin(dists))
    assert len(path_idx) == 240
    return roots[np.asarray(path_idx)]

# ---------------------------------------------------------------------------
# 3. Continuous control signals by linear interpolation along the path
# ---------------------------------------------------------------------------
def make_controls(path_roots, n_samples):
    n_roots = len(path_roots)
    # Position along the path (0 … n_roots-1)
    t = np.linspace(0.0, n_roots - 1, n_samples, endpoint=True)
    idx0 = np.floor(t).astype(int)
    idx1 = np.minimum(idx0 + 1, n_roots - 1)
    frac = t - idx0

    # Interpolated 8-D point for every sample
    r = (1.0 - frac)[:, None] * path_roots[idx0] + frac[:, None] * path_roots[idx1]

    # Per-dimension normalisation using the whole path
    rmin = path_roots.min(axis=0)
    rmax = path_roots.max(axis=0)
    span = np.maximum(rmax - rmin, 1e-12)
    normed = (r - rmin) / span          # shape (n_samples, 8) ∈ [0,1]

    # Pitch uses a fixed linear functional so all dimensions contribute
    pitch_dir = np.array([1.0, 0.75, 0.55, 0.35, 0.22, 0.12, 0.06, 0.03])
    pitch_dir /= np.linalg.norm(pitch_dir)
    proj = path_roots @ pitch_dir
    pmin, pmax = proj.min(), proj.max()
    pitch_norm = (r @ pitch_dir - pmin) / (pmax - pmin + 1e-12)
    pitch_norm = np.clip(pitch_norm, 0.0, 1.0)

    controls = {
        "pitch_norm"   : pitch_norm,
        "vib_rate"     : 2.2 + 6.5 * normed[:, 1],
        "vib_depth"    : 0.0025 + 0.028 * normed[:, 2],
        "amp_lfo_rate" : 0.04 + 0.38 * normed[:, 3],
        "amp_lfo_depth": 0.12 + 0.48 * normed[:, 4],
        "drive"        : 0.7 + 4.2 * normed[:, 5],
        "tilt"         : 1.05 + 0.95 * normed[:, 6],   # spectral exponent
        "pan"          : 2.0 * normed[:, 7] - 1.0,      # –1 … +1
    }
    return controls

# ---------------------------------------------------------------------------
# 4. Spectral synthesis of the bowed tone
# ---------------------------------------------------------------------------
def synthesise(controls):
    n = len(controls["pitch_norm"])
    t = np.arange(n, dtype=np.float64) / SR

    # Instantaneous fundamental (logarithmic)
    freq = F_MIN * (F_MAX / F_MIN) ** controls["pitch_norm"]

    # Vibrato (frequency modulation via phase)
    vib_phase = np.cumsum(2 * np.pi * controls["vib_rate"] / SR)
    freq_mod = freq * (1.0 + controls["vib_depth"] * np.sin(vib_phase))

    # Three detuned layers
    signal = np.zeros(n, dtype=np.float64)
    for det in DETUNE:
        f = freq_mod * (1.0 + det)
        # Phase accumulation (critical for time-varying frequency)
        phase = np.cumsum(2 * np.pi * f / SR)
        # Additive partials with time-varying tilt
        layer = np.zeros(n)
        for h in range(1, N_PARTIALS + 1):
            # amplitude ~ 1/h^tilt ; tilt itself is slowly varying
            amp = (1.0 / (h ** controls["tilt"])) 
            # mild high-frequency emphasis that still falls
            amp *= np.exp(-0.015 * h)
            layer += amp * np.sin(h * phase)
        signal += layer

    signal /= len(DETUNE)   # average the layers

    # Slow amplitude envelope from bow-pressure LFO
    amp_phase = np.cumsum(2 * np.pi * controls["amp_lfo_rate"] / SR)
    amp_env = 1.0 - controls["amp_lfo_depth"] * (0.5 + 0.5 * np.sin(amp_phase))
    signal *= amp_env

    # Soft saturation (the “electric” character)
    # Drive is time-varying; tanh keeps everything bounded
    driven = np.tanh(controls["drive"] * signal)

    # Peak normalisation
    peak = np.max(np.abs(driven)) + 1e-12
    driven *= 0.92 / peak

    # Fade in / out
    fade_len = int(FADE_SEC * SR)
    fade_in  = np.linspace(0.0, 1.0, fade_len)
    fade_out = np.linspace(1.0, 0.0, fade_len)
    driven[:fade_len]  *= fade_in
    driven[-fade_len:] *= fade_out

    # Equal-power stereo panning
    pan = controls["pan"]
    # map [–1,1] → [0, π/2]
    theta = (pan + 1.0) * (np.pi / 4.0)
    left  = driven * np.cos(theta)
    right = driven * np.sin(theta)

    return left, right

# ---------------------------------------------------------------------------
# 5. Write 16-bit stereo WAV
# ---------------------------------------------------------------------------
def write_wav(left, right, filename):
    audio = np.stack((left, right), axis=-1)
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)

    with wave.open(filename, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    print(f"Wrote {filename}  ({len(left)/SR:.1f} s, {SR} Hz, stereo)")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Generating E8 roots …")
    roots = generate_e8_roots()
    print(f"  {len(roots)} roots, all of squared length 2")

    print("Building nearest-neighbour path …")
    path = nearest_neighbour_path(roots)
    print(f"  path length (sum of Euclidean steps) ≈ "
          f"{np.sum(np.linalg.norm(np.diff(path, axis=0), axis=1)):.1f}")

    n_samples = int(DURATION * SR)
    print(f"Interpolating controls for {n_samples} samples …")
    controls = make_controls(path, n_samples)

    print("Synthesising bowed-electric spectrum …")
    left, right = synthesise(controls)

    write_wav(left, right, OUTFILE)
    print("Done.")
