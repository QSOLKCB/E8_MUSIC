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

Blank numeric fields fail closed; they are never coerced to zero. Rows are sorted by radius and duplicate radii fail closed. The physical orbital frequency is

\[
f_{\mathrm{orbit}}(R)=\frac{V(R)}{2\pi R},
\]

with `V` converted from km/s to m/s and `R` from kpc to metres using

```text
1 kpc = 3.0856775814913673e19 m
```

The renderer then chooses one integer `k` using this rule:

> choose the smallest integer `k` for which every translated frequency `2^k f_orbit` lies inside 20–18,000 Hz.

The accepted translated minimum and maximum are checked again after `k` is selected. No epsilon is allowed to admit an out-of-window result. If no single integer octave translation can fit the complete source interval, the profile rejects the input rather than clipping, compressing, wrapping, quantizing, or changing ratios.

Because the same factor `2^k` multiplies every frequency,

\[
\frac{2^k f_i}{2^k f_j}=\frac{f_i}{f_j}.
\]

### Frozen traversal and interpolation

Rows are traversed in ascending radius order. Each adjacent source-observation pair occupies exactly `0.05 s`. After the octave translation is applied to the discrete orbital-frequency observations, the receiver uses **piecewise-linear interpolation in translated frequency** over those equal source-index intervals. It does not interpolate radius and velocity and then recompute `V/(2πR)`, and it does not use a piecewise-constant frequency hold.

The endpoint rule is also fixed: both first and final observations are included, with

```text
frames_per_interval = 48000 * 0.05 = 2400
frame_count = interval_count * 2400 + 1
```

Radius traversal is an observation convention. It is **not** physical time.

### Frozen deterministic sine receiver

The acoustic receiver is a unit-amplitude sine with continuous phase, but canonical replay does **not** call the host JavaScript engine's `Math.sin`. The profile fixes implementation `qsol-deterministic-sine-poly17-v1`:

1. phase starts at `0` radians;
2. after each sample, the binary64 phase accumulator is wrapped into `[0, 2π)`;
3. evaluation range-reduces to `[-π, π]`, reflects to `[-π/2, π/2]`, and evaluates one fixed odd polynomial;
4. the polynomial coefficients are carried in the versioned profile/manifest.

This removes implementation-defined transcendental low bits from the canonical signal hash path. Any future change to the interpolation, phase rule, polynomial, coefficients, sample format, or other DSP-affecting semantics requires a new profile/version rather than silently changing this contract.

The remaining fixed output profile is:

- 48,000 Hz sample rate;
- 16-bit signed PCM;
- mono;
- no temperament, A4 reference, MIDI, scale, seed, effects, panning, envelope, normalization, saturation, or mastering.

The octave-translated audio frequencies are not claimed to be acoustic radiation emitted by the galaxy.

## Profile: `direct-unit-signal-v1`

This is stricter direct audification. Input must already provide:

- `time_s` / `time` in seconds; and
- `value` / `signal` / `amplitude` as a dimensionless number already bounded to `[-1,1]`.

Blank numeric fields fail closed. Signed zero is canonicalized to `+0` before source serialization and signal generation so downloaded canonical source JSON can reproduce the signal identity exactly.

Before frame generation, the first source time is subtracted from every source time and interpolation runs on that zero-relative coordinate. The original absolute times remain in the canonical source identity and the removed origin is recorded in the manifest. This prevents large finite timestamp origins from degrading 48 kHz interpolation precision.

The workbench then performs deterministic piecewise-linear resampling at 48,000 Hz and writes the resulting values directly as mono 16-bit PCM. It deliberately refuses to auto-normalize out-of-range data. There is no pitch map, oscillator, envelope, gain curve, seed, effect, scale, tuning system, or mastering stage.

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

Canonical numeric normalization includes `-0 → +0`. The manifest contains no wall-clock timestamp in the identity path. Filenames are convenience labels only.

Canonical UI receipts are valid only for the exact currently rendered source/profile pair. Editing source data, selecting another canonical profile, loading another file, or replacing an example invalidates the prior canonical result and disables its downloads until a fresh render succeeds. The `R` keyboard shortcut is routed through the active workbench contract, so canonical mode cannot accidentally invoke the hidden interpretive renderer.

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

That boundary is intentional and should remain visible in the UI, documentation, recipes, manifests, keyboard routing, receipts, and tests.
