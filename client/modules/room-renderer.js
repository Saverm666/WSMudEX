(function registerRoomRendererModule(global) {
  "use strict";

  global.WSMudClient.registerModule("room-renderer", function create(context) {
    const $ = context.jquery;
    const document = context.documentRef || global.document;
    const getProcess = context.getProcess;
    const getSetting = context.getSetting;
    const getCombat = context.getCombat;
    const getMap = context.getMap;
    const receiveMessage = context.receiveMessage;
    const sendCommand = context.sendCommand;
    const nodeFilterShowText = context.nodeFilterShowText || (() => 4);
    const roomHiddenItemsReg = /<\w{3}\scmd=['"](.+?)['"]>(.+?)<\/\w{3}>/g;

    function process() {
      return getProcess();
    }

    function setting() {
      return getSetting();
    }

    function combat() {
      return getCombat();
    }

    function map() {
      return getMap();
    }

    function countwidth(value, max) {
      let width = (value * 100) / max;
      if (width < 0) width = 0;
      if (width > 100) width = 100;
      return width;
    }

    function formatStatusNumber(value) {
      const number = Number(value);
      return Number.isFinite(number)
        ? number.toLocaleString("en-US")
        : String(value == null ? "" : value);
    }

    function formatRoomItemName(name, isPlayer) {
      if (!isPlayer) return name;
      const container = $("<span>").html(name);
      const root = container[0];
      const walker = document.createTreeWalker(
        root,
        nodeFilterShowText(),
      );
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);
      const marker = document.createElement("span");
      marker.className = "player-name-marker";
      marker.textContent = "★";
      for (let index = textNodes.length - 1; index >= 0; index--) {
        node = textNodes[index];
        if (!node.nodeValue.trim()) continue;
        const stateMatch = node.nodeValue.match(/^(.*?)(<[^<>]+>)(\s*)$/);
        if (stateMatch) {
          node.nodeValue = stateMatch[1];
          node.parentNode.insertBefore(marker, node.nextSibling);
          marker.parentNode.insertBefore(
            document.createTextNode(stateMatch[2] + stateMatch[3]),
            marker.nextSibling,
          );
        } else {
          root.appendChild(marker);
        }
        return container.html();
      }
      root.appendChild(marker);
      return container.html();
    }

    function itemremove(data) {
      const currentProcess = process();
      const currentCombat = combat();
      currentProcess.closeItemPopup(data.id);
      const status = currentCombat.STATUS[data.id];
      if (status) {
        if (typeof currentCombat.ClearStatusTarget === "function") {
          currentCombat.ClearStatusTarget(data.id);
        } else {
          for (const key in status.items) {
            clearInterval(status.items[key].handler);
          }
        }
        const row = status.elem.parent();
        if (row.next().is(".item-commands")) row.next().remove();
        row.remove();
        delete currentCombat.STATUS[data.id];
      }
      currentProcess.cur_room.items.RemoveAt(
        (item) => item.id === data.id,
      );
    }

    function itemadd(data) {
      const currentProcess = process();
      const currentSetting = setting();
      const currentCombat = combat();
      if (currentSetting.off_plist && data.p && data.id != currentProcess.player)
        return;
      const row = data.id == currentProcess.player
        ? $(currentProcess.create_roomitem(data)).prependTo(currentProcess.itemsElement)
        : $(currentProcess.create_roomitem(data)).appendTo(currentProcess.itemsElement);
      if (currentCombat.STATUS[data.id]) itemremove(data);
      currentCombat.AppendStatusItem(
        data.id,
        row.find(".item-status-bar"),
        data.status,
      );
      currentProcess.cur_room.items.push(data);
    }

    function items(data) {
      const currentProcess = process();
      const currentSetting = setting();
      const currentCombat = combat();
      currentProcess.itemsElement.empty();
      if (typeof currentCombat.ClearRoomStatus === "function") {
        currentCombat.ClearRoomStatus();
      } else {
        currentCombat.STATUS = {};
      }
      for (let index = 0; index < data.items.length; index++) {
        const item = data.items[index];
        if (!item) continue;
        if (currentSetting.off_plist && item.p && item.id != currentProcess.player)
          continue;
        const row = item.id == currentProcess.player
          ? $(currentProcess.create_roomitem(item)).prependTo(currentProcess.itemsElement)
          : $(currentProcess.create_roomitem(item)).appendTo(currentProcess.itemsElement);
        currentCombat.AppendStatusItem(
          item.id,
          row.find(".item-status-bar"),
          item.status,
        );
      }
      currentProcess.cur_room = data;
    }

    function create_roomitem(item) {
      const currentProcess = process();
      const currentSetting = setting();
      const currentCombat = combat();
      const html = [];
      html.push("<div class='room-item' itemid='" + item.id + "'>");
      if (item.max_hp) {
        html.push('<div class="item-status"');
        if (!currentCombat.IsShow || currentSetting.off_hp)
          html.push(' style="display:none;"');
        html.push(">");
        html.push(
          '<div class="progress hp"><div class="progress-bar" max="' +
            item.max_hp +
            '"  style="background-color:red;width:' +
            currentProcess.countwidth(item.hp, item.max_hp) +
            '%"></div></div>',
        );
        if (item.id == currentProcess.player && item.max_mp) {
          html.push(
            '<div class="progress mp"><div class="progress-bar" max="' +
              item.max_mp +
              '" style="background-color:blue;width:' +
              currentProcess.countwidth(item.mp, item.max_mp) +
              '%"></div></div>',
          );
        }
        html.push("</div>");
        if (currentSetting.show_hpnum) {
          html.push('<span class="item-vital-values">');
          html.push(
            '<span class="progress-num hp-progress-num" style="color:red;-webkit-text-fill-color:red;background:none">[' +
              currentProcess.formatStatusNumber(item.hp) +
              "/" +
              currentProcess.formatStatusNumber(item.max_hp) +
              "]</span>",
          );
          if (item.id == currentProcess.player && item.max_mp) {
            html.push(
              '<span class="progress-num mp-progress-num" style="color:blue;-webkit-text-fill-color:blue;background:none">[' +
                currentProcess.formatStatusNumber(item.mp) +
                "/" +
                currentProcess.formatStatusNumber(item.max_mp) +
                "]</span>",
            );
          }
          html.push("</span>");
        }
      }
      html.push("<span class='item-status-bar'>");
      html.push("</span>");
      html.push("<span class='item-name'>");
      html.push(
        currentProcess.formatRoomItemName(
          item.name,
          item.id == currentProcess.player,
        ),
      );
      html.push("</span>");
      html.push("</div>");
      return html.join("");
    }

    function room(data) {
      const currentProcess = process();
      const currentSetting = setting();
      const currentCombat = combat();
      const currentMap = map();
      currentProcess.closeItemPopup();
      $(".room_items").html("");
      $(".room-name").html(data.name);
      $(".room_desc").html(data.desc);
      currentProcess.room_name = data.name;
      if (!currentSetting.keep_msg) {
        currentProcess.message.clear();
      } else if (currentSetting.keep_msg) {
        receiveMessage("你来到了" + data.name + "。");
      }
      if (currentProcess.room_path == data.path) return;
      if (currentSetting.show_roomitem) currentProcess.searchItems(data);
      currentCombat.ShowRoomCommands(data.commands);
      currentProcess.room_path = data.path;
      currentMap.SetRoom(data);
      currentMap.OnRoomChanged(data);
    }

    function searchItems(data) {
      let match = null;
      const description = data.desc;
      const matcher = this.roomHiddenItemsReg || roomHiddenItemsReg;
      while ((match = matcher.exec(description)) !== null) {
        data.commands.push({ cmd: match[1], name: match[2] });
      }
    }

    function exits(data) {
      const currentProcess = process();
      const currentSetting = setting();
      const currentMap = map();
      const exitItems = data ? data.items : currentProcess.room_exits;
      if (!exitItems) return;
      currentProcess.room_exits = exitItems;
      currentMap.OnExitsChanged();
      if (currentSetting.exits_dir == 1) {
        const output = ["这里明显的出口有："];
        const directions = [];
        for (let index = 0; index < currentMap.DIRS.length; index++) {
          if (exitItems[currentMap.DIRS[index]]) directions.push(currentMap.DIRS[index]);
        }
        for (let index = 0; index < directions.length; index++) {
          if (index > 0) output.push(index == directions.length - 1 ? " 和 " : "、");
          output.push(
            "<span class='exits-item' dir='" + directions[index] + "'>" +
              directions[index] +
              "</span>",
          );
        }
        $(".room_exits").html(
          directions.length ? output.join("") : "<HIK>这里没有明显的出口。<HIK>",
        );
      } else {
        $(".room_exits").html(
          currentMap.CreateExitsMap(
            exitItems,
            $(".container").width(),
            currentProcess.room_name,
          ),
        );
      }
    }

    function before_click_exits(event) {
      const element = $(event.target);
      if (!element.attr("dir")) return;
      if (element.is("rect")) element.attr("fill", "gray");
      else if (element.is("text")) element.prev().attr("fill", "gray");
    }

    function click_exits(event) {
      const element = $(event.target);
      const direction = element.attr("dir");
      if (!direction) return;
      if (element.is("rect")) element.attr("fill", "#232323");
      else if (element.is("text")) element.prev().attr("fill", "#232323");
      sendCommand("go " + direction);
    }

    function queryRoomItem(itemId) {
      const currentProcess = process();
      const roomItems = currentProcess.cur_room && currentProcess.cur_room.items;
      if (!roomItems) return null;
      for (let index = 0; index < roomItems.length; index++) {
        if (roomItems[index] && String(roomItems[index].id) === String(itemId))
          return roomItems[index];
      }
      return null;
    }

    function resetForSession() {
      const currentProcess = process();
      const currentCombat = combat();
      if (typeof currentCombat.ClearRoomStatus === "function") {
        currentCombat.ClearRoomStatus();
      } else {
        currentCombat.STATUS = {};
      }
      if (typeof currentProcess.closeItemPopup === "function") {
        currentProcess.closeItemPopup();
      }
      currentProcess.cur_room = null;
      currentProcess.room_path = null;
      currentProcess.room_exits = null;
      currentProcess.room_name = null;
      roomHiddenItemsReg.lastIndex = 0;
      if (currentProcess.roomHiddenItemsReg) {
        currentProcess.roomHiddenItemsReg.lastIndex = 0;
      }
    }

    return {
      countwidth,
      formatStatusNumber,
      formatRoomItemName,
      itemremove,
      itemadd,
      items,
      create_roomitem,
      room,
      roomHiddenItemsReg,
      searchItems,
      exits,
      before_click_exits,
      click_exits,
      queryRoomItem,
      resetRoomRendererSession: resetForSession,
    };
  });
})(window);
