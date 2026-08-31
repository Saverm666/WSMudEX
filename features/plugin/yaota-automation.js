/** Yaota room progress reporting with an owned Hook and cancellable waits. */
(function registerYaotaAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("yaota-automation", function install(context) {
    const { WG, G, jquery, timers } = context;
    const legacy = context.legacy || {};
    const timerRecords = new Map();
    let roomHook;
    let generation = 0;
    let towerCycle = 0;
    let finishing = false;

    function requireRuntimeContext() {
      if (
        typeof jquery !== "function" ||
        !timers ||
        typeof timers.setTimeout !== "function" ||
        typeof timers.clearTimeout !== "function" ||
        typeof legacy.formatDate !== "function"
      ) {
        throw new TypeError("妖塔监控需要显式 jquery、timers 和 formatDate 上下文");
      }
    }

    function isCurrent(runGeneration) {
      return runGeneration === generation;
    }

    function wait(delay, runGeneration) {
      return new Promise((resolve) => {
        let timerId;
        timerId = timers.setTimeout(() => {
          timerRecords.delete(timerId);
          resolve(isCurrent(runGeneration));
        }, delay);
        timerRecords.set(timerId, resolve);
      });
    }

    function schedule(callback, delay, runGeneration) {
      let timerId;
      timerId = timers.setTimeout(() => {
        timerRecords.delete(timerId);
        if (isCurrent(runGeneration)) callback();
      }, delay);
      timerRecords.set(timerId, null);
    }

    function clearTimers() {
      for (const [timerId, resolve] of timerRecords) {
        timers.clearTimeout(timerId);
        if (resolve) resolve(false);
      }
      timerRecords.clear();
    }

    function removeRoomHook() {
      if (roomHook == null) return;
      if (typeof WG.remove_hook === "function") WG.remove_hook(roomHook);
      roomHook = undefined;
    }

    function resetYaotaAutomation() {
      generation += 1;
      towerCycle += 1;
      clearTimers();
      removeRoomHook();
      finishing = false;
      G.yaotaFlag = false;
      G.yaoyuan = 0;
      jquery("#yt_prog").remove();
    }

    function appendReport(target, prefix) {
      jquery(target).append(
        "<hig>【插件】" +
          prefix +
          G.yaotaCount +
          " 次妖塔共获得 " +
          G.yaoyuan +
          " 点妖元，结束时间: " +
          legacy.formatDate("YYYY-mm-dd HH:MM", new Date()) +
          "。<br><hig>",
      );
    }

    function appendStart(target) {
      jquery(target).append(
        "<hig>【插件】开始第 " +
          G.yaotaCount +
          " 次攻略妖塔，现在时间是:" +
          legacy.formatDate("YYYY-mm-dd HH:MM", new Date()) +
          "。<br><hig>",
      );
    }

    function finishYaota(runGeneration) {
      if (finishing || !isCurrent(runGeneration)) return;
      const finishingCycle = towerCycle;
      finishing = true;
      appendReport(".channel pre", "第 ");
      appendReport(".tm", "第 ");
      schedule(async () => {
        if (finishingCycle !== towerCycle) return;
        while (
          isCurrent(runGeneration) &&
          finishingCycle === towerCycle &&
          !WG.is_free()
        ) {
          if (!(await wait(1e3, runGeneration))) return;
        }
        if (!isCurrent(runGeneration) || finishingCycle !== towerCycle) return;
        if (G.yaoyuan == 261)
          WG.SendCmd("tm 第 " + G.yaotaCount + " 次妖塔圆满完成，撒花~~~~~");
        else WG.SendCmd("tm 第 " + G.yaotaCount + " 次妖塔遗憾收场，撒花~~~~~");
        jquery("#yt_prog").remove();
        G.yaotaFlag = false;
        G.yaoyuan = 0;
        finishing = false;
      }, 0, runGeneration);
    }

    function enterYaota() {
      clearTimers();
      towerCycle += 1;
      jquery(".state-bar").before("<div id=yt_prog>开始攻略妖塔</div>");
      G.yaotaCount = G.yaotaCount + 1;
      appendStart(".channel pre");
      appendStart(".tm");
      G.yaoyuan = 0;
      G.yaotaFlag = true;
      finishing = false;
    }

    function ytjk_func() {
      requireRuntimeContext();
      if (roomHook != null) return;
      const runGeneration = generation;
      roomHook = WG.add_hook("room", (event) => {
        if (!isCurrent(runGeneration) || !event) return;
        if (G.yaotaFlag && event.path !== "zc/mu/shishenta")
          finishYaota(runGeneration);
        if (event.path === "zc/mu/shishenta") enterYaota();
      });
    }

    const loginHook = WG.add_hook("login", resetYaotaAutomation);
    Object.assign(WG, { ytjk_func, resetYaotaAutomation });

    return {
      resetYaotaAutomation,
      destroy() {
        if (loginHook != null && typeof WG.remove_hook === "function")
          WG.remove_hook(loginHook);
        resetYaotaAutomation();
        if (WG.ytjk_func === ytjk_func) WG.ytjk_func = undefined;
        if (WG.resetYaotaAutomation === resetYaotaAutomation)
          WG.resetYaotaAutomation = undefined;
      },
    };
  });
})(window);
