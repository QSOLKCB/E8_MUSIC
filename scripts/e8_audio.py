import numpy as np
from scipy.io.wavfile import write

# Parameters
duration = 15.0          # seconds
sample_rate = 44100      # Hz
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

# E8 / D4 Triality / SU(3) inspired constants
# E8 rank 8, 240 roots, D4 triality (3-way symmetry), SU(3) 8 generators
base_freq = 55.0         # Low fundamental (A1-ish, industrial feel)
e8_dim = 8
triality_cycle = 3
su3_factors = np.array([1, 2, 3, 4, 5, 6, 7, 8]) / 8.0  # Simplified "generators"

# Simulate node traversal: phase space walk with triality rotations
# Positions in a simplified 8D projection -> mapped to freq/amplitude
np.random.seed(42)  # Deterministic for reproducibility
num_nodes = 240
node_positions = np.random.randn(num_nodes, e8_dim)  # Rough E8-like points
node_positions /= np.linalg.norm(node_positions, axis=1)[:, np.newaxis]  # Normalize

# Triality operator: cyclic permutation of 3 "legs"
def triality_rotate(vec, step):
    rot = step % triality_cycle
    if rot == 1:
        return np.roll(vec, 1)  # Cycle dimensions
    elif rot == 2:
        return np.roll(vec, -1)
    return vec

# SU(3)-like operator: modulate with Gell-Mann inspired phases
def su3_operator(t, idx):
    # Phase from "color" generators + time evolution
    phase = np.sin(2 * np.pi * su3_factors[idx % 8] * t * 0.5 + idx)
    amp_mod = 0.5 + 0.5 * np.cos(2 * np.pi * su3_factors[idx % 8] * t * 0.2)
    return phase, amp_mod

# Generate audio via additive synthesis over "traversed" nodes
audio = np.zeros_like(t, dtype=np.float64)

num_harmonics = 24  # Rich texture
traversal_speed = 0.8  # How fast we move through nodes

for h in range(num_harmonics):
    # Traverse nodes over time
    node_idx = (np.arange(len(t)) * traversal_speed * (h + 1) / 10).astype(int) % num_nodes
    current_pos = node_positions[node_idx]
    
    # Apply D4 triality rotation evolving over time
    tri_step = (np.arange(len(t)) * 0.15).astype(int)
    rotated_pos = np.array([triality_rotate(pos, ts) for pos, ts in zip(current_pos, tri_step)])
    
    # Frequency from projected "energy" (norm + dim components)
    proj = np.sum(rotated_pos[:, :4], axis=1)  # Partial E8 projection
    freqs = base_freq * (1.5 ** (proj * 3 + h * 0.15))  # Harmonic series with E8 scaling
    
    # Amplitude envelope + SU(3) modulation
    amp_env = np.exp(-0.15 * h) * (0.3 + 0.7 * np.sin(2 * np.pi * t / (duration * (h % 5 + 1))))
    
    for i in range(3):  # Triality "colors"
        phase_mod, amp_mod = su3_operator(t, h * 3 + i)
        component = amp_env * amp_mod * np.sin(2 * np.pi * freqs * t + phase_mod * (i + 1))
        audio += component / (num_harmonics * 3)

# Normalize to 16-bit range
audio = audio / np.max(np.abs(audio))
audio = np.int16(audio * 32767)

# Write WAV
filename = "e8_d4_triality_su3_nodes.wav"
write(filename, sample_rate, audio)
print(f"Generated {filename} successfully!")
