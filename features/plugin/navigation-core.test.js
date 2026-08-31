import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { roomMatchesTarget } = require('./navigation-core.js');

test('matches area-prefixed targets against short or colored room titles', () => {
  assert.equal(roomMatchesTarget('扬州城-杂货铺', '扬州城-杂货铺'), true);
  assert.equal(roomMatchesTarget('杂货铺', '扬州城-杂货铺'), true);
  assert.equal(
    roomMatchesTarget('扬州城-<wht>杂货铺</wht>', '扬州城-杂货铺'),
    true,
  );
  assert.equal(roomMatchesTarget('扬州城-钱庄', '住房-卧室'), false);
  assert.equal(roomMatchesTarget('', '扬州城-杂货铺'), false);
  assert.equal(roomMatchesTarget(undefined, '扬州城-杂货铺'), false);
});
