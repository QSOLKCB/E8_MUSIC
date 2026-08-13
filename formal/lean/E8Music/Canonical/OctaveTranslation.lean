-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.OrbitalFrequency

/-!
# Common integer-octave translation

The selector searches an explicitly ordered finite candidate window. Its
specification theorem is independent of how a conformance implementation finds
that window. Inclusive post-selection bounds are part of `AdmissibleShift`.
-/

namespace E8Music.Canonical

noncomputable section

def octaveFactor (k : ℤ) : ℝ := (2 : ℝ) ^ k

def translate (k : ℤ) (frequency : ℝ) : ℝ := octaveFactor k * frequency

theorem octave_factor_pos (k : ℤ) : 0 < octaveFactor k := by
  exact zpow_pos (by norm_num) k

theorem octave_factor_ne_zero (k : ℤ) : octaveFactor k ≠ 0 :=
  ne_of_gt (octave_factor_pos k)

/-- A common integer-octave translation preserves positivity. -/
theorem translate_pos {frequency : ℝ} (k : ℤ) (hFrequency : 0 < frequency) :
    0 < translate k frequency :=
  mul_pos (octave_factor_pos k) hFrequency

/-- One common nonzero scale factor preserves every nonzero-denominator ratio. -/
theorem frequency_ratio_preserved (k : ℤ) (frequencyI frequencyJ : ℝ)
    (hFrequencyJ : frequencyJ ≠ 0) :
    translate k frequencyI / translate k frequencyJ = frequencyI / frequencyJ := by
  apply (div_eq_div_iff (mul_ne_zero (octave_factor_ne_zero k) hFrequencyJ)
    hFrequencyJ).2
  simp [translate]
  ring

/-- Inclusive audible-window admissibility, including the v1 post-selection check. -/
def AdmissibleShift (k : ℤ) (frequencies : List ℝ) (low high : ℝ) : Prop :=
  ∀ frequency ∈ frequencies,
    low ≤ translate k frequency ∧ translate k frequency ≤ high

/-- Ascending candidate order used by the reference selector. -/
def StrictlyIncreasing : List ℤ → Prop
  | [] => True
  | head :: tail => (∀ candidate ∈ tail, head < candidate) ∧ StrictlyIncreasing tail

local instance (proposition : Prop) : Decidable proposition :=
  Classical.propDecidable proposition

/-- Return the first admissible candidate; no epsilon or fallback transform exists. -/
noncomputable def chooseShift (candidates : List ℤ) (frequencies : List ℝ)
    (low high : ℝ) : Option ℤ :=
  match candidates with
  | [] => none
  | head :: tail =>
      if AdmissibleShift head frequencies low high then some head
      else chooseShift tail frequencies low high

/-- Every successful selection passes the inclusive post-selection bounds check. -/
theorem chooseShift_sound {candidates : List ℤ} {frequencies : List ℝ}
    {low high : ℝ} {k : ℤ}
    (hChoose : chooseShift candidates frequencies low high = some k) :
    AdmissibleShift k frequencies low high := by
  induction candidates with
  | nil => simp [chooseShift] at hChoose
  | cons head tail ih =>
      by_cases hHead : AdmissibleShift head frequencies low high
      · simp [chooseShift, hHead] at hChoose
        subst k
        exact hHead
      · simp [chooseShift, hHead] at hChoose
        exact ih hChoose

/-- On an ascending window, every smaller relevant candidate has failed. -/
theorem chooseShift_minimal {candidates : List ℤ} {frequencies : List ℝ}
    {low high : ℝ} {k : ℤ}
    (hIncreasing : StrictlyIncreasing candidates)
    (hChoose : chooseShift candidates frequencies low high = some k) :
    ∀ candidate ∈ candidates, candidate < k →
      ¬ AdmissibleShift candidate frequencies low high := by
  induction candidates generalizing k with
  | nil => simp
  | cons head tail ih =>
      rcases hIncreasing with ⟨hHeadLess, hTailIncreasing⟩
      by_cases hHead : AdmissibleShift head frequencies low high
      · simp [chooseShift, hHead] at hChoose
        subst k
        intro candidate hMember hSmaller
        rcases List.mem_cons.mp hMember with rfl | hTailMember
        · exact (lt_irrefl _ hSmaller).elim
        · have hGreater := hHeadLess candidate hTailMember
          exact (not_lt_of_ge (le_of_lt hGreater) hSmaller).elim
      · simp [chooseShift, hHead] at hChoose
        intro candidate hMember hSmaller
        rcases List.mem_cons.mp hMember with rfl | hTailMember
        · exact hHead
        · exact ih hTailIncreasing hChoose candidate hTailMember hSmaller

/-- Failure returns no disguised clipping, wrapping, compression, or per-value shift. -/
theorem chooseShift_none_of_no_admissible {candidates : List ℤ}
    {frequencies : List ℝ} {low high : ℝ}
    (hNone : ∀ k : ℤ, ¬ AdmissibleShift k frequencies low high) :
    chooseShift candidates frequencies low high = none := by
  induction candidates with
  | nil => rfl
  | cons head tail ih =>
      simp [chooseShift, hNone head, ih]

/-- Endpoint form of a complete-interval admissibility test. -/
def EndpointAdmissible (k : ℤ) (minimum maximum low high : ℝ) : Prop :=
  low ≤ translate k minimum ∧ translate k maximum ≤ high

/-- If the source span exceeds the window span, no positive common octave factor can fit it. -/
theorem no_common_shift_of_span {minimum maximum low high : ℝ}
    (hMinimum : 0 < minimum) (hMaximum : 0 < maximum)
    (hSpan : high * minimum < low * maximum) :
    ∀ k : ℤ, ¬ EndpointAdmissible k minimum maximum low high := by
  intro k hAdmissible
  rcases hAdmissible with ⟨hLow, hHigh⟩
  change low ≤ octaveFactor k * minimum at hLow
  change octaveFactor k * maximum ≤ high at hHigh
  have hLower : low * maximum ≤ (octaveFactor k * minimum) * maximum :=
    mul_le_mul_of_nonneg_right hLow (le_of_lt hMaximum)
  have hUpper : (octaveFactor k * minimum) * maximum ≤ high * minimum := by
    calc
      (octaveFactor k * minimum) * maximum =
          (octaveFactor k * maximum) * minimum := by ring
      _ ≤ high * minimum :=
        mul_le_mul_of_nonneg_right hHigh (le_of_lt hMinimum)
  exact (not_lt_of_ge (hLower.trans hUpper)) hSpan

end

end E8Music.Canonical
