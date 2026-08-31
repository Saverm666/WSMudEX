/** Master-task state machine and warehouse retrieval with legacy WG compatibility. */
(function registerMasterTaskAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "master-task-automation",
    function install(context) {
      const WG = context.WG;
      const legacy = context.legacy || {};
      const jquery = context.jquery || global.$;
      const messageAppend = context.messageAppend || global.messageAppend;
      const confirmAction = context.confirm || legacy.confirm;
      const logger = context.logger || global.console || { error: () => {} };
      const timers = context.timers || {
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
      };
      const clone =
        context.clone ||
        global.structuredClone ||
        ((value) => JSON.parse(JSON.stringify(value)));

      const state = {
        smState: WG.sm_state,
        smItem: WG.sm_item,
        smItemName: undefined,
        smStore: WG.sm_store,
        smBuyNum: undefined,
        lastBuy: undefined,
        ungetStore: false,
        kalaCount: 0,
        smHook: undefined,
        ytHook: undefined,
        quHook: undefined,
      };

      let generation = 0;
      let quGeneration = 0;
      let smLoopPromise;
      let quTimer;
      const masterTimers = new Set();
      const waitResolvers = new Map();
      const pendingQuResolves = new Set();

      const get = (name, fallback) =>
        typeof legacy[name] === "function" ? legacy[name]() : fallback;
      const getFamily = () => get("getFamily", undefined);
      const getMasterTasks = () => get("getMasterTasks", {}) || {};
      const getSmLoser = () => get("getSmLoser", undefined);
      const getSmGetStore = () => get("getSmGetStore", undefined);
      const getSmAny = () => get("getSmAny", undefined);
      const getSmPrice = () => get("getSmPrice", undefined);
      const getStoreList = () => get("getStoreList", []) || [];
      const getPackGoods = () => get("getPackGoods", {}) || {};
      const getProcess = () => get("getProcess", undefined);

      function requireRuntimeContext() {
        if (
          typeof jquery !== "function" ||
          typeof messageAppend !== "function" ||
          !timers ||
          typeof timers.setTimeout !== "function" ||
          typeof timers.clearTimeout !== "function"
        ) {
          throw new TypeError(
            "师门自动化需要显式 jquery、messageAppend 和 timers 上下文",
          );
        }
      }

      function clearTimer(timerId) {
        if (timerId == null) return;
        timers.clearTimeout(timerId);
        masterTimers.delete(timerId);
        const resolve = waitResolvers.get(timerId);
        if (resolve) {
          waitResolvers.delete(timerId);
          resolve(false);
        }
        if (quTimer === timerId) quTimer = undefined;
      }

      function clearMasterTimers() {
        for (const timerId of masterTimers) timers.clearTimeout(timerId);
        masterTimers.clear();
        for (const resolve of waitResolvers.values()) resolve(false);
        waitResolvers.clear();
      }

      function clearTimers() {
        clearMasterTimers();
        if (quTimer != null) timers.clearTimeout(quTimer);
        quTimer = undefined;
      }

      function wait(delay, runGeneration) {
        requireRuntimeContext();
        return new Promise((resolve) => {
          let timerId;
          timerId = timers.setTimeout(() => {
            masterTimers.delete(timerId);
            waitResolvers.delete(timerId);
            resolve(runGeneration === generation);
          }, delay);
          masterTimers.add(timerId);
          waitResolvers.set(timerId, resolve);
        });
      }

      function removeHook(field) {
        const hookId = state[field];
        state[field] = undefined;
        if (hookId != null && typeof WG.remove_hook === "function") {
          WG.remove_hook(hookId);
        }
      }

      function removeMasterHook() {
        removeHook("smHook");
      }

      function removeQuHook() {
        removeHook("quHook");
      }

      function cancelQuRequest() {
        quGeneration += 1;
        removeQuHook();
        clearTimer(quTimer);
        for (const resolve of pendingQuResolves) resolve(false);
        pendingQuResolves.clear();
      }

      function stopMasterLoop() {
        generation += 1;
        clearMasterTimers();
        removeMasterHook();
        cancelQuRequest();
      }

      function setButtonText(text) {
        requireRuntimeContext();
        jquery(".sm_button").text(text);
      }

      async function doSmTask(taskState) {
        requireRuntimeContext();
        const taskGeneration = generation;
        try {
          switch (taskState) {
            case 0:
              WG.go(getMasterTasks()[getFamily()].place);
              WG.sm_state = 1;
              if (WG.kala_count > 2) {
                WG.clean_id_all(false);
                if (WG.kala_count > 5) {
                  WG.kala_count = 0;
                  WG.sm_state = 0;
                  setButtonText("师门(Q)");
                  messageAppend("错误:师门任务错误,脚本将重试");
                }
              }
              return;
            case 1: {
              let npcId = null;
              const roomItems = jquery(".room_items .room-item");
              const npcName = getMasterTasks()[getFamily()].npc;
              for (const item of roomItems) {
                if (item.lastElementChild.innerText.indexOf("[") >= 0) {
                  if (
                    item.lastElementChild.lastElementChild.lastElementChild
                      .lastElementChild == null &&
                    item.lastElementChild.firstChild.nodeType === 3 &&
                    item.lastElementChild.firstChild.nextSibling.tagName ===
                      "SPAN" &&
                    item.lastElementChild.innerText.split("[")[0] === npcName
                  ) {
                    npcId = jquery(item).attr("itemid");
                  }
                } else if (
                  item.lastElementChild.lastElementChild == null &&
                  item.lastElementChild.innerText === npcName
                ) {
                  npcId = jquery(item).attr("itemid");
                }
              }
              if (npcId != null) {
                WG.Send("task sm " + npcId);
                WG.Send("task sm " + npcId);
                WG.sm_state = 2;
              } else {
                WG.update_npc_id();
                WG.clean_id_all(false);
                WG.sm_state = 0;
                WG.kala_count = WG.kala_count + 1;
              }
              return;
            }
            case 2: {
              const loser = getSmLoser();
              const giveup = jquery("span[cmd$='giveup']:last").parent().prev();
              if (giveup.length === 0) {
                WG.sm_state = 0;
                WG.kala_count = WG.kala_count + 1;
              }
              const itemText = giveup.html();
              const itemTag = giveup[0].localName;
              const itemMarkup = giveup[0].outerHTML;
              if (WG.ungetStore) {
                if ("开" === loser) {
                  jquery("span[cmd$='giveup']:last").click();
                  messageAppend("放弃任务");
                  WG.ungetStore = false;
                  WG.sm_state = 0;
                  WG.kala_count = 0;
                  return;
                }
                if ("关" === loser) {
                  WG.sm_state = -1;
                  WG.kala_count = 0;
                  setButtonText("师门(Q)");
                  return;
                }
              }
              let candidate = jquery("span[cmd$='giveup']:last").prev();
              for (let index = 0; index < 6; index += 1) {
                if (candidate.children().html()) {
                  if (candidate.html().indexOf(itemMarkup) >= 0) {
                    candidate.click();
                    messageAppend("自动上交" + itemMarkup);
                    WG.sm_state = 0;
                    WG.kala_count = 0;
                    return;
                  }
                  candidate = candidate.prev();
                }
              }
              const goods = getPackGoods();
              WG.sm_item =
                itemText === "金创药" || itemText === "引气丹"
                  ? goods[itemTag + itemText]
                  : goods[itemText];
              if (
                itemMarkup != null &&
                ((WG.sm_itemx = itemMarkup),
                WG.inArray(itemMarkup, getStoreList())) &&
                "开" === getSmGetStore()
              ) {
                if (
                  itemMarkup.indexOf("hiz") < 0 &&
                  itemMarkup.indexOf("hio") < 0
                ) {
                  messageAppend("自动仓库取" + itemMarkup);
                  WG.sm_store = itemMarkup;
                  WG.sm_state = 4;
                  return;
                }
                const anySetting = getSmAny();
                if (typeof legacy.setSmAny === "function") {
                  legacy.setSmAny(anySetting);
                }
                if (
                  "开" === anySetting ||
                  typeof confirmAction === "function" &&
                  confirmAction("您确定要交稀有物品吗")
                ) {
                  messageAppend("自动仓库取" + itemMarkup);
                  WG.sm_store = itemMarkup;
                  WG.sm_state = 4;
                  return;
                }
              }
              if (WG.sm_item != null && itemMarkup.indexOf(WG.sm_item.type) >= 0) {
                if (WG.smbuyNum == null) {
                  WG.smbuyNum = 0;
                  WG.kala_count = WG.kala_count + 1;
                } else if (WG.smbuyNum > 3) {
                  WG.sm_state = 5;
                }
                WG.go(WG.sm_item.place);
                messageAppend("自动购买" + itemMarkup);
                WG.sm_state = 3;
              } else {
                WG.sm_state = 5;
              }
              return;
            }
            case 3:
              WG.go(WG.sm_item.place);
              if (WG.buy(WG.sm_item)) {
                if (
                  ((WG.sm_state = 0) == WG.smbuyNum &&
                    (WG.lastBuy = WG.sm_item),
                  WG.lastBuy == WG.sm_item)
                ) {
                  WG.smbuyNum = WG.smbuyNum + 1;
                }
              }
              return;
            case 4: {
              const loser = getSmLoser();
              WG.go("扬州城-钱庄");
              return new Promise((resolve) => {
                const finish = (found) => {
                  pendingQuResolves.delete(resolve);
                  if (taskGeneration !== generation) {
                    resolve(false);
                    return;
                  }
                  if (found) {
                    WG.sm_state = 0;
                  } else {
                    messageAppend("无法取" + WG.sm_store);
                    if (
                      WG.sm_item != null &&
                      WG.sm_store.indexOf(WG.sm_item.type) >= 0
                    ) {
                      WG.go(WG.sm_item.place);
                      messageAppend("自动购买" + WG.sm_store);
                      WG.sm_state = 3;
                    } else if ("开" === loser) {
                      WG.ungetStore = true;
                      WG.sm_state = 0;
                    } else {
                      WG.sm_state = 5;
                    }
                  }
                  resolve(true);
                };
                WG.qu(WG.sm_store, finish);
                pendingQuResolves.add(resolve);
              });
            }
            case 5: {
              const loser = getSmLoser();
              if ("开" === getSmPrice()) {
                const tokens = [{}, {}, {}, {}, {}];
                let candidate = jquery("span[cmd$='giveup']:last").prev();
                for (let index = 0; index < 6; index += 1) {
                  if (
                    candidate.children().html() &&
                    candidate.html().indexOf("放弃") < 0 &&
                    candidate.html().indexOf("令牌") >= 0
                  ) {
                    if (candidate.html().indexOf("hig") >= 0) tokens[0] = candidate;
                    if (candidate.html().indexOf("hic") >= 0) tokens[1] = candidate;
                    if (candidate.html().indexOf("hiy") >= 0) tokens[2] = candidate;
                    if (candidate.html().indexOf("hiz") >= 0) tokens[3] = candidate;
                    if (candidate.html().indexOf("hio") >= 0) tokens[4] = candidate;
                  }
                  candidate = candidate.prev();
                }
                for (const token of tokens) {
                  if (token.html != null) {
                    token.click();
                    messageAppend("自动上交牌子");
                    WG.sm_state = 0;
                    WG.kala_count = 0;
                    return;
                  }
                }
                messageAppend("没有牌子并且无法购买");
                WG.smbuyNum = null;
                if ("开" === loser) {
                  jquery("span[cmd$='giveup']:last").click();
                  messageAppend("放弃任务");
                  WG.sm_state = 0;
                  WG.kala_count = 0;
                } else {
                  WG.sm_state = -1;
                  setButtonText("师门(Q)");
                }
              } else {
                messageAppend("无法提交" + WG.sm_itemx);
                WG.smbuyNum = null;
                if ("关" === loser) {
                  WG.sm_state = -1;
                  setButtonText("师门(Q)");
                } else if ("开" === loser) {
                  jquery("span[cmd$='giveup']:last").click();
                  messageAppend("放弃任务");
                  WG.sm_state = 0;
                  WG.kala_count = 0;
                }
              }
              return;
            }
            default:
              return;
          }
        } catch (error) {
          logger.error(error);
        }
      }

      function installMasterHook(runGeneration) {
        if (state.smHook != null) return;
        state.smHook = WG.add_hook("text", (event) => {
          if (
            runGeneration !== generation ||
            !event ||
            typeof event.msg !== "string"
          ) {
            return;
          }
          if (
            event.msg.indexOf("辛苦了， 你先去休息") >= 0 ||
            event.msg.indexOf("和本门毫无瓜葛") >= 0 ||
            event.msg.indexOf("你没有") >= 0
          ) {
            WG.Send("taskover signin");
            WG.sm_state = -1;
            setButtonText("师门(Q)");
            removeMasterHook();
          }
        });
      }

      async function smTask() {
        if (smLoopPromise) return smLoopPromise;
        const runGeneration = generation;
        installMasterHook(runGeneration);
        const loopPromise = (async () => {
          try {
            while (runGeneration === generation && WG.sm_state !== -1) {
              await doSmTask(WG.sm_state);
              if (runGeneration !== generation || WG.sm_state === -1) break;
              if (!(await wait(1e3, runGeneration))) break;
            }
          } catch (error) {
            logger.error(error);
          } finally {
            if (runGeneration === generation) removeMasterHook();
            if (smLoopPromise === loopPromise) smLoopPromise = undefined;
          }
        })();
        smLoopPromise = loopPromise;
        return loopPromise;
      }

      async function smButton() {
        if (WG.sm_state >= 0) {
          WG.sm_state = -1;
          setButtonText("师门(Q)");
          return;
        }
        WG.sm_state = 0;
        setButtonText("停止(Q)");
        return smTask();
      }

      async function sellAllTask() {
        const process = getProcess();
        if (process && process.leve) {
          WG.Send("events boss{$Process.level} ok");
        }
        WG.Send("task sm fin;task yamen fin;task wudao fin");
      }

      function qu(storeName, callback) {
        requireRuntimeContext();
        cancelQuRequest();
        quGeneration += 1;
        const runGeneration = quGeneration;
        let found = false;
        state.quHook = WG.add_hook("dialog", (event) => {
          if (
            runGeneration !== quGeneration ||
            !event ||
            event.dialog == null ||
            event.stores == null
          ) {
            return;
          }
          const data = WG.deserializePackData(clone(event));
          for (const store of data.stores || []) {
            if (
              store &&
              store.name &&
              store.name.toLocaleLowerCase().indexOf(storeName) >= 0
            ) {
              found = true;
              WG.Send("qu 1 " + store.id);
              break;
            }
          }
          removeQuHook();
          let timerId;
          timerId = timers.setTimeout(() => {
            if (quTimer === timerId) quTimer = undefined;
            if (runGeneration === quGeneration && typeof callback === "function") {
              callback(found);
            }
          }, 300);
          quTimer = timerId;
        });
        WG.SendCmd("store");
      }

      function resetForRole() {
        generation += 1;
        clearTimers();
        removeMasterHook();
        cancelQuRequest();
        state.smState = -1;
        state.smItem = null;
        state.smItemName = undefined;
        state.smStore = null;
        state.smBuyNum = undefined;
        state.lastBuy = undefined;
        state.ungetStore = false;
        state.kalaCount = 0;
        smLoopPromise = undefined;
        if (typeof jquery === "function") jquery(".sm_button").text("师门(Q)");
      }

      const fieldMap = {
        sm_state: "smState",
        sm_item: "smItem",
        sm_itemx: "smItemName",
        sm_store: "smStore",
        smbuyNum: "smBuyNum",
        lastBuy: "lastBuy",
        ungetStore: "ungetStore",
        kala_count: "kalaCount",
        smhook: "smHook",
        ythook: "ytHook",
        qu_hook: "quHook",
      };
      const previousDescriptors = {};
      for (const publicName of Object.keys(fieldMap)) {
        previousDescriptors[publicName] = Object.getOwnPropertyDescriptor(
          WG,
          publicName,
        );
      }
      for (const [publicName, privateName] of Object.entries(fieldMap)) {
        Object.defineProperty(WG, publicName, {
          configurable: true,
          enumerable: true,
          get: () => state[privateName],
          set: (value) => {
            state[privateName] = value;
            if (publicName === "sm_state" && value < 0) stopMasterLoop();
          },
        });
      }

      const loginHook = WG.add_hook("login", resetForRole);
      WG.doSmTask = doSmTask;
      WG.smTask = smTask;
      WG.sm_button = smButton;
      WG.sell_all_task = sellAllTask;
      WG.qu = qu;
      WG.resetMasterTaskAutomation = resetForRole;

      return {
        resetForRole,
        destroy() {
          if (loginHook != null) WG.remove_hook(loginHook);
          resetForRole();
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
          if (WG.doSmTask === doSmTask) WG.doSmTask = undefined;
          if (WG.smTask === smTask) WG.smTask = undefined;
          if (WG.sm_button === smButton) WG.sm_button = undefined;
          if (WG.sell_all_task === sellAllTask) WG.sell_all_task = undefined;
          if (WG.qu === qu) WG.qu = undefined;
          if (WG.resetMasterTaskAutomation === resetForRole) {
            WG.resetMasterTaskAutomation = undefined;
          }
        },
      };
    },
  );
})(window);
