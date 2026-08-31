import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { waitUntilAt } = require('./wait-until-at.js');

test('does not finish until at() reports arrival', async () => {
  let time = 0;
  let present = false;
  const sleep = async (ms) => {
    time += ms;
    if (time >= 600) present = true;
  };

  const arrived = await waitUntilAt({
    at: () => present,
    sleep,
    now: () => time,
    target: '扬州城-杂货铺',
    timeout: 2000,
    interval: 200,
    settle: 0,
  });

  assert.equal(arrived, true);
  assert.ok(time >= 600);
});

test('stops waiting after timeout when the room never matches', async () => {
  let time = 0;
  const sleep = async (ms) => {
    time += ms;
  };

  const arrived = await waitUntilAt({
    at: () => false,
    sleep,
    now: () => time,
    target: '扬州城-杂货铺',
    timeout: 1000,
    interval: 200,
    settle: 0,
  });

  assert.equal(arrived, false);
  assert.ok(time >= 1000);
});

test('adds a settle delay after arrival so room NPCs can load', async () => {
  let time = 0;
  const sleep = async (ms) => {
    time += ms;
  };

  await waitUntilAt({
    at: () => true,
    sleep,
    now: () => time,
    target: '扬州城-杂货铺',
    timeout: 2000,
    interval: 200,
    settle: 300,
  });

  assert.equal(time, 300);
});
