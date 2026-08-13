// SPDX-License-Identifier: MPL-2.0
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const FIXED_PATHS = [
  ".github/workflows/tests.yml",
  ".zenodo.json",
  "README.md",
  "ZENODO_METADATA.md",
  "docs/FORMALIZATION_REPORT.md",
  "docs/RELEASE_NOTES_1.1.0.md",
  "formal/CLAIM_MATRIX.md",
  "formal/baseline-receipts.json",
  "formal/claim-manifest.json",
  "formal/conformance-vectors.json",
  "package.json",
  "tests/formal-conformance.test.js",
  "tests/formal-metadata.test.js",
  "tools/generate-artifact-hashes.js",
  "tools/generate-claim-matrix.js",
  "tools/generate-conformance-vectors.js",
  "tools/validate-formal-artifacts.js"
];

function listFiles(directory, prefix) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".lake") return [];
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(absolute, relative) : [relative];
  });
}

function artifactPaths() {
  return [...new Set([
    ...FIXED_PATHS,
    ...listFiles(path.join(ROOT, "formal", "lean"), "formal/lean")
  ])].sort();
}

function buildHashes() {
  return `# SPDX-License-Identifier: MPL-2.0\n${artifactPaths().map((relativePath) => {
    const digest = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(ROOT, relativePath)))
      .digest("hex");
    return `${digest}  ${relativePath}`;
  }).join("\n")}\n`;
}

if (require.main === module) process.stdout.write(buildHashes());

module.exports = Object.freeze({ artifactPaths, buildHashes });
