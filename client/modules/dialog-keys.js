/** Keyboard shortcut settings and global shortcut dispatch. */
(function registerDialogKeysModule(global) {
  "use strict";

  global.WSMudClient.registerModule("dialog-keys", function create(context) {
    const Dialog = context.Dialog || (context.getDialog && context.getDialog());
    const jquery = context.jquery || context.jQuery;
    const documentRef = context.documentRef || context.document;
    const windowRef = context.windowRef || context.window;
    const storageUtil = context.storageUtil;
    const getUtilities = context.getUtilities || context.getUtil;
    const getScript = context.getScript || context.getSCRIPT;

    const keys = {
      groups: [
        {
          name: "移动",
          items: [
            {
              name: "左",
              key: null,
              cmd: "#go @dir(left)",
            },
            {
              name: "右",
              key: null,
              cmd: "#go @dir(right)",
            },
            {
              name: "上",
              key: null,
              cmd: "#go @dir(up)",
            },
            {
              name: "下",
              key: null,
              cmd: "#go @dir(down)",
            },
            {
              name: "左上",
              key: null,
              cmd: "#go @dir(leftup)",
            },
            {
              name: "左下",
              key: null,
              cmd: "#go @dir(leftdown)",
            },
            {
              name: "右上",
              key: null,
              cmd: "#go @dir(rightup)",
            },
            {
              name: "右下",
              key: null,
              cmd: "#go @dir(rightdown)",
            },
          ],
        },
        {
          name: "菜单",
          items: [
            {
              name: "属性",
              key: null,
              cmd: "#menu score",
            },
            {
              name: "背包",
              key: null,
              cmd: "#menu pack",
            },
            {
              name: "技能",
              key: null,
              cmd: "#menu skills",
            },
            {
              name: "任务",
              key: null,
              cmd: "#menu tasks",
            },
            {
              name: "商城",
              key: null,
              cmd: "#menu shop",
            },
            {
              name: "社交",
              key: null,
              cmd: "#menu message",
            },
            {
              name: "排行",
              key: null,
              cmd: "#menu stats",
            },
            {
              name: "设置",
              key: null,
              cmd: "#menu setting",
            },
            {
              name: "动作",
              key: null,
              cmd: "#menu showcombat",
            },
            {
              name: "活动",
              key: null,
              cmd: "#menu events",
            },
            {
              name: "聊天",
              key: null,
              cmd: "#menu showchat",
            },
            {
              name: "停止",
              key: null,
              cmd: "#menu stopstate",
            },
            {
              name: "江湖",
              key: null,
              cmd: "#menu jh",
            },
          ],
        },
      ],
      setting: null,
      show: function (_0x46eb49) {
        this.element = _0x46eb49;
        this.init();
        _0x46eb49.on("click", ".skey-item", this.item_clicked);
        documentRef.body.addEventListener("keydown", this.record_press);
      },
      hide: function () {
        documentRef.body.removeEventListener("keydown", this.record_press);
      },
      close: function () {
        documentRef.body.removeEventListener("keydown", this.record_press);
      },
      record_press: function (_0x475681) {
        let _0x3a90bc = Dialog.keys.select_item;
        if (!_0x3a90bc) {
          return;
        }
        let _0x4c03d7 = Dialog.keys.get_item(_0x3a90bc.attr("sid"));
        if (!_0x4c03d7) {
          return;
        }
        if (_0x475681.keyCode === 8 || _0x475681.keyCode === 27) {
          Dialog.keys.save_setting(_0x4c03d7, null);
          return _0x3a90bc.find(".skey-key").html("");
        }
        let _0x155abe = Dialog.keys.get_key_code(_0x475681);
        Dialog.keys.save_setting(_0x4c03d7, _0x155abe);
        _0x3a90bc.find(".skey-key").html(_0x4c03d7.key);
        _0x475681.preventDefault();
        _0x475681.stopPropagation();
      },
      get_key_code: function (_0x3aadc7) {
        let _0x9455d8 = _0x3aadc7.code;
        if (_0x3aadc7.ctrlKey) {
          if (_0x3aadc7.key === "Control") {
            return;
          }
          _0x9455d8 = "Ctrl+" + _0x9455d8;
        }
        if (_0x3aadc7.altKey) {
          if (_0x3aadc7.key === "Alt") {
            return;
          }
          _0x9455d8 = "Alt+" + _0x9455d8;
        }
        if (_0x3aadc7.shiftKey) {
          if (_0x3aadc7.key === "Shift") {
            return;
          }
          _0x9455d8 = "Shift+" + _0x9455d8;
        }
        return _0x9455d8;
      },
      save_setting: function (_0x302b83, _0x451e1e) {
        _0x302b83.key = _0x451e1e;
        if (!this.setting) {
          this.setting = {};
        }
        if (!_0x451e1e) {
          _0x451e1e = this.id2keys[_0x302b83.id];
          if (_0x451e1e) {
            delete this.setting[_0x451e1e];
          }
          delete this.id2keys[_0x302b83.id];
        } else if (_0x451e1e) {
          if (this.setting[_0x451e1e]) {
            if (this.setting[_0x451e1e] === _0x302b83.id) {
              return;
            }
            let _0x117196 = this.get_item(this.setting[_0x451e1e]);
            if (_0x117196) {
              _0x117196.key = null;
              this.element
                .find('.skey-item[sid="' + _0x117196.id + '"]>.skey-key')
                .html("");
            }
          }
          this.setting[_0x451e1e] = _0x302b83.id;
        }
        storageUtil.setItem("keys", this.setting);
      },
      get_item: function (_0x51e426) {
        if (this.groups.length === 2) {
          this.init();
        }
        let _0x48990b = _0x51e426.split("_");
        let _0x4e3d60 = Dialog.keys.groups[parseInt(_0x48990b[0])];
        if (!_0x4e3d60) {
          return;
        }
        let _0x104fe4 = _0x4e3d60.items[parseInt(_0x48990b[1])];
        return _0x104fe4;
      },
      default_keys: {
        KeyW: "0_2",
        KeyA: "0_0",
        KeyR: "0_6",
        KeyD: "0_1",
        KeyS: "0_3",
        KeyQ: "0_4",
      },
      init_key: function () {
        if (this.load_storage) {
          return;
        }
        if (getUtilities().isMobile) {
          return;
        }
        this.load_storage = true;
        this.setting = storageUtil.getItem("keys");
        windowRef.addEventListener("keydown", this.keypress);
        this.id2keys = {};
        if (!this.setting) {
          return;
        }
        for (let _0x1b368a in this.setting) {
          this.id2keys[this.setting[_0x1b368a]] = _0x1b368a;
        }
      },
      keypress: function (_0x792b5b) {
        if (_0x792b5b.target !== documentRef.body) {
          return;
        }
        let _0x391b2e = Dialog.keys.setting;
        if (!_0x391b2e) {
          return;
        }
        let _0x56f461 = Dialog.keys.get_key_code(_0x792b5b);
        if (_0x391b2e[_0x56f461]) {
          let _0x5a35c9 = Dialog.keys.get_item(_0x391b2e[_0x56f461]);
          if (_0x5a35c9) {
            getScript().run(_0x5a35c9.cmd);
            _0x792b5b.preventDefault();
          }
        }
      },
      item_clicked: function () {
        let _0x3f893d = Dialog.keys.select_item;
        if (_0x3f893d) {
          _0x3f893d.removeClass("selected");
        }
        Dialog.keys.select_item = jquery(this).addClass("selected");
      },
      init: function () {
        if (this.groups.length > 2) {
          return;
        }
        let _0x13f2fc = this.id2keys || {};
        let _0x5ac3e3 = null;
        let _0xead9c7 = 0;
        for (let _0x4336bb of this.groups) {
          for (let _0x466079 = 0; _0x466079 < _0x4336bb.items.length; _0x466079++) {
            _0x5ac3e3 = _0xead9c7 + "_" + _0x466079;
            _0x4336bb.items[_0x466079].id = _0x5ac3e3;
            _0x4336bb.items[_0x466079].key = _0x13f2fc[_0x5ac3e3];
          }
          _0xead9c7++;
        }
        let _0x4c6d1e = {
          name: "动作栏",
          items: [],
        };
        for (let _0x5c3165 = 0; _0x5c3165 < 9; _0x5c3165++) {
          _0x5ac3e3 = "2_" + _0x5c3165;
          _0x4c6d1e.items.push({
            name: "栏位" + (_0x5c3165 + 1),
            id: _0x5ac3e3,
            cmd: "#action " + _0x5c3165,
            key: _0x13f2fc[_0x5ac3e3],
          });
        }
        this.groups.push(_0x4c6d1e);
        _0x4c6d1e = {
          name: "技能栏",
          items: [],
        };
        for (let _0x279cc5 = 0; _0x279cc5 < 9; _0x279cc5++) {
          _0x5ac3e3 = "3_" + _0x279cc5;
          _0x4c6d1e.items.push({
            name: "栏位" + (_0x279cc5 + 1),
            id: _0x5ac3e3,
            cmd: "#pfm " + _0x279cc5,
            key: _0x13f2fc[_0x5ac3e3],
          });
        }
        this.groups.push(_0x4c6d1e);
        if (this.element) {
          this.create_html();
        }
      },
      create_html: function () {
        let _0x5217cd = [];
        let _0x370dd3 = 0;
        let _0x557d5f = 0;
        for (let _0xd8308a of this.groups) {
          _0x5217cd.push("<h3>", _0xd8308a.name, "</h3>");
          _0x557d5f = 0;
          for (let _0x48edf5 of _0xd8308a.items) {
            _0x5217cd.push('<div class="skey-item" sid="', _0x48edf5.id, '">');
            _0x5217cd.push('<div class="skey-name">', _0x48edf5.name, "</div>");
            _0x5217cd.push('<div class="skey-key">', _0x48edf5.key, "</div>");
            _0x5217cd.push("</div>");
            _0x557d5f++;
          }
          _0x370dd3++;
        }
        this.element.html(_0x5217cd.join(""));
      },
    };

    return { keys };
  });
})(window);
