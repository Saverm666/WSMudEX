/** Boss encounter notification, routing and kill orchestration. */
(function registerBossHunter(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("boss-hunter", function install(context) {
    const { WG, legacy, messageAppend } = context;
    let routeTimer = 0;
    let killTimer = 0;
    let bossHook;

    function stop() {
      if (routeTimer) clearTimeout(routeTimer);
      if (killTimer) clearTimeout(killTimer);
      routeTimer = 0;
      killTimer = 0;
      if (bossHook) WG.remove_hook(bossHook);
      bossHook = undefined;
      WG.ksboss = undefined;
    }

    function findBoss(data, name, callback) {
      for (const item of data.items || [])
        if (item && item.name.indexOf(name) >= 0) callback(item.id);
      callback(-1);
    }

    Object.assign(WG, {
      findboss: findBoss,
      ksboss: undefined,
      kksBoss: function (event) {
        const location = event.content.match("出现在([^%]+)一带。")?.[1];
        const bossName = event.content.match("听说([^%]+)出现在")?.[1];
        if (!location || !bossName) return;
        const settings = legacy.getBossSettings();
        const blacklist = Array.isArray(settings.blacklist)
          ? settings.blacklist
          : String(settings.blacklist || "").split(",");
        if (WG.inArray(bossName.replace("/<(.*?)>/g", ""), blacklist)) {
          messageAppend("黑名单boss,忽略!");
          return;
        }
        stop();
        messageAppend(
          "自动前往BOSS地点 <div class=\"item-commands\"><span id='closeauto'>关闭自动执行后命令</span></div>",
        );
        $("#closeauto").off("click").on("click", stop);
        WG.Send("stopstate");
        WG.go(location);
        let next = 0;
        bossHook = WG.add_hook(
          ["items", "itemadd", "die", "room"],
          function (data) {
            if (data.type === "items") {
              if (!WG.at(location)) return;
              findBoss(data, bossName, function (id) {
                if (id < 0) {
                  if (next === 999) return;
                  const route = legacy.getBossRoutes()[location];
                  if (route && next < route.length)
                    routeTimer = setTimeout(() => WG.Send(route[next++]), 1000);
                  return;
                }
                next = 999;
                if (settings.autoEquipment) WG.eqhelper(settings.autoEquipment);
                killTimer = setTimeout(() => {
                  WG.Send("kill " + id);
                  next = 0;
                }, Number(settings.pfmDelay));
              });
            } else if (data.type === "itemadd" && data.name.indexOf(bossName) >= 0) {
              next = 0;
              WG.Send("get all from " + data.id);
              stop();
            } else if (data.type === "die") {
              next = 0;
              WG.Send("relive");
              stop();
            } else if (data.type === "room" && next === 999) next = 0;
          },
        );
        WG.ksboss = bossHook;
        routeTimer = setTimeout(function () {
          WG.Send("relive");
          stop();
          const command = legacy.getAutoCommand();
          command ? WG.SendCmd(command) : WG.zdwk();
        }, 1000 * Number(settings.waitSeconds));
      },
    });

    return { destroy: stop };
  });
})(window);
