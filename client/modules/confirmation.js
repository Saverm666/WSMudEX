/** Confirmation input and secondary-operation dialogs. */
(function registerConfirmationModule(global) {
  "use strict";

  global.WSMudClient.registerModule("confirmation", function create(context) {
    const { jquery, documentRef, hostWindow } = context;
    const getDialog = context.getDialog;
    const getProcess = context.getProcess;
    const getUtil = context.getUtil;
    const sendCommand = context.sendCommand;
    const isTopPopupLayer = context.isTopPopupLayer;

    const Confirm = {
      DEFAULT: {
        onOK: function () {},
        footer: true,
        btn_text: "确认",
      },
      Show: function (options) {
        this.Init();
        this.Parameter = Object.assign({}, this.DEFAULT, options);
        this.content.empty().append(this.Parameter.content);
        this.element.show();
        if (this.Parameter.footer) {
          this.btn.show();
          this.btn.find(".btn-text").html(this.Parameter.btn_text);
        } else {
          this.btn.hide();
        }
        this.isShow = true;
        getDialog().positionSkillsConfirm();
        this.content.find("input").first().trigger("focus");
      },
      Close: function (confirmed) {
        if (!this.isShow) return;
        this.element.hide();
        this.element
          .removeClass("WG_skills_confirm")
          .css({ left: "", top: "", width: "", bottom: "" });
        this.isShow = false;
        const process = getProcess();
        process.releaseItemPopupSecondary(this.element);
        if (!confirmed && this.Parameter.onCancle) this.Parameter.onCancle();
      },
      Init: function () {
        if (this._init) return;
        this.element = jquery(".dialog-confirm");
        this.content = this.element.find(".dialog-content");
        this.btn = this.element.find(".dialog-btn");
        this.element.on("click", ".btn-ok", function () {
          if (Confirm.Parameter.content === Confirm.count_element) {
            const input = Confirm.count_element.find("input");
            let value = parseInt(input.val());
            if (value.toString() == "NaN") value = 0;
            if (value > Confirm.max_count) value = Confirm.max_count;
            Confirm.Parameter.onOK(value);
          } else {
            Confirm.Parameter.onOK();
          }
          Confirm.Close(true);
          return false;
        });
        this.element.on("click", ".btn", function (event) {
          const maxCount = Confirm.max_count || 1000;
          const button = jquery(event.target);
          const action = parseInt(button.attr("ac"));
          const input = button.parent().find("input");
          let value = parseInt(input.val());
          if (value.toString() == "NaN") value = 0;
          if (action == -10) value -= 10;
          else if (action == 10) {
            if (value == 1) value = 0;
            value += 10;
          } else if (action == 1) value = maxCount;
          else value = 1;
          if (value < 1) value = 1;
          else if (value > maxCount) value = maxCount;
          input.val(value);
          return false;
        });
        jquery(documentRef)
          .off("keydown.WG_confirm")
          .on("keydown.WG_confirm", function (event) {
            if (
              event.key === "Escape" &&
              Confirm.isShow &&
              isTopPopupLayer(Confirm.element)
            ) {
              Confirm.Close();
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          });
        this._init = true;
      },
      Process: function (parts) {
        let action = parts[1];
        let prefix = "";
        if (action == "dc") {
          action = parts[3];
          const commandPrefix = parts.splice(1, 2);
          prefix = commandPrefix[0] + " " + commandPrefix[1] + " ";
        }
        const handler = this["Show_" + action];
        if (handler) handler.call(this, parts, prefix);
      },
      get_countelement: function (count, maxCount) {
        if (!this.count_element) {
          this.count_element = jquery(
            '<div  class="confirm-count"><span class="btn" ac="0">最少</span><span ac="-10" class="btn">减10</span><input type="text" value="1" /><span class="btn"  ac="10" >加10</span><span class="btn" ac="1" >最多</span></div>',
          );
        }
        this.count_element.find("input").val(count || 1);
        if (maxCount) maxCount = parseInt(maxCount);
        this.max_count = maxCount || 1000;
        return this.count_element;
      },
      Show_shop: function (parts) {
        const itemId = parts[2];
        if (!itemId) return;
        const item = getDialog().shop.get_item(itemId);
        if (!item) return;
        const maxCount = parts[3] ? parseInt(parts[3]) : -1;
        this.Show({
          content: this.get_countelement(1, maxCount == -1 ? 9999 : maxCount),
          btn_text: "购买" + item.name,
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand("shop " + itemId + " " + count);
          },
        });
      },
      Show_buy: function (parts) {
        const itemId = parts[3];
        if (!itemId) return;
        const maxCount = parseInt(parts[2]);
        this.Show({
          content: this.get_countelement(1, maxCount == -1 ? 9999 : maxCount),
          btn_text: "购买",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand("buy " + count + " " + itemId + " from " + parts[5]);
          },
        });
      },
      Show_greet: function () {
        this.Show({
          content: this.get_countelement(1, 99),
          btn_text: "送花",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand("greet " + count);
          },
        });
      },
      Show_sell: function (parts) {
        const itemId = parts[3];
        if (!itemId) return;
        this.Show({
          content: this.get_countelement(parts[2], parts[2]),
          btn_text: "卖出",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand("sell " + count + " " + itemId + " to " + parts[5]);
          },
        });
      },
      Show_store: function (parts) {
        const itemId = parts[3];
        if (!itemId) return;
        const dialog = getDialog();
        if (parts[2] == 1) {
          return sendCommand(
            (dialog.list.is_bookshelf ? "sj " : "") + "store " + itemId,
          );
        }
        this.Show({
          content: this.get_countelement(parts[2], parts[2]),
          btn_text: "存入",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand(
              (getDialog().list.is_bookshelf ? "sj " : "") +
                "store " +
                count +
                " " +
                itemId,
            );
          },
        });
      },
      Show_fenjie: function (parts, prefix) {
        const itemId = parts[2];
        if (!itemId) return;
        const dialog = getDialog();
        const item = dialog.pack.isShow
          ? dialog.pack.get_item(itemId)
          : dialog.pack2.get_item(itemId);
        if (!item) return;
        if (item.name.indexOf("★") == -1) return sendCommand("fenjie " + itemId);
        this.Show({
          content: "是否确认分解" + item.name + "？",
          btn_text: "确认分解",
          onOK: function () {
            sendCommand(prefix + "fenjie " + itemId);
          },
        });
      },
      Show_qu: function (parts) {
        const itemId = parts[2];
        if (!itemId) return;
        const dialog = getDialog();
        const item = dialog.list.find_item(3, itemId);
        if (!item) return;
        if (item.count === 1) {
          return sendCommand(
            (dialog.list.is_bookshelf ? "sj " : "") + "qu 1 " + itemId,
          );
        }
        this.Show({
          content: this.get_countelement(item.count, item.count),
          btn_text: "取出",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand(
              (getDialog().list.is_bookshelf ? "sj " : "") +
                "qu " +
                count +
                " " +
                itemId,
            );
          },
        });
      },
      Show_drop: function (parts, prefix) {
        const itemId = parts[3];
        if (!itemId) return;
        const dialog = getDialog();
        const item = dialog.pack.isShow
          ? dialog.pack.get_item(itemId)
          : dialog.pack2.get_item(itemId);
        if (!item) return;
        this.Show({
          content:
            parts[2] == 1
              ? "是否确认丢掉" + item.name + "？"
              : this.get_countelement(parts[2], parts[2]),
          btn_text: "丢掉",
          onOK: function (count) {
            if (parts[2] == 1) return sendCommand(prefix + "drop " + itemId);
            if (!(count > 0)) return;
            sendCommand(prefix + "drop " + count + " " + itemId);
          },
        });
      },
      Show_give: function (parts, prefix) {
        const itemId = parts[4];
        if (!itemId) return;
        const dialog = getDialog();
        const item = dialog.pack2.get_item(itemId);
        if (!item) return;
        if (item.count == 1) {
          return sendCommand(prefix + "give " + getProcess().player + " 1 " + itemId);
        }
        this.Show({
          content: this.get_countelement(item.count, item.count),
          btn_text: "拿来",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand(prefix + "give " + getProcess().player + " " + count + " " + itemId);
          },
        });
      },
      Show_trade_add: function (item) {
        if (!item) return;
        this.Show({
          content: this.get_countelement(item.count, item.count),
          btn_text: "确定",
          onOK: function (count) {
            if (!(count > 0)) return;
            const copy = getUtil().Clone(item);
            copy.count = count;
            getDialog().trade.add_trade(copy);
          },
        });
      },
      Show_fangqi: function (parts, prefix) {
        const skillId = parts[2];
        if (!skillId) return;
        const dialog = getDialog();
        const skill = prefix ? dialog.master.skills[skillId] : dialog.skills.skills[skillId];
        if (!skill) return;
        this.Show({
          content: "是否确认放弃技能" + skill.name + "？",
          onOK: function () {
            sendCommand(prefix + "fangqi " + skillId);
          },
        });
      },
      Show_combine: function (parts, prefix) {
        const itemId = parts[2];
        if (!itemId) return;
        const item = getDialog().pack.get_item(itemId);
        if (!item) return;
        const unitCount = parseInt(parts[3]);
        if (!unitCount) return;
        const maxCount = parseInt(item.count / unitCount);
        if (maxCount == 1) return sendCommand("combine " + itemId);
        this.Show({
          content: this.get_countelement(maxCount),
          btn_text: "合成",
          onOK: function (count) {
            if (!(count > 0)) return;
            sendCommand(prefix + "combine " + itemId + " " + count);
          },
        });
      },
      Show_pay: function () {
        sendCommand("pay 0 " + (/mobile/i.test(hostWindow.navigator.userAgent) ? "m" : "c"));
      },
    };

    return Confirm;
  });
})(window);
