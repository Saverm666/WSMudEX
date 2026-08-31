/** Decode compact pack, equipment, shop and warehouse protocol rows. */
(function registerPackDataCodec(global) {
  "use strict";

  const itemKeys = [
    "name",
    "id",
    "count",
    "grade",
    "unit",
    "value",
    "can_eq",
    "can_use",
    "can_study",
    "can_open",
    "can_combine",
    "locked",
  ];
  const eqKeys = ["name", "id", "grade", "can_use", "locked"];
  const selllistKeys = ["name", "id", "count", "locked", "unit", "value"];
  const storeKeys = [
    "name",
    "id",
    "count",
    "grade",
    "unit",
    "value",
    "can_eq",
    "can_use",
    "can_study",
    "can_open",
    "can_combine",
  ];

  global.WSMudPlugin.registerService(
    "pack-data-codec",
    function createPackDataCodec(context) {
      const getItemKeys = context.getItemKeys || (() => itemKeys);
      const getEqKeys = context.getEqKeys || (() => eqKeys);
      const getSelllistKeys = context.getSelllistKeys || (() => selllistKeys);
      const getStoreKeys = context.getStoreKeys || (() => storeKeys);

      function decodeRows(rows, keys, allowNull) {
        return rows.map((row) => {
          if (!row && allowNull) return null;
          if (!Array.isArray(row)) return row;
          const decoded = {};
          keys.forEach((key, index) => {
            decoded[key] = row[index];
          });
          return decoded;
        });
      }

      function deserializePackData(e) {
        return (
          e.items &&
            (e.items = decodeRows(e.items, getItemKeys(), false)),
          e.eqs &&
            (e.eqs = decodeRows(e.eqs, getEqKeys(), true)),
          e.selllist &&
            (e.selllist = decodeRows(e.selllist, getSelllistKeys(), true)),
          e.stores &&
            (e.stores = decodeRows(e.stores, getStoreKeys(), true)),
          e
        );
      }

      return {
        deserializePackData,
        itemKeys: getItemKeys(),
        eqKeys: getEqKeys(),
        selllistKeys: getSelllistKeys(),
        storeKeys: getStoreKeys(),
      };
    },
  );
})(window);
