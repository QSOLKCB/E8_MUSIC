<!-- SPDX-License-Identifier: MPL-2.0 -->
# Prepared Zenodo metadata — v1.1.0

This metadata is prepared for review. It has not been published and no DOI has
been reserved or invented.

## Record

**Title**  
E8_MUSIC Canonical Sonification: Deterministic Source-Forced WAV Profiles with Lean 4 Formal Assurance

**Upload type**  
Software

**Version**  
1.1.0

**Creator**  
Slade, Trent — QSOL-IMC

**Description**  
E8_MUSIC v1.1.0 is a deterministic scientific-sonification software and formal-methods artifact. It provides two frozen canonical/source-forced WAV profiles: `uff-orbital-frequency-v1`, which maps declared radius/velocity observations to physical orbital cycles per second before one ratio-preserving common octave translation and a fixed receiver; and `direct-unit-signal-v1`, which linearly resamples already dimensionless amplitudes in `[-1,1]` on zero-relative time coordinates. The release adds a pinned Lean 4/mathlib reference formalization, a theorem-to-code claim manifest, deterministic JavaScript binary64 and byte/hash conformance vectors, CI, and a reproducibility report. The assurance boundary is explicit: formalized transform correctness is distinct from implementation conformance, scientific validation, and physical truth. The work does not claim that UFF or E8 is physically correct, that the WAV is emitted galactic radiation, or that sonification validates upstream data or theory.

**License**  
Mozilla Public License 2.0 (`MPL-2.0`)

**Access**  
Open access

**Keywords**

- sonification
- audification
- Lean 4
- formal verification
- formal methods
- reproducibility
- deterministic audio
- scientific sonification
- rotation curves
- orbital frequency
- UFF
- E8_MUSIC
- provenance
- PCM
- WAV

## Related identifiers

- Repository: `https://github.com/QSOLKCB/E8_MUSIC`
- Formalization baseline commit:
  `https://github.com/QSOLKCB/E8_MUSIC/commit/d32b5620d47275ae914e31a58f023a134f02d359`
- Merged canonical-profile PR:
  `https://github.com/QSOLKCB/E8_MUSIC/pull/2`
- Release URL: replace this placeholder after the authorized `v1.1.0` GitHub
  release exists.
- DOI: leave unset until Zenodo assigns one.

## Recommended files

Deposit the tagged `v1.1.0` source archive after merge, plus the formalization
report if Zenodo does not extract it conveniently from the archive. Record the
final release commit, archive SHA-256, GitHub release URL, publication date, and
assigned DOI before publishing.

Do not upload a working-tree archive whose commit differs from the metadata.
