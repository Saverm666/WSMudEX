import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  normalizeLoadoutGroup,
  runAfterConfiguredLoadout,
} = require("./travel-equipment-option.js");

test("only the three native loadout groups are accepted", () => {
  assert.equal(normalizeLoadoutGroup(0), 0);
  assert.equal(normalizeLoadoutGroup("1"), 1);
  assert.equal(normalizeLoadoutGroup(2), 2);
  assert.equal(normalizeLoadoutGroup(""), null);
  assert.equal(normalizeLoadoutGroup(-1), null);
  assert.equal(normalizeLoadoutGroup(3), null);
});

test("an action without a loadout runs immediately", () => {
  const calls = [];
  const prepared = runAfterConfiguredLoadout(
    null,
    () => calls.push("switch"),
    () => calls.push("action"),
  );
  assert.equal(prepared, false);
  assert.deepEqual(calls, ["action"]);
});

test("a configured action switches its group before continuing", () => {
  const calls = [];
  const prepared = runAfterConfiguredLoadout(
    2,
    (group, done) => {
      calls.push("eqgroup " + group);
      done();
    },
    () => calls.push("action"),
  );
  assert.equal(prepared, true);
  assert.deepEqual(calls, ["eqgroup 2", "action"]);
});
