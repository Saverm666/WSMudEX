/** Wudao, study and grove activity automation with legacy timer compatibility. */
(function registerActivityAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "activity-automation",
    function install(context) {
      const { WG, jquery, timers, prompt: promptAction, messageAppend } = context;
      const legacy = context.legacy || {};
      const state = {
        wudaoHook: undefined,
        fbnum: 0,
        needGrove: 0,
      };
      const fieldMap = {
        wudao_hook: "wudaoHook",
        fbnum: "fbnum",
        needGrove: "needGrove",
      };
      const previousDescriptors = {};
      let generation = 0;

      const getWorkTimer = () =>
        typeof legacy.getWorkTimer === "function"
          ? legacy.getWorkTimer()
          : 0;
      const setWorkTimer = (value) => {
        if (typeof legacy.setWorkTimer === "function")
          legacy.setWorkTimer(value);
      };
      const isTransportAvailable = () =>
        typeof legacy.isTransportAvailable === "function" &&
        legacy.isTransportAvailable();
      const getWudaoPerforms = () =>
        typeof legacy.getWudaoPerforms === "function"
          ? legacy.getWudaoPerforms()
          : "";

      function requireRuntimeContext() {
        if (
          typeof jquery !== "function" ||
          !timers ||
          typeof timers.setInterval !== "function" ||
          typeof timers.clearInterval !== "function" ||
          typeof promptAction !== "function" ||
          typeof messageAppend !== "function" ||
          typeof legacy.getWorkTimer !== "function" ||
          typeof legacy.setWorkTimer !== "function" ||
          typeof legacy.isTransportAvailable !== "function" ||
          typeof legacy.getWudaoPerforms !== "function"
        ) {
          throw new TypeError(
            "活动自动化需要显式 jquery、timers、prompt 和 messageAppend 上下文",
          );
        }
      }

      function removeWudaoHook(expectedHook) {
        const hook = expectedHook == null ? WG.wudao_hook : expectedHook;
        if (WG.wudao_hook === hook) WG.wudao_hook = undefined;
        if (hook != null && typeof WG.remove_hook === "function") {
          WG.remove_hook(hook);
        }
      }

      function timerClose() {
        generation += 1;
        const timer = getWorkTimer();
        if (timer) {
          timers.clearInterval(timer);
          setWorkTimer(0);
        }
      }

      function wudaoAuto() {
        requireRuntimeContext();
        let item;
        if (getWorkTimer() === 0) {
          const runGeneration = generation;
          setWorkTimer(
            timers.setInterval(() => {
              if (runGeneration === generation) WG.wudao_auto();
            }, 1e3),
          );
        }
        if (WG.at("武道塔")) {
          item = jquery(".room_items .room-item:last");
          if (item.text().indexOf("守护者") !== -1) {
            WG.Send("kill " + item.attr("itemid"));
            WG.wudao_autopfm();
          } else {
            WG.Send("go up");
          }
        } else if (isTransportAvailable()) {
          if (WG.wudao_hook == null) {
            const hookGeneration = generation;
            let hookId;
            hookId = WG.add_hook("dialog", (event) => {
              if (hookGeneration !== generation) return;
              let progress;
              for (const task of event.items) {
                if (task.id === "signin") {
                  WG.go("武道塔");
                  let reset;
                  const progressPattern = new RegExp("进度([^%]+)，<");
                  progress = task.desc.match(progressPattern)[1];
                  if (progress != null) {
                    messageAppend("爬塔 : " + progress);
                    reset = progress.indexOf("<");
                    progress = progress.substring(0, reset).split("/");
                    reset = task.desc.indexOf("武道塔可以重置") !== -1;
                    if (progress[0] === progress[1]) {
                      messageAppend("爬塔完成! ");
                      if (reset) {
                        WG.ask("守门人", 1);
                        messageAppend("爬塔重置完成! ");
                        WG.Send("go enter");
                      } else {
                        messageAppend("爬塔已经重置过了!");
                        WG.timer_close();
                      }
                    } else {
                      messageAppend("爬塔未完成!");
                      WG.Send("go enter");
                    }
                  } else {
                    messageAppend("获取爬塔信息失败 : " + task.desc);
                  }
                  break;
                }
              }
              removeWudaoHook(hookId);
            });
            WG.wudao_hook = hookId;
          }
          WG.Send("tasks");
        } else {
          WG.go("武道塔");
          WG.ask("守门人", 1);
          WG.Send("go enter");
        }
      }

      function wudaoAutopfm() {
        requireRuntimeContext();
        let index;
        for (index of getWudaoPerforms().split(",")) {
          if (
            jquery(
              "div.combat-panel div.combat-commands span.pfm-item:eq(" +
                index +
                ") span",
            ).css("left") === "0px"
          ) {
            jquery(
              "div.combat-panel div.combat-commands span.pfm-item:eq(" +
                index +
                ") ",
            ).click();
          }
        }
      }

      function xueAuto() {
        requireRuntimeContext();
        const itemName = jquery(
          ".room_items .room-item:first .item-name",
        ).text();
        const studying =
          itemName.indexOf("<打坐") !== -1 ||
          itemName.indexOf("<学习") !== -1 ||
          itemName.indexOf("<练习") !== -1;
        if (getWorkTimer() === 0) {
          if (!studying) return void messageAppend("当前不在打坐或学技能");
          const runGeneration = generation;
          setWorkTimer(
            timers.setInterval(() => {
              if (runGeneration === generation) WG.xue_auto();
            }, 1e3),
          );
        }
        if (!studying) {
          WG.timer_close();
          WG.zdwk();
        } else {
          messageAppend("自动打坐学技能");
        }
      }

      function onceGrove() {
        this.fbnum += 1;
        messageAppend("第" + this.fbnum + "次");
        WG.Send("cr yz/lw/shangu;cr over");
        if (this.needGrove <= this.fbnum) {
          WG.Send("taskover signin");
          messageAppend(
            "<hiy>" + this.fbnum + "次副本小树林秒进秒退已完成</hiy>",
          );
          if (typeof WG.finishDailyWorkflow === "function")
            WG.finishDailyWorkflow(WG.daily_hook);
          else {
            WG.remove_hook(WG.daily_hook);
            WG.daily_hook = undefined;
          }
          this.timer_close();
          this.needGrove = 0;
          this.fbnum = 0;
        }
      }

      function groveAskInfo() {
        requireRuntimeContext();
        return promptAction("请输入需要秒进秒退的副本次数", "");
      }

      function groveAuto(value = null) {
        requireRuntimeContext();
        if (getWorkTimer() === 0) {
          this.needGrove = value == null ? this.grove_ask_info() : value;
          if (this.needGrove) {
            if (parseFloat(this.needGrove).toString() === "NaN") {
              messageAppend("请输入数字");
            } else {
              messageAppend("开始秒进秒退小树林" + this.needGrove + "次");
              const runGeneration = generation;
              const receiver = this;
              setWorkTimer(
                timers.setInterval(() => {
                  if (runGeneration === generation) receiver.oncegrove();
                }, 1e3),
              );
            }
          }
        }
      }

      function resetActivityAutomation() {
        timerClose();
        removeWudaoHook();
        state.fbnum = 0;
        state.needGrove = 0;
      }

      for (const publicName of Object.keys(fieldMap)) {
        previousDescriptors[publicName] = Object.getOwnPropertyDescriptor(
          WG,
          publicName,
        );
        Object.defineProperty(WG, publicName, {
          configurable: true,
          enumerable: true,
          get: () => state[fieldMap[publicName]],
          set: (value) => {
            state[fieldMap[publicName]] = value;
          },
        });
      }

      const loginHook = WG.add_hook("login", resetActivityAutomation);
      Object.assign(WG, {
        timer_close: timerClose,
        wudao_auto: wudaoAuto,
        wudao_autopfm: wudaoAutopfm,
        xue_auto: xueAuto,
        oncegrove: onceGrove,
        grove_ask_info: groveAskInfo,
        grove_auto: groveAuto,
        resetActivityAutomation,
      });

      return {
        destroy() {
          if (loginHook != null) WG.remove_hook(loginHook);
          resetActivityAutomation();
          for (const publicName of Object.keys(fieldMap)) {
            try {
              if (previousDescriptors[publicName]) {
                Object.defineProperty(WG, publicName, previousDescriptors[publicName]);
              } else {
                delete WG[publicName];
              }
            } catch (_error) {
              // Keep the public compatibility field if another module owns it.
            }
          }
          if (WG.timer_close === timerClose) WG.timer_close = undefined;
          if (WG.wudao_auto === wudaoAuto) WG.wudao_auto = undefined;
          if (WG.wudao_autopfm === wudaoAutopfm) WG.wudao_autopfm = undefined;
          if (WG.xue_auto === xueAuto) WG.xue_auto = undefined;
          if (WG.oncegrove === onceGrove) WG.oncegrove = undefined;
          if (WG.grove_ask_info === groveAskInfo) WG.grove_ask_info = undefined;
          if (WG.grove_auto === groveAuto) WG.grove_auto = undefined;
          if (WG.resetActivityAutomation === resetActivityAutomation)
            WG.resetActivityAutomation = undefined;
        },
      };
    },
  );
})(window);
