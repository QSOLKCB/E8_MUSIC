-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Units

/-!
# UFF orbital-frequency reference transform

This module proves properties of the declared transform. It neither assumes nor
establishes that UFF or its upstream observations are physically correct.
-/

namespace E8Music.Canonical

noncomputable section

/-- Physical cycles per second after the v1 unit conversions. -/
def orbitalFrequency (radiusKpc velocityKms : ℝ) : ℝ :=
  velocityMetresPerSecond velocityKms / (tau * radiusMetres radiusKpc)

theorem orbital_frequency_formula (radiusKpc velocityKms : ℝ) :
    orbitalFrequency radiusKpc velocityKms =
      (velocityKms * 1000) / ((2 * Real.pi) * (radiusKpc * 30856775814913673000)) := by
  rfl

/-- Positive radius and circular velocity produce a positive reference frequency. -/
theorem orbital_frequency_pos {radiusKpc velocityKms : ℝ}
    (hRadius : 0 < radiusKpc) (hVelocity : 0 < velocityKms) :
    0 < orbitalFrequency radiusKpc velocityKms := by
  apply div_pos
  · exact velocity_metres_per_second_pos hVelocity
  · exact mul_pos tau_pos (radius_metres_pos hRadius)

end

end E8Music.Canonical
