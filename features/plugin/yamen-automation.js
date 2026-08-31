/** Yamen fugitive-task automation with legacy WG compatibility. */
(function registerYamenAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("yamen-automation", function install(context) {
    const WG = context.WG;
    const legacy = context.legacy || {};
    const jquery = context.jquery;
    const messageAppend = context.messageAppend;
    const key =
      (typeof legacy.getKeyApi === "function" && legacy.getKeyApi()) ||
      context.KEY;
    const timers = context.timers;
    function requireRuntimeContext() {
      if (
        typeof jquery !== "function" ||
        typeof messageAppend !== "function" ||
        !timers ||
        typeof timers.setTimeout !== "function" ||
        typeof timers.clearTimeout !== "function"
      ) {
        throw new TypeError("衙门自动化需要显式 jquery、messageAppend 和 timers 上下文");
      }
    }
    const getNeedFind = () =>
      typeof legacy.getBossRoutes === "function" ? legacy.getBossRoutes() || {} : {};
    const getNpc = () =>
      typeof legacy.getYamenNpc === "function" ? legacy.getYamenNpc() : undefined;
    const setNpc = (value) => {
      if (typeof legacy.setYamenNpc === "function") legacy.setYamenNpc(value);
    };
    const getPlace = () =>
      typeof legacy.getYamenPlace === "function"
        ? legacy.getYamenPlace()
        : undefined;
    const setPlace = (value) => {
      if (typeof legacy.setYamenPlace === "function") legacy.setYamenPlace(value);
    };

    let yamenHook;
    let loginHook;
    let taskTimer;
    let targetTimer;
    let generation = 0;
    const ownedTimers = new Set();

    function clearOwnedTimer(timerId) {
      if (timerId == null) return;
      timers.clearTimeout(timerId);
      ownedTimers.delete(timerId);
      if (taskTimer === timerId) taskTimer = undefined;
      if (targetTimer === timerId) targetTimer = undefined;
    }

    function clearAllTimers() {
      for (const timerId of ownedTimers) timers.clearTimeout(timerId);
      ownedTimers.clear();
      taskTimer = undefined;
      targetTimer = undefined;
    }

    function schedule(kind, callback, delay, runGeneration) {
      requireRuntimeContext();
      if (kind === "task") clearOwnedTimer(taskTimer);
      if (kind === "target") clearOwnedTimer(targetTimer);
      let timerId;
      timerId = timers.setTimeout(function runScheduled() {
        ownedTimers.delete(timerId);
        if (taskTimer === timerId) taskTimer = undefined;
        if (targetTimer === timerId) targetTimer = undefined;
        if (runGeneration !== generation) return;
        callback();
      }, delay);
      ownedTimers.add(timerId);
      if (kind === "task") taskTimer = timerId;
      if (kind === "target") targetTimer = timerId;
      return timerId;
    }

    function removeYamenHook() {
      const hookId = yamenHook != null ? yamenHook : WG.yamen_lister;
      yamenHook = undefined;
      WG.yamen_lister = undefined;
      if (hookId != null && typeof WG.remove_hook === "function") {
        WG.remove_hook(hookId);
      }
    }

    function onYamenText(event, runGeneration) {
      if (runGeneration !== generation || !event) return;
      const message = event.msg;
      if (message.indexOf("最近没有在逃的逃犯了，你先休息下吧。") >= 0) {
        clearAllTimers();
        WG.check_yamen_task = "over";
        removeYamenHook();
        WG.yamen_err_no = 0;
      } else if (message.indexOf("没有这个人") >= 0) {
        WG.update_npc_id();
      }
    }

    function installYamenHook(runGeneration) {
      if (WG.yamen_lister) {
        yamenHook = WG.yamen_lister;
        return;
      }
      yamenHook = WG.add_hook("text", (event) =>
        onYamenText(event, runGeneration),
      );
      WG.yamen_lister = yamenHook;
    }

    function checkYamenTask() {
      requireRuntimeContext();
      if ("over" == WG.check_yamen_task) return;
      messageAppend("查找任务中");
      let text = jquery(".task-desc:eq(-2)").text();
      for (let index = 3; index < 10 && -1 == text.indexOf("扬州知府"); index++) {
        text = jquery(".task-desc:eq(-" + index + ")").text();
      }
      const runGeneration = generation;
      if (0 == text.length) {
        key.do_command("tasks");
        schedule("task", checkYamenTask, 1e3, runGeneration);
        return;
      }
      try {
        const npc = text.match("犯：([^%]+)，据")[1];
        const place = text.match("在([^%]+)出")[1];
        setNpc(npc);
        setPlace(place);
        messageAppend("追捕任务：" + npc + "   地点：" + place);
        key.do_command("score");
        WG.go(place);
        clearOwnedTimer(taskTimer);
        schedule("target", checkZbNpc, 1e3, runGeneration);
      } catch (error) {
        messageAppend("查找衙门追捕失败");
        if (WG.yamen_err_no < 4) {
          key.do_command("tasks");
          schedule("task", checkYamenTask, 1e3, runGeneration);
          WG.yamen_err_no = WG.yamen_err_no + 1;
        } else {
          clearAllTimers();
          removeYamenHook();
          WG.yamen_err_no = 0;
        }
      }
    }

    function checkZbNpc() {
      requireRuntimeContext();
      let found = false;
      for (const item of jquery(".room_items .room-item")) {
        if (-1 != item.innerText.indexOf(getNpc())) {
          found = true;
          WG.Send("kill " + jquery(item).attr("itemid"));
          messageAppend("找到" + getNpc() + "，自动击杀！！！");
          WG.zb_next = 0;
          clearOwnedTimer(targetTimer);
          break;
        }
      }
      const routes = getNeedFind()[getPlace()];
      if (
        !found &&
        null != routes &&
        WG.zb_next < routes.length
      ) {
        messageAppend("寻找附近");
        WG.Send(routes[WG.zb_next]);
        WG.zb_next++;
      }
      if (!found) schedule("target", checkZbNpc, 1e3, generation);
    }

    async function goYamenTask() {
      requireRuntimeContext();
      const runGeneration = generation;
      installYamenHook(runGeneration);
      WG.go("扬州城-衙门正厅");
      await WG.sleep(200);
      if (runGeneration !== generation) return;
      WG.update_npc_id();
      WG.ask("扬州知府 程药发", 1);
      if ("over" != WG.check_yamen_task)
        schedule("task", checkYamenTask, 1e3, runGeneration);
    }

    function resetForRole() {
      generation += 1;
      clearAllTimers();
      removeYamenHook();
      WG.yamen_err_no = 0;
      WG.zb_next = 0;
      setNpc(undefined);
      setPlace(undefined);
      WG.check_yamen_task = checkYamenTask;
    }

    Object.defineProperties(WG, {
      yamen_lister: {
        configurable: true,
        enumerable: true,
        get: () => yamenHook,
        set: (value) => {
          yamenHook = value;
        },
      },
      yamen_err_no: {
        configurable: true,
        enumerable: true,
        get: () => errorCount,
        set: (value) => {
          errorCount = value;
        },
      },
      check_yamen_task: {
        configurable: true,
        enumerable: true,
        get: () => checker,
        set: (value) => {
          checker = value;
        },
      },
      zb_next: {
        configurable: true,
        enumerable: true,
        get: () => nextStep,
        set: (value) => {
          nextStep = value;
        },
      },
    });
    let errorCount = 0;
    let nextStep = 0;
    let checker = checkYamenTask;

    WG.go_yamen_task = goYamenTask;
    WG.check_zb_npc = checkZbNpc;
    loginHook = WG.add_hook("login", resetForRole);

    return {
      resetForRole,
      stop: resetForRole,
      destroy() {
        resetForRole();
        if (loginHook != null) WG.remove_hook(loginHook);
        loginHook = undefined;
        if (WG.go_yamen_task === goYamenTask) WG.go_yamen_task = undefined;
        if (WG.check_zb_npc === checkZbNpc) WG.check_zb_npc = undefined;
      },
    };
  });
})(window);
