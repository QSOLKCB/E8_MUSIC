<!-- SPDX-License-Identifier: MPL-2.0 -->
# v1.1.0 — Lean 4 Formal Assurance

Status: prepared release notes; no tag or release has been created.

## Summary

E8_MUSIC v1.1.0 adds an independently buildable Lean 4 reference
formalization and a deterministic implementation-conformance layer for the
canonical/source-forced sonification profiles introduced in PR #2.

This is a minor release because it adds a substantial, backward-compatible
assurance and archival surface. It does not alter the DSP semantics of
`uff-orbital-frequency-v1` or `direct-unit-signal-v1`; the frozen canonical
engine remains version `1.0.1`.

## Added

- Lean `4.19.0` project with mathlib pinned to commit
  `c44e0c8ee63ca166450922a373c7409c5d26b00b` and all transitive Lake revisions
  locked in `lake-manifest.json`;
- 39 exact mathematical/reference theorems covering unit scaling, orbital frequency,
  integer-octave translation, ratio preservation, admissibility, failure,
  interpolation, frame arithmetic, time-origin invariance, amplitude bounds,
  deterministic reference structure, polynomial properties, and observation
  authority;
- nine executable-conformance claim classes with locked binary64, PCM, WAV, and
  SHA-256 vectors;
- twelve explicit scientific/physical nonclaims;
- machine-readable and human-readable claim inventories;
- Zenodo-grade formalization report and unpublished metadata;
- fail-closed CI for JavaScript regression tests, browser-script syntax,
  conformance vectors, metadata consistency, and `lake build`.

## Assurance boundary

```text
FORMALIZED TRANSFORM CORRECTNESS
!= IMPLEMENTATION CONFORMANCE
!= SCIENTIFIC VALIDATION
!= PHYSICAL TRUTH
```

Lean real-number theorems do not claim JavaScript binary64 equivalence. Parser,
signed-zero, PCM/WAV byte, and hash behavior are explicitly executable tests.
No part of this release validates UFF, E8, upstream observations, or a physical
theory.

## Reproduce

```bash
npm test
cd formal/lean
lake build
```

See `docs/FORMALIZATION_REPORT.md` and `formal/CLAIM_MATRIX.md` for the complete
scope, assumptions, theorem-to-code map, and limitations.
