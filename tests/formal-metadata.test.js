// SPDX-License-Identifier: MPL-2.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { proofPolicySources, validate } = require("../tools/validate-formal-artifacts.js");
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

test("proof-policy inventory covers root Lean sources but excludes generated dependencies", () => {
  const root = path.join(__dirname, "..");
  const sources = proofPolicySources().map((source) => path.relative(root, source));
  assert.ok(sources.includes(path.join("formal", "lean", "E8Music.lean")));
  assert.ok(sources.includes(path.join("formal", "lean", "lakefile.lean")));
  assert.equal(sources.some((source) => source.split(path.sep).includes(".lake")), false);
});
