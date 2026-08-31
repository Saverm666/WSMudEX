/** Inventory list settings and item-name lookup backed by explicit context services. */
(function registerInventoryListSettings(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "inventory-list-settings",
    function install(context) {
      const { WG, legacy, storage, jquery, messageAppend } = context;
      const requiredLegacyAccessors = [
        "getRoleId",
        "getPackData",
        "getCustomStoreList2",
        "setCustomStoreList2",
        "getCustomItemLock",
        "setCustomItemLock",
        "getCustomItemDrop",
        "setCustomItemDrop",
        "getCustomItemDisassemble",
        "setCustomItemDisassemble",
        "getLockList",
        "replaceStoreList",
        "replaceLockList",
        "replaceDropList",
        "replaceDisassembleList",
      ];
      if (
        !legacy ||
        requiredLegacyAccessors.some(
          (name) => typeof legacy[name] !== "function",
        ) ||
        !storage ||
        typeof storage.set !== "function" ||
        typeof jquery !== "function" ||
        typeof messageAppend !== "function"
      ) {
        throw new TypeError(
          "物品列表设置需要显式 legacy、storage、jquery 和 messageAppend 上下文",
        );
      }

      const getPackData = () => legacy.getPackData() || [];
      const getRoleId = () => legacy.getRoleId();

      function roleStorageKey(name) {
        return getRoleId() + "_" + name;
      }

      function appendConfiguredItem({
        valueGetter,
        valueSetter,
        listSetter,
        storageName,
        selector,
        message,
        order,
        item,
      }) {
        let value = valueGetter() || "";
        value = value === "" ? item : value + "," + item;
        valueSetter(value);
        storage.set(roleStorageKey(storageName), value);
        const actions = {
          dom: () => jquery(selector).val(value),
          list: () => value && listSetter(value.split(",")),
          message: () => messageAppend(message + item),
        };
        order.forEach((action) => actions[action]());
      }

      function getItemNameByid(id, callback) {
        getPackData().forEach(function (item) {
          if (item !== 0 && item.id == id) callback(item.name);
        });
      }

      function addstore(item) {
        appendConfiguredItem({
          valueGetter: legacy.getCustomStoreList2,
          valueSetter: legacy.setCustomStoreList2,
          listSetter: legacy.replaceStoreList,
          storageName: "zdy_item_store2",
          selector: "#store_info2",
          message: "添加存仓成功",
          order: ["dom", "list", "message"],
          item,
        });
      }

      function addlock(item) {
        appendConfiguredItem({
          valueGetter: legacy.getCustomItemLock,
          valueSetter: legacy.setCustomItemLock,
          listSetter: legacy.replaceLockList,
          storageName: "zdy_item_lock",
          selector: "#lock_info",
          message: "添加物品锁成功",
          order: ["dom", "list", "message"],
          item,
        });
      }

      function dellock(item) {
        const lockList = legacy.getLockList() || [];
        const itemIndex = lockList.indexOf(item);
        if (itemIndex >= 0) lockList.splice(itemIndex, 1);
        const value = lockList.join(",");
        legacy.setCustomItemLock(value);
        legacy.replaceLockList(lockList);
        storage.set(roleStorageKey("zdy_item_lock"), value);
        jquery("#lock_info").val(value);
        messageAppend("解锁物品锁成功" + item);
      }

      function addfenjieid(item) {
        appendConfiguredItem({
          valueGetter: legacy.getCustomItemDisassemble,
          valueSetter: legacy.setCustomItemDisassemble,
          listSetter: legacy.replaceDisassembleList,
          storageName: "zdy_item_fenjie",
          selector: "#store_fenjie_info",
          message: "添加分解成功",
          order: ["list", "message", "dom"],
          item,
        });
      }

      function adddrop(item) {
        if (
          item.indexOf("hio") >= 0 ||
          item.indexOf("hir") >= 0 ||
          item.indexOf("ord") >= 0
        ) {
          messageAppend("高级物品,不添加整理时丢弃" + item);
          return;
        }
        appendConfiguredItem({
          valueGetter: legacy.getCustomItemDrop,
          valueSetter: legacy.setCustomItemDrop,
          listSetter: legacy.replaceDropList,
          storageName: "zdy_item_drop",
          selector: "#store_drop_info",
          message: "添加丢弃成功",
          order: ["list", "message", "dom"],
          item,
        });
      }

      Object.assign(WG, {
        getItemNameByid,
        addstore,
        addlock,
        dellock,
        addfenjieid,
        adddrop,
      });

      return {
        destroy() {
          if (WG.getItemNameByid === getItemNameByid) WG.getItemNameByid = undefined;
          if (WG.addstore === addstore) WG.addstore = undefined;
          if (WG.addlock === addlock) WG.addlock = undefined;
          if (WG.dellock === dellock) WG.dellock = undefined;
          if (WG.addfenjieid === addfenjieid) WG.addfenjieid = undefined;
          if (WG.adddrop === adddrop) WG.adddrop = undefined;
        },
      };
    },
  );
})(window);
