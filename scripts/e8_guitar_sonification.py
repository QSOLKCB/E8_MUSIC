import numpy as np
from scipy.io.wavfile import write
import itertools

# Generate E8 root system (240 roots in 8D)
def generate_e8_roots():
    roots = []
    # Integer coordinate roots: permutations of (±1, ±1, 0, ..., 0) with even sum
    for i in range(8):
        for j in range(i + 1, 8):
            for s1 in [-1, 1]:
                for s2 in [-1, 1]:
                    vec = np.zeros(8, dtype=float)
                    vec[i] = s1
                    vec[j] = s2
                    if int(np.sum(vec)) % 2 == 0:
                        roots.append(vec)
                        roots.append(-vec)
    # Half-integer roots
    half = 0.5
    for signs in itertools.product([-1, 1], repeat=8):
        vec = np.array(signs, dtype=float) * half
        if np.sum(vec) % 2 == 0:
            roots.append(vec)
    roots = np.unique(np.round(np.array(roots), decimals=10), axis=0)  # Dedup floating-point
    print(f"Generated {len(roots)} E8 roots (target 240)")
    return roots

# Map root vector to frequency (432 Hz base)
def vector_to_frequency(vec, base_freq=432.0, scale=80.0):
    proj = np.sum(vec)  # Projection/sum — sensitive to E8 symmetries
    # Alternative: norm = np.linalg.norm(vec); proj = np.dot(vec, [1,2,3,4,5,6,7,8]) etc.
    freq = base_freq * (2 ** (proj / scale))
    return max(80, min(2000, freq))  # Guitar-friendly range

# Plucked guitar-like note synthesis
def generate_guitar_note(freq, duration=0.8, fs=44100, decay=2.5):
    t = np.linspace(0, duration, int(fs * duration), endpoint=False)
    # Timbre: fundamental + harmonics (guitar body/string character)
    audio = (np.sin(2 * np.pi * freq * t) +
             0.5 * np.sin(2 * np.pi * freq * 2 * t) +
             0.25 * np.sin(2 * np.pi * freq * 3 * t) +
             0.15 * np.sin(2 * np.pi * freq * 4 * t) +
             0.1 * np.sin(2 * np.pi * freq * 5 * t))
    # Pluck envelope
    envelope = np.exp(-decay * t)
    audio = audio * envelope
    audio = audio / np.max(np.abs(audio) + 1e-8)
    return audio

# Build the loop
def create_e8_guitar_loop(num_notes=12, loop_duration=12.0, fs=44100):
    roots = generate_e8_roots()
    # Deterministic selection & ordering for repeatable musical structure
    projections = np.sum(roots, axis=1)
    sorted_idx = np.argsort(projections)
    selected_roots = roots[sorted_idx[:num_notes * 2:2]]  # Subsample for variety

    total_samples = int(fs * loop_duration)
    loop_audio = np.zeros(total_samples)
    note_dur = loop_duration / num_notes
    
    for i in range(num_notes):
        freq = vector_to_frequency(selected_roots[i % len(selected_roots)])
        note = generate_guitar_note(freq, duration=note_dur * 1.1, fs=fs)  # Slight overlap
        start = int(i * fs * note_dur)
        end = min(start + len(note), total_samples)
        loop_audio[start:end] += note[:end - start]
    
    # Final normalize & light compression feel
    loop_audio = loop_audio / (np.max(np.abs(loop_audio)) + 1e-8) * 0.85
    return loop_audio, fs

if __name__ == "__main__":
    audio, fs = create_e8_guitar_loop(num_notes=12, loop_duration=12.0)
    write("e8_guitar_loop.wav", fs, (audio * 32767).astype(np.int16))
    print("✅ Saved 'e8_guitar_loop.wav' — ready for looping!")
    # Optional: pygame playback
    # import pygame; pygame.mixer.init(); pygame.mixer.music.load("e8_guitar_loop.wav"); pygame.mixer.music.play(-1)
