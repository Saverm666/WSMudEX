/** Custom Q/W/E/R/T/Y command buttons and their persisted mode. */
(function registerCustomCommandButtons(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "custom-command-buttons",
    function install(context) {
      const { WG, G, UI, legacy, messageAppend, messageClear } = context;
      const buttonKeys = ["Q", "W", "E", "R", "T", "Y"];
      const eventNamespace = ".wsmudCustomCommandButtons";

      function getButtonList() {
        return legacy.getCustomButtonList();
      }

      function setButtonList(value) {
        legacy.setCustomButtonList(value);
      }

      function getButtonMode() {
        return legacy.getCustomButtonMode();
      }

      function setButtonMode(value) {
        legacy.setCustomButtonMode(value);
      }

      function buttonStorageKey() {
        return legacy.getRoleId() + "_zdy_btnlist";
      }

      function modeStorageKey() {
        return legacy.getRoleId() + "_inzdy_btn";
      }

      function bindClick(selector, handler) {
        $(selector)
          .off("click" + eventNamespace)
          .on("click" + eventNamespace, handler);
      }

      function renderCustomButtons() {
        const html = UI.zdybtnui();
        $(".WG_button").remove();
        $(".WG_log").after(html);
        for (let index = 0; index < buttonKeys.length; index += 1) {
          bindClick("#keyin" + buttonKeys[index], function () {
            WG.zdybtnfunc(index);
          });
        }
        bindClick(".auto_perform", WG.auto_preform_switch);
        bindClick(".cmd_echo", WG.cmd_echo_button);
      }

      function renderNativeButtons() {
        const html = UI.btnui();
        $(".WG_button").remove();
        $(".WG_log").after(html);
        bindClick(".go_wumiao", WG.go_wumiao);
        bindClick(".kill_all", WG.kill_all);
        bindClick(".get_all", WG.get_all);
        bindClick(".sell_all", WG.sell_all);
        bindClick(".zdwk", WG.zdwk);
        bindClick(".go_home", WG.go_home);
        bindClick(".auto_perform", WG.auto_preform_switch);
        bindClick(".cmd_echo", WG.cmd_echo_button);
        G.isGod && G.isGod() && $(".zdy-item.zdwk").html("挂机(Y)");
      }

      function saveButtonList(list, message) {
        setButtonList(list);
        GM_setValue(buttonStorageKey(), list);
        messageAppend(message);
        WG.zdy_btnListInit();
      }

      Object.assign(WG, {
        zdybtnfunc: function (index) {
          WG.SendCmd(getButtonList()[index].send);
        },
        zdy_btnset: function () {
          const list = GM_getValue(buttonStorageKey(), getButtonList());
          setButtonList(list);
          messageClear();
          messageAppend(UI.zdyBtnsetui());
          for (let index = 0; index < buttonKeys.length; index += 1) {
            $("#name" + buttonKeys[index]).val(list[index].name);
            $("#send" + buttonKeys[index]).val(list[index].send);
          }
          $(".savebtn")
            .off("click" + eventNamespace)
            .on("click" + eventNamespace, function () {
              const updated = [];
              for (const key of buttonKeys) {
                const entry = { name: "无", send: "" };
                const name = $("#name" + key).val();
                const command = $("#send" + key).val();
                if (name !== "") {
                  entry.name = name;
                  entry.send = command;
                }
                updated.push(entry);
              }
              saveButtonList(updated, "保存成功");
            });
        },
        zdy_btnListInit: function () {
          let list = GM_getValue(buttonStorageKey(), getButtonList());
          setButtonList(list);
          setButtonMode(GM_getValue(modeStorageKey(), getButtonMode()));
          if (list.length === 0) {
            for (let index = 0; index < buttonKeys.length; index += 1)
              list.push({ name: "无", send: "" });
            GM_setValue(buttonStorageKey(), list);
          }
          getButtonMode() ? WG.zdy_btnshow() : WG.zdy_btnshow("off");
        },
        zdy_btnshow: function (mode = "on") {
          if (mode === "on") {
            setButtonMode(true);
            renderCustomButtons();
          } else if (mode === "off") {
            setButtonMode(false);
            renderNativeButtons();
          }
          GM_setValue(modeStorageKey(), getButtonMode());
        },
      });

      return {
        destroy: function () {
          $(".WG_button").remove();
          $(".savebtn").off(eventNamespace);
        },
      };
    },
  );
})(window);
