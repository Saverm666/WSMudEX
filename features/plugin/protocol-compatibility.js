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

      const greetInterval = 5 * 60 * 1000;
      function nextGreetReset() {
        const offset = 8 * 60 * 60 * 1000;
        const now = Date.now();
        const reset = new Date(now + offset);
        reset.setUTCHours(5, 0, 0, 0);
        if (reset.getTime() <= now + offset) reset.setUTCDate(reset.getUTCDate() + 1);
        return reset.getTime() - offset + 1000;
      }
      function greetEnabled() {
        return G.connected && WG.online &&
          (!WG.isPluginFeatureEnabled || WG.isPluginFeatureEnabled("autoGreetOnOpen"));
      }
      function isRoleInfo(event) {
        return event.type === "text" &&
          /武道塔进度|门派职位等级|今日副本次数/.test(String(event.msg || ""));
      }
      function clearGreetRequest() {
        clearTimeout(WG.autoGreetResponseTimer);
        WG.autoGreetResponseTimer = null;
        const entry = WG.autoGreetSilentEntry;
        if (entry) {
          clearTimeout(entry.timer);
          const index = silentMatchers.indexOf(entry);
          if (index >= 0) silentMatchers.splice(index, 1);
        }
        WG.autoGreetSilentEntry = null;
        WG.autoGreetRequestPending = false;
      }
      WG.stopAutoGreetCheck = function () {
        clearTimeout(WG.autoGreetCheckTimer);
        WG.autoGreetCheckTimer = null;
        clearGreetRequest();
      };
      WG.checkAutoGreetStatus = function () {
        if (!greetEnabled() || WG.autoGreetRequestPending ||
          WG.autoGreetConfirmedUntil > Date.now()) return;
        WG.autoGreetRequestPending = true;
        WG.autoGreetSilentEntry = WG.suppressNextResponse(isRoleInfo, 8000);
        WG.autoGreetResponseTimer = setTimeout(clearGreetRequest, 8000);
        WG.Send("info");
      };
      function scheduleGreetCheck(delay) {
        clearTimeout(WG.autoGreetCheckTimer);
        if (!greetEnabled()) return;
        const untilReset = (WG.autoGreetConfirmedUntil || 0) - Date.now();
        WG.autoGreetCheckTimer = setTimeout(function () {
          if (!greetEnabled()) return WG.stopAutoGreetCheck();
          WG.checkAutoGreetStatus();
          scheduleGreetCheck();
        }, untilReset > 0 ? untilReset : delay == null ? greetInterval : delay);
      }
      WG.startAutoGreetCheck = function () {
        WG.stopAutoGreetCheck();
        if (!greetEnabled()) return;
        if (WG.autoGreetRoleId !== G.id) {
          WG.autoGreetRoleId = G.id;
          WG.autoGreetLastAttempt = null;
          WG.autoGreetConfirmedUntil = null;
        }
        WG.checkAutoGreetStatus();
        scheduleGreetCheck();
      };
      const autoGreetHook = WG.add_hook("text", function (event) {
        if (!isRoleInfo(event)) return;
        clearGreetRequest();
        if (!greetEnabled()) return;
        const text = String(event.msg || "").replace(/<[^>]*>/g, "");
        if (/(?:已经|已)\s*(?:向\s*)?(?:门派\s*)?(?:首席\s*)?请安/.test(text)) {
          WG.autoGreetConfirmedUntil = nextGreetReset();
          scheduleGreetCheck();
          return;
        }
        if (!/(?:尚未|还未|未曾|未)\s*(?:向\s*)?(?:门派\s*)?(?:首席\s*)?请安/.test(text)) return;
        if (WG.autoGreetLastAttempt != null &&
          Date.now() - WG.autoGreetLastAttempt < greetInterval) return;
        WG.autoGreetConfirmedUntil = null;
        WG.autoGreetLastAttempt = Date.now();
        WG.Send("sx greet");
        scheduleGreetCheck(1000);
      });

      // This hook is installed before upstream GI hooks. It mutates only the
      // parsed automation-side event; the game client still receives raw data.
      const decodeHook = WG.add_hook("dialog", function (event) {
        if (event.dialog === "pack" || event.dialog === "list")
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
          } else {
            WG.automationScore2RequestPending = false;
            clearTimeout(WG.automationScore2RequestTimer);
            WG.automationScore2RequestTimer = null;
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
      }

      let dashboardTimer = null;
      let pendingDashboardEvents = [];
      let destroyed = false;
      function flushDashboardEvents() {
        dashboardTimer = null;
        const events = pendingDashboardEvents;
        pendingDashboardEvents = [];
        if (destroyed || G.connected === false) return;
        WG.dashboardUpdatesSuspended = true;
        try {
          for (const pending of events) {
            if (pending.roleId != null && pending.roleId !== G.id) continue;
            const event = pending.event;
            updateDashboardFromEvent(event);
            if (event.type === "login") {
              WG.requestSilentPackSnapshot();
              WG.requestDashboardSnapshot();
              WG.requestAutomationScore2();
              WG.suppressNextResponse(
                response => response.type === "dialog" && response.dialog === "party",
                3000,
              );
              WG.Send("party load");
            }
          }
        } finally {
          WG.dashboardUpdatesSuspended = false;
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
          if (event.type === "login") {
            pendingDashboardEvents = [];
            while (silentMatchers.length) clearTimeout(silentMatchers.pop().timer);
            typeof WG.resetDashboardSession === "function" && WG.resetDashboardSession(event.id);
          }
          // Upstream GI owns G and runs after this compatibility hook. Defer
          // state processing, preserving each increment but rendering once.
          pendingDashboardEvents.push({ event, roleId: event.type === "login" ? event.id : G.id });
          if (dashboardTimer === null) dashboardTimer = setTimeout(flushDashboardEvents, 0);
        },
      );

      return {
        destroy: function () {
          destroyed = true;
          clearTimeout(dashboardTimer);
          dashboardTimer = null;
          pendingDashboardEvents = [];
          WG.stopAutoGreetCheck();
          WG.remove_hook(autoGreetHook);
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
