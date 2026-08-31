/** Cross-origin page setting snapshot helpers. */
(function registerPageSettingsSync(global) {
  "use strict";

  const SNAPSHOT_KEY = "wsmudSyncedPageSettings";

  function readPageStorage(storage) {
    const values = {};
    if (!storage) return values;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key == null) continue;
      values[key] = storage.getItem(key);
    }
    return values;
  }

  function hydrateMissingKeys(pageStorage, snapshotValues) {
    if (!pageStorage || !snapshotValues || typeof snapshotValues !== "object") {
      return 0;
    }
    let written = 0;
    const keys = Object.keys(snapshotValues);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const value = snapshotValues[key];
      if (value == null) continue;
      if (pageStorage.getItem(key) != null) continue;
      pageStorage.setItem(key, String(value));
      written += 1;
    }
    return written;
  }

  function wrapSnapshot(values) {
    return {
      version: 1,
      values: values && typeof values === "object" ? values : {},
    };
  }

  function unwrapSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return {};
    if (snapshot.values && typeof snapshot.values === "object") {
      return snapshot.values;
    }
    return {};
  }

  const api = {
    SNAPSHOT_KEY: SNAPSHOT_KEY,
    readPageStorage: readPageStorage,
    hydrateMissingKeys: hydrateMissingKeys,
    wrapSnapshot: wrapSnapshot,
    unwrapSnapshot: unwrapSnapshot,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  global.WSMudPageSettingsSync = api;
  if (typeof window === "object" && window && window !== global) {
    window.WSMudPageSettingsSync = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
