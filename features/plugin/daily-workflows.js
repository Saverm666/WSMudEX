/** One-key daily, ask-peace and fugitive sweep workflows. */
(function registerDailyWorkflows(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "daily-workflows",
    function install(context) {
      const { WG, jquery, timers, messageAppend, logger } = context;
      const legacy = context.legacy || {};
      const previousDescriptors = {};
      const timerRecords = new Map();
      let dailyRun;
      let qaRun;
      let sweepRun;
      let dailyHook;
      let sweepHook;
      let sessionGeneration = 0;

      function requireRuntimeContext() {
        if (
          typeof jquery !== "function" ||
          !timers ||
          typeof timers.setTimeout !== "function" ||
          typeof timers.clearTimeout !== "function" ||
          typeof messageAppend !== "function" ||
          typeof legacy.getFamily !== "function" ||
          typeof legacy.getMasterTasks !== "function"
        ) {
          throw new TypeError(
            "一键日常需要显式 jquery、timers、messageAppend、family 和师门配置上下文",
          );
        }
      }

      function createDeferred() {
        let resolve;
        const promise = new Promise((done) => {
          resolve = done;
        });
        return { promise, resolve, settled: false };
      }

      function settle(deferred, value) {
        if (!deferred || deferred.settled) return;
        deferred.settled = true;
        deferred.resolve(value);
      }

      function isActive(run) {
        return !!run && run.active && run.session === sessionGeneration;
      }

      function wait(run, delay) {
        return new Promise((resolve) => {
          let timerId;
          timerId = timers.setTimeout(() => {
            timerRecords.delete(timerId);
            resolve(isActive(run));
          }, delay);
          timerRecords.set(timerId, { run, resolve });
        });
      }

      function schedule(run, delay, callback) {
        let timerId;
        timerId = timers.setTimeout(() => {
          timerRecords.delete(timerId);
          if (isActive(run)) callback();
        }, delay);
        timerRecords.set(timerId, { run });
      }

      function clearRunTimers(run) {
        for (const [timerId, record] of timerRecords) {
          if (record.run !== run) continue;
          timers.clearTimeout(timerId);
          timerRecords.delete(timerId);
          if (record.resolve) record.resolve(false);
        }
      }

      function enqueue(run, kind, handler, event) {
        run.queue = (run.queue || Promise.resolve())
          .then(() => {
            if (isActive(run)) return handler(event);
          })
          .catch((error) => {
            if (logger && typeof logger.error === "function") logger.error(error);
            cancelRun(kind);
          });
      }

      function removeOwnedHook(kind, expectedHook) {
        const current = kind === "daily" ? dailyHook : sweepHook;
        const hook = expectedHook === undefined ? current : expectedHook;
        if (hook == null || current !== hook) return;
        if (kind === "daily") dailyHook = undefined;
        else sweepHook = undefined;
        if (typeof WG.remove_hook === "function") WG.remove_hook(hook);
      }

      function cancelRun(kind, removeHook = true) {
        const run = kind === "daily" ? dailyRun : kind === "qa" ? qaRun : sweepRun;
        if (!run) return;
        run.active = false;
        clearRunTimers(run);
        if (kind === "daily") {
          if (removeHook) removeOwnedHook("daily", run.hookId);
          dailyRun = undefined;
        } else if (kind === "qa") qaRun = undefined;
        else {
          if (removeHook) removeOwnedHook("sweep", run.hookId);
          sweepRun = undefined;
        }
        settle(run.completion, false);
      }

      function finishDailyWorkflow(expectedHook) {
        const run = dailyRun;
        if (!run || (expectedHook !== undefined && run.hookId !== expectedHook))
          return false;
        run.active = false;
        clearRunTimers(run);
        removeOwnedHook("daily", run.hookId);
        dailyRun = undefined;
        settle(run.completion, true);
        return true;
      }

      function finishSweepWorkflow(expectedHook) {
        const run = sweepRun;
        if (!run || (expectedHook !== undefined && run.hookId !== expectedHook))
          return false;
        run.active = false;
        clearRunTimers(run);
        removeOwnedHook("sweep", run.hookId);
        sweepRun = undefined;
        settle(run.completion, true);
        return true;
      }

      function resetDailyWorkflows() {
        sessionGeneration += 1;
        cancelRun("daily");
        cancelRun("qa");
        cancelRun("sweep");
        removeOwnedHook("daily");
        removeOwnedHook("sweep");
      }

      function oneKeyDaily() {
        requireRuntimeContext();
        if (isActive(dailyRun)) return dailyRun.execution;
        const run = {
          active: true,
          session: sessionGeneration,
          completion: createDeferred(),
          groveCount: 0,
        };
        dailyRun = run;
        messageAppend(
          "本脚本会自动执行师门及自动进退小树林,请确保精力足够再执行,请不要点击任务菜单",
          1,
        );
        const handleDailyEvent = async (event) => {
          if (!isActive(run) || event.dialog !== "tasks" || !event.items) return;
          let description = "";
          let status = "";
          for (const item of event.items) {
            if (item.id === "signin") {
              description = item.desc;
              status = item.state;
            }
          }
          if (3 == status) {
            messageAppend("日常已完成", 1);
            schedule(run, 1, () => finishDailyWorkflow(run.hookId));
          } else {
            const parts = description
              .replace(/<(?!\/?p\b)[^>]+>/gi, "")
              .split("精力消耗");
            let masterRemaining = parts[0].match("：([^%]+)/20")[1];
            const energySpent = parts[1].match("：([^%]+)/200")[1];
            masterRemaining = 20 - parseInt(masterRemaining);
            run.groveCount = 20 - parseInt(energySpent) / 10;
            messageAppend(
              "还需要" +
                masterRemaining +
                "次师门任务," +
                run.groveCount +
                "次副本,才可签到",
            );
            if (masterRemaining != 0) {
              jquery(".sm_button").text("停止(Q)");
              WG.sm_state = 0;
              schedule(run, 200, () => WG.smTask());
            } else WG.sm_state = -1;
          }
        };
        run.hookId = WG.add_hook("dialog", (event) =>
          enqueue(run, "daily", handleDailyEvent, event),
        );
        dailyHook = run.hookId;
        run.execution = (async () => {
          try {
            WG.SendCmd("tasks");
            if (!(await wait(run, 2e3))) return false;
            while (isActive(run) && 0 <= WG.sm_state) {
              if (!(await wait(run, 2e3))) return false;
            }
            if (!isActive(run)) return false;
            if (run.groveCount <= 0) {
              WG.Send("taskover signin");
              messageAppend("<hiy>任务完成</hiy>");
              finishDailyWorkflow(run.hookId);
              WG.timer_close();
              WG.needGrove = 0;
              WG.fbnum = 0;
            } else WG.grove_auto(run.groveCount);
            return true;
          } catch (error) {
            cancelRun("daily");
            throw error;
          }
        })();
        return run.execution;
      }

      function oneKeyQA() {
        requireRuntimeContext();
        if (isActive(qaRun)) return qaRun.execution;
        const run = { active: true, session: sessionGeneration };
        qaRun = run;
        run.execution = (async () => {
          try {
            WG.Send("stopstate");
            WG.sm_state = -1;
            const task = legacy.getMasterTasks()[legacy.getFamily()];
            const place = task.sxplace;
            const master = task.sx;
            if (place.indexOf("-") === 0) WG.Send(place.replace("-", ""));
            else WG.go(place);
            if (!(await wait(run, 2e3))) return false;
            WG.SendCmd(
              'select $findPlayerByName("' +
                master +
                '");$wait 200;ask2 $findPlayerByName("' +
                master +
                '")',
            );
            if (!(await wait(run, 1e3))) return false;
            run.active = false;
            if (qaRun === run) qaRun = undefined;
            return true;
          } catch (error) {
            cancelRun("qa");
            throw error;
          }
        })();
        return run.execution;
      }

      function oneKeySD() {
        requireRuntimeContext();
        if (isActive(sweepRun)) return;
        const run = {
          active: true,
          session: sessionGeneration,
          completion: createDeferred(),
          completed: 0,
        };
        sweepRun = run;
        messageAppend(
          "本脚本自动执行购买扫荡符,进行追捕扫荡,请确保元宝足够，请不要点击任务菜单\n注意! 超过上限会自动放弃",
          1,
        );
        const handleSweepEvent = async (event) => {
          if (!isActive(run)) return;
          let npcId = 0;
          let attempts = 2;
          if (event.type === "text" && event.msg) {
            npcId = WG.getIdByName("程药发");
            if (event.msg.indexOf("无法快速完") >= 0) {
              WG.Send("select " + npcId);
              if (!(await wait(run, 200))) return;
              WG.Send("ask1 " + npcId);
              if (!(await wait(run, 200))) return;
              WG.Send("ask2 " + npcId);
              if (!(await wait(run, 200))) return;
              while (attempts) {
                attempts--;
                if (logger && typeof logger.log === "function") logger.log("ask3 " + npcId);
                WG.Send("ask3 " + npcId);
                if (!(await wait(run, 1e3))) return;
              }
            }
            if (!isActive(run)) return;
            if (event.msg.indexOf("追捕任务完成了") >= 0) {
              const cleanMessage = event.msg.replace(/<(?!\/?p\b)[^>]+>/gi, "");
              run.completed = cleanMessage.match("目前完成([^%]+)/20")[1];
              if (run.completed == "20") {
                messageAppend("追捕已完成", 1);
                if (!(await wait(run, 2e3))) return;
                finishSweepWorkflow(run.hookId);
              }
            }
            if (!isActive(run)) return;
            if (
              event.msg.indexOf("多历练一番") >= 0 ||
              event.msg.indexOf("没有那么多元宝") >= 0
            ) {
              messageAppend("等级太低无法接取追捕,自动取消", 1);
              finishSweepWorkflow(run.hookId);
            }
            if (!isActive(run)) return;
            if (event.msg.indexOf("你的追捕任务已经完成了") >= 0) {
              messageAppend("追捕已完成", 1);
              finishSweepWorkflow(run.hookId);
            }
            if (!isActive(run)) return;
            if (event.msg.indexOf("你的扫荡符不够。") >= 0) {
              npcId = WG.getIdByName("程药发");
              messageAppend(
                "还需要" + run.completed + "次扫荡,自动购入" + run.completed + "张扫荡符",
              );
              WG.Send("shop 0 " + run.completed);
              if (!(await wait(run, 1e3))) return;
              while (attempts) {
                attempts--;
                if (logger && typeof logger.log === "function") logger.log("ask3 " + npcId);
                WG.Send("ask3 " + npcId);
                if (!(await wait(run, 1e3))) return;
              }
            }
          }
          if (!isActive(run) || event.dialog !== "tasks" || !event.items) return;
          let description = "";
          for (const item of event.items)
            if (item.id === "yamen") description = item.desc;
          const cleanDescription = description.replace(/<(?!\/?p\b)[^>]+>/gi, "");
          run.completed = cleanDescription.match("完成([^%]+)/20")[1];
          run.completed = 20 - parseInt(run.completed);
          if (run.completed == 0) {
            messageAppend("追捕已完成", 1);
            finishSweepWorkflow(run.hookId);
          } else {
            do {
              WG.go("扬州城-衙门正厅");
              if (!(await wait(run, 1e3))) return;
            } while (!WG.getIdByName("程药发"));
            if (isActive(run)) WG.SendCmd('ask3 $pname("程药发")');
          }
        };
        run.hookId = WG.add_hook(["dialog", "text"], (event) =>
          enqueue(run, "sweep", handleSweepEvent, event),
        );
        sweepHook = run.hookId;
        try {
          WG.Send("stopstate");
          WG.SendCmd("tasks");
        } catch (error) {
          cancelRun("sweep");
          throw error;
        }
      }

      function waitDailyWorkflow() {
        return dailyRun ? dailyRun.completion.promise : Promise.resolve(true);
      }

      function waitSweepWorkflow() {
        return sweepRun ? sweepRun.completion.promise : Promise.resolve(true);
      }

      function setPublicHook(kind, value) {
        const current = kind === "daily" ? dailyHook : sweepHook;
        if (value === current) return;
        if (kind === "daily") {
          cancelRun("daily", false);
          dailyHook = value;
        } else {
          cancelRun("sweep", false);
          sweepHook = value;
        }
      }

      for (const publicName of ["daily_hook", "sd_hook"])
        previousDescriptors[publicName] = Object.getOwnPropertyDescriptor(WG, publicName);
      Object.defineProperties(WG, {
        daily_hook: {
          configurable: true,
          enumerable: true,
          get: () => dailyHook,
          set: (value) => setPublicHook("daily", value),
        },
        sd_hook: {
          configurable: true,
          enumerable: true,
          get: () => sweepHook,
          set: (value) => setPublicHook("sweep", value),
        },
      });
      const loginHook = WG.add_hook("login", resetDailyWorkflows);
      const exports = {
        oneKeyDaily,
        oneKeyQA,
        oneKeySD,
        waitDailyWorkflow,
        waitSweepWorkflow,
        finishDailyWorkflow,
        resetDailyWorkflows,
        getDailyWorkflowGeneration: () => sessionGeneration,
      };
      Object.assign(WG, exports);

      return {
        resetDailyWorkflows,
        destroy() {
          if (loginHook != null && typeof WG.remove_hook === "function") WG.remove_hook(loginHook);
          resetDailyWorkflows();
          for (const publicName of ["daily_hook", "sd_hook"]) {
            if (previousDescriptors[publicName])
              Object.defineProperty(WG, publicName, previousDescriptors[publicName]);
            else delete WG[publicName];
          }
          for (const [name, value] of Object.entries(exports))
            if (WG[name] === value) WG[name] = undefined;
        },
      };
    },
  );
})(window);
