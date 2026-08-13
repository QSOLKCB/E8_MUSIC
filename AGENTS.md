# Repository guidance for AI coding agents

## Product contract

- Keep the core sonification application fully functional offline and directly openable from `index.html`.
- Do not add mandatory CDN assets, cloud calls, analytics, Node runtime requirements, bundlers, frameworks, package dependencies, or a server requirement.
- The optional translate.js language layer is the sole network exception: it must load only after explicit operator consent, use a pinned upstream revision, fail closed when unavailable, and never be required for rendering, recipes, receipts, or any mathematical functionality.
- Translation must not submit or rewrite deterministic seed values, mathematical identifiers, event-ledger data, WAV hashes, format receipts, or mathematical-fixture receipts.
- WAV rendering is an intentional core feature of this repository.
- Preserve recipe export, seeded rendering, WAV SHA-256 receipts, and the visible claim boundary.

## Mathematical invariants

- The ambient E8 root set has exactly 240 roots: 112 integer and 128 half-integer roots, each with squared norm 2.
- The embedded D4 triality decomposes the ambient set as 12 fixed roots plus 76 three-cycles.
- The ETQ-101 selector retains the first two fixed roots and first 33 complete lexicographically ordered orbits.
- The selected graph fixtures are 101 vertices, 1,687 edges, degree sum 3,374, degree range 22-55, and degree-potential scale 2,181.
- H303 contains 303 `H101 × C3` states/components. Never describe it as 303 E8 roots.
- Do not portray `D3 = diag(1, -2, 1)` as an intrinsic low/mid/high pitch order.

Run `npm test` after changing mathematical, event-mapping, synthesis, WAV, or translation-boundary code.

## Claim language

Keep exact mathematics, declared ETQ model choices, symbolic MIDI labels, and authored audio-receiver choices distinct. Tuning, waveform, tempo, dynamics and PCM rendering are not intrinsic E8 or qutrit properties.

## Licensing

- The repository is licensed under the Mozilla Public License 2.0.
- Add `SPDX-License-Identifier: MPL-2.0` to every new source file using the file format's comment syntax.
- Keep the root `LICENSE`, README licence statement, and `package.json` SPDX identifier consistent.
- Do not modify the standard MPL 2.0 licence text.
