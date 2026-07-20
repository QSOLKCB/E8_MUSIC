#!/usr/bin/env python3
"""
ETQ-101 v2 experimental 303-state sonification lab script
=========================================================

Utilises the optional full-qutrit product-space extension from
ETQ-101 v2.0.0 §C (Optional extension boundaries):

    H_303 = H_101 ⊗ ℂ³
    F_303 = R_101 ⊗ F_3
    order(F_303) = 303   (because 101 and 3 are coprime)

This is a non-canonical laboratory rendering only.
The root ETQ-101 v2 contract permanently disables PCM/WAV generation
and contains no absolute frequency, waveform, or acoustic claim.
All frequency lane centres, speeds, durations and synthesis choices
below are authored laboratory parameters.

What the script realises
------------------------
* 303-dimensional product space (101-site ring ⊗ qutrit)
* Approximate generator that mirrors the v2 weights:
    K ≈ (11/20) L̄_ring + (1/4) L_Q + (1/5) V_deg
  where V_deg is constructed from the exact degree multiset
  of the selected 101-vertex graph (Table 2).
* Ouroboros-style initial state with the declared SCL phases
  θ = π/2, d = (1, −2, 1).
* Exact spectral evolution under K.
* Additive synthesis of 303 carriers whose amplitudes and
  instantaneous phases follow the quantum state.
* Three authored frequency lanes that echo the low/mid/high
  ternary display polarity of the MIDI codebook.

Theoretical sound character
---------------------------
A dense, slowly evolving additive drone of 303 pure tones.
Because of the qutrit structure, probability mass circulates among
the three frequency lanes, producing a characteristic ternary
“rotation” or breathing between registers. The degree potential
imprints a static spectral colouration (extreme-degree sites act
as mild attractors). The ring diffusion supplies a gentle cyclic
redistribution of energy around the 101-site circle. The overall
texture is crystalline / metallic / spectral; the long 303-period
makes short excerpts feel almost non-repeating while remaining
mathematically cyclic. Further industrial processing (distortion,
granular, filtering) can push it toward the dystopian /
industrial-synthwave aesthetic associated with the project, but
the base render is deliberately clean so the algebraic motion
remains audible.

Usage
-----
    python3 etq101_303_sonification.py

Produces etq101_303_experimental.wav in the same directory.
"""

import numpy as np
from scipy.io import wavfile
import os

# ---------------------------------------------------------------------------
# Authored laboratory parameters (not part of the v2 contract)
# ---------------------------------------------------------------------------
SR         = 44100
DURATION   = 12.0          # seconds
N_SITES    = 101
N_Q        = 3
N          = N_SITES * N_Q # 303
SPEED      = 0.95          # model-time units per audio second
LANE_BASES = np.array([98.0, 247.0, 523.0])  # Hz, low/mid/high inspired
SPREAD     = 0.60          # fraction of an octave spread inside each lane
OUT_WAV    = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "etq101_303_experimental.wav")

# ---------------------------------------------------------------------------
# Exact degree multiset (ETQ-101 v2 Table 2) → centred potential
# ---------------------------------------------------------------------------
DEGREES = ([22]*12 + [23]*6 + [30]*12 + [32]*24 + [33]*12 +
           [34]*6 + [40]*6 + [42]*12 + [43]*6 + [44]*3 + [55]*2)
assert len(DEGREES) == 101 and sum(DEGREES) == 3374
deg = np.array(sorted(DEGREES), dtype=float)
V_site = (101.0 * deg - 3374.0) / 2181.0          # exact v2 formula
V_full = np.repeat(V_site, N_Q)                   # lift to product space

# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------
# Qutrit
X3  = np.array([[0, 0, 1], [1, 0, 0], [0, 1, 0]], dtype=complex)
LQ3 = (2.0/3.0) * (np.eye(3, dtype=complex) - 0.5*(X3 + X3.conj().T))

# 101-cycle (ring approximation to the selected-root graph)
row = np.zeros(N_SITES, dtype=complex)
row[1] = row[-1] = 1.0
A_ring = np.stack([np.roll(row, i) for i in range(N_SITES)])
Lbar_ring = (2*np.eye(N_SITES, dtype=complex) - A_ring) / 8.0

# Product-space lifts
Lbar_full = np.kron(Lbar_ring, np.eye(N_Q, dtype=complex))
LQ_full   = np.kron(np.eye(N_SITES, dtype=complex), LQ3)
V_mat     = np.diag(V_full.astype(complex))

# Generator with the same rational weights that appear in the v2 profile
K = (11.0/20.0)*Lbar_full + 0.25*LQ_full + 0.2*V_mat
K = 0.5*(K + K.conj().T)   # numerical Hermiticity

# ---------------------------------------------------------------------------
# Initial state (product-space Ouroboros analogue)
# ---------------------------------------------------------------------------
theta = np.pi / 2.0
d_vec = np.array([1.0, -2.0, 1.0])
psi0  = np.zeros(N, dtype=complex)
a0    = 1.0 / np.sqrt(N)
for s in range(N_SITES):
    for q in range(N_Q):
        j = s*N_Q + q
        psi0[j] = a0 * np.exp(2j*np.pi*q/3.0 - 1j*theta*d_vec[q])
psi0 /= np.linalg.norm(psi0)

# ---------------------------------------------------------------------------
# Spectral evolution
# ---------------------------------------------------------------------------
print("Diagonalising 303×303 generator …")
evals, evecs = np.linalg.eigh(K)
c0 = evecs.conj().T @ psi0

# Frequency map (authored lanes + mild degree bias + intra-lane spread)
freqs = np.empty(N)
for s in range(N_SITES):
    frac = s / float(N_SITES)
    bias = 1.0 + 0.018*(deg[s] - 33.0)/22.0
    for q in range(N_Q):
        freqs[s*N_Q + q] = LANE_BASES[q] * (2.0**(frac*SPREAD)) * bias
print(f"Carrier range: {freqs.min():.1f} – {freqs.max():.1f} Hz")

# ---------------------------------------------------------------------------
# Memory-friendly additive synthesis
# ---------------------------------------------------------------------------
n_samples = int(SR * DURATION)
t_audio   = np.linspace(0.0, DURATION, n_samples, endpoint=False)

dt_ctrl   = 0.025
n_frames  = int(np.ceil(DURATION / dt_ctrl)) + 1
t_frames  = np.linspace(0.0, DURATION, n_frames)
s_frames  = SPEED * t_frames

print(f"Evolving state ({n_frames} control frames) …")
c_t   = np.exp(-1j * np.outer(s_frames, evals)) * c0
psi_t = evecs @ c_t.T                    # (N, n_frames)
amps_f = np.abs(psi_t).T
phs_f  = np.angle(psi_t).T

print("Accumulating 303 oscillators …")
signal = np.zeros(n_samples, dtype=np.float64)
for j in range(N):
    a_j = np.interp(t_audio, t_frames, amps_f[:, j])
    p_j = np.interp(t_audio, t_frames, phs_f[:, j])
    signal += a_j * np.sin(2*np.pi*freqs[j]*t_audio + p_j)
    if (j+1) % 101 == 0:
        print(f"  {j+1}/{N}")

signal /= np.max(np.abs(signal)) + 1e-12
signal *= 0.82
pcm = np.int16(np.clip(signal, -1.0, 1.0) * 32767)
wavfile.write(OUT_WAV, SR, pcm)
print(f"Wrote {OUT_WAV}")
print("Experimental laboratory render complete — not part of the v2 contract.")
