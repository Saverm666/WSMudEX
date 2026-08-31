import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  ALWAYS_BLOCKED_PERFORMS,
  parsePerformIdList,
  serializePerformIdList,
  setPerformEnabled,
  listAutoPerformSkills,
  filterEnabledPerformIds,
  applyDisabledPerformsToBlocked,
} = require("./auto-perform-filter.js");

test("parses unique skill ids from mixed separators", () => {
  assert.deepEqual(parsePerformIdList("force.power, blade.shi， dodge.fo;  sword.wu  sword.wu"), [
    "force.power",
    "blade.shi",
    "dodge.fo",
    "sword.wu",
  ]);
  assert.deepEqual(parsePerformIdList(["", " force.cui ", "force.cui"]), [
    "force.cui",
  ]);
  assert.deepEqual(parsePerformIdList(""), []);
});

test("serialize round-trips disabled perform ids", () => {
  assert.equal(
    serializePerformIdList(["blade.shi", "force.power", "blade.shi", ""]),
    "blade.shi,force.power",
  );
});

test("toggling a skill off then on only keeps explicitly disabled ids", () => {
  let disabled = setPerformEnabled([], "unarmed.duo", false);
  disabled = setPerformEnabled(disabled, "force.power", false);
  assert.deepEqual(disabled, ["unarmed.duo", "force.power"]);
  disabled = setPerformEnabled(disabled, "unarmed.duo", true);
  assert.deepEqual(disabled, ["force.power"]);
});

test("lists current skills as auto-perform candidates and skips always-blocked ones", () => {
  const listed = listAutoPerformSkills(
    [
      { id: "unarmed.duo", name: "空手夺白刃" },
      { id: "force.tuoli", name: "脱离" },
      { id: "blade.shi", name: "势如破竹" },
      { id: "unarmed.duo", name: "重复" },
    ],
    "blade.shi",
  );
  assert.deepEqual(listed, [
    { id: "unarmed.duo", name: "空手夺白刃", enabled: true },
    { id: "blade.shi", name: "势如破竹", enabled: false },
  ]);
  assert.ok(ALWAYS_BLOCKED_PERFORMS.includes("force.tuoli"));
});

test("auto perform only uses currently enabled selected skills", () => {
  const skills = [
    { id: "unarmed.duo" },
    { id: "force.tuoli" },
    { id: "blade.shi" },
    { id: "dodge.fo" },
  ];
  assert.deepEqual(filterEnabledPerformIds(skills, "blade.shi,dodge.fo"), [
    "unarmed.duo",
  ]);
  assert.deepEqual(filterEnabledPerformIds(skills, []), [
    "unarmed.duo",
    "blade.shi",
    "dodge.fo",
  ]);
});

test("syncing the blacklist preserves extra runtime blocks and always-blocked skills", () => {
  const blocked = applyDisabledPerformsToBlocked(
    ["force.tuoli", "temp.script", "unarmed.duo"],
    "unarmed.duo",
    "blade.shi",
  );
  assert.deepEqual(blocked, ["force.tuoli", "temp.script", "blade.shi"]);
});
