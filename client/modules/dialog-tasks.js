/** Task list dialog and incremental task updates. */
(function registerDialogTasksModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-tasks",
    function createDialogTasks(context) {
      const Dialog =
        typeof context.getDialog === "function"
          ? context.getDialog()
          : context.Dialog;
      const $ =
        typeof context.getJQuery === "function"
          ? context.getJQuery()
          : context.jquery || context.$;
      const SendCommand =
        typeof context.getSendCommand === "function"
          ? context.getSendCommand()
          : context.SendCommand || context.sendCommand;

      if (!Dialog || typeof $ !== "function" || typeof SendCommand !== "function") {
        throw new TypeError(
          "任务对话框需要显式 Dialog、jQuery 和 SendCommand 上下文",
        );
      }

      const tasks = {
        close: function () {
          this.element.remove();
          this.isShow = false;
        },
        update_item: function (_0x5eca70) {
          for (var _0x16318b = 0; _0x16318b < this.items.length; _0x16318b++) {
            if (this.items[_0x16318b].id == _0x5eca70.id) {
              if (_0x5eca70.state) {
                this.items[_0x16318b].title = _0x5eca70.title;
                this.items[_0x16318b].state = _0x5eca70.state;
                this.items[_0x16318b].desc = _0x5eca70.desc;
              } else {
                this.items.splice(_0x16318b, 1);
              }
              break;
            }
          }
          this.create_items();
        },
        onData: function (_0xe6c3ca) {
          if (_0xe6c3ca.id) {
            return this.update_item(_0xe6c3ca);
          }
          Dialog.title("任务列表");
          Dialog.icon("exclamation-sign");
          this.items = _0xe6c3ca.items;
          this.create_items();
        },
        show: function () {
          if (!this.element) {
            this.element = $("<div class='dialog-tasks'></div>");
          }
          Dialog.title("任务列表");
          Dialog.icon("exclamation-sign");
          Dialog.footer("");
          SendCommand("tasks");
          if (this.isShow) {
            return;
          }
          this.element.appendTo(Dialog.contentElement);
          this.isShow = true;
        },
        status_css: ["", "none", "finish", "over"],
        create_items: function () {
          var _0x16b1d1 = [];
          var _0x143152 = false;
          for (var _0x21bf40 = 0; _0x21bf40 < this.items.length; _0x21bf40++) {
            var _0x1fc3ec = this.items[_0x21bf40];
            _0x16b1d1.push("<div class='task-item flex-row ");
            _0x16b1d1.push(this.status_css[_0x1fc3ec.state]);
            _0x16b1d1.push("'><div class='flex-1'><h3>");
            _0x16b1d1.push(_0x1fc3ec.title);
            _0x16b1d1.push("</h3>");
            _0x16b1d1.push("<pre class='task-desc'>");
            _0x16b1d1.push(_0x1fc3ec.desc);
            _0x16b1d1.push("</pre></div>");
            _0x16b1d1.push("<span class='task-btn flex-0'");
            if (_0x1fc3ec.state == 1) {
              _0x16b1d1.push(">进行中");
            } else if (_0x1fc3ec.state == 2) {
              _0x16b1d1.push(' cmd="task ');
              _0x16b1d1.push(_0x1fc3ec.id);
              _0x16b1d1.push(' fin"');
              _0x143152 = true;
              _0x16b1d1.push(">可领取");
            } else if (_0x1fc3ec.state == 3) {
              _0x16b1d1.push(">已完成");
            }
            _0x16b1d1.push("</span>");
            _0x16b1d1.push("</div>");
          }
          this.element.html(_0x16b1d1.join(""));
          Dialog.footer("");
        },
      };

      return { tasks };
    },
  );
})(window);
