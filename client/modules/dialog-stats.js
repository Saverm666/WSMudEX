/** Ranking dialog and leaderboard filters. */
(function registerDialogStatsModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-stats",
    function createDialogStats(context) {
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

      if (
        !Dialog ||
        typeof $ !== "function" ||
        typeof SendCommand !== "function"
      ) {
        throw new TypeError(
          "排行榜对话框需要显式 Dialog、jQuery 和 SendCommand 上下文",
        );
      }

      const STATS_SILDER1 = [
        ["总榜", ""],
        ["武当派", "wudang"],
        ["少林派", "shaolin"],
        ["华山派", "huashan"],
        ["峨眉派", "emei"],
        ["逍遥派", "xiaoyao"],
        ["丐帮", "gaibang"],
        ["杀手楼", "shashou"],
        ["无门无派", "none"],
      ];
      const STATS_SILDER2 = [
        ["武器", ""],
        ["衣服", "cloth"],
        ["鞋", "shoes"],
        ["头部", "head"],
        ["披风", "cape"],
        ["戒指", "ring"],
        ["项链", "necklace"],
        ["饰品", "jewels"],
        ["护腕", "wrist"],
        ["腰带", "waist"],
        ["暗器", "throwing"],
      ];
      const stats = {
        footers: [
          {
            cmd: "score",
            name: "综合榜",
            selected_silder: "",
            silder: STATS_SILDER1,
          },
          {
            cmd: "top",
            name: "高手榜",
            selected_silder: "",
            silder: STATS_SILDER1,
          },
          {
            cmd: "weapon",
            name: "兵器谱",
            selected_silder: "",
            silder: STATS_SILDER2,
          },
          {
            cmd: "exp",
            name: "经验榜",
            selected_silder: "",
            silder: STATS_SILDER1,
          },
          {
            cmd: "mp",
            name: "内力榜",
            selected_silder: "",
            silder: STATS_SILDER1,
          },
          {
            cmd: "money",
            name: "富豪榜",
            selected_silder: "",
            silder: STATS_SILDER1,
          },
        ],
        selectedItem: 0,
        close: function () {
          this.element.remove();
          this.isShow = false;
        },
        onData: function (_0x15ee61) {
          if (_0x15ee61.close) {
            return Dialog.hide();
          }
          if (_0x15ee61.tops) {
            if (_0x15ee61.top) {
              this.show_desc(
                "你目前在第" + _0x15ee61.top + "名，积分" + _0x15ee61.sc,
              );
            } else {
              this.show_desc("你目前没有上榜，积分：" + _0x15ee61.sc);
            }
            return this.create_tops(_0x15ee61.tops, _0x15ee61);
          }
          if (_0x15ee61.weapons) {
            this.show_desc("");
            return this.create_weapons(_0x15ee61.weapons);
          }
          if (_0x15ee61.scores) {
            this.show_desc("你目前的评分：" + _0x15ee61.score);
            return this.create_scores(_0x15ee61.scores);
          }
          if (_0x15ee61.items) {
            this.create_other(_0x15ee61.items, _0x15ee61.st);
            let _0x4ab2eb = new Date(_0x15ee61.time);
            _0x15ee61.fam = _0x15ee61.fam ?? "";
            this["last_" + _0x15ee61.st + _0x15ee61.fam] = {
              items: _0x15ee61.items,
              time: _0x15ee61.time + 60000,
              score: _0x15ee61.score,
            };
            if (_0x15ee61.score) {
              this.show_desc("你目前的评分：" + _0x15ee61.score);
            } else {
              this.show_desc(
                "上次更新：" + _0x4ab2eb.getHours() + ":" + _0x4ab2eb.getMinutes(),
              );
            }
          }
        },
        create_other: function (_0x528cff, _0x3e2685) {
          var _0x44aa11 = [];
          for (var _0x401873 = 0; _0x401873 < 20; _0x401873++) {
            _0x44aa11.push("<div class='top-item");
            if (_0x401873 < 3) {
              _0x44aa11.push(" top", _0x401873 + 1);
            }
            _0x44aa11.push("' top='");
            _0x44aa11.push(_0x401873 + 1);
            _0x44aa11.push("'><span class='top-title'>");
            _0x44aa11.push(this.top_names[_0x401873]);
            _0x44aa11.push("、</span>");
            _0x44aa11.push("<span class='top-name'>");
            let _0x38ed6e = _0x528cff[_0x401873] ?? ["无", 0];
            _0x44aa11.push(_0x38ed6e[0]);
            _0x44aa11.push("</span>");
            _0x44aa11.push("<span class='top-sc'>");
            _0x44aa11.push(_0x38ed6e[1]);
            _0x44aa11.push("</span>");
            _0x44aa11.push("</div>");
          }
          this.container.html(_0x44aa11.join(""));
        },
        silderClick: function () {
          let _0x10db68 = $(this);
          let _0x13cf0d = _0x10db68.attr("stype");
          let _0x3aad77 = Dialog.stats.selectedItem;
          if (_0x3aad77.selected_silder === _0x13cf0d) {
            return;
          }
          _0x3aad77.selected_silder = _0x13cf0d;
          _0x10db68.parent().find(".select").removeClass("select");
          _0x10db68.addClass("select");
          Dialog.stats.load_stats();
        },
        create_silder: function (_0x53417e) {
          let _0x12be1f = [];
          _0x53417e = _0x53417e || [];
          let _0x384dbd = this.selectedItem;
          for (let _0x4c506a of _0x53417e) {
            _0x12be1f.push(
              '<div class="stats-silder ',
              _0x384dbd.selected_silder === _0x4c506a[1] ? "select" : "",
              '" stype="',
              _0x4c506a[1],
              '">',
              _0x4c506a[0],
              "</div>",
            );
          }
          this.left_silder.html(_0x12be1f.join(""));
        },
        top_names: [
          "一\u3000",
          "二\u3000",
          "三\u3000",
          "四\u3000",
          "五\u3000",
          "六\u3000",
          "七\u3000",
          "八\u3000",
          "九\u3000",
          "十\u3000",
          "十一",
          "十二",
          "十三",
          "十四",
          "十五",
          "十六",
          "十七",
          "十八",
          "十九",
          "二十",
        ],
        create_scores: function (_0x2a59bd, _0x101eaf) {
          var _0x2535fc = [];
          for (var _0x32dc99 = 0; _0x32dc99 < 20; _0x32dc99++) {
            _0x2535fc.push("<div class='top-item scores");
            if (_0x32dc99 < 3) {
              _0x2535fc.push(" top", _0x32dc99 + 1);
            }
            _0x2535fc.push("' top='");
            _0x2535fc.push(_0x32dc99 + 1);
            _0x2535fc.push("'><span class='top-title'>");
            _0x2535fc.push(this.top_names[_0x32dc99]);
            _0x2535fc.push("、</span>");
            _0x2535fc.push("<span class='top-name'>");
            let _0x21d1cb = _0x2a59bd[_0x32dc99] ?? ["无", ""];
            _0x2535fc.push(_0x21d1cb[0]);
            _0x2535fc.push("</span>");
            _0x2535fc.push("<span class='top-sc'>");
            _0x2535fc.push(_0x21d1cb[1]);
            _0x2535fc.push("</span>");
            _0x2535fc.push("</div>");
          }
          this.container.html(_0x2535fc.join(""));
        },
        fam_names: {
          emei: "峨眉第",
          wudang: "武当第",
          huashan: "华山第",
          xiaoyao: "逍遥第",
          gaibang: "丐帮第",
          shaolin: "少林第",
          shashou: "杀手第",
          none: "散修第",
        },
        create_tops: function (_0x258a09, _0xa82687) {
          var _0x46d2c2 = [];
          for (var _0x12056b = 0; _0x12056b < _0x258a09.length; _0x12056b++) {
            _0x46d2c2.push("<div class='top-item top ");
            if (_0x12056b < 3) {
              _0x46d2c2.push(" top", _0x12056b + 1);
            }
            _0x46d2c2.push("' top='");
            _0x46d2c2.push(_0x12056b + 1);
            _0x46d2c2.push("'><span class='top-title'>");
            _0x46d2c2.push(_0xa82687.fam ? this.fam_names[_0xa82687.fam] : "天下第");
            _0x46d2c2.push(this.top_names[_0x12056b]);
            _0x46d2c2.push("</span>");
            _0x46d2c2.push("<span class='top-name'>");
            _0x46d2c2.push(_0x258a09[_0x12056b][0]);
            _0x46d2c2.push("</span>");
            _0x46d2c2.push("<span class='top-sc'>");
            _0x46d2c2.push(_0x258a09[_0x12056b][1]);
            _0x46d2c2.push("</span>");
            _0x46d2c2.push("</div>");
          }
          this.container.html(_0x46d2c2.join(""));
          this.top = _0xa82687.top;
        },
        create_weapons: function (_0x13c8ef) {
          var _0xc54f02 = [];
          for (var _0x4701b6 = 0; _0x4701b6 < 10; _0x4701b6++) {
            _0xc54f02.push("<div class='top-item weapon top");
            _0xc54f02.push(_0x4701b6 + 1);
            _0xc54f02.push("' top='");
            _0xc54f02.push(_0x4701b6 + 1);
            _0xc54f02.push("'><span class='top-title'>");
            let _0xebc5a8 = _0x13c8ef[_0x4701b6] ?? ["无", ""];
            _0xc54f02.push(this.top_names[_0x4701b6]);
            _0xc54f02.push("、</span>");
            _0xc54f02.push("<span class='top-name'>");
            _0xc54f02.push(_0xebc5a8[0]);
            _0xc54f02.push("</span>");
            _0xc54f02.push("<span class='top-sc'>");
            _0xc54f02.push(_0xebc5a8[1]);
            _0xc54f02.push("</span>");
            _0xc54f02.push("</div>");
          }
          this.container.html(_0xc54f02.join(""));
        },
        show: function () {
          if (!this.selectedItem) {
            this.selectedItem = this.footers[0];
          }
          this.load_stats();
          if (!this.element) {
            this.element = $(
              "<div class='stats-container'><div class='stats-container-left'></div></div>",
            );
            this.container = $("<div class='dialog-stats'></div>").appendTo(
              this.element,
            );
            this.left_silder = this.element.find(".stats-container-left");
            this.create_silder(this.selectedItem.silder);
          }
          if (this.isShow) {
            return;
          }
          this.create_footer();
          Dialog.icon("stats");
          Dialog.title(this.selectedItem.name);
          Dialog.contentElement.html(this.element);
          this.element.on("click", ".top-item", this.itemClick);
          this.left_silder.on("click", ".stats-silder ", this.silderClick);
          this.isShow = true;
        },
        load_stats: function () {
          let _0x2eafaf = this.selectedItem.cmd;
          let _0x102db9 = this.selectedItem.selected_silder;
          let _0xde8a9 = this["last_" + _0x2eafaf + _0x102db9];
          if (_0xde8a9 && _0xde8a9.time > Date.now()) {
            let _0x2a5655 = new Date(_0xde8a9.time);
            let _0x596964 = "";
            if (_0xde8a9.score) {
              _0x596964 = "你目前的评分：" + _0xde8a9.score;
            } else {
              _0x596964 =
                "上次更新：" + _0x2a5655.getHours() + ":" + _0x2a5655.getMinutes();
            }
            this.show_desc(_0x596964);
            return this.create_other(_0xde8a9.items, _0x2eafaf);
          }
          let _0x125f4 = "stats " + _0x2eafaf;
          if (_0x102db9) {
            _0x125f4 = _0x125f4 + " " + _0x102db9;
          }
          SendCommand(_0x125f4);
        },
        create_footer: function () {
          var _0x36e185 = [];
          for (var _0x59abaa = 0; _0x59abaa < this.footers.length; _0x59abaa++) {
            var _0x864ed3 = this.footers[_0x59abaa];
            _0x36e185.push(
              "<span class='footer-item" +
                (_0x864ed3 == this.selectedItem ? " select" : "") +
                "' for='" +
                _0x59abaa +
                "''>" +
                _0x864ed3.name +
                "</span>",
            );
          }
          _0x36e185.push("<span class='stats-span'></span>");
          Dialog.footer(_0x36e185.join(""));
        },
        show_desc: function (_0x54fcae) {
          Dialog.footerElement.find(".stats-span").html(_0x54fcae);
        },
        footerChanged: function (_0x2c95f0) {
          var _0x2ba54f = this.footers[_0x2c95f0];
          if (_0x2ba54f == this.selectedItem) {
            return;
          }
          this.selectedItem = _0x2ba54f;
          Dialog.title(this.selectedItem.name);
          this.create_silder(this.selectedItem.silder);
          this.load_stats();
        },
        itemClick: function () {
          var _0x40e4f7 = $(this);
          var _0x3a6477 = parseInt(_0x40e4f7.attr("top"));
          var _0x569c06 = Dialog.stats.selectedItem.cmd;
          var _0x10a049 = ["<div class='item-commands'>"];
          var _0x121765 = Dialog.stats.selectedItem.selected_silder;
          if (_0x569c06 === "top") {
            _0x10a049.push(
              '<span cmd="stats ' +
                _0x569c06 +
                " " +
                _0x121765 +
                " " +
                _0x3a6477 +
                '">查看</span>',
            );
            if (!Dialog.stats.top || _0x3a6477 < Dialog.stats.top) {
              _0x10a049.push(
                '<span cmd="biwu ' + _0x121765 + " " + _0x3a6477 + '">挑战</span>',
              );
            }
            _0x10a049.push(
              '<span cmd="reward top ' + _0x3a6477 + '">查看规则和奖励</span>',
            );
          } else {
            _0x10a049.push(
              '<span cmd="stats ' +
                _0x569c06 +
                " " +
                _0x121765 +
                " " +
                _0x3a6477 +
                '">查看</span>',
            );
            _0x10a049.push(
              '<span cmd="reward ' +
                _0x569c06 +
                " " +
                _0x3a6477 +
                '">查看奖励</span>',
            );
          }
          _0x10a049.push("</div>");
          Dialog.stats.element.find(".item-commands").remove();
          $(_0x10a049.join("")).insertAfter(_0x40e4f7);
        },
      };

      return { stats, STATS_SILDER1, STATS_SILDER2 };
    },
  );
})(window);
