/** Native WebSocket wrapper and account API facade. */
(function registerNetworkApiModule(global) {
  "use strict";

  global.WSMudClient.registerModule("network-api", function create(context) {
    let socketIndex = 0;

    function WSClient(ip, port) {
      this.IP = ip;
      this.Port = port;
    }
    WSClient.prototype.Connect = function () {
      try {
        this.ws = new context.Socket("ws://" + this.IP + ":" + this.Port);
        this.ws.onopen = this.OnConnect;
        this.ws.onclose = this.OnClose.bind(this);
        this.ws.onerror = this.OnError;
        this.ws.onmessage = this.OnReceived.bind(this);
        this.index = socketIndex++;
      } catch (error) {
        if (this.OnError) this.OnError(error);
      }
    };
    WSClient.prototype.OnReceived = function (event) {
      if (!event || !event.data) return;
      const payload = event.data;
      if (payload[0] === "{" || payload[0] === "[") {
        const parse = new Function("return " + payload + ";");
        this.OnData(parse());
      } else this.OnMessage(payload);
    };
    WSClient.prototype.Send = function (command) {
      try {
        this.ws.send(command);
      } catch (error) {
        context.getReceiveMessage()(error);
      }
    };
    WSClient.prototype.Destroy = function () {
      this.ws.onclose = null;
      this.ws.close();
    };
    WSClient.prototype.Close = function () {
      this.ws.close();
    };
    WSClient.prototype.Connected = function () {
      return this.ws && this.ws.readyState === 1;
    };

    const UserAPI = {
      Login: function (code, password, callback) {
        return context.getUtil().Post(
          "api/user/login",
          { code, pwd: password },
          callback,
        );
      },
      IsRegistValidation: function (callback) {
        return context.getUtil().Get("UserAPI/IsRegistValidation", callback);
      },
      ValidationImage: function (callback) {
        return context.getUtil().Get("api/user/validimage", callback);
      },
      Regist: function (data, callback) {
        return context.getUtil().Post("api/user/regist", data, callback);
      },
      Enter: function (player, callback) {
        return context.getUtil().Get("e", [player], callback);
      },
      ChangePassword: function (oldPassword, password, no, callback) {
        return context.getUtil().Post(
          "api/user/changepassword",
          { oldpwd: oldPassword, pwd: password, no },
          callback,
        );
      },
      LoginOut: function (callback) {
        return context.getUtil().Get("UserAPI/LoginOut", callback);
      },
      GetRoles: function (user, callback) {
        return context.getUtil().Get("UserAPI/GetRoles", [user], callback);
      },
      AddRole: function (player, callback) {
        return context.getUtil().Post("UserAPI/AddRole", { player }, callback);
      },
      GetUser: function (callback) {
        return context.getUtil().Get("UserAPI/GetUser", callback);
      },
      Search: function (query, page, size, callback) {
        return context
          .getUtil()
          .Get("UserAPI/Search", [query, page, size], callback);
      },
      ResetPassword: function (user, callback) {
        return context.getUtil().Get("UserAPI/ResetPassword", [user], callback);
      },
      RecoverUser: function (user, callback) {
        return context.getUtil().Get("UserAPI/RecoverUser", [user], callback);
      },
      LoadPlayer: function (user, player, callback) {
        return context
          .getUtil()
          .Get("UserAPI/LoadPlayer", [user, player], callback);
      },
      GetPhone: function (callback) {
        return context.getUtil().Get("api/user/getphone", callback);
      },
      BindPhone: function (code, no, password, callback) {
        return context.getUtil().Post(
          "api/user/bindphone",
          { code, no, pwd: password },
          callback,
        );
      },
      SendValidateCode: function (phone, callback) {
        return context
          .getUtil()
          .Get("UserAPI/SendValidateCode", [phone], callback);
      },
      ResetPasswordByPhone: function (name, phone, code, password, callback) {
        return context.getUtil().Post(
          "api/user/resetpwd",
          { name, phone, vcode: code, pwd: password },
          callback,
        );
      },
      NewServer: function (callback) {
        return context.getUtil().Get("UserAPI/NewServer", callback);
      },
      GetServer: function (callback) {
        return context.getUtil().Get("api/game/servers", callback);
      },
    };

    return { WSClient, API: { UserAPI } };
  });
})(window);
