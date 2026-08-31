import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const sync = require('./page-settings-sync.js');

function memoryStorage(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)]),
  );
  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    dump() {
      return Object.fromEntries(data);
    },
  };
}

test('hydrates missing page keys from the extension snapshot and keeps local values', () => {
  const page = memoryStorage({
    extends: '[{"name":"local"}]',
  });
  const written = sync.hydrateMissingKeys(page, {
    extends: '[{"name":"cloud"}]',
    WG_plugin_feature_flags_v1: '{"chatDrawer":false}',
    'role_zml': '[]',
  });
  assert.equal(written, 2);
  assert.equal(page.getItem('extends'), '[{"name":"local"}]');
  assert.equal(page.getItem('WG_plugin_feature_flags_v1'), '{"chatDrawer":false}');
  assert.equal(page.getItem('role_zml'), '[]');
});

test('reads raw localStorage entries for a last-write snapshot', () => {
  const page = memoryStorage({
    extends: '[{"name":"挂机","content":"#wg work"}]',
    plain: 'text',
  });
  assert.deepEqual(sync.readPageStorage(page), {
    extends: '[{"name":"挂机","content":"#wg work"}]',
    plain: 'text',
  });
});

test('does not expose any action-button synthesis API', () => {
  assert.equal(sync.mergeRecommendedNativeActions, undefined);
  assert.equal(sync.recommendedNativeActions, undefined);
});
