/** Warehouse and backpack color-group sorting workflows. */
(function registerWarehouseSorting(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "warehouse-sorting",
    function install(context) {
      const { WG, legacy, messageAppend } = context;
      const clone =
        context.clone ||
        (typeof global.structuredClone === "function"
          ? global.structuredClone.bind(global)
          : (value) => JSON.parse(JSON.stringify(value)));
      const colorGroups = [
        "wht",
        "hig",
        "hic",
        "hiy",
        "hiz",
        "hio",
        "red",
        "hir",
        "ord",
      ];
      let loginHook;

      function cancelSorting() {
        if (WG.sort_hook != null) WG.remove_hook(WG.sort_hook);
        WG.sort_hook = undefined;
      }

      function buildCommands(items, mode) {
        const groups = [];
        for (const item of items) {
          let groupIndex = 0;
          for (const color of colorGroups) {
            if (item.name.toLocaleLowerCase().indexOf(color) >= 0)
              groups[groupIndex]
                ? groups[groupIndex].push(item)
                : (groups[groupIndex] = [item]);
            groupIndex += 1;
          }
        }
        let commands = "";
        for (const group of groups) {
          if (!group) continue;
          const actions = [];
          if (mode === "warehouse")
            for (const item of group)
              actions.push("qu " + item.count + " " + item.id + ";$wait 350;");
          else
            for (const item of group)
              actions.push(
                "store " + item.count + " " + item.id + ";$wait 350;",
              );
          for (const item of group.sort((left, right) => left.name.length - right.name.length))
            actions.push(
              (mode === "warehouse" ? "store " : "qu ") +
                item.count +
                " " +
                item.id +
                (mode === "warehouse" ? ";$wait 350;" : ";$wait 350;"),
            );
          commands += actions.join("");
        }
        return commands + "look3 1";
      }

      function startSorting(mode) {
        const isWarehouse = mode === "warehouse";
        const title = isWarehouse ? "仓库" : "背包";
        const dialog = isWarehouse ? "list" : "pack";
        if (WG.sort_hook != null) {
          messageAppend("<hio>" + title + "排序</hio>运行中");
          messageAppend("<hio>" + title + "排序</hio>手动结束");
          cancelSorting();
          return;
        }
        WG.sort_hook = WG.add_hook(["dialog", "text"], (event) => {
          if (event.type === "dialog" && event.dialog === dialog) {
            const data = WG.deserializePackData(clone(event));
            const items = isWarehouse ? data.stores : data.items;
            if (items != null) WG.SendCmd(buildCommands(items, mode));
          } else if (
            event.type === "text" &&
            String(event.msg || "").indexOf("没有这个玩家") >= 0
          ) {
            messageAppend(
              isWarehouse
                ? "<hio>仓库排序</hio>完成"
                : "<hio>背包排序</hio>完成,执行后请刷新并重新登录",
            );
            cancelSorting();
          }
        });
        messageAppend("<hio>" + title + "排序</hio>开始");
        const started = WG.sort_hook;
        const requestItems = () => {
          if (WG.sort_hook !== started) return;
          WG.Send(isWarehouse ? "store" : "pack");
          if (!isWarehouse) legacy.getKeyApi?.()?.dialog_close?.();
        };
        if (WG.at("扬州城-钱庄")) {
          requestItems();
          return Promise.resolve(true);
        }
        return Promise.resolve(WG.go("扬州城-钱庄"))
          .then(() =>
            typeof WG.waitUntilAt === "function"
              ? WG.waitUntilAt("扬州城-钱庄")
              : true,
          )
          .then((arrived) => {
            if (WG.sort_hook !== started) return false;
            if (arrived === false) {
              messageAppend("<hio>" + title + "排序</hio>未能到达钱庄，已结束");
              cancelSorting();
              return false;
            }
            requestItems();
            return true;
          });
      }

      Object.assign(WG, {
        sort_hook: undefined,
        cancelSorting,
        sort_all: function () {
          return startSorting("warehouse");
        },
        sort_all_bag: function () {
          return startSorting("bag");
        },
      });
      loginHook = WG.add_hook("login", cancelSorting);

      return {
        destroy() {
          if (loginHook != null) WG.remove_hook(loginHook);
          loginHook = undefined;
          cancelSorting();
        },
      };
    },
  );
})(window);
