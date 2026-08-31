import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const plan = require('./page-load-plan.js');

const sampleScripts = [
  'runtime/userscript-compat.js',
  'vendor/jquery-3.7.1.js',
  'features/upstream-automation.js',
  'features/raid-flow-engine.js',
  'client/core.js',
  'client/modules/network-api.js',
  'client/game-client.js',
];

test('treats official wsmud2 hosts as replacement clients', () => {
  assert.equal(plan.shouldReplaceGameClient('game.wsmud2.com'), true);
  assert.equal(plan.shouldReplaceGameClient('wsmud2.cn'), true);
  assert.equal(plan.shouldReplaceGameClient('www.wsmud2.cn'), true);
});

test('keeps wxmud1 as an overlay host so the modified SPA can boot', () => {
  assert.equal(plan.shouldReplaceGameClient('wxmud1.com'), false);
  assert.equal(plan.shouldReplaceGameClient('www.wxmud1.com'), false);
  assert.equal(plan.isSupportedGameHost('www.wxmud1.com'), true);
});

test('official hosts still receive the full replacement script list', () => {
  assert.deepEqual(
    plan.selectPageScripts('game.wsmud2.com', sampleScripts),
    sampleScripts,
  );
});

test('overlay hosts skip the bundled game client and keep plugin scripts', () => {
  assert.deepEqual(plan.selectPageScripts('www.wxmud1.com', sampleScripts), [
    'runtime/userscript-compat.js',
    'vendor/jquery-3.7.1.js',
    'features/upstream-automation.js',
    'features/raid-flow-engine.js',
  ]);
});
