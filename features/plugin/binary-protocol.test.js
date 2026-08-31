import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const protocol = require('./binary-protocol.js');

function writeVarUint(value) {
  const bytes = [];
  let remaining = value;
  while (true) {
    let byte = remaining & 127;
    remaining = Math.floor(remaining / 128);
    if (remaining) byte |= 128;
    bytes.push(byte);
    if (!remaining) break;
  }
  return bytes;
}

function writeZigZag(value) {
  const zigzag = value >= 0 ? value * 2 : -value * 2 - 1;
  return writeVarUint(zigzag);
}

function encodeScStatus(fields) {
  const fieldOrder = ['id', 'hp', 'max_hp', 'mp', 'max_mp', 'damage'];
  const entries = Object.entries(fields);
  const body = [17, ...writeVarUint(1), ...writeVarUint(entries.length)];
  for (const [name, value] of entries) {
    const index = fieldOrder.indexOf(name);
    if (index < 0) throw new Error(`unknown sc field ${name}`);
    body.push(...writeVarUint(index + 1), 3, ...writeZigZag(value));
  }
  return Uint8Array.from(body);
}

test('decodes wxmud1 binary sc status messages into typed objects', () => {
  const bytes = encodeScStatus({ hp: 321, max_hp: 654 });
  assert.deepEqual(protocol.decodeBinaryMessage(bytes), {
    type: 'sc',
    hp: 321,
    max_hp: 654,
  });
});

test('returns null for packets that are not binary v1', () => {
  assert.equal(protocol.decodeBinaryMessage(new Uint8Array([1, 2, 3])), null);
  assert.equal(protocol.decodeBinaryMessage('{"type":"sc"}'), null);
});
