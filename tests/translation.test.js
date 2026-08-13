// SPDX-License-Identifier: MPL-2.0
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const integration = read('js/translation.js');
const index = read('index.html');
const readme = read('README.md');
const audit = read('TRANSLATION_AUDIT.md');
const agents = read('AGENTS.md');

test('translation integration parses and is not a startup CDN dependency', () => {
  assert.doesNotThrow(() => new Function(integration));
  assert.match(index, /<script src="js\/translation\.js"><\/script>/);
  assert.doesNotMatch(index, /cdn\.jsdelivr\.net\/gh\/xnx3\/translate/);
  assert.doesNotMatch(index, /translate\.zvo\.cn\/.*\.js/);
});

test('translate.js is commit-pinned behind explicit operator consent', () => {
  assert.match(integration, /3758b0d9946214a480bd4a2a61d10ed1a56d2109/);
  assert.match(integration, /enableButton\.addEventListener\('click'/);
  assert.match(integration, /window\.confirm\(/);
  assert.match(integration, /Only allowlisted non-mathematical interface text will be sent/);
  assert.match(integration, /document\.head\.appendChild\(script\)/);
});

test('translation is restricted to explicit non-mathematical UI roots', () => {
  const safeRootIds = [
    'musicalReceiverSection',
    'synthesisMasterSection',
    'rackActions',
    'transportPanel'
  ];

  for (const id of safeRootIds) {
    assert.match(integration, new RegExp(`['\"]${id}['\"]`));
    assert.match(index, new RegExp(`id=['\"]${id}['\"]`));
  }

  assert.match(integration, /translate\.setDocuments\(safeDocuments\)/);
  assert.match(integration, /Safe translation scope is incomplete; refusing whole-page fallback/);

  for (const mathOrProvenanceId of [
    'rootStatus',
    'modelMode',
    'etqExperiment',
    'activeModel',
    'claimBoundary',
    'fixtureReceipt',
    'eventTable'
  ]) {
    assert.doesNotMatch(integration, new RegExp(`['\"]${mathOrProvenanceId}['\"]`));
  }
});

test('operator seed remains excluded inside the safe musical-receiver root', () => {
  assert.match(integration, /const protectedIds = \['seed'\]/);
  assert.match(integration, /translate\.ignore\.class\.push\('notranslate'\)/);
});

test('Guan Leiming and upstream licensing are visibly attributed', () => {
  assert.match(index, /translate\.js by Guan Leiming \(管雷鸣\)/);
  assert.match(integration, /Guan Leiming \(管雷鸣\)/);
  assert.match(readme, /Guan Leiming \(管雷鸣\)/);
  assert.match(readme, /MIT License/);
  assert.match(audit, /Author attribution: 管雷鸣 \(Guan Leiming\)/);
});

test('repository policy records translation as an optional allowlisted network exception', () => {
  assert.match(agents, /sole network exception/);
  assert.match(agents, /explicit operator consent/);
  assert.match(agents, /never be required for rendering, recipes, receipts, or any mathematical functionality/);
  assert.match(agents, /explicitly allowlisted non-mathematical UI roots/);
});
