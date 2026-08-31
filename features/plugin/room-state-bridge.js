/** Keeps the legacy room snapshot synchronized with items protocol events. */
(function registerRoomStateBridge(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "room-state-bridge",
    function install(context) {
      const { WG, legacy } = context;
      let roomHook;

      function saveRoomstate(event) {
        legacy.setRoomData(event && event.items);
      }

      roomHook = WG.add_hook("items", saveRoomstate);
      WG.saveRoomstate = saveRoomstate;

      return {
        destroy() {
          if (roomHook != null) WG.remove_hook(roomHook);
          roomHook = undefined;
          if (WG.saveRoomstate === saveRoomstate) WG.saveRoomstate = undefined;
        },
      };
    },
  );
})(window);
