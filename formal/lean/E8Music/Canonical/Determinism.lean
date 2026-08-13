-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Claims
import E8Music.Canonical.Units
import Mathlib.Data.Real.Archimedean

/-!
# Functional determinism and polynomial sine receiver

The polynomial is an exact-real reference with exact rational coefficients.
Executable tests separately lock the JavaScript coefficient bit patterns,
range-reduction behavior, float64 signal, PCM, and WAV identities.
-/

namespace E8Music.Canonical

noncomputable section

structure ReferenceRenderer (Profile Source Output : Type) where
  render : Profile → Source → Output

/-- Equal profile and source values yield equal output from the reference function. -/
theorem same_profile_input_same_reference_output
    {Profile Source Output : Type}
    (renderer : ReferenceRenderer Profile Source Output)
    {profileA profileB : Profile} {sourceA sourceB : Source}
    (hProfile : profileA = profileB) (hSource : sourceA = sourceB) :
    renderer.render profileA sourceA = renderer.render profileB sourceB := by
  subst profileB
  subst sourceB
  rfl

/-- Exact-real phase wrap used by the mathematical receiver reference. -/
def wrapPhaseReference (phase : ℝ) : ℝ :=
  phase - tau * (Int.floor (phase / tau) : ℝ)

def signedRangeReduction (wrappedPhase : ℝ) : ℝ :=
  if wrappedPhase > Real.pi then wrappedPhase - tau else wrappedPhase

def halfPi : ℝ := Real.pi / 2

def reflectReducedPhase (phase : ℝ) : ℝ :=
  if phase > halfPi then Real.pi - phase
  else if phase < -halfPi then -Real.pi - phase
  else phase

/-- Frozen odd degree-17 mathematical polynomial, expressed with exact rationals. -/
def sinePoly17 (x : ℝ) : ℝ :=
  x * (1 + x ^ 2 *
    ((-1 : ℝ) / 6 + x ^ 2 *
      (1 / 120 + x ^ 2 *
        ((-1 : ℝ) / 5040 + x ^ 2 *
          (1 / 362880 + x ^ 2 *
            ((-1 : ℝ) / 39916800 + x ^ 2 *
              (1 / 6227020800 + x ^ 2 *
                ((-1 : ℝ) / 1307674368000 + x ^ 2 *
                  (1 / 355687428096000)))))))))

def polynomialSineReceiver (phase : ℝ) : ℝ :=
  sinePoly17 (reflectReducedPhase (signedRangeReduction (wrapPhaseReference phase)))

/-- The frozen polynomial is algebraically odd. -/
theorem sine_poly17_odd (x : ℝ) : sinePoly17 (-x) = -sinePoly17 x := by
  simp [sinePoly17]

@[simp] theorem sine_poly17_zero : sinePoly17 0 = 0 := by
  simp [sinePoly17]

end

end E8Music.Canonical
