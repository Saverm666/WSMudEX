import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const compat = require('./native-client-compat.js');

test('does not treat the binary handshake as a login cookie', () => {
  assert.equal(compat.isBinaryHandshake('#binary v1'), true);
  assert.equal(compat.isBinaryHandshake('user token'), false);
  assert.equal(
    compat.recoverCookieAfterHandshake(undefined, '#binary v1', '#binary v1'),
    undefined,
  );
  assert.equal(
    compat.recoverCookieAfterHandshake(undefined, 'alice secret', 'alice secret'),
    'alice secret',
  );
});

test('rewrites binary socket payloads to JSON so WG can parse them', () => {
  const decoded = { type: 'sc', hp: 10 };
  const msg = { data: new Uint8Array([17, 1]).buffer };
  const rewritten = compat.materializeSocketMessage(msg, () => decoded);
  assert.deepEqual(JSON.parse(rewritten.data), decoded);
});

test('leaves ordinary text payloads unchanged', () => {
  const msg = { data: '{"type":"text","msg":"ok"}' };
  assert.equal(compat.materializeSocketMessage(msg, () => null), msg);
});
