-- SPDX-License-Identifier: MPL-2.0
import E8Music.Canonical.Basic

/-!
# Observation authority

Audio is attached as a separate field. Constructing or replacing it cannot
change the source object or any scientific result stored in that object.
-/

namespace E8Music.Canonical

structure SonifiedObservation (Source Audio : Type) where
  source : Source
  audio : Audio
deriving Repr

def attachSonification {Source Audio : Type} (source : Source) (audio : Audio) :
    SonifiedObservation Source Audio := ⟨source, audio⟩

/-- Attaching canonical audio preserves the underlying source exactly. -/
@[simp] theorem sonification_preserves_source {Source Audio : Type}
    (source : Source) (audio : Audio) :
    (attachSonification source audio).source = source := by
  rfl

def replaceAudio {Source Audio : Type}
    (observation : SonifiedObservation Source Audio) (audio : Audio) :
    SonifiedObservation Source Audio := ⟨observation.source, audio⟩

/-- Audio replacement has zero authority over the source/scientific field. -/
@[simp] theorem replacing_audio_preserves_source {Source Audio : Type}
    (observation : SonifiedObservation Source Audio) (audio : Audio) :
    (replaceAudio observation audio).source = observation.source := by
  rfl

end E8Music.Canonical
