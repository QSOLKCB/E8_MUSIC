const test = require("node:test");
const assert = require("node:assert/strict");
const AudioEngine = require("../js/audio-engine.js");

test("same engine recipe produces the same WAV bytes", async () => {
  const recipe = { presetId: "etqCurvature", duration: 0.5, sampleRate: 22050, bitDepth: 16, channels: 1, seed: "REPLAY-TEST" };
  const first = await AudioEngine.render(recipe);
  const second = await AudioEngine.render(recipe);
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(Buffer.from(first.wav.arrayBuffer), Buffer.from(second.wav.arrayBuffer));
});

test("WAV encoder writes a valid little-endian PCM header", async () => {
  const output = await AudioEngine.render({ presetId: "c64Slide", duration: 0.5, sampleRate: 22050, bitDepth: 8, channels: 1 });
  const bytes = Buffer.from(output.wav.arrayBuffer);
  assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString(), "WAVE");
  assert.equal(bytes.subarray(12, 16).toString(), "fmt ");
  assert.equal(bytes.subarray(36, 40).toString(), "data");
  assert.equal(bytes.readUInt16LE(22), 1);
  assert.equal(bytes.readUInt32LE(24), 22050);
  assert.equal(bytes.readUInt16LE(34), 8);
});

test("all shipped presets complete a short smoke render", async () => {
  for (const presetId of Object.keys(AudioEngine.PRESETS)) {
    const output = await AudioEngine.render({ presetId, duration: 0.5, sampleRate: 22050, bitDepth: 16, channels: 1 });
    assert.ok(output.wav.bytes > 44, presetId);
    assert.match(output.sha256, /^[a-f0-9]{64}$/, presetId);
    assert.ok(output.events.length > 0, presetId);
  }
});
