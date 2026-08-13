<!-- SPDX-License-Identifier: MPL-2.0 -->
# E8_MUSIC Canonical Sonification: Lean 4 Formalization Report

## Abstract

This report describes the formal-assurance package prepared for E8_MUSIC
`v1.1.0`. The package gives the frozen `uff-orbital-frequency-v1` and
`direct-unit-signal-v1` canonical sonification profiles an independently
buildable Lean 4 reference model, deterministic JavaScript conformance vectors,
a theorem-to-code claim inventory, and archival metadata.

The assurance boundary is deliberately narrow:

```text
FORMALIZED TRANSFORM CORRECTNESS
!= IMPLEMENTATION CONFORMANCE
!= SCIENTIFIC VALIDATION
!= PHYSICAL TRUTH
```

Lean proves exact mathematical properties of the declared reference transform.
Node tests check the current JavaScript binary64 and byte-level realization.
Neither layer validates UFF, E8, upstream observations, or a physical theory.

## Scope and frozen baseline

| Item | Recorded value |
|---|---|
| Repository | `https://github.com/QSOLKCB/E8_MUSIC` |
| Formalization baseline | `d32b5620d47275ae914e31a58f023a134f02d359` |
| Baseline event | Merge of PR #2, “Add canonical source-forced sonification mode” |
| Canonical engine at baseline | `1.0.1` |
| Formal-assurance release target | `v1.1.0` |
| Frozen profiles | `uff-orbital-frequency-v1`, `direct-unit-signal-v1` |
| License | Mozilla Public License 2.0 |

The canonical engine, primary profile specification, baseline tests, and agent
contract are not modified by this formalization. Their baseline SHA-256 receipts
are recorded in `formal/baseline-receipts.json` and checked by the metadata test.
Any DSP-affecting change would require a new profile identifier rather than a
proof-motivated change to either v1 contract.

## Verification environment and dependency pins

| Component | Version or revision |
|---|---|
| Lean | `leanprover/lean4:v4.19.0` |
| Lean commit | `6caaee842e9495688c1567e78c0e68dbb96942aa` |
| mathlib | `c44e0c8ee63ca166450922a373c7409c5d26b00b` (`v4.19.0`) |
| Lake dependency graph | Exact revisions in `formal/lean/lake-manifest.json` |
| Development Node runtime | `v24.14.0` |
| CI Node runtime | Node 20 |
| CI operating system | GitHub-hosted Ubuntu |

`lean-toolchain`, `lakefile.lean`, and `lake-manifest.json` eliminate floating
formal dependencies. The GitHub workflow invokes `lean-action` by full commit
SHA. Its mathlib cache is an optimization; `lake build` remains the proof check.

## Formal architecture

| Lean module | Role |
|---|---|
| `Basic.lean` | affine interpolation, interval convexity, amplitude validity |
| `Units.lean` | exact declared kpc/metre and km/s scaling constants, `2π` |
| `OrbitalFrequency.lean` | `V/(2πR)` reference transform and positivity |
| `OctaveTranslation.lean` | integer powers of two, ratio preservation, inclusive admissibility, minimal finite-window selection, failure |
| `Interpolation.lean` | translate-then-interpolate semantics and exact frame arithmetic |
| `DirectAudification.lean` | zero-relative time coordinates and pure direct interpolation |
| `Observation.lean` | structural separation between source/scientific result and audio |
| `Claims.lean` | assurance classes and the complete explicit nonclaim enumeration |
| `Determinism.lean` | functional determinism and exact-real polynomial receiver reference |
| `Conformance.lean` | abstract encoded signed-zero normalization boundary |

The root `E8Music.lean` imports every formal module, so the default `lake build`
cannot silently omit a theorem file.

## Reference definitions

### UFF orbital profile

The reference model declares

\[
f_{\mathrm{orbit}}(R,V)
=\frac{V\times1000}{(2\pi)(R\times30856775814913673000)}.
\]

All quantities in this expression are exact real values in Lean. The decimal
constant used by JavaScript and its conversion to a binary64 value belong to the
conformance layer.

For integer `k`, the common translation is

\[
T_k(f)=2^k f.
\]

`AdmissibleShift` requires every translated member of the source list to lie in
the inclusive `[low, high]` window. The reference selector returns the first
admissible member of a strictly increasing finite candidate list. Lean proves
that a successful result is admissible and that every smaller candidate in that
declared search window failed. Candidate-window construction and the current
binary64 search algorithm are implementation concerns checked by regression
vectors.

The span theorem proves a useful global failure condition: if
`high × minimum < low × maximum`, no positive common octave factor can fit both
endpoints. The model offers no clipping, wrapping, compression, quantization, or
per-frequency alternative.

### UFF traversal and interpolation order

`translatedLerp k fA fB t` accepts already-computed endpoint frequencies and
interpolates `T_k(fA)` and `T_k(fB)`. It accepts no radius or velocity arguments.
This makes the v1 order explicit and prevents the reference definition from
being read as “interpolate radius and velocity, then recompute `V/(2πR)`.”

The exact duration is represented as the rational `1/20` second. Lean proves

\[
48000\times\frac{1}{20}=2400
\]

and defines `frameCount(n) = n × 2400 + 1`. The endpoint parameter theorems
establish exact `0` and `1` at the two interval boundaries.

### Direct audification

The direct reference structure contains only a real time and real amplitude.
`directAudifySegment` contains only the source endpoint amplitudes and the
piecewise-linear fraction derived from their relative time coordinates. Its type
has no normalization factor, scale, MIDI mapping, oscillator, tuning, envelope,
effect, pan, saturation, or mastering input.

Lean proves

\[
(t_i+C)-(t_0+C)=t_i-t_0
\]

for individual times and complete observation lists, then proves the associated
segment resampling is invariant under the same common offset. It also proves
that interpolation of endpoints in `[-1,1]` remains in `[-1,1]` when the
interpolation coordinate is in `[0,1]`.

### Deterministic polynomial receiver

The Lean reference defines phase wrapping, signed range reduction, reflection,
and the frozen odd degree-17 polynomial with exact rational coefficients through
`1/17!`. It proves the polynomial is odd and evaluates to zero at zero.

This is an exact-real reference, not a floating-point verification. The
JavaScript coefficient binary64 bit patterns and representative phase/result bit
patterns are locked in `formal/conformance-vectors.json`. The package does not
claim bit-for-bit equivalence between Lean `Real` evaluation and ECMAScript
binary64 execution.

### Determinism and observation authority

`same_profile_input_same_reference_output` states ordinary functional
determinism: equal canonical profile and source values yield equal reference
outputs.

`SonifiedObservation` stores the source and audio in separate fields.
`sonification_preserves_source` and `replacing_audio_preserves_source` prove
that attaching or replacing audio leaves the source field exactly unchanged.
This is the structural meaning of “canonical audio has zero scientific
authority”: the audio cannot modify, validate, strengthen, or falsify the source
result represented by that field.

## Theorem inventory

The authoritative inventory is machine-readable in
`formal/claim-manifest.json` and rendered for human inspection in
`formal/CLAIM_MATRIX.md`.

| Classification | Count | Meaning |
|---|---:|---|
| PROVED IN LEAN | 39 | exact theorem over the declared reference model, including supporting lemmas |
| CHECKED BY EXECUTABLE TEST | 9 | deterministic JavaScript/binary64/parser/byte/hash behavior |
| NONCLAIM | 12 | proposition explicitly outside the assurance boundary |
| ASSUMED | 0 standalone axioms | theorem hypotheses and declared profile constants are listed per claim |
| OUT OF SCOPE | implementation details listed below | not modeled as Lean real-analysis theorems |

Each record includes a stable claim ID, theorem name and source when applicable,
plain-English statement, assumptions, proof status, profile, specification
section, JavaScript function, and regression test mapping.

## Proof and nonproof boundary

### Proved in Lean

- positivity of the declared orbital-frequency transform;
- positivity of integer-octave translation;
- exact preservation of ratios by one common nonzero `2^k` factor;
- inclusive audible-window admissibility;
- soundness and finite-window minimality of reference shift selection;
- absence of a result when no integer shift is admissible;
- a sufficient global source-span condition for failure;
- interpolation endpoints, convex bounds, and translate-then-interpolate order;
- exact `48,000 × 1/20 = 2,400` arithmetic and frame-count formula;
- direct-profile relative-time and resampling translation invariance;
- preservation of `[-1,1]` under valid interpolation;
- pure, normalization-free structure of direct audification;
- ordinary functional determinism;
- oddness and zero-origin value of the exact-real polynomial;
- preservation of the source field when audio is attached or replaced;
- abstract encoded negative-zero normalization and idempotence.

### Checked by executable test

- JavaScript orbital-frequency binary64 bits;
- octave selection, boundary behavior, translated values, and ratios;
- frozen receiver coefficient bits and representative results;
- blank CSV/JSON numeric-field rejection;
- ECMAScript signed-zero canonicalization;
- large absolute time-origin replay behavior;
- complete frame count and interpolation endpoints;
- canonical source, float64 signal, PCM16, and WAV SHA-256 identities.

### Assumed or declared

- source values supplied to theorem statements satisfy their listed positivity,
  ordering, interval, or nonzero hypotheses;
- the profile constants are the authored v1 observation contract;
- the finite candidate list supplied to `chooseShift` is strictly increasing for
  the minimality theorem;
- upstream observations and scientific model outputs are input data, not
  conclusions of the formalization.

### Out of scope

- a mechanized ECMAScript or IEEE-754 binary64 semantics;
- proof of equivalence between Lean real arithmetic and every browser engine;
- CSV/JSON parser semantics;
- PCM16 rounding and RIFF/WAVE serialization proofs;
- a mechanized SHA-256 correctness proof;
- Web Audio playback behavior;
- empirical validation of input observations or scientific theories.

## Signed zero and parsing boundary

Lean `Real` identifies mathematical zero and cannot distinguish IEEE-754 `+0`
from `-0`. `EncodedFiniteNumber` is therefore an explicit abstract serialization
model, not a pretense that real analysis proves JavaScript behavior. The actual
`Object.is` normalization and the equality of source/signal/PCM receipts are
executable conformance checks.

Likewise, rejecting blank CSV/JSON numeric fields is tested against the parser.
It is not classified as a theorem about real numbers.

## Executable conformance and deterministic replay

`tools/generate-conformance-vectors.js` invokes the unmodified merged canonical
engine and emits `formal/conformance-vectors.json`. The fixture records:

- the exact baseline commit and engine/profile versions;
- big-endian hexadecimal encodings of relevant binary64 values;
- all nine sine coefficient bit patterns;
- representative phase/result bit patterns;
- orbital, shift, ratio, boundary, and failure cases;
- direct audification and large-origin cases;
- signed-zero canonicalization results;
- separate canonical source, float64 signal, PCM16, and WAV SHA-256 identities.

`tests/formal-conformance.test.js` regenerates the object and requires deep exact
equality. `tests/formal-metadata.test.js` validates the claim inventory, theorem
mappings, dependency pin, baseline receipts, and absence of unresolved proof
escapes. Existing tests are retained and strengthened, not weakened.

Deterministic replay is:

1. check out the recorded release or commit;
2. run `npm test` to regenerate and compare executable identities;
3. run `lake build` in `formal/lean` to check the reference theorems;
4. compare the claim matrix and report to the machine-readable manifest;
5. optionally verify `formal/ARTIFACT_HASHES.sha256` after it is generated for
   the release candidate.

## Explicit nonclaims

This package does **not** prove or claim:

- UFF is physically correct;
- E8 is a physical theory of the galaxy;
- a sonified frequency is acoustic radiation emitted by a galaxy;
- 20–18,000 Hz is a privileged frequency range in nature;
- 48 kHz, PCM16, or mono is physically preferred;
- the polynomial sine receiver is physically preferred;
- radius traversal represents physical time;
- sonification validates a scientific theory;
- SHA-256 integrity implies physical truth;
- a Lean proof of the transform establishes correctness of upstream data.

## Reproducibility

From a clean checkout:

```bash
npm test
for file in js/*.js; do node --check "$file"; done
cd formal/lean
lake build
```

On a first build, `lake exe cache get` may be run before `lake build` to download
mathlib's compiled cache. It does not change the pinned sources or proof result.

The CI workflow has no path filter and no documentation-only bypass: JavaScript,
syntax, formal metadata, conformance vectors, and Lean all run on every pull
request. A Lean failure fails the workflow.

## Artifact inventory

| Artifact | Purpose |
|---|---|
| `formal/lean/` | pinned, independently buildable Lean project |
| `formal/claim-manifest.json` | machine-readable claim authority |
| `formal/CLAIM_MATRIX.md` | human-readable claim/theorem/code matrix |
| `formal/conformance-vectors.json` | locked binary64, byte, and hash fixture |
| `formal/baseline-receipts.json` | SHA-256 receipts for frozen baseline files |
| `formal/ARTIFACT_HASHES.sha256` | release-candidate formal artifact receipts |
| `tools/generate-conformance-vectors.js` | deterministic fixture generator |
| `tools/validate-formal-artifacts.js` | cross-artifact and proof-policy validator |
| `tests/formal-conformance.test.js` | exact vector replay test |
| `tests/formal-metadata.test.js` | claim/pin/baseline consistency test |
| `.github/workflows/tests.yml` | JavaScript, syntax, conformance, and Lean CI |
| `ZENODO_METADATA.md`, `.zenodo.json` | prepared, unpublished archival metadata |
| `docs/RELEASE_NOTES_1.1.0.md` | prepared, untagged release notes |

## Known limitations

The Lean model is a reference specification, not a verified JavaScript compiler
pipeline. Its shift selector proves minimality within an explicitly ascending
finite candidate window; executable tests cover the current engine's dynamic
candidate construction and post-selection bounds check. The polynomial receiver
is specified and algebraically checked over exact reals, while its browser
binary64 execution is locked by vectors rather than mechanized floating-point
semantics. These boundaries are intentional and are not evidence gaps disguised
as mathematical proofs.

## Release and archival status

This report prepares `v1.1.0 — Lean 4 Formal Assurance`, the semantic-version
minor release following `v1.0.1`. No Git tag, GitHub release, DOI, or Zenodo
deposit is created by the formalization pull request. Those actions require
separate operator authorization after merge and final release-commit recording.
