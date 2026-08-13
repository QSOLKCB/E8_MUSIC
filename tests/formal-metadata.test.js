// SPDX-License-Identifier: MPL-2.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validate } = require("../tools/validate-formal-artifacts.js");
const { buildMarkdown } = require("../tools/generate-claim-matrix.js");
const { buildHashes } = require("../tools/generate-artifact-hashes.js");

test("claim manifest, matrix, pins, and frozen baseline receipts agree", () => {
  assert.deepEqual(validate(), {
    claims: 60,
    mathematical: 39,
    implementation: 9,
    nonclaims: 12
  });
});

test("human-readable claim matrix is generated from the machine-readable authority", () => {
  const root = path.join(__dirname, "..");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "formal", "claim-manifest.json"), "utf8"));
  const matrix = fs.readFileSync(path.join(root, "formal", "CLAIM_MATRIX.md"), "utf8");
  assert.equal(matrix, buildMarkdown(manifest));
});

test("formal release-candidate artifact hashes are current", () => {
  const root = path.join(__dirname, "..");
  const hashes = fs.readFileSync(path.join(root, "formal", "ARTIFACT_HASHES.sha256"), "utf8");
  assert.equal(hashes, buildHashes());
});
