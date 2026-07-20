# E8 Sonification Workbench Studio

A dependency-free, offline browser studio for turning exact E8 and ETQ-101 structures into WAV reference tracks for music creation.

The workbench replaces a growing collection of one-off Python sonification scripts with one adjustable instrument. It runs entirely in the browser, needs no cloud service or build system, and exports ordinary PCM WAV files suitable for uploading as reference audio to services such as Suno.

## Start the studio

1. Download or clone this repository.
2. Open `index.html` in a modern desktop browser.
3. Choose a preset, adjust the mathematical source and musical receiver, then select **Render WAV**.
4. Preview the result and download the `.wav` file.
5. Optionally download the canonicalized recipe JSON containing the parameters, model fixtures, event preview, and WAV SHA-256 receipt.

There is no server, npm install, CDN, WebAssembly package, audio plug-in, Python environment, or internet connection involved.

## Included sound architectures

| Family | Presets | Main mapping |
|---|---|---|
| E8 root engines | C64 E8 Root Slide, Electric Root Slide | Projected-root density controls a continuous glissando, or ordered roots become expressive slide targets |
| E8 arrangements | Cyber Western Lattice, Industrial Root Stabs, Progressive Lattice Ritual | Root projections drive pitch while root coordinates and families drive rhythm, stereo position, accents, and timbre |
| E8 percussion | R-8 Lattice Drums, DR-660 Factory Loop | Eight root coordinates map to eight synthesized industrial drum voices |
| ETQ-101 experiments | Ternary Codebook, Triality Orbit, SCL Curvature, Degree Graph Walk, Ouroboros Phase | The paper's selected states, qutrit labels, graph degrees, curvature stencil, codebook, and phase recipe become declared musical controls |
| ETQ-303 extension | H303 Full-Qutrit Cycle | All 303 `site × qutrit` components are scheduled through the optional order-303 extension |

Every preset is a starting point. Duration, tempo, tuning, scale, register, pitch span, density, seed, projection, traversal, waveform, filter, drive, grit, width, space, sample rate, bit depth, and channel count remain editable.

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

The workbench exposes these as musical experiments:

- **Codebook receiver** traverses the reversible 101-note symbolic window, lifting the lowest singlet into the audible range while recording the receiver choice.
- **Triality orbit** cycles the `q = 0, 1, 2` labels inside each of the 33 direct-sum blocks.
- **SCL curvature** maps `(1, -2, 1)` to accent and timbral contrast, not to a false low/mid/high energy claim.
- **Degree graph walk** performs a seeded deterministic walk over actual selected-graph edges and uses the degree potential for register and brightness.
- **Ouroboros phase** maps `2πq/3 - θd_q` to oscillator phase and stereo motion.
- **H303 full-qutrit cycle** schedules all 303 components. These are 303 abstract states/components, not 303 E8 roots.

The model lineage is available in the [SONIFICATION v2.0.0 release](https://github.com/QSOLKCB/SONIFICATION/releases/tag/v2.0.0) and under the [Zenodo concept DOI](https://doi.org/10.5281/zenodo.21404223).

## Claim boundary

The workbench deliberately separates source mathematics from its receiver:

| Layer | Status |
|---|---|
| E8 root counts, coordinates and norms | Exact finite construction |
| D4 triality identities and ambient orbit counts | Exact finite construction |
| ETQ-101 selector and selected graph | Deterministic consequence of the declared coordinate frame and selector |
| `D3`, `θ`, `δ`, generator weights and optional H303 extension | Authored model choices documented by ETQ-101 v2 |
| MIDI codebook | Reversible symbolic display convention |
| Projection, tuning, temperament, tempo, waveform, dynamics, panning and mastering | Authored workbench receiver |
| WAV file | Creative audio rendering; not a physical, acoustic, or canonical E8 claim |

ETQ-101 v2 intentionally excludes canonical PCM audio from its root profile. This repository does not alter that contract. It implements a separate, clearly identified browser receiver for musical experimentation and records its choices in every recipe.

## Determinism and receipts

All random texture uses a local seeded xorshift generator. Given the same recipe, engine version, and JavaScript numerical behavior, the renderer produces the same PCM bytes. Each finished render reports:

- WAV SHA-256;
- sample rate, bit depth, channels, and byte length;
- peak and RMS measurements;
- root/model fixtures used by the render;
- rendered event count and a control-event preview.

Changing the seed is an intentional change to the recipe. The **New Seed** button is the only control that introduces a non-deterministically chosen value; after selection, that value becomes ordinary deterministic input.

## WAV output

The renderer writes uncompressed RIFF/WAVE PCM directly in JavaScript:

- 22,050, 44,100, or 48,000 Hz;
- 8-bit unsigned or 16-bit signed PCM;
- mono or stereo;
- short fades, DC blocking, soft saturation, peak normalization, and an optional seeded-space delay.

For a broadly compatible Suno reference track, start with **44,100 Hz · 16-bit PCM · stereo**. The C64 preset deliberately defaults to **22,050 Hz · 8-bit mono** for a rougher chiptune result.

## Repository structure

```text
index.html             Complete offline user interface
styles.css             Responsive studio styling
js/e8-core.js          E8 roots, projections, triality, ETQ selector and graph
js/audio-engine.js     Presets, synthesis, mastering, PCM WAV encoder and hash
js/app.js              UI state, render monitor, downloads and recipe import
tests/core.test.js     Exact mathematical/model fixture tests
tests/audio.test.js    Determinism, WAV header and preset smoke tests
package.json           Optional Node test command; not required by the app
```

## Verification

The application itself has no dependency installation. Node.js is needed only to run the development tests:

```bash
npm test
```

Tests cover the 240-root construction, norm and family counts, 156-value golden projection, triality order, orbit decomposition, ETQ-101 selector, graph fixtures, degree distribution, MIDI codebook bijection, 303-component extension, deterministic WAV replay, valid PCM headers, and every shipped preset.

## Licence

MIT License. Copyright 2026 Trent Slade / QSOL-IMC.
