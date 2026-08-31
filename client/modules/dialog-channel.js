/** Channel history dialog and protocol message formatter. */
(function registerDialogChannelModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-channel",
    function createDialogChannel(context) {
      const Dialog =
        typeof context.getDialog === "function"
          ? context.getDialog()
          : context.Dialog;
      const Process =
        typeof context.getProcess === "function"
          ? context.getProcess()
          : context.Process;
      const $ =
        typeof context.getJQuery === "function"
          ? context.getJQuery()
          : context.jquery || context.$;
      const windowRef =
        typeof context.getWindow === "function"
          ? context.getWindow()
          : context.window || global;

      if (!Dialog || !Process || typeof $ !== "function" || !windowRef) {
        throw new TypeError(
          "频道对话框需要显式 Dialog、Process、jQuery 和 window 上下文",
        );
      }

      const channel = {
        footer: [
          ["全部", ""],
          ["世界", "chat"],
          ["队伍", "tm"],
          ["门派", "fam"],
          ["全区", "es"],
          ["帮派", "pty"],
          ["系统", "sys"],
        ],
        isScroll: true,
        last_click: 0,
        show: function () {
          if (
            !windowRef.WGOpenSideChatPanel &&
            windowRef.WG &&
            typeof windowRef.WG.initSideChatPanel == "function"
          )
            windowRef.WG.initSideChatPanel();
          if (windowRef.WGOpenSideChatPanel) {
            windowRef.WGOpenSideChatPanel();
            return;
          }
          if (Date.now() - this.last_click > 500) {
            this.last_click = Date.now();
            return;
          }
          if (Dialog.channel.isShow) {
            return;
          }
          Dialog.select("channel");
          Dialog.icon("comment");
          Dialog.title("");
          Dialog.footer("");
          for (
            var _0x3193ed = 0;
            _0x3193ed < Dialog.channel.footer.length;
            _0x3193ed++
          ) {
            var _0x2a7615 = $(
              "<span class='footer-item channel-item' for='" +
                Dialog.channel.footer[_0x3193ed][1] +
                "'>" +
                Dialog.channel.footer[_0x3193ed][0] +
                "</span>",
            ).appendTo(Dialog.footerElement);
            if (_0x3193ed == 0) {
              _0x2a7615.addClass("select");
            }
          }
          Dialog.contentElement
            .html("")
            .append(Process.ChannelElement.addClass("channel-dialog"));
          Dialog.channel.isShow = true;
          Dialog.channel.scrollBottom();
        },
        hide: function () {
          Dialog.channel.footerChanged("");
          var chatDrawerShell = $(
            ".container > .bottom-bar > .WG_chat_drawer_shell",
          ).first();
          if (chatDrawerShell.length)
            Process.ChannelElement.removeClass("channel-dialog").appendTo(
              chatDrawerShell,
            );
          else
            Process.ChannelElement.removeClass("channel-dialog").insertBefore(
              ".content-message",
            );
          this.scrollBottom();
          this.isShow = false;
        },
        close: function () {
          this.hide();
        },
        scrollBottom: function () {
          Process.channel.scroll2end();
        },
        footerChanged: function (_0x564214) {
          if (Dialog.channel.select_item == _0x564214) {
            return;
          }
          Dialog.channel.select_item = _0x564214;
          Process.channel.clear();
          for (var _0x5270f6 = 0; _0x5270f6 < this.datas.length; _0x5270f6++) {
            var _0x48a29b = this.datas[_0x5270f6];
            if (!_0x564214 || _0x48a29b[0] == _0x564214) {
              Process.channel.push(_0x48a29b[1]);
            }
          }
          Process.channel.scroll2end();
        },
        datas: [],
        createElement: function (_0x3e7b90, _0x161665) {
          var _0x261b89 = "hic";
          var _0x39172d = "";
          switch (_0x3e7b90.ch) {
            case "tm":
              _0x261b89 = "hig";
              _0x39172d = "队伍";
              break;
            case "fam":
              _0x261b89 = "hiy";
              _0x39172d = _0x3e7b90.fam || "门派";
              break;
            case "rumor":
              _0x261b89 = "him";
              _0x39172d = "谣言";
              _0x3e7b90.name = "某人";
              break;
            case "sys":
              _0x261b89 = "hir";
              _0x39172d = "系统";
              _0x3e7b90.name = "";
              break;
            case "es":
              _0x261b89 = "hio";
              _0x39172d = _0x3e7b90.server;
              _0x3e7b90.uid = null;
              break;
            case "pty":
              _0x261b89 = "hiz";
              _0x39172d = "帮派";
              break;
            default:
              _0x39172d = [
                "闲聊",
                "闲聊",
                "闲聊",
                "<hiy>宗师</hiy>",
                "<HIZ>武圣</HIZ>",
                "<hio>武帝</hio>",
                "<ord>武神</ord>",
              ][_0x3e7b90.lv];
              if (_0x3e7b90.lv6) {
                _0x39172d = [
                  "<ord>武神</ord>",
                  "<ord>剑神</ord>",
                  "<ord>刀皇</ord>",
                  "<ord>兵主</ord>",
                  "<ord>战神</ord>",
                ][_0x3e7b90.lv6];
              }
              break;
          }
          var _0x3b7b5e = ["<", _0x261b89, ">【"];
          _0x3b7b5e.push(_0x39172d);
          _0x3b7b5e.push("】");
          if (_0x3e7b90.name) {
            _0x3b7b5e.push("<span");
            if (_0x3e7b90.uid) {
              _0x3b7b5e.push(" cmd='look3 " + _0x3e7b90.uid + "'");
            }
            _0x3b7b5e.push(">");
            _0x3b7b5e.push(_0x3e7b90.name);
            _0x3b7b5e.push("</span>：");
          }
          _0x3b7b5e.push(_0x3e7b90.content);
          var _0x560e18 = _0x3b7b5e.join("");
          if (this.datas.length > 800) {
            this.datas.length = 0;
            this.datas.splice(0, 200);
          }
          if (_0x3e7b90.ch == "rumor") {
            _0x3e7b90.ch = "sys";
          }
          this.datas.push([_0x3e7b90.ch, _0x560e18]);
          if (this.select_item && this.select_item != _0x3e7b90.ch) {
            return "";
          }
          return _0x560e18;
        },
      };

      return { channel };
    },
  );
})(window);
