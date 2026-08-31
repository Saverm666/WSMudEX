/** NPC, shop, warehouse and combat-statistics data maintenance. */
(function registerDataMaintenance(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("data-maintenance", function install(context) {
    const { WG, G, legacy, messageAppend } = context;

    Object.assign(WG, {
      update_goods_id: function () {
        const goods = legacy.getPackGoods();
        const list = $(".dialog-list > .obj-list:first");
        if (!list.length) {
          messageAppend("未检测到商品清单");
          return false;
        }
        messageAppend("检测到商品清单");
        for (const rawItem of list.children()) {
          const item = $(rawItem);
          const id = item.attr("obj");
          const firstChild = item.children()[0];
          const name = $(firstChild).html();
          const type = firstChild.localName;
          if (name === "金创药" || name === "引气丹") {
            const key = type + name;
            if (goods[key]) goods[key].id = id;
            else
              goods[key] = {
                id,
                type,
                sales: "药铺老板 平一指",
                place: "扬州城-药铺",
              };
          } else goods[name].id = id;
          messageAppend("<" + type + ">" + name + "</" + type + ">:" + id);
        }
        GM_setValue("goods", goods);
        return true;
      },

      update_npc_id: function () {
        const npcs = legacy.getNpcs();
        for (const element of $(".room_items .room-item")) {
          let name = null;
          if (element.lastElementChild.innerText.indexOf("[") >= 0) {
            if (
              element.lastElementChild.lastElementChild.lastElementChild
                .lastElementChild == null &&
              element.lastElementChild.firstChild.nodeType === 3 &&
              element.lastElementChild.firstChild.nextSibling.tagName === "SPAN"
            )
              name = element.lastElementChild.innerText.split("[")[0];
          } else if (element.lastElementChild.lastElementChild == null) {
            name = element.lastElementChild.innerText;
          }
          if (name == null) continue;
          npcs[name] = $(element).attr("itemid");
          messageAppend(name + " 的ID:" + npcs[name]);
        }
        GM_setValue("npcs", npcs);
      },

      update_id_all: function () {
        GM_setValue("goods", legacy.getGoods());
        WG.SendCmd("stopstate");
        const goods = legacy.getPackGoods();
        const sellersByPlace = {};
        Object.keys(goods).forEach(function (name) {
          if (sellersByPlace[goods[name].place] == null)
            sellersByPlace[goods[name].place] = goods[name].sales;
        });
        const places = Object.keys(sellersByPlace);
        let placeIndex = 0;
        let state = 0;
        let place;
        let seller;
        const timer = setInterval(function () {
          switch (state) {
            case 0:
              if (placeIndex >= places.length) {
                messageAppend("初始化完成");
                WG.go("武当派-广场");
                clearInterval(timer);
              } else {
                place = places[placeIndex];
                seller = sellersByPlace[place];
                WG.go(place);
                state = 1;
              }
              break;
            case 1:
              WG.update_npc_id();
              WG.Send("list " + legacy.getNpcs()[seller]);
              state = 2;
              break;
            case 2:
              if (WG.update_goods_id()) {
                state = 0;
                placeIndex += 1;
              } else state = 1;
          }
        }, 1000);
      },

      clean_id_all: function (showAlert = true) {
        GM_setValue("goods", legacy.getGoods());
        legacy.resetPackGoods();
        if (showAlert) alert("清空完毕,请刷新一下页面");
      },

      update_store_hook: undefined,
      wsdelaytest: async function () {
        G.wsdelaySetTime = Date.now();
        G.wsdelaySetCount = 1;
        G.wsdelay = undefined;
        WG.SendCmd("test");
      },

      update_store: async function () {
        WG.update_store_hook = WG.add_hook(["dialog", "text"], function (event) {
          if (event.dialog === "list" && event.max_store_count) {
            const data = WG.deserializePackData(structuredClone(event));
            messageAppend("<hio>仓库信息获取</hio>开始");
            const storeList = data.stores.map(function (item) {
              return item.name.toLowerCase();
            });
            const value = storeList.join(",");
            legacy.replaceStoreList(storeList);
            legacy.setCustomStoreList(value);
            $("#store_info").val(value);
            GM_setValue(legacy.getRoleId() + "_zdy_item_store", value);
          } else if (
            event.type === "text" &&
            String(event.msg || "").indexOf("没有这个玩家") >= 0
          ) {
            messageAppend("<hio>仓库信息获取</hio>完成");
            $(".dialog-close").click();
            WG.remove_hook(WG.update_store_hook);
            WG.update_store_hook = undefined;
          }
        });
        WG.SendCmd("$to 扬州城-广场;$to 扬州城-钱庄;look3 1");
      },

      clean_dps: function () {
        const stats = legacy.getDpsState();
        if (!stats.lock || stats.battleTime === 0) return;
        const attacks = stats.normalCount + stats.criticalCount;
        const damage = stats.normalDamage + stats.criticalDamage;
        let seconds = (Date.now() - stats.battleTime.getTime()) / 1000;
        let damagePerSecond = damage / seconds;
        let attacksPerSecond = attacks / seconds;
        if (seconds < 1) {
          damagePerSecond = damage;
          attacksPerSecond = attacks;
        }
        setTimeout(function () {
          messageAppend(
            `⚔️战斗过程分析:
                    ⏱️战斗时长:${seconds}秒
                    ⚔️普通攻击:${stats.normalCount}次
                    ⚔️普通伤害:${legacy.formatChineseUnit(stats.normalDamage)}
                    🌟暴击攻击:${stats.criticalCount}次
                    🌟暴击伤害:${legacy.formatChineseUnit(stats.criticalDamage)}
                    ⚔️总计攻击:${attacks}次
                    ⚔️总计伤害:${legacy.formatChineseUnit(damage)}
                    ⏱️每秒伤害:${legacy.formatChineseUnit(damagePerSecond)}
                    ⏱️每秒攻击:${Math.round(attacksPerSecond)}次`,
            4,
          );
          legacy.resetDpsState();
        }, 100);
      },
    });
  });
})(window);
