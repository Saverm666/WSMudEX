/** WebSocket session setup, reconnect handling and login feedback. */
(function registerConnectionModule(global) {
  "use strict";

  global.WSMudClient.registerModule("connection", function create(context) {
    const { jquery } = context;
    const sessionKey = "u";
    const sessionToken = "p";
    let connecting = false;

    function showInputError(target, message) {
      jquery(target).focus().parent().find(".input-error").remove();
      jquery("<div class='input-error'>" + message + "</div>").insertAfter(
        target,
      );
    }

    function showLoader(message) {
      const children = jquery(".login-content").children();
      for (let index = 0; index < children.length; index += 1) {
        if (
          jquery(children[index]).css("display") !== "none" &&
          !jquery(children[index]).is(".signinfo")
        )
          jquery(children[index]).hide();
      }
      const loader = jquery("#loader").css("opacity", 1).show();
      loader.find("#loader_msg").html(message);
    }

    function connectServer(server, playerId) {
      if (connecting) return;
      context.setSelectedServer(server);
      console.log(
        "重新连接",
        context.getClient() == null ? "未连接" : "已连接",
      );
      context.closeServer();
      const client = context.createClient(server.ip, server.port);
      context.setClient(client);
      connecting = true;

      client.OnError = function (error) {
        connecting = false;
        if (!error) return;
        if (error.isTrusted) error = "服务器没有响应，请稍后重试";
        showLoader("<strong>连接失败：</strong>" + error);
      };
      client.OnConnect = function () {
        connecting = false;
        const process = context.getProcess();
        const credentials =
          context.getUserCookie(sessionKey) +
          " " +
          context.getUserCookie(sessionToken);
        if (!playerId && !process.player) {
          showLoader("正在获取角色列表...");
          context.sendCommand(credentials);
        } else if (playerId) {
          context.sendCommand(credentials + " " + playerId + " " + server.ID);
        } else context.sendCommand(credentials + " " + process.player);
      };
      client.OnClose = function () {
        connecting = false;
        if (this.ChangeServer) {
          this.ChangeServer = false;
          return;
        }
        if (this.Connected()) return;
        const process = context.getProcess();
        if (process.player) {
          process.clear();
          context.getReceiveMessage()("<red>你的连接中断了...</red>");
        } else {
          setTimeout(function () {
            context.hideAndShow(jquery("#slist_panel"));
          }, 3000);
        }
      };
      client.OnData = context.getReceiveData();
      client.OnMessage = context.getReceiveMessage();
      client.Connect();
    }

    return {
      connectServer,
      showInputError,
      showLoader,
      isConnecting: function () {
        return connecting;
      },
      destroy: function () {
        connecting = false;
      },
    };
  });
})(window);
