/** Combat panel, actions, cooldowns and status-effect rendering. */
(function registerCombatModule(global) {
  "use strict";

  global.WSMudClient.registerModule("combat", function create(context) {
    const jquery = context.jquery;
    const hostWindow = context.hostWindow || global;
    const timers = context.timers || hostWindow;
    const getSendCommand = context.getSendCommand;
    const getSetting = context.getSetting;
    const getProcess = context.getProcess;
    const getDialog = context.getDialog;
    const timerHandles = new Set();

    function schedule(callback, delay, ...args) {
      let handle;
      const wrapped = function () {
        timerHandles.delete(handle);
        return callback(...args);
      };
      handle = timers.setTimeout(wrapped, delay);
      timerHandles.add(handle);
      return handle;
    }

    function clearScheduled(handle) {
      if (handle == null) return;
      timers.clearTimeout(handle);
      timerHandles.delete(handle);
    }

    function sendCommand(command) {
      return getSendCommand()(command);
    }

    const Combat = {
      IsShow: false,
      Skills: null,
      actions: null,
      room_actions: null,
      object_actions: null,
      Scroll: function (event) {
        let element = jquery(this)[0];
        element.scrollLeft += event.originalEvent.deltaY;
      },
      Show: function () {
        if (Combat.IsShow) return Combat.Hide();
        if (!this.object_actions) sendCommand("actions");
        Combat.IsShow = true;
        if (!getSetting().off_hp) jquery(".room-item>.item-status").show();
        jquery(".combat-panel").removeClass("hide");
        getProcess().message.scroll2end();
      },
      Hide: function () {
        Combat.IsShow = false;
        if (!getSetting().off_hp) jquery(".room-item>.item-status").hide();
        jquery(".combat-panel").addClass("hide");
      },
      ShowRoomCommands: function (commands) {
        let element = jquery(".room-commands");
        if (this.room_actions) {
          for (let command of this.room_actions) {
            element.find('[cmd="' + command.cmd + '"]').remove();
          }
        }
        this.room_actions = commands;
        if (!Combat.IsShow) return;
        this.append_items(commands, element);
      },
      def_actions: [
        { cmd: "dazuo", name: "打坐" },
        { cmd: "liaoshang", name: "疗伤" },
      ],
      refActions: function () {
        let actions = [...this.def_actions];
        getDialog().extend.append(actions, "action");
        this.actions = actions;
        this.create_actions();
      },
      ShowActions: function (payload) {
        this.object_actions = payload.actions ?? [];
        this.refActions();
        if (payload.skills) this.ShowPFM(payload);
      },
      ShowPFM: function (payload) {
        this.Skills = payload.skills || [];
        this.create_skillItems(payload.skills);
      },
      append_items: function (items, element) {
        if (items) {
          for (let item of items) {
            item.elem = jquery(
              "<span class='act-item' cmd='" +
                item.cmd +
                "'>" +
                item.name +
                "</span>",
            ).appendTo(element);
          }
        }
      },
      create_actions: function () {
        var element = jquery(".room-commands").empty();
        this.append_items(this.actions, element);
        this.append_items(this.object_actions, element);
        this.append_items(this.room_actions, element);
        if (hostWindow.WGUpdateNativeAutoAttackActionState) {
          hostWindow.WGUpdateNativeAutoAttackActionState();
        }
      },
      DisObj: function (item) {
        if (!this.object_actions) return;
        var command = item.act ? item.id : "use " + item.id;
        for (var index = 0; index < this.object_actions.length; index++) {
          var action = this.object_actions[index];
          if (action.cmd === command) {
            if (item.remove) {
              this.object_actions.splice(index, 1);
              return action.elem.remove();
            }
            this.ANI_OBJ(action.elem, item.time, item.time);
          }
        }
      },
      AddObj: function (id, name) {
        if (!this.object_actions) return;
        var command = "use " + id;
        for (var index = 0; index < this.object_actions.length; index++) {
          if (this.object_actions[index].cmd == command) return;
        }
        this.object_actions.push({
          cmd: command,
          name: name.replace(/\<.+?\>/g, ""),
        });
        this.create_actions();
      },
      ANI_OBJ: function (element, total, remaining) {
        if (!element) return;
        var percentage = (remaining * 100) / total;
        if (percentage > 0) {
          element.css("backgroundSize", percentage + "% 100%");
        } else {
          if (percentage < 0) percentage = 0;
          element.css("backgroundSize", "0% 100%");
        }
        schedule(Combat.ANI_OBJ, 1000, element, total, remaining - 1000);
      },
      create_skillItems: function (skills) {
        var element = jquery(".combat-commands").empty();
        if (!skills.length) return;
        for (var index = 0; index < skills.length; index++) {
          var markup = [];
          markup.push("<span class='pfm-item' pid='" + skills[index].id + "'>");
          markup.push(skills[index].name);
          markup.push("</span>");
          skills[index].elem = jquery(markup.join("")).appendTo(element);
        }
      },
      ChangeDistime: function (payload) {
        var id = payload.id.replace("/", ".");
        for (var index = 0; index < Combat.dis_pfms.length; index++) {
          if (Combat.dis_pfms[index].id == id) {
            Combat.dis_pfms[index].ani_time += payload.time;
            break;
          }
        }
      },
      ClearDistime: function (payload) {
        if (!Combat.dis_pfms) return;
        var id = payload.id ? payload.id.replace("/", ".") : payload.id;
        for (var index = 0; index < Combat.dis_pfms.length; index++) {
          if (!id || Combat.dis_pfms[index].id == id) {
            Combat.dis_pfms[index].ani_time = 0;
          }
        }
      },
      redisable: function () {
        Combat.dis_pfms = [];
        for (var index = 0; index < Combat.Skills.length; index++) {
          var skill = Combat.Skills[index];
          Combat.dis_pfms.push({
            id: skill.id,
            distime: skill.distime,
            ani_time: skill.distime,
          });
        }
        if (!Combat.time_handler) Combat.ANI_PFM();
      },
      On_Perform: function (payload) {
        if (!this.Skills) return;
        if (payload.id === "all" && !payload.rtime) return this.redisable();
        if (payload.id) payload.id = payload.id.replace("/", ".");
        payload.rtime = payload.rtime || 0;
        payload.distime = payload.distime || 0;
        if (!this.dis_pfms) this.dis_pfms = [];
        for (var index = 0; index < this.dis_pfms.length; index++) {
          if (this.dis_pfms[index].id == payload.id) {
            payload.id = null;
            this.dis_pfms[index].distime = payload.distime;
            this.dis_pfms[index].ani_time = payload.distime;
            continue;
          }
          if (this.dis_pfms[index].ani_time < payload.rtime) {
            this.dis_pfms[index].ani_time = payload.rtime;
            this.dis_pfms[index].distime = payload.rtime;
          }
        }
        if (payload.id) {
          this.dis_pfms.push({
            id: payload.id,
            distime: payload.distime,
            ani_time: payload.distime,
          });
        }
        Combat.ani_time = Combat.ani_time ?? 0;
        if (payload.rtime > Combat.ani_time) {
          Combat.distime = payload.rtime;
          Combat.ani_time = payload.rtime;
        }
        if (!this.time_handler) Combat.ANI_PFM();
      },
      PFM_INTERVAL: 300,
      ANI_PFM: function () {
        var percentage = 0;
        if (Combat.distime > 0) {
          percentage = (Combat.ani_time * 100) / Combat.distime;
        }
        for (var skillIndex = 0; skillIndex < Combat.Skills.length; skillIndex++) {
          var skill = Combat.Skills[skillIndex];
          var skillPercentage = percentage;
          for (var index = 0; index < Combat.dis_pfms.length; index++) {
            if (
              Combat.dis_pfms[index].id == skill.id &&
              Combat.dis_pfms[index].distime
            ) {
              skillPercentage =
                (Combat.dis_pfms[index].ani_time * 100) /
                Combat.dis_pfms[index].distime;
              if (skillPercentage < 0) {
                Combat.dis_pfms.splice(index, 1);
              } else {
                Combat.dis_pfms[index].ani_time -= Combat.PFM_INTERVAL;
              }
              break;
            }
          }
          if (skillPercentage > 0) {
            if (skillPercentage < 0) skillPercentage = 0;
            skill.elem.css("backgroundSize", skillPercentage + "% 100%");
          } else {
            skill.elem.css("backgroundSize", "0% 100%");
          }
        }
        if (Combat.ani_time > 0 || Combat.dis_pfms.length) {
          Combat.time_handler = schedule(Combat.ANI_PFM, Combat.PFM_INTERVAL);
        } else {
          Combat.time_handler = null;
        }
        Combat.ani_time -= Combat.PFM_INTERVAL;
      },
      StatusChanged: function (payload) {
        var items = jquery(".room-item");
        for (var index = 0; index < items.length; index++) {
          var item = jquery(items[index]);
          if (item.attr("itemid") == payload.id) {
            this.UpdaeBar(payload, "mp", item);
            this.UpdaeBar(payload, "hp", item);
            break;
          }
        }
      },
      UpdaeBar: function (payload, type, item) {
        if (type == "mp" && payload.id != getProcess().player) return;
        var value = payload[type];
        var max = 0;
        if (value == undefined) return;
        var progress = item.find("." + type + ">.progress-bar");
        if (payload["max_" + type]) {
          max = payload["max_" + type];
          progress.attr("max", max);
        } else {
          max = parseInt(progress.attr("max"));
        }
        if (getSetting().show_hpnum) {
          if (type == "hp") {
            item
              .find(".hp-progress-num")
              .text(
                "[" +
                  getProcess().formatStatusNumber(value) +
                  "/" +
                  getProcess().formatStatusNumber(max) +
                  "]",
              );
          } else if (type == "mp") {
            item
              .find(".mp-progress-num")
              .text(
                "[" +
                  getProcess().formatStatusNumber(value) +
                  "/" +
                  getProcess().formatStatusNumber(max) +
                  "]",
              );
          }
        }
        progress.css("width", Combat.CountWidth(value, max) + "%");
        if (
          getSetting().show_damage &&
          payload.damage &&
          payload.id != getProcess().player
        ) {
          var damage = 0;
          if (payload.damage == -1) {
            damage = parseInt(((max - value) * 1000) / max) / 10;
          } else {
            damage = parseInt((payload.damage * 1000) / max) / 10;
          }
          progress = item.find(".item-damage");
          if (!progress.length) {
            progress = jquery(
              '<span class="item-damage">[<hiy>0%</hiy>]<span>',
            ).appendTo(item.find(".item-name"));
          }
          progress.html("[<hiy>" + damage + "%</hiy>]");
        }
      },
      CountWidth: function (value, max) {
        if (max == 0) return 0;
        var percentage = (value * 100) / max;
        if (percentage >= 100) return 100;
        if (percentage < 0) return 0;
        return percentage;
      },
      Perform: function () {
        var item = jquery(this);
        if (item.is("disable")) return;
        var id = item.attr("pid");
        if (!id) return;
        sendCommand("perform " + id);
      },
      STATUS: {},
      AppendStatusItem: function (id, element, status) {
        var target = { elem: element, items: {} };
        if (status) {
          for (var index = 0; index < status.length; index++) {
            this.StatusItem_add(target, status[index]);
          }
        }
        this.STATUS[id] = target;
      },
      StatusItemChanged: function (payload) {
        var handler = Combat["StatusItem_" + payload.action];
        if (handler) handler.call(Combat, this.STATUS[payload.id], payload);
      },
      StatusItem_add: function (target, item) {
        if (!target) return;
        var markup = [];
        markup.push('<span class="status-item');
        if (item.downside) markup.push(" downside");
        markup.push('" sid="');
        markup.push(item.sid);
        markup.push('">');
        markup.push(item.name);
        if (item.count != undefined) {
          markup.push("x");
          markup.push(item.count);
        }
        markup.push('<span class="shadow"></span></span>');
        target.items[item.sid] = {
          elem: jquery(markup.join("")).appendTo(target.elem)[0],
          name: item.name,
          count: item.count,
          duration: item.duration,
          anitime: item.duration - (item.overtime || 0),
        };
        if (item.duration > 0) this.StatusItemANI(target.items[item.sid]);
      },
      StatusItem_remove: function (target, payload) {
        if (!target) return;
        var ids = payload.sid;
        if (typeof ids == "string") ids = [ids];
        for (var index = 0; index < ids.length; index++) {
          var item = target.items[ids[index]];
          if (item) {
            jquery(item.elem).remove();
            if (item.handler) clearScheduled(item.handler);
            delete target.items[ids[index]];
          }
        }
      },
      StatusItem_refresh: function (target, payload) {
        if (!target) return;
        var item = target.items[payload.sid];
        if (!item) return;
        var firstChild = item.elem.firstChild;
        var lastChild = item.elem.lastChild;
        item.count = payload.count;
        item.elem.innerHTML = item.name + "x" + item.count + lastChild.outerHTML;
        if (item.handler) clearScheduled(item.handler);
        item.anitime = item.duration;
        this.StatusItemANI(item);
      },
      StatusItem_override: function (target, sid) {
        var item = target.items[sid.sid];
        if (!item) return;
        if (item.handler) clearScheduled(item.handler);
        item.anitime = item.duration;
        this.StatusItemANI(item);
      },
      StatusItem_clear: function (target) {
        if (!target) return;
        for (var id in target.items) {
          var item = target.items[id];
          if (item) {
            jquery(item.elem).remove();
            clearScheduled(item.handler);
          }
        }
        target.items = {};
      },
      ClearStatusTarget: function (id) {
        const target = this.STATUS && this.STATUS[id];
        if (!target) return null;
        if (target.items) {
          for (const sid in target.items) {
            const item = target.items[sid];
            if (!item) continue;
            clearScheduled(item.handler);
            item.handler = 0;
          }
        }
        delete this.STATUS[id];
        return target;
      },
      ClearRoomStatus: function () {
        if (this.STATUS) {
          for (const id of Object.keys(this.STATUS)) {
            this.ClearStatusTarget(id);
          }
        }
        this.STATUS = {};
      },
      StatusItemANI: function (item) {
        var shadow = item.elem.lastChild;
        var percentage = (item.anitime * 100) / item.duration;
        if (percentage < 0) percentage = 0;
        shadow.style.right = percentage + "%";
        item.anitime = item.anitime - 1000;
        if (percentage > 0) {
          item.handler = schedule(Combat.StatusItemANI, 1000, item);
        } else {
          item.handler = 0;
        }
      },
      destroy: function () {
        for (const handle of Array.from(timerHandles)) clearScheduled(handle);
        this.time_handler = null;
        if (this.STATUS) {
          for (const id in this.STATUS) {
            const target = this.STATUS[id];
            if (!target || !target.items) continue;
            for (const sid in target.items) {
              if (target.items[sid]) target.items[sid].handler = 0;
            }
          }
        }
      },
    };

    return Combat;
  });
})(window);
