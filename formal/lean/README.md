<!-- SPDX-License-Identifier: MPL-2.0 -->
# E8_MUSIC Lean 4 formal assurance

This independently buildable project formalizes the mathematical/reference
contracts of `uff-orbital-frequency-v1` and `direct-unit-signal-v1` at baseline
commit `d32b5620d47275ae914e31a58f023a134f02d359`.

It deliberately does **not** model ECMAScript binary64, browser execution,
parsing, PCM quantization, RIFF/WAVE serialization, SHA-256, or upstream
scientific truth. Those implementation properties are covered by the locked
Node conformance vectors in the repository root.

## Pinned environment

- Lean: `leanprover/lean4:v4.19.0`
- mathlib: `c44e0c8ee63ca166450922a373c7409c5d26b00b` (`v4.19.0`)

`lake-manifest.json` transitively pins every Lake dependency.

## Build

From this directory:

```bash
lake build
```

For a faster first build, mathlib's optional compiled cache may be fetched
before the build:

```bash
lake exe cache get
lake build
```

The cache is an optimization only. The proof sources and dependency revisions
remain the authority.

## Assurance boundary

```text
FORMALIZED TRANSFORM CORRECTNESS
!= IMPLEMENTATION CONFORMANCE
!= SCIENTIFIC VALIDATION
!= PHYSICAL TRUTH
```

See `../CLAIM_MATRIX.md`, `../claim-manifest.json`, and
`../../docs/FORMALIZATION_REPORT.md` for the theorem inventory and exact scope.
