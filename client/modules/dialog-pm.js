/** Auction (拍卖行) dialog model with absolute-deadline countdowns. */
(function registerDialogPmModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-pm",
    function createDialogPm(context) {
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
      const getMoneyToStr =
        typeof context.getMoneyToStr === "function"
          ? context.getMoneyToStr
          : () => context.moneyToStr;
      const now =
        typeof context.now === "function" ? context.now : () => Date.now();
      const setIntervalFn =
        context.timers && typeof context.timers.setInterval === "function"
          ? context.timers.setInterval
          : setInterval;
      const clearIntervalFn =
        context.timers && typeof context.timers.clearInterval === "function"
          ? context.timers.clearInterval
          : clearInterval;

      if (
        !Dialog ||
        typeof $ !== "function" ||
        typeof SendCommand !== "function" ||
        typeof getMoneyToStr !== "function"
      ) {
        throw new TypeError(
          "拍卖行对话框需要显式 Dialog、jQuery、SendCommand 和 moneyToStr 上下文",
        );
      }

      const pm = {
        countdownTimer: null,
        countdownDeadlines: Object.create(null),
        close: function () {
          this.stop_countdown();
          this.element.remove();
          this.element = null;
          this.isShow = false;
        },
        hide: function () {
          this.stop_countdown();
        },
        onData: function (data) {
          if (data.list) {
            this.show();
            this.create_items(data.list);
          } else if (data.item) this.update_item(data.item);
        },
        show: function () {
          if (!Dialog.isShow || Dialog.curItem != "pm") Dialog.show("pm");
          if (!this.element) this.element = $("<div class='dialog-pms'></div>");
          if (this.isShow) {
            this.start_countdown();
            return;
          }
          Dialog.title("拍卖行");
          Dialog.icon("shopping-cart");
          Dialog.footer("");
          this.element.appendTo(Dialog.contentElement);
          this.element.on("click", ".pm-item", this.select_item);
          this.isShow = true;
          this.start_countdown();
        },
        select_item: function () {
          let element = $(this);
          let dialog = Dialog.pm;
          if (dialog.selected_item) dialog.selected_item.removeClass("selected");
          dialog.selected_item = element;
          dialog.selected_item.addClass("selected");
        },
        update_item: function (item) {
          let html = this.create_item(item, true);
          if (!this.element || !this.element.length) return;
          let element = this.element.find('.pm-item[oid="' + item[0] + '"]');
          if (element.length) element.replaceWith(html);
        },
        create_items: function (list) {
          let html = [];
          let active = Object.create(null);
          for (let index = 0; index < list.length; index++) {
            active[String(list[index][0])] = true;
            html.push(this.create_item(list[index]));
          }
          if (!html.length) html.push('<div class="empty">暂无拍卖</div>');
          Object.keys(this.countdownDeadlines).forEach(function (id) {
            if (!active[id]) delete Dialog.pm.countdownDeadlines[id];
          });
          this.element.html(html.join(""));
          Dialog.footer(
            '<span class="obj-money">共有' + list.length + "项道具正在拍卖</span>",
          );
        },
        create_item: function (item, forceReset) {
          let html = [];
          const [id, name, money, time, userName] = item;
          let deadline = this.get_countdown_deadline(item, forceReset);
          html.push("<div class='pm-item grade0 flex-row' oid='", id, "'>");
          html.push("<div class='pm-title' cmd='pm show ", id, "'>", name, "</div>");
          html.push("<div class='pm-desc flex-1'>");
          if (userName) html.push(userName, "最后出价", getMoneyToStr()(money));
          else html.push("当前价格", getMoneyToStr()(money));
          html.push("</div><div class='pm-mem' data-end-time='", deadline, "'>");
          html.push("剩余：", this.format_countdown(deadline - now()), "</div>");
          html.push("<div class='pm-add' cmd='pm add ", id, "'>出价</div></div>");
          return html.join("");
        },
        get_countdown_deadline: function (item, forceReset) {
          let id = String(item[0]);
          let remaining = Math.max(0, Number(item[3]) || 0);
          let deadline = this.countdownDeadlines[id];
          if (forceReset || !deadline) {
            deadline = { serverRemaining: remaining, endTime: now() + remaining };
            this.countdownDeadlines[id] = deadline;
          }
          return deadline.endTime;
        },
        start_countdown: function () {
          this.stop_countdown();
          this.update_countdowns();
          let dialog = this;
          this.countdownTimer = setIntervalFn(function () {
            dialog.update_countdowns();
          }, 1000);
        },
        stop_countdown: function () {
          if (this.countdownTimer) {
            clearIntervalFn(this.countdownTimer);
            this.countdownTimer = null;
          }
        },
        update_countdowns: function () {
          if (!this.element || !this.element.length) return;
          let dialog = this;
          let currentTime = now();
          this.element.find(".pm-mem[data-end-time]").each(function () {
            let endTime = Number($(this).attr("data-end-time"));
            $(this).text("剩余：" + dialog.format_countdown(endTime - currentTime));
          });
        },
        format_countdown: function (milliseconds) {
          let seconds = Math.max(0, Math.ceil(milliseconds / 1000));
          let hours = Math.floor(seconds / 3600);
          let minutes = Math.floor((seconds % 3600) / 60);
          let remainder = seconds % 60;
          if (hours) return hours + "小时" + minutes + "分" + remainder + "秒";
          return minutes + "分" + remainder + "秒";
        },
        format_num: function (num) {
          return num > 9 ? num.toString() : "0" + num.toString();
        },
      };

      return { pm };
    },
  );
})(window);
