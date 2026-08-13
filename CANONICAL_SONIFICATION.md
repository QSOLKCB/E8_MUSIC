<!-- SPDX-License-Identifier: MPL-2.0 -->
# Canonical Sonification Profiles

E8_MUSIC has two deliberately separate audio paths:

1. **Interpretive / mathematical music** — exact E8 and ETQ fixtures drive an authored musical receiver.
2. **Canonical / source-forced WAV** — source data pass through a frozen, versioned observation profile with no editable compositional controls in the signal path.

Canonical does **not** mean convention-free. Non-acoustic data still require an observation contract. It means the remaining conventions are small, explicit, versioned, deterministic, and separated from the scientific/source identity instead of being tuned as musical choices.

## Profile: `uff-orbital-frequency-v1`

Input is a radius/velocity curve with at least two rows. Accepted CSV/JSON field aliases include:

- radius: `radius_kpc`, `R_kpc`, `radius`;
- velocity: `velocity_kms`, `V_kms`, `V_obs_kms`, `V_model_kms`, `velocity`.

Rows are sorted by radius and duplicate radii fail closed. The physical orbital frequency is

\[
f_{\mathrm{orbit}}(R)=\frac{V(R)}{2\pi R},
\]

with `V` converted from km/s to m/s and `R` from kpc to metres using

```text
1 kpc = 3.0856775814913673e19 m
```

The renderer then chooses one integer `k` using this rule:

> choose the smallest integer `k` for which every translated frequency `2^k f_orbit` lies inside 20–18,000 Hz.

If no single integer octave translation can fit the complete source interval, the profile rejects the input rather than clipping, compressing, wrapping, quantizing, or changing ratios.

Because the same factor `2^k` multiplies every frequency,

\[
\frac{2^k f_i}{2^k f_j}=\frac{f_i}{f_j}.
\]

The audible renderer is fixed to:

- 48,000 Hz sample rate;
- 16-bit signed PCM;
- mono;
- a unit-amplitude sine carrier with continuous integrated phase;
- radius-ascending traversal;
- 0.05 seconds per source interval;
- no temperament, A4 reference, MIDI, scale, seed, effects, panning, envelope, normalization, saturation, or mastering.

The radius traversal is an observation convention. It is **not** presented as physical time. The octave-translated audio frequencies are not claimed to be acoustic radiation emitted by the galaxy.

## Profile: `direct-unit-signal-v1`

This is stricter direct audification. Input must already provide:

- `time_s` / `time` in seconds; and
- `value` / `signal` / `amplitude` as a dimensionless number already bounded to `[-1,1]`.

The workbench performs deterministic piecewise-linear resampling at 48,000 Hz and writes the resulting values directly as mono 16-bit PCM.

It deliberately refuses to auto-normalize out-of-range data. There is no pitch map, oscillator, envelope, gain curve, seed, effect, scale, tuning system, or mastering stage.

## Identity chain

Each canonical render records four SHA-256 identities:

```text
canonical source JSON
        ↓
source_sha256
        ↓
frozen transform + canonical float64 signal
        ↓
canonical_signal_float64le_sha256
        ↓
PCM16 little-endian bytes
        ↓
pcm_s16le_sha256
        ↓
RIFF/WAVE container
        ↓
wav_sha256
```

The manifest contains no wall-clock timestamp in the identity path. Filenames are convenience labels only.

## Relationship to UFF

This profile is designed to accept a UFF-style circular-velocity curve without importing UFF's scientific authority into the audio renderer. UFF remains responsible for the numerical/scientific result. E8_MUSIC is a pure post-processing receiver.

The supported statement is narrow:

> given the declared radius and velocity values and the frozen profile, the resulting PCM/WAV is deterministic and the single octave translation preserves the source orbital-frequency ratios.

It does **not** imply:

- that a UFF model is physically correct;
- that a sonification is evidence for E8 or any other theory;
- that the translated frequency is a naturally preferred audible frequency;
- that 20–18,000 Hz, 48 kHz, PCM16, mono, sine waves, or radius traversal are properties of nature.

## Why keep interpretive mode?

The original workbench is still useful for composition, pattern discovery, experiments, and reference-track creation. It now has an explicit sibling rather than being rebranded:

```text
INTERPRETIVE
source mathematics → authored mapping → musical receiver → WAV

CANONICAL
source data → frozen transform → canonical signal → PCM → WAV
```

That boundary is intentional and should remain visible in the UI, documentation, recipes, manifests, and tests.
