/** Message, relation, party and team dialog models. */
(function registerDialogSocialModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "dialog-social",
    function createDialogSocial(context) {
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
      const ReceiveMessage =
        typeof context.getReceiveMessage === "function"
          ? context.getReceiveMessage()
          : context.ReceiveMessage || context.receiveMessage;
      const Process =
        typeof context.getProcess === "function"
          ? context.getProcess()
          : context.Process;
      const getFormatTimeSpan =
        typeof context.getFormatTimeSpan === "function"
          ? context.getFormatTimeSpan
          : () => context.formatTimeSpan || context.format_time_span;

      if (
        !Dialog ||
        typeof $ !== "function" ||
        typeof SendCommand !== "function" ||
        !ToolAction ||
        typeof ToolAction.showFlag !== "function" ||
        typeof ReceiveMessage !== "function" ||
        !Process ||
        typeof getFormatTimeSpan !== "function" ||
        typeof getFormatTimeSpan() !== "function"
      ) {
        throw new TypeError(
          "社交对话框需要显式 Dialog、jQuery、SendCommand、ToolAction、ReceiveMessage、Process 和时间格式化上下文",
        );
      }

      const message = {
        close: function () {
          this.element.remove();
          this.isShow = false;
        },
        hide: function () {
          if (this.detailID) {
            this.hide_detail();
            return false;
          }
        },
        hide_detail: function () {
          this.element.removeClass("detail");
          this.detailID = null;
          Dialog.footerElement.find(".item-commands").empty();
        },
        selected_item: 0,
        messages: [],
        isLoad: false,
        unRead: 0,
        onData: function (data) {
          if (data.receive) return this.updateMessageState(data.receive, data.index);
          if (data.items) return this.createMessageDetail(data.id, data.items);
          if (data.clear) return this.clear_message(data.clear);
          if (data.unRead != undefined) this.unRead = data.unRead;
          if (data.messages) {
            for (var index = 0; index < data.messages.length; index++)
              this.addMessage(data.messages[index]);
          }
          if (data.message) {
            if (!this.isShow) this.unRead++;
            if (this.messages) this.addMessage(data.message);
            if (data.message.id == "notice") this.showNotice(data.message);
          }
          if (this.element) this.showMessages();
          if (this.isShow) {
            if (
              data.message &&
              this.element.is(".detail") & (this.detailID == data.message.id)
            ) {
              this.detailElement.prepend(
                $(this.createMessageDetailItem(
                  data.message.id,
                  data.message.name,
                  data.message,
                )),
              );
            }
          } else this.showUnread();
        },
        showUnread: function () {
          if (this.unRead) ToolAction.showFlag("message", this.unRead);
          else ToolAction.showFlag("message", 0);
        },
        addMessage: function (msg) {
          for (let index = 0; index < this.messages.length; index++) {
            if (this.messages[index].id == msg.id) {
              this.messages[index] = msg;
              return;
            }
          }
          this.messages.push(msg);
        },
        clear_message: function (type) {
          for (let index = 0; index < this.messages.length; index++) {
            let from = this.messages[index].id;
            if ((type === true && from !== "notice") || from == type) {
              this.messages.splice(index, 1);
              index--;
            }
          }
          this.showMessages();
          if (!this.isShow) return;
          if (
            this.element.is(".detail") &
            (type === true || this.detailID == type)
          )
            this.hide_detail();
        },
        show: function () {
          this.unRead = 0;
          this.showUnread();
          if (this.isShow) return;
          this.isShow = true;
          Dialog.title("消息");
          Dialog.icon("envelope");
          this.create_footer();
          this.footerChanged(this.selected_item);
          if (this.isLoad) return;
          SendCommand("message");
          this.isLoad = true;
        },
        inner_show: function () {
          Dialog.title("消息");
          Dialog.icon("envelope");
          this.element.on("click", ".message-item", this.showMessageDetail);
        },
        inner_close: function () {
          this.element.remove();
          this.isShow = false;
        },
        footers: ["消息", "队伍", "关系", "帮派"],
        footerElements: ["message", "team", "relation", "party"],
        create_footer: function () {
          var html = [];
          for (var index = 0; index < this.footers.length; index++) {
            html.push(
              "<span class='footer-item" +
                (index == this.selected_item ? " select" : "") +
                "' for='" +
                index +
                "''>" +
                this.footers[index] +
                "</span>",
            );
          }
          html.push('<dic class="item-commands"></div>');
          Dialog.footer(html.join(""));
        },
        footerChanged: function (index) {
          this.selected_item = index;
          Dialog.footerElement.find(".item-commands").empty();
          this.showChild();
        },
        showChild: function () {
          var child = Dialog[this.footerElements[this.selected_item]];
          if (this.selectedChild) this.selectedChild.inner_close();
          if (!child.element) child.element = child.createElement();
          Dialog.contentElement.html(child.element);
          child.inner_show();
          this.selectedChild = child;
        },
        showNotice: function (notice) {
          var html = ["\n<hiy>系统公告</hiy>\n"];
          var date = new Date(notice.time);
          html.push(date.getFullYear(), "年", date.getMonth() + 1, "月");
          html.push(date.getDate(), "日 ", date.getHours(), "时");
          html.push(date.getMinutes(), "分\n<hic>", notice.content, "\n</hic>");
          ReceiveMessage(html.join(""));
        },
        showMessages: function () {
          var html = [];
          for (var index = 0; index < this.messages.length; index++) {
            var item = this.messages[index];
            html.push("<div class='message-item' fromid=\"", item.id, "\">");
            html.push("<div class='message-title'>", item.name);
            html.push("<span class='message-time'>", this.getTimedesc(item.time), "</span>");
            html.push("</div><div class='message-content'>", item.content, "</div></div>");
          }
          if (!html.length) html.push('<div class="empty">暂无新消息</div>');
          if (!this.listElement) this.listElement = this.element.find(".message-list");
          this.listElement.html(html.join(""));
        },
        getTimedesc: function (long) {
          var now = new Date();
          var time = new Date(long);
          var diff = (now - time) / 1000;
          if (diff < 60) return "刚刚";
          if (diff < 3600) return parseInt(diff / 60) + "分钟前";
          if (time.getFullYear() == now.getFullYear() && time.getMonth() == now.getMonth()) {
            var day = time.getDate() - now.getDate();
            var today = "今天 " + this.add_zero(time.getHours()) + ":" + this.add_zero(time.getMinutes());
            if (day == 0) return today;
            if (day == 1) return "昨天 " + today;
            if (day == 2) return "前天 " + today;
          }
          var result = time.getMonth() + 1 + "月" + time.getDate() + "日 " +
            this.add_zero(time.getHours()) + "：" + this.add_zero(time.getMinutes());
          if (now - time > 2332800000) result += "<mem>即将过期</mem>";
          return result;
        },
        add_zero: function (num) {
          return num < 10 ? "0" + num : num;
        },
        showMessageDetail: function () {
          var id = $(this).attr("fromid");
          if (!id) return;
          SendCommand("message " + id);
          Dialog.message.element.addClass("detail");
        },
        getMessageitem: function (id) {
          for (var index = 0; index < this.messages.length; index++)
            if (this.messages[index].id == id) return this.messages[index];
        },
        createMessageDetail: function (id, items) {
          if (!this.detailElement) this.detailElement = this.element.find(".detail-list");
          var messageItem = this.getMessageitem(id);
          if (!messageItem) return;
          var html = [];
          this.detailID = id;
          for (var index = 0; index < items.length; index++)
            html.push(this.createMessageDetailItem(id, messageItem.name, items[index]));
          this.detailElement.html(html.join(""));
          var commands = "";
          if (id !== "notice")
            commands = '<span cmd="message delete ' + id + '">删除</span><span cmd="receive ' + id + '">领取全部</span>';
          Dialog.footerElement.find(".item-commands").html(commands);
        },
        createMessageDetailItem: function (id, name, item) {
          var html = [
            "<div class='detail-item' rec='",
            item.attach && !item.rec ? 1 : 0,
            "' fid='",
            id,
            "' index='",
            item.index,
            "'>",
            "<span class='detail-name'>",
            name,
            "</span><span class='detail-time'>",
            this.getTimedesc(item.time),
            "</span><pre class='detail-content'>",
            item.content,
            "</pre>",
          ];
          if (item.attach) {
            for (var index = 0; index < item.attach.length; index++)
              html.push("<div class='detail-attach'>", item.attach[index].name, "</div>");
            html.push(
              item.rec
                ? "<div class='detail-rec'>已领取</div>"
                : "<div  class='detail-rec' cmd='receive " +
                  id +
                  " " +
                  item.index +
                  "'><hig>领取</hig></div>",
            );
          }
          html.push("</div>");
          return html.join("");
        },
        createElement: function () {
          return $(
            '<div class="dialog-message"><div class="message-list"></div><div class="detail-list"></div></div>',
          );
        },
        updateMessageState: function (receive, index) {
          if (this.detailID != receive) return;
          this.detailElement
            .find(".detail-item[index='" + index + "']>.detail-rec")
            .html("已领取")
            .removeAttr("cmd");
        },
      };

      const relation = {
        createElement: function () {
          return $('<div class="dialog-relation"></div>');
        },
        inner_show: function () {
          SendCommand("relation");
          this.isShow = true;
          Dialog.title("关系");
          Dialog.icon("heart");
        },
        onData: function (data) {
          var html = ["<div class='relation-item'><div class='relation-desc'>"];
          if (data.husband) html.push("你的丈夫：", data.husband);
          else if (data.wife) html.push("你的妻子：", data.wife);
          else html.push("你目前没有结婚。");
          html.push("</div>");
          if (data.wife || data.husband)
            html.push(
              "<div class='relation-cmd' cmd='_confirm greet wife'><him>❀送花❀</him></div>",
              "<div class='relation-cmd' cmd='rel marry'>解除关系</div>",
            );
          html.push("</div><div class='relation-item'><div class='relation-desc'>");
          if (data.shifu) html.push("你的师父：", data.shifu);
          else if (data.tudi) html.push("你的徒弟：", data.tudi);
          else html.push("你目前没有拜师，也没有收徒。");
          html.push("</div>");
          if (data.shifu)
            html.push(
              "<div class='relation-cmd' cmd='greet master'><hig>请安</hig></div>",
              "<div class='relation-cmd' cmd='rel st'>出师</div>",
              "</div>",
            );
          else if (data.tid) html.push("<div class='relation-cmd' cmd='rel st'>解除关系</div>");
          html.push("</div>");
          if (data.st != undefined) {
            html.push("<div class='relation-item'><div class='relation-desc'>");
            html.push("当师徒组队完成副本后将获得额外奖励，本周已完成", data.st, "/10。", "</div>");
            html.push("<div class='relation-cmd' cmd='team add ", data.tid ?? data.shifu, "'>邀请组队</div></div>");
          }
          if (data.reward) html.push("<div class='relation-item'>", data.reward, "</div>");
          html.push("</div>");
          if (data.fls) {
            for (let item of data.fls) {
              if (!item) continue;
              html.push("<div class='relation-item'><div class='relation-desc'>你的家人：", item[0]);
              if (item[2]) {
                html.push("，已", item[2], getFormatTimeSpan()(item[3]), "</div>");
                html.push("<div class='relation-cmd' cmd='rel ", item[1], " stop'>停止</div>");
              } else {
                html.push("空闲中</div>");
                html.push("<div class='relation-cmd' cmd='rel ", item[1], " caiyao'><hic>采药</hic></div>");
                html.push("<div class='relation-cmd' cmd='rel ", item[1], " diaoyu'><hic>钓鱼</hic></div>");
              }
              html.push("</div>");
            }
          }
          this.element.html(html.join(""));
        },
        inner_close: function () {
          this.element.remove();
          this.isShow = false;
        },
      };

      const party = {
        createElement: function () {
          return $('<div class="dialog-party"></div>');
        },
        inner_show: function () {
          SendCommand("party load");
          this.isShow = true;
          Dialog.title("");
          this.element.on("click", ".party-role", this.show_commands);
          Dialog.icon("flag");
        },
        levels: ["", "<hio>帮主<hio>", "<hiz>副帮主</hiz>", "<hiy>长老</hiy>", "<hic>堂主</hic>", "帮众"],
        level_roles: [1, 20, 30, 40, 50, 60],
        level: 5,
        get_role: function (id) {
          if (!this.roles) return;
          for (var index = 0; index < this.roles.length; index++)
            if (this.roles[index].id == id) return this.roles[index];
        },
        command: function (type) {
          if (type === "create") {
            this.element.html(
              '<div class="dialog-party-add"><div>创建帮派需要500两<hiy>黄金</hiy>，请输入帮派名称(2-5字中文)：</div><input type="text" ></input><div class=\'item-commands\'><span cmd="_party cancle">取消</span><span cmd="_party create2">确定</span></div></div>',
            );
          } else if (type === "cancle") {
            this.empty("你还没有加入帮派");
          } else if (type === "create2") {
            let value = $(".dialog-party-add>input").val();
            if (!value || value.length > 5 || value.length < 2)
              return ReceiveMessage("帮派名字需要是2-5中文字符。");
            SendCommand("party create2 " + value);
          }
        },
        empty: function (text) {
          this.element.html(
            "<wht>" + text + "</wht><div class='item-commands'><span cmd='_party create'>创建帮派</span><span cmd='party list'>加入帮派</span></div>",
          );
        },
        show_list: function (data) {
          if (!data.list.length) return this.empty("现在没有已经创建的帮派");
          var html = [];
          for (let item of data.list)
            html.push("<div class='party-item'><span class='party-item-name'>", item[0], "</span><span class='party-item-sc'>人数：", item[1], "</span><span class='party-item-cmd' cmd='party join ", item[0], "'>加入</span></div>");
          this.element.html(html.join(""));
        },
        onData: function (data) {
          if (data.list) return this.show_list(data);
          if (!data.name) return this.empty("你还没有加入帮派");
          Dialog.title("帮派【" + data.name + "】 <nor>" + data.roles.length + "/" + this.level_roles[data.level] + "</nor>");
          var html = [];
          if (data.notice) html.push("<div class='party-notice'>", data.notice, "</div>");
          html.push("<div class='party-roles'>");
          for (var index = 0; index < data.roles.length; index++) {
            var role = data.roles[index];
            if (role.id == Process.player) this.level = role.level;
            html.push("<div class='party-role' roleid='", role.id, "'><span class='role-level'>", this.levels[role.level], "</span><span class='role-name'>", role.name, "</span><span class='role-sc'>", role.sc, "</span></div>");
          }
          html.push("</div>");
          this.roles = data.roles;
          this.element.html(html.join(""));
        },
        show_commands: function () {
          var role = Dialog.party.get_role($(this).attr("roleid"));
          if (!role) return;
          var html = ["<div class='item-commands'>"];
          if (role.id == Process.player) {
            html.push('<span cmd="party out">退出帮派</span>');
            if (Dialog.party.level == 1) html.push('<span cmd="party dissmiss">解散</span>');
          } else {
            if (role.level > Dialog.party.level - 1 && role.level > 2) html.push('<span cmd="party uplevel ' + role.id + '">提升为' + Dialog.party.levels[role.level - 1] + "</span>");
            if (role.level > Dialog.party.level && role.level < 5) html.push('<span cmd="party downlevel ' + role.id + '">降级为' + Dialog.party.levels[role.level + 1] + "</span>");
            if (Dialog.party.level == 1 && role.level == 2) html.push('<span cmd="party trans ' + role.id + '">让位</span>');
            if (role.level > Dialog.party.level) html.push('<span cmd="party remove ' + role.id + '">开除</span>');
            if (role.online) html.push('<span cmd="team add ' + role.id + '">邀请组队</span>');
          }
          if (html.length == 1) return;
          html.push("</div>");
          Dialog.party.element.find(".item-commands").remove();
          $(html.join("")).insertAfter(this);
        },
        inner_close: function () {
          this.element.remove();
          this.isShow = false;
        },
      };

      const team = {
        createElement: function () {
          return $('<div class="dialog-team"></div>');
        },
        inner_show: function () {
          SendCommand("team");
          this.isShow = true;
          Dialog.title("队伍");
          this.element.on("click", ".team-item", this.clickItem);
          Dialog.icon("list");
        },
        items: [],
        onData: function (data) {
          if (data.items) {
            this.items = data.items;
            if (data.items.length) this.isCap = data.items[0].id == Process.player;
            else this.isCap = 0;
          }
          if (data.dismiss) {
            this.items.length = 0;
            this.isCap = false;
          }
          if (data.remove) {
            if (!this.items.length) return;
            for (var index = 0; index < this.items.length; index++) {
              if (this.items[index].id == data.remove) {
                this.items.splice(index, 1);
                break;
              }
            }
          }
          this.createItems();
        },
        inner_close: function () {
          this.element.remove();
          this.isShow = false;
        },
        createItems: function () {
          if (!this.element) return;
          var html = [];
          for (var index = 0; index < this.items.length; index++) {
            var item = this.items[index];
            html.push("<div class='team-item' index='", index, "'><span class='team-flag'>", index > 0 ? "" : "<span class='glyphicon glyphicon-flag'></span>", "</span><span class='team-title'>", item.name, "</span></div>");
          }
          if (!html.length) html.push('<div class="empty">你还没有加入任何队伍。</div>');
          this.element.html(html.join(""));
        },
        clickItem: function () {
          var element = $(this);
          var item = Dialog.team.items[element.attr("index")];
          if (!item) return;
          var html = ["<div class='item-commands'>"];
          html.push('<span cmd="look3 ' + item.id + '">查看</span>');
          var isCap = Dialog.team.items[0].id == Process.player;
          if (isCap && item.id != Process.player) html.push('<span cmd="team remove ' + item.id + '">移出队伍</span>');
          else if (item.id == Process.player) html.push('<span cmd="team out ' + item.id + '">退出队伍</span>');
          if (isCap && item.id == Process.player) html.push('<span cmd="team set">更改分配方式</span>');
          html.push("</div>");
          Dialog.team.element.find(".item-commands").remove();
          $(html.join("")).appendTo(element);
        },
      };

      return { message, relation, party, team };
    },
  );
})(window);
