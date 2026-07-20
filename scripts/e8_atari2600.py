import numpy as np
from scipy.io.wavfile import write

# ================== Parameters ==================
duration = 15.0
sample_rate = 44100
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

base_freq = 110.0  # Closer to 2600 range (A2-ish)
num_voices = 4     # 2600 had 2 tone + 1 noise, but we give it 4 for E8 richness

np.random.seed(42)
num_nodes = 240
node_positions = np.random.randn(num_nodes, 8)
node_positions /= np.linalg.norm(node_positions, axis=1)[:, np.newaxis]

def triality_rotate_batch(pos, steps):
    rot = steps % 3
    result = pos.copy()
    mask1 = (rot == 1)
    if np.any(mask1):
        result[mask1] = np.roll(result[mask1], 1, axis=1)
    mask2 = (rot == 2)
    if np.any(mask2):
        result[mask2] = np.roll(result[mask2], -1, axis=1)
    return result

# 2600-style square wave generator
def square_wave(freq, t, duty=0.5):
    return np.sign(np.sin(2 * np.pi * freq * t) + (1 - 2 * duty))

# ================== E8 + Atari Synthesis ==================
audio = np.zeros(len(t), dtype=np.float64)

for v in range(num_voices):
    # Node traversal speed varies per "voice" (like different TIA channels)
    speed = 0.6 + v * 0.4
    node_idx = (np.arange(len(t)) * speed * (v + 1) / 6.0).astype(int) % num_nodes
    current_pos = node_positions[node_idx]
    
    tri_steps = (np.arange(len(t)) * (0.18 + v * 0.07)).astype(int)
    rotated = triality_rotate_batch(current_pos, tri_steps)
    
    proj = np.sum(rotated[:, :4], axis=1)
    # Coarse 2600-style frequencies + E8 scaling
    freqs = base_freq * (1.8 ** (proj * 1.8 + v * 0.25))
    freqs = np.clip(freqs, 60, 8000)  # TIA range
    
    # Amplitude envelope with sudden "jumps"
    env = 0.6 * (0.3 + 0.7 * np.sin(2 * np.pi * t / (duration * (v % 3 + 1))))
    
    # Add SU(3) phase jitter for instability
    phase_jitter = np.sin(2 * np.pi * (v + 1) * t * 0.8) * 0.3
    
    # Square wave per voice (classic Atari tone)
    voice = env * square_wave(freqs, t + phase_jitter, duty=0.45)
    
    # Occasional noise burst on triality changes (2600 noise channel)
    if v == 3:  # Dedicated noise voice
        noise = np.random.normal(0, 1.0, len(t))
        noise = np.cumsum(noise) * 0.0008  # rough 2600 noise
        voice += noise * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * t * 12)))
    
    audio += voice / num_voices

# Post-processing for authentic 2600 crunch
audio = np.clip(audio * 1.6, -1.0, 1.0)          # soft clipping / distortion
audio = signal.sosfilt(signal.butter(3, 7000, 'low', fs=sample_rate, output='sos'), audio)  # TIA lowpass

audio = audio / np.max(np.abs(audio)) * 0.95
audio_int16 = np.int16(audio * 32767)

filename = "e8_atari2600_triality.wav"
write(filename, sample_rate, audio_int16)
print(f"✅ Generated {filename} — E8 meets Atari 2600 TIA chip!")
print("   Pure retro chiptune with mathematical soul.")
