#!/usr/bin/env python3
"""
Precise Isochronic Tone + Ambient Pad Generator
Mathematically exact. No AI approximation.
"""

from __future__ import annotations
import argparse
from pathlib import Path
import numpy as np
import soundfile as sf


def raised_cosine_envelope(t, pulse_freq, duty=0.5, edge_softness=0.15):
    period = 1.0 / pulse_freq
    phase = (t % period) / period
    on_width = duty
    ramp = min(edge_softness, on_width / 2.0 - 1e-6)
    env = np.zeros_like(t)
    rise = (phase >= 0) & (phase < ramp)
    if ramp > 0:
        env[rise] = 0.5 * (1 - np.cos(np.pi * phase[rise] / ramp))
    flat = (phase >= ramp) & (phase < on_width - ramp)
    env[flat] = 1.0
    fall_start = on_width - ramp
    fall = (phase >= fall_start) & (phase < on_width)
    if ramp > 0:
        local = (phase[fall] - fall_start) / ramp
        env[fall] = 0.5 * (1 + np.cos(np.pi * local))
    return env


def generate_isochronic(carrier_hz, pulse_hz, duration_s, sample_rate=44100,
                        amplitude=0.4, duty=0.5, edge_softness=0.12, soft=True):
    n = int(round(duration_s * sample_rate))
    t = np.arange(n, dtype=np.float64) / sample_rate
    carrier = np.sin(2 * np.pi * carrier_hz * t)
    if soft:
        gate = raised_cosine_envelope(t, pulse_hz, duty=duty, edge_softness=edge_softness)
    else:
        gate = (0.5 * (1 + np.sign(np.sin(2 * np.pi * pulse_hz * t))) > 0.5).astype(np.float64)
    return (carrier * gate * amplitude).astype(np.float32)


def generate_ambient_pad(duration_s, sample_rate=44100, base_freq=54.0,
                         cosmic_hz=1074.0, amplitude=0.25):
    n = int(round(duration_s * sample_rate))
    t = np.arange(n, dtype=np.float64) / sample_rate
    lfo1 = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t)
    lfo2 = 0.5 + 0.5 * np.sin(2 * np.pi * 0.031 * t)
    drone = (0.6 * np.sin(2 * np.pi * base_freq * t)
             + 0.3 * np.sin(2 * np.pi * base_freq * 1.5 * t)
             + 0.15 * np.sin(2 * np.pi * base_freq * 2.0 * t)) * lfo1
    pad = (0.4 * np.sin(2 * np.pi * 216 * t)
           + 0.25 * np.sin(2 * np.pi * 324 * t)
           + 0.15 * np.sin(2 * np.pi * 432 * t)
           + 0.08 * np.sin(2 * np.pi * 540 * t)) * lfo2
    shimmer = 0.04 * np.sin(2 * np.pi * cosmic_hz * t
                            + 0.3 * np.sin(2 * np.pi * 0.11 * t))
    sig = (drone + pad + shimmer) * amplitude
    peak = np.max(np.abs(sig))
    if peak > 0.95:
        sig *= 0.95 / peak
    return sig.astype(np.float32)


def apply_fades(sig, sample_rate, fade_s=4.0):
    n = len(sig)
    fs = min(int(fade_s * sample_rate), n // 3)
    if fs > 0:
        sig[:fs] *= np.linspace(0, 1, fs, dtype=np.float32)
        sig[-fs:] *= np.linspace(1, 0, fs, dtype=np.float32)
    return sig


def mix_signals(ambient, iso, iso_level=0.30):
    n = min(len(ambient), len(iso))
    mixed = ambient[:n] + iso[:n] * iso_level
    peak = np.max(np.abs(mixed))
    if peak > 0.98:
        mixed *= 0.98 / peak
    return mixed.astype(np.float32)


def main():
    p = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument("--carrier", type=float, default=200.0)
    p.add_argument("--pulse", type=float, default=10.0)
    p.add_argument("--duration", type=float, default=60.0)
    p.add_argument("--sr", type=int, default=44100)
    p.add_argument("--duty", type=float, default=0.5)
    p.add_argument("--softness", type=float, default=0.12)
    p.add_argument("--hard", action="store_true")
    p.add_argument("--iso-amp", type=float, default=0.45)
    p.add_argument("--ambient", action="store_true")
    p.add_argument("--mix-ratio", type=float, default=0.30)
    p.add_argument("--cosmic", type=float, default=1074.0)
    p.add_argument("--fade", type=float, default=4.0)
    p.add_argument("--outfile", default="isochronic_output.wav")
    p.add_argument("--stereo", action="store_true")
    args = p.parse_args()

    print(f"Generating {args.duration}s | carrier {args.carrier} Hz | pulse {args.pulse} Hz")
    iso = generate_isochronic(
        args.carrier, args.pulse, args.duration, args.sr,
        amplitude=args.iso_amp, duty=args.duty,
        edge_softness=args.softness, soft=not args.hard
    )
    if args.ambient:
        print(" + ambient pad (drone + 432 region + cosmic shimmer)")
        amb = generate_ambient_pad(args.duration, args.sr, cosmic_hz=args.cosmic)
        signal = mix_signals(amb, iso, args.mix_ratio)
    else:
        signal = iso
    signal = apply_fades(signal, args.sr, args.fade)
    if args.stereo:
        signal = np.column_stack((signal, signal))
    sf.write(args.outfile, signal, args.sr, subtype="PCM_16")
    print(f"Wrote {Path(args.outfile).resolve()}")


if __name__ == "__main__":
    main()
