/** Backpack storage, disassembly and drop cleanup workflow. */
(function registerInventoryCleanup(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "inventory-cleanup",
    function install(context) {
      const { WG, legacy = {}, messageAppend } = context;
      const timers = context.timers || {
        setTimeout: global.setTimeout.bind(global),
        clearTimeout: global.clearTimeout.bind(global),
      };
      const clone =
        context.clone ||
        (typeof global.structuredClone === "function"
          ? global.structuredClone.bind(global)
          : (value) => JSON.parse(JSON.stringify(value)));
      const getStoreList = () => legacy.getStoreList?.() || [];
      const getDropList = () => legacy.getDropList?.() || [];
      const getLockList = () => legacy.getLockList?.() || [];
      const getDisassembleList = () => legacy.getDisassembleList?.() || [];
      const normalizeName = (value) =>
        String(value || "")
          .replace(/<[^>]*>/g, "")
          .trim()
          .toLowerCase();
      let listener;
      let ready = false;
      let loginHook;
      let warehouseReady = false;
      let packRequested = false;
      let startupTimer;

      function setListener(value) {
        listener = value;
      }

      function setReady(value) {
        ready = value;
      }

      Object.defineProperties(WG, {
        packup_listener: {
          configurable: true,
          enumerable: true,
          get: () => listener,
          set: setListener,
        },
        packup_ready: {
          configurable: true,
          enumerable: true,
          get: () => ready,
          set: setReady,
        },
      });

      function cancelCleanup() {
        if (startupTimer != null) {
          timers.clearTimeout(startupTimer);
          startupTimer = undefined;
        }
        if (listener != null && typeof WG.remove_hook === "function") {
          WG.remove_hook(listener);
        }
        listener = undefined;
        ready = false;
        warehouseReady = false;
        packRequested = false;
      }

      function sellAll(storeEnabled = 1, disassembleEnabled = 1, dropEnabled = 1) {
        if (listener != null) {
          messageAppend("<hio>包裹整理</hio>运行中");
          messageAppend("<hio>包裹整理</hio>手动结束");
          cancelCleanup();
          return;
        }

        let warehouseItems = [];
        warehouseReady = false;
        packRequested = false;
        listener = WG.add_hook(["dialog", "text"], (event) => {
          if (event.type === "dialog" && event.dialog === "list") {
            const data = WG.deserializePackData(clone(event));
            if (data.stores != null && !ready) {
              warehouseItems = [];
              for (const storeItem of data.stores) {
                const storeName = normalizeName(storeItem.name);
                let existing = null;
                for (const item of warehouseItems) {
                  if (item.normalizedName === storeName) {
                    existing = item;
                    break;
                  }
                }
                if (existing != null) existing.count += storeItem.count;
                else
                  warehouseItems.push({
                    ...storeItem,
                    normalizedName: storeName,
                  });
              }
              warehouseReady = true;
              if (startupTimer != null) {
                timers.clearTimeout(startupTimer);
                startupTimer = undefined;
              }
              messageAppend("<hio>包裹整理</hio>已取得仓库数据，正在读取背包");
              if (!packRequested) {
                packRequested = true;
                WG.Send("pack");
              }
            }
            return;
          }

          if (event.type === "dialog" && event.dialog === "pack") {
            if (!warehouseReady || !packRequested) return;
            const data = WG.deserializePackData(clone(event));
            messageAppend("<hio>包裹整理</hio>已取得背包数据，正在生成清理命令");
            const commands = [];
            const dropCommands = [];
            if (data.items != null && !ready) {
              const storeList = getStoreList().map(normalizeName);
              const dropList = getDropList().map(normalizeName);
              const lockList = getLockList().map(normalizeName);
              const disassembleList = getDisassembleList().map(normalizeName);
              for (const item of data.items) {
                const lowerName = normalizeName(item.name);
                if (
                  storeList.length !== 0 &&
                  WG.inArray(lowerName, storeList) &&
                  storeEnabled
                ) {
                  if (item.can_eq) {
                    let existing = null;
                    for (const warehouseItem of warehouseItems) {
                      if (warehouseItem.normalizedName === lowerName) {
                        existing = warehouseItem;
                        break;
                      }
                    }
                    if (existing != null) {
                      if (existing.count < 4) {
                        existing.count += item.count;
                        commands.push(`store ${item.count} ${item.id}`, "$wait 350");
                        messageAppend(`<hio>包裹整理</hio>${item.name}储存到仓库`);
                      } else {
                        messageAppend(`<hio>包裹整理</hio>${item.name}超过设置的储存上限`);
                      }
                    } else {
                      warehouseItems.push({
                        ...item,
                        normalizedName: lowerName,
                      });
                      commands.push(`store ${item.count} ${item.id}`, "$wait 350");
                      messageAppend(`<hio>包裹整理</hio>${item.name}储存到仓库`);
                    }
                  } else {
                    commands.push(`store ${item.count} ${item.id}`, "$wait 350");
                    messageAppend(`<hio>包裹整理</hio>${item.name}储存到仓库`);
                  }
                }

                if (
                  WG.inArray(lowerName, dropList) &&
                  dropEnabled &&
                  item.name.indexOf("★") === -1 &&
                  item.name.indexOf("☆") === -1
                ) {
                  if (lockList.indexOf(lowerName) >= 0) continue;
                  dropCommands.push(
                    item.count === 1
                      ? `drop ${item.id}`
                      : `drop ${item.count} ${item.id}`,
                    "$wait 350",
                  );
                  messageAppend(`<hio>包裹整理</hio>${item.name}丢弃`);
                }

                if (
                  disassembleList.length &&
                  WG.inArray(lowerName, disassembleList) &&
                  item.name.indexOf("★") === -1 &&
                  disassembleEnabled
                ) {
                  commands.push(`fenjie ${item.id}`, "$wait 350");
                  messageAppend(`<hio>包裹整理</hio>${item.name}分解`);
                }
              }
              commands.push(
                "$wait 1000",
                "$to 扬州城-杂货铺",
                "sell all",
                "$wait 1000",
                ...dropCommands,
                "look3 1",
              );
              if (commands.length > 0 || ready) {
                WG.SendCmd(commands);
                ready = true;
              }
            }
            return;
          }

          if (
            event.type === "text" &&
            String(event.msg || "").indexOf("没有这个玩家") >= 0
          ) {
            messageAppend("<hio>包裹整理</hio>完成");
            cancelCleanup();
          }
        });
        messageAppend("<hio>包裹整理</hio>开始");
        messageAppend("<hio>包裹整理</hio>正在前往钱庄并请求仓库");
        const started = listener;
        startupTimer = timers.setTimeout(function () {
          if (listener !== started || warehouseReady) return;
          messageAppend("<hir>包裹整理未取得仓库数据，已结束</hir>");
          cancelCleanup();
        }, 12000);
        WG.go("扬州城-钱庄");
        WG.Send("store;pack");
      }

      WG.sell_all = sellAll;
      WG.cancelInventoryCleanup = cancelCleanup;
      loginHook = WG.add_hook("login", cancelCleanup);

      return {
        stop: cancelCleanup,
        destroy() {
          cancelCleanup();
          if (loginHook != null) WG.remove_hook(loginHook);
          loginHook = undefined;
          if (WG.sell_all === sellAll) WG.sell_all = undefined;
          if (WG.cancelInventoryCleanup === cancelCleanup) {
            WG.cancelInventoryCleanup = undefined;
          }
        },
      };
    },
  );
})(window);
