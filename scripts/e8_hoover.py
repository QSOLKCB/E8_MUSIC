#!/usr/bin/env python3
"""
E8 Sonification of the Classic Hoover Sound
-------------------------------------------
10-second mono 44.1 kHz 16-bit WAV.

The detune table of the multi-oscillator stack is derived directly from
the 1-D projections of the full 240 roots of the E8 lattice.
Everything else (PWM saws, resonant filter, envelope) follows classic
Hoover architecture (Alpha Juno lineage).
"""

import numpy as np
from scipy import signal
from scipy.io import wavfile
import os

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
SR          = 44100
DURATION    = 10.0
OUT_PATH    = "e8_hoover_10s.wav"

BASE_FREQ   = 65.406          # C2 – classic low/mid Hoover territory
N_OSCS      = 8               # number of unique detunes taken from E8
DETUNE_CENTS_MAX = 35.0       # maximum detune spread (± cents)
LFO_RATE    = 5.2             # Hz – classic fast PWM swirl
FILTER_Q    = 3.8             # strong resonance
ATTACK_S    = 0.18
RELEASE_S   = 1.8

# ------------------------------------------------------------------
# E8 root system
# ------------------------------------------------------------------
def e8_roots():
    """Return the 240 roots of E8 as a (240, 8) array."""
    roots = []

    # 112 integer roots: two ±1, rest 0
    for i in range(8):
        for j in range(i + 1, 8):
            for si in (1.0, -1.0):
                for sj in (1.0, -1.0):
                    v = np.zeros(8)
                    v[i] = si
                    v[j] = sj
                    roots.append(v)

    # 128 half-integer roots: all ±½ with even number of minuses
    from itertools import product
    for signs in product((-0.5, 0.5), repeat=8):
        if sum(s < 0 for s in signs) % 2 == 0:
            roots.append(np.array(signs, dtype=float))

    return np.array(roots)


# ------------------------------------------------------------------
# Main synthesis
# ------------------------------------------------------------------
def main():
    n_samples = int(SR * DURATION)
    t = np.arange(n_samples) / SR

    # --- 1. E8 geometry → detune table --------------------------------
    roots = e8_roots()
    assert roots.shape == (240, 8)

    np.random.seed(8)                       # reproducible projection
    u = np.random.randn(8)
    u /= np.linalg.norm(u)
    projs = roots @ u

    # Quantiles of the projected roots become the detune offsets
    percentiles = np.linspace(8, 92, N_OSCS)
    qs = np.percentile(projs, percentiles)
    qs_centered = qs - qs.mean()
    scale = DETUNE_CENTS_MAX / (np.abs(qs_centered).max() + 1e-12)
    detune_cents = qs_centered * scale

    freqs = BASE_FREQ * (2.0 ** (detune_cents / 1200.0))

    # Classic Hoover layering: sub + fundamental + octave
    freqs = np.concatenate([freqs * 0.5, freqs, freqs * 2.0])

    print("E8-derived detune cents:", np.round(detune_cents, 1))
    print("Oscillator frequencies (Hz):", np.round(freqs, 2))

    # --- 2. PWM sawtooth bank ----------------------------------------
    audio = np.zeros(n_samples, dtype=np.float64)
    np.random.seed(240)                     # 240 roots → phase seed

    for i, f in enumerate(freqs):
        phase0  = np.random.rand()
        lfo_ph  = np.random.rand() * 2 * np.pi

        # Time-varying pulse width (the classic Hoover “hollow” movement)
        width = 0.5 + 0.38 * np.sin(2 * np.pi * LFO_RATE * t + lfo_ph)
        width = np.clip(width, 0.05, 0.95)

        phi = 2 * np.pi * (f * t + phase0)
        saw = signal.sawtooth(phi, width=width)

        # Balance the three octave layers
        if f > BASE_FREQ * 1.4:
            gain = 0.55
        elif f < BASE_FREQ * 0.7:
            gain = 0.85
        else:
            gain = 1.0

        audio += saw * gain

    audio /= np.max(np.abs(audio)) + 1e-12

    # --- 3. Amplitude envelope ---------------------------------------
    env = np.ones(n_samples)
    att_n = int(ATTACK_S * SR)
    rel_n = int(RELEASE_S * SR)
    env[:att_n] = np.linspace(0.0, 1.0, att_n) ** 1.5
    env[-rel_n:] = np.linspace(1.0, 0.0, rel_n) ** 1.2
    audio *= env

    # --- 4. Resonant low-pass with sweeping cutoff -------------------
    def design_lp_biquad(cutoff, Q, sr):
        w0    = 2 * np.pi * np.clip(cutoff, 20.0, sr * 0.45) / sr
        alpha = np.sin(w0) / (2 * Q)
        cosw  = np.cos(w0)
        b0 = (1 - cosw) * 0.5
        b1 = 1 - cosw
        b2 = (1 - cosw) * 0.5
        a0 = 1 + alpha
        a1 = -2 * cosw
        a2 = 1 - alpha
        b = np.array([b0, b1, b2]) / a0
        a = np.array([1.0, a1 / a0, a2 / a0])
        return b, a

    # Cutoff envelope + slow LFO movement
    cutoff_base = 280.0
    cutoff_peak = 2200.0
    cutoffs = cutoff_base + (cutoff_peak - cutoff_base) * (env ** 0.7)
    cutoffs += 450.0 * np.sin(2 * np.pi * 0.12 * t + 0.7)
    cutoffs = np.clip(cutoffs, 120.0, 4500.0)

    # Time-varying biquad (coeffs updated every 16 samples)
    y  = np.zeros_like(audio)
    z1 = z2 = 0.0
    b  = np.array([1.0, 0.0, 0.0])
    a  = np.array([1.0, 0.0, 0.0])
    update_every = 16

    for i in range(n_samples):
        if i % update_every == 0:
            b, a = design_lp_biquad(cutoffs[i], FILTER_Q, SR)
        xn = audio[i]
        yn = b[0] * xn + z1
        z1 = b[1] * xn - a[1] * yn + z2
        z2 = b[2] * xn - a[2] * yn
        y[i] = yn

    audio = y

    # Soft saturation for analog character
    audio = np.tanh(audio * 1.15) * 0.92

    # Peak normalize
    peak = np.max(np.abs(audio))
    audio = audio / peak * 0.89

    # Write 16-bit WAV
    audio_i16 = np.int16(audio * 32767)
    wavfile.write(OUT_PATH, SR, audio_i16)

    print(f"\nWrote {OUT_PATH}")
    print(f"Duration : {DURATION}s")
    print(f"Sample rate : {SR}")
    print(f"Peak (pre-norm) : {peak:.3f}")
    print(f"File size : {os.path.getsize(OUT_PATH)} bytes")


if __name__ == "__main__":
    main()
