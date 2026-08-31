/** Keyboard command and room-control service for the automation suite. */
(function registerAutomationKeyboard(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "automation-keyboard",
    function create(context) {
      const getWG =
        typeof context.getWG === "function"
          ? context.getWG
          : () => context.WG;
      const getG =
        typeof context.getG === "function" ? context.getG : () => context.G;
      const getButtonMode =
        typeof context.getButtonMode === "function"
          ? context.getButtonMode
          : () => context.buttonMode;
      const getJquery =
        typeof context.getJquery === "function"
          ? context.getJquery
          : () => context.jquery || global.jQuery || global.$;
      const getDocument =
        typeof context.getDocument === "function"
          ? context.getDocument
          : () => context.documentRef || global.document;
      const getWindow =
        typeof context.getWindow === "function"
          ? context.getWindow
          : () => context.windowRef || global;
      const getTimers =
        typeof context.getTimers === "function"
          ? context.getTimers
          : () => context.timers || global;
      const getKeyApi =
        typeof context.getKeyApi === "function"
          ? context.getKeyApi
          : () => KEY;
      const setExitState =
        typeof context.setExitState === "function"
          ? context.setExitState
          : () => {};

      let initialized = false;
      let exit1;
      let exit2;
      let exit3;
      let KEY;

      const keyTarget = {
        keys: [],
        roomItemSelectIndex: -1,
        init: function () {
          if (initialized) return;
          const $ = getJquery();
          const documentRef = getDocument();
          ($("span[command=stopstate] span:eq(0)").html("S"),
            $("span[command=showcombat] span:eq(0)").html("A"),
            $("span[command=showtool] span:eq(0)").html("C"),
            $("span[command=pack] span:eq(0)").html("B"),
            $("span[command=tasks] span:eq(0)").html("L"),
            $("span[command=score] span:eq(0)").html("O"),
            $("span[command=jh] span:eq(0)").html("J"),
            $("span[command=skills] span:eq(0)").html("K"),
            $("span[command=message] span:eq(0)").html("U"),
            $("span[command=shop] span:eq(0)").html("P"),
            $("span[command=stats] span:eq(0)").html("I"),
            $("span[command=setting] span:eq(0)").html(","),
            $(documentRef).on("keydown", this.e),
            this.add(27, function () {
              KEY.dialog_close();
            }),
            this.add(192, function () {
              $(".map-icon").click();
            }),
            this.add(32, function () {
              KEY.dialog_confirm();
            }),
            this.add(83, function () {
              KEY.do_command("stopstate");
            }),
            this.add(13, function () {
              KEY.do_command("showchat");
            }),
            this.add(65, function () {
              KEY.do_command("showcombat");
            }),
            this.add(67, function () {
              KEY.do_command("showtool");
            }),
            this.add(66, function () {
              KEY.do_command("pack");
            }),
            this.add(76, function () {
              KEY.do_command("tasks");
            }),
            this.add(79, function () {
              KEY.do_command("score");
            }),
            this.add(74, function () {
              KEY.do_command("jh");
            }),
            this.add(75, function () {
              KEY.do_command("skills");
            }),
            this.add(73, function () {
              KEY.do_command("stats");
            }),
            this.add(85, function () {
              KEY.do_command("message");
            }),
            this.add(80, function () {
              KEY.do_command("shop");
            }),
            this.add(188, function () {
              KEY.do_command("setting");
            }),
            this.add(81, function () {
              const WG = getWG();
              getButtonMode() ? WG.zdybtnfunc(0) : WG.go_home();
            }),
            this.add(87, function () {
              const WG = getWG();
              getButtonMode() ? WG.zdybtnfunc(1) : WG.go_wumiao();
            }),
            this.add(69, function () {
              const WG = getWG();
              getButtonMode() ? WG.zdybtnfunc(2) : WG.kill_all();
            }),
            this.add(82, function () {
              const WG = getWG();
              getButtonMode() ? WG.zdybtnfunc(3) : WG.get_all();
            }),
            this.add(84, function () {
              const WG = getWG();
              getButtonMode() ? WG.zdybtnfunc(4) : WG.sell_all();
            }),
            this.add(89, function () {
              const WG = getWG();
              getButtonMode() ? WG.zdybtnfunc(5) : WG.zdwk();
            }),
            this.add(9, function () {
              return (KEY.onRoomItemSelect(), !1);
            }),
            this.add(102, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("east")),
                (exit2 = G.exits.get("eastup")),
                (exit3 = G.exits.get("eastdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go east")
                  : exit2
                    ? WG.Send("go eastup")
                    : exit3 && WG.Send("go eastdown"),
                KEY.onChangeRoom());
            }),
            this.add(39, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("east")),
                (exit2 = G.exits.get("eastup")),
                (exit3 = G.exits.get("eastdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go east")
                  : exit2
                    ? WG.Send("go eastup")
                    : exit3 && WG.Send("go eastdown"),
                KEY.onChangeRoom());
            }),
            this.add(100, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("west")),
                (exit2 = G.exits.get("westup")),
                (exit3 = G.exits.get("westdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go west")
                  : exit2
                    ? WG.Send("go westup")
                    : exit3 && WG.Send("go westdown"),
                KEY.onChangeRoom());
            }),
            this.add(37, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("west")),
                (exit2 = G.exits.get("westup")),
                (exit3 = G.exits.get("westdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go west")
                  : exit2
                    ? WG.Send("go westup")
                    : exit3 && WG.Send("go westdown"),
                KEY.onChangeRoom());
            }),
            this.add(98, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("south")),
                (exit2 = G.exits.get("southup")),
                (exit3 = G.exits.get("southdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go south")
                  : exit2
                    ? WG.Send("go southup")
                    : exit3 && WG.Send("go southdown"),
                KEY.onChangeRoom());
            }),
            this.add(40, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("south")),
                (exit2 = G.exits.get("southup")),
                (exit3 = G.exits.get("southdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go south")
                  : exit2
                    ? WG.Send("go southup")
                    : exit3 && WG.Send("go southdown"),
                KEY.onChangeRoom());
            }),
            this.add(101, function () {
              getWG().Send("go down");
            }),
            this.add(613, function () {
              getWG().Send("go up");
            }),
            this.add(104, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("north")),
                (exit2 = G.exits.get("northup")),
                (exit3 = G.exits.get("northdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go north")
                  : exit2
                    ? WG.Send("go northup")
                    : exit3 && WG.Send("go northdown"),
                KEY.onChangeRoom());
            }),
            this.add(38, function () {
              const G = getG();
              const WG = getWG();
              ((exit1 = G.exits.get("north")),
                (exit2 = G.exits.get("northup")),
                (exit3 = G.exits.get("northdown")),
                setExitState(exit1, exit2, exit3),
                exit1
                  ? WG.Send("go north")
                  : exit2
                    ? WG.Send("go northup")
                    : exit3 && WG.Send("go northdown"),
                KEY.onChangeRoom());
            }),
            this.add(99, function () {
              (getWG().Send("go southeast"), KEY.onChangeRoom());
            }),
            this.add(97, function () {
              (getWG().Send("go southwest"), KEY.onChangeRoom());
            }),
            this.add(105, function () {
              (getWG().Send("go northeast"), KEY.onChangeRoom());
            }),
            this.add(103, function () {
              (getWG().Send("go northwest"), KEY.onChangeRoom());
            }),
            this.add(49, function () {
              KEY.combat_commands(0);
            }),
            this.add(50, function () {
              KEY.combat_commands(1);
            }),
            this.add(51, function () {
              KEY.combat_commands(2);
            }),
            this.add(52, function () {
              KEY.combat_commands(3);
            }),
            this.add(53, function () {
              KEY.combat_commands(4);
            }),
            this.add(54, function () {
              KEY.combat_commands(5);
            }),
            this.add(55, function () {
              KEY.combat_commands(6);
            }),
            this.add(56, function () {
              KEY.combat_commands(7);
            }),
            this.add(57, function () {
              KEY.combat_commands(8);
            }),
            this.add(48, function () {
              KEY.combat_commands(9);
            }),
            this.add(45, function () {
              KEY.combat_commands(10);
            }),
            this.add(61, function () {
              KEY.combat_commands(11);
            }),
            this.add(561, function () {
              KEY.onRoomItemAction(0);
            }),
            this.add(562, function () {
              KEY.onRoomItemAction(1);
            }),
            this.add(563, function () {
              KEY.onRoomItemAction(2);
            }),
            this.add(564, function () {
              KEY.onRoomItemAction(3);
            }),
            this.add(565, function () {
              KEY.onRoomItemAction(4);
            }),
            this.add(566, function () {
              KEY.onRoomItemAction(5);
            }),
            this.add(1073, function () {
              KEY.room_commands(0);
            }),
            this.add(1074, function () {
              KEY.room_commands(1);
            }),
            this.add(1075, function () {
              KEY.room_commands(2);
            }),
            this.add(1076, function () {
              KEY.room_commands(3);
            }),
            this.add(1077, function () {
              KEY.room_commands(4);
            }),
            this.add(1078, function () {
              KEY.room_commands(5);
            }));
          initialized = true;
        },
        add: function (e, t) {
          this.keys.push({ key: e, callback: t });
        },
        e: function (e) {
          const $ = getJquery();
          if ($(".channel-box").is(":visible")) KEY.chatModeKeyEvent(e);
          else if (!(
            ($(".dialog-confirm").is(":visible") &&
              ((48 <= e.keyCode && e.keyCode <= 57) ||
                (96 <= e.keyCode && e.keyCode <= 105))) ||
            $("input").is(":focus") ||
            $("textarea").is(":focus")
          )) {
            var t,
              s =
                (e.ctrlKey || e.metaKey ? 1024 : 0) +
                (e.altKey ? 512 : 0) +
                e.keyCode;
            for (t of KEY.keys) if (t.key == s) return t.callback();
          }
        },
        isallow: !0,
        dialog_close: function () {
          getJquery()(".dialog-close").click();
        },
        dialog_confirm: function () {
          const $ = getJquery();
          0 <= $(".dialog-confirm").attr("style").indexOf("block") &&
            this.isallow &&
            ((this.isallow = !1),
            $(".dialog-btn.btn-ok").click(),
            getTimers().setTimeout(() => {
              this.isallow = !0;
            }, 500));
        },
        do_command: function (e) {
          getJquery()("span[command=" + e + "]").click();
        },
        room_commands: function (e) {
          getJquery()(
            "div.combat-panel div.room-commands span:eq(" + e + ")",
          ).click();
        },
        combat_commands: function (e) {
          getJquery()(
            "div.combat-panel div.combat-commands span.pfm-item:eq(" + e + ")",
          ).click();
        },
        chatModeKeyEvent: function (e) {
          const $ = getJquery();
          var layeredPopup = $(
            ".WG_plugin_settings:not([hidden]), " +
              ".WG_auto_first_round:not([hidden]), " +
              ".WG_equipment_picker:not([hidden]), " +
              ".WG_map_modal:not([hidden]), " +
              ".WG_item_popup:visible, " +
              ".dialog-confirm:visible, " +
              ".dialog.WG_floating_dialog:visible",
          ).filter(":visible");
          if (layeredPopup.length) return;
          var nativeDialog = $(".dialog:visible").not(".WG_floating_dialog");
          if (nativeDialog.length) {
            e.keyCode == 27 && KEY.dialog_close();
            return;
          }
          if (
            e.keyCode == 27 ||
            (e.keyCode == 13 && !$(".sender-box").val().length)
          ) {
            const windowRef = getWindow();
            if (
              windowRef.WGIsSideChatPanelOpen &&
              windowRef.WGIsSideChatPanelOpen()
            )
              windowRef.WGCloseSideChatPanel &&
                windowRef.WGCloseSideChatPanel();
            else KEY.dialog_close();
            return;
          }
          e.keyCode == 13 && $(".sender-btn").click();
        },
        onChangeRoom: function () {
          KEY.roomItemSelectIndex = -1;
        },
        onRoomItemSelect: function () {
          const $ = getJquery();
          (-1 != KEY.roomItemSelectIndex &&
            $(
              ".room_items div.room-item:eq(" +
                KEY.roomItemSelectIndex +
                ")",
            ).css("background", "#000"),
            (KEY.roomItemSelectIndex =
              (KEY.roomItemSelectIndex + 1) %
              $(".room_items div.room-item").length));
          var e = $(
            ".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")",
          );
          (e.css("background", "#444"), e.click());
        },
        onRoomItemAction: function (e) {
          getJquery()(".room_items .item-commands span:eq(" + e + ")").click();
        },
      };

      KEY = new Proxy(keyTarget, {
        get: function (target, property) {
          const activeKeyApi = getKeyApi();
          const source = activeKeyApi && activeKeyApi !== KEY ? activeKeyApi : target;
          return Reflect.get(source, property, source);
        },
        set: function (target, property, value) {
          const activeKeyApi = getKeyApi();
          const destination =
            activeKeyApi && activeKeyApi !== KEY ? activeKeyApi : target;
          return Reflect.set(destination, property, value, destination);
        },
      });
      return KEY;
    },
  );
})(window);
