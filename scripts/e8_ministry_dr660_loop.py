#!/usr/bin/env python3
"""
E8 Sonification → Ministry-style industrial drum loop (Boss DR-660 aesthetic).
Deterministic synthesis of a 16-step pattern derived from E8 root system /
Cartan / Coxeter structure → .wav

- Cartan / rank-8 pulse on the kick + continuous hats
- Snare + metallic "root" layer placed with Coxeter residue / Dynkin-branch flavour
- 112/128 root-split influence on density of solid vs metallic voices
"""

import numpy as np
from scipy.io import wavfile
from scipy import signal

# ============================================================
# Parameters – edit these
# ============================================================
SAMPLE_RATE = 44100
BPM = 132
STEPS_PER_BAR = 16
BARS = 4                    # increase for longer loop

seconds_per_beat = 60.0 / BPM
seconds_per_step = seconds_per_beat / 4.0
samples_per_step = int(round(SAMPLE_RATE * seconds_per_step))
samples_per_bar = samples_per_step * STEPS_PER_BAR
total_samples = samples_per_bar * BARS

print(f"BPM: {BPM}  |  step: {seconds_per_step*1000:.1f} ms  |  total: {total_samples/SAMPLE_RATE:.2f}s")

# ============================================================
# Synthesis (dry industrial)
# ============================================================

def generate_kick(duration=0.45):
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n) / SAMPLE_RATE
    freq = 45.0 + 115.0 * np.exp(-t * 28.0)
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    body = np.sin(phase) * np.exp(-t * 9.5)
    click = (np.sin(2 * np.pi * 2800 * t) * np.exp(-t * 180) +
             0.4 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120))
    wave = np.tanh((0.85 * body + 0.35 * click) * 1.4)
    return wave.astype(np.float64)


def generate_snare(duration=0.28):
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n) / SAMPLE_RATE
    body = (np.sin(2 * np.pi * 195 * t) * np.exp(-t * 28) +
            0.4 * np.sin(2 * np.pi * 330 * t) * np.exp(-t * 40))
    rng = np.random.RandomState(42)
    noise = rng.randn(n)
    b, a = signal.butter(2, [800, 8000], btype='band', fs=SAMPLE_RATE)
    noise = signal.lfilter(b, a, noise) * np.exp(-t * 18)
    wave = np.tanh((0.55 * body + 0.75 * noise) * 1.3)
    return wave.astype(np.float64)


def generate_closed_hat(duration=0.08):
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.RandomState(123)
    noise = rng.randn(n)
    b, a = signal.butter(3, 6000, btype='high', fs=SAMPLE_RATE)
    noise = signal.lfilter(b, a, noise)
    return (noise * np.exp(-t * 70) * 0.55).astype(np.float64)


def generate_open_hat(duration=0.35):
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.RandomState(456)
    noise = rng.randn(n)
    b, a = signal.butter(2, 4500, btype='high', fs=SAMPLE_RATE)
    noise = signal.lfilter(b, a, noise)
    ring = 0.15 * np.sin(2 * np.pi * 7800 * t) * np.exp(-t * 25)
    return ((noise * np.exp(-t * 9) + ring) * 0.45).astype(np.float64)


def generate_tom(base_freq=110.0, duration=0.35):
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n) / SAMPLE_RATE
    freq = base_freq * (1.0 + 0.15 * np.exp(-t * 20))
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    body = np.sin(phase) * np.exp(-t * 8.5)
    rng = np.random.RandomState(int(base_freq * 10))
    noise = rng.randn(n) * 0.08 * np.exp(-t * 25)
    return np.tanh((body + noise) * 1.2).astype(np.float64)


def generate_clang(duration=0.22):
    """Inharmonic metallic industrial hit (the E8 'root' voice)."""
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n) / SAMPLE_RATE
    ratios = [1.0, 1.41, 2.15, 2.76, 3.89, 5.12]
    amps   = [1.0, 0.7,  0.45, 0.3,  0.18, 0.1]
    base = 620.0
    wave = np.zeros(n)
    for r, a in zip(ratios, amps):
        wave += a * np.sin(2 * np.pi * base * r * t)
    env = np.exp(-t * 22)
    rng = np.random.RandomState(789)
    noise = rng.randn(n) * 0.25 * np.exp(-t * 60)
    return np.tanh((wave * env + noise) * 1.5 * 0.55).astype(np.float64)


print("Synthesizing voices...")
kick   = generate_kick()
snare  = generate_snare()
ch     = generate_closed_hat()
oh     = generate_open_hat()
lowtom = generate_tom(95.0)
midtom = generate_tom(145.0)
clang  = generate_clang()

# ============================================================
# Pattern (0-based steps) – E8-informed industrial grid
# ============================================================
pattern = {
    'kick':   [0, 2, 5, 7, 10, 12, 15],   # Cartan / even-lattice skeleton
    'snare':  [2, 6, 10],
    'ch':     list(range(16)),            # continuous root-length background
    'oh':     [3, 9, 13],
    'lowtom': [1, 5, 9],
    'midtom': [5, 9, 13],
    'clang':  [0, 3, 5, 8, 10, 13, 15],   # Coxeter / Dynkin-branch flavour
}

gains = {
    'kick': 1.00, 'snare': 0.92, 'ch': 0.38, 'oh': 0.55,
    'lowtom': 0.65, 'midtom': 0.58, 'clang': 0.78,
}

voices = {
    'kick': kick, 'snare': snare, 'ch': ch, 'oh': oh,
    'lowtom': lowtom, 'midtom': midtom, 'clang': clang,
}

# ============================================================
# Render
# ============================================================
print("Rendering...")
mix = np.zeros(total_samples, dtype=np.float64)

for bar in range(BARS):
    bar_offset = bar * samples_per_bar
    for name, steps in pattern.items():
        sample = voices[name]
        g = gains[name]
        for step in steps:
            start = bar_offset + step * samples_per_step
            end = min(start + len(sample), total_samples)
            mix[start:end] += sample[:end-start] * g

mix = np.tanh(mix * 1.15)          # soft industrial saturation
peak = np.max(np.abs(mix))
if peak > 0:
    mix = mix / peak * 0.89

mix_int = np.int16(mix * 32767)
out_path = "e8_ministry_dr660_loop.wav"
wavfile.write(out_path, SAMPLE_RATE, mix_int)

print(f"Wrote {out_path}  ({len(mix_int)/SAMPLE_RATE:.2f}s)")
print("Done.")
