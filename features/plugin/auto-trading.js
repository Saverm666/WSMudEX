/** Automatic pawnshop purchase and configured manual-book selling. */
(function registerAutoTrading(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("auto-trading", function install(context) {
    const { WG, legacy = {}, messageAppend } = context;
    const jquery = context.jquery || global.jQuery || global.$;
    const clone =
      context.clone ||
      (typeof global.structuredClone === "function"
        ? global.structuredClone.bind(global)
        : (value) => JSON.parse(JSON.stringify(value)));
    let pawnshopHook;
    let bookSellHook;

    function configuredNames(value) {
      return String(value || "")
        .split(",")
        .map(normalizeName)
        .filter(Boolean);
    }

    function normalizeName(value) {
      return String(value || "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .toLowerCase();
    }

    function removeHook(name) {
      const hook = name === "pawnshop" ? pawnshopHook : bookSellHook;
      if (hook != null && typeof WG.remove_hook === "function") {
        WG.remove_hook(hook);
      }
      if (name === "pawnshop") {
        pawnshopHook = undefined;
        WG.tnBuy_hook = undefined;
      } else {
        bookSellHook = undefined;
        WG.zxBuy_hook = undefined;
      }
    }

    function finish(name, message) {
      messageAppend(message || "执行结束");
      jquery && jquery(".dialog-close").click();
      removeHook(name);
    }

    async function arrive(target, name) {
      await WG.go(target);
      const arrived =
        typeof WG.waitUntilAt === "function"
          ? await WG.waitUntilAt(target)
          : WG.at(target);
      if (arrived === false) {
        finish(name, `<hio>自动交易</hio>未能到达${target}，已结束`);
        return false;
      }
      return true;
    }

    async function tnBuy() {
      removeHook("pawnshop");
      const wanted = configuredNames(legacy.getAutoBuyList?.());
      if (!wanted.length) {
        messageAppend("<hio>自动购买</hio>未配置购买清单");
        return false;
      }
      pawnshopHook = WG.add_hook(["dialog", "text"], (event) => {
        if (
          event.type === "dialog" &&
          Array.isArray(event.selllist) &&
          String(event.title || "").indexOf("唐楠正在贩卖") >= 0
        ) {
          const data = WG.deserializePackData(clone(event));
          const commands = [];
          for (const item of data.selllist || []) {
            if (!wanted.includes(normalizeName(item.name))) continue;
            commands.push(
              `buy ${item.count} ${item.id} from ${data.seller}`,
              "$wait 500",
            );
          }
          commands.push("look3 1");
          WG.SendCmd(commands);
        } else if (
          event.type === "text" &&
          String(event.msg || "").indexOf("没有这个玩家") >= 0
        ) {
          finish("pawnshop");
        }
      });
      WG.tnBuy_hook = pawnshopHook;
      if (!(await arrive("扬州城-当铺", "pawnshop"))) return false;
      const seller = WG.getIdByName("唐楠");
      if (!seller) {
        finish("pawnshop", "<hio>自动购买</hio>没有找到唐楠，已结束");
        return false;
      }
      WG.Send("list " + seller);
      return true;
    }

    async function zxBuy() {
      removeHook("bookSell");
      const wanted = configuredNames(legacy.getAutoSkillPaperSellList?.());
      if (!wanted.length) {
        messageAppend("<hio>自动售卖</hio>未配置秘籍清单");
        return false;
      }
      bookSellHook = WG.add_hook(["dialog", "text"], (event) => {
        if (
          event.type === "dialog" &&
          event.dialog === "pack" &&
          Array.isArray(event.items)
        ) {
          const data = WG.deserializePackData(clone(event));
          const seller = WG.getIdByName("朱熹");
          if (!seller) {
            finish("bookSell", "<hio>自动售卖</hio>没有找到朱熹，已结束");
            return;
          }
          const commands = [];
          for (const item of data.items || []) {
            if (!wanted.includes(normalizeName(item.name))) continue;
            commands.push(
              `sell ${item.count} ${item.id} to ${seller}`,
              "$wait 500",
            );
          }
          commands.push("look3 1");
          WG.SendCmd(commands);
        } else if (
          event.type === "text" &&
          String(event.msg || "").indexOf("没有这个玩家") >= 0
        ) {
          finish("bookSell");
        }
      });
      WG.zxBuy_hook = bookSellHook;
      if (!(await arrive("扬州城-书院", "bookSell"))) return false;
      WG.Send("pack");
      return true;
    }

    function cancelAutoTrading() {
      removeHook("pawnshop");
      removeHook("bookSell");
    }

    const loginHook = WG.add_hook("login", cancelAutoTrading);
    WG.tnBuy = tnBuy;
    WG.zxBuy = zxBuy;
    WG.cancelAutoTrading = cancelAutoTrading;

    return {
      destroy() {
        cancelAutoTrading();
        if (loginHook != null) WG.remove_hook(loginHook);
        if (WG.tnBuy === tnBuy) WG.tnBuy = undefined;
        if (WG.zxBuy === zxBuy) WG.zxBuy = undefined;
        if (WG.cancelAutoTrading === cancelAutoTrading) {
          WG.cancelAutoTrading = undefined;
        }
      },
    };
  });
})(window);
