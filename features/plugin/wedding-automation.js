/** Automated wedding-room visits and gift handling. */
(function registerWeddingAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "wedding-automation",
    function install(context) {
      const { WG, legacy, messageAppend } = context;
      const jquery = context.jquery || global.$;
      const timers =
        context.timers || {
          setTimeout: global.setTimeout,
          clearTimeout: global.clearTimeout,
        };
      const logger = context.logger || global.console || { log: () => {} };
      let weddingTimer = null;
      let weddingGeneration = 0;
      let sessionHook;

      function removeWeddingHook() {
        const hook = WG.marryhy;
        WG.marryhy = null;
        if (hook != null) WG.remove_hook(hook);
      }

      function cancelWedding() {
        weddingGeneration += 1;
        if (weddingTimer != null) timers.clearTimeout(weddingTimer);
        weddingTimer = null;
        removeWeddingHook();
      }

      function finishWedding(generation) {
        if (generation !== weddingGeneration) return;
        weddingTimer = null;
        removeWeddingHook();
        const command = legacy.getAutoCommand();
        command && command !== "null" ? WG.SendCmd(command) : WG.zdwk();
      }

      function handleWeddingEvent(event, generation) {
        if (generation !== weddingGeneration || !event) return;
        if (event.type === "items") {
          for (const item of event.items || []) {
            if (item && item.name && item.name.indexOf(">婚宴礼桌<") >= 0) {
              logger.log("拾取");
              WG.Send("get all from " + item.id);
              logger.log("xy" + WG.marryhy);
              removeWeddingHook();
              break;
            }
          }
        } else if (event.type === "text") {
          if (event.msg === "你要给谁东西？") logger.log("没人");
          if (
            /^店小二拦住你说道：怎么又是你，每次都跑这么快，等下再进去。$/.test(
              event.msg,
            )
          ) {
            logger.log("cd");
            messageAppend("<hiy>你太勤快了, 1秒后回去挖矿</hiy>");
          }
          if (
            /^店小二拦住你说道：这位(.+)，不好意思，婚宴宾客已经太多了。$/.test(
              event.msg,
            )
          ) {
            logger.log("客满");
            messageAppend("<hiy>你来太晚了, 1秒后回去挖矿</hiy>");
          }
        } else if (event.type === "cmds") {
          for (const item of event.items || []) {
            if (item && item.name === "1金贺礼") {
              WG.SendCmd(item.cmd + ";go up;$wait 2000;go down;go up");
              logger.log("交钱");
              break;
            }
          }
        }
      }

      async function xiyan() {
        cancelWedding();
        messageAppend(
          "自动喜宴 <div class=\"item-commands\"><span id = 'closeauto'>关闭自动执行后命令</span></div>",
        );
        jquery("#closeauto")
          .off("click.wsmudWedding")
          .on("click.wsmudWedding", function () {
            const active = weddingTimer != null || WG.marryhy != null;
            cancelWedding();
            messageAppend(active ? "已停止后命令" : "已经停止");
          });
        WG.Send("stopstate");
        WG.go("扬州城-喜宴");
        const generation = weddingGeneration;
        WG.marryhy = WG.add_hook(
          ["items", "cmds", "text", "msg"],
          (event) => handleWeddingEvent(event, generation),
        );
        weddingTimer = timers.setTimeout(() => finishWedding(generation), 3e4);
      }

      sessionHook = WG.add_hook("login", cancelWedding);

      Object.assign(WG, {
        marryhy: null,
        xiyan,
        cancelXiyan: cancelWedding,
      });

      return {
        destroy() {
          if (sessionHook != null) WG.remove_hook(sessionHook);
          sessionHook = undefined;
          cancelWedding();
          jquery("#closeauto").off("click.wsmudWedding");
        },
      };
    },
  );
})(window);
