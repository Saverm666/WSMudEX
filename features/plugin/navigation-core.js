/** Shared room navigation primitives backed by explicit legacy accessors. */
(function registerNavigationCore(global) {
  "use strict";

  function stripRoomMarkup(name) {
    return String(name || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function roomMatchesTarget(roomName, target) {
    const room = stripRoomMarkup(roomName);
    const want = stripRoomMarkup(target);
    if (!room || !want) return false;
    return room.indexOf(want) !== -1 || want.indexOf(room) !== -1;
  }

  const api = { stripRoomMarkup, roomMatchesTarget };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (
    !global.WSMudPlugin ||
    typeof global.WSMudPlugin.registerFeature !== "function"
  ) {
    return;
  }

  global.WSMudPlugin.registerFeature("navigation-core", function install(context) {
    const { WG, G, jquery, legacy = {} } = context;
    const getRoomItems = () => legacy.getRoomData?.() || [];
    const getRoutes = () => legacy.getPlaceRoutes?.() || {};
    const getSearchRoutes = () => legacy.getNeedFindRoutes?.() || {};
    const getSaveAddress = () => legacy.getSaveAddress?.();

    function currentRoomName() {
      let fromDom = "";
      try {
        const node = jquery(".room-name");
        fromDom =
          (node && typeof node.text === "function" && node.text()) ||
          (node && typeof node.html === "function" && node.html()) ||
          "";
      } catch (_error) {
        fromDom = "";
      }
      return fromDom || (G && G.room_name) || "";
    }

    async function go(target) {
      if (getSaveAddress() === "开" && target === "扬州城-钱庄") {
        target = "住房-卧室";
      }
      if (getSearchRoutes()[target] == null && WG.at(target)) return;
      const route = getRoutes()[target];
      if (route != null) {
        G.ingo = true;
        await WG.SendCmd(route);
        G.ingo = false;
        if (typeof WG.waitUntilAt === "function") await WG.waitUntilAt(target);
      }
    }

    function at(target) {
      if (getSaveAddress() === "开" && target === "扬州城-钱庄") {
        target = "住房-卧室";
      }
      return roomMatchesTarget(currentRoomName(), target);
    }

    function getIdByName(name) {
      const items = getRoomItems();
      for (let index = 0; index < items.length; index += 1) {
        if (items[index].name && items[index].name.indexOf(name) >= 0) {
          return items[index].id;
        }
      }
      return null;
    }

    WG.go = go;
    WG.at = at;
    WG.getIdByName = getIdByName;

    return {
      destroy() {
        if (WG.go === go) WG.go = undefined;
        if (WG.at === at) WG.at = undefined;
        if (WG.getIdByName === getIdByName) WG.getIdByName = undefined;
      },
    };
  });
})(typeof window !== "undefined" ? window : globalThis);
