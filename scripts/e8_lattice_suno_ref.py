#!/usr/bin/env python3
"""
E8 → Suno Reference WAV  (fast NumPy version)
"""

import numpy as np
from itertools import product
import wave
import struct

def generate_e8_roots():
    roots = []
    for i in range(8):
        for j in range(i+1, 8):
            for s1, s2 in product([-1., 1.], repeat=2):
                v = np.zeros(8)
                v[i] = s1
                v[j] = s2
                roots.append(v)
    for signs in product([-1, 1], repeat=8):
        if sum(1 for s in signs if s < 0) % 2 == 0:
            roots.append(np.array(signs, dtype=float) * 0.5)
    return roots

def canonical_order(roots):
    return sorted(roots, key=lambda r: (r.sum(), tuple(r)))

def root_to_event(root, base_freq=52.0, index=0):
    weights = np.array([2.2, 1.8, 1.4, 1.0, 0.7, 0.45, 0.28, 0.15])
    pitch_cents = np.dot(weights, root) * 210.0
    freq = base_freq * (2.0 ** (pitch_cents / 1200.0))

    while freq < 38.0: freq *= 2.0
    while freq > 480.0: freq *= 0.5

    dur = 0.070 + 0.050 * abs(root[3]) + 0.040 * abs(root[5]) + 0.025 * ((index * 13) % 8) / 8.0
    higher = np.abs(root[4:]).sum() / 2.4
    vel = np.clip(0.30 + 0.58 * min(1.0, higher) + 0.07 * ((index % 6) / 6.0), 0.25, 0.95)

    return {"freq": float(freq), "duration": float(dur), "velocity": float(vel)}

def render_suno_reference(
    filename="e8_lattice_suno_ref.wav",
    sample_rate=44100,
    duration_sec=18.0,      # shorter is better for Suno reference
    density=0.38,
    max_events=110,
):
    roots = generate_e8_roots()
    ordered = canonical_order(roots)
    events = [root_to_event(r, index=i) for i, r in enumerate(ordered[:max_events])]

    n_samples = int(sample_rate * duration_sec)
    buffer = np.zeros(n_samples, dtype=np.float64)

    t = 0.0
    for ev in events:
        if t >= duration_sec - 0.3:
            break

        start = int(t * sample_rate)
        length = int(ev["duration"] * sample_rate)
        if start + length > n_samples:
            length = n_samples - start

        i = np.arange(length)
        phase = 2.0 * np.pi * ev["freq"] * i / sample_rate
        sample = (np.sin(phase)
                  + 0.38 * np.sin(2.0 * phase)
                  + 0.15 * np.sin(3.0 * phase))

        # envelope
        attack = np.minimum(1.0, i / (sample_rate * 0.008))
        release = np.minimum(1.0, (length - i) / (sample_rate * 0.045))
        env = attack * release

        buffer[start:start+length] += sample * ev["velocity"] * 0.22 * env
        t += ev["duration"] * density

    # normalize
    peak = np.max(np.abs(buffer)) or 1.0
    buffer = buffer / peak * 0.89

    # write 16-bit mono
    with wave.open(filename, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in buffer:
            wf.writeframes(struct.pack("<h", int(np.clip(s, -1.0, 1.0) * 32767)))

    print(f"Created: {filename}")
    print(f"{duration_sec}s | {len(events)} events | density={density}")
    print("Ready for Suno.")

if __name__ == "__main__":
    render_suno_reference()
