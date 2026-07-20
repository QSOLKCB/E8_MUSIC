#!/usr/bin/env python3
"""
E8 Sonification – Stabbing Westward Style
=========================================
Industrial rock / dark electronic-rock sonification of the E8 root system.

Inspired by the aggressive, dark, moody atmospherics of Stabbing Westward:
- Layered, heavily distorted "stabbing" guitar riffs with tight envelopes
- Driving industrial rhythms (syncopated 4/4 with electronic grit)
- Deep, saturated bass
- Synth-like textures via filtered oscillators
- Golden-ratio (phi) weighted pitch deltas from E8 roots (Fibonacci / Lateralus lineage)
- 432 Hz tuning
- Self-contained: writes WAV next to this file on any machine

240 E8 roots → pitch sequence → industrial arrangement
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


def synthesize_guitar_stab(freq, duration, sr=44100, dist=3.4, cutoff=1850, gain=0.78):
    """
    Aggressive, short 'stabbing' industrial guitar note.
    High saturation + tight envelope for the classic Stabbing Westward crunch.
    """
    n_samples = max(8, int(sr * duration))
    t = np.arange(n_samples, dtype=np.float32) / sr

    # Layered oscillators for thickness (saw + slightly detuned + square grit)
    saw = 2.0 * ((t * freq) % 1.0) - 1.0
    sq = np.sign(np.sin(2.0 * np.pi * freq * t)) * 0.70
    detune = 0.009
    saw2 = 2.0 * ((t * freq * (1.0 + detune)) % 1.0) - 1.0
    # Slight upper harmonic grit
    saw3 = 2.0 * ((t * freq * 1.997) % 1.0) - 1.0

    wave = 0.48 * saw + 0.28 * sq + 0.16 * saw2 + 0.08 * saw3
    wave = np.tanh(wave * dist)           # heavy industrial saturation
    wave = apply_lowpass(wave, cutoff, sr)

    # Tight, stabbing ADSR – short attack, quick decay, low sustain, short release
    env = adsr_envelope(n_samples,
                        attack=0.002,
                        decay=0.045,
                        sustain_level=0.28,
                        release=0.09,
                        sr=sr)
    wave = wave * env * gain
    return wave.astype(np.float32)


def synthesize_bass_note(freq, duration, sr=44100, dist=1.65, cutoff=480, gain=0.88):
    """Deep, saturated industrial bass with sub content."""
    n_samples = max(8, int(sr * duration))
    t = np.arange(n_samples, dtype=np.float32) / sr
    sine = np.sin(2.0 * np.pi * freq * t)
    sq = np.sign(np.sin(2.0 * np.pi * freq * t)) * 0.55
    sub = np.sin(2.0 * np.pi * (freq * 0.5) * t) * 0.90
    wave = 0.40 * sine + 0.28 * sq + 0.32 * sub
    wave = np.tanh(wave * dist)
    wave = apply_lowpass(wave, cutoff, sr)
    env = adsr_envelope(n_samples,
                        attack=0.006,
                        decay=0.12,
                        sustain_level=0.58,
                        release=0.22,
                        sr=sr)
    wave = wave * env * gain
    return wave.astype(np.float32)


def synthesize_synth_pad(freq, duration, sr=44100, cutoff=920, gain=0.35):
    """Dark atmospheric synth pad / texture layer (JD-800 / industrial vibe)."""
    n_samples = max(8, int(sr * duration))
    t = np.arange(n_samples, dtype=np.float32) / sr
    # Soft detuned saws + sine for body
    s1 = 2.0 * ((t * freq) % 1.0) - 1.0
    s2 = 2.0 * ((t * freq * 1.003) % 1.0) - 1.0
    s3 = np.sin(2.0 * np.pi * freq * 0.5 * t) * 0.6
    wave = 0.45 * s1 + 0.35 * s2 + 0.20 * s3
    wave = np.tanh(wave * 1.15)
    wave = apply_lowpass(wave, cutoff, sr)
    # Slow attack / long release for atmosphere
    env = adsr_envelope(n_samples,
                        attack=0.18,
                        decay=0.35,
                        sustain_level=0.55,
                        release=0.55,
                        sr=sr)
    wave = wave * env * gain
    return wave.astype(np.float32)


def synthesize_kick(duration=0.62, sr=44100):
    """Punchy industrial kick with click and body."""
    n = max(8, int(sr * duration))
    t = np.arange(n, dtype=np.float32) / sr
    f0, f1 = 138.0, 38.0
    freq_t = f0 * np.exp(np.log(f1 / f0) * t / duration)
    phase = 2.0 * np.pi * np.cumsum(freq_t) / sr
    sine = np.sin(phase)
    noise = np.random.randn(n).astype(np.float32) * 0.42
    click_env = np.exp(-t / 0.012) * (t < 0.045)
    body_env = np.exp(-t / 0.24)
    wave = sine * body_env * 0.95 + noise * click_env * 1.85
    wave = np.tanh(wave * 1.55)
    return wave.astype(np.float32)


def synthesize_snare(duration=0.38, sr=44100):
    """Industrial snare – noisy, mid-forward, highpassed."""
    n = max(8, int(sr * duration))
    t = np.arange(n, dtype=np.float32) / sr
    noise = np.random.randn(n).astype(np.float32)
    tone = np.sin(2.0 * np.pi * 195.0 * t) * np.exp(-t / 0.09)
    noise_env = np.exp(-t / 0.18)
    wave = tone * 0.32 + noise * noise_env * 0.92
    wave = apply_highpass(wave, 180.0, sr)
    wave = np.tanh(wave * 1.25)
    return wave.astype(np.float32)


def synthesize_hihat(duration=0.095, open=False, sr=44100):
    n = max(4, int(sr * duration))
    t = np.arange(n, dtype=np.float32) / sr
    noise = np.random.randn(n).astype(np.float32) * (1.9 if open else 1.15)
    env = np.exp(-t / (0.32 if open else 0.038))
    wave = noise * env
    wave = apply_highpass(wave, 4200.0 if open else 5800.0, sr)
    return wave.astype(np.float32) * (0.48 if open else 0.36)


def get_pitches_from_e8(roots, base_midi=34, num_pitches=4096):
    """
    Map successive E8 root deltas to MIDI pitches using golden-ratio weights.
    Clamped to a dark industrial register.
    """
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
        # Slightly tighter scaling for more coherent industrial riffs
        shift = int(np.round(val * 3.8))
        current = current + shift
        current = max(28, min(52, current))   # darker register overall
        pitches.append(current)
    return pitches


def normalize_audio(audio):
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        return (audio / peak) * 0.91
    return audio


def main():
    SR = 44100
    BPM = 112                    # driving mid-tempo industrial
    BASE_MIDI = 34               # darker starting point
    DURATION_SEC = 56.0

    script_dir = os.path.dirname(os.path.abspath(__file__))
    OUTPUT_PATH = os.path.join(script_dir, "e8_sonification_stabbing_westward_432hz.wav")

    print("Generating E8 root system (240 roots)...")
    roots = generate_e8_roots()
    print(f"  Generated {len(roots)} roots.")

    print("Sonifying E8 deltas → industrial pitch sequence (φ-weighted)...")
    pitches = get_pitches_from_e8(roots, base_midi=BASE_MIDI, num_pitches=4096)
    print(f"  {len(pitches)} pitches. First 12: {pitches[:12]}")

    sec_per_16th = 60.0 / (BPM * 4.0)
    total_steps = int(DURATION_SEC / sec_per_16th) + 32
    total_samples = int(DURATION_SEC * SR) + SR
    audio = np.zeros(total_samples, dtype=np.float32)

    # 4/4 industrial bar (16 sixteenth-notes)
    bar_len = 16

    # Guitar stab pattern – aggressive, syncopated, "stabbing" feel
    # Emphasizes off-beats and clusters typical of industrial rock riffs
    onset_pattern = [
        True,  False, True,  False,   # 1 e + a
        True,  True,  False, True,    # 2 e + a
        False, True,  True,  False,   # 3 e + a
        True,  False, True,  True     # 4 e + a
    ]

    # Driving industrial drum pattern
    kick_pos = [0, 6, 8, 14]          # classic industrial push
    snare_pos = [4, 12]               # backbeat
    hat_pos = list(range(0, bar_len, 2))
    open_hat_pos = [2, 7, 10, 15]

    # Occasional longer pad hits for atmosphere (every 2 bars-ish)
    pad_trigger = [0, 8]

    print("Rendering (stabbing guitar + industrial drums + bass + dark pads)...")
    note_idx = 0
    for step in range(total_steps):
        pos = step % bar_len
        t_sec = step * sec_per_16th
        s_pos = int(t_sec * SR)
        if s_pos >= total_samples:
            break

        # --- Drums ---
        if pos in kick_pos:
            k = synthesize_kick(0.58, SR)
            e = min(s_pos + len(k), total_samples)
            audio[s_pos:e] += k[:e - s_pos] * 0.92
        if pos in snare_pos:
            sn = synthesize_snare(0.36, SR)
            e = min(s_pos + len(sn), total_samples)
            audio[s_pos:e] += sn[:e - s_pos] * 0.82
        if pos in hat_pos:
            hh = synthesize_hihat(0.09, open=False, sr=SR)
            e = min(s_pos + len(hh), total_samples)
            audio[s_pos:e] += hh[:e - s_pos] * 0.28
        if pos in open_hat_pos:
            oh = synthesize_hihat(0.28, open=True, sr=SR)
            e = min(s_pos + len(oh), total_samples)
            audio[s_pos:e] += oh[:e - s_pos] * 0.20

        # --- E8-driven stabbing guitar riffs ---
        if onset_pattern[pos]:
            p = pitches[note_idx % len(pitches)]
            f = 432.0 * (2.0 ** ((p - 69) / 12.0))
            # Very short stabs with slight variation for human/industrial feel
            if pos in [0, 4, 8, 12]:
                ndur = 0.19
            elif pos in [2, 6, 10, 14]:
                ndur = 0.13
            else:
                ndur = 0.085
            gnote = synthesize_guitar_stab(f, ndur, sr=SR)
            e = min(s_pos + len(gnote), total_samples)
            audio[s_pos:e] += gnote[:e - s_pos] * 0.94
            note_idx += 1

        # --- Bass on strong accents (follows guitar root motion) ---
        if onset_pattern[pos] and pos in [0, 4, 8, 12]:
            bp = max(22, p - 12)
            bf = 432.0 * (2.0 ** ((bp - 69) / 12.0))
            bnote = synthesize_bass_note(bf, 0.42, sr=SR)
            e = min(s_pos + len(bnote), total_samples)
            audio[s_pos:e] += bnote[:e - s_pos] * 0.68

        # --- Dark atmospheric pad (sparse, for mood) ---
        if pos in pad_trigger and (step // bar_len) % 2 == 0:
            # Use a lower version of current pitch for pad
            pad_p = max(28, p - 7)
            pad_f = 432.0 * (2.0 ** ((pad_p - 69) / 12.0))
            pad = synthesize_synth_pad(pad_f, 1.85, sr=SR)
            e = min(s_pos + len(pad), total_samples)
            audio[s_pos:e] += pad[:e - s_pos] * 0.38

    print("Post-processing (saturation + normalization)...")
    audio = normalize_audio(audio)
    # Extra gentle saturation for industrial glue
    audio = np.tanh(audio * 1.12) * 0.94
    audio = audio[:int(DURATION_SEC * SR)]

    print("Writing WAV...")
    os.makedirs(os.path.dirname(OUTPUT_PATH) or ".", exist_ok=True)
    wavfile.write(OUTPUT_PATH, SR, (audio * 32767.0).astype(np.int16))

    print(f"\n✓ Saved: {OUTPUT_PATH}")
    print(f"  Duration: {len(audio)/SR:.2f}s | {BPM} BPM | A4 = 432 Hz")
    print(f"  E8 roots: 240 | Guitar stab events: ~{note_idx}")
    print(f"  Style: Stabbing Westward-inspired industrial rock / dark electronic")


if __name__ == "__main__":
    main()
