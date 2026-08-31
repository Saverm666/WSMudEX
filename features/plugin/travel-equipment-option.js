/** Optional automatic outfit swap before home, master and similar travel. */
(function registerTravelEquipmentOption(global) {
  "use strict";

  const TRAVEL_EQUIPMENT_FEATURE_ID = "smartEquipmentOnTravel";

  function shouldPrepareTravelEquipment(flags) {
    return !flags || flags[TRAVEL_EQUIPMENT_FEATURE_ID] !== false;
  }

  function runAfterOptionalTravelEquipment(enabled, prepare, done) {
    if (!enabled) {
      done && done();
      return false;
    }
    prepare(done);
    return true;
  }

  const api = {
    TRAVEL_EQUIPMENT_FEATURE_ID: TRAVEL_EQUIPMENT_FEATURE_ID,
    shouldPrepareTravelEquipment: shouldPrepareTravelEquipment,
    runAfterOptionalTravelEquipment: runAfterOptionalTravelEquipment,
  };

  if (typeof module === "object" && module.exports) module.exports = api;

  if (
    global.WSMudPlugin &&
    typeof global.WSMudPlugin.registerFeature === "function"
  ) {
    global.WSMudPlugin.registerFeature(
      "travel-equipment-option",
      function install(context) {
        const { WG } = context;

        function travelEquipmentEnabled() {
          return shouldPrepareTravelEquipment(
            typeof WG.getPluginFeatureFlags === "function"
              ? WG.getPluginFeatureFlags()
              : null,
          );
        }

        Object.assign(WG, {
          TRAVEL_EQUIPMENT_FEATURE_ID: TRAVEL_EQUIPMENT_FEATURE_ID,
          shouldPrepareTravelEquipment: shouldPrepareTravelEquipment,
          travelEquipmentEnabled: travelEquipmentEnabled,
          runAfterOptionalTravelEquipment: function (prepare, done) {
            return runAfterOptionalTravelEquipment(
              travelEquipmentEnabled(),
              prepare,
              done,
            );
          },
        });

        return {
          destroy: function () {
            if (WG.travelEquipmentEnabled === travelEquipmentEnabled) {
              delete WG.TRAVEL_EQUIPMENT_FEATURE_ID;
              delete WG.shouldPrepareTravelEquipment;
              delete WG.travelEquipmentEnabled;
              delete WG.runAfterOptionalTravelEquipment;
            }
          },
        };
      },
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
