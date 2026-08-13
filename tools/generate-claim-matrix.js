// SPDX-License-Identifier: MPL-2.0
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function escapeCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function buildMarkdown(manifest) {
  let output = "<!-- SPDX-License-Identifier: MPL-2.0 -->\n";
  output += "# Canonical sonification claim matrix\n\n";
  output += `Baseline: \`${manifest.baseline_commit}\` · formalization target: \`v${manifest.formalization_version}\`\n\n`;
  output += `The governing boundary is strict: **${manifest.governing_boundary}**\n\n`;
  output += "`proved-in-lean` means an exact mathematical/reference theorem. " +
    "`checked-by-executable-test` means deterministic JavaScript/binary64/byte conformance. " +
    "`explicitly-not-claimed` marks a scientific or physical proposition outside the assurance boundary.\n\n";

  const sections = [
    ["mathematical", "Lean-proved reference claims"],
    ["implementation-conformance", "Executable implementation-conformance claims"],
    ["nonclaim", "Explicit nonclaims"]
  ];

  for (const [classification, title] of sections) {
    output += `## ${title}\n\n`;
    output += "| Claim ID | Status | Theorem / Lean source | Profile | Plain-English statement | Assumptions | Specification | JavaScript / test mapping |\n";
    output += "|---|---|---|---|---|---|---|---|\n";
    for (const claim of manifest.claims.filter((item) => item.classification === classification)) {
      const sourceLink = claim.lean_source?.startsWith("formal/")
        ? claim.lean_source.slice("formal/".length)
        : claim.lean_source;
      const theorem = claim.theorem_name
        ? `\`${escapeCell(claim.theorem_name)}\`<br>[source](${sourceLink})`
        : "—";
      const profiles = claim.profile_versions.map((profile) => `\`${escapeCell(profile)}\``).join("<br>");
      const assumptions = claim.assumptions.length
        ? claim.assumptions.map(escapeCell).join("<br>")
        : "None beyond the definition";
      const mapping = [
        claim.javascript_function ? `\`${escapeCell(claim.javascript_function)}\`` : null,
        claim.implementation_test ? escapeCell(claim.implementation_test) : null
      ].filter(Boolean).join("<br>") || "—";
      output += `| \`${claim.claim_id}\` | \`${claim.proof_status}\` | ${theorem} | ${profiles} | ${escapeCell(claim.plain_english)} | ${assumptions} | ${escapeCell(claim.specification_section)} | ${mapping} |\n`;
    }
    output += "\n";
  }

  output += "The machine-readable authority is [`claim-manifest.json`](claim-manifest.json). " +
    "The exact executable fixture is [`conformance-vectors.json`](conformance-vectors.json).\n";
  return output;
}

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "formal", "claim-manifest.json"), "utf8"));
  process.stdout.write(buildMarkdown(manifest));
}

module.exports = Object.freeze({ buildMarkdown });
