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
      const getAutomation = context.getAutomation || (() => null);
      const getRoleId = context.getRoleId || (() => null);

      if (!Dialog || typeof $ !== "function" || typeof SendCommand !== "function") {
        throw new TypeError(
          "任务对话框需要显式 Dialog、jQuery 和 SendCommand 上下文",
        );
      }

      const tasks = {
        dailyStatus: null,
        dailyStatusDay: function () {
          // 游戏日从北京时间 05:00 起算。
          return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
        },
        getDailyStatus: function () {
          const status = this.dailyStatus;
          return status && status.roleId === getRoleId() && status.day === this.dailyStatusDay()
            ? Object.assign({}, status) : null;
        },
        parseDailyStatus: function (source) {
          const text = $("<div>").html(String(source || "").replace(/<br\s*\/?\s*>/gi, "\n")).text();
          const fragment = text.match(/(?:获取|获得|领取)帝魄(?:碎片)?\s*[：:]?\s*(\d+)\s*\/\s*(\d+)/);
          const contribution = text.match(/获取额外\s*([\d,]+)\s*\/\s*([\d,]+)\s*师门功绩/) ||
            text.match(/门派战(?:争)?(?:贡献|功绩)(?:进度)?\s*[：:]?\s*([\d,]+)\s*\/\s*([\d,]+)/);
          const merit = text.match(/襄阳军功(?:进度)?\s*[：:]?\s*([\d,]+)\s*\/\s*([\d,]+)/);
          const number = value => Number(value.replace(/,/g, ""));
          let greeted = null;
          if (/(?:尚未|还未|未曾|未)\s*(?:向\s*)?(?:门派\s*)?(?:首席\s*)?请安/.test(text)) greeted = false;
          else if (/(?:已经|已)\s*(?:向\s*)?(?:门派\s*)?(?:首席\s*)?请安/.test(text)) greeted = true;
          return {
            imperialSoulObtained: fragment ? Number(fragment[1]) > 0 : null,
            imperialSoulCount: fragment ? Number(fragment[1]) : null,
            imperialSoulLimit: fragment ? Number(fragment[2]) : null,
            sectWarContribution: contribution ? number(contribution[1]) : null,
            sectWarContributionLimit: contribution ? number(contribution[2]) : null,
            xiangyangMerit: merit ? number(merit[1]) : null,
            xiangyangMeritLimit: merit ? number(merit[2]) : null,
            greeted,
          };
        },
        renderDailyStatus: function () {
          if (!this.element || typeof this.element.find !== "function") return;
          const status = this.getDailyStatus() || {};
          const unavailable = (status.day && this.dailyStatusFailed) || status.updatedAt != null ? "未知" : "获取中";
          const label = (value, done, pending) => value == null ? unavailable : value ? done : pending;
          const progress = (count, limit) => count == null || limit == null ? unavailable : count + "/" + limit;
          const soulProgress = label(status.imperialSoulObtained, "已获得", "未获得");
          const greetProgress = label(status.greeted, "已请安", "未请安");
          let panel = this.element.find(".task-daily-status");
          if (!panel.length) {
            panel = $("<div class='task-item flex-row task-daily-status'><div class='flex-1'><h3>日常进度</h3><pre class='task-desc task-daily-grid'><span></span><span></span><span></span><span></span></pre></div></div>");
            panel.prependTo(this.element);
            $("<span class='task-btn flex-0' role='button' tabindex='0'>刷新</span>")
              .on("click keydown", event => {
                if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
                event.preventDefault();
                this.requestDailyStatus();
              }).appendTo(panel);
          }
          const grid = panel.find("pre").addClass("task-daily-grid");
          const rows = [
            "帝魄：" + soulProgress,
            "请安：" + greetProgress,
            "门派战贡献：" + progress(status.sectWarContribution, status.sectWarContributionLimit),
            "襄阳军功（本周）：" + progress(status.xiangyangMerit, status.xiangyangMeritLimit),
          ];
          if (grid[0] && typeof grid[0].querySelectorAll === "function") {
            const items = [...grid[0].querySelectorAll("span")];
            items.forEach((item, index) => {
              if (item.textContent !== rows[index]) item.textContent = rows[index];
            });
            const layout = () => {
              const widths = items.map(item => item.getBoundingClientRect().width);
              const gap = parseFloat(global.getComputedStyle(grid[0]).columnGap) || 0;
              const needed = Math.max(widths[0], widths[2]) + Math.max(widths[1], widths[3]) + gap;
              const columns = needed <= grid[0].clientWidth ? "2" : "1";
              if (grid.attr("data-columns") !== columns) grid.attr("data-columns", columns);
            };
            layout();
            if (!this.dailyStatusObserver && typeof global.ResizeObserver === "function") {
              this.dailyStatusObserver = new global.ResizeObserver(layout);
              this.dailyStatusObserver.observe(grid[0]);
            }
          }
        },
        cancelDailyStatus: function () {
          if (this.dailyStatusCancel) this.dailyStatusCancel();
        },
        requestDailyStatus: function () {
          this.cancelDailyStatus();
          const automation = getAutomation(), roleId = getRoleId();
          this.dailyStatus = this.getDailyStatus() || Object.assign({ roleId, day: this.dailyStatusDay(), updatedAt: null }, this.parseDailyStatus(""));
          this.dailyStatusFailed = false;
          const signin = (this.items || []).find(item => item.id === "signin");
          if (signin && this.dailyStatus.greeted === null)
            this.dailyStatus.greeted = this.parseDailyStatus(signin.desc).greeted;
          const fail = () => {
            this.dailyStatus = Object.assign({ roleId, day: this.dailyStatusDay(), updatedAt: null }, this.parseDailyStatus(""));
            this.dailyStatusFailed = true;
            this.renderDailyStatus();
          };
          if (!automation || typeof automation.add_hook !== "function") {
            fail();
            return;
          }
          let hook, timer, silent;
          const finish = () => {
            clearTimeout(timer);
            automation.remove_hook(hook);
            if (silent && automation.silentResponseMatchers) {
              const index = automation.silentResponseMatchers.indexOf(silent);
              if (index >= 0) automation.silentResponseMatchers.splice(index, 1);
              clearTimeout(silent.timer);
            }
            this.dailyStatusCancel = null;
            this.dailyStatusPending = false;
          };
          this.dailyStatusCancel = finish;
          this.dailyStatusPending = true;
          const matchesInfo = event => event.type === "text" &&
            /武道塔进度|门派职位等级|今日副本次数/.test(String(event.msg || "")) &&
            /帝魄|请安|师门功绩|门派战(?:争)?(?:贡献|功绩)|襄阳军功/.test(String(event.msg || ""));
          hook = automation.add_hook(["text", "login"], event => {
            if (event.type === "login" || getRoleId() !== roleId) {
              finish();
              this.dailyStatus = null;
              this.dailyStatusFailed = false;
              this.renderDailyStatus();
              return;
            }
            if (!matchesInfo(event)) return;
            const parsed = this.parseDailyStatus(event.msg);
            Object.assign(this.dailyStatus, parsed, { updatedAt: Date.now() });
            if (parsed.greeted === null && signin)
              this.dailyStatus.greeted = this.parseDailyStatus(signin.desc).greeted;
            finish();
            this.renderDailyStatus();
          });
          timer = setTimeout(() => {
            finish();
            fail();
          }, 8000);
          if (typeof automation.suppressNextResponse === "function")
            silent = automation.suppressNextResponse(matchesInfo, 8000);
          this.renderDailyStatus();
          SendCommand("info");
        },
        close: function () {
          this.cancelDailyStatus();
          if (this.dailyStatusObserver) this.dailyStatusObserver.disconnect();
          this.dailyStatusObserver = null;
          if (typeof this.element.detach === "function") this.element.detach();
          else this.element.remove();
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
            this.update_item(_0xe6c3ca);
            if (_0xe6c3ca.id === "signin" && this.isShow) this.requestDailyStatus();
            return;
          }
          Dialog.title("任务列表");
          Dialog.icon("exclamation-sign");
          this.items = _0xe6c3ca.items;
          this.create_items();
          if (this.isShow) this.requestDailyStatus();
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
          const dailyPanel = this.element.find(".task-daily-status");
          if (typeof dailyPanel.detach === "function") dailyPanel.detach();
          this.element.html(_0x16b1d1.join(""));
          if (dailyPanel.length && typeof dailyPanel.detach === "function") dailyPanel.prependTo(this.element);
          this.renderDailyStatus();
          Dialog.footer("");
        },
      };

      return { tasks };
    },
  );
})(window);
