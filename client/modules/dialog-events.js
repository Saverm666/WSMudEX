/** Activity/events dialog model. */
(function registerDialogEventsModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-events",
    function createDialogEvents(context) {
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
      const ToolAction =
        typeof context.getToolAction === "function"
          ? context.getToolAction()
          : context.ToolAction;

      if (
        !Dialog ||
        typeof $ !== "function" ||
        typeof SendCommand !== "function" ||
        !ToolAction ||
        typeof ToolAction.showFlag !== "function"
      ) {
        throw new TypeError(
          "活动对话框需要显式 Dialog、jQuery、SendCommand 和 ToolAction 上下文",
        );
      }

      const events = {
        unRead: 0,
        hide: function () {
          this.element.remove();
          this.isShow = false;
        },
        onData: function (data) {
          if (data.close) return Dialog.hide();
          if (!data.items) {
            if (data.finish) this.unRead--;
            else this.unRead++;
            return this.showUnread();
          }
          this.items = data.items;
          this.create_items();
        },
        showUnread: function () {
          ToolAction.showFlag("events", this.unRead);
        },
        show: function () {
          if (!this.element) this.element = $("<div class='dialog-events'></div>");
          SendCommand("events");
          if (this.isShow) return;
          Dialog.title("活动");
          Dialog.icon("dashboard");
          this.unRead = 0;
          this.showUnread();
          Dialog.footer("");
          this.element.appendTo(Dialog.contentElement);
          this.isShow = true;
        },
        create_items: function () {
          let html = [];
          for (let index = 0; index < this.items.length; index++) {
            const [id, title, desc, grade, time, command] = this.items[index];
            html.push("<div class='event-item flex-row grade", grade, "'><div class='flex-1'><h3>", title, "</h3><pre class='event-desc'>", desc);
            if (time > 0) html.push("\n<mem>", this.format_time(time), "</mem>");
            html.push("</pre></div><span class='event-btn flex-0'");
            if (command) html.push(" cmd='events ", id, "' >", command);
            else html.push(">进行中");
            html.push("</span></div>");
          }
          if (!html.length) html.push('<div class="empty">暂无活动</div>');
          this.element.html(html.join(""));
          Dialog.footer(
            '<span class="obj-money">共有' +
              this.items.length +
              "项活动正在进行</span>",
          );
        },
        format_time: function (time) {
          let date = new Date(time);
          let now = new Date();
          let day = date.getDate();
          let hour = date.getHours();
          let minute = date.getMinutes();
          let html = ["持续到"];
          if (now.getFullYear() !== date.getFullYear())
            html.push(date.getFullYear(), "年");
          if (now.getMonth() !== date.getMonth())
            html.push(this.format_num(date.getMonth() + 1), "月", this.format_num(day), "日");
          else if (day !== now.getDate()) html.push(this.format_num(day), "日");
          html.push(this.format_num(hour), ":", this.format_num(minute));
          return html.join("");
        },
        format_num: function (num) {
          return num > 9 ? num.toString() : "0" + num.toString();
        },
      };

      return { events };
    },
  );
})(window);
