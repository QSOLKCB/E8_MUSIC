#!/usr/bin/env python3
"""
E8 Lattice Sonification Script - Cyber-Western Metal
==================================================
Generates a WAV file that sonifies the E8 root system (240 roots in 8D)
into a layered cyber-western metal track.

Features:
- 432 Hz base tuning
- Fibonacci-weighted projection for "natural" musical mapping
- Triality cycling: Western twang -> Cyber glitch -> Metal industrial
- Fibonacci polyrhythmic hits (3/4, 7/8, 8/13 flavor via cumulative intervals)
- Signal decay envelope + increasing perturbation glitches (QEC-inspired)
- E8 root projections drive pitches, rhythms, and timbral evolution
- Stereo output with dynamic panning
- Soft waveshaping for metal edge
- Fully deterministic core (seeded noise only for organic texture)

Tailored for your QEC / E8 / 33rd-parallel / signal-decay aesthetic.
Use as-is for quick demos, or extend duration + layer in DAW with your
producer.ai prompts for full tracks.

Dependencies:
    numpy, scipy (pip install numpy scipy if needed)

Usage:
    python3 e8_cyber_western_sonification.py

    Edit the CONFIG section below for longer tracks, different intensity,
    or new output filename. Re-run for fresh variations.

Author: Grok + Trent Slade collaboration (July 2026)
"""

import numpy as np
from scipy.io.wavfile import write
import itertools

# ============================ CONFIG ============================
SR = 44100                    # Sample rate
DURATION = 30.0               # Seconds (increase to 120+ for full track)
BASE_FREQ = 432.0             # Your signature tuning
OUTPUT_FILE = "e8_cyber_western_demo.wav"

# Intensity controls (0.0 - 1.0+)
GLITCH_LEVEL = 0.28           # Cyber perturbation strength
TWANG_LEVEL = 0.52            # Western slide guitar presence
METAL_DRIVE = 1.75            # Overall waveshape drive (tanh)

SEED = 42                     # For reproducible "chaos" (noise bursts)
# ================================================================

def generate_e8_roots():
    """Generate all 240 roots of the E8 root system in R^8."""
    roots = []
    # 112 roots: all permutations of (±1, ±1, 0,0,0,0,0,0)
    for positions in itertools.combinations(range(8), 2):
        for signs in itertools.product([-1.0, 1.0], repeat=2):
            vec = np.zeros(8)
            vec[list(positions)] = signs
            roots.append(vec)
    # 128 roots: all (±1/2)^8 with even number of minus signs
    half = np.full(8, 0.5)
    for signs in itertools.product([-1.0, 1.0], repeat=8):
        if np.sum(np.array(signs) < 0) % 2 == 0:  # even number of minuses
            vec = half * np.array(signs)
            roots.append(vec)
    roots = np.array(roots, dtype=np.float32)
    assert len(roots) == 240, f"Expected 240 roots, got {len(roots)}"
    return roots


def project_to_freq(root, direction, base_freq):
    """Map an E8 root to a musical frequency via weighted projection."""
    proj = np.dot(root, direction)
    # Scale factor chosen so projections span several octaves musically
    octaves = proj * 3.8
    f = base_freq * (2 ** octaves)
    return float(np.clip(f, 55.0, 1400.0))  # Keep in playable range


def get_fibonacci_intervals(num=55, start_a=0.065, start_b=0.105):
    """Generate Fibonacci-like cumulative intervals for polyrhythmic hits."""
    intervals = []
    a, b = start_a, start_b
    for _ in range(num):
        intervals.append(a)
        a, b = b, a + b
    return intervals


def main():
    np.random.seed(SEED)
    print("Generating E8 roots...")
    roots = generate_e8_roots()

    # Fibonacci-weighted direction vector (your 358 Fibonacci + E8 triality vibe)
    phi = (1 + np.sqrt(5)) / 2
    direction = np.array([phi ** i for i in range(8)], dtype=np.float32)
    direction /= np.linalg.norm(direction)

    # Select diverse roots for musical mapping (every 10th gives good spread)
    selected_roots = roots[::10][:24]
    freqs = np.array([project_to_freq(r, direction, BASE_FREQ) for r in selected_roots])

    print(f"E8 roots: 240 total | Using {len(selected_roots)} for sonification")
    print(f"Projected freq range: {freqs.min():.1f} Hz - {freqs.max():.1f} Hz")

    t = np.linspace(0, DURATION, int(SR * DURATION), endpoint=False)
    audio = np.zeros((len(t), 2), dtype=np.float32)  # Stereo

    # ==================== LAYER 1: E8 DRONE PAD (Signal Decay) ====================
    print("Building E8 drone pad with triality evolution...")
    drone_freqs = freqs[:8]
    for i, f in enumerate(drone_freqs):
        # Slow triality-style amplitude modulation + overall exponential decay
        amp_mod = 0.65 + 0.35 * np.sin(2 * np.pi * t * (0.07 + i * 0.008))
        amp = (0.065 / (i + 1.8)) * amp_mod * np.exp(-t * 0.012)  # Gentle signal decay
        # Subtle lattice-driven vibrato
        vib = 0.006 * np.sin(2 * np.pi * t * (0.25 + i * 0.03))
        inst_freq = f * (1 + vib)
        phase = np.cumsum(2 * np.pi * inst_freq / SR)
        sine = np.sin(phase)
        # Stereo panning that slowly drifts (lattice "wind")
        pan = 0.35 * np.sin(2 * np.pi * t * 0.008 + i * 1.3)
        audio[:, 0] += amp * sine * (1.0 - pan)
        audio[:, 1] += amp * sine * (1.0 + pan)

    # ==================== LAYER 2: FIBONACCI RHYTHM HITS (Triality Timbre) ====================
    print("Adding Fibonacci polyrhythmic hits with triality timbre switching...")
    fib_deltas = get_fibonacci_intervals()
    beat_times = np.cumsum(fib_deltas)
    beat_times = beat_times[beat_times < DURATION * 0.92]

    for bt in beat_times:
        idx = int(bt * SR)
        if idx >= len(t) - 200:
            continue
        root_idx = int((bt / DURATION) * len(selected_roots)) % len(selected_roots)
        hit_freq = freqs[root_idx]

        # Triality section (0=Western, 1=Cyber, 2=Metal)
        section = int(3 * bt / DURATION) % 3
        burst_len = int(0.165 * SR) if section != 1 else int(0.095 * SR)

        tt = np.arange(burst_len) / SR
        env = np.exp(-tt * 6.5)  # Fast natural decay

        if section == 0:  # WESTERN TWANG (resonator slide feel)
            vib = 1.0 + 0.011 * np.sin(2 * np.pi * 5.8 * tt)
            wave = (np.sin(2 * np.pi * hit_freq * vib * tt) +
                    0.42 * np.sin(2 * np.pi * 2 * hit_freq * tt))
            wave *= env * TWANG_LEVEL * 0.75

        elif section == 1:  # CYBER GLITCH (bitcrushed neon)
            noise = np.random.randn(burst_len).astype(np.float32)
            tone = np.sin(2 * np.pi * hit_freq * 1.6 * tt)
            wave = (tone * 0.55 + noise * 0.85) * env * 1.15
            # Simple sample-and-hold glitch
            step = max(2, burst_len // 18)
            for k in range(0, burst_len - step, step):
                wave[k:k+step] = wave[k]
            wave *= GLITCH_LEVEL * 0.9

        else:  # METAL INDUSTRIAL (heavy distorted hit)
            sq = np.sign(np.sin(2 * np.pi * hit_freq * 0.65 * tt))
            noise = np.random.randn(burst_len).astype(np.float32) * 0.6
            wave = (sq * 0.75 + noise) * env * 0.95
            wave *= 0.85

        # Dynamic panning following the lattice "ride"
        pan_r = 0.38 * np.sin(bt * 2.1 + root_idx)
        end_idx = min(idx + burst_len, len(t))
        actual = end_idx - idx
        audio[idx:end_idx, 0] += wave[:actual] * (0.72 - pan_r * 0.25)
        audio[idx:end_idx, 1] += wave[:actual] * (0.72 + pan_r * 0.25)

    # ==================== LAYER 3: E8 LEAD SLIDE GUITAR (Triality Walk) ====================
    print("Synthesizing E8-projected slide guitar lead with triality overdrive...")
    num_notes = 11
    lead_freqs = freqs[np.linspace(0, len(freqs)-1, num_notes, dtype=int)]
    note_dur = DURATION / num_notes

    for ni in range(num_notes):
        start_t = ni * note_dur
        end_t = min((ni + 1) * note_dur, DURATION)
        f0 = lead_freqs[ni]
        f1 = lead_freqs[(ni + 1) % num_notes]

        seg_start = int(start_t * SR)
        seg_end = int(end_t * SR)
        seg_len = seg_end - seg_start
        if seg_len < 50:
            continue
        seg_t = t[seg_start:seg_end]

        # Logarithmic glide (smooth slide feel)
        glide = np.logspace(np.log10(max(f0, 40)), np.log10(max(f1, 40)), seg_len)
        # Increasing vibrato depth for expressive slide
        vib_depth = 0.014 * (0.6 + 0.4 * np.sin(2 * np.pi * seg_t / note_dur * 1.5))
        inst_f = glide * (1 + vib_depth * np.sin(2 * np.pi * 3.7 * seg_t))
        phase = np.cumsum(2 * np.pi * inst_f / SR)

        # Guitar-like harmonics + body
        lead = (np.sin(phase) +
                0.48 * np.sin(2 * phase) * (1.0 - 0.25 * np.sin(2 * np.pi * seg_t * 0.9)) +
                0.22 * np.sin(3 * phase))
        # Note envelope (soft attack, natural decay)
        env = np.clip(np.linspace(0.15, 1.0, seg_len) * np.exp(-(seg_t - start_t) * 1.1), 0, 1)
        lead *= env * 0.38 * TWANG_LEVEL

        # Triality metal overdrive in the middle section
        if DURATION * 0.28 < start_t < DURATION * 0.72:
            lead = np.tanh(lead * 1.55)  # Light distortion for metal edge

        # Slow panning
        pan_l = 0.12 * np.sin(2 * np.pi * ni / 2.7)
        audio[seg_start:seg_end, 0] += lead * (0.88 - pan_l)
        audio[seg_start:seg_end, 1] += lead * (0.88 + pan_l)

    # ==================== LAYER 4: PERTURBATION GLITCHES + SIGNAL DECAY NOISE ====================
    print("Adding signal decay noise floor and cyber lattice perturbations...")
    # Rising dust/noise floor (signal decay aesthetic)
    decay_noise = np.random.randn(len(t)).astype(np.float32) * 0.0075
    decay_noise *= (0.25 + 0.75 * (t / DURATION) ** 1.6)  # Increases toward end
    audio[:, 0] += decay_noise * 0.55
    audio[:, 1] += decay_noise * 0.55

    # Stronger deliberate cyber glitches at irregular (near-Fib) times
    glitch_centers = np.linspace(1.8, DURATION - 0.8, 9) + np.sin(np.arange(9)) * 0.25
    for gt in glitch_centers:
        g_idx = int(gt * SR)
        g_len = int(0.065 * SR)
        if g_idx + g_len >= len(t):
            continue
        g_noise = np.random.randn(g_len).astype(np.float32) * GLITCH_LEVEL * 1.6 * (0.6 + gt / DURATION)
        # Bit-crush / sample-hold for digital corruption feel
        crush_step = max(2, g_len // 14)
        for k in range(0, g_len, crush_step):
            g_noise[k:k+crush_step] = g_noise[k]
        audio[g_idx:g_idx+g_len, 0] += g_noise * 0.9
        audio[g_idx:g_idx+g_len, 1] -= g_noise * 0.65  # Wide stereo glitch

    # ==================== MASTER BUS ====================
    print("Master processing: waveshape, normalize, fade...")
    # Soft metal-style distortion / waveshaping
    audio = np.tanh(audio * METAL_DRIVE)

    # Peak normalize with headroom
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        audio /= (peak * 1.08)

    # Smooth fade in/out
    fade = int(0.9 * SR)
    fade_in = np.linspace(0, 1, fade)
    fade_out = np.linspace(1, 0, fade)
    audio[:fade, 0] *= fade_in
    audio[:fade, 1] *= fade_in
    audio[-fade:, 0] *= fade_out
    audio[-fade:, 1] *= fade_out

    # Write 32-bit float WAV (widely compatible)
    write(OUTPUT_FILE, SR, audio)
    print(f"\n✓ Generated: {OUTPUT_FILE}")
    print(f"  Duration: {DURATION:.1f}s | Sample rate: {SR} Hz | Stereo")
    print(f"  E8 geometry → 432 Hz tuning → Triality timbres → Fibonacci rhythm")
    print(f"  Signal decay + lattice perturbations active")
    print("Ready for your DAW, YouTube visuals, or further E8 iteration.\n")


if __name__ == "__main__":
    main()
