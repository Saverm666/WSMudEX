/** Page command script engine and legacy SCRIPT compatibility surface. */
(function registerScriptEngineModule(global) {
  "use strict";

  global.WSMudClient.registerModule("script-engine", function create(context) {
    const jquery = context.jquery;
    const hostWindow = context.hostWindow || global;
    const PromiseConstructor =
      context.PromiseConstructor || hostWindow.Promise || Promise;
    const getSendCommand = context.getSendCommand;
    const getReceiveMessage = context.getReceiveMessage;
    const getHandlerMenuCommand = context.getHandlerMenuCommand;
    const getUtilities = context.getUtilities;
    const getProcess = context.getProcess;
    const getDialog = context.getDialog;
    const getMapDirExits = context.getMapDirExits;
    const getConfirmation = context.getConfirmation;

    function sendCommand(command) {
      return getSendCommand()(command);
    }

    function receiveMessage(message) {
      return getReceiveMessage()(message);
    }

    const SCRIPT = {
      is_running: false,
      run: async function (command) {
        this.is_running = true;
        try {
          let commands = command.split(";");
          for (let item of commands) await this.run_one(item);
        } catch (error) {
          console.log("扩展执行失败：", error);
        }
        this.is_running = false;
      },
      var_reg: /^@(\w+)(?:\(([^)]*)\))?$/,
      run_one: async function (command) {
        let tokens = command.split(" ");
        let actionName = tokens[0];
        let action = this.actions.def;
        if (actionName[0] === "#") {
          actionName = actionName.substring(1);
          action = this.actions[actionName] ?? this.actions.def;
        }
        let parameterGroups = [[]];
        let token = null;
        for (let index = 1; index < tokens.length; index++) {
          if (!parameterGroups.length) break;
          token = tokens[index];
          if (token[0] === "@") await this.push_paras(parameterGroups, token);
          else parameterGroups.map((parameters) => parameters.push(token));
        }
        for (let parameters of parameterGroups) {
          await action(parameters, actionName);
        }
      },
      push_paras: async function (parameterGroups, token) {
        const match = token.match(this.var_reg);
        if (!match) throw new Error("<cyn>错误的参数格式" + token + "</cyn>");
        const variableName = match[1];
        const variableArguments = match[2]
          ? match[2].split(",").map((item) => item.trim())
          : [];
        const variable = this.vars[variableName];
        if (!variable) throw new Error("<cyn>无效参数" + token + "</cyn>");
        let values = await variable(...variableArguments);
        if (!values) return (parameterGroups.length = 0);
        if (!Array.isArray(values))
          return parameterGroups.map((parameters) => parameters.push(values));
        if (!values.length) return (parameterGroups.length = 0);
        const originalLength = parameterGroups.length;
        for (let valueIndex = 1; valueIndex < values.length; valueIndex++) {
          for (let groupIndex = 0; groupIndex < originalLength; groupIndex++) {
            parameterGroups.push([
              ...parameterGroups[groupIndex],
              values[valueIndex],
            ]);
          }
        }
        for (let groupIndex = 0; groupIndex < originalLength; groupIndex++) {
          parameterGroups[groupIndex].push(values[0]);
        }
      },
      actions: {
        def: function (parameters, actionName) {
          if (parameters.length)
            sendCommand(actionName + " " + parameters.join(" "));
          else sendCommand(actionName);
        },
        wait: function (parameters) {
          return getUtilities().Sleep(parseInt(parameters[0]));
        },
        action: async function (parameters) {
          let index = parseInt(parameters[0]);
          if (!(index >= 0) || !(index < 10)) return;
          let command = jquery(".room-commands").children().eq(index).attr("cmd");
          if (command) SCRIPT.run(command);
        },
        pfm: function (parameters) {
          let index = parseInt(parameters[0]);
          if (!(index >= 0) || !(index < 10))
            return sendCommand("perform " + parameters[0]);
          let skillId = jquery(".combat-commands")
            .children()
            .eq(index)
            .attr("pid");
          if (skillId) SCRIPT.run("perform " + skillId);
        },
        menu: function (parameters) {
          let menu = parameters[0];
          if (menu) getHandlerMenuCommand()(menu);
        },
        msg: function (parameters) {
          if (parameters.length > 0) receiveMessage(parameters.join(""));
        },
        wg: function (parameters) {
          let action = parameters[0];
          if (!action) return;
          const run =
            (typeof hostWindow.WGRunNativeExtensionAction === "function" &&
              hostWindow.WGRunNativeExtensionAction) ||
            (hostWindow.WG && hostWindow.WG.runNativeExtensionAction);
          if (typeof run === "function") return run(String(action).toLowerCase());
          receiveMessage("<hir>插件动作尚未准备完成，请稍后重试。</hir>");
        },
      },
      vars: {
        me: function () {
          return getProcess().player;
        },
        dir: function (direction) {
          let exits = getMapDirExits()[direction];
          if (!exits) return;
          for (let exit of exits) {
            if (getProcess().room_exits[exit]) return exit;
          }
        },
        npc: function (...names) {
          let room = getProcess().cur_room;
          let result = [];
          for (let item of room.items) {
            if (!item) continue;
            if (item.hp > 0 && !item.p) {
              if (!names || !names.length) result.push(item.id);
              else {
                for (let name of names) {
                  if (item.name.indexOf(name) > -1) {
                    result.push(item.id);
                    break;
                  }
                }
              }
            }
          }
          return result;
        },
        item: function (...names) {
          let room = getProcess().cur_room;
          let result = [];
          for (let item of room.items) {
            if (!item) continue;
            if (!names || !names.length) result.push(item.id);
            else {
              for (let name of names) {
                if (item.name.indexOf(name) > -1) {
                  result.push(item.id);
                  break;
                }
              }
            }
          }
          return result;
        },
        id: function () {
          let object = SCRIPT.LAST_OBJ;
          if (object) return object.id;
          return "";
        },
        obj: function (property) {
          let object = SCRIPT.LAST_OBJ;
          if (!property || !object) return;
          return object[property];
        },
        pack: function (...names) {
          let dialog = getDialog();
          let items = dialog.pack.isShow ? dialog.pack.items : dialog.pack2.items;
          if (!items) return;
          let result = [];
          for (let item of items) {
            for (let name of names) {
              if (item.name.indexOf(name) > -1) {
                result.push(item.id);
                break;
              }
            }
          }
          return result;
        },
        goods: function (...names) {
          let goods = getDialog().list.selllist;
          if (!goods) return;
          let result = [];
          for (let item of goods) {
            for (let name of names) {
              if (item.name.indexOf(name) > -1) {
                result.push(item.id);
                break;
              }
            }
          }
          return result;
        },
        input: function () {
          const parameter = { btn_text: "确定", min: 0, max: 0 };
          for (let index = 0; index < arguments.length; index++) {
            let value = arguments[index];
            if (typeof value === "string") parameter.btn_text = value;
            else if (parameter.max > 0) parameter.min = value;
            else parameter.max = value;
          }
          const confirm = getConfirmation();
          parameter.content = confirm.get_countelement(
            parameter.min || 1,
            parameter.max || 9999,
          );
          return new PromiseConstructor((resolve, reject) => {
            parameter.onOK = resolve;
            parameter.onCancle = reject;
            confirm.Show(parameter);
          });
        },
        mat: function (index) {
          let matches = SCRIPT.lAST_MATCHES;
          if (!matches) return;
          return matches[index];
        },
        data: function (property) {
          if (!property || !SCRIPT.LAST_DATA) return;
          return SCRIPT.LAST_DATA[property];
        },
        master: function () {
          return getDialog().master.master;
        },
        dc: function () {
          const dialog = getDialog();
          if (dialog.master.isShow) return "dc " + dialog.master.master;
          return dialog.pack2.command_before;
        },
      },
      helper: {
        actions: [
          "#wait 100：等待100毫秒执行",
          "#msg 你好：输出提示消息",
          "#menu score，打开对话框",
          "#action (0-9)，执行动作栏对应位置的操作",
          "#pfm (0-9)，释放对应位置的绝招",
          "持续增加",
        ],
        vars: [
          "@dir(left)：获取当前房间左边方向的出口命令",
          "@npc(小二)：获取当前房间的npc ID，无参数返回所有npc",
          "@item：获取当前房间所有物品ID，参数匹配名称",
          "@id：当前正在操作的道具，技能，NPC等的ID",
          "持续增加",
        ],
        paras: [
          "参数用来判断所在位置的数据属性，比如地图的参数，有name,type,index",
          "name(扬州)：名称里包含扬州二字的地图",
          "index(>3)：索引大于3的地图",
        ],
      },
    };

    return SCRIPT;
  });
})(window);
