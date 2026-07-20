// SPDX-License-Identifier: MPL-2.0
const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../js/e8-core.js");

test("constructs the standard 240-root E8 coordinate realization", () => {
  const roots = Core.generateE8Roots();
  assert.deepEqual(Core.validateRoots(roots), { valid: true, integer: 112, halfInteger: 128, total: 240, rank: 8 });
  assert.equal(new Set(roots.map((root) => root.join(","))).size, 240);
});

test("golden projection reproduces 156 distinct rounded shadow values", () => {
  const projection = Core.projectRoots(Core.generateE8Roots(), "golden");
  assert.equal(Core.uniqueProjectionValues(projection.values).length, 156);
});

test("embedded D4 triality has order three and preserves the root set", () => {
  const roots = Core.generateE8Roots().map(Core.doubledRoot);
  const keys = new Set(roots.map((root) => root.join(",")));
  for (const root of roots) {
    const once = Core.applyTrialityDoubled(root);
    const twice = Core.applyTrialityDoubled(once);
    const thrice = Core.applyTrialityDoubled(twice);
    assert.ok(keys.has(once.join(",")));
    assert.deepEqual(thrice, root);
  }
});

test("ETQ-101 selector and selected graph match the v2 fixtures", () => {
  const model = Core.createEtq101Model();
  assert.equal(model.fixedAmbient.length, 12);
  assert.equal(model.cyclesAmbient.length, 76);
  assert.equal(model.labels.length, 101);
  assert.equal(model.edgeCount, 1687);
  assert.equal(model.degrees.reduce((sum, degree) => sum + degree, 0), 3374);
  const distribution = Object.fromEntries([...new Set(model.degrees)].sort((a, b) => a - b).map((degree) => [degree, model.degrees.filter((value) => value === degree).length]));
  assert.deepEqual(distribution, { 22: 12, 23: 6, 30: 12, 32: 24, 33: 12, 34: 6, 40: 6, 42: 12, 43: 6, 44: 3, 55: 2 });
  assert.equal(model.labels.reduce((sum, label) => sum + label.degreePotentialNumerator, 0), 0);
});

test("ETQ symbolic codebook is a bijection over notes 13 through 113", () => {
  const labels = Core.createEtq101Model().labels;
  const notes = labels.map((label) => label.midi);
  assert.equal(new Set(notes).size, 101);
  assert.deepEqual(notes.slice().sort((a, b) => a - b), Array.from({ length: 101 }, (_, index) => index + 13));
  assert.equal(labels[0].midi, 13);
  assert.equal(labels[1].midi, 113);
  assert.equal(labels.find((label) => label.m === 0 && label.q === 0).midi, 14);
  assert.equal(labels.find((label) => label.m === 32 && label.q === 2).midi, 112);
});

test("optional H303 extension contains 101 × 3 distinct components", () => {
  const states = Core.createEtq303States();
  assert.equal(states.length, 303);
  assert.equal(new Set(states.map((state) => `${state.site}:${state.extensionQ}`)).size, 303);
  assert.equal(states.at(-1).index, 302);
});
