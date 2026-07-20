#!/usr/bin/env python3
"""
E8 Root System Sonification → Roland R-8 style Drum Loop
Optimized for Industrial Metal production.

Maps the 240 roots of E₈ to a quantized 16th-note drum grid.
- Integer roots (112): sparse dual-hits from the two non-zero coordinates
  (the classic (±1,±1,0…) vectors). These give clean, geometric pairings.
- Half-integer roots (128): denser “spinorial” accents. Their sign patterns
  select primary drums + always layer a metallic clang for industrial grit.

All generation is fully deterministic (fixed seed for noise textures only).
The resulting WAV is seamless-loopable and ready for heavy processing
(distortion, compression, sidechain, layering with distorted guitars, etc.).

Dependencies: numpy, scipy
"""

from __future__ import annotations

import numpy as np
from itertools import product
from scipy.io import wavfile
from scipy import signal

# ──────────────────────────────────────────────────────────────
# USER PARAMETERS – tweak these for different industrial flavours
# ──────────────────────────────────────────────────────────────
SR               = 44100          # sample rate
BPM              = 138.0          # classic industrial-metal tempo range 120-160
BARS             = 4              # loop length in bars (4 or 8 recommended)
STEPS_PER_BEAT   = 4              # 4 = 16th notes (tight mechanical grid)
DRIVE            = 2.1            # soft-clip drive for digital/industrial edge
OUTPUT_FILE      = "e8_r8_industrial_metal_loop.wav"
NOISE_SEED       = 8              # fixed → reproducible noise textures (E8 nod)
HEADROOM         = 0.92           # final peak level

# Dimension → drum voice mapping (feel free to reorder)
DRUM_NAMES = [
    "kick",   # dim 0 – foundation
    "snare",  # dim 1 – backbeat / crack
    "chh",    # dim 2 – closed hat (mechanical)
    "ohh",    # dim 3 – open hat
    "ltom",   # dim 4 – low tom / floor
    "htom",   # dim 5 – high tom
    "ride",   # dim 6 – ride / metallic sustain
    "clang",  # dim 7 – industrial anvil / scrap metal
]

# ──────────────────────────────────────────────────────────────
# E₈ ROOTS
# ──────────────────────────────────────────────────────────────
def generate_e8_roots() -> np.ndarray:
    """Return the 240 roots of E₈ as (240, 8) float64 array.
    All have squared length exactly 2.
    """
    roots = []

    # 112 roots of the form (±1, ±1, 0, 0, 0, 0, 0, 0) and permutations
    for i in range(8):
        for j in range(i + 1, 8):
            for s1, s2 in product([-1.0, 1.0], repeat=2):
                v = np.zeros(8, dtype=np.float64)
                v[i] = s1
                v[j] = s2
                roots.append(v)

    # 128 roots of the form (±½, ±½, …, ±½) with an even number of minus signs
    for signs in product([-1.0, 1.0], repeat=8):
        if np.prod(signs) > 0.0:          # even number of negatives
            roots.append(0.5 * np.asarray(signs, dtype=np.float64))

    roots = np.asarray(roots)
    assert roots.shape == (240, 8)
    assert np.allclose(np.sum(roots ** 2, axis=1), 2.0)
    return roots


def order_roots(roots: np.ndarray) -> np.ndarray:
    """Deterministic lexicographic ordering (primary key = first coordinate)."""
    # np.lexsort uses the last key as primary, so reverse the columns
    keys = tuple(roots[:, k] for k in range(7, -1, -1))
    return roots[np.lexsort(keys)]


# ──────────────────────────────────────────────────────────────
# DRUM SYNTHESIS (Roland R-8 inspired + industrial metal character)
# All functions return mono float64 arrays in [-1, 1] range roughly.
# ──────────────────────────────────────────────────────────────
def soft_clip(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    """Symmetric soft saturation – gives the digital/industrial grit."""
    return np.tanh(x * drive) / np.tanh(drive)


def _exp_decay(t: np.ndarray, rate: float) -> np.ndarray:
    return np.exp(-t * rate)


def make_kick(sr: int = SR, length: float = 0.48) -> np.ndarray:
    """Deep, punchy kick with sharp beater click – R-8 / 909 hybrid for metal."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr

    # Body: exponential pitch sweep
    f_start, f_end = 165.0, 38.0
    pitch = f_end + (f_start - f_end) * _exp_decay(t, 28.0)
    phase = 2.0 * np.pi * np.cumsum(pitch) / sr
    body = np.sin(phase)

    # Amplitude envelope (slightly slower for weight)
    amp = _exp_decay(t, 6.8)

    # Beater click (short noise + high sine)
    click_env = _exp_decay(t, 95.0)
    click = (0.55 * np.random.randn(n) + 0.35 * np.sin(2 * np.pi * 2200 * t)) * click_env

    wave = (0.82 * body + 0.45 * click) * amp
    wave -= np.mean(wave)  # remove any DC
    return soft_clip(wave * 1.15, 1.4)


def make_snare(sr: int = SR, length: float = 0.32) -> np.ndarray:
    """Crack + body – sharp enough for industrial backbeats."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr

    # Tonal body
    body = np.sin(2 * np.pi * 185 * t) * _exp_decay(t, 18.0)
    body += 0.4 * np.sin(2 * np.pi * 330 * t) * _exp_decay(t, 22.0)

    # Noise (snares)
    noise = np.random.randn(n)
    # Mild high-shelf character
    b, a = signal.butter(1, 1800 / (sr / 2), btype="high")
    noise = signal.lfilter(b, a, noise)
    noise *= _exp_decay(t, 11.5)

    wave = 0.55 * body + 0.75 * noise
    return soft_clip(wave * 1.1, 1.6)


def make_chh(sr: int = SR, length: float = 0.07) -> np.ndarray:
    """Tight closed hat – metallic, short, mechanical."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr
    noise = np.random.randn(n)
    b, a = signal.butter(2, 6500 / (sr / 2), btype="high")
    noise = signal.lfilter(b, a, noise)
    env = _exp_decay(t, 55.0)
    # Tiny metallic ring
    ring = 0.15 * np.sin(2 * np.pi * 9800 * t) * _exp_decay(t, 80.0)
    return soft_clip((noise + ring) * env * 0.9, 1.8)


def make_ohh(sr: int = SR, length: float = 0.28) -> np.ndarray:
    """Open hat – longer decay, still bright."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr
    noise = np.random.randn(n)
    b, a = signal.butter(2, 5200 / (sr / 2), btype="high")
    noise = signal.lfilter(b, a, noise)
    env = _exp_decay(t, 9.5)
    ring = 0.12 * np.sin(2 * np.pi * 7500 * t) * _exp_decay(t, 14.0)
    return soft_clip((noise + ring) * env * 0.85, 1.5)


def make_ltom(sr: int = SR, length: float = 0.38) -> np.ndarray:
    """Low tom – weighty, slight pitch drop."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr
    f = 95.0 + 40.0 * _exp_decay(t, 12.0)
    phase = 2 * np.pi * np.cumsum(f) / sr
    body = np.sin(phase) * _exp_decay(t, 8.5)
    noise = 0.25 * np.random.randn(n) * _exp_decay(t, 20.0)
    return soft_clip((body + noise) * 0.9, 1.3)


def make_htom(sr: int = SR, length: float = 0.30) -> np.ndarray:
    """High tom."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr
    f = 165.0 + 55.0 * _exp_decay(t, 14.0)
    phase = 2 * np.pi * np.cumsum(f) / sr
    body = np.sin(phase) * _exp_decay(t, 10.0)
    noise = 0.22 * np.random.randn(n) * _exp_decay(t, 22.0)
    return soft_clip((body + noise) * 0.9, 1.3)


def make_ride(sr: int = SR, length: float = 0.55) -> np.ndarray:
    """Ride-ish metallic wash – longer, inharmonic."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr
    # Several inharmonic partials
    partials = [420.0, 420 * 1.37, 420 * 2.51, 420 * 3.9]
    wave = np.zeros(n)
    for i, f in enumerate(partials):
        wave += (0.45 / (i + 1)) * np.sin(2 * np.pi * f * t) * _exp_decay(t, 4.5 + i * 1.8)
    # Filtered noise for shimmer
    noise = np.random.randn(n)
    b, a = signal.butter(2, [3000 / (sr / 2), 9000 / (sr / 2)], btype="band")
    noise = signal.lfilter(b, a, noise) * _exp_decay(t, 6.0) * 0.35
    wave += noise
    return soft_clip(wave * 0.75, 1.4)


def make_clang(sr: int = SR, length: float = 0.22) -> np.ndarray:
    """Signature industrial clang / anvil hit – inharmonic + FM."""
    n = int(length * sr)
    t = np.arange(n, dtype=np.float64) / sr

    # Inharmonic metallic partials
    freqs = [280.0, 280 * 1.414, 280 * 2.236, 280 * 3.605, 280 * 5.1]
    wave = np.zeros(n)
    for i, f in enumerate(freqs):
        wave += (0.55 / (1.2 + i)) * np.sin(2 * np.pi * f * t) * _exp_decay(t, 9.0 + i * 2.5)

    # FM clang layer
    mod_idx = 5.5
    mod = np.sin(2 * np.pi * 145 * t)
    carrier = np.sin(2 * np.pi * 620 * t + mod_idx * mod)
    wave += 0.55 * carrier * _exp_decay(t, 14.0)

    # Short noise transient
    noise = np.random.randn(n) * _exp_decay(t, 40.0) * 0.4
    wave += noise

    return soft_clip(wave * 0.85, 2.4)


# ──────────────────────────────────────────────────────────────
# BUFFER UTILITIES
# ──────────────────────────────────────────────────────────────
def add_stereo(
    buffer: np.ndarray,
    hit: np.ndarray,
    start: int,
    vel: float = 1.0,
    pan: float = 0.0,
) -> None:
    """Add a mono hit into a stereo buffer with constant-power panning.
    Wraps around the end for seamless looping.
    pan ∈ [-1, +1]
    """
    # Constant-power pan law
    theta = (np.clip(pan, -1.0, 1.0) + 1.0) * (np.pi / 4.0)
    g_l = np.cos(theta) * vel
    g_r = np.sin(theta) * vel

    n = len(hit)
    total = len(buffer)
    for i in range(n):
        pos = (start + i) % total
        buffer[pos, 0] += hit[i] * g_l
        buffer[pos, 1] += hit[i] * g_r


# ──────────────────────────────────────────────────────────────
# MAIN GENERATION
# ──────────────────────────────────────────────────────────────
def main() -> None:
    print("═" * 60)
    print("  E₈ → Roland R-8 Industrial Metal Drum Loop Sonification")
    print("═" * 60)

    print("\n[1/5] Generating and ordering the 240 E₈ roots …")
    roots = generate_e8_roots()
    sorted_roots = order_roots(roots)
    n_int = np.sum(np.max(np.abs(sorted_roots), axis=1) > 0.6)
    print(f"      {len(sorted_roots)} roots  |  {n_int} integer-type  |  {240 - n_int} half-integer")

    beats = BARS * 4
    num_steps = int(beats * STEPS_PER_BEAT)
    duration = beats * (60.0 / BPM)
    total_samples = int(round(duration * SR))

    print(f"\n[2/5] Loop geometry: {BARS} bars × {BPM} BPM → {duration:.3f}s")
    print(f"      {num_steps} sixteenth-note steps  |  {total_samples} samples @ {SR} Hz")

    print("\n[3/5] Synthesizing drum voices (seeded for determinism) …")
    np.random.seed(NOISE_SEED)
    hits = {
        "kick":  make_kick(),
        "snare": make_snare(),
        "chh":   make_chh(),
        "ohh":   make_ohh(),
        "ltom":  make_ltom(),
        "htom":  make_htom(),
        "ride":  make_ride(),
        "clang": make_clang(),
    }
    for name, h in hits.items():
        print(f"      {name:6s}  {len(h)/SR*1000:5.1f} ms")

    print("\n[4/5] Mapping E₈ geometry onto the rhythmic grid …")
    buffer = np.zeros((total_samples, 2), dtype=np.float64)

    for step in range(num_steps):
        r = sorted_roots[step % 240]
        # Exact sample position of this 16th-note
        start = int(round((step / STEPS_PER_BEAT) * (60.0 / BPM) * SR))

        is_integer = bool(np.max(np.abs(r)) > 0.6)

        if is_integer:
            # Classic root: exactly two ±1 entries → two simultaneous hits
            idxs = np.flatnonzero(np.abs(r) > 0.6)
            for d in idxs:
                name = DRUM_NAMES[d]
                vel = 0.75 + 0.25 * abs(float(r[d]))   # 1.0
                # Use the actual signed coordinate for pan (left/right bias)
                pan = float(r[d]) * 0.9
                add_stereo(buffer, hits[name], start, vel=vel, pan=pan)
        else:
            # Half-integer (spinor) root: denser, more chaotic industrial texture
            # Encode the 8 signs into an integer code
            signs = (r > 0).astype(np.int32)
            code = 0
            for bit in signs:
                code = (code << 1) | int(bit)

            primary = code % 8
            name = DRUM_NAMES[primary]
            # Milder velocity + always a clang layer for industrial character
            pan1 = ((code % 17) - 8) / 8.0
            add_stereo(buffer, hits[name], start, vel=0.52, pan=pan1)
            # Extra metallic accent (the “industrial” signature of the spinors)
            pan2 = -0.45 + 0.9 * ((code // 3) % 5) / 4.0
            add_stereo(buffer, hits["clang"], start, vel=0.38, pan=pan2)

    print("\n[5/5] Normalising, saturating & writing WAV …")
    peak = np.max(np.abs(buffer))
    if peak > 1e-8:
        buffer /= peak
    buffer = soft_clip(buffer, DRIVE)
    buffer *= HEADROOM

    # Convert to 16-bit PCM
    pcm = np.clip(buffer * 32767.0, -32768, 32767).astype(np.int16)
    wavfile.write(OUTPUT_FILE, SR, pcm)

    print(f"\n✓  Wrote {OUTPUT_FILE}")
    print(f"   Duration : {duration:.3f}s  |  Peak : {HEADROOM:.2f}  |  Drive : {DRIVE}")
    print("\nImport into your DAW. Layer with heavily distorted guitars,")
    print("side-chain the kick, add room/plate, and let the lattice grind.")
    print("═" * 60)


if __name__ == "__main__":
    main()
