/** Current compact-protocol decoding and real-time dashboard bridge for upstream core. */
(function registerProtocolCompatibility(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "protocol-compatibility",
    function install(context) {
      const { WG, G } = context;
      const codec = global.WSMudPlugin.createService("pack-data-codec");
      const silentMatchers = [];

      WG.deserializePackData = codec.deserializePackData;
      WG.silentResponseMatchers = silentMatchers;
      WG.suppressNextResponse = function (matcher, timeout) {
        if (typeof matcher !== "function") return null;
        const entry = {
          matcher,
          timer: setTimeout(function () {
            const index = silentMatchers.indexOf(entry);
            if (index >= 0) silentMatchers.splice(index, 1);
          }, Number(timeout) || 6000),
        };
        silentMatchers.push(entry);
        return entry;
      };
      WG.consumeSilentResponse = function (event) {
        for (let index = 0; index < silentMatchers.length; index += 1) {
          const entry = silentMatchers[index];
          let matches = false;
          try {
            matches = entry.matcher(event);
          } catch (error) {
            console.error("silent response matcher failed", error);
          }
          if (!matches) continue;
          clearTimeout(entry.timer);
          silentMatchers.splice(index, 1);
          // 后台请求与用户当前打开的同一原生页面重合时，这份响应
          // 正是页面所等待的数据：结束静默匹配，但继续交给客户端。
          if (
            event &&
            event.type === "dialog" &&
            typeof Dialog !== "undefined" &&
            Dialog.isShow &&
            Dialog.curItem === event.dialog
          )
            return false;
          return true;
        }
        return false;
      };

      // This hook is installed before upstream GI hooks. It mutates only the
      // parsed automation-side event; the game client still receives raw data.
      const decodeHook = WG.add_hook("dialog", function (event) {
        WG.deserializePackData(event);
      });

      function updateDashboardFromEvent(event) {
        if (!event) return;
        WG.syncDashboardAfterSkillProgress(event);
        if (
          event.type === "dialog" &&
          event.dialog === "score" &&
          (event.id == null || G.id == null || event.id == G.id)
        ) {
          if (event.study_per == null) {
            WG.dashboardScoreRequestPending = false;
            clearTimeout(WG.dashboardScoreRequestTimer);
          }
          WG.applyDashboardScoreSnapshot(event);
          event.level != null && WG.applyDashboardLevel(event.level);
        } else if (event.type === "text" && event.msg) {
          const energyMatch = event.msg.match(
            /当前精力[：:]\s*(\d+)(?:\/(\d+))?/,
          );
          const energyGainMatch = event.msg.match(
            /你增加了\s*(\d+)\s*(?:点)?精力/,
          );
          const energySpentMatch = event.msg.match(
            /你(?:已)?消耗(?:了)?(?:一个扫荡符[，,]\s*)?(\d+)\s*(?:点)?精力(?:快速完成|[。！!])?/,
          );
          const limitMpMatch = event.msg.match(/内力上限增加了\s*(\d+)/);
          const rewardMatch = event.msg.match(
            /获得了(\d+)点经验[，,](\d+)点潜能/,
          );
          if (/扫荡完成|精力快速完成/.test(event.msg))
            WG.scheduleDashboardStateRefresh({ delay: 150 });
          if (energyMatch) {
            G.dashboardJingli = WG.mergeDashboardEnergyTotal(
              G.dashboardJingli ?? (G.score && G.score.jingli),
              energyMatch[1],
            );
          } else if (energyGainMatch || energySpentMatch) {
            const delta = energyGainMatch
              ? Number(energyGainMatch[1])
              : -Number(energySpentMatch[1]);
            const merged = WG.mergeDashboardEnergyDelta(
              G.dashboardJingli ?? (G.score && G.score.jingli),
              delta,
            );
            if (merged == null) WG.requestDashboardSnapshot();
            else G.dashboardJingli = merged;
          }
          if (limitMpMatch) {
            G.score || (G.score = {});
            if (G.score.limit_mp != null) {
              G.score.limit_mp =
                Number(G.score.limit_mp) + Number(limitMpMatch[1]);
              WG.saveDashboardSnapshot();
            } else WG.requestDashboardSnapshot();
          }
          if (rewardMatch) {
            G.score || (G.score = {});
            G.score.exp = Number(G.score.exp || 0) + Number(rewardMatch[1]);
            G.score.pot = Number(G.score.pot || 0) + Number(rewardMatch[2]);
          }
        }
        WG.updateSideDashboard();
      }

      const dashboardHook = WG.add_hook(
        [
          "login",
          "levelup",
          "items",
          "itemadd",
          "itemremove",
          "sc",
          "dialog",
          "text",
          "combat",
        ],
        function (event) {
          // Upstream GI owns G and runs after this compatibility hook. Defer
          // the dashboard read until all hooks for this packet have finished.
          setTimeout(function () {
            updateDashboardFromEvent(event);
            if (event.type === "login") {
              WG.requestSilentPackSnapshot();
              WG.requestDashboardSnapshot();
              WG.requestAutomationScore2();
              WG.suppressNextResponse(
                function (response) {
                  return (
                    response.type === "dialog" &&
                    response.dialog === "party"
                  );
                },
                3000,
              );
              WG.Send("party load");
            }
          }, 0);
        },
      );

      return {
        destroy: function () {
          WG.remove_hook(decodeHook);
          WG.remove_hook(dashboardHook);
          while (silentMatchers.length) {
            clearTimeout(silentMatchers.pop().timer);
          }
        },
      };
    },
  );
})(window);
