/** Dialog.extend custom automation editor and runtime matching. */
(function registerDialogExtensionsModule(global) {
  "use strict"

  global.WSMudClient.registerModule(
    "dialog-extensions",
    function createDialogExtensions(context) {
      const getDialog =
        typeof context.getDialog === "function"
          ? context.getDialog
          : () => context.Dialog || global.Dialog;
      const getJQuery =
        typeof context.getJQuery === "function"
          ? context.getJQuery
          : () => context.jquery || context.jQuery || context.$;
      const getProcess =
        typeof context.getProcess === "function"
          ? context.getProcess
          : () => context.Process || global.Process;
      const getReceiveMessage =
        typeof context.getReceiveMessage === "function"
          ? context.getReceiveMessage
          : () => context.ReceiveMessage || global.ReceiveMessage;
      const getCombat =
        typeof context.getCombat === "function"
          ? context.getCombat
          : () => context.Combat || global.Combat;
      const getScript =
        typeof context.getScript === "function"
          ? context.getScript
          : () => context.SCRIPT || global.SCRIPT;
      const getStorageUtil =
        typeof context.getStorageUtil === "function"
          ? context.getStorageUtil
          : () => context.storageUtil || global.storageUtil;
      const now =
        typeof context.now === "function" ? context.now : () => Date.now();
      const timers = context.timers || global;
      const setTimeoutFn =
        typeof timers.setTimeout === "function"
          ? timers.setTimeout.bind(timers)
          : global.setTimeout.bind(global);

      const currentDialog = () => getDialog();
      const currentJQuery = () => getJQuery();
      const currentProcess = () => getProcess();
      const currentReceiveMessage = () => getReceiveMessage();
      const currentCombat = () => getCombat();
      const currentScript = () => getScript();
      const currentStorage = () => getStorageUtil();
      const $ = (...args) => currentJQuery()(...args);
      const ReceiveMessage = (...args) => currentReceiveMessage()(...args);

      if (typeof getDialog !== "function" || typeof getJQuery !== "function") {
        throw new TypeError("Dialog.extend 需要显式 Dialog 和 jQuery 上下文");
      }

const extend = {
  types: [
    {
      name: "自定义快捷操作",
      value: "button",
      for: [
        {
          name: "动作栏",
          value: "action",
        },
        {
          name: "地图",
          value: "map",
        },
        {
          name: "背包道具",
          value: "pack",
        },
        {
          name: "技能",
          value: "skill",
        },
        {
          name: "师父/随从技能",
          value: "mskill",
        },
        {
          name: "房间物体",
          value: "item",
        },
      ],
    },
  ],
  init: function (_0x4e8026) {
    _0x4e8026.on("click", "[ecmd]", this.onButtonClick);
    _0x4e8026.on("click", ".setting-item", this.onClickRow);
    _0x4e8026.on("click", ".switch", this.switchClick);
    _0x4e8026.on("change", "select", this.selectChanged);
    if (this.element) {
      return;
    }
    this.element = _0x4e8026;
    let _0x57d9d5 = [];
    _0x57d9d5.push('<div class="extend-list">');
    this.append_settings(_0x57d9d5);
    _0x57d9d5.push("</div>");
    this.append_edit(_0x57d9d5);
    _0x4e8026.html(_0x57d9d5.join(""));
    this.edit_elem = this.element.find(".extend-add");
    this.list_elem = this.element.find(".extend-list");
  },
  refresh_list: function () {
    let _0x5e4e71 = [];
    this.append_settings(_0x5e4e71);
    this.list_elem.html(_0x5e4e71.join(""));
  },
  append_settings: function (_0x427e22) {
    let _0x200e2d = this.setting;
    let _0x50736d = 0;
    for (let _0x485301 of _0x200e2d) {
      _0x427e22.push(this.create_item(_0x485301, _0x50736d++));
    }
  },
  action_types: {
    button: "快捷操作",
    trigger: "触发器",
    filter: "过滤器",
  },
  regex: {
    message: true,
    fmessage: true,
  },
  for_types: {
    map: "地图",
    action: "动作栏",
    pack: "背包道具",
    skill: "技能",
    item: "房间物体",
    mskill: "师父/随从技能",
    message: "文本",
    data: "事件",
    fmessage: "文本",
    fdata: "事件",
  },
  create_item: function (_0x5a3570, _0x2a3071) {
    let _0x90ce50 = [];
    _0x90ce50.push('<div class="setting-item" sid="', _0x2a3071++, '">');
    _0x90ce50.push('<div class="title">');
    _0x90ce50.push(
      this.for_types[_0x5a3570.for],
      this.action_types[_0x5a3570.type],
      "【",
      _0x5a3570.name,
      "】",
    );
    _0x90ce50.push("</div>");
    let _0x5c0ab0 = false;
    if (_0x5a3570.on && _0x5a3570.on[currentProcess().player]) {
      _0x5c0ab0 = true;
    }
    _0x90ce50.push(
      '<span class="switch ',
      _0x5c0ab0 ? "on" : "",
      '"><span class="switch-button"></span><span class="switch-text">开</span></span>',
    );
    _0x90ce50.push("</div>");
    return _0x90ce50.join("");
  },
  selectChanged: function () {
    let _0xb91e4a = $(this);
    if (_0xb91e4a.attr("prop") !== "type") {
      const _0x32327d = _0xb91e4a.val();
      _0xb91e4a
        .parent()
        .next()
        .find(".extend-row-header")
        .html(currentDialog().extend.regex[_0x32327d] ? "正则表达式" : "可选参数");
      return;
    }
    let _0x32b60f = _0xb91e4a.val();
    let _0x46fd82 = null;
    for (let _0x5623c9 of currentDialog().extend.types) {
      if (_0x32b60f === _0x5623c9.value) {
        _0x46fd82 = _0x5623c9.for;
        break;
      }
    }
    if (!_0x46fd82) {
      return;
    }
    _0xb91e4a = _0xb91e4a.parent().next().find("select");
    let _0x2126a5 = [];
    for (let _0x570f88 of _0x46fd82) {
      _0x2126a5.push(
        '<option value="',
        _0x570f88.value,
        '">',
        _0x570f88.name,
        "</option>",
      );
    }
    _0xb91e4a.html(_0x2126a5.join(""));
  },
  switchClick: function () {
    let _0xe6e7d5 = $(this);
    let _0x1ef159 = _0xe6e7d5.find(".switch-text");
    let _0x57a809 = _0x1ef159.text();
    let _0x531762 = _0x57a809 !== "开始记录";
    let _0x5e3cf2 = false;
    if (_0xe6e7d5.is(".on")) {
      _0xe6e7d5.removeClass("on");
      if (_0x531762) {
        _0x1ef159.html("关");
      }
    } else {
      _0xe6e7d5.addClass("on");
      if (_0x531762) {
        _0x1ef159.html("开");
      }
      _0x5e3cf2 = true;
    }
    if (!_0x531762) {
      if (_0x5e3cf2) {
        currentDialog().close();
        currentDialog().extend.start_record();
      } else {
        currentDialog().extend.stop_record();
      }
    } else {
      let _0xb99ef7 = currentDialog().extend.setting[_0xe6e7d5.parent().attr("sid")];
      if (_0xb99ef7) {
        if (!_0xb99ef7.on) {
          _0xb99ef7.on = {};
        }
        if (_0x5e3cf2) {
          _0xb99ef7.on[currentProcess().player] = 1;
        } else {
          delete _0xb99ef7.on[currentProcess().player];
        }
        currentDialog().extend.save_extend(_0xb99ef7);
      }
    }
    return false;
  },
  start_record: function () {
    if (this.is_record) {
      return;
    }
    this.is_record = true;
    this.prev_time = 0;
    this.record_cmds = [];
    ReceiveMessage("<hic>开始记录你的操作命令。</hic>");
    currentProcess().state({
      state: "正在记录你的操作命令",
    });
  },
  excluded: {
    score: true,
    score2: true,
    pack: true,
    cha: true,
    tasks: true,
    message: true,
    relation: true,
    shop: true,
    team: true,
    jh: true,
  },
  excluded_check: [
    (_0x3dcaaa) => _0x3dcaaa.startsWith("jh") && _0x3dcaaa.indexOf("start") < 0,
    (_0x3f78b6) => _0x3f78b6.startsWith("stats"),
    (_0x58ec6b) => _0x58ec6b.startsWith("map"),
    (_0x536b83) => _0x536b83.startsWith("look"),
  ],
  record: function (_0x55a56c) {
    if (!this.is_record) {
      return;
    }
    if (this.excluded[_0x55a56c]) {
      return;
    }
    for (let _0x5a65fb of this.excluded_check) {
      if (_0x5a65fb(_0x55a56c)) {
        return;
      }
    }
    let _0x370a37 = now();
    if (this.prev_time > 0) {
      this.record_cmds.push("#wait " + (_0x370a37 - this.prev_time));
    }
    this.record_cmds.push(_0x55a56c);
    this.prev_time = _0x370a37;
  },
  stop_record: function () {
    if (!this.is_record) {
      return;
    }
    this.is_record = false;
    ReceiveMessage("<cyn>已停止记录你的操作命令。</cyn>");
    this.edit_elem.find(".switch").removeClass("on");
    if (this.record_cmds.length > 0) {
      currentDialog().show("setting");
      currentDialog().setting.footerChanged(3);
      this.edit_elem.removeClass("hide");
      this.list_elem.addClass("hide");
      this.edit_elem.find("textarea").val(this.record_cmds.join(";"));
      currentProcess().state();
    }
  },
  helper:
    "<li ecmd='show_actions'>可用命令参考</li><li ecmd='show_vars'>可用变量参考</li><li ecmd='show_paras'>参数用法参考</li>",
  append_edit: function (_0x2a3e24) {
    _0x2a3e24.push('<div class="extend-add hide">');
    _0x2a3e24.push('<div class="extend-row">');
    _0x2a3e24.push('<input  prop="name" class="extend-input"/>');
    _0x2a3e24.push("<div class='extend-row-header'>提示/描述/说明</div>");
    _0x2a3e24.push("</div>");
    _0x2a3e24.push('<div class="extend-row">');
    _0x2a3e24.push('<select prop="type" class="extend-input">');
    for (let _0x58939c of this.types) {
      _0x2a3e24.push(
        '<option value="',
        _0x58939c.value,
        '">',
        _0x58939c.name,
        "</option>",
      );
    }
    _0x2a3e24.push("</select><div class='extend-row-header'>扩展类型</div>");
    _0x2a3e24.push("</div>");
    let _0x4d739c = this.types[0];
    _0x2a3e24.push('<div class="extend-row">');
    _0x2a3e24.push('<select prop="for" class="extend-input">');
    for (let _0x19a8db of _0x4d739c.for) {
      _0x2a3e24.push(
        '<option value="',
        _0x19a8db.value,
        '">',
        _0x19a8db.name,
        "</option>",
      );
    }
    _0x2a3e24.push("</select><div class='extend-row-header'>可用选项</div>");
    _0x2a3e24.push("</div>");
    _0x2a3e24.push('<div class="extend-row">');
    _0x2a3e24.push('<input  prop="paras" class="extend-input"/>');
    _0x2a3e24.push("<div class='extend-row-header'>可选参数</div>");
    _0x2a3e24.push("</div>");
    _0x2a3e24.push('<div class="extend-row flex-1">');
    _0x2a3e24.push(
      '<textarea   prop="content"  class="extend-input"></textarea>',
    );
    _0x2a3e24.push("<div class='extend-row-header extend-menus'>");
    _0x2a3e24.push(
      '<span class="switch"> <span class="switch-button"> </span><span class="switch-text">开始记录</span></span>',
    );
    _0x2a3e24.push("<ul class='extend-help'>");
    _0x2a3e24.push(this.helper);
    _0x2a3e24.push("</ul><button ecmd='save'>保存</button>");
    _0x2a3e24.push("</div></div>");
    _0x2a3e24.push("</div>");
  },
  onClickRow: function () {
    var _0x339c57 = $(this);
    var _0x1afb91 = currentDialog().extend.setting[_0x339c57.attr("sid")];
    if (!_0x1afb91) {
      return;
    }
    currentDialog().extend.selected_item = _0x1afb91;
    if (!currentDialog().extend.edit_button) {
      currentDialog().extend.edit_button = $(
        '<div class="buttons"><button ecmd="edit">编辑</button><button ecmd="add">添加新的扩展</button><button ecmd="remove">移除</button></div>',
      );
    }
    currentDialog().extend.edit_button.insertAfter(_0x339c57);
  },
  show: function (_0x13d0f1) {
    this.init(_0x13d0f1);
  },
  hide: function () {
    if (this.is_record) {
      this.stop_record();
    }
    if (this.list_elem.is(".hide")) {
      this.list_elem.removeClass("hide");
      this.edit_elem.addClass("hide");
      return false;
    }
  },
  close: function () {},
  default_extend: [
    {
      name: "<red>全部击杀</red>",
      type: "button",
      for: "action",
      content: "kill @npc",
    },
    {
      name: "<gre>全部拾取</gre>",
      type: "button",
      for: "action",
      content: "get all from @item(尸体)",
    },
    {
      name: "<gre>返回武庙</gre>",
      type: "button",
      for: "map",
      paras: "name(扬州)",
      content: "jh fam 0 start;go north;go north;go west",
    },
    {
      name: "练习到指定等级",
      type: "button",
      for: "skill",
      content: "lianxi @id @input",
    },
    {
      name: "学习到指定等级",
      type: "button",
      for: "mskill",
      content: "xue @input @id from @master",
    },
  ],
  init_extend: function () {
    if (!this.setting) {
      this.setting = currentStorage().getItem("extends") ?? this.default_extend;
    }
    this.init_extend_group();
  },
  init_extend_group: function () {
    this.groups = {};
    for (let _0x393a0f of this.setting) {
      this.init_extend_item(_0x393a0f);
    }
  },
  save_extend: function (_0x39dc9c) {
    currentStorage().setItem("extends", this.setting);
    this.init_extend_group();
    if (_0x39dc9c.for === "action") {
      currentCombat().refActions();
    }
  },
  init_extend_item: function (_0x585300) {
    let _0x541dea = this.groups[_0x585300.for];
    if (!_0x541dea) {
      _0x541dea = this.groups[_0x585300.for] = [];
    }
    let _0x1a8a0d = _0x585300.content;
    if (_0x585300.on === true) {
      _0x585300.on = {};
      _0x585300.on[currentProcess().player] = 1;
    }
    if (!_0x1a8a0d || !_0x585300.on || !_0x585300.on[currentProcess().player]) {
      return;
    }
    if (_0x1a8a0d[0] !== "#") {
      _0x1a8a0d = "#" + _0x1a8a0d;
    }
    _0x541dea.push({
      name: _0x585300.name,
      extend: true,
      check: this.regex[_0x585300.for]
        ? this.match(_0x585300.paras)
        : this.condtion(_0x585300.paras),
      cmd: _0x1a8a0d,
    });
  },
  match: function (_0x51a9ff) {
    try {
      if (!_0x51a9ff) {
        return null;
      }
      return this.express.match.bind(this, new RegExp(_0x51a9ff));
    } catch (_0x43628c) {
      console.error(_0x43628c);
      return null;
    }
  },
  exp_reg: /(\w+)\((>=|<=|!=|>|<)?(.+?)\)/g,
  condtion: function (_0x3620a4) {
    if (!_0x3620a4) {
      return null;
    }
    let _0x3669a5 = null;
    let _0x7c9f1b = [];
    while ((_0x3669a5 = this.exp_reg.exec(_0x3620a4))) {
      let _0x2678e9 = _0x3669a5[1];
      let _0x2e61ba = _0x3669a5[2];
      let _0x55dd8d = _0x3669a5[3];
      if (!_0x2678e9 || !_0x55dd8d) {
        return null;
      }
      if (_0x2e61ba) {
        let _0x113b30 = this.express[_0x2e61ba];
        if (!_0x113b30) {
          return null;
        }
        _0x7c9f1b.push(_0x113b30.bind(this, _0x2678e9, _0x55dd8d));
      } else if (
        _0x55dd8d[0] === "/" &&
        _0x55dd8d[_0x55dd8d.length - 1] === "/"
      ) {
        _0x7c9f1b.push(
          this.express.match_prop.bind(
            this,
            _0x2678e9,
            new RegExp(_0x55dd8d.substring(1, _0x55dd8d.length - 1)),
          ),
        );
      } else {
        _0x7c9f1b.push(this.express.def.bind(this, _0x2678e9, _0x55dd8d));
      }
    }
    if (_0x7c9f1b.length > 0) {
      return _0x7c9f1b;
    } else {
      return null;
    }
  },
  express: {
    ">=": function (_0x1fa5b7, _0x21b6c2, _0x3cefc7) {
      return _0x3cefc7[_0x1fa5b7] >= parseInt(_0x21b6c2);
    },
    ">": function (_0x4f6f50, _0x339c9b, _0x167ecb) {
      return _0x167ecb[_0x4f6f50] > parseInt(_0x339c9b);
    },
    "<": function (_0x23b29c, _0x5bbc6f, _0x1d9aa7) {
      return _0x1d9aa7[_0x23b29c] < parseInt(_0x5bbc6f);
    },
    "<=": function (_0x51d2d1, _0x410c1c, _0x226495) {
      return _0x226495[_0x51d2d1] <= parseInt(_0x410c1c);
    },
    "=": function (_0x31e474, _0x1740a4, _0x3461a6) {
      return (_0x3461a6[_0x31e474] = parseInt(_0x1740a4));
    },
    "!=": function (_0x4ff3ba, _0x51612c, _0x1b5ace) {
      return _0x1b5ace[_0x4ff3ba] != parseInt(_0x51612c);
    },
    match: function (_0x161fc9, _0x59a078) {
      let _0x51f910 = _0x161fc9.exec(_0x59a078);
      if (!_0x51f910) {
        return false;
      }
      currentScript().lAST_MATCHES = _0x51f910;
      return true;
    },
    match_prop: function (_0x3cfe96, _0x4805c9, _0x1d74a9) {
      let _0x54caee = _0x1d74a9[_0x3cfe96];
      if (!_0x54caee || !_0x4805c9) {
        return false;
      }
      return _0x4805c9.test(_0x54caee);
    },
    def: function (_0x25a58b, _0x59aa1d, _0x1dde17) {
      let _0x206fd2 = _0x1dde17[_0x25a58b];
      if (typeof _0x206fd2 === "number") {
        return _0x206fd2 === parseInt(_0x59aa1d);
      }
      return _0x206fd2 && _0x206fd2.indexOf(_0x59aa1d) > -1;
    },
  },
  query: function (_0x39e1e3, _0x56c980) {
    let _0x5335bc = [];
    this.append(_0x5335bc, _0x39e1e3, _0x56c980);
    return _0x5335bc;
  },
  append: function (_0x18e956, _0x4e0089, _0x3d1c49) {
    let _0x39bba3 = this.groups[_0x4e0089];
    if (!_0x39bba3) {
      return;
    }
    for (let _0x213b44 of _0x39bba3) {
      if (this.check_para(_0x213b44, _0x3d1c49)) {
        _0x18e956.push(_0x213b44);
      }
    }
  },
  message_filter: function (_0xeadd4a) {},
  data_filter: function () {},
  trigger: function (_0x4003c1) {
    if (!this.groups) {
      return;
    }
    let _0x3ff8ed = this.groups.message;
    if (!_0x3ff8ed) {
      return;
    }
    for (let _0x310ceb of _0x3ff8ed) {
      if (!_0x310ceb.check) {
        continue;
      }
      if (_0x310ceb.check(_0x4003c1)) {
        currentScript().run(_0x310ceb.cmd);
      }
    }
  },
  process: function (_0x4819d3) {
    if (!this.groups) {
      return;
    }
    let _0x21f7e1 = this.groups.data;
    if (!_0x21f7e1) {
      return;
    }
    for (let _0x108115 of _0x21f7e1) {
      if (this.check_para(_0x108115, _0x4819d3)) {
        currentScript().LAST_DATA = _0x4819d3;
        currentScript().run(_0x108115.cmd);
      }
    }
  },
  check_para: function (_0x56c2b4, _0xf365ab) {
    if (!_0x56c2b4.check) {
      return true;
    }
    for (let _0x18ca27 of _0x56c2b4.check) {
      if (!_0x18ca27(_0xf365ab)) {
        return false;
      }
    }
    return true;
  },
  onButtonClick: function () {
    let _0x1a43e4 = $(this).attr("ecmd").split("_");
    let _0xb85376 = _0x1a43e4[0];
    _0x1a43e4[0] = $(this);
    let _0x1ab048 = currentDialog().extend["cmd_" + _0xb85376];
    if (_0x1ab048) {
      _0x1ab048.apply(currentDialog().extend, _0x1a43e4);
    }
  },
  cmd_add: function () {
    this.edit_elem.removeClass("hide");
    this.list_elem.addClass("hide");
    this.edit_elem.attr("sid", "-1");
    let _0x4213b6 = this.edit_elem.find("input, textarea");
    for (let _0x181543 of _0x4213b6) {
      $(_0x181543).val("");
    }
  },
  cmd_edit: function () {
    let _0x5a815f = this.selected_item;
    if (!_0x5a815f) {
      return;
    }
    this.edit_elem.removeClass("hide");
    this.list_elem.addClass("hide");
    this.edit_elem.attr("sid", this.setting.indexOf(_0x5a815f));
    let _0x7a12d4 = this.edit_elem.find("input, textarea, select");
    for (let _0x1af118 of _0x7a12d4) {
      let _0x553a83 = $(_0x1af118).val();
      let _0x337351 = _0x5a815f[_0x1af118.getAttribute("prop")];
      if (_0x337351 !== _0x553a83) {
        $(_0x1af118).val(_0x337351).change();
      }
    }
  },
  cmd_save: function () {
    let _0x3e8f9c = parseInt(this.edit_elem.attr("sid"));
    let _0x2032cb = this.edit_elem.find("input, textarea, select");
    let _0x3795c7 = {};
    for (let _0x256481 of _0x2032cb) {
      _0x3795c7[_0x256481.getAttribute("prop")] = _0x256481.value;
    }
    if (!_0x3795c7.name) {
      return this.show_error("name");
    }
    if (!_0x3795c7.type) {
      return this.show_error("type");
    }
    if (!_0x3795c7.content) {
      return this.show_error("content");
    }
    if (_0x3795c7.paras) {
      if (currentDialog().extend.regex[_0x3795c7.for]) {
        _0x3795c7.check = this.match(_0x3795c7.paras);
      } else {
        _0x3795c7.check = this.condtion(_0x3795c7.paras);
      }
      if (!_0x3795c7.check) {
        return this.show_error("paras");
      }
    }
    this.hide();
    $(this.create_item(_0x3795c7, this.setting.length)).appendTo(
      this.list_elem,
    );
    if (_0x3e8f9c < 0) {
      this.setting.push(_0x3795c7);
    } else {
      _0x3795c7.on = this.setting[_0x3e8f9c].on;
      this.setting[_0x3e8f9c] = _0x3795c7;
      this.refresh_list();
    }
    this.save_extend(_0x3795c7);
  },
  cmd_remove: function () {
    let _0x1f3fe5 = this.selected_item;
    if (!_0x1f3fe5) {
      return;
    }
    this.setting.Remove(_0x1f3fe5);
    this.refresh_list();
    this.save_extend(_0x1f3fe5);
  },
  show_error: function (_0x54ce20) {
    let _0x19f983 = this.element.find('[prop="' + _0x54ce20 + '"]').parent();
    _0x19f983.addClass("error-shake");
    setTimeoutFn(() => {
      _0x19f983.removeClass("error-shake");
    }, 1500);
  },
  cmd_show: function (_0x1ea8f4, _0x9b801c) {
    let _0x2685d3 = currentScript().helper[_0x9b801c];
    if (!_0x2685d3) {
      return;
    }
    let _0x31bdfd = [];
    for (let _0x497742 = 0; _0x497742 < _0x2685d3.length; _0x497742++) {
      _0x31bdfd.push("<li>", _0x2685d3[_0x497742], "</li>");
    }
    let _0x5a9a4a = _0x1ea8f4.parent();
    _0x5a9a4a.html(_0x31bdfd.join(""));
    _0x5a9a4a.next().html("返回").attr("ecmd", "return");
  },
  cmd_return: function (_0xd2bfdb) {
    _0xd2bfdb.html("保存").attr("ecmd", "save").prev().html(this.helper);
  },
};
      return { extend };
    },
  );
})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
