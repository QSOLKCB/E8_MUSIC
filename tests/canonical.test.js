// SPDX-License-Identifier: MPL-2.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

test("octave translation verifies the accepted interval after bound selection", () => {
  const profile = Canonical.PROFILES["uff-orbital-frequency-v1"];
  const minimum = profile.audibleLowHz / 2 ** (1 + 5e-13);
  const k = Canonical.chooseOctaveShift([minimum, minimum * 2], profile);
  const translated = [minimum, minimum * 2].map((frequency) => frequency * 2 ** k);
  assert.ok(Math.min(...translated) >= profile.audibleLowHz);
  assert.ok(Math.max(...translated) <= profile.audibleHighHz);
});

test("orbital profile fails closed when one octave shift cannot fit the span", () => {
  const profile = Canonical.PROFILES["uff-orbital-frequency-v1"];
  assert.throws(() => Canonical.chooseOctaveShift([1, 1000], profile), /No single integer-octave translation/);
});

test("canonical sine is profile-defined and avoids implementation-defined Math.sin", () => {
  const oscillator = Canonical.PROFILES["uff-orbital-frequency-v1"].oscillator;
  assert.equal(oscillator.function, "sine");
  assert.equal(oscillator.implementation, "qsol-deterministic-sine-poly17-v1");
  assert.equal(oscillator.coefficients.length, 9);
  for (const phase of [0, 0.1, Math.PI / 6, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 12345.6789]) {
    assert.ok(Math.abs(Canonical.deterministicSine(phase) - Math.sin(phase)) < 2e-10);
  }
  const engineSource = fs.readFileSync(path.join(__dirname, "..", "js", "canonical-engine.js"), "utf8");
  assert.equal(engineSource.includes("Math.sin("), false);
});

test("UFF canonical render is deterministic, profile-complete, and contains no musical controls", async () => {
  const first = await Canonical.render("uff-orbital-frequency-v1", uffCsv);
  const second = await Canonical.render("uff-orbital-frequency-v1", uffCsv);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.manifest.identity.source_sha256, second.manifest.identity.source_sha256);
  assert.equal(first.manifest.identity.canonical_signal_float64le_sha256, second.manifest.identity.canonical_signal_float64le_sha256);
  assert.equal(first.manifest.identity.pcm_s16le_sha256, second.manifest.identity.pcm_s16le_sha256);
  assert.equal(first.wav.bytes, 44 + first.buffer.length * 2);
  assert.equal(new DataView(first.wav.arrayBuffer).getUint32(24, true), 48000);
  assert.equal(new DataView(first.wav.arrayBuffer).getUint16(34, true), 16);
  assert.match(first.manifest.transform.frequency_interpolation, /piecewise-linear/);
  assert.equal(first.manifest.transform.oscillator.implementation, "qsol-deterministic-sine-poly17-v1");
  assert.equal(first.buffer.length, (first.events.length - 1) * 2400 + 1);
  assert.equal(first.manifest.identity.canonical_signal_float64le_sha256, "bab8f1eac0bc4d4a05b97487e901e95db76f111f4a86f31843f31cb951cbeda8");
  assert.equal(first.manifest.identity.pcm_s16le_sha256, "be2bf023db08e737ef38eac0674d742a8ea56ca93fdd7f6091ffd8d9b95c6fa4");
  assert.equal(first.sha256, "301d7c6ac51b58c8596d43a4a26b71f062283a94f92d774ddfcb2c1006e135db");
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

test("blank canonical numeric fields fail closed instead of coercing to zero", () => {
  assert.throws(() => Canonical.parseDirectSignal(`time_s,value\n0,\n1,0.5\n`), /blank/);
  assert.throws(() => Canonical.parseDirectSignal(JSON.stringify([{ time_s: 0, value: "   " }, { time_s: 1, value: 0.5 }])), /blank/);
  assert.throws(() => Canonical.parseUffCurve(`radius_kpc,velocity_kms\n1,\n2,100\n`), /blank/);
});

test("signed zero is normalized before source serialization and rendering", async () => {
  assert.equal(Canonical.canonicalJson({ value: -0 }), Canonical.canonicalJson({ value: 0 }));
  const negative = await Canonical.render("direct-unit-signal-v1", `time_s,value\n0,-0\n0.01,0\n`);
  const positive = await Canonical.render("direct-unit-signal-v1", `time_s,value\n0,0\n0.01,0\n`);
  assert.equal(Object.is(negative.source.observations[0].value, -0), false);
  assert.equal(negative.manifest.identity.source_sha256, positive.manifest.identity.source_sha256);
  assert.equal(negative.manifest.identity.canonical_signal_float64le_sha256, positive.manifest.identity.canonical_signal_float64le_sha256);
  assert.equal(negative.manifest.identity.pcm_s16le_sha256, positive.manifest.identity.pcm_s16le_sha256);
});

test("direct resampling is invariant to a large absolute time origin", async () => {
  const zero = await Canonical.render("direct-unit-signal-v1", `time_s,value\n0,0\n0.125,1\n0.25,0\n`);
  const shifted = await Canonical.render("direct-unit-signal-v1", `time_s,value\n1000000000000,0\n1000000000000.125,1\n1000000000000.25,0\n`);
  assert.equal(zero.manifest.identity.canonical_signal_float64le_sha256, shifted.manifest.identity.canonical_signal_float64le_sha256);
  assert.equal(zero.manifest.identity.pcm_s16le_sha256, shifted.manifest.identity.pcm_s16le_sha256);
  assert.notEqual(zero.manifest.identity.source_sha256, shifted.manifest.identity.source_sha256);
});

test("canonical UI routes R through canonical render and invalidates stale receipts", () => {
  const uiSource = fs.readFileSync(path.join(__dirname, "..", "js", "canonical-ui.js"), "utf8");
  assert.match(uiSource, /document\.addEventListener\("keydown"[\s\S]*stopImmediatePropagation\(\)[\s\S]*renderCanonical\(\)[\s\S]*}, true\)/);
  assert.match(uiSource, /\$\("canonicalProfile"\)\.addEventListener\("change"[\s\S]*invalidateCanonicalResult/);
  assert.match(uiSource, /\$\("canonicalSource"\)\.addEventListener\("input"[\s\S]*invalidateCanonicalResult/);
  assert.match(uiSource, /revision !== inputRevision/);
  assert.match(uiSource, /canonicalResult = null/);
  assert.match(uiSource, /canonicalDownloadWav"\)\.disabled = true/);
});

test("canonical JSON is stable across object key order", () => {
  assert.equal(Canonical.canonicalJson({ b: 2, a: 1 }), Canonical.canonicalJson({ a: 1, b: 2 }));
});
