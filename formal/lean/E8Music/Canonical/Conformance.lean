-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Determinism

/-!
# Serialization boundary

Real numbers do not distinguish positive and negative zero. This small abstract
encoding records the normalization rule without claiming a theorem about
ECMAScript binary64. Blank-field rejection and exact bytes remain executable
implementation-conformance properties.
-/

namespace E8Music.Canonical

inductive EncodedFiniteNumber where
  | positiveZero
  | negativeZero
  | nonzero (value : ℝ)

def normalizeEncodedZero : EncodedFiniteNumber → EncodedFiniteNumber
  | .negativeZero => .positiveZero
  | value => value

@[simp] theorem negative_zero_normalizes :
    normalizeEncodedZero .negativeZero = .positiveZero := by
  rfl

theorem encoded_zero_normalization_idempotent (value : EncodedFiniteNumber) :
    normalizeEncodedZero (normalizeEncodedZero value) = normalizeEncodedZero value := by
  cases value <;> rfl

end E8Music.Canonical
