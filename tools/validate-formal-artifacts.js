// SPDX-License-Identifier: MPL-2.0
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const REQUIRED_CLAIM_FIELDS = [
  "claim_id",
  "theorem_name",
  "lean_source",
  "plain_english",
  "assumptions",
  "proof_status",
  "profile_versions",
  "specification_section",
  "javascript_function",
  "implementation_test",
  "classification"
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256(relativePath) {
  return crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function leanSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return leanSources(entryPath);
    return entry.name.endsWith(".lean") ? [entryPath] : [];
  });
}

function validate() {
  const manifest = readJson("formal/claim-manifest.json");
  const vectors = readJson("formal/conformance-vectors.json");
  const receipts = readJson("formal/baseline-receipts.json");
  const matrix = fs.readFileSync(path.join(ROOT, "formal", "CLAIM_MATRIX.md"), "utf8");
  const lakeManifest = readJson("formal/lean/lake-manifest.json");

  if (manifest.baseline_commit !== receipts.baseline_commit ||
      manifest.baseline_commit !== vectors.baseline_commit) {
    throw new Error("Formal artifacts disagree on the baseline commit.");
  }

  const identifiers = new Set();
  const mappedTheorems = new Set();
  for (const claim of manifest.claims) {
    for (const field of REQUIRED_CLAIM_FIELDS) {
      if (!Object.hasOwn(claim, field)) throw new Error(`${claim.claim_id || "claim"} lacks ${field}.`);
    }
    if (identifiers.has(claim.claim_id)) throw new Error(`Duplicate claim ID: ${claim.claim_id}`);
    identifiers.add(claim.claim_id);
    if (!matrix.includes(`\`${claim.claim_id}\``)) throw new Error(`Claim matrix omits ${claim.claim_id}.`);

    if (claim.classification === "mathematical") {
      if (claim.proof_status !== "proved-in-lean" || !claim.theorem_name || !claim.lean_source) {
        throw new Error(`${claim.claim_id} is not mapped to a Lean theorem.`);
      }
      const source = fs.readFileSync(path.join(ROOT, claim.lean_source), "utf8");
      const theorem = new RegExp(`\\btheorem\\s+${escapeRegExp(claim.theorem_name)}\\b`);
      if (!theorem.test(source)) throw new Error(`${claim.claim_id} theorem ${claim.theorem_name} was not found.`);
      mappedTheorems.add(claim.theorem_name);
    } else if (claim.classification === "implementation-conformance") {
      if (claim.proof_status !== "checked-by-executable-test" || !claim.implementation_test) {
        throw new Error(`${claim.claim_id} is not mapped to an executable test.`);
      }
    } else if (claim.classification === "nonclaim") {
      if (claim.proof_status !== "explicitly-not-claimed") {
        throw new Error(`${claim.claim_id} is not explicitly classified as a nonclaim.`);
      }
    } else {
      throw new Error(`Unknown claim classification: ${claim.classification}`);
    }
  }

  const forbiddenProofHoles = ["sor" + "ry", "ad" + "mit", "ax" + "iom"];
  const declaredTheorems = new Set();
  for (const sourcePath of leanSources(path.join(ROOT, "formal", "lean", "E8Music"))) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const theoremPattern = /(?:^|\n)(?:@\[[^\n]*\]\s*)?theorem\s+([A-Za-z0-9_']+)/g;
    for (const match of source.matchAll(theoremPattern)) declaredTheorems.add(match[1]);
    for (const token of forbiddenProofHoles) {
      if (new RegExp(`\\b${token}\\b`).test(source)) {
        throw new Error(`Unresolved proof escape in ${path.relative(ROOT, sourcePath)}.`);
      }
    }
  }
  for (const theorem of declaredTheorems) {
    if (!mappedTheorems.has(theorem)) throw new Error(`Claim manifest omits Lean theorem ${theorem}.`);
  }
  if (mappedTheorems.size !== declaredTheorems.size) {
    throw new Error("The mapped and declared Lean theorem inventories differ.");
  }

  for (const [file, expected] of Object.entries(receipts.files)) {
    const actual = sha256(file);
    if (actual !== expected) throw new Error(`Frozen baseline file changed: ${file}.`);
  }

  const mathlib = lakeManifest.packages.find((dependency) => dependency.name === "mathlib");
  if (!mathlib || mathlib.rev !== "c44e0c8ee63ca166450922a373c7409c5d26b00b") {
    throw new Error("mathlib is not pinned to the reviewed v4.19.0 revision.");
  }

  return {
    claims: manifest.claims.length,
    mathematical: manifest.claims.filter((claim) => claim.classification === "mathematical").length,
    implementation: manifest.claims.filter((claim) => claim.classification === "implementation-conformance").length,
    nonclaims: manifest.claims.filter((claim) => claim.classification === "nonclaim").length
  };
}

if (require.main === module) {
  try {
    const result = validate();
    process.stdout.write(`formal artifact validation passed: ${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({ validate });
