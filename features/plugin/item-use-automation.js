/** Repeated item-use workflow with response-driven cancellation. */
(function registerItemUseAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("item-use-automation", function install(context) {
    const { WG, L } = context;

    function removeHook() {
      if (!WG.useitem_hook) return;
      WG.remove_hook(WG.useitem_hook);
      WG.useitem_hook = undefined;
    }

    Object.assign(WG, {
      useitem_hook: undefined,
      auto_useitem: async function () {
        let canContinue = true;
        removeHook();
        WG.useitem_hook = WG.add_hook("text", function (event) {
          if (
            event.msg.indexOf("你身上没有这个东西") >= 0 ||
            event.msg.indexOf("太多") >= 0 ||
            event.msg.indexOf("不能使用") >= 0
          ) {
            canContinue = false;
            removeHook();
          }
        });

        const itemId = prompt(
          "请输入物品id,在背包中点击查看物品,即可在提示窗口看到物品id输出",
        );
        if (!itemId) {
          removeHook();
          return;
        }
        const count = prompt('请输入物品使用次数,例如:"10"', "10");
        if (itemId.length !== 11) {
          L.msg("id不合法");
          removeHook();
          return;
        }
        for (let index = 0; index < count; index += 1) {
          if (!canContinue) break;
          WG.Send("use " + itemId);
          await WG.sleep(1000);
        }
        removeHook();
      },
    });

    return { destroy: removeHook };
  });
})(window);
