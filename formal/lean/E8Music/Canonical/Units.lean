-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic

/-!
# Declared units

The v1 UFF profile treats these exact real constants as its mathematical
reference. The JavaScript decimal-to-binary64 realization is checked separately.
-/

namespace E8Music.Canonical

noncomputable section

/-- Exact reference value declared by `uff-orbital-frequency-v1`. -/
def kpcMeters : ℝ := 30856775814913673000

def metresPerKilometre : ℝ := 1000

def tau : ℝ := 2 * Real.pi

def velocityMetresPerSecond (velocityKms : ℝ) : ℝ :=
  velocityKms * metresPerKilometre

def radiusMetres (radiusKpc : ℝ) : ℝ := radiusKpc * kpcMeters

theorem kpc_meters_pos : 0 < kpcMeters := by
  norm_num [kpcMeters]

theorem metres_per_kilometre_pos : 0 < metresPerKilometre := by
  norm_num [metresPerKilometre]

theorem tau_pos : 0 < tau := by
  exact mul_pos (by norm_num) Real.pi_pos

theorem velocity_metres_per_second_pos {velocityKms : ℝ} (h : 0 < velocityKms) :
    0 < velocityMetresPerSecond velocityKms := by
  exact mul_pos h metres_per_kilometre_pos

theorem radius_metres_pos {radiusKpc : ℝ} (h : 0 < radiusKpc) :
    0 < radiusMetres radiusKpc := by
  exact mul_pos h kpc_meters_pos

end

end E8Music.Canonical
