-- SPDX-License-Identifier: MPL-2.0
import Mathlib.Data.Real.Basic
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
# Canonical reference primitives

Exact real-number primitives shared by both frozen canonical profiles. These
definitions do not model JavaScript binary64 evaluation.
-/

namespace E8Music.Canonical

/-- Affine interpolation between two already-computed endpoint values. -/
def lerp (a b t : ℝ) : ℝ := (1 - t) * a + t * b

@[simp] theorem lerp_zero (a b : ℝ) : lerp a b 0 = a := by
  simp [lerp]

@[simp] theorem lerp_one (a b : ℝ) : lerp a b 1 = b := by
  simp [lerp]

/-- A convex interpolation remains inside any inclusive interval containing both endpoints. -/
theorem lerp_mem_Icc {low high a b t : ℝ}
    (ha : a ∈ Set.Icc low high) (hb : b ∈ Set.Icc low high)
    (ht : t ∈ Set.Icc (0 : ℝ) 1) : lerp a b t ∈ Set.Icc low high := by
  rcases ha with ⟨haLow, haHigh⟩
  rcases hb with ⟨hbLow, hbHigh⟩
  rcases ht with ⟨htZero, htOne⟩
  constructor
  · have hleft : 0 ≤ (1 - t) * (a - low) :=
      mul_nonneg (sub_nonneg.mpr htOne) (sub_nonneg.mpr haLow)
    have hright : 0 ≤ t * (b - low) :=
      mul_nonneg htZero (sub_nonneg.mpr hbLow)
    apply sub_nonneg.mp
    calc
      lerp a b t - low = (1 - t) * (a - low) + t * (b - low) := by
        simp [lerp]
        ring
      _ ≥ 0 := add_nonneg hleft hright
  · have hleft : 0 ≤ (1 - t) * (high - a) :=
      mul_nonneg (sub_nonneg.mpr htOne) (sub_nonneg.mpr haHigh)
    have hright : 0 ≤ t * (high - b) :=
      mul_nonneg htZero (sub_nonneg.mpr hbHigh)
    apply sub_nonneg.mp
    calc
      high - lerp a b t = (1 - t) * (high - a) + t * (high - b) := by
        simp [lerp]
        ring
      _ ≥ 0 := add_nonneg hleft hright

/-- The direct-profile amplitude contract. -/
def ValidAmplitude (a : ℝ) : Prop := a ∈ Set.Icc (-1 : ℝ) 1

theorem lerp_preserves_amplitude {a b t : ℝ}
    (ha : ValidAmplitude a) (hb : ValidAmplitude b)
    (ht : t ∈ Set.Icc (0 : ℝ) 1) : ValidAmplitude (lerp a b t) :=
  lerp_mem_Icc ha hb ht

end E8Music.Canonical
