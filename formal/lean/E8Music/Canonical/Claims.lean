-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Observation

/-!
# Assurance and nonclaim boundary

Formalized transform correctness is not implementation conformance, scientific
validation, or physical truth. This module makes the classification and the
explicit physical nonclaims part of the inspectable Lean artifact.
-/

namespace E8Music.Canonical

inductive AssuranceClass where
  | provedInLean
  | checkedByExecutableTest
  | assumed
  | outOfScope
  | nonclaim
deriving DecidableEq, Repr

inductive ExplicitNonclaim where
  | uffIsPhysicallyCorrect
  | e8IsPhysicalGalaxyTheory
  | audioIsEmittedGalacticRadiation
  | audibleWindowIsPrivilegedInNature
  | sampleRateIsPhysicallyPreferred
  | pcm16IsPhysicallyPreferred
  | monoIsPhysicallyPreferred
  | sineReceiverIsPhysicallyPreferred
  | radiusTraversalIsPhysicalTime
  | audioValidatesScientificTheory
  | sha256IntegrityImpliesPhysicalTruth
  | transformProofValidatesUpstreamData
deriving DecidableEq, Repr

def explicitNonclaims : List ExplicitNonclaim :=
  [ .uffIsPhysicallyCorrect,
    .e8IsPhysicalGalaxyTheory,
    .audioIsEmittedGalacticRadiation,
    .audibleWindowIsPrivilegedInNature,
    .sampleRateIsPhysicallyPreferred,
    .pcm16IsPhysicallyPreferred,
    .monoIsPhysicallyPreferred,
    .sineReceiverIsPhysicallyPreferred,
    .radiusTraversalIsPhysicalTime,
    .audioValidatesScientificTheory,
    .sha256IntegrityImpliesPhysicalTruth,
    .transformProofValidatesUpstreamData ]

def governingBoundary : String :=
  "FORMALIZED TRANSFORM CORRECTNESS != IMPLEMENTATION CONFORMANCE != " ++
  "SCIENTIFIC VALIDATION != PHYSICAL TRUTH"

end E8Music.Canonical
