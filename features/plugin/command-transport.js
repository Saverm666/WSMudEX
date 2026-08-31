/** Command transport and command-script dispatch backed by explicit legacy accessors. */
(function registerCommandTransport(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "command-transport",
    function install(context) {
      const {
        WG,
        G,
        T,
        jquery,
        timers,
        messageAppend,
        legacy = {},
      } = context;
      if (
        !timers ||
        typeof timers.setTimeout !== "function" ||
        typeof jquery !== "function" ||
        typeof messageAppend !== "function" ||
        !T ||
        typeof legacy.isTransportAvailable !== "function" ||
        typeof legacy.getSendCommand !== "function" ||
        typeof legacy.setStopAuto !== "function"
      )
        throw new Error("command-transport 缺少显式运行上下文");
      const getCanUse = () => legacy.isTransportAvailable();
      const getSendCommand = () => legacy.getSendCommand();
      const setStopAuto = (value) => {
        if (typeof legacy.setStopAuto === "function") legacy.setStopAuto(value);
      };
      const getNpcs = () =>
        (typeof legacy.getNpcs === "function" && legacy.getNpcs()) || {};
      const getRoomData = () =>
        (typeof legacy.getRoomData === "function" && legacy.getRoomData()) ||
        [];
      const getPackGoods = () =>
        (typeof legacy.getPackGoods === "function" && legacy.getPackGoods()) ||
        {};

      async function Send(command) {
        if (typeof WG.observeDashboardCommand === "function")
          WG.observeDashboardCommand(command);
        if (getCanUse()) {
          const sendCommand = getSendCommand();
          if (typeof sendCommand !== "function")
            throw new Error("command-transport 无法取得 send_cmd");
          sendCommand(command, true);
        } else if (command) {
          for (const item of command instanceof Array
            ? command
            : command.split(";"))
            jquery("span[WG='WG']").attr("cmd", item).click();
        }
      }

      async function SendStep(command) {
        if (command)
          for (const item of command instanceof Array
            ? command
            : command.split(";")) {
            WG.SendCmd(item);
            await WG.sleep(12e3);
          }
      }

      async function SendCmd(command) {
        if (command) {
          if (command.indexOf(",") >= 0)
            command instanceof Array ||
              (command =
                command.indexOf(";") >= 0
                  ? command.split(";")
                  : command.split(","));
          else command = command instanceof Array ? command : command.split(";");
          let index = 0;
          let commands = "";
          for (let item of command) {
            if (item.indexOf("$") >= 0) {
              if (item[0] === "$") {
                item = item.replace("$", "");
                const name = item.split(" ")[0];
                const argument = item.split(" ")[1];
                commands = command.join(";");
                return void eval(
                  "T." +
                    name +
                    "(" +
                    index +
                    ",'" +
                    argument +
                    "','" +
                    commands +
                    "')",
                );
              }
              let parts = item.split(" ");
              parts = parts[parts.length - 1];
              if (!parts) return;
              if (parts[0] === "$") {
                parts = parts.replace("$", "");
                const pattern = new RegExp(/\".*?\"/);
                const result = pattern.exec(parts)[0];
                commands = command.join(";");
                return void eval(
                  "T." +
                    parts.split("(")[0] +
                    "(" +
                    index +
                    "," +
                    result +
                    ",'" +
                    commands +
                    "')",
                );
              }
              if (item.split(" ")[1].indexOf("$") >= 0) {
                parts = item.split(" ")[1].replace("$", "");
                const pattern = new RegExp(/\".*?\"/);
                const result = pattern.exec(parts)[0];
                commands = command.join(";");
                return void eval(
                  "T." +
                    parts.split("(")[0] +
                    "(" +
                    index +
                    "," +
                    result +
                    ",'" +
                    commands +
                    "')",
                );
              }
            }
            if (item.indexOf("%") >= 0) {
              const replacement = item.match("%([^%]+)%");
              if (getNpcs()[replacement[1]] != null) {
                const pattern = new RegExp("%([^%]+)%");
                item = item.replace(pattern, getNpcs()[replacement[1]]);
              } else
                for (const roomItem of getRoomData())
                  if (roomItem !== 0 && roomItem.name.indexOf(replacement[1]) >= 0) {
                    const pattern = new RegExp("%([^%]+)%");
                    item = item.replace(pattern, roomItem.id);
                    break;
                  }
            }
            let replacement;
            let pattern;
            if (item.indexOf("*") >= 0) {
              replacement = item.match("\\*([^%]+)\\*");
              if (getPackGoods()[replacement[1]] != null) {
                pattern = new RegExp("\\*([^%]+)\\*");
                item = item.replace(pattern, getPackGoods()[replacement[1]].id);
              }
            }
            WG.Send(item);
            index += 1;
          }
        }
      }

      function sleep(delay) {
        return new Promise((resolve) => timers.setTimeout(resolve, delay));
      }

      function stopAllAuto() {
        setStopAuto(true);
      }

      function reSetAllAuto() {
        setStopAuto(false);
      }

      function cmd_echo_button() {
        if (G.cmd_echo) {
          G.cmd_echo = false;
          messageAppend("<hio>命令代码关闭</hio>");
        } else {
          G.cmd_echo = true;
          const proConsole =
            typeof legacy.getProConsole === "function" &&
            legacy.getProConsole();
          if (proConsole && typeof proConsole.init === "function")
            proConsole.init();
          messageAppend("<hio>命令代码显示</hio>");
        }
      }

      Object.assign(WG, {
        Send,
        SendStep,
        SendCmd,
        sleep,
        stopAllAuto,
        reSetAllAuto,
        cmd_echo_button,
      });

      return {
        destroy() {
          for (const [name, implementation] of Object.entries({
            Send,
            SendStep,
            SendCmd,
            sleep,
            stopAllAuto,
            reSetAllAuto,
            cmd_echo_button,
          }))
            if (WG[name] === implementation) WG[name] = undefined;
        },
      };
    },
  );
})(window);
