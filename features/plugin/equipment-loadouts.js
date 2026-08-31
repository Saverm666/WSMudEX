/** Saved equipment and skill loadouts, including the legacy set-management UI. */
(function registerEquipmentLoadouts(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "equipment-loadouts",
    function install(context) {
      const { WG, G, UI, legacy, messageAppend, messageClear } = context;
      const skillTypes = [
        "throwing",
        "unarmed",
        "force",
        "dodge",
        "sword",
        "blade",
        "club",
        "staff",
        "whip",
        "parry",
      ];
      const deferredTimers = new Set();
      let activeVue = null;

      function roleId() {
        return legacy.getRoleId();
      }

      function loadoutKey() {
        return roleId() + "_eqlist";
      }

      function skillKey() {
        return roleId() + "_skilllist";
      }

      function getLoadouts() {
        return legacy.getEquipmentLoadouts();
      }

      function setLoadouts(value) {
        legacy.setEquipmentLoadouts(value);
      }

      function getSkillLoadouts() {
        return legacy.getSkillLoadouts();
      }

      function setSkillLoadouts(value) {
        legacy.setSkillLoadouts(value);
      }

      function schedule(callback, delay) {
        const timer = setTimeout(function () {
          deferredTimers.delete(timer);
          callback();
        }, delay);
        deferredTimers.add(timer);
        return timer;
      }

      function removeHook(name) {
        if (WG[name] != null) WG.remove_hook(WG[name]);
        WG[name] = null;
      }

      function clearPendingHooks() {
        removeHook("eqx");
        removeHook("eqxp");
      }

      function cloneValue(value) {
        if (value == null || typeof value !== "object") return value;
        const result = {};
        for (const key in value) result[key] = cloneValue(value[key]);
        return result;
      }

      function saveLoadout(name, mode) {
        WG.eqx = WG.add_hook("dialog", function (event) {
          if (event.dialog !== "pack" || event.eqs == null) return;
          const data = WG.deserializePackData(structuredClone(event));
          const loadouts = getLoadouts();
          loadouts[name] = cloneValue(data.eqs);
          setLoadouts(loadouts);
          GM_setValue(loadoutKey(), loadouts);
          messageAppend("套装" + name + "保存成功!", 1);
          removeHook("eqx");
        });
        WG.eqxp = WG.add_hook("dialog", function (event) {
          if (event.dialog !== "skills" || event.items == null) return;
          const skills = {};
          for (const type of skillTypes) skills[type] = "";
          for (const item of event.items)
            if (Object.prototype.hasOwnProperty.call(skills, item.id))
              skills[item.id] = item.enable_skill == null ? "none" : item.enable_skill;
          const skillLoadouts = getSkillLoadouts();
          skillLoadouts[name] = skills;
          setSkillLoadouts(skillLoadouts);
          GM_setValue(skillKey(), skillLoadouts);
          messageAppend("技能" + name + "保存成功!", 1);
          removeHook("eqxp");
        });
        WG.Send("cha");
        WG.Send("pack");
      }

      function applyLoadout(name, mode, copyOnly) {
        clearPendingHooks();
        const loadouts = GM_getValue(loadoutKey(), getLoadouts());
        const skillLoadouts = GM_getValue(skillKey(), getSkillLoadouts());
        setLoadouts(loadouts);
        setSkillLoadouts(skillLoadouts);
        if (copyOnly) {
          let commands = "";
          if (mode === 0) {
            for (let index = 1; index < 11; index++)
              if (loadouts[name][index] != null && loadouts[name][index] !== "")
                commands += "eq " + loadouts[name][index].id + ";";
            commands += "eq " + loadouts[name][0].id + ";";
          } else {
            for (const type in skillLoadouts[name])
              if (skillLoadouts[name][type] != null && skillLoadouts[name][type] !== "")
                commands += "enable " + type + " " + skillLoadouts[name][type] + ";";
          }
          legacy.copyToClipboard(commands);
          messageAppend(name + "已复制到剪贴板!", 1);
          return;
        }

        let commands = "";
        let label = "套装";
        const equipped = [];
        for (const item of G.eqs) if (item) equipped.push(item.id);
        const equippedIds = equipped.join("");
        if (mode === 0) {
          for (let index = 1; index < 11; index++)
            if (
              loadouts[name][index] != null &&
              equippedIds.indexOf(loadouts[name][index].id) < 0
            )
              commands += "$wait 20;eq " + loadouts[name][index].id + ";";
          if (
            loadouts[name][0] != null &&
            equippedIds.indexOf(loadouts[name][0].id) < 0
          )
            commands += "$wait 40;eq " + loadouts[name][0].id + ";";
        } else {
          label = "技能";
          for (const type in skillLoadouts[name])
            for (const skill of G.enable_skills)
              if (
                skill.name !== skillLoadouts[name][type] &&
                skill.type === type
              ) {
                commands +=
                  "$wait 40;enable " + type + " " + skillLoadouts[name][type] + ";";
                break;
              }
          $("span[command=skills]").click();
        }
        commands += "$wait 40;cha;look3 1";
        WG.eqx = WG.add_hook("text", function (event) {
          if (event.type !== "text" || event.msg.indexOf("没有这个玩家") < 0) return;
          messageAppend(label + "装备成功" + name + "!", 1);
          mode === 1 && $("span[command=skills]").click();
          removeHook("eqx");
        });
        WG.SendCmd(commands);
      }

      Object.assign(WG, {
        eqx: null,
        eqxp: null,
        haspack: function (name, callback) {
          WG.Send("pack");
          for (const item of legacy.getPackData())
            if (item && item.name.indexOf(name) >= 0) return void callback(item.id);
          callback("");
        },
        eqhelper: function (name, mode = 0, copyOnly = false) {
          const loadouts = getLoadouts();
          if (name == null || name === 0 || name > loadouts.length) return;
          if (loadouts == null || loadouts[name] == null || loadouts[name] === "") {
            if (mode !== 1) {
              messageAppend("套装未保存,保存当前装备作为套装" + name + "!", 1);
              clearPendingHooks();
              saveLoadout(name, mode);
            }
            return;
          }
          applyLoadout(name, mode, copyOnly);
        },
        eqhelperdel: function (name) {
          const loadouts = GM_getValue(loadoutKey(), getLoadouts());
          const skillLoadouts = GM_getValue(skillKey(), getSkillLoadouts());
          delete loadouts[name];
          delete skillLoadouts[name];
          setLoadouts(loadouts);
          setSkillLoadouts(skillLoadouts);
          GM_setValue(loadoutKey(), loadouts);
          GM_setValue(skillKey(), skillLoadouts);
          messageAppend("清除套装 技能" + name + "设置成功!", 1);
        },
        uneqall: function (mode = "0") {
          if (mode === "0") {
            clearPendingHooks();
            WG.eqx = WG.add_hook("dialog", function (event) {
              if (event.dialog !== "pack" || event.eqs == null) return;
              const data = WG.deserializePackData(structuredClone(event));
              for (const item of data.eqs)
                if (item != null) WG.Send("uneq " + item.id);
              removeHook("eqx");
            });
            WG.Send("pack");
            messageAppend("取消所有装备成功!", 1);
          } else {
            const commands =
              "enable unarmed none;enable blade none;enable force none;enable parry none;enable dodge none;enable sword none;enable throwing none;enable whip none;enable club none;enable staff none".split(
                ";",
              );
            for (const command of commands) {
              WG.sleep(10);
              WG.Send(command);
            }
            messageAppend("取消所有技能成功!", 1);
          }
        },
        eqloader: function () {
          const loadouts = GM_getValue(loadoutKey(), null);
          const items = {};
          for (const name in loadouts) {
            items[name] = {
              name: "装备" + name,
              icon: "fa-compress",
              callback: function () {
                WG.eqhelper(name, 0);
              },
            };
            items[name + "sk"] = {
              name: "技能" + name,
              icon: "fa-magic",
              callback: function () {
                WG.eqhelper(name, 1);
              },
            };
            items[name + "del"] = {
              name: "删除组" + name,
              icon: "fa-remove",
              callback: function () {
                WG.eqhelperdel(name);
              },
            };
          }
          items.setting = {
            name: "套装管理",
            icon: "edit",
            callback: function () {
              WG.eqhelperui();
            },
          };
          const deferred = jQuery.Deferred();
          schedule(function () {
            deferred.resolve(items);
          }, 20);
          return deferred.promise();
        },
        eqhelperui: function () {
          if (activeVue && typeof activeVue.$destroy === "function") activeVue.$destroy();
          messageClear();
          messageAppend(UI.skillsPanel);
          activeVue = new Vue({
            el: "#skillsPanelUI",
            data: {
              role: legacy.getRoleName(),
              loadoutRoleId: roleId(),
              eqlist: {},
              cpeqlist: {},
              eqlistdel: {},
              covereqlist: {},
              eqskills_id: "none",
            },
            created() {},
            mounted() {
              this.eqlist = GM_getValue(this.loadoutRoleId + "_eqlist", {});
            },
            methods: {
              eq: function (name) {
                WG.eqhelper(name, 0);
              },
              eqs: function (name) {
                WG.eqhelper(name, 1);
              },
              copyeq: function (name) {
                WG.eqhelper(name, 0, true);
              },
              copyeqs: function (name) {
                WG.eqhelper(name, 1, true);
              },
              save: function (name) {
                WG.eqhelper(name);
                schedule(() => {
                  this.eqlist = GM_getValue(this.loadoutRoleId + "_eqlist", {});
                  WG.eqhelperui();
                }, 300);
              },
              covereq: function (name) {
                this.deleq(name);
                this.save(name);
              },
              deleq: function (name) {
                WG.eqhelperdel(name);
                schedule(() => WG.eqhelperui(), 200);
              },
              show: function () {
                WG.eqhelperui();
              },
              saveUI: function () {
                const view = this;
                layer.prompt(
                  { title: "请输入套装名...", formType: 2 },
                  function (name, index) {
                    layer.close(index);
                    if (name != null) view.save(name);
                  },
                );
              },
              eqskills_opts_change: function (value) {
                switch (value) {
                  case "save":
                    this.saveUI();
                    break;
                  case "copyeq":
                    this.covereqlist = {};
                    this.eqlist = {};
                    this.eqlistdel = {};
                    this.cpeqlist = GM_getValue(this.loadoutRoleId + "_eqlist", {});
                    this.role = "<< 返回";
                    break;
                  case "delete":
                    this.cpeqlist = {};
                    this.eqlist = {};
                    this.covereqlist = {};
                    this.eqlistdel = GM_getValue(this.loadoutRoleId + "_eqlist", {});
                    this.role = "<< 返回";
                    break;
                  case "covereq":
                    this.cpeqlist = {};
                    this.eqlist = {};
                    this.eqlistdel = {};
                    this.covereqlist = GM_getValue(this.loadoutRoleId + "_eqlist", {});
                    this.role = "<< 返回";
                    break;
                  case "uneqall":
                    WG.uneqall();
                    break;
                }
              },
            },
          });
          return activeVue;
        },
      });

      return {
        destroy: function () {
          clearPendingHooks();
          for (const timer of deferredTimers) clearTimeout(timer);
          deferredTimers.clear();
          if (activeVue && typeof activeVue.$destroy === "function") activeVue.$destroy();
          activeVue = null;
          WG.eqx = null;
          WG.eqxp = null;
          WG.haspack = undefined;
          WG.eqhelper = undefined;
          WG.eqhelperdel = undefined;
          WG.uneqall = undefined;
          WG.eqloader = undefined;
          WG.eqhelperui = undefined;
        },
      };
    },
  );
})(window);
