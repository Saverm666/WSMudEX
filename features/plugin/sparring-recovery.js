/** Automated NPC sparring and post-combat recovery. */
(function registerSparringRecovery(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("sparring-recovery", function install(context) {
    const { WG, G, messageAppend } = context;

    function stopFightListener() {
      if (!WG.fight_listener) return;
      WG.remove_hook(WG.fight_listener);
      WG.fight_listener = undefined;
    }

    function stopRecovery() {
      if (!WG.recover_timer) return;
      clearTimeout(WG.recover_timer);
      WG.recover_timer = undefined;
    }

    Object.assign(WG, {
      fight_listener: undefined,
      recover_timer: undefined,

      auto_fight: function () {
        if (WG.fight_listener) {
          messageAppend("<hio>自动比试</hio>结束");
          stopFightListener();
          return;
        }
        const npcName = prompt('请输入NPC名称,例如:"高根明"');
        const npcId = WG.find_item(npcName);
        if (npcId == null) return;

        WG.fight_listener = WG.add_hook(
          ["text", "sc", "combat"],
          async function (event) {
            let item;
            if (event.type === "combat" && event.end) {
              item = G.items.get(G.id);
              if (item.mp / item.max_mp < 0.8) WG.SendCmd("dazuo");
              WG.SendCmd("liaoshang");
            } else if (event.type === "sc" && event.id === npcId) {
              item = G.items.get(npcId);
              if (item.hp >= item.max_hp) WG.Send("stopstate;fight " + npcId);
            } else if (event.type === "sc" && event.id === G.id) {
              if (event.hp >= event.max_hp)
                WG.Send("stopstate;fight " + npcId);
            } else if (event.type === "text") {
              if (event.msg.indexOf("你先调整好自己的状态再来找别人比试吧") >= 0)
                WG.SendCmd("liaoshang");
              if (event.msg.indexOf("你想趁人之危吗") >= 0)
                WG.SendCmd("dazuo");
              if (event.msg.indexOf(">你疗伤完毕，深深吸了口气") >= 0)
                WG.Send("stopstate;fight " + npcId);
            }
          },
        );
        WG.Send("stopstate;fight " + npcId);
        messageAppend("<hio>自动比试</hio>开始");
      },

      find_item: function (name) {
        for (const [id, item] of G.items) if (item.name === name) return id;
        return null;
      },

      recover: function (hpRatio, mpRatio, waitCooldowns, callback) {
        if (hpRatio === 0) {
          stopRecovery();
          return;
        }
        stopRecovery();
        WG.Send("dazuo");
        WG.recover_timer = setInterval(function () {
          const player = G.items.get(G.id);
          if (player.mp / player.max_mp < mpRatio) {
            if (player.state !== "打坐") WG.Send("stopstate;dazuo");
          } else if (player.hp / player.max_hp < hpRatio) {
            if (player.state !== "疗伤") WG.Send("stopstate;liaoshang");
          } else {
            if (player.state) WG.Send("stopstate");
            if (waitCooldowns) {
              for (const [skill, active] of G.cds)
                if (skill !== "force.tu" && active) return;
            }
            stopRecovery();
            callback();
          }
        }, 1000);
      },
    });

    return {
      destroy: function () {
        stopFightListener();
        stopRecovery();
      },
    };
  });
})(window);
