#!/usr/bin/env python3
"""
Complete E8 Sonification Script - Tool Style
============================================
- 240 E8 roots
- Golden-ratio weighted pitch deltas (Fibonacci / Lateralus connection)
- 7/8-inspired syncopated groove
- 432 Hz tuning
- Self-contained: writes WAV next to this file on any machine
"""

import numpy as np
from scipy.io import wavfile
from itertools import combinations, product
import os


def generate_e8_roots():
    """Generate the 240 roots of the E8 root system."""
    roots = []
    # 112 roots: (±1, ±1, 0, ..., 0)
    for pos in combinations(range(8), 2):
        for s1 in [-1.0, 1.0]:
            for s2 in [-1.0, 1.0]:
                v = np.zeros(8, dtype=np.float32)
                v[list(pos)[0]] = s1
                v[list(pos)[1]] = s2
                roots.append(v)
    # 128 roots: all ±1/2 with even number of minuses
    for signs in product([-0.5, 0.5], repeat=8):
        if sum(1 for s in signs if s < 0) % 2 == 0:
            roots.append(np.array(signs, dtype=np.float32))
    return np.array(roots, dtype=np.float32)


def apply_lowpass(signal, cutoff, sr):
    if len(signal) == 0:
        return signal
    dt = 1.0 / sr
    rc = 1.0 / (2 * np.pi * cutoff)
    alpha = dt / (rc + dt)
    y = np.zeros_like(signal, dtype=np.float32)
    y[0] = signal[0]
    for i in range(1, len(signal)):
        y[i] = y[i-1] + alpha * (signal[i] - y[i-1])
    return y


def apply_highpass(signal, cutoff, sr):
    if len(signal) == 0:
        return signal
    dt = 1.0 / sr
    rc = 1.0 / (2 * np.pi * cutoff)
    alpha = rc / (rc + dt)
    y = np.zeros_like(signal, dtype=np.float32)
    y[0] = signal[0]
    for i in range(1, len(signal)):
        y[i] = alpha * (y[i-1] + signal[i] - signal[i-1])
    return y


def adsr_envelope(n_samples, attack=0.005, decay=0.05, sustain_level=0.6,
                  release=0.1, sr=44100):
    if n_samples <= 0:
        return np.array([], dtype=np.float32)
    env = np.ones(n_samples, dtype=np.float32)
    a_s = min(int(attack * sr), n_samples)
    d_s = min(int(decay * sr), n_samples - a_s)
    r_s = min(int(release * sr), n_samples)
    if a_s > 0:
        env[:a_s] = np.linspace(0.0, 1.0, a_s, dtype=np.float32)
    sustain_start = a_s + d_s
    if d_s > 0 and sustain_start < n_samples:
        env[a_s:sustain_start] = np.linspace(1.0, sustain_level, d_s, dtype=np.float32)
    sustain_end = n_samples - r_s
    if sustain_end > sustain_start:
        env[sustain_start:sustain_end] = sustain_level
    if r_s > 0 and sustain_end >= 0 and sustain_end < n_samples:
        env[max(sustain_end, 0):] = np.linspace(sustain_level, 0.0, r_s, dtype=np.float32)
    return env


def synthesize_guitar_note(freq, duration, sr=44100, dist=2.35, cutoff=1580, gain=0.70):
    n_samples = max(8, int(sr * duration))
    t = np.arange(n_samples, dtype=np.float32) / sr
    saw = 2.0 * ((t * freq) % 1.0) - 1.0
    sq = np.sign(np.sin(2.0 * np.pi * freq * t)) * 0.75
    detune = 0.007
    saw2 = 2.0 * ((t * freq * (1.0 + detune)) % 1.0) - 1.0
    wave = 0.55 * saw + 0.30 * sq + 0.15 * saw2
    wave = np.tanh(wave * dist)
    wave = apply_lowpass(wave, cutoff, sr)
    env = adsr_envelope(n_samples, attack=0.003, decay=0.07,
                        sustain_level=0.48, release=0.18, sr=sr)
    wave = wave * env * gain
    return wave.astype(np.float32)


def synthesize_bass_note(freq, duration, sr=44100, dist=1.25, cutoff=620, gain=0.82):
    n_samples = max(8, int(sr * duration))
    t = np.arange(n_samples, dtype=np.float32) / sr
    sine = np.sin(2.0 * np.pi * freq * t)
    sq = np.sign(np.sin(2.0 * np.pi * freq * t)) * 0.65
    sub = np.sin(2.0 * np.pi * (freq * 0.5) * t) * 0.85
    wave = 0.45 * sine + 0.30 * sq + 0.25 * sub
    wave = np.tanh(wave * dist)
    wave = apply_lowpass(wave, cutoff, sr)
    env = adsr_envelope(n_samples, attack=0.004, decay=0.10,
                        sustain_level=0.62, release=0.28, sr=sr)
    wave = wave * env * gain
    return wave.astype(np.float32)


def synthesize_kick(duration=0.68, sr=44100):
    n = max(8, int(sr * duration))
    t = np.arange(n, dtype=np.float32) / sr
    f0, f1 = 115.0, 42.0
    freq_t = f0 * np.exp(np.log(f1 / f0) * t / duration)
    phase = 2.0 * np.pi * np.cumsum(freq_t) / sr
    sine = np.sin(phase)
    noise = np.random.randn(n).astype(np.float32) * 0.35
    click_env = np.exp(-t / 0.018) * (t < 0.06)
    body_env = np.exp(-t / 0.28)
    wave = sine * body_env * 0.92 + noise * click_env * 1.6
    wave = np.tanh(wave * 1.4)
    return wave.astype(np.float32)


def synthesize_snare(duration=0.40, sr=44100):
    n = max(8, int(sr * duration))
    t = np.arange(n, dtype=np.float32) / sr
    noise = np.random.randn(n).astype(np.float32)
    tone = np.sin(2.0 * np.pi * 210.0 * t) * np.exp(-t / 0.12)
    noise_env = np.exp(-t / 0.22)
    wave = tone * 0.38 + noise * noise_env * 0.82
    wave = apply_highpass(wave, 140.0, sr)
    wave = np.tanh(wave * 1.1)
    return wave.astype(np.float32)


def synthesize_hihat(duration=0.105, open=False, sr=44100):
    n = max(4, int(sr * duration))
    t = np.arange(n, dtype=np.float32) / sr
    noise = np.random.randn(n).astype(np.float32) * (1.8 if open else 1.1)
    env = np.exp(-t / (0.38 if open else 0.048))
    wave = noise * env
    wave = apply_highpass(wave, 3800.0 if open else 5200.0, sr)
    return wave.astype(np.float32) * (0.55 if open else 0.42)


def get_pitches_from_e8(roots, base_midi=37, num_pitches=4096):
    pitches = []
    current = base_midi
    phi = (1.0 + np.sqrt(5.0)) / 2.0
    weights = np.array([phi**k for k in range(8)], dtype=np.float32)
    weights = weights / np.linalg.norm(weights)
    for i in range(num_pitches):
        if i == 0:
            pitches.append(current)
            continue
        prev_r = roots[(i - 1) % 240]
        curr_r = roots[i % 240]
        delta = curr_r - prev_r
        val = np.dot(delta, weights)
        shift = int(np.round(val * 4.2))
        current = current + shift
        current = max(32, min(55, current))
        pitches.append(current)
    return pitches


def normalize_audio(audio):
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        return (audio / peak) * 0.92
    return audio


def main():
    SR = 44100
    BPM = 108
    BASE_MIDI = 37
    DURATION_SEC = 48.0

    # Always write the WAV next to this script (works on any machine)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    OUTPUT_PATH = os.path.join(script_dir, "e8_sonification_tool_style_432hz.wav")

    print("Generating E8 root system (240 roots)...")
    roots = generate_e8_roots()
    print(f"  Generated {len(roots)} roots.")

    print("Sonifying E8 deltas to pitches (golden ratio weights)...")
    pitches = get_pitches_from_e8(roots, base_midi=BASE_MIDI, num_pitches=4096)
    print(f"  {len(pitches)} pitches. Example: {pitches[:8]}")

    sec_per_16th = 60.0 / (BPM * 4.0)
    total_steps = int(DURATION_SEC / sec_per_16th) + 20
    total_samples = int(DURATION_SEC * SR) + SR
    audio = np.zeros(total_samples, dtype=np.float32)

    bar_len = 14
    onset_pattern = [True, False, True, True, False, True, False,
                     True, True, False, True, False, True, True]
    kick_pos = [0, 5, 9]
    snare_pos = [3, 10]
    hat_pos = list(range(0, bar_len, 2))
    open_hat_pos = [4, 11]

    print("Rendering (E8 riff + drums + bass)...")
    note_idx = 0
    for step in range(total_steps):
        pos = step % bar_len
        t_sec = step * sec_per_16th
        s_pos = int(t_sec * SR)
        if s_pos >= total_samples:
            break

        # Drums
        if pos in kick_pos:
            k = synthesize_kick(0.68, SR)
            e = min(s_pos + len(k), total_samples)
            audio[s_pos:e] += k[:e - s_pos] * 0.88
        if pos in snare_pos:
            sn = synthesize_snare(0.40, SR)
            e = min(s_pos + len(sn), total_samples)
            audio[s_pos:e] += sn[:e - s_pos] * 0.78
        if pos in hat_pos:
            hh = synthesize_hihat(0.105, open=False, sr=SR)
            e = min(s_pos + len(hh), total_samples)
            audio[s_pos:e] += hh[:e - s_pos] * 0.32
        if pos in open_hat_pos:
            oh = synthesize_hihat(0.32, open=True, sr=SR)
            e = min(s_pos + len(oh), total_samples)
            audio[s_pos:e] += oh[:e - s_pos] * 0.22

        # E8-driven guitar riff
        if onset_pattern[pos]:
            p = pitches[note_idx % len(pitches)]
            f = 432.0 * (2.0 ** ((p - 69) / 12.0))
            ndur = 0.29 if pos in [0, 7] else (0.17 if pos in [2, 4, 9] else 0.105)
            gnote = synthesize_guitar_note(f, ndur, sr=SR)
            e = min(s_pos + len(gnote), total_samples)
            audio[s_pos:e] += gnote[:e - s_pos] * 0.92
            note_idx += 1

        # Bass on strong onsets
        if onset_pattern[pos] and pos in [0, 3, 7, 10]:
            bp = max(24, p - 12)
            bf = 432.0 * (2.0 ** ((bp - 69) / 12.0))
            bnote = synthesize_bass_note(bf, 0.38, sr=SR)
            e = min(s_pos + len(bnote), total_samples)
            audio[s_pos:e] += bnote[:e - s_pos] * 0.62

    print("Post-processing...")
    audio = normalize_audio(audio)
    audio = np.tanh(audio * 1.05) * 0.93
    audio = audio[:int(DURATION_SEC * SR)]

    print("Writing WAV...")
    os.makedirs(os.path.dirname(OUTPUT_PATH) or ".", exist_ok=True)
    wavfile.write(OUTPUT_PATH, SR, (audio * 32767.0).astype(np.int16))

    print(f"\n✓ Saved: {OUTPUT_PATH}")
    print(f"  Duration: {len(audio)/SR:.2f}s | {BPM} BPM | A4=432 Hz")
    print(f"  E8 roots: 240 | Pitch events: ~{note_idx}")


if __name__ == "__main__":
    main()
