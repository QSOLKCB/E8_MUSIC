-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.OctaveTranslation

/-!
# UFF traversal and interpolation

`translatedLerp` accepts already-computed orbital-frequency observations and
applies the common octave translation before piecewise-linear interpolation.
It has no radius or velocity inputs, so it cannot mean “interpolate R and V,
then recompute V/(2*pi*R)”.
-/

namespace E8Music.Canonical

noncomputable section

def audibleLowHz : ℝ := 20

def audibleHighHz : ℝ := 18000

/-- Interpolation of the two translated frequency observations. -/
def translatedLerp (k : ℤ) (frequencyA frequencyB t : ℝ) : ℝ :=
  lerp (translate k frequencyA) (translate k frequencyB) t

@[simp] theorem translated_lerp_zero (k : ℤ) (frequencyA frequencyB : ℝ) :
    translatedLerp k frequencyA frequencyB 0 = translate k frequencyA := by
  simp [translatedLerp]

@[simp] theorem translated_lerp_one (k : ℤ) (frequencyA frequencyB : ℝ) :
    translatedLerp k frequencyA frequencyB 1 = translate k frequencyB := by
  simp [translatedLerp]

theorem translated_lerp_bounds {k : ℤ} {frequencyA frequencyB t low high : ℝ}
    (hA : translate k frequencyA ∈ Set.Icc low high)
    (hB : translate k frequencyB ∈ Set.Icc low high)
    (hT : t ∈ Set.Icc (0 : ℝ) 1) :
    translatedLerp k frequencyA frequencyB t ∈ Set.Icc low high := by
  exact lerp_mem_Icc hA hB hT

/-- Common scaling commutes algebraically with affine interpolation. -/
theorem translated_lerp_eq_translate_lerp (k : ℤ) (frequencyA frequencyB t : ℝ) :
    translatedLerp k frequencyA frequencyB t =
      translate k (lerp frequencyA frequencyB t) := by
  simp [translatedLerp, translate, lerp]
  ring

def sampleRateHz : ℕ := 48000

/-- Exact rational duration, avoiding any floating approximation of `0.05`. -/
def secondsPerInterval : ℚ := 1 / 20

def framesPerInterval : ℕ := 2400

theorem exact_frames_per_interval :
    (sampleRateHz : ℚ) * secondsPerInterval = (framesPerInterval : ℚ) := by
  norm_num [sampleRateHz, secondsPerInterval, framesPerInterval]

/-- Both global endpoints are included by the final `+ 1`. -/
def frameCount (intervalCount : ℕ) : ℕ :=
  intervalCount * framesPerInterval + 1

theorem frame_count_spec (intervalCount : ℕ) :
    frameCount intervalCount = intervalCount * 2400 + 1 := by
  rfl

def intervalFrameParameter (frame : ℕ) : ℚ :=
  (frame : ℚ) / (framesPerInterval : ℚ)

@[simp] theorem first_interval_endpoint : intervalFrameParameter 0 = 0 := by
  norm_num [intervalFrameParameter]

@[simp] theorem final_interval_endpoint :
    intervalFrameParameter framesPerInterval = 1 := by
  norm_num [intervalFrameParameter, framesPerInterval]

end

end E8Music.Canonical
