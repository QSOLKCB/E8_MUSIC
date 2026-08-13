-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Basic

/-!
# Direct unit-signal audification

The reference operation only has amplitude endpoints and an interpolation
coordinate. No normalization factor, MIDI mapping, oscillator, tuning,
envelope, effect, or mastering parameter exists in its type.
-/

namespace E8Music.Canonical

noncomputable section

structure DirectObservation where
  time : ℝ
  amplitude : ℝ

def shiftTime (offset : ℝ) (observation : DirectObservation) : DirectObservation :=
  { observation with time := observation.time + offset }

def relativeTime (origin time : ℝ) : ℝ := time - origin

/-- Common absolute time translation leaves every relative interval unchanged. -/
@[simp] theorem relative_time_translation_invariant (origin time offset : ℝ) :
    relativeTime (origin + offset) (time + offset) = relativeTime origin time := by
  simp [relativeTime]

def relativeSeries (origin : ℝ) (observations : List DirectObservation) :
    List (ℝ × ℝ) :=
  observations.map fun observation =>
    (relativeTime origin observation.time, observation.amplitude)

def shiftSeries (offset : ℝ) (observations : List DirectObservation) :
    List DirectObservation := observations.map (shiftTime offset)

/-- Zero-relative coordinates are identical after any common absolute time shift. -/
theorem relative_series_translation_invariant (origin offset : ℝ)
    (observations : List DirectObservation) :
    relativeSeries (origin + offset) (shiftSeries offset observations) =
      relativeSeries origin observations := by
  induction observations with
  | nil => rfl
  | cons head tail ih =>
      simp [relativeSeries, shiftSeries, shiftTime, ih]

def segmentFraction (left right : DirectObservation) (sampleTime : ℝ) : ℝ :=
  relativeTime left.time sampleTime / relativeTime left.time right.time

/-- Pure piecewise-linear source mapping for one direct-profile segment. -/
def directAudifySegment (left right : DirectObservation) (sampleTime : ℝ) : ℝ :=
  lerp left.amplitude right.amplitude (segmentFraction left right sampleTime)

/-- Segment resampling is invariant when source and sample times share an offset. -/
theorem segment_resampling_translation_invariant
    (left right : DirectObservation) (sampleTime offset : ℝ) :
    directAudifySegment (shiftTime offset left) (shiftTime offset right)
        (sampleTime + offset) =
      directAudifySegment left right sampleTime := by
  simp [directAudifySegment, segmentFraction, shiftTime]

/-- Direct audification is definitionally just endpoint interpolation. -/
theorem direct_audification_is_pure_lerp
    (left right : DirectObservation) (sampleTime : ℝ) :
    directAudifySegment left right sampleTime =
      lerp left.amplitude right.amplitude
        (segmentFraction left right sampleTime) := by
  rfl

/-- Valid endpoint amplitudes need no authored gain fitting. -/
theorem direct_interpolation_preserves_amplitude
    {left right : DirectObservation} {t : ℝ}
    (hLeft : ValidAmplitude left.amplitude)
    (hRight : ValidAmplitude right.amplitude)
    (hT : t ∈ Set.Icc (0 : ℝ) 1) :
    ValidAmplitude (lerp left.amplitude right.amplitude t) :=
  lerp_preserves_amplitude hLeft hRight hT

end

end E8Music.Canonical
