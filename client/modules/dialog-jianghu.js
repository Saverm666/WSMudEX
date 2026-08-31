/** Jianghu, dungeon and forbidden-area dialog models. */
(function registerDialogJianghuModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-jianghu",
    function createDialogJianghu(context) {
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
      const ReceiveMessage =
        typeof context.getReceiveMessage === "function"
          ? context.getReceiveMessage()
          : context.ReceiveMessage || context.receiveMessage;

      if (
        !Dialog ||
        typeof $ !== "function" ||
        typeof SendCommand !== "function" ||
        typeof ReceiveMessage !== "function"
      ) {
        throw new TypeError(
          "江湖对话框需要显式 Dialog、jQuery、SendCommand 和 ReceiveMessage 上下文",
        );
      }

      const jh_fam = {
        name: "门派",
        items: null,
        selected_index: 0,
        type: "fam",
        onDetail: function (_0x295b61) {
          var _0x51a667 = this.items[_0x295b61.index];
          if (!_0x51a667) {
            return;
          }
          _0x51a667.desc = _0x295b61.desc;
          _0x51a667.sp = _0x295b61.sp;
          _0x51a667.type = _0x295b61.t;
          _0x51a667.actions = _0x295b61.actions;
          _0x51a667.skills = _0x295b61.skills;
          return this.showDetail(_0x51a667);
        },
        showDetail: function (_0x465ca8) {
          var _0x139f76 = ["<pre><hig>"];
          _0x139f76.push(_0x465ca8.name);
          _0x139f76.push("</hig>\n");
          _0x139f76.push(_0x465ca8.desc);
          if (_0x465ca8.sp) {
            _0x139f76.push("\n<hig>特点：");
            _0x139f76.push(_0x465ca8.sp);
            _0x139f76.push("</hig>\n");
          }
          this.append_actions(_0x139f76, _0x465ca8);
          _0x139f76.push(
            '<div class="item-commands"><span cmd="jh fam ' +
              _0x465ca8.index +
              ' start">进入地图</span>',
          );
          let _0x10c9d6 = [];
          Dialog.extend.append(_0x10c9d6, "map", _0x465ca8);
          for (let _0x3f50e5 of _0x10c9d6) {
            _0x139f76.push(
              '<span cmd="',
              _0x3f50e5.cmd,
              '">',
              _0x3f50e5.name,
              "</span>",
            );
          }
          _0x139f76.push("</div>");
          if (_0x465ca8.skills) {
            _0x139f76.push(_0x465ca8.skills);
          }
          _0x139f76.push("</pre>");
          this.descElement.html(_0x139f76.join(""));
          this.select(_0x465ca8.index);
        },
        append_actions: function (_0x31054b, _0x340df0) {
          let _0x435348 = _0x340df0.actions ?? [];
          _0x31054b.push('<div class="fb-actions">');
          for (let _0x758e09 of _0x435348) {
            _0x31054b.push('<div class="fb-action">');
            _0x31054b.push(
              '<span class="action-desc">',
              _0x758e09[2] ?? "",
              "</span>",
            );
            if (_0x758e09[1]) {
              _0x31054b.push(
                '<span class="action-name"  cmd="',
                _0x758e09[0],
                '">',
                _0x758e09[1],
                "</span>",
              );
            }
            _0x31054b.push("</div>");
          }
          _0x31054b.push("</div>");
        },
        show: function (_0x108c5f, _0x598036) {
          var _0x1ac4b1 = [];
          for (var _0x32e406 = 0; _0x32e406 < this.items.length; _0x32e406++) {
            var _0x49b772 = this.items[_0x32e406];
            _0x1ac4b1.push('<div class="fam-item');
            _0x1ac4b1.push('" index="', _0x32e406, '">', _0x49b772.name, "</div>");
            _0x49b772.index = _0x32e406;
          }
          _0x108c5f.html(_0x1ac4b1.join(""));
          this.listElement = _0x108c5f;
          this.descElement = _0x598036;
          this.onClickItem(this.selected_index);
        },
        select: function (_0x538581) {
          var _0x4c8351 = this.listElement.find("div[index='" + _0x538581 + "']");
          if (_0x4c8351.length && !_0x4c8351.is(".selected")) {
            var _0x288c1d = _0x4c8351[0].offsetTop;
            var _0x13f8d9 = this.listElement.height();
            if (_0x288c1d > _0x13f8d9 / 2) {
              _0x288c1d = (_0x13f8d9 - _0x4c8351.height()) / 2;
              this.listElement[0].scrollTop = _0x288c1d;
            }
            if (this.selectedItem) {
              this.selectedItem.removeClass("selected");
            }
            this.selectedItem = _0x4c8351;
            this.selectedItem.addClass("selected");
            this.selected_index = _0x538581;
          }
        },
        onClickItem: function (_0x1395a3) {
          const _0x5d8184 = this.items[_0x1395a3];
          if (!_0x5d8184.desc) {
            SendCommand("jh " + this.type + " " + _0x1395a3);
          } else {
            this.showDetail(_0x5d8184);
          }
          this.select(_0x1395a3);
        },
        append_footer: function () {
          let _0x568f8f = this.items[this.selected_index];
          Dialog.footerElement
            .find(".item-commands")
            .html('<span cmd="jh fam ' + _0x568f8f.index + ' start">进入地图</span>');
        },
      };
      const jh_fb = {
        name: "副本",
        type: "fb",
        items: null,
        selected_index: -1,
        select: jh_fam.select,
        onClickItem: jh_fam.onClickItem,
        onDetail: function (_0x2c354e) {
          var _0x2f7e6e = this.items[_0x2c354e.index];
          if (!_0x2f7e6e) {
            return;
          }
          _0x2f7e6e.desc = _0x2c354e.desc;
          _0x2f7e6e.reward = _0x2c354e.reward;
          _0x2f7e6e.diffs = _0x2c354e.diffs;
          _0x2f7e6e.status = _0x2c354e.status;
          return this.showDetail(_0x2f7e6e);
        },
        update_unlock: function (_0x2520b9) {
          this.unlock = _0x2520b9;
          for (let _0x1d7685 = 0; _0x1d7685 < this.items.length; _0x1d7685++) {
            this.items[_0x1d7685].unlock = _0x2520b9 >= _0x1d7685;
          }
          if (this.selected_index < 0) {
            this.selected_index = _0x2520b9;
          }
        },
        show: function (_0x11f86d, _0xdde486) {
          this.listElement = _0x11f86d;
          this.descElement = _0xdde486;
          var _0x2a6274 = ["<div class='fb-content'>"];
          for (var _0x9d1918 = 0; _0x9d1918 < this.items.length; _0x9d1918++) {
            var _0x46ea08 = this.items[_0x9d1918];
            _0x2a6274.push('<div class="fb-item');
            if (!_0x46ea08.unlock) {
              _0x2a6274.push(" lock");
            }
            _0x46ea08.index = _0x9d1918;
            _0x2a6274.push('" index="', _0x9d1918, '">', _0x46ea08.name, "</div>");
          }
          _0x2a6274.join("</div>");
          this.listElement.html(_0x2a6274.join(""));
          this.onClickItem(this.selected_index);
        },
        show_first: function (_0x4e6640) {
          let _0x1479d0 = _0x4e6640.prev().html();
          if (_0x1479d0) {
            ReceiveMessage(_0x1479d0);
          }
        },
        fb_models: ["普通", "<red>困难</red>", "<cyn>组队</cyn>"],
        showDetail: function (_0x3d5373) {
          var _0x2d7224 = ["<pre>"];
          _0x2d7224.push(_0x3d5373.name);
          if (_0x3d5373.unlock) {
            _0x2d7224.push("\n<hig>已解锁</hig>\n");
          } else {
            _0x2d7224.push("\n<red>未解锁</red>\n");
          }
          _0x2d7224.push(_0x3d5373.desc);
          this.append_status(_0x2d7224, _0x3d5373);
          if (_0x3d5373.unlock && _0x3d5373.diffs) {
            _0x2d7224.push('<div class="item-commands">');
            for (let _0x266453 = 0; _0x266453 < _0x3d5373.diffs.length; _0x266453++) {
              if (_0x3d5373.diffs[_0x266453]) {
                _0x2d7224.push(
                  '<span cmd="jh fb ',
                  _0x3d5373.index,
                  " start",
                  _0x266453 + 1,
                  '">',
                  this.fb_buttons[_0x266453],
                  "</span>",
                );
              }
            }
            _0x2d7224.push("</div>");
          }
          _0x2d7224.push(_0x3d5373.reward);
          _0x2d7224.push("</pre>");
          this.descElement.html(_0x2d7224.join(""));
          this.select(_0x3d5373.index);
        },
        append_status: function (_0x5e6c88, _0x48c0f2) {
          const _0x983224 = _0x48c0f2.status ?? [];
          if (!_0x983224.length) {
            return;
          }
          _0x5e6c88.push('<div class="fb-actions">');
          for (let _0x22b631 = 0; _0x22b631 < _0x983224.length; _0x22b631++) {
            let _0x54ec72 = _0x983224[_0x22b631];
            if (!_0x54ec72) {
              continue;
            }
            if (_0x54ec72[0] === 1) {
              _0x5e6c88.push('<div class="fb-action finshed">');
              _0x5e6c88.push(
                '<span class="action-desc">由',
                _0x54ec72[1],
                "首次通过",
                "</span>",
              );
              _0x5e6c88.push(
                '<span class="action-name" cmd="cr2 ',
                _0x48c0f2.index,
                " ",
                _0x22b631,
                '">',
                this.fb_models[_0x22b631],
                "</span>",
              );
              _0x5e6c88.push("</div>");
            } else {
              _0x5e6c88.push('<div class="fb-action">');
              _0x5e6c88.push(
                '<span class="action-desc">该模式尚未完成首杀',
                _0x54ec72[1] ? "，称号奖励：" + _0x54ec72[1] : "",
                "</span>",
              );
              _0x5e6c88.push(
                '<span class="action-name"  cmd="cr2 ',
                _0x48c0f2.index,
                " ",
                _0x22b631,
                '">',
                this.fb_models[_0x22b631],
                "</span>",
              );
              _0x5e6c88.push("</div>");
            }
          }
          _0x5e6c88.push("</div>");
        },
        fb_buttons: ["进入副本", "困难模式", "组队进入"],
        append_footer: function () {
          let _0x4ca5a3 = this.items[this.selected_index];
          let _0x177f8b = [];
          if (_0x4ca5a3.unlock) {
            for (let _0x152d12 = 0; _0x152d12 < _0x4ca5a3.diffs.length; _0x152d12++) {
              if (_0x4ca5a3.diffs[_0x152d12]) {
                _0x177f8b.push(
                  '<span cmd="jh fb ',
                  _0x4ca5a3.index,
                  " start",
                  _0x152d12 + 1,
                  '">',
                  this.fb_buttons[_0x152d12],
                  "</span>",
                );
              }
            }
          }
          Dialog.footerElement.find(".item-commands").html(_0x177f8b.join(""));
        },
      };
      const jh_ar = {
        name: "禁地",
        items: null,
        type: "ar",
        selected_index: 0,
        select: jh_fam.select,
        onClickItem: jh_fam.onClickItem,
        append_status: jh_fb.append_status,
        append_actions: jh_fam.append_actions,
        fb_models: ["普通", "普通", "组队"],
        onDetail: function (_0x24b1cf) {
          var _0x1e510b = this.items[_0x24b1cf.index];
          if (!_0x1e510b) {
            return;
          }
          _0x1e510b.desc = _0x24b1cf.desc;
          _0x1e510b.actions = _0x24b1cf.actions;
          _0x1e510b.status = _0x24b1cf.status;
          _0x1e510b.reward = _0x24b1cf.reward;
          return this.showDetail(_0x1e510b);
        },
        update_unlock: function (_0x58666b) {
          for (let _0x4f5124 = 0; _0x4f5124 < this.items.length; _0x4f5124++) {
            this.items[_0x4f5124].unlock = (_0x58666b & Math.pow(2, _0x4f5124)) !== 0;
          }
        },
        show: function (_0x2308fe, _0x157c9c) {
          var _0x2f1239 = ["<div class='fb-content'>"];
          let _0x3eece2 = Math.max(this.items.length, 10);
          for (var _0x359f67 = 0; _0x359f67 < _0x3eece2; _0x359f67++) {
            var _0x13859f = this.items[_0x359f67];
            _0x2f1239.push('<div class="fb-item');
            if (_0x13859f) {
              if (!_0x13859f.unlock) {
                _0x2f1239.push(" lock");
              }
              _0x2f1239.push('" index="', _0x359f67, '">', _0x13859f.name, "</div>");
              _0x13859f.index = _0x359f67;
            } else {
              _0x2f1239.push('">&nbsp;</div>');
            }
          }
          _0x2f1239.join("</div>");
          this.listElement = _0x2308fe;
          this.descElement = _0x157c9c;
          this.listElement.html(_0x2f1239.join(""));
          this.onClickItem(this.selected_index);
        },
        showDetail: function (_0x2ab998) {
          var _0x57e4be = ["<pre>"];
          _0x57e4be.push(_0x2ab998.name);
          if (_0x2ab998.unlock) {
            _0x57e4be.push("\n<hig>已解锁</hig>\n");
          } else {
            _0x57e4be.push("\n<red>未解锁</red>\n");
          }
          _0x57e4be.push(_0x2ab998.desc, "\n");
          this.append_status(_0x57e4be, _0x2ab998);
          this.append_actions(_0x57e4be, _0x2ab998);
          if (_0x2ab998.unlock) {
            _0x57e4be.push('<div class="item-commands">');
            _0x57e4be.push(
              '<span cmd="jh ar ' + _0x2ab998.index + ' start">进入地图</span>',
            );
            _0x57e4be.push("</div>");
          }
          _0x57e4be.push(_0x2ab998.reward);
          _0x57e4be.push("</pre>");
          this.descElement.html(_0x57e4be.join(""));
          this.select(_0x2ab998.index);
        },
        append_footer: function () {
          let _0x36f7a1 = this.items[this.selected_index];
          if (_0x36f7a1.unlock) {
            Dialog.footerElement
              .find(".item-commands")
              .html(
                '<span cmd="jh ar ' + _0x36f7a1.index + ' start">进入地图</span>',
              );
          } else {
            Dialog.footerElement.find(".item-commands").empty();
          }
        },
      };
      const jh = {
        close: function () {
          this.element.remove();
          this.isShow = false;
        },
        onData: function (_0x4ad967) {
          if (_0x4ad967.close) {
            return Dialog.isShow && Dialog.hide();
          }
          if (_0x4ad967.desc) {
            return this.selected_item.onDetail(_0x4ad967);
          }
          if (_0x4ad967.unlock !== undefined || _0x4ad967.unlock2 !== undefined) {
            return this.update_lock(_0x4ad967);
          }
          if (_0x4ad967.refresh !== undefined && this.isLoad) {
            let _0x228d48 = Dialog["jh_" + _0x4ad967.t];
            let _0x5181e6 = _0x228d48.items[_0x4ad967.refresh];
            if (_0x5181e6 && _0x5181e6.desc) {
              _0x5181e6.desc = null;
              let _0x4342c1 = _0x228d48.items.indexOf(_0x5181e6);
              if (_0x228d48.selected_index == _0x4342c1) {
                _0x228d48.onClickItem(_0x4342c1);
              }
            }
            return;
          }
          if (!_0x4ad967.fbs) {
            return;
          }
          Dialog.jh_fam.items = _0x4ad967.families.map(function (_0x2aadde) {
            return {
              name: _0x2aadde,
              unlock: false,
            };
          });
          Dialog.jh_fb.items = _0x4ad967.fbs.map(function (_0x59d2b9) {
            return {
              name: _0x59d2b9,
            };
          });
          Dialog.jh_ar.items = _0x4ad967.areas.map(function (_0x3f5b08) {
            return {
              name: _0x3f5b08,
              unlock: false,
            };
          });
          this.selected_item.show(this.listElement, this.descElement);
        },
        show: function () {
          if (this.isShow) {
            return;
          }
          if (!this.element) {
            this.element = $(
              "<div class='dialog-fb'><div class='fb-left'></div><div class='fb-right'></div></div>",
            );
          }
          this.listElement = this.element
            .find(".fb-left")
            .on("click", ".fb-item,.fam-item", this.item_click);
          this.descElement = this.element.find(".fb-right");
          Dialog.title("江湖");
          Dialog.icon("home");
          this.element.appendTo(Dialog.contentElement);
          this.isShow = true;
          if (this.isLoad) {
            SendCommand("jh fb lock");
          } else {
            SendCommand("jh");
            this.isLoad = true;
            this.selected_item = this.footers[0];
          }
          this.create_footer();
        },
        selected_item: null,
        footers: [jh_fam, jh_fb, jh_ar],
        create_footer: function () {
          var _0x5a2311 = [];
          for (var _0x1bc230 = 0; _0x1bc230 < this.footers.length; _0x1bc230++) {
            let _0x4fe172 = this.footers[_0x1bc230];
            _0x5a2311.push(
              "<span class='footer-item" +
                (_0x4fe172 == this.selected_item ? " select" : "") +
                "' for='" +
                _0x1bc230 +
                "'>" +
                this.footers[_0x1bc230].name +
                "</span>",
            );
          }
          _0x5a2311.push('<div class="item-commands"></div>');
          Dialog.footerElement.html(_0x5a2311.join(""));
        },
        item_click: function () {
          var _0x3917f3 = $(this);
          if (_0x3917f3.is(".selected")) {
            return;
          }
          let _0x449d01 = _0x3917f3.attr("index");
          if (_0x449d01 !== undefined) {
            Dialog.jh.selected_item.onClickItem(_0x449d01);
          }
        },
        update_lock: function (_0x4150ee) {
          if (_0x4150ee.unlock >= 0 && Dialog.jh_fb.items) {
            Dialog.jh_fb.update_unlock(_0x4150ee.unlock);
            if (this.selected_item === Dialog.jh_fb) {
              Dialog.jh_fb.show(this.listElement, this.descElement);
            }
          }
          if (_0x4150ee.unlock2 >= 0 && Dialog.jh_ar.items) {
            Dialog.jh_ar.update_unlock(_0x4150ee.unlock2);
            if (this.selected_item === Dialog.jh_ar) {
              Dialog.jh_ar.show(this.listElement, this.descElement);
            }
          }
        },
        footerChanged: function (_0x4e04cd) {
          let _0x391be0 = this.footers[_0x4e04cd];
          if (_0x391be0 == this.selected_item) {
            return;
          }
          this.selected_item = _0x391be0;
          Dialog.footerElement.find(".item-commands").empty();
          _0x391be0.show(this.listElement, this.descElement);
        },
      };

      return { jh_fam, jh_fb, jh_ar, jh };
    },
  );
})(window);
