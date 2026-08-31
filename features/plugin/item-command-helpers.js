/** NPC, equipment and current-room item command helpers. */
(function registerItemCommandHelpers(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "item-command-helpers",
    function install(context) {
      const { WG, legacy, jquery } = context;

      Object.assign(WG, {
        buy: function (item) {
          const npcs = legacy.getNpcs();
          const npcId = npcs[item.sales];
          return npcId == null
            ? (WG.update_npc_id(), false)
            : (WG.Send("list " + npcId),
              WG.Send("buy 1 " + item.id + " from " + npcId),
              true);
        },
        Give: function (item) {
          const npcId = legacy.getNpcs()["店小二"];
          return npcId == null
            ? (WG.update_npc_id(), false)
            : (WG.Send("give " + npcId + " " + item), true);
        },
        eq: function (name) {
          WG.Send("eq " + legacy.getEquipment()[name]);
        },
        ask: function (name, option) {
          const npcs = legacy.getNpcs();
          const npcId = npcs[name];
          npcId != null
            ? WG.Send("ask" + option + " " + npcId)
            : WG.update_npc_id();
        },
        kill_all: function () {
          for (const element of jquery(".room_items .room-item"))
            if (jquery(element).html().indexOf("尸体") < 0)
              WG.Send("kill " + jquery(element).attr("itemid"));
        },
        get_all: function () {
          for (const element of jquery(".room_items .room-item"))
            WG.Send("get all from " + jquery(element).attr("itemid"));
        },
        clean_all: async function () {
          await WG.go("扬州城-打铁铺");
          if (typeof WG.waitUntilAt === "function")
            await WG.waitUntilAt("扬州城-打铁铺");
          WG.Send("sell all");
        },
      });

      return { destroy() {} };
    },
  );
})(window);
