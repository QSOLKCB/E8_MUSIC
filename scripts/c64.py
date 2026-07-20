#!/usr/bin/env python3
"""
E8 Root System Sonification for C64-style Retro Sound
=====================================================
Generates a classic SID-inspired pitch-slide sound effect whose
frequency trajectory is driven by the 1-D projection of the 240
roots of the E8 lattice.

The non-uniform density of the projected roots produces a
characteristic acceleration/deceleration in the slide — a true
sonification rather than a plain linear sweep.

Output: e8_c64_slide.wav  (8-bit mono, 22050 Hz — chiptune friendly)

Requires: numpy, scipy
"""

import numpy as np
from itertools import product
from scipy.io import wavfile
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Generate the 240 roots of E8
# ---------------------------------------------------------------------------
def generate_e8_roots():
    roots = []

    # 112 roots of the form: all permutations of (±1, ±1, 0, 0, 0, 0, 0, 0)
    for i in range(8):
        for j in range(i + 1, 8):
            for si in (-1.0, 1.0):
                for sj in (-1.0, 1.0):
                    r = np.zeros(8, dtype=np.float64)
                    r[i] = si
                    r[j] = sj
                    roots.append(r)

    # 128 roots of the form: all (±½, ±½, …, ±½) with an even number of minus signs
    for signs in product((-0.5, 0.5), repeat=8):
        if sum(1 for s in signs if s < 0) % 2 == 0:
            roots.append(np.asarray(signs, dtype=np.float64))

    roots = np.asarray(roots)
    assert roots.shape == (240, 8), f"Expected 240 roots, got {roots.shape[0]}"
    # Sanity: every root has squared length 2
    assert np.allclose(np.sum(roots ** 2, axis=1), 2.0)
    return roots


# ---------------------------------------------------------------------------
# 2. Project onto a separating direction and sort
# ---------------------------------------------------------------------------
def project_and_sort(roots, direction=None):
    if direction is None:
        # Golden-ratio powers — irrational, separates most roots, aesthetically nice
        phi = (1.0 + np.sqrt(5.0)) / 2.0
        direction = np.array([phi ** (-k) for k in range(8)], dtype=np.float64)

    projs = roots @ direction
    # Round to kill floating-point noise, then unique + sort
    unique_projs = np.sort(np.unique(np.round(projs, decimals=10)))
    return unique_projs


# ---------------------------------------------------------------------------
# 3. Map the ordered projections to a frequency trajectory
# ---------------------------------------------------------------------------
def make_frequency_curve(projs, f_low=98.0, f_high=2093.0, duration=2.4, sr=22050):
    """
    f_low  ≈ G2, f_high ≈ C7  — sits nicely in the classic SID range.
    Log-frequency mapping keeps musical intervals proportional.
    """
    # Normalise projections to [0, 1]
    pmin, pmax = projs.min(), projs.max()
    norm = (projs - pmin) / (pmax - pmin)

    # Log-frequency at the control points
    log_f = np.log(f_low) + norm * (np.log(f_high) - np.log(f_low))

    n_samples = int(sr * duration)
    t = np.linspace(0.0, duration, n_samples, endpoint=False)

    # Equal time per successive projection → density of E8 projection
    # is heard as varying slide speed
    control_times = np.linspace(0.0, duration, len(log_f))
    log_freq_curve = np.interp(t, control_times, log_f)
    freq_curve = np.exp(log_freq_curve)
    return t, freq_curve


# ---------------------------------------------------------------------------
# 4. Classic C64-style sawtooth oscillator + simple envelope
# ---------------------------------------------------------------------------
def render_saw_slide(freq_curve, sr=22050, attack=0.04, release=0.18):
    """
    Phase-accumulating band-limited-ish sawtooth.
    (True band-limiting is overkill; the aliasing adds to the retro grit.)
    """
    # Integrate frequency → instantaneous phase
    phase = np.cumsum(2.0 * np.pi * freq_curve / sr)
    # Classic bipolar saw: [-1, +1]
    saw = 2.0 * (np.mod(phase, 2.0 * np.pi) / (2.0 * np.pi)) - 1.0

    # Simple AR envelope (very short attack, longer release – typical SFX)
    n = len(saw)
    env = np.ones(n, dtype=np.float64)
    a = int(attack * sr)
    r = int(release * sr)
    if a > 0:
        env[:a] = np.linspace(0.0, 1.0, a)
    if r > 0:
        env[-r:] = np.linspace(1.0, 0.0, r)

    audio = saw * env * 0.85   # headroom
    return audio


# ---------------------------------------------------------------------------
# 5. Main – write the WAV
# ---------------------------------------------------------------------------
def main():
    print("Generating E8 roots …")
    roots = generate_e8_roots()

    print("Projecting and sorting …")
    projs = project_and_sort(roots)
    print(f"  → {len(projs)} unique projected values")

    print("Building frequency trajectory …")
    sr = 22050          # lower rate = more authentic chiptune character
    duration = 10
    t, freq_curve = make_frequency_curve(projs, duration=duration, sr=sr)

    print("Rendering sawtooth slide …")
    audio = render_saw_slide(freq_curve, sr=sr)

    # 8-bit unsigned quantisation (classic retro feel)
    audio_u8 = np.clip((audio + 1.0) * 127.5, 0, 255).astype(np.uint8)

    out_path = Path(__file__).with_name("e8_c64_slide.wav")
    wavfile.write(out_path, sr, audio_u8)
    print(f"Wrote {out_path}  ({duration:.1f}s, {sr} Hz, 8-bit mono)")
    print("Done. Play it on your favourite C64 emulator or modern machine.")


if __name__ == "__main__":
    main()
