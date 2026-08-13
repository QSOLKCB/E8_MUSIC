// SPDX-License-Identifier: MPL-2.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildVectors } = require("../tools/generate-conformance-vectors.js");

test("canonical engine matches locked executable-conformance vectors", async () => {
  const vectorPath = path.join(__dirname, "..", "formal", "conformance-vectors.json");
  const expected = JSON.parse(fs.readFileSync(vectorPath, "utf8"));
  assert.deepEqual(await buildVectors(), expected);
});

test("conformance fixture labels its proof boundary", () => {
  const vectorPath = path.join(__dirname, "..", "formal", "conformance-vectors.json");
  const vectors = JSON.parse(fs.readFileSync(vectorPath, "utf8"));
  assert.equal(vectors.assurance_class, "executable-conformance-not-Lean-proof");
  assert.equal(vectors.baseline_commit, "d32b5620d47275ae914e31a58f023a134f02d359");
  assert.equal(vectors.large_time_origin.signal_identity_equal, true);
  assert.equal(vectors.large_time_origin.pcm_identity_equal, true);
  assert.equal(vectors.large_time_origin.source_identity_equal, false);
  assert.equal(vectors.signed_zero.negative_zero_preserved_after_parse, false);
});
