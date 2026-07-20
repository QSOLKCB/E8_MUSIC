(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.E8Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PHI = (1 + Math.sqrt(5)) / 2;
  const ENGINE_VERSION = "1.0.0";
  const ROOT_COUNTS = Object.freeze({ total: 240, integer: 112, halfInteger: 128, rank: 8 });
  const SCALE_INTERVALS = Object.freeze({
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    pentatonic: [0, 3, 5, 7, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    wholeTone: [0, 2, 4, 6, 8, 10]
  });
  const TRIALITY_MATRIX_NUMERATOR = Object.freeze([
    Object.freeze([1, 1, 1, 1]),
    Object.freeze([1, 1, -1, -1]),
    Object.freeze([1, -1, 1, -1]),
    Object.freeze([-1, 1, 1, -1])
  ]);
  const ETQ_INVARIANTS = Object.freeze({
    selectedStates: 101,
    fixedSelected: 2,
    qutritOrbits: 33,
    qutritStates: 99,
    fullQutritStates: 303,
    ambientRoots: 240,
    fixedAmbientRoots: 12,
    ambientThreeCycles: 76,
    graphEdges: 1687,
    degreeSum: 3374,
    degreeMin: 22,
    degreeMax: 55,
    degreePotentialScale: 2181,
    scl: Object.freeze([1, -2, 1]),
    theta: Math.PI / 2,
    delta: (2 * Math.PI) / 303
  });

  function generateE8Roots() {
    const roots = [];
    for (let i = 0; i < 8; i += 1) {
      for (let j = i + 1; j < 8; j += 1) {
        for (const si of [-1, 1]) {
          for (const sj of [-1, 1]) {
            const vector = new Array(8).fill(0);
            vector[i] = si;
            vector[j] = sj;
            roots.push(vector);
          }
        }
      }
    }

    for (let mask = 0; mask < 256; mask += 1) {
      let minusCount = 0;
      const vector = [];
      for (let coordinate = 0; coordinate < 8; coordinate += 1) {
        const negative = (mask & (1 << coordinate)) !== 0;
        if (negative) minusCount += 1;
        vector.push(negative ? -0.5 : 0.5);
      }
      if (minusCount % 2 === 0) roots.push(vector);
    }
    return roots;
  }

  function validateRoots(roots) {
    if (!Array.isArray(roots) || roots.length !== ROOT_COUNTS.total) {
      return { valid: false, reason: `Expected 240 roots; received ${roots?.length ?? 0}.` };
    }
    let integer = 0;
    let halfInteger = 0;
    for (const root of roots) {
      if (!Array.isArray(root) || root.length !== 8) return { valid: false, reason: "Every root must have eight coordinates." };
      const normSquared = root.reduce((sum, value) => sum + value * value, 0);
      if (Math.abs(normSquared - 2) > 1e-12) return { valid: false, reason: "Every root must have squared norm 2." };
      if (root.some((value) => Math.abs(value) === 1)) integer += 1;
      else halfInteger += 1;
    }
    if (integer !== 112 || halfInteger !== 128) return { valid: false, reason: "Root-family cardinalities are invalid." };
    return { valid: true, integer, halfInteger, total: roots.length, rank: 8 };
  }

  function normalizeVector(values) {
    const length = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    return values.map((value) => value / length);
  }

  function projectionVector(name) {
    switch (name) {
      case "fibonacci":
        return normalizeVector([1, 1, 2, 3, 5, 8, 13, 21]);
      case "prime":
        return normalizeVector([2, 3, 5, 7, 11, 13, 17, 19].map(Math.sqrt));
      case "axis":
        return [1, 0, 0, 0, 0, 0, 0, 0];
      case "balanced":
        return normalizeVector([1, -1, 2, -2, 3, -3, 5, -5]);
      case "golden":
      default:
        return normalizeVector(Array.from({ length: 8 }, (_, index) => PHI ** (-index)));
    }
  }

  function dot(a, b) {
    let sum = 0;
    for (let index = 0; index < a.length; index += 1) sum += a[index] * b[index];
    return sum;
  }

  function projectRoots(roots, projectionName = "golden") {
    const direction = projectionVector(projectionName);
    const values = roots.map((root) => dot(root, direction));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return {
      direction,
      values,
      normalized: values.map((value) => (value - min) / range),
      min,
      max
    };
  }

  function uniqueProjectionValues(values, decimals = 10) {
    const factor = 10 ** decimals;
    return Array.from(new Set(values.map((value) => Math.round(value * factor) / factor))).sort((a, b) => a - b);
  }

  function compareRoots(a, b) {
    for (let index = 0; index < 8; index += 1) {
      if (a[index] !== b[index]) return a[index] - b[index];
    }
    return 0;
  }

  function hashSeed(input) {
    const text = String(input ?? "E8");
    let hash = 2166136261 >>> 0;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 0x8e8e8e8e;
  }

  function createRng(seed) {
    let state = hashSeed(seed);
    return function random() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function traversal(roots, projection, mode = "projected", seed = "E8") {
    const indices = roots.map((_, index) => index);
    if (mode === "lexicographic") {
      return indices.sort((a, b) => compareRoots(roots[a], roots[b]));
    }
    if (mode === "interleaved") {
      const integer = indices.filter((index) => roots[index].some((value) => Math.abs(value) === 1));
      const half = indices.filter((index) => roots[index].every((value) => Math.abs(value) === 0.5));
      const result = [];
      for (let index = 0; index < Math.max(integer.length, half.length); index += 1) {
        if (index < integer.length) result.push(integer[index]);
        if (index < half.length) result.push(half[index]);
      }
      return result;
    }
    if (mode === "seeded") {
      const rng = createRng(seed);
      for (let index = indices.length - 1; index > 0; index -= 1) {
        const target = Math.floor(rng() * (index + 1));
        [indices[index], indices[target]] = [indices[target], indices[index]];
      }
      return indices;
    }
    return indices.sort((a, b) => projection.values[a] - projection.values[b] || compareRoots(roots[a], roots[b]));
  }

  function quantizeMidi(midi, scaleName = "minor", tonic = 0) {
    const scale = SCALE_INTERVALS[scaleName] || SCALE_INTERVALS.minor;
    const rounded = Math.round(midi);
    let best = rounded;
    let distance = Infinity;
    for (let candidate = rounded - 12; candidate <= rounded + 12; candidate += 1) {
      const pitchClass = ((candidate - tonic) % 12 + 12) % 12;
      if (scale.includes(pitchClass)) {
        const currentDistance = Math.abs(candidate - midi);
        if (currentDistance < distance || (currentDistance === distance && candidate < best)) {
          best = candidate;
          distance = currentDistance;
        }
      }
    }
    return best;
  }

  function midiToFrequency(midi, tuning = 432) {
    return tuning * 2 ** ((midi - 69) / 12);
  }

  function rootFamily(root) {
    return root.some((value) => Math.abs(value) === 1) ? "integer" : "half-integer";
  }

  function doubledRoot(root) {
    return root.map((value) => Math.round(value * 2));
  }

  function applyTrialityDoubled(root) {
    const output = new Array(8).fill(0);
    for (let block = 0; block < 2; block += 1) {
      const offset = block * 4;
      for (let row = 0; row < 4; row += 1) {
        let numerator = 0;
        for (let column = 0; column < 4; column += 1) {
          numerator += TRIALITY_MATRIX_NUMERATOR[row][column] * root[offset + column];
        }
        if (numerator % 2 !== 0) throw new Error("Triality left the doubled-root integer domain.");
        output[offset + row] = numerator / 2;
      }
    }
    return output;
  }

  function rootKey(root) {
    return root.join(",");
  }

  function compareIntegerRoots(a, b) {
    for (let index = 0; index < 8; index += 1) {
      if (a[index] !== b[index]) return a[index] - b[index];
    }
    return 0;
  }

  function equalRoots(a, b) {
    return a.every((value, index) => value === b[index]);
  }

  function createEtq101Model(roots = generateE8Roots()) {
    const doubled = roots.map(doubledRoot);
    const rootSet = new Set(doubled.map(rootKey));
    const seen = new Set();
    const fixed = [];
    const cycles = [];

    for (const root of doubled) {
      if (seen.has(rootKey(root))) continue;
      const tau1 = applyTrialityDoubled(root);
      const tau2 = applyTrialityDoubled(tau1);
      const tau3 = applyTrialityDoubled(tau2);
      if (!rootSet.has(rootKey(tau1)) || !rootSet.has(rootKey(tau2)) || !equalRoots(tau3, root)) {
        throw new Error("Embedded D4 triality failed the E8 root-set invariant.");
      }
      if (equalRoots(root, tau1)) {
        fixed.push(root);
        seen.add(rootKey(root));
      } else {
        const orbit = [root, tau1, tau2];
        orbit.forEach((entry) => seen.add(rootKey(entry)));
        const representative = orbit.slice().sort(compareIntegerRoots)[0];
        cycles.push({ representative, orbit: [representative, applyTrialityDoubled(representative), applyTrialityDoubled(applyTrialityDoubled(representative))] });
      }
    }

    fixed.sort(compareIntegerRoots);
    cycles.sort((a, b) => compareIntegerRoots(a.representative, b.representative));
    if (fixed.length !== 12 || cycles.length !== 76) throw new Error("Triality orbit decomposition must be 12 + 76(3).");

    const selectedDoubled = [fixed[0], fixed[1]];
    const labels = [
      { index: 0, kind: "singlet", singlet: 0, midi: 13 },
      { index: 1, kind: "singlet", singlet: 1, midi: 113 }
    ];
    for (let m = 0; m < 33; m += 1) {
      for (let q = 0; q < 3; q += 1) {
        selectedDoubled.push(cycles[m].orbit[q]);
        labels.push({ index: 2 + 3 * m + q, kind: "qutrit", m, q, midi: 14 + 33 * q + m, curvature: ETQ_INVARIANTS.scl[q] });
      }
    }

    const adjacency = Array.from({ length: 101 }, () => new Uint8Array(101));
    const degrees = new Array(101).fill(0);
    let edgeCount = 0;
    for (let a = 0; a < 101; a += 1) {
      for (let b = a + 1; b < 101; b += 1) {
        let doubledDot = 0;
        for (let coordinate = 0; coordinate < 8; coordinate += 1) doubledDot += selectedDoubled[a][coordinate] * selectedDoubled[b][coordinate];
        if (doubledDot === 4) {
          adjacency[a][b] = 1;
          adjacency[b][a] = 1;
          degrees[a] += 1;
          degrees[b] += 1;
          edgeCount += 1;
        }
      }
    }

    const degreeSum = degrees.reduce((sum, degree) => sum + degree, 0);
    const degreeMin = Math.min(...degrees);
    const degreeMax = Math.max(...degrees);
    if (edgeCount !== 1687 || degreeSum !== 3374 || degreeMin !== 22 || degreeMax !== 55) {
      throw new Error(`ETQ-101 graph fixture mismatch (${edgeCount} edges, degree sum ${degreeSum}, range ${degreeMin}-${degreeMax}).`);
    }

    labels.forEach((label, index) => {
      label.degree = degrees[index];
      label.degreePotentialNumerator = 101 * degrees[index] - 3374;
      label.degreePotential = label.degreePotentialNumerator / 2181;
      label.root = selectedDoubled[index].map((value) => value / 2);
    });

    return {
      invariants: ETQ_INVARIANTS,
      fixedAmbient: fixed,
      cyclesAmbient: cycles,
      selectedDoubled,
      labels,
      adjacency,
      degrees,
      edgeCount
    };
  }

  function createEtq303States(etq101 = createEtq101Model()) {
    const states = [];
    for (let site = 0; site < 101; site += 1) {
      for (let extensionQ = 0; extensionQ < 3; extensionQ += 1) {
        states.push({
          index: site * 3 + extensionQ,
          site,
          extensionQ,
          siteLabel: etq101.labels[site],
          deltaPhase: (site * 3 + extensionQ) * ETQ_INVARIANTS.delta
        });
      }
    }
    return states;
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((output, key) => {
        output[key] = canonicalize(value[key]);
        return output;
      }, {});
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(canonicalize(value), null, 2);
  }

  return Object.freeze({
    ENGINE_VERSION,
    PHI,
    ROOT_COUNTS,
    SCALE_INTERVALS,
    TRIALITY_MATRIX_NUMERATOR,
    ETQ_INVARIANTS,
    generateE8Roots,
    validateRoots,
    projectionVector,
    projectRoots,
    uniqueProjectionValues,
    traversal,
    hashSeed,
    createRng,
    quantizeMidi,
    midiToFrequency,
    rootFamily,
    doubledRoot,
    applyTrialityDoubled,
    createEtq101Model,
    createEtq303States,
    canonicalJson
  });
});
