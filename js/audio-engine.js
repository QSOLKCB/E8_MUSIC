(function (global, factory) {
  const core = global.E8Core || (typeof require !== "undefined" ? require("./e8-core.js") : null);
  const api = factory(core);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.E8Audio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";
  if (!Core) throw new Error("E8Core must load before E8Audio.");

  const TAU = Math.PI * 2;
  const PRESETS = Object.freeze({
    c64Slide: {
      label: "C64 E8 Root Slide",
      family: "E8 root engines",
      description: "The 156-value golden shadow controls a non-linear SID-like glissando.",
      modelMode: "e8", renderMode: "slide", projection: "golden", traversal: "projected",
      duration: 2.4, bpm: 120, tuning: 432, sampleRate: 22050, bitDepth: 8, channels: 1,
      waveform: "saw", scale: "chromatic", baseMidi: 43, pitchSpan: 53, density: 1,
      drive: 1.1, cutoff: 7200, grit: 0.62, space: 0.02, width: 0, seed: "E8-C64-156"
    },
    electricSlide: {
      label: "Electric Root Slide",
      family: "E8 root engines",
      description: "Expressive root-to-root glides with harmonics, pick noise and controlled overdrive.",
      modelMode: "e8", renderMode: "lead", projection: "fibonacci", traversal: "projected",
      duration: 16, bpm: 96, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "guitar", scale: "minor", baseMidi: 40, pitchSpan: 31, density: 0.7,
      drive: 1.35, cutoff: 3600, grit: 0.08, space: 0.2, width: 0.72, seed: "E8-SLIDE-42"
    },
    cyberWestern: {
      label: "Cyber Western Lattice",
      family: "E8 arrangements",
      description: "Twang, industrial percussion and digital corruption driven by successive E8 labels.",
      modelMode: "e8", renderMode: "arrangement", projection: "fibonacci", traversal: "interleaved",
      duration: 20, bpm: 120, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "twang", scale: "minor", baseMidi: 33, pitchSpan: 29, density: 0.68,
      drive: 1.8, cutoff: 2800, grit: 0.26, space: 0.16, width: 0.78, seed: "E8-CYBER-WESTERN-42"
    },
    industrialStabs: {
      label: "Industrial Root Stabs",
      family: "E8 arrangements",
      description: "Short distorted lattice stabs, bass and mechanical drums at a driving mid-tempo grid.",
      modelMode: "e8", renderMode: "arrangement", projection: "golden", traversal: "seeded",
      duration: 18, bpm: 112, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "stab", scale: "phrygian", baseMidi: 34, pitchSpan: 25, density: 0.76,
      drive: 2.8, cutoff: 1900, grit: 0.13, space: 0.1, width: 0.65, seed: "E8-STABS-101"
    },
    progressiveRitual: {
      label: "Progressive Lattice Ritual",
      family: "E8 arrangements",
      description: "A spacious odd-accent root riff with bass, toms and evolving pulse geometry.",
      modelMode: "e8", renderMode: "arrangement", projection: "balanced", traversal: "lexicographic",
      duration: 22, bpm: 108, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "guitar", scale: "harmonicMinor", baseMidi: 37, pitchSpan: 24, density: 0.58,
      drive: 2.1, cutoff: 1600, grit: 0.06, space: 0.27, width: 0.82, seed: "E8-RITUAL-8"
    },
    r8Drums: {
      label: "R-8 Lattice Drums",
      family: "E8 percussion",
      description: "All eight coordinates map to an industrial eight-voice drum grid.",
      modelMode: "e8", renderMode: "drums", projection: "golden", traversal: "lexicographic",
      duration: 6.96, bpm: 138, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "noise", scale: "minor", baseMidi: 34, pitchSpan: 24, density: 0.82,
      drive: 2.1, cutoff: 8000, grit: 0.12, space: 0.08, width: 0.9, seed: "E8-R8-8"
    },
    dr660Factory: {
      label: "DR-660 Factory Loop",
      family: "E8 percussion",
      description: "Cartan-like pulse skeleton, continuous hats, metallic clangs and machine-room drive.",
      modelMode: "e8", renderMode: "drums", projection: "axis", traversal: "interleaved",
      duration: 7.27, bpm: 132, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "noise", scale: "minor", baseMidi: 34, pitchSpan: 24, density: 0.72,
      drive: 1.7, cutoff: 7600, grit: 0.05, space: 0.14, width: 0.84, seed: "E8-DR660-8"
    },
    etqCodebook: {
      label: "ETQ-101 Ternary Codebook",
      family: "ETQ-101 experiments",
      description: "The selected 101 states traverse the paper's reversible symbolic MIDI window through an audible receiver.",
      modelMode: "etq101", etqExperiment: "codebook", renderMode: "lead", projection: "golden", traversal: "lexicographic",
      duration: 20, bpm: 101, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "triangle", scale: "chromatic", baseMidi: 13, pitchSpan: 100, density: 0.82,
      drive: 1.15, cutoff: 5200, grit: 0.02, space: 0.22, width: 0.75, seed: "ETQ101-CODEBOOK"
    },
    etqTriality: {
      label: "ETQ-101 Triality Orbit",
      family: "ETQ-101 experiments",
      description: "Thirty-three three-cycles rotate through q=0,1,2 while the two singlets punctuate the form.",
      modelMode: "etq101", etqExperiment: "triality", renderMode: "arrangement", projection: "golden", traversal: "lexicographic",
      duration: 24, bpm: 99, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "pulse", scale: "minor", baseMidi: 35, pitchSpan: 28, density: 0.7,
      drive: 1.55, cutoff: 3400, grit: 0.05, space: 0.25, width: 0.9, seed: "ETQ101-TRIALITY"
    },
    etqCurvature: {
      label: "ETQ-101 SCL Curvature",
      family: "ETQ-101 experiments",
      description: "The traceless (1,-2,1) stencil shapes accents and timbre without pretending to be pitch order.",
      modelMode: "etq101", etqExperiment: "curvature", renderMode: "arrangement", projection: "balanced", traversal: "interleaved",
      duration: 21, bpm: 111, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "stab", scale: "phrygian", baseMidi: 36, pitchSpan: 27, density: 0.74,
      drive: 2.25, cutoff: 2400, grit: 0.1, space: 0.12, width: 0.76, seed: "ETQ101-SCL-1-2-1"
    },
    etqGraph: {
      label: "ETQ-101 Degree Graph Walk",
      family: "ETQ-101 experiments",
      description: "A deterministic walk over the 1,687-edge selected graph; degree potential drives register and brightness.",
      modelMode: "etq101", etqExperiment: "graph", renderMode: "arrangement", projection: "prime", traversal: "seeded",
      duration: 24, bpm: 124, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "guitar", scale: "harmonicMinor", baseMidi: 31, pitchSpan: 34, density: 0.66,
      drive: 1.9, cutoff: 3000, grit: 0.08, space: 0.18, width: 0.86, seed: "ETQ101-GRAPH-1687"
    },
    etqOuroboros: {
      label: "ETQ-101 Ouroboros Phase",
      family: "ETQ-101 experiments",
      description: "Orbit phase 2πq/3 - θ(1,-2,1) becomes oscillator phase and stereo motion.",
      modelMode: "etq101", etqExperiment: "ouroboros", renderMode: "ambient", projection: "balanced", traversal: "projected",
      duration: 28, bpm: 90, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "sine", scale: "wholeTone", baseMidi: 38, pitchSpan: 30, density: 0.5,
      drive: 1.1, cutoff: 4600, grit: 0.01, space: 0.38, width: 1, seed: "ETQ101-OUROBOROS-THETA"
    },
    etq303: {
      label: "ETQ H303 Full-Qutrit Cycle",
      family: "ETQ-303 extension",
      description: "All 303 site×qutrit components cycle at δ=2π/303. This is 303 states, not 303 E8 roots.",
      modelMode: "etq303", etqExperiment: "full303", renderMode: "arrangement", projection: "golden", traversal: "lexicographic",
      duration: 30.3, bpm: 121, tuning: 432, sampleRate: 44100, bitDepth: 16, channels: 2,
      waveform: "pulse", scale: "minor", baseMidi: 32, pitchSpan: 38, density: 1,
      drive: 1.7, cutoff: 3600, grit: 0.07, space: 0.2, width: 0.92, seed: "ETQ303-FULL-CYCLE"
    }
  });

  function presetRecipe(id) {
    const preset = PRESETS[id] || PRESETS.c64Slide;
    return { presetId: id in PRESETS ? id : "c64Slide", ...preset };
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function phaseWrap(phase) { return phase - TAU * Math.floor(phase / TAU); }
  function osc(shape, phase, duty = 0.25) {
    const cycle = phaseWrap(phase) / TAU;
    if (shape === "sine") return Math.sin(phase);
    if (shape === "triangle") return 1 - 4 * Math.abs(cycle - 0.5);
    if (shape === "square") return cycle < 0.5 ? 1 : -1;
    if (shape === "pulse") return cycle < duty ? 1 : -1;
    return 2 * cycle - 1;
  }

  function allocate(recipe) {
    const length = Math.max(1, Math.round(recipe.duration * recipe.sampleRate));
    return { left: new Float32Array(length), right: new Float32Array(length), length };
  }

  function panGains(pan) {
    const angle = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
    return [Math.cos(angle), Math.sin(angle)];
  }

  function addTone(buffer, event, recipe, rng) {
    const sr = recipe.sampleRate;
    const start = clamp(Math.round(event.time * sr), 0, buffer.length - 1);
    const count = Math.max(8, Math.min(buffer.length - start, Math.round(event.duration * sr)));
    if (count <= 0) return;
    const attack = Math.min(count * 0.22, sr * (event.role === "pad" ? 0.7 : 0.015));
    const release = Math.min(count * 0.45, sr * (event.role === "pad" ? 1.4 : 0.18));
    const [gainL, gainR] = panGains(event.pan || 0);
    const targetFrequency = event.endFrequency || event.frequency;
    const ratio = targetFrequency / event.frequency;
    const filterCutoff = clamp(event.cutoff || recipe.cutoff, 80, sr * 0.45);
    const filterAlpha = 1 - Math.exp(-TAU * filterCutoff / sr);
    let filtered = 0;
    let phase = event.phase || 0;
    let noiseState = 0;
    const shape = event.waveform || recipe.waveform;
    const harmonic = shape === "guitar" || shape === "twang" || shape === "stab";

    for (let index = 0; index < count; index += 1) {
      const position = index / Math.max(1, count - 1);
      const eased = position * position * (3 - 2 * position);
      const frequency = event.frequency * ratio ** eased;
      const vibrato = event.vibrato ? 2 ** (Math.sin(TAU * event.vibrato * index / sr) * 0.18 / 12) : 1;
      phase += TAU * frequency * vibrato / sr;
      let sample;
      if (harmonic) {
        const bright = osc("saw", phase);
        const detuned = osc("saw", phase * 1.004);
        const square = osc("square", phase);
        sample = bright * 0.46 + detuned * 0.22 + square * 0.18 + Math.sin(phase) * 0.14;
        if (shape === "twang") sample += Math.sin(phase * 2.006) * 0.16;
      } else {
        sample = osc(shape, phase, 0.125 + (event.duty || 0.125));
      }
      if (recipe.grit > 0 || event.noise) {
        const noise = rng() * 2 - 1;
        noiseState += 0.18 * (noise - noiseState);
        sample += noiseState * (event.noise || recipe.grit * 0.08);
      }
      if (index < attack) sample *= index / Math.max(1, attack);
      if (index > count - release) sample *= (count - index) / Math.max(1, release);
      if (event.role === "stab") sample *= Math.exp(-position * 5.5);
      if (event.role === "bass") sample = sample * 0.58 + Math.sin(phase * 0.5) * 0.42;
      filtered += filterAlpha * (sample - filtered);
      const driven = Math.tanh(filtered * (event.drive || recipe.drive));
      const value = driven * (event.velocity || 0.5);
      buffer.left[start + index] += value * gainL;
      buffer.right[start + index] += value * gainR;
    }
  }

  function addDrum(buffer, event, recipe, rng) {
    const sr = recipe.sampleRate;
    const start = clamp(Math.round(event.time * sr), 0, buffer.length - 1);
    const durations = { kick: 0.46, snare: 0.32, chh: 0.075, ohh: 0.3, lowTom: 0.38, highTom: 0.29, ride: 0.48, clang: 0.24 };
    const count = Math.min(buffer.length - start, Math.round((durations[event.voice] || 0.25) * sr));
    const [gainL, gainR] = panGains(event.pan || 0);
    let phase = 0;
    let previousNoise = 0;
    for (let index = 0; index < count; index += 1) {
      const time = index / sr;
      const noise = rng() * 2 - 1;
      const highNoise = noise - previousNoise;
      previousNoise = noise;
      let sample = 0;
      if (event.voice === "kick") {
        const frequency = 42 + 118 * Math.exp(-time * 24);
        phase += TAU * frequency / sr;
        sample = Math.sin(phase) * Math.exp(-time * 9) + highNoise * Math.exp(-time * 70) * 0.26;
      } else if (event.voice === "snare") {
        sample = Math.sin(TAU * 185 * time) * Math.exp(-time * 15) * 0.36 + highNoise * Math.exp(-time * 13) * 0.72;
      } else if (event.voice === "chh" || event.voice === "ohh") {
        sample = highNoise * Math.exp(-time * (event.voice === "chh" ? 55 : 10)) * 0.46;
      } else if (event.voice === "lowTom" || event.voice === "highTom") {
        const base = event.voice === "lowTom" ? 92 : 148;
        sample = Math.sin(TAU * (base + 42 * Math.exp(-time * 18)) * time) * Math.exp(-time * 10) * 0.62;
      } else {
        const base = event.voice === "clang" ? 420 : 620;
        sample = (Math.sin(TAU * base * time) + Math.sin(TAU * base * 1.414 * time) * 0.65 + Math.sin(TAU * base * 1.618 * time) * 0.4) * Math.exp(-time * (event.voice === "clang" ? 13 : 5)) * 0.32;
        sample += highNoise * Math.exp(-time * 16) * 0.16;
      }
      const value = Math.tanh(sample * recipe.drive) * (event.velocity || 0.7);
      buffer.left[start + index] += value * gainL;
      buffer.right[start + index] += value * gainR;
    }
  }

  function e8Midi(rootIndex, projection, recipe) {
    const raw = recipe.baseMidi + projection.normalized[rootIndex] * recipe.pitchSpan;
    return Core.quantizeMidi(raw, recipe.scale, 9);
  }

  function etqMidi(label, recipe) {
    const experiment = recipe.etqExperiment || "triality";
    if (label.kind === "singlet") return label.singlet === 0 ? recipe.baseMidi : recipe.baseMidi + 24;
    if (experiment === "codebook") {
      const audible = label.midi < 24 ? label.midi + 24 : label.midi;
      return clamp(audible, 18, 113);
    }
    if (experiment === "graph") {
      return Core.quantizeMidi(recipe.baseMidi + ((label.degree - 22) / 33) * recipe.pitchSpan, recipe.scale, 9);
    }
    const orbitPosition = label.m / 32;
    const qOffset = experiment === "curvature" ? 0 : label.q * 5;
    return Core.quantizeMidi(recipe.baseMidi + orbitPosition * recipe.pitchSpan + qOffset, recipe.scale, 9);
  }

  function eventFromEtqLabel(label, recipe, time, duration, index) {
    const midi = etqMidi(label, recipe);
    const q = label.q ?? 1;
    const curvature = label.curvature ?? 0;
    const thetaPhase = label.kind === "qutrit" ? TAU * q / 3 - Core.ETQ_INVARIANTS.theta * curvature : 0;
    const degreeBrightness = label.degree ? (label.degree - 22) / 33 : 0.5;
    return {
      time, duration, midi, frequency: Core.midiToFrequency(midi, recipe.tuning),
      endFrequency: Core.midiToFrequency(midi + (recipe.etqExperiment === "triality" ? (q - 1) * 0.35 : 0), recipe.tuning),
      velocity: clamp(0.28 + degreeBrightness * 0.38 + Math.abs(curvature) * 0.08, 0.2, 0.9),
      pan: label.kind === "qutrit" ? (q - 1) * recipe.width * 0.72 : 0,
      cutoff: recipe.cutoff * (0.72 + degreeBrightness * 0.75 + (curvature === -2 ? -0.12 : 0)),
      phase: recipe.etqExperiment === "ouroboros" ? thetaPhase : 0,
      role: recipe.renderMode === "ambient" ? "pad" : (index % 4 === 0 ? "stab" : "lead"),
      waveform: recipe.waveform,
      source: label.kind === "qutrit" ? `ETQ orbit ${label.m}, q=${label.q}` : `ETQ singlet ${label.singlet}`,
      stateIndex: label.index,
      degree: label.degree,
      degreePotential: label.degreePotential,
      curvature
    };
  }

  async function renderSlide(buffer, recipe, roots, projection, rng, events, progress) {
    const values = Core.uniqueProjectionValues(projection.values);
    const min = values[0];
    const max = values[values.length - 1];
    const range = max - min;
    const sr = recipe.sampleRate;
    const hold = 1 + Math.floor(recipe.grit * 13);
    let phase = 0;
    let held = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const globalPosition = index / Math.max(1, buffer.length - 1);
      const controlPosition = globalPosition * (values.length - 1);
      const leftIndex = Math.floor(controlPosition);
      const fraction = controlPosition - leftIndex;
      const value = values[leftIndex] * (1 - fraction) + values[Math.min(values.length - 1, leftIndex + 1)] * fraction;
      const normalized = (value - min) / range;
      const low = Core.midiToFrequency(recipe.baseMidi, recipe.tuning);
      const high = Core.midiToFrequency(recipe.baseMidi + recipe.pitchSpan, recipe.tuning);
      const frequency = low * (high / low) ** normalized;
      phase += TAU * frequency / sr;
      if (index % hold === 0) held = osc(recipe.waveform, phase) + (rng() * 2 - 1) * recipe.grit * 0.035;
      const envelope = Math.min(1, globalPosition / 0.018) * Math.min(1, (1 - globalPosition) / 0.075);
      const sample = Math.tanh(held * recipe.drive) * envelope * 0.72;
      buffer.left[index] = sample;
      buffer.right[index] = sample;
      if (index % 131072 === 0) { progress(index / buffer.length * 0.72); await yieldFrame(); }
    }
    events.push({ time: 0, duration: recipe.duration, role: "continuous E8 shadow", controlPoints: values.length, lowHz: Core.midiToFrequency(recipe.baseMidi, recipe.tuning), highHz: Core.midiToFrequency(recipe.baseMidi + recipe.pitchSpan, recipe.tuning) });
  }

  function graphWalk(etq, count, rng) {
    const output = [Math.floor(rng() * 101)];
    while (output.length < count) {
      const current = output[output.length - 1];
      const neighbors = [];
      for (let index = 0; index < 101; index += 1) if (etq.adjacency[current][index]) neighbors.push(index);
      output.push(neighbors[Math.floor(rng() * neighbors.length)]);
    }
    return output;
  }

  async function renderLead(buffer, recipe, roots, projection, order, etq, rng, events, progress) {
    const segmentCount = recipe.modelMode === "etq101" ? Math.min(101, Math.max(12, Math.round(recipe.duration * recipe.density * 3))) : Math.max(8, Math.round(recipe.duration * recipe.density * 1.8));
    const segmentDuration = recipe.duration / segmentCount;
    const indices = recipe.modelMode === "etq101" && recipe.etqExperiment === "graph"
      ? graphWalk(etq, segmentCount, rng)
      : (recipe.modelMode === "etq101" ? Array.from({ length: 101 }, (_, index) => index) : order);
    for (let index = 0; index < segmentCount; index += 1) {
      let event;
      if (recipe.modelMode === "etq101") {
        const label = etq.labels[indices[index % indices.length] % 101];
        event = eventFromEtqLabel(label, recipe, index * segmentDuration, segmentDuration * 0.94, index);
      } else {
        const rootIndex = indices[index % indices.length];
        const nextRoot = indices[(index + 1) % indices.length];
        const midi = e8Midi(rootIndex, projection, recipe);
        const nextMidi = e8Midi(nextRoot, projection, recipe);
        event = {
          time: index * segmentDuration, duration: segmentDuration * 0.96, midi,
          frequency: Core.midiToFrequency(midi, recipe.tuning), endFrequency: Core.midiToFrequency(nextMidi, recipe.tuning),
          velocity: 0.48 + Math.abs(projection.normalized[rootIndex] - 0.5) * 0.24,
          pan: ((rootIndex % 8) / 7 * 2 - 1) * recipe.width * 0.7,
          cutoff: recipe.cutoff, vibrato: 3.8 + (rootIndex % 5) * 0.32, role: "lead",
          source: `E8 root ${rootIndex}`, rootIndex, midi
        };
      }
      addTone(buffer, event, recipe, rng);
      events.push(event);
      if (index % 5 === 0) { progress(index / segmentCount * 0.72); await yieldFrame(); }
    }
  }

  function drumEventsForRoot(root, time, velocity, step) {
    const voices = ["kick", "snare", "chh", "ohh", "lowTom", "highTom", "ride", "clang"];
    const events = [];
    const integer = root.some((value) => Math.abs(value) === 1);
    for (let coordinate = 0; coordinate < 8; coordinate += 1) {
      const active = integer ? root[coordinate] !== 0 : (root[coordinate] > 0 && (coordinate + step) % 3 === 0);
      if (active) events.push({ time, voice: voices[coordinate], velocity: velocity * (root[coordinate] > 0 ? 1 : 0.72), pan: (coordinate / 7 * 2 - 1) * 0.82, coordinate });
    }
    if (step % 4 === 0 && !events.some((event) => event.voice === "kick")) events.push({ time, voice: "kick", velocity: velocity * 0.8, pan: 0, coordinate: 0 });
    return events;
  }

  async function renderGrid(buffer, recipe, roots, projection, order, etq, etq303, rng, events, progress) {
    const secondsPerStep = 60 / recipe.bpm / 4;
    const stepCount = recipe.modelMode === "etq303" ? 303 : Math.ceil(recipe.duration / secondsPerStep);
    const graphIndices = recipe.modelMode === "etq101" && recipe.etqExperiment === "graph" ? graphWalk(etq, stepCount, rng) : null;
    for (let step = 0; step < stepCount; step += 1) {
      const time = recipe.modelMode === "etq303" ? step * recipe.duration / 303 : step * secondsPerStep;
      if (time >= recipe.duration) break;
      if (recipe.modelMode === "e8") {
        const rootIndex = order[step % order.length];
        const root = roots[rootIndex];
        const drums = drumEventsForRoot(root, time, 0.5 + Math.abs(projection.normalized[rootIndex] - 0.5) * 0.55, step);
        drums.forEach((event) => { addDrum(buffer, event, recipe, rng); events.push({ ...event, source: `E8 root ${rootIndex}` }); });
        if (recipe.renderMode === "arrangement" && rng() < recipe.density) {
          const midi = e8Midi(rootIndex, projection, recipe);
          const tone = {
            time, duration: secondsPerStep * (step % 4 === 0 ? 2.8 : 0.82), midi,
            frequency: Core.midiToFrequency(midi, recipe.tuning), velocity: step % 4 === 0 ? 0.34 : 0.24,
            pan: ((rootIndex % 8) / 7 * 2 - 1) * recipe.width * 0.55,
            cutoff: recipe.cutoff, role: step % 4 === 0 ? "bass" : "stab", waveform: recipe.waveform,
            source: `E8 root ${rootIndex}`, rootIndex
          };
          if (tone.role === "bass") tone.frequency *= 0.5;
          addTone(buffer, tone, recipe, rng); events.push(tone);
        }
      } else {
        let label;
        let extensionQ = null;
        if (recipe.modelMode === "etq303") {
          const state = etq303[step];
          label = state.siteLabel;
          extensionQ = state.extensionQ;
        } else {
          label = etq.labels[graphIndices ? graphIndices[step] : step % 101];
        }
        const event = eventFromEtqLabel(label, recipe, time, recipe.modelMode === "etq303" ? recipe.duration / 303 * 1.8 : secondsPerStep * 0.86, step);
        if (extensionQ !== null) {
          event.midi = Core.quantizeMidi(event.midi + (extensionQ - 1) * 7, recipe.scale, 9);
          event.frequency = Core.midiToFrequency(event.midi, recipe.tuning);
          event.phase += extensionQ * Core.ETQ_INVARIANTS.delta;
          event.extensionQ = extensionQ;
          event.source = `H303 site ${label.index}, extension q=${extensionQ}`;
        }
        addTone(buffer, event, recipe, rng); events.push(event);
        if (step % 4 === 0 || (label.curvature === -2 && step % 2 === 0)) {
          const voice = label.curvature === -2 ? "snare" : "kick";
          const drum = { time, voice, velocity: event.velocity * 0.75, pan: event.pan * 0.35, source: event.source };
          addDrum(buffer, drum, recipe, rng); events.push(drum);
        }
      }
      if (step % 12 === 0) { progress(step / stepCount * 0.72); await yieldFrame(); }
    }
  }

  async function renderAmbient(buffer, recipe, roots, projection, order, etq, rng, events, progress) {
    const voiceCount = Math.max(6, Math.round(10 + recipe.density * 14));
    for (let index = 0; index < voiceCount; index += 1) {
      let event;
      if (recipe.modelMode === "etq101") {
        const label = etq.labels[(index * 7) % 101];
        event = eventFromEtqLabel(label, recipe, (index % 7) * recipe.duration / 21, recipe.duration * (0.48 + (index % 3) * 0.08), index);
        event.role = "pad";
        event.velocity *= 0.32;
      } else {
        const rootIndex = order[(index * 11) % order.length];
        const midi = e8Midi(rootIndex, projection, recipe);
        event = { time: (index % 8) * recipe.duration / 24, duration: recipe.duration * 0.55, midi, frequency: Core.midiToFrequency(midi, recipe.tuning), velocity: 0.12, pan: ((index % 7) / 6 * 2 - 1) * recipe.width, cutoff: recipe.cutoff, role: "pad", source: `E8 root ${rootIndex}` };
      }
      addTone(buffer, event, recipe, rng); events.push(event);
      progress(index / voiceCount * 0.72); await yieldFrame();
    }
  }

  function master(buffer, recipe) {
    const delaySamples = Math.round(recipe.sampleRate * (0.083 + recipe.space * 0.19));
    if (recipe.space > 0.005) {
      for (let index = delaySamples; index < buffer.length; index += 1) {
        buffer.left[index] += buffer.right[index - delaySamples] * recipe.space * 0.24;
        buffer.right[index] += buffer.left[index - delaySamples] * recipe.space * 0.24;
      }
    }
    let peak = 0;
    let previousL = 0;
    let previousR = 0;
    let dcL = 0;
    let dcR = 0;
    const fade = Math.min(Math.round(recipe.sampleRate * 0.03), Math.floor(buffer.length / 10));
    for (let index = 0; index < buffer.length; index += 1) {
      dcL = buffer.left[index] - previousL + 0.995 * dcL;
      dcR = buffer.right[index] - previousR + 0.995 * dcR;
      previousL = buffer.left[index]; previousR = buffer.right[index];
      let gain = 1;
      if (index < fade) gain *= index / Math.max(1, fade);
      if (index >= buffer.length - fade) gain *= (buffer.length - index - 1) / Math.max(1, fade);
      buffer.left[index] = Math.tanh(dcL * 0.88) * gain;
      buffer.right[index] = Math.tanh(dcR * 0.88) * gain;
      peak = Math.max(peak, Math.abs(buffer.left[index]), Math.abs(buffer.right[index]));
    }
    const normalization = peak > 0 ? 0.92 / peak : 1;
    let sumSquares = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      buffer.left[index] *= normalization;
      buffer.right[index] *= normalization;
      sumSquares += (buffer.left[index] ** 2 + buffer.right[index] ** 2) * 0.5;
    }
    return { peak: peak * normalization, rms: Math.sqrt(sumSquares / buffer.length), normalization };
  }

  async function render(recipeInput, onProgress = () => {}) {
    const recipe = { ...presetRecipe(recipeInput.presetId), ...recipeInput };
    recipe.duration = clamp(Number(recipe.duration), 0.5, 60);
    recipe.sampleRate = [22050, 44100, 48000].includes(Number(recipe.sampleRate)) ? Number(recipe.sampleRate) : 44100;
    recipe.bitDepth = Number(recipe.bitDepth) === 8 ? 8 : 16;
    recipe.channels = Number(recipe.channels) === 1 ? 1 : 2;
    const roots = Core.generateE8Roots();
    const rootValidation = Core.validateRoots(roots);
    if (!rootValidation.valid) throw new Error(rootValidation.reason);
    const projection = Core.projectRoots(roots, recipe.projection);
    const order = Core.traversal(roots, projection, recipe.traversal, recipe.seed);
    const etq = recipe.modelMode === "e8" ? null : Core.createEtq101Model(roots);
    const etq303 = recipe.modelMode === "etq303" ? Core.createEtq303States(etq) : null;
    const rng = Core.createRng(recipe.seed);
    const buffer = allocate(recipe);
    const events = [];
    onProgress(0.02, "Constructed exact E8 roots and model fixtures");
    await yieldFrame();
    if (recipe.renderMode === "slide") await renderSlide(buffer, recipe, roots, projection, rng, events, onProgress);
    else if (recipe.renderMode === "lead") await renderLead(buffer, recipe, roots, projection, order, etq, rng, events, onProgress);
    else if (recipe.renderMode === "ambient") await renderAmbient(buffer, recipe, roots, projection, order, etq, rng, events, onProgress);
    else await renderGrid(buffer, recipe, roots, projection, order, etq, etq303, rng, events, onProgress);
    onProgress(0.78, "Mastering and normalizing");
    const analysis = master(buffer, recipe);
    const wav = encodeWav(buffer, recipe);
    onProgress(0.94, "Hashing WAV receipt");
    const sha256 = await sha256Hex(wav.arrayBuffer);
    onProgress(1, "Render complete");
    return {
      recipe,
      buffer,
      events,
      wav,
      sha256,
      analysis,
      fixtures: {
        roots: rootValidation,
        uniqueProjectionValues: Core.uniqueProjectionValues(projection.values).length,
        etq: etq ? { states: 101, ambientFixedRoots: etq.fixedAmbient.length, ambientThreeCycles: etq.cyclesAmbient.length, graphEdges: etq.edgeCount, degreeSum: etq.degrees.reduce((a, b) => a + b, 0), fullQutritStates: etq303?.length || null } : null
      }
    };
  }

  function encodeWav(buffer, recipe) {
    const channels = recipe.channels;
    const bitDepth = recipe.bitDepth;
    const bytesPerSample = bitDepth / 8;
    const dataBytes = buffer.length * channels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(arrayBuffer);
    const writeText = (offset, text) => { for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index)); };
    writeText(0, "RIFF"); view.setUint32(4, 36 + dataBytes, true); writeText(8, "WAVE");
    writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, recipe.sampleRate, true);
    view.setUint32(28, recipe.sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, bitDepth, true);
    writeText(36, "data"); view.setUint32(40, dataBytes, true);
    let offset = 44;
    for (let index = 0; index < buffer.length; index += 1) {
      const samples = channels === 1 ? [(buffer.left[index] + buffer.right[index]) * 0.5] : [buffer.left[index], buffer.right[index]];
      for (const sampleValue of samples) {
        const sample = clamp(sampleValue, -1, 1);
        if (bitDepth === 8) { view.setUint8(offset, Math.round((sample + 1) * 127.5)); offset += 1; }
        else { view.setInt16(offset, Math.round(sample < 0 ? sample * 32768 : sample * 32767), true); offset += 2; }
      }
    }
    return { arrayBuffer, blob: typeof Blob !== "undefined" ? new Blob([arrayBuffer], { type: "audio/wav" }) : null, bytes: arrayBuffer.byteLength };
  }

  async function sha256Hex(arrayBuffer) {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", arrayBuffer);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    if (typeof require !== "undefined") return require("crypto").createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");
    return "unavailable";
  }

  function yieldFrame() {
    return new Promise((resolve) => typeof requestAnimationFrame === "function" ? requestAnimationFrame(resolve) : setTimeout(resolve, 0));
  }

  return Object.freeze({ PRESETS, presetRecipe, render, encodeWav, sha256Hex });
});
