import numpy as np
from scipy.io.wavfile import write

# ================== Parameters ==================
duration = 15.0
sample_rate = 44100
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

base_freq = 55.0
num_harmonics = 24
traversal_speed = 0.8

# Pre-generate simplified E8-like nodes (240 roots inspired)
np.random.seed(42)
num_nodes = 240
node_positions = np.random.randn(num_nodes, 8)
node_positions /= np.linalg.norm(node_positions, axis=1)[:, np.newaxis]

# ================== Vectorized Triality & SU(3) ==================
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

def su3_modulation(t, idx):
    factors = np.array([1,2,3,4,5,6,7,8]) / 8.0
    phase = np.sin(2 * np.pi * factors[idx % 8] * t[:, None] * 0.5 + idx)
    amp_mod = 0.5 + 0.5 * np.cos(2 * np.pi * factors[idx % 8] * t[:, None] * 0.2)
    return phase, amp_mod

# ================== Generate Audio (Fast) ==================
audio = np.zeros(len(t), dtype=np.float64)

for h in range(num_harmonics):
    node_idx = (np.arange(len(t)) * traversal_speed * (h + 1) / 10.0).astype(int) % num_nodes
    current_pos = node_positions[node_idx]
    
    tri_steps = (np.arange(len(t)) * 0.15).astype(int)
    rotated_pos = triality_rotate_batch(current_pos, tri_steps)
    
    proj = np.sum(rotated_pos[:, :4], axis=1)
    freqs = base_freq * (1.5 ** (proj * 3 + h * 0.15))
    
    amp_env = np.exp(-0.15 * h) * (0.3 + 0.7 * np.sin(2 * np.pi * t / (duration * (h % 5 + 1))))
    
    for i in range(3):  # Triality colors with SU(3)
        phase, amp_mod = su3_modulation(t, h * 3 + i)
        component = amp_env[:, None] * amp_mod * np.sin(2 * np.pi * freqs[:, None] * t[:, None] + phase)
        audio += np.mean(component, axis=1) / (num_harmonics * 3)

# Normalize to 16-bit PCM
audio = audio / np.max(np.abs(audio)) * 0.95
audio_int16 = np.int16(audio * 32767)

filename = "e8_d4_triality_su3_nodes.wav"
write(filename, sample_rate, audio_int16)
print(f"✅ Generated {filename} successfully!")
print(f"   {duration}s @ {sample_rate} Hz, 16-bit PCM")
