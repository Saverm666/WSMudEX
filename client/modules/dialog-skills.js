/** Dialog.skills and Dialog.master client models. */
(function registerDialogSkillsModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-skills",
    function createDialogSkills(context) {
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
      const getSendCommand =
        typeof context.getSendCommand === "function"
          ? context.getSendCommand
          : () => context.SendCommand || global.SendCommand;
      const getCheckScroll =
        typeof context.getCheckScroll === "function"
          ? context.getCheckScroll
          : () => context.checkScroll || global.checkScroll;
      const getWrapName =
        typeof context.getWrapName === "function"
          ? context.getWrapName
          : () => context.wrap_name || global.wrap_name;
      const getExtend =
        typeof context.getExtend === "function"
          ? context.getExtend
          : () => {
              const dialog = getDialog();
              return dialog && dialog.extend;
            };
      const getScript =
        typeof context.getScript === "function"
          ? context.getScript
          : () => context.SCRIPT || global.SCRIPT;
      const getSetting =
        typeof context.getSetting === "function"
          ? context.getSetting
          : () => context.Setting || global.Setting;

      const currentDialog = () => getDialog();
      const currentJQuery = () => getJQuery();
      const currentProcess = () => getProcess();
      const currentSendCommand = () => getSendCommand();
      const currentCheckScroll = () => getCheckScroll();
      const currentWrapName = () => getWrapName();
      const currentExtend = () => getExtend();
      const currentScript = () => getScript();
      const currentSetting = () => getSetting();
      const $ = (...args) => currentJQuery()(...args);
      const SendCommand = (...args) => currentSendCommand()(...args);
      const checkScroll = (...args) => currentCheckScroll()(...args);
      const wrap_name = (...args) => currentWrapName()(...args);
const skills = {
  isShow: false,
  selectItem: ".dialog-skills",
  hide: function () {
    if (this.skill_element) {
      this.skill_element.remove();
      this.skill_element = null;
      this.element.removeClass("hide-item");
      this.create_footer();
      this.skill_element_id = null;
      return false;
    }
    this.isShow = false;
  },
  close: function () {
    this.hide();
    this.element.remove();
    this.isShow = false;
    this.skill_element_id = null;
    this.element.removeClass("hide-item");
  },
  limit: 0,
  selected_item: -1,
  createDescriptionCommands: function (_0x4c05f8) {
    let _0xc3d72d = ['<div class="item-commands">'];
    if (this.master) {
      _0xc3d72d.push(
        '<span cmd="xue ',
        _0x4c05f8.id,
        " from ",
        this.master,
        '">学习</span>',
      );
      if (this.is_follower) {
        _0xc3d72d.push(
          '<span cmd="dc ',
          this.master,
          " lingwu ",
          _0x4c05f8.id,
          '">进阶</span>',
        );
        _0xc3d72d.push(
          '<span cmd="dc ',
          this.master,
          " fangqi ",
          _0x4c05f8.id,
          '">遗忘</span>',
        );
      }
    } else {
      if (_0x4c05f8.is_custom) {
        _0xc3d72d.push('<span cmd="zc ', _0x4c05f8.id, '">推演</span>');
      }
      _0xc3d72d.push('<span cmd="lingwu ', _0x4c05f8.id, '">进阶</span>');
      _0xc3d72d.push('<span cmd="lingwu2 ', _0x4c05f8.id, '">融合</span>');
      _0xc3d72d.push('<span cmd="fangqi ', _0x4c05f8.id, '">遗忘</span>');
    }
    _0xc3d72d.push("</div>");
    return _0xc3d72d.join("");
  },
  showdesc: function (_0x4c05f8) {
    if (!this.isShow) {
      return;
    }
    this.element.find(".item-commands").remove();
    if (this.skill_element) {
      this.skill_element.remove();
    }
    this.skill_element = $("<pre></pre>")
      .html(_0x4c05f8.desc)
      .appendTo(this.element);
    this.skill_element_id = _0x4c05f8.id;
    this.element.addClass("hide-item");
    currentDialog().footer(this.createDescriptionCommands(_0x4c05f8));
  },
  footerChanged: function (_0x41ee45, _0x53ffe1) {
    if (_0x41ee45 == this.selected_item && !_0x53ffe1) {
      return;
    }
    this.selected_item = _0x41ee45;
    currentDialog().skills.element.find(".item-commands").remove();
    if (_0x41ee45 == 2) {
      if (!this.books) {
        SendCommand("sbook");
      } else {
        this.showBooks();
      }
      return this.element.addClass("dialog-books");
    }
    if (this.element.is(".dialog-books")) {
      this.element.removeClass("dialog-books");
      this.create_footer();
      return this.createSkillItems(this.items);
    }
    if (_0x41ee45 == 0) {
      this.element.find(".base").removeClass("hide");
      this.element.find(".skill").addClass("hide");
    } else if (_0x41ee45 == 1) {
      this.element.find(".base").addClass("hide");
      this.element.find(".skill").removeClass("hide");
    }
  },
  footers: ["基础", "特殊", "书架"],
  create_footer: function (_0x4aede7) {
    var _0x267c5 = this.footers;
    var _0x2df83e = [];
    for (var _0x286277 = 0; _0x286277 < _0x267c5.length; _0x286277++) {
      _0x2df83e.push(
        "<span class='footer-item" +
          (_0x286277 == this.selected_item ? " select" : "") +
          "' for='" +
          _0x286277 +
          "''>" +
          _0x267c5[_0x286277] +
          "</span>",
      );
    }
    if (_0x4aede7) {
      _0x2df83e.push(
        "<span class='obj-money'>你的书架目前有<HIC>" +
          this.books.length +
          "</HIC>本秘籍</span>",
      );
    } else {
      _0x2df83e.push(
        "<span class='obj-money'>你目前的技能上限为<HIC>" +
          this.limit +
          "</HIC>级</span>",
      );
    }
    currentDialog().footer(_0x2df83e.join(""));
  },
  updateSkill: function (_0x44e1de) {
    if (!this.skills) {
      return;
    }
    var _0x5961b2 = this.skills[_0x44e1de.id];
    if (!_0x5961b2) {
      return this.addSkill(_0x5961b2);
    }
    if (_0x44e1de.name) {
      _0x5961b2.name = _0x44e1de.name;
    }
    if (_0x44e1de.grade >= 0 && _0x44e1de.grade !== _0x5961b2.grade) {
      _0x5961b2.grade = _0x44e1de.grade;
      if (_0x5961b2.can_enables) {
        for (let _0x43c80d of _0x5961b2.can_enables) {
          let _0x4a8d0a = this.skills[_0x43c80d];
          if (_0x4a8d0a && _0x4a8d0a.enable_skill === _0x44e1de.id) {
            this.updateSkillItem(_0x4a8d0a);
          }
        }
      }
    }
    if (_0x44e1de.enable) {
      if (_0x5961b2.enable_skill) {
        var _0x9606d = _0x5961b2.enable_skill;
        _0x5961b2.enable_skill = null;
        this.skills[_0x9606d][_0x44e1de.id] = false;
        this.updateSkillItem(this.skills[_0x9606d]);
      }
      this.skills[_0x44e1de.enable][_0x44e1de.id] = true;
      _0x5961b2.enable_skill = _0x44e1de.enable;
      this.updateSkillItem(this.skills[_0x44e1de.enable]);
      this.updateSkillItem(this.skills[_0x44e1de.id]);
    } else if (_0x44e1de.exp != undefined || _0x44e1de.level != undefined) {
      if (_0x44e1de.level >= 0) {
        _0x5961b2.level = _0x44e1de.level;
      }
      if (_0x44e1de.exp >= 0) {
        _0x5961b2.exp = _0x44e1de.exp;
      }
      if (_0x44e1de.can_enables) {
        _0x5961b2.can_enables = _0x44e1de.can_enables;
      }
      this.updateSkillItem(_0x5961b2);
    } else if (_0x44e1de.enable == false) {
      if (_0x5961b2.enable_skill) {
        var _0x9606d = _0x5961b2.enable_skill;
        this.skills[_0x9606d][_0x44e1de.id] = false;
        _0x5961b2.enable_skill = null;
        this.updateSkillItem(this.skills[_0x9606d]);
        this.updateSkillItem(this.skills[_0x44e1de.id]);
      }
    }
  },
  updateSkillItem: function (_0x2ec44a) {
    var _0x1eee6f = this.element.find(
      ".skill-item[skid='" + _0x2ec44a.id + "']",
    );
    if (_0x1eee6f) {
      let _0x5a7697 = _0x1eee6f.css("display") === "none";
      _0x1eee6f.replaceWith(this.createSkillItem(_0x2ec44a));
      if (_0x5a7697) {
        _0x1eee6f.hide();
      }
    }
  },
  addSkill: function (_0x543fec) {
    if (!this.items || !_0x543fec) {
      return;
    }
    if (this.skills[_0x543fec.id]) {
      return this.updateSkill(_0x543fec);
    }
    this.items.push(_0x543fec);
    this.skills[_0x543fec.id] = _0x543fec;
    this.items = this.sort_items(this.items);
    this.createSkillItems(this.items);
  },
  format_books: function (_0xd3c030) {
    let _0x157393 = [];
    for (let _0x6e6a62 = 0; _0x6e6a62 < _0xd3c030.length; _0x6e6a62++) {
      _0x157393.push({
        name: _0xd3c030[_0x6e6a62][0],
        grade: _0xd3c030[_0x6e6a62][1],
        id: _0x6e6a62,
      });
    }
    return _0x157393;
  },
  onData: function (_0x55f754) {
    if (_0x55f754.book) {
      if (!this.books) {
        return;
      }
      this.books.push({
        name: _0x55f754.book[0],
        grade: _0x55f754.book[1],
        id: _0x55f754.book[2],
      });
      if (this.isShow && this.selected_item == 2) {
        return this.showBooks();
      }
      return;
    }
    if (_0x55f754.books) {
      this.books = this.format_books(_0x55f754.books);
      if (this.isShow) {
        return this.showBooks();
      } else {
        return currentDialog().master.showBooks();
      }
    }
    if (_0x55f754.id && !_0x55f754.desc) {
      return this.updateSkill(_0x55f754);
    }
    if (_0x55f754.item) {
      return this.addSkill(_0x55f754.item);
    }
    if (!this.isShow) {
      if (currentDialog().master.isShow) {
        return currentDialog().master.onData(_0x55f754);
      }
    }
    if (_0x55f754.desc) {
      if (_0x55f754.id) {
        this.updateSkill(_0x55f754);
      }
      return this.showdesc(_0x55f754);
    }
    if (_0x55f754.remove && this.items) {
      this.items.Remove(this.skills[_0x55f754.remove]);
      for (var _0x4f0a = 0; _0x4f0a < this.items.length; _0x4f0a++) {
        if (this.items[_0x4f0a].enable_skill == _0x55f754.remove) {
          this.items[_0x4f0a].enable_skill = null;
        }
      }
      delete this.skills[_0x55f754.remove];
      if (this.skill_element && this.skill_element_id === _0x55f754.remove) {
        this.hide();
      }
      return this.createSkillItems(this.items);
    }
    if (_0x55f754.items) {
      this.title = _0x55f754.title;
      currentDialog().title(this.title);
      currentDialog().icon("book");
      this.items = this.sort_items(_0x55f754.items);
      this.skills = {};
      for (var _0x4f0a = 0; _0x4f0a < this.items.length; _0x4f0a++) {
        var _0x55cb1c = this.items[_0x4f0a];
        this.skills[_0x55cb1c.id] = _0x55cb1c;
      }
      if (this.items.length > 10 && this.selected_item < 0) {
        this.footerChanged(0);
      }
      this.createSkillItems(this.items);
    }
    if (_0x55f754.limit) {
      this.limit = _0x55f754.limit;
      this.create_footer();
    }
  },
  show: function () {
    if (this.isShow) {
      if (this.element) {
        this.element.appendTo(currentDialog().contentElement).removeClass("hide-item");
        currentDialog().activateSkillsWindow();
        currentDialog().title(this.title);
        currentDialog().icon("book");
        this.create_footer();
      }
      return;
    }
    this.isShow = true;
    if (!this.element) {
      this.element = $('<div class="dialog-skills"></div >');
    }
    this.element.on("click", ".skill-item", currentDialog().skills.item_click);
    this.element.appendTo(currentDialog().contentElement);
    this.element.removeClass("hide-item");
    currentDialog().activateSkillsWindow();
    if (!this.items) {
      SendCommand("cha");
    } else {
      SendCommand("cha none");
      currentDialog().title(this.title);
      currentDialog().icon("book");
      this.create_footer();
    }
  },
  isEnable: function (_0x50e43e, _0x5c36e9) {
    if (!_0x50e43e.can_enables) {
      return false;
    }
    for (
      var _0x242495 = 0;
      _0x242495 < _0x50e43e.can_enables.length;
      _0x242495++
    ) {
      var _0x5ed9cc = _0x5c36e9[_0x50e43e.can_enables[_0x242495]];
      if (_0x5ed9cc && _0x5ed9cc.enable_skill == _0x50e43e.id) {
        return true;
      }
    }
    return false;
  },
  showBooks: function () {
    var _0x4e379e = [];
    var _0x406248 = this.sort_items(this.books);
    for (let _0x255fc5 of _0x406248) {
      _0x4e379e.push('<div class="book-item ');
      _0x4e379e.push("grade", _0x255fc5.grade, '" >');
      _0x4e379e.push('<div class="book-name">', _0x255fc5.name, "</div>");
      _0x4e379e.push(
        '<div class="book-action border-right" cmd="sbook ',
        _0x255fc5.id,
        '">查看</div>',
      );
      _0x4e379e.push(
        '<div class="book-action" cmd="study ',
        _0x255fc5.id,
        '">学习</div>',
      );
      _0x4e379e.push("</div>");
    }
    this.element.html(_0x4e379e.join(""));
    this.create_footer(true);
  },
  createSkillItem: function (_0x1e05c4, _0x2cea6e) {
    _0x2cea6e = _0x2cea6e || this.skills;
    var _0x22adf2 = [];
    _0x22adf2.push('<div class="skill-item ');
    _0x22adf2.push("grade" + _0x1e05c4.grade);
    if (!this.master) {
      if (_0x1e05c4.can_enables) {
        _0x22adf2.push(" skill");
        if (this.selected_item == 0) {
          _0x22adf2.push(" hide");
        }
      } else {
        _0x22adf2.push(" base");
        if (this.selected_item == 1) {
          _0x22adf2.push(" hide");
        }
      }
    }
    var _0xf746ec = this.isEnable(_0x1e05c4, _0x2cea6e);
    if (_0xf746ec) {
      _0x22adf2.push(" enable");
    }
    _0x22adf2.push('" skid="' + _0x1e05c4.id + '">');
    _0x22adf2.push('<span class="glyphicon glyphicon-ok enable-flag"></span>');
    _0x22adf2.push(_0x1e05c4.name);
    if (_0x1e05c4.enable_skill && _0x2cea6e) {
      var _0x614146 = _0x2cea6e[_0x1e05c4.enable_skill];
      if (_0x614146) {
        _0x22adf2.push('<span class="enable_skill">已装备：');
        _0x22adf2.push(wrap_name(_0x614146));
        _0x22adf2.push("</span>");
      }
    }
    _0x22adf2.push('<span class="skill-level">');
    _0x22adf2.push(_0x1e05c4.level);
    _0x22adf2.push("级 / ");
    _0x22adf2.push(_0x1e05c4.exp);
    _0x22adf2.push("%");
    _0x22adf2.push("&nbsp;");
    _0x22adf2.push(currentDialog().skills.get_lvdesc(_0x1e05c4.level));
    _0x22adf2.push("</span></div>");
    return _0x22adf2.join("");
  },
  sort_items: function (_0xee815e) {
    if (!_0xee815e || !currentSetting().auto_sortitem) {
      return _0xee815e;
    }
    var _0x4eb7d8 = [];
    for (var _0x4ce678 = 0; _0x4ce678 < _0xee815e.length; _0x4ce678++) {
      var _0x27123c = _0xee815e[_0x4ce678];
      var _0x308ace = false;
      for (var _0x5710a0 = 0; _0x5710a0 < _0x4eb7d8.length; _0x5710a0++) {
        if (_0x27123c.grade > _0x4eb7d8[_0x5710a0].grade) {
          _0x4eb7d8.splice(_0x5710a0, 0, _0x27123c);
          _0x308ace = true;
          break;
        }
      }
      if (!_0x308ace) {
        _0x4eb7d8.push(_0x27123c);
      }
    }
    return _0x4eb7d8;
  },
  createSkillItems: function (_0x1ba970, _0x464422) {
    let _0x10fab4 = [];
    for (var _0x35b369 = 0; _0x35b369 < _0x1ba970.length; _0x35b369++) {
      _0x10fab4.push(this.createSkillItem(_0x1ba970[_0x35b369], _0x464422));
    }
    this.element.html(_0x10fab4.join(""));
  },
  level_color: ["wht", "hig", "hic", "hij", "hiz", "hio", "ord"],
  get_lvdesc: function (_0x12a1f1) {
    if (_0x12a1f1 < 1000) {
      return currentDialog().skills.skill_levels[parseInt(_0x12a1f1 / 50)];
    }
    var _0x39ad74 = parseInt((_0x12a1f1 - 1000) / 500);
    if (_0x39ad74 > 6) {
      _0x39ad74 = 6;
    }
    return currentDialog().skills.skill_levels[_0x39ad74 + 20];
  },
  skill_levels: [
    "<BLU>初学乍练</BLU>",
    "<BLU>不知所以</BLU>",
    "<HIB>粗通皮毛</HIB>",
    "<HIB>渐有所悟</HIB>",
    "<YEL>半生不熟</YEL>",
    "<YEL>马马虎虎</YEL>",
    "<HIY>平淡无奇</HIY>",
    "<HIY>触类旁通</HIY>",
    "<HIG>心领神会</HIG>",
    "<HIG>挥洒自如</HIG>",
    "<HIC>驾轻就熟</HIC>",
    "<HIC>出类拔萃</HIC>",
    "<CYN>初入佳境</CYN>",
    "<CYN>神乎其技</CYN>",
    "<MAG>威不可当</MAG>",
    "<HIW>豁然贯通</HIW>",
    "<HIW>超群绝伦</HIW>",
    "<RED>登峰造极</RED>",
    "<WHT>登堂入室</WHT>",
    "<HIM>一代宗师</HIM>",
    "<WHT>超凡入圣</WHT>",
    "<HIO>出神入化</HIO>",
    "<HIO>独步天下</HIO>",
    "<HIR>空前绝后</HIR>",
    "<HIR>旷古绝伦</HIR>",
    "<HIW>深不可测</HIW>",
    "<HIW>返璞归真</HIW>",
  ],
  item_click: function () {
    var _0x1471d5 = $(this);
    var _0xec703d = ["<div class='item-commands'>"];
    var _0x7322b7 = currentDialog().skills.skills[_0x1471d5.attr("skid")];
    if (!_0x7322b7) {
      return;
    }
    _0xec703d.push(
      '<span cmd="checkskill ' + _0x7322b7.id + '">查看详细</span>',
    );
    if (_0x7322b7.can_enables) {
      for (
        var _0x45f6b1 = 0;
        _0x45f6b1 < _0x7322b7.can_enables.length;
        _0x45f6b1++
      ) {
        var _0x34e619 = currentDialog().skills.skills[_0x7322b7.can_enables[_0x45f6b1]];
        if (!_0x34e619) {
          continue;
        }
        if (_0x34e619.enable_skill != _0x7322b7.id) {
          _0xec703d.push(
            '<span cmd="enable ' +
              _0x34e619.id +
              " " +
              _0x7322b7.id +
              '">装备' +
              _0x34e619.name +
              "</span>",
          );
        } else {
          _0xec703d.push(
            '<span cmd="enable ' +
              _0x34e619.id +
              ' none">取消装备' +
              _0x34e619.name +
              "</span>",
          );
        }
      }
    }
    if (_0x7322b7.enable_skill) {
      var _0xd7407e = currentDialog().skills.skills[_0x7322b7.enable_skill];
      if (_0xd7407e) {
        _0xec703d.push(
          '<span cmd="enable ' +
            _0x7322b7.id +
            ' none">取消装备' +
            _0xd7407e.name +
            "</span>",
        );
      } else {
        _0x7322b7.enable_skill = null;
      }
    }
    _0xec703d.push(
      '<span cmd="_confirm fangqi ' + _0x7322b7.id + '">遗忘</span>',
    );
    _0xec703d.push('<span cmd="lianxi ' + _0x7322b7.id + '">练习</span>');
    _0xec703d.push(
      '<span cmd="_skillcalc ' + _0x7322b7.id + ' practice">计算</span>',
    );
    currentScript().LAST_OBJ = _0x7322b7;
    let _0xd8e5e1 = currentExtend().query("skill", _0x7322b7);
    for (let _0x6cbce4 of _0xd8e5e1) {
      _0xec703d.push(
        '<span cmd="',
        _0x6cbce4.cmd,
        '">',
        _0x6cbce4.name,
        "</span>",
      );
    }
    _0xec703d.push("</div>");
    currentDialog().skills.element.find(".item-commands").remove();
    $(_0xec703d.join("")).insertAfter(_0x1471d5);
    checkScroll(_0x1471d5.next());
  },
};
const master = {
  isShow: false,
  hide: function () {
    if (this.skill_element) {
      this.skill_element.remove();
      this.skill_element = null;
      this.element.removeClass("hide-item");
      currentDialog().footer("");
      return false;
    }
    this.isShow = false;
  },
  close: skills.close,
  createSkillItems: skills.createSkillItems,
  createSkillItem: skills.createSkillItem,
  updateSkill: skills.updateSkill,
  updateSkillItem: skills.updateSkillItem,
  showdesc: skills.showdesc,
  createDescriptionCommands: skills.createDescriptionCommands,
  isEnable: skills.isEnable,
  onData: function (_0x174508) {
    if (_0x174508.desc) {
      return this.showdesc(_0x174508);
    }
    if (_0x174508.id) {
      return this.updateSkill(_0x174508);
    }
    if (_0x174508.books) {
      return this.showBooks();
    }
    if (_0x174508.remove) {
      this.items.Remove(this.skills[_0x174508.remove]);
      var _0x33d21f = this.skills[_0x174508.remove];
      for (var _0x5e02b4 = 0; _0x5e02b4 < this.items.length; _0x5e02b4++) {
        if (this.items[_0x5e02b4].enable_skill == _0x174508.remove) {
          this.items[_0x5e02b4].enable_skill = null;
        }
      }
      delete this.skills[_0x174508.remove];
      return this.createSkillItems(this.items);
    }
    if (!_0x174508.master && !_0x174508.follower) {
      return;
    }
    currentDialog().show("master");
    this.master = _0x174508.master || _0x174508.follower;
    this.is_follower = !!_0x174508.follower;
    var _0x5e5afa = {};
    for (var _0x5e02b4 = 0; _0x5e02b4 < _0x174508.items.length; _0x5e02b4++) {
      var _0x527e45 = _0x174508.items[_0x5e02b4];
      _0x5e5afa[_0x527e45.id] = _0x527e45;
    }
    this.skills = _0x5e5afa;
    this.items = _0x174508.items;
    currentDialog().title(_0x174508.title);
    currentDialog().icon("book");
    this.createSkillItems(_0x174508.items, _0x5e5afa);
    if (_0x174508.limit) {
      if (this.is_follower) {
        let _0xc214d = [
          '<div class="footer-item select" for="0">',
          "技能</div>",
        ];
        _0xc214d.push('<div class="footer-item" for="1">书架</div>');
        _0xc214d.push(
          "<span class='obj-money'>",
          _0x174508.target,
          "目前的技能上限为<HIC>",
          _0x174508.limit,
          "</HIC>级</span>",
        );
        currentDialog().footer(_0xc214d.join(""));
      } else {
        currentDialog().footer(
          "<span class='obj-money'>你目前的技能上限为<HIC>" +
            _0x174508.limit +
            "</HIC>级</span>",
        );
      }
    }
  },
  create_footer: function () {},
  selectedItem: 0,
  footerChanged: function (_0x51f579) {
    _0x51f579 = parseInt(_0x51f579);
    if (_0x51f579 === this.selectedItem) {
      return;
    }
    this.selectedItem = _0x51f579;
    if (_0x51f579 === 0) {
      this.element.removeClass("dialog-books");
      this.createSkillItems(this.items, this.skills);
    } else {
      if (!currentDialog().skills.books) {
        SendCommand("sbook");
      } else {
        this.showBooks();
      }
      return this.element.addClass("dialog-books");
    }
  },
  showBooks: function () {
    if (!this.isShow || !this.is_follower) {
      return;
    }
    var _0x1931ea = [];
    var _0x483d36 = currentDialog().skills.sort_items(currentDialog().skills.books);
    for (let _0x1eb244 of _0x483d36) {
      _0x1931ea.push('<div class="book-item ');
      _0x1931ea.push("grade", _0x1eb244.grade, '" >');
      _0x1931ea.push('<div class="book-name">', _0x1eb244.name, "</div>");
      _0x1931ea.push(
        '<div class="book-action border-right" cmd="sbook ',
        _0x1eb244.id,
        '">查看</div>',
      );
      _0x1931ea.push(
        '<div class="book-action" cmd="dc ',
        currentDialog().master.master,
        " study ",
        _0x1eb244.id,
        '">学习</div>',
      );
      _0x1931ea.push("</div>");
    }
    this.element.html(_0x1931ea.join(""));
  },
  show: function () {
    if (this.isShow) {
      return;
    }
    if (!this.element) {
      this.element = $('<div class="dialog-skills"></div >');
    }
    this.element.on("click", ".skill-item", this.item_click);
    this.element.appendTo(currentDialog().contentElement);
    this.element.removeClass("hide-item");
    currentDialog().activateSkillsWindow();
    this.isShow = true;
  },
  item_click: function () {
    var _0x2c2de8 = $(this);
    var _0x3c8cdb = currentDialog().master.skills[_0x2c2de8.attr("skid")];
    if (!_0x3c8cdb) {
      return;
    }
    var _0x1c68f1 = ["<div class='item-commands'>"];
    _0x1c68f1.push(
      '<span cmd="checkskill ' +
        _0x3c8cdb.id +
        " " +
        currentDialog().master.master +
        '">查看详细</span>',
    );
    _0x1c68f1.push(
      '<span cmd="xue ' +
        _0x2c2de8.attr("skid") +
        " from " +
        currentDialog().master.master +
        '">学习</span>',
    );
    _0x1c68f1.push(
      '<span cmd="_skillcalc ' + _0x3c8cdb.id + ' study">计算</span>',
    );
    _0x3c8cdb.master = 1;
    if (currentDialog().master.is_follower) {
      var _0x303759 = "dc " + currentDialog().master.master;
      _0x1c68f1.push(
        '<span cmd="_confirm ' +
          _0x303759 +
          " fangqi " +
          _0x2c2de8.attr("skid") +
          '">遗忘</span>',
      );
      _0x1c68f1.push(
        '<span cmd="' +
          _0x303759 +
          " lianxi " +
          _0x2c2de8.attr("skid") +
          '">练习</span>',
      );
      if (_0x3c8cdb.can_enables) {
        for (
          var _0x341e14 = 0;
          _0x341e14 < _0x3c8cdb.can_enables.length;
          _0x341e14++
        ) {
          var _0x18c0b1 =
            currentDialog().master.skills[_0x3c8cdb.can_enables[_0x341e14]];
          if (!_0x18c0b1) {
            continue;
          }
          if (_0x18c0b1.enable_skill != _0x3c8cdb.id) {
            _0x1c68f1.push(
              '<span cmd="' +
                _0x303759 +
                " enable " +
                _0x18c0b1.id +
                " " +
                _0x3c8cdb.id +
                '">装备' +
                _0x18c0b1.name +
                "</span>",
            );
          } else {
            _0x1c68f1.push(
              '<span cmd="' +
                _0x303759 +
                " enable " +
                _0x18c0b1.id +
                ' none">取消装备' +
                _0x18c0b1.name +
                "</span>",
            );
          }
        }
      }
      if (_0x3c8cdb.enable_skill) {
        var _0x59acb7 = currentDialog().master.skills[_0x3c8cdb.enable_skill];
        if (_0x59acb7) {
          _0x1c68f1.push(
            '<span cmd="' +
              _0x303759 +
              " enable " +
              _0x3c8cdb.id +
              ' none">取消装备' +
              _0x59acb7.name +
              "</span>",
          );
        } else {
          _0x3c8cdb.enable_skill = null;
        }
      }
      _0x3c8cdb.master = 0;
    }
    currentScript().LAST_OBJ = _0x3c8cdb;
    let _0x1ea307 = currentExtend().query("mskill", _0x3c8cdb);
    for (let _0x4b5fbe of _0x1ea307) {
      _0x1c68f1.push(
        '<span cmd="',
        _0x4b5fbe.cmd,
        '">',
        _0x4b5fbe.name,
        "</span>",
      );
    }
    _0x1c68f1.push("</div>");
    currentDialog().master.element.find(".item-commands").remove();
    $(_0x1c68f1.join("")).insertAfter(_0x2c2de8);
    checkScroll(_0x2c2de8);
  },
};
return { skills, master };
    },
  );
})(window);
