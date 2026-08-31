import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  shouldPrepareTravelEquipment,
  runAfterOptionalTravelEquipment,
} = require("./travel-equipment-option.js");

test("travel equipment stays on when the flag is missing", () => {
  assert.equal(shouldPrepareTravelEquipment(), true);
  assert.equal(shouldPrepareTravelEquipment({}), true);
  assert.equal(
    shouldPrepareTravelEquipment({ smartEquipmentOnTravel: true }),
    true,
  );
});

test("travel equipment can be turned off without changing other flags", () => {
  assert.equal(
    shouldPrepareTravelEquipment({
      mapAutoRoute: true,
      smartEquipmentOnTravel: false,
    }),
    false,
  );
});

test("disabled travel equipment skips prepare and still runs the original action", () => {
  const calls = [];
  const prepared = runAfterOptionalTravelEquipment(
    false,
    function (done) {
      calls.push("prepare");
      done();
    },
    function () {
      calls.push("travel");
    },
  );
  assert.equal(prepared, false);
  assert.deepEqual(calls, ["travel"]);
});

test("enabled travel equipment prepares first then continues", () => {
  const calls = [];
  const prepared = runAfterOptionalTravelEquipment(
    true,
    function (done) {
      calls.push("prepare");
      done();
    },
    function () {
      calls.push("travel");
    },
  );
  assert.equal(prepared, true);
  assert.deepEqual(calls, ["prepare", "travel"]);
});
