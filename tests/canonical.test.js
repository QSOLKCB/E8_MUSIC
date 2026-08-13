// SPDX-License-Identifier: MPL-2.0
const test = require("node:test");
const assert = require("node:assert/strict");
const Canonical = require("../js/canonical-engine.js");

const uffCsv = `radius_kpc,velocity_kms
0.5,90
1,125
2,155
4,180
8,195
16,205
`;

test("orbital frequency uses V/(2*pi*R) with declared units", () => {
  const frequency = Canonical.orbitalFrequencyHz(1, 200);
  const expected = 200000 / (2 * Math.PI * Canonical.KPC_METERS);
  assert.ok(Math.abs(frequency - expected) <= expected * 1e-15);
});

test("one integer octave translation preserves every frequency ratio", () => {
  const rows = Canonical.parseUffCurve(uffCsv);
  const physical = rows.map((row) => Canonical.orbitalFrequencyHz(row.radius_kpc, row.velocity_kms));
  const profile = Canonical.PROFILES["uff-orbital-frequency-v1"];
  const k = Canonical.chooseOctaveShift(physical, profile);
  assert.equal(Number.isInteger(k), true);
  const translated = physical.map((frequency) => frequency * 2 ** k);
  assert.ok(Math.min(...translated) >= profile.audibleLowHz);
  assert.ok(Math.max(...translated) <= profile.audibleHighHz);
  for (let index = 1; index < physical.length; index += 1) {
    const sourceRatio = physical[index] / physical[0];
    const audioRatio = translated[index] / translated[0];
    assert.ok(Math.abs(sourceRatio - audioRatio) <= Number.EPSILON * Math.max(1, Math.abs(sourceRatio)) * 2);
  }
});

test("orbital profile fails closed when one octave shift cannot fit the span", () => {
  const profile = Canonical.PROFILES["uff-orbital-frequency-v1"];
  assert.throws(() => Canonical.chooseOctaveShift([1, 1000], profile), /No single integer-octave translation/);
});

test("UFF canonical render is deterministic and contains no musical controls", async () => {
  const first = await Canonical.render("uff-orbital-frequency-v1", uffCsv);
  const second = await Canonical.render("uff-orbital-frequency-v1", uffCsv);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.manifest.identity.source_sha256, second.manifest.identity.source_sha256);
  assert.equal(first.manifest.identity.canonical_signal_float64le_sha256, second.manifest.identity.canonical_signal_float64le_sha256);
  assert.equal(first.manifest.identity.pcm_s16le_sha256, second.manifest.identity.pcm_s16le_sha256);
  assert.equal(first.wav.bytes, 44 + first.buffer.length * 2);
  assert.equal(new DataView(first.wav.arrayBuffer).getUint32(24, true), 48000);
  assert.equal(new DataView(first.wav.arrayBuffer).getUint16(34, true), 16);
  const manifestText = Canonical.canonicalJson(first.manifest);
  for (const forbidden of ["bpm", "midi", "a4", "temperament", "seed", "waveform", "mastering_gain"]) {
    assert.equal(manifestText.includes(`\"${forbidden}\"`), false);
  }
  assert.ok(first.derived.frequencyRatioError <= 1e-12);
});

test("direct unit signal is resampled without normalization", async () => {
  const source = `time_s,value
0.000,0
0.010,1
0.020,-1
`;
  const result = await Canonical.render("direct-unit-signal-v1", source);
  assert.equal(result.buffer.length, 961);
  assert.equal(result.buffer.left[0], 0);
  assert.ok(result.buffer.left[480] > 0.999999999);
  assert.ok(result.buffer.left[result.buffer.length - 1] < -0.999999999);
  assert.equal(result.manifest.transform.additions.startsWith("none"), true);
});

test("direct unit signal rejects data that would require authored normalization", () => {
  const source = `time_s,value
0,0
1,1.1
`;
  assert.throws(() => Canonical.parseDirectSignal(source), /must already lie in \[-1,1\]/);
});

test("canonical JSON is stable across object key order", () => {
  assert.equal(Canonical.canonicalJson({ b: 2, a: 1 }), Canonical.canonicalJson({ a: 1, b: 2 }));
});
