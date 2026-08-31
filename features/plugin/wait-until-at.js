/** Wait until navigation reports the current room, then settle for NPCs. */
(function registerWaitUntilAt(global) {
  "use strict";

  async function waitUntilAt(options) {
    const at = options.at;
    const sleep = options.sleep;
    const now = options.now || Date.now;
    const target = options.target;
    const timeout = options.timeout == null ? 8000 : options.timeout;
    const interval = options.interval == null ? 200 : options.interval;
    const settle = options.settle == null ? 300 : options.settle;
    const start = now();
    while (!at(target) && now() - start < timeout) {
      await sleep(interval);
    }
    const arrived = at(target);
    if (settle > 0) await sleep(settle);
    return arrived;
  }

  const api = { waitUntilAt };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (
    global.WSMudPlugin &&
    typeof global.WSMudPlugin.registerFeature === "function"
  ) {
    global.WSMudPlugin.registerFeature(
      "wait-until-at",
      function install(context) {
        const { WG } = context;
        function waitForRoom(target, extras) {
          return waitUntilAt({
            at: (name) => WG.at(name),
            sleep: (ms) => WG.sleep(ms),
            target,
            ...(extras || {}),
          });
        }
        WG.waitUntilAt = waitForRoom;
        return {
          destroy() {
            if (WG.waitUntilAt === waitForRoom) WG.waitUntilAt = undefined;
          },
        };
      },
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
