# E8 Sonification Workbench Studio

A dependency-free, offline-first browser studio with **two deliberately separate audio contracts**:

1. **Interpretive / mathematical music** — exact E8 and ETQ structures drive an authored musical receiver for reference-track creation.
2. **Canonical / source-forced WAV** — source data pass through a frozen, versioned observation profile with no editable compositional controls in the signal path.

The workbench runs entirely in the browser, needs no cloud service or build system for sonification, and exports ordinary PCM WAV files plus SHA-256 provenance receipts.

## Start the studio

1. Download or clone this repository.
2. Open `index.html` in a modern desktop browser.
3. Choose **Interpretive** or **Canonical** under **Observation contract**.
4. In Interpretive mode, choose a preset and adjust the musical receiver.
5. In Canonical mode, select a frozen profile and load/paste CSV or JSON source data.
6. Render locally, preview the result, and download the WAV plus its recipe/manifest/source receipt as appropriate.
7. Optionally select **Language** to enable the separately consented online translation layer.

The sonification core has no server, npm install, mandatory CDN, WebAssembly package, audio plug-in, Python environment, or internet connection requirement. The optional language layer is the sole network exception and is never required for rendering or verification.

## Canonical source-forced sonification

Canonical mode is designed to remove **compositional authorship**, not to pretend that sonification can be convention-free. The remaining observation/serialization choices are frozen, explicit, versioned, deterministic, and visible in the manifest.

### UFF physical orbital frequency v1

`uff-orbital-frequency-v1` accepts a UFF-style circular-velocity curve with radius in kpc and velocity in km/s. It computes

```text
f_orbit = V / (2*pi*R)
```

in physical cycles per second after unit conversion. It then applies one common power-of-two factor `2^k`, choosing the **smallest integer `k`** that places the complete source-frequency interval inside the declared 20–18,000 Hz observation window.

Because one common factor multiplies the whole field, every frequency ratio is preserved exactly apart from floating-point roundoff:

```text
(2^k f_i) / (2^k f_j) = f_i / f_j
```

If one global octave translation cannot fit the complete source interval, the profile **fails closed**. It does not clip, compress, wrap, quantize, or otherwise alter ratios to make the data fit.

The receiver is fixed to 48,000 Hz, 16-bit PCM, mono, unit-amplitude continuous-phase sine synthesis and 0.05 seconds per radius interval. There is no A4 reference, temperament, MIDI, scale, seed, effect, panning, envelope, normalization, saturation, or mastering stage.

The radius traversal is explicitly an observation convention, **not physical time**, and the octave-translated audio is not claimed to be acoustic radiation emitted by the galaxy.

### Direct unit-signal audification v1

`direct-unit-signal-v1` accepts a source whose time coordinate is already in seconds and whose dimensionless amplitude is already bounded to `[-1,1]`.

The workbench performs deterministic piecewise-linear resampling at 48,000 Hz and writes that waveform directly as mono 16-bit PCM. Out-of-range values are rejected rather than auto-normalized.

There is no pitch mapping, oscillator, envelope, gain fitting, seed, effect, scale, tuning system, saturation, or mastering stage.

See [`CANONICAL_SONIFICATION.md`](CANONICAL_SONIFICATION.md) for the complete profile contracts and claim boundaries.

## Canonical provenance chain

Canonical mode records independent SHA-256 identities for:

```text
canonical source JSON
        ↓
source_sha256
        ↓
canonical float64 signal
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

The canonical manifest keeps wall-clock time and filenames out of this identity path. These hashes establish integrity and replay identity; they are not signatures and do not validate a physical theory.

The provenance and claim-boundary architecture follows the same general discipline used by **QSOLKCB/SONIFICATION** and **QSOLKCB/UFF**: freeze the mapping contract, make the output replayable, keep post-processing from altering the underlying numerical result, and state explicitly what the audio does and does not claim.

## Interpretive sound architectures

The original music-first workbench remains available unchanged as Interpretive mode.

| Family | Presets | Main mapping |
|---|---|---|
| E8 root engines | C64 E8 Root Slide, Electric Root Slide | Projected-root density controls a continuous glissando, or ordered roots become expressive slide targets |
| E8 arrangements | Cyber Western Lattice, Industrial Root Stabs, Progressive Lattice Ritual | Root projections drive pitch while root coordinates and families drive rhythm, stereo position, accents, and timbre |
| E8 percussion | R-8 Lattice Drums, DR-660 Factory Loop | Eight root coordinates map to eight synthesized industrial drum voices |
| ETQ-101 experiments | Ternary Codebook, Triality Orbit, SCL Curvature, Degree Graph Walk, Ouroboros Phase | Selected states, qutrit labels, graph degrees, curvature stencil, codebook, and phase recipe become declared musical controls |
| ETQ-303 extension | H303 Full-Qutrit Cycle | All 303 `site × qutrit` components are scheduled through the optional order-303 extension |

In Interpretive mode, duration, tempo, tuning, scale, register, pitch span, density, seed, projection, traversal, waveform, filter, drive, grit, width, space, sample rate, bit depth, and channel count remain editable receiver choices.

## Exact E8 foundation

The shared core constructs the standard 240 roots in eight dimensions:

- 112 integer roots of the form `(±1, ±1, 0, ..., 0)`;
- 128 half-integer roots `(±1/2, ..., ±1/2)` with an even number of minus signs;
- every root has squared norm 2.

The golden-shadow preset projects the complete root set onto the normalized direction `(φ⁰, φ⁻¹, ..., φ⁻⁷)`. After rounding only floating noise at 10 decimal places, the projection has 156 distinct values. Equal time per successive projected value makes projected density audible as non-linear slide speed.

Alternative Fibonacci, prime-irrational, balanced signed, and coordinate-axis lenses are explicitly authored projection choices.

## ETQ-101 v2 experiments

The ETQ layer is based on Trent Slade's **ETQ-101 v2: E8-Root-Derived, D4-Triality Ternary MIDI Model** and independently reconstructs its structural fixtures:

- embedded `D4` triality `τ = A ⊕ A` with `τ³ = I`;
- ambient orbit decomposition `12 + 76(3) = 240`;
- canonical selection of two fixed roots and 33 complete three-cycles;
- `H101 = C² ⊕ (C³³ ⊗ C³)`, dimension `2 + 33(3) = 101`;
- selected inner-product graph with 1,687 edges, degree sum 3,374, degree range 22-55, and the complete published degree distribution;
- centered degree potential `(101dⱼ - 3374) / 2181`;
- symbolic MIDI codebook with singlets at 13 and 113 and `M(m,q) = 14 + 33q + m`;
- ternary-curvature stencil `D3 = diag(1, -2, 1)`;
- declared quadrature phase `θ = π/2`;
- optional `H303 = H101 ⊗ C³` extension with `δ = 2π/303`.

Interpretive mode exposes these as musical experiments. It does not promote those mappings into intrinsic acoustic properties.

The model lineage is available in the [SONIFICATION v2.0.0 release](https://github.com/QSOLKCB/SONIFICATION/releases/tag/v2.0.0) and under the [Zenodo concept DOI](https://doi.org/10.5281/zenodo.21404223).

## Claim boundary

| Layer | Status |
|---|---|
| E8 root counts, coordinates and norms | Exact finite construction |
| D4 triality identities and ambient orbit counts | Exact finite construction |
| ETQ-101 selector and selected graph | Deterministic consequence of the declared coordinate frame and selector |
| `D3`, `θ`, `δ`, generator weights and optional H303 extension | Authored model choices documented by ETQ-101 v2 |
| MIDI codebook | Reversible symbolic display convention |
| Interpretive projection, tuning, temperament, tempo, waveform, dynamics, panning and mastering | Authored musical receiver |
| Interpretive WAV | Creative rendering; not a physical or canonical E8 claim |
| Canonical source transform | Frozen versioned observation contract |
| Canonical WAV | Deterministic receiver artifact derived from the source under that contract; not convention-free nature or physical validation |

ETQ-101 v2 intentionally excludes canonical PCM audio from its root profile. The **canonical UFF/direct profiles are separate E8_MUSIC observation contracts**; they do not retroactively make PCM an intrinsic E8 or qutrit property.

## Determinism and receipts

Interpretive random texture uses a local seeded xorshift generator. Given the same recipe, engine version, and JavaScript numerical behavior, the renderer produces the same PCM bytes.

Canonical mode contains no random seed. Given the same canonical source and profile version, it deterministically reconstructs the same source identity, signal, PCM and WAV bytes under the recorded runtime/numerical behavior.

## Optional multilingual interface

Internationalization is powered by **[translate.js](https://github.com/xnx3/translate)**, authored by **Guan Leiming (管雷鸣)** and distributed under the MIT License. QSOL-IMC gratefully acknowledges Guan Leiming for making the project available as open source and for bringing it to our attention.

The integration is intentionally more restrictive than the upstream quick-start:

- translate.js is not loaded when the studio starts;
- the operator must explicitly select **Language** and accept the network disclosure;
- the upstream browser library is pinned to reviewed commit `3758b0d9946214a480bd4a2a61d10ed1a56d2109` rather than a floating branch;
- deterministic seeds, mathematical identifiers, canonical source data, event-ledger data, WAV hashes, format receipts, and mathematical-fixture receipts are excluded from translation;
- translation failure cannot block or modify either sonification engine.

The upstream library does not require an API key from the integrating site, but live machine translation is still a network service: interface text selected for translation is sent to the configured translate.js service. Users requiring a strictly air-gapped workflow should leave translation disabled. See [`TRANSLATION_AUDIT.md`](TRANSLATION_AUDIT.md) for the review and containment notes.

## Repository structure

```text
index.html                     Offline-first UI and observation-contract switch
styles.css                     Main responsive studio styling
canonical.css                  Canonical-mode controls
translation.css                Optional translation control styling
js/e8-core.js                  E8 roots, projections, triality, ETQ selector and graph
js/audio-engine.js             Interpretive presets, synthesis, mastering, WAV encoder and hash
js/canonical-engine.js         Frozen UFF orbital-frequency and direct-audification profiles
js/app.js                      Interpretive UI state, render monitor and recipe import/export
js/canonical-ui.js             Canonical source loading, rendering, receipts and downloads
js/translation.js              Consent gate and pinned translate.js integration
CANONICAL_SONIFICATION.md      Canonical profile definitions and scientific boundaries
TRANSLATION_AUDIT.md           Upstream review, attribution and network boundary
tests/core.test.js             Exact mathematical/model fixture tests
tests/audio.test.js            Interpretive determinism and WAV tests
tests/canonical.test.js        Canonical transform, replay and fail-closed tests
package.json                   Optional Node test command; not required by the app
```

## Verification

The core application itself has no dependency installation. Node.js is needed only to run the development tests:

```bash
npm test
```

The suite covers the 240-root construction, norm and family counts, 156-value golden projection, triality order, orbit decomposition, ETQ-101 selector, graph fixtures, degree distribution, MIDI codebook bijection, 303-component extension, interpretive deterministic WAV replay, canonical `V/(2πR)` conversion, integer-octave ratio preservation, fail-closed span rejection, direct audification without normalization, stable canonical JSON, and canonical repeated-render identity.

## Licence

Mozilla Public License Version 2.0. Copyright 2026 Trent Slade / QSOL-IMC.

The optional translate.js integration acknowledges **Guan Leiming (管雷鸣)** as the author of [xnx3/translate](https://github.com/xnx3/translate), which is licensed separately under the MIT License.
