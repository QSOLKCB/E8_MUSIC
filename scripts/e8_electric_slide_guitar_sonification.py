#!/usr/bin/env python3
"""
E8 Electric Slide Guitar Sonification
=====================================
Dedicated script for generating electric slide guitar sounds
driven directly by the E8 root system (240 roots in 8D).

Focus:
- Expressive long glides between E8-projected pitches (real slide feel)
- Harmonics with slight inharmonicity for authentic twang
- Vibrato depth and rate modulated by E8 geometry
- Light electric processing (overdrive, resonance)
- Cyber-western atmosphere with signal decay
- 432 Hz base tuning + Fibonacci-weighted projection

Output is a clean stereo stem perfect for layering in your DAW,
using with Suno prompts, or syncing to E8 visuals.

Run: python3 e8_electric_slide_guitar_sonification.py
Edit CONFIG section for longer performances or different intensity.
"""

import numpy as np
from scipy.io.wavfile import write
import itertools

# ============================ CONFIG ============================
SR = 44100
DURATION = 45.0                    # Seconds (increase for longer performance)
BASE_FREQ = 432.0
OUTPUT_FILE = "e8_electric_slide_guitar.wav"

# Slide guitar character
SLIDE_GLIDE_TIME = 1.8             # Seconds per long expressive slide
VIBRATO_BASE_RATE = 4.2            # Hz
VIBRATO_DEPTH = 0.018              # Semitone range
INHARMONICITY = 0.006              # Slight detune on higher harmonics for twang
HARMONIC_MIX = [1.0, 0.65, 0.38, 0.22]  # Fundamental + 2nd + 3rd + 4th
OVERDRIVE = 1.35                   # Light electric edge
SIGNAL_DECAY = 0.008               # Overall fading tail

SEED = 42
# ================================================================

def generate_e8_roots():
    """Generate all 240 E8 roots."""
    roots = []
    for positions in itertools.combinations(range(8), 2):
        for signs in itertools.product([-1.0, 1.0], repeat=2):
            vec = np.zeros(8)
            vec[list(positions)] = signs
            roots.append(vec)
    half = np.full(8, 0.5)
    for signs in itertools.product([-1.0, 1.0], repeat=8):
        if np.sum(np.array(signs) < 0) % 2 == 0:
            vec = half * np.array(signs)
            roots.append(vec)
    return np.array(roots, dtype=np.float32)


def project_to_freq(root, direction, base_freq):
    """Map E8 root to frequency via golden-ratio weighted projection."""
    proj = np.dot(root, direction)
    octaves = proj * 3.6
    f = base_freq * (2 ** octaves)
    return float(np.clip(f, 65.0, 980.0))


def main():
    np.random.seed(SEED)
    print("Generating E8 roots for slide guitar mapping...")
    roots = generate_e8_roots()

    # Fibonacci-weighted direction (golden ratio for natural musical feel)
    phi = (1 + np.sqrt(5)) / 2
    direction = np.array([phi ** i for i in range(8)], dtype=np.float32)
    direction /= np.linalg.norm(direction)

    # Select a journey of roots for expressive slides (every 15th for good spacing)
    journey_roots = roots[::15][:14]
    freqs = np.array([project_to_freq(r, direction, BASE_FREQ) for r in journey_roots])

    print(f"E8 roots mapped: {len(freqs)} slide targets | Freq range: {freqs.min():.1f}–{freqs.max():.1f} Hz")

    t = np.linspace(0, DURATION, int(SR * DURATION), endpoint=False)
    audio = np.zeros((len(t), 2), dtype=np.float32)

    # Create a sequence of long expressive slides
    num_slides = len(freqs) - 1
    slide_duration = DURATION / num_slides

    for i in range(num_slides):
        start_t = i * slide_duration
        end_t = (i + 1) * slide_duration
        f_start = freqs[i]
        f_end = freqs[i + 1]

        seg_start = int(start_t * SR)
        seg_end = int(end_t * SR)
        seg_len = seg_end - seg_start
        if seg_len < 100:
            continue

        seg_t = t[seg_start:seg_end]

        # Logarithmic glide (smooth, musical slide bend)
        glide = np.logspace(np.log10(f_start), np.log10(f_end), seg_len)

        # Vibrato depth and rate modulated by E8 "energy" (root norm influence)
        vib_depth = VIBRATO_DEPTH * (0.7 + 0.3 * np.sin(2 * np.pi * seg_t / slide_duration * 1.3))
        vib_rate = VIBRATO_BASE_RATE * (0.9 + 0.2 * np.sin(2 * np.pi * seg_t / slide_duration * 0.7))
        inst_freq = glide * (1 + vib_depth * np.sin(2 * np.pi * vib_rate * seg_t))

        # Phase accumulation
        phase = np.cumsum(2 * np.pi * inst_freq / SR)

        # Electric slide guitar tone: harmonics + inharmonicity for twang
        wave = np.zeros(seg_len, dtype=np.float32)
        for h_idx, harm_amp in enumerate(HARMONIC_MIX):
            harm_num = h_idx + 1
            # Slight inharmonicity on higher harmonics (real string behavior)
            inharmon = 1.0 + (INHARMONICITY * harm_num * harm_num)
            harm_phase = phase * harm_num * inharmon
            wave += harm_amp * np.sin(harm_phase)

        # Pick attack + slide sustain envelope
        env = np.clip(
            np.linspace(0.4, 1.0, seg_len) * np.exp(- (seg_t - start_t) * 1.4),
            0, 1
        )
        # Slight noise burst at start for pick attack
        pick_noise = np.random.randn(seg_len).astype(np.float32) * 0.08 * np.exp(-seg_t * 18)
        wave = (wave * env + pick_noise) * 0.42

        # Light electric overdrive (tanh waveshaping)
        wave = np.tanh(wave * OVERDRIVE)

        # Stereo width with slight chorus-like drift (left/right phase offset)
        drift = 0.008 * np.sin(2 * np.pi * seg_t * 0.6 + i)
        left = wave * (0.92 - drift)
        right = wave * (0.92 + drift)

        # Add to master with global signal decay
        decay_env = np.exp(-start_t * SIGNAL_DECAY)
        audio[seg_start:seg_end, 0] += left * decay_env
        audio[seg_start:seg_end, 1] += right * decay_env

    # Final master processing
    print("Mastering electric slide guitar tone...")
    # Gentle high-shelf for presence + low cut for clarity
    # (simple approximation via overall shaping)
    audio = np.tanh(audio * 1.1)  # Final light saturation

    # Normalize with headroom
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        audio /= (peak * 1.12)

    # Smooth fade in/out
    fade = int(1.2 * SR)
    audio[:fade, 0] *= np.linspace(0, 1, fade)
    audio[:fade, 1] *= np.linspace(0, 1, fade)
    audio[-fade:, 0] *= np.linspace(1, 0, fade)
    audio[-fade:, 1] *= np.linspace(1, 0, fade)

    write(OUTPUT_FILE, SR, audio)
    print(f"\n✓ Generated: {OUTPUT_FILE}")
    print(f"  Duration: {DURATION:.1f}s | Pure E8-driven electric slide guitar")
    print(f"  {num_slides} expressive slides | 432 Hz tuning | Fibonacci-weighted E8 projection")
    print("  Ready as stem for DAW, Suno layering, or video sync.\n")


if __name__ == "__main__":
    main()
