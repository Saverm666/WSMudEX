/** Shop dialog model and protocol renderer. */
(function registerDialogShopModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-shop",
    function createDialogShop(context) {
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

      if (
        !Dialog ||
        typeof $ !== "function" ||
        typeof SendCommand !== "function" ||
        typeof getMoneyToStr !== "function"
      ) {
        throw new TypeError(
          "商城对话框需要显式 Dialog、jQuery、SendCommand 和 moneyToStr 上下文",
        );
      }

      const shop = {
        selected_item: 0,
        close: function () {
          this.element.remove();
          this.isShow = false;
        },
        onData: function (_0x19a5b8) {
          if (_0x19a5b8.money) {
            let _0x4d468c = _0x19a5b8.money ?? [0, 0];
            this.money = _0x4d468c[0];
            this.cash_money = _0x4d468c[1];
            if (_0x4d468c.length > 2) {
              this.footers = ["黄金", "元宝", "活动"];
              this.act_money = _0x4d468c[2];
              this.act_name = _0x19a5b8.mtype ?? "<hic>积分</hic>";
            } else {
              this.footers = ["黄金", "元宝"];
              this.act_money = 0;
              this.act_name = "<hic>积分</hic>";
              if (this.selected_item > 1) {
                this.selected_item = 0;
              }
            }
            this.create_footer();
          }
          if (_0x19a5b8.remove) {
            let _0x56ecfa = this.get_item(_0x19a5b8.remove);
            if (_0x56ecfa) {
              _0x56ecfa.removed = true;
            }
            return this.show_items();
          }
          if (_0x19a5b8.item) {
            let [_0x30d752, _0x1ed2b1] = _0x19a5b8.item;
            let _0x7caa22 = this.get_item(_0x30d752);
            if (_0x7caa22) {
              _0x7caa22.count = _0x1ed2b1;
              this.show_items();
            }
            return;
          }
          if (!_0x19a5b8.idx) {
            return;
          }
          this.idx = _0x19a5b8.idx;
          this.list0 = this.format_items(_0x19a5b8.selllist[0], 0);
          this.list1 = this.format_items(_0x19a5b8.selllist[1], 1);
          this.list2 = _0x19a5b8.selllist.length > 2
            ? this.format_items(_0x19a5b8.selllist[2], 2)
            : [];
          if (this.list2.length && this.footers.length < 3) {
            this.footers = ["黄金", "元宝", "活动"];
          }
          if (!this.list2.length && this.footers.length > 2) {
            this.footers = ["黄金", "元宝"];
            if (this.selected_item > 1) {
              this.selected_item = 0;
            }
          }
          this.show_items();
        },
        footerChanged: function (_0x4ab078) {
          this.selected_item = parseInt(_0x4ab078);
          this.show_items();
          this.create_footer();
        },
        footers: ["黄金", "元宝"],
        create_footer: function () {
          if (!this.isShow) {
            return;
          }
          var _0x513d30 = [];
          for (var _0x5d9631 = 0; _0x5d9631 < this.footers.length; _0x5d9631++) {
            _0x513d30.push(
              "<span class='footer-item" +
                (_0x5d9631 == this.selected_item ? " select" : "") +
                "' for='" +
                _0x5d9631 +
                "''>" +
                this.footers[_0x5d9631] +
                "</span>",
            );
          }
          if (this.selected_item === 0) {
            _0x513d30.push(
              '<div class="obj-money">',
              this.money > 0
                ? "你身上有" + getMoneyToStr()(this.money)
                : "你身上没有银两",
              "</div>",
            );
          } else if (this.selected_item === 1) {
            _0x513d30.push(
              '<div class="obj-money">',
              this.cash_money > 0
                ? "你身上有" + this.cash_money + "<hij>元宝</hij>"
                : "你身上没有元宝",
              '<span cmd="transmoney">账号转入</span></div>',
            );
          } else if (this.selected_item === 2) {
            _0x513d30.push(
              '<div class="obj-money">你身上有',
              this.act_money > 0 ? this.act_money : 0,
              this.act_name || "<hic>积分</hic>",
              "</div>",
            );
          }
          Dialog.footer(_0x513d30.join(""));
        },
        format_items: function (_0x2800ac, _0x71d13e) {
          let _0x2b34c5 = [];
          for (let _0x57ae64 of _0x2800ac) {
            if (!_0x57ae64) {
              continue;
            }
            let _0x1090ad = {
              id: _0x57ae64[0],
              name: _0x57ae64[1],
              desc: _0x57ae64[2],
              value: _0x57ae64[3],
              grade: _0x57ae64[4],
              discount: _0x57ae64[5],
            };
            if (_0x57ae64[6]) {
              _0x1090ad.limit = _0x57ae64[6];
              _0x1090ad.count = _0x57ae64[7];
            }
            if (_0x1090ad.discount < 1) {
              _0x1090ad.price0 =
                _0x71d13e === 0
                  ? "<del>" + _0x1090ad.value + "两黄金</del>"
                  : _0x71d13e === 1
                    ? "<hij>" + _0x1090ad.value + "元宝</hij>"
                    : "<del>" +
                      _0x1090ad.value +
                      (this.act_name || "<hic>积分</hic>") +
                      "</del>";
              _0x1090ad.value = _0x1090ad.value * _0x1090ad.discount;
            }
            if (_0x71d13e === 0) {
              if (_0x1090ad.value >= 1) {
                _0x1090ad.price =
                  "<hiy>" + _0x1090ad.value + "两黄金</hiy>";
              } else {
                _0x1090ad.price =
                  "<wht>" + _0x1090ad.value * 100 + "两白银</wht>";
              }
            } else if (_0x71d13e === 1) {
              _0x1090ad.price = "<hij>" + _0x1090ad.value + "元宝</hij>";
            } else {
              _0x1090ad.price =
                _0x1090ad.value + (this.act_name || "<hic>积分</hic>");
            }
            _0x2b34c5.push(_0x1090ad);
          }
          return _0x2b34c5;
        },
        show_items: function () {
          if (!this.isShow) {
            return;
          }
          this.create_items(
            this.selected_item === 0
              ? this.list0
              : this.selected_item === 1
                ? this.list1
                : this.list2 || [],
          );
        },
        get_item: function (_0x368bad) {
          if (this.list0) {
            for (let _0x2d6465 of this.list0) {
              if (_0x2d6465.id === _0x368bad) {
                return _0x2d6465;
              }
            }
          }
          if (this.list1) {
            for (let _0x21f3fd of this.list1) {
              if (_0x21f3fd.id === _0x368bad) {
                return _0x21f3fd;
              }
            }
          }
          if (this.list2) {
            for (let _0x2c3e8a of this.list2) {
              if (_0x2c3e8a.id === _0x368bad) {
                return _0x2c3e8a;
              }
            }
          }
        },
        show: function (_0x593ca0) {
          if (!this.element) {
            this.element = $(
              "<div class='dialog-shop-content'><div class='dialog-shop'></div></div>",
            );
          }
          Dialog.title("商品列表");
          Dialog.icon("shopping-cart");
          this.isShow = true;
          this.element.appendTo(Dialog.contentElement);
          if (!this.idx) {
            SendCommand("shop");
          } else {
            SendCommand("shop " + this.idx);
          }
        },
        create_items: function (_0x2059b6) {
          let _0x206bc3 = [];
          for (let _0x45af07 = 0; _0x45af07 < _0x2059b6.length; _0x45af07++) {
            let _0x7a19f1 = _0x2059b6[_0x45af07];
            if (_0x7a19f1.removed) {
              _0x2059b6.splice(_0x45af07, 1);
              _0x45af07--;
              continue;
            }
            _0x206bc3.push("<div class='shop-item");
            _0x206bc3.push(" grade", _0x7a19f1.grade);
            _0x206bc3.push(
              "'><div class='flex-1'><div class='shop-item-title'>",
            );
            _0x206bc3.push(
              '<div class="shop-item-name">',
              _0x7a19f1.name,
              "</div>",
            );
            if (_0x7a19f1.limit > 0) {
              _0x206bc3.push("(", _0x7a19f1.count, "/", _0x7a19f1.limit, ")");
            }
            _0x206bc3.push("</div>");
            _0x206bc3.push("<pre class='shop-desc'>");
            _0x206bc3.push(_0x7a19f1.desc);
            _0x206bc3.push("</pre></div>");
            _0x206bc3.push("<div class='shop-btn' ");
            _0x206bc3.push('cmd="_confirm shop ', _0x7a19f1.id);
            if (_0x7a19f1.limit > 0) {
              _0x206bc3.push(" ", _0x7a19f1.limit - _0x7a19f1.count);
            }
            _0x206bc3.push('">');
            if (_0x7a19f1.price0) {
              _0x206bc3.push("&nbsp;", _0x7a19f1.price0, "&nbsp;");
            }
            _0x206bc3.push(_0x7a19f1.price);
            _0x206bc3.push("</div>");
            _0x206bc3.push("</div>");
          }
          this.element.find(".dialog-shop").html(_0x206bc3.join(""));
        },
      };

      return { shop };
    },
  );
})(window);
