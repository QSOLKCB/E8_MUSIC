# Repository guidance for AI coding agents

## Product contract

- Keep the core sonification application fully functional offline and directly openable from `index.html`.
- Do not add mandatory CDN assets, cloud calls, analytics, Node runtime requirements, bundlers, frameworks, package dependencies, or a server requirement.
- The optional translate.js language layer is the sole network exception: it must load only after explicit operator consent, use a pinned upstream revision, fail closed when unavailable, and never be required for rendering, recipes, receipts, or any mathematical functionality.
- Translation must operate only on explicitly allowlisted non-mathematical UI roots; never restore whole-page DOM scanning or a denylist-only translation boundary.
- Translation must not submit or rewrite deterministic seed values, mathematical identifiers, event-ledger data, WAV hashes, format receipts, mathematical-fixture receipts, or canonical source data.
- WAV rendering is an intentional core feature of this repository.
- Preserve recipe export, seeded interpretive rendering, WAV SHA-256 receipts, and the visible claim boundary.
- Keep **Interpretive / mathematical music** and **Canonical / source-forced WAV** as visibly separate contracts. Never silently promote an interpretive mapping into a canonical one.
- Keyboard shortcuts must route through the active contract; hidden interpretive controls must never render while canonical mode is active.
- Any change to canonical source/profile input invalidates the previous canonical result, receipts, audio and downloads until a fresh render succeeds.

## Mathematical invariants

- The ambient E8 root set has exactly 240 roots: 112 integer and 128 half-integer roots, each with squared norm 2.
- The embedded D4 triality decomposes the ambient set as 12 fixed roots plus 76 three-cycles.
- The ETQ-101 selector retains the first two fixed roots and first 33 complete lexicographically ordered orbits.
- The selected graph fixtures are 101 vertices, 1,687 edges, degree sum 3,374, degree range 22-55, and degree-potential scale 2,181.
- H303 contains 303 `H101 × C3` states/components. Never describe it as 303 E8 roots.
- Do not portray `D3 = diag(1, -2, 1)` as an intrinsic low/mid/high pitch order.

## Canonical sonification invariants

- Canonical profile identifiers are versioned contracts. A DSP-affecting change requires a new profile/version rather than silently changing an existing profile.
- `uff-orbital-frequency-v1` computes physical orbital cycles per second as `f = V/(2*pi*R)` after converting km/s to m/s and kpc to metres.
- The UFF orbital profile applies one common factor `2^k` to the complete physical-frequency field. Choose the smallest integer `k` that places the complete interval inside the declared audible window, then verify the translated minimum and maximum exactly. If one global shift cannot fit, fail closed; do not clip, wrap, compress, quantize, or otherwise distort frequency ratios.
- The UFF v1 receiver linearly interpolates **post-translation frequency** between adjacent radius-sorted observations over equal source-index intervals. That interpolation rule is identity-bearing.
- The UFF v1 sine receiver uses the profile-defined deterministic polynomial implementation and per-frame wrapped phase accumulator. Do not replace it with host `Math.sin` or another implementation without a new profile/version.
- Radius-ascending traversal and its fixed seconds-per-interval are observation conventions, never physical-time claims.
- `direct-unit-signal-v1` accepts time already expressed in seconds and amplitude already dimensionless in `[-1,1]`. Blank numeric values fail closed, signed zero is canonicalized to `+0`, and resampling runs on coordinates shifted to a zero-relative time origin before frame generation.
- Do not add automatic normalization, gain fitting, pitch mapping, oscillators, envelopes, fades, effects, seeds, panning, scales, tuning systems, saturation, or mastering to direct canonical audification.
- Canonical mode fixes its WAV observation/serialization profile. Do not expose interpretive tempo, A4, MIDI, scale, waveform, seed, effects, panning, normalization, or mastering controls into the canonical signal path.
- Preserve separate SHA-256 identities for the canonical source, canonical signal, PCM bytes, and WAV container. Hashes are integrity/replay receipts, not signatures or physical validation.
- A canonical sonification is still post-processing. It must never alter or upgrade the authority of the underlying UFF/scientific numerical result.

Run `npm test` after changing mathematical, event-mapping, synthesis, WAV, canonical-sonification, or translation-boundary code.

## Claim language

Keep exact mathematics, declared ETQ model choices, symbolic MIDI labels, authored audio-receiver choices, canonical observation profiles, and physical/scientific claims distinct. Tuning, waveform, tempo, dynamics and PCM rendering are not intrinsic E8 or qutrit properties. Canonical means frozen and source-forced under a declared profile; it does not mean convention-free nature.

## Licensing

- The repository is licensed under the Mozilla Public License 2.0.
- Add `SPDX-License-Identifier: MPL-2.0` to every new source file using the file format's comment syntax.
- Keep the root `LICENSE`, README licence statement, and `package.json` SPDX identifier consistent.
- Do not modify the standard MPL 2.0 licence text.
