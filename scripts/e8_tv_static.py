import numpy as np
from scipy.io.wavfile import write
import scipy.signal as signal

# Parameters
duration = 15.0
sample_rate = 44100
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

base_freq = 55.0
num_harmonics = 18   # Slightly fewer for dirtier texture
traversal_speed = 1.2

np.random.seed(42)
num_nodes = 240
node_positions = np.random.randn(num_nodes, 8)
node_positions /= np.linalg.norm(node_positions, axis=1)[:, np.newaxis]

def triality_rotate_batch(pos, steps):
    rot = steps % 3
    result = pos.copy()
    mask1 = (rot == 1); result[mask1] = np.roll(result[mask1], 1, axis=1)
    mask2 = (rot == 2); result[mask2] = np.roll(result[mask2], -1, axis=1)
    return result

def su3_modulation(t, idx):
    factors = np.array([1,2,3,4,5,6,7,8]) / 8.0
    phase = np.sin(2 * np.pi * factors[idx % 8] * t[:, None] * 0.5 + idx)
    amp_mod = 0.5 + 0.5 * np.cos(2 * np.pi * factors[idx % 8] * t[:, None] * 0.2)
    return phase, amp_mod

# ================== Core + TV Noise ==================
audio = np.zeros(len(t), dtype=np.float64)

for h in range(num_harmonics):
    node_idx = (np.arange(len(t)) * traversal_speed * (h + 1) / 8.0).astype(int) % num_nodes
    current_pos = node_positions[node_idx]
    tri_steps = (np.arange(len(t)) * 0.25).astype(int)   # Faster switching = more TV feel
    rotated = triality_rotate_batch(current_pos, tri_steps)
    
    proj = np.sum(rotated[:, :4], axis=1)
    freqs = base_freq * (1.5 ** (proj * 2.5 + h * 0.2))
    
    amp_env = np.exp(-0.12 * h) * (0.4 + 0.6 * np.sin(2 * np.pi * t / (duration * (h % 4 + 1))))
    
    for i in range(3):
        phase, amp_mod = su3_modulation(t, h * 3 + i)
        carrier = np.sin(2 * np.pi * freqs[:, None] * t[:, None] + phase)
        component = amp_env[:, None] * amp_mod * carrier
        audio += np.mean(component, axis=1) / (num_harmonics * 4)

# === Add Retro TV Static & Interference ===
noise = np.random.normal(0, 1.0, len(t))
# Pink-ish noise + high frequency static bursts synced to triality
pink_noise = np.cumsum(noise) / np.sqrt(len(t)) * 0.3
static = pink_noise * (0.6 + 0.4 * np.sin(2 * np.pi * t * 8))  # fast static

# Channel switch bursts
switch_envelope = np.zeros_like(t)
switches = np.where(np.diff((np.arange(len(t)) * 0.25).astype(int) % 3) != 0)[0]
for s in switches:
    if s + 800 < len(t):
        switch_envelope[s:s+800] = np.exp(-np.linspace(0, 6, 800))

audio += static * 0.35
audio += switch_envelope * np.random.normal(0, 0.8, len(t)) * 0.6   # burst noise

# Gentle low-pass + soft clipping for warm analog feel
audio = signal.sosfilt(signal.butter(4, 8000, 'low', fs=sample_rate, output='sos'), audio)
audio = np.tanh(audio * 1.4) * 0.9   # soft distortion

# Final normalize
audio = audio / np.max(np.abs(audio)) * 0.95
audio_int16 = np.int16(audio * 32767)

filename = "e8_d4_tv_static_triality.wav"
write(filename, sample_rate, audio_int16)
print(f"✅ Generated {filename} — pure childhood TV channel surfing with E8 soul!")
