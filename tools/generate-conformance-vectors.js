// SPDX-License-Identifier: MPL-2.0
"use strict";

const Canonical = require("../js/canonical-engine.js");

const BASELINE_COMMIT = "d32b5620d47275ae914e31a58f023a134f02d359";

const UFF_SOURCE = `radius_kpc,velocity_kms
0.5,90
1,125
2,155
4,180
8,195
16,205
`;

const DIRECT_SOURCE = `time_s,value
0,-0.25
0.001,0.75
`;

const LARGE_ORIGIN_SOURCE = `time_s,value
1000000000000,0
1000000000000.125,1
1000000000000.25,0
`;

const ZERO_ORIGIN_SOURCE = `time_s,value
0,0
0.125,1
0.25,0
`;

function float64Hex(value) {
  const bytes = new ArrayBuffer(8);
  new DataView(bytes).setFloat64(0, value, false);
  return `0x${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function identity(result) {
  return {
    source_sha256: result.manifest.identity.source_sha256,
    canonical_signal_float64le_sha256: result.manifest.identity.canonical_signal_float64le_sha256,
    pcm_s16le_sha256: result.manifest.identity.pcm_s16le_sha256,
    wav_sha256: result.manifest.identity.wav_sha256
  };
}

async function buildVectors() {
  const profile = Canonical.PROFILES["uff-orbital-frequency-v1"];
  const rows = Canonical.parseUffCurve(UFF_SOURCE);
  const physical = rows.map((row) => Canonical.orbitalFrequencyHz(row.radius_kpc, row.velocity_kms));
  const octaveShift = Canonical.chooseOctaveShift(physical, profile);
  const factor = 2 ** octaveShift;
  const translated = physical.map((frequency) => frequency * factor);
  const uff = await Canonical.render("uff-orbital-frequency-v1", UFF_SOURCE);

  const boundaryMinimum = profile.audibleLowHz / 2 ** (1 + 5e-13);
  const boundaryFrequencies = [boundaryMinimum, boundaryMinimum * 2];
  const boundaryShift = Canonical.chooseOctaveShift(boundaryFrequencies, profile);
  const boundaryTranslated = boundaryFrequencies.map((frequency) => frequency * 2 ** boundaryShift);

  let failClosedMessage = null;
  try {
    Canonical.chooseOctaveShift([1, 1000], profile);
  } catch (error) {
    failClosedMessage = error.message;
  }

  const direct = await Canonical.render("direct-unit-signal-v1", DIRECT_SOURCE);
  const zeroOrigin = await Canonical.render("direct-unit-signal-v1", ZERO_ORIGIN_SOURCE);
  const largeOrigin = await Canonical.render("direct-unit-signal-v1", LARGE_ORIGIN_SOURCE);
  const negativeZero = await Canonical.render(
    "direct-unit-signal-v1",
    "time_s,value\n0,-0\n0.01,0\n"
  );
  const positiveZero = await Canonical.render(
    "direct-unit-signal-v1",
    "time_s,value\n0,0\n0.01,0\n"
  );

  return {
    schema: "qsol.e8-music.formal-conformance-vectors/v1",
    license: "MPL-2.0",
    assurance_class: "executable-conformance-not-Lean-proof",
    baseline_commit: BASELINE_COMMIT,
    engine_version: Canonical.ENGINE_VERSION,
    profiles: ["uff-orbital-frequency-v1", "direct-unit-signal-v1"],
    numerical_boundary: "ECMAScript Number binary64 and deterministic byte serialization",
    deterministic_sine_receiver: {
      implementation: profile.oscillator.implementation,
      coefficient_float64_bits: profile.oscillator.coefficients.map(float64Hex),
      evaluations: [0, 0.1, Math.PI / 6, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 12345.6789]
        .map((phase) => ({ phase_float64: float64Hex(phase), result_float64: float64Hex(Canonical.deterministicSine(phase)) }))
    },
    orbital_frequency: {
      radius_kpc: 1,
      velocity_kms: 200,
      result_float64: float64Hex(Canonical.orbitalFrequencyHz(1, 200))
    },
    octave_translation: {
      exponent_k: octaveShift,
      factor_float64: float64Hex(factor),
      physical_frequency_float64: physical.map(float64Hex),
      translated_frequency_float64: translated.map(float64Hex),
      ratio_checks: physical.slice(1).map((frequency, index) => ({
        source_ratio_float64: float64Hex(frequency / physical[0]),
        translated_ratio_float64: float64Hex(translated[index + 1] / translated[0])
      }))
    },
    boundary_admissibility: {
      exponent_k: boundaryShift,
      source_frequency_float64: boundaryFrequencies.map(float64Hex),
      translated_frequency_float64: boundaryTranslated.map(float64Hex),
      inclusive_low_hz: profile.audibleLowHz,
      inclusive_high_hz: profile.audibleHighHz
    },
    fail_closed_span: {
      source_frequency_float64: [1, 1000].map(float64Hex),
      error: failClosedMessage
    },
    uff_complete_render: {
      frame_count: uff.buffer.length,
      expected_frame_count: (rows.length - 1) * 2400 + 1,
      first_signal_float64: float64Hex(uff.buffer.left[0]),
      final_signal_float64: float64Hex(uff.buffer.left[uff.buffer.length - 1]),
      identity: identity(uff)
    },
    direct_audification: {
      frame_count: direct.buffer.length,
      first_signal_float64: float64Hex(direct.buffer.left[0]),
      final_signal_float64: float64Hex(direct.buffer.left[direct.buffer.length - 1]),
      identity: identity(direct)
    },
    large_time_origin: {
      zero_origin_identity: identity(zeroOrigin),
      large_origin_identity: identity(largeOrigin),
      signal_identity_equal: zeroOrigin.manifest.identity.canonical_signal_float64le_sha256 ===
        largeOrigin.manifest.identity.canonical_signal_float64le_sha256,
      pcm_identity_equal: zeroOrigin.manifest.identity.pcm_s16le_sha256 ===
        largeOrigin.manifest.identity.pcm_s16le_sha256,
      source_identity_equal: zeroOrigin.manifest.identity.source_sha256 ===
        largeOrigin.manifest.identity.source_sha256
    },
    signed_zero: {
      canonical_json_negative_zero: Canonical.canonicalJson({ value: -0 }),
      canonical_json_positive_zero: Canonical.canonicalJson({ value: 0 }),
      negative_zero_preserved_after_parse: Object.is(negativeZero.source.observations[0].value, -0),
      negative_identity: identity(negativeZero),
      positive_identity: identity(positiveZero)
    }
  };
}

if (require.main === module) {
  buildVectors().then((vectors) => {
    process.stdout.write(`${JSON.stringify(vectors, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ buildVectors, float64Hex });
