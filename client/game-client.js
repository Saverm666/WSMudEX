/**
 * WSMUD game client.
 *
 * The original string table and decoder wrappers were statically resolved.
 * Existing public API names are intentionally retained because feature scripts
 * call them directly at runtime.
 */
"use strict";

const clientViewStorage = unsafeWindow.WSMudClient.createModule(
  "view-storage",
  {
    jquery: $,
    hostWindow: window,
    storage: localStorage,
    logger: console,
  },
);
var HideAndShow = clientViewStorage.hideAndShow,
  initIos = clientViewStorage.initIos,
  showNews = clientViewStorage.showNews;
const storageUtil = clientViewStorage.storageUtil;

$(function () {
  $(".login-content").on("click", ".panel_item", LoginCommand);
  $(".container").on("click", ContainerCommand);
  $(".role-list").on("click", ".role-item", function () {
    $(this).parent().find(".select").removeClass("select");
    $(this).addClass("select");
  });
  $(".channel-box").on("click", "span", ChannelChanged);
  $(".combat-commands")
    .on("click", ".pfm-item", Combat.Perform)
    .on("wheel", Combat.Scroll);
  $(".room-commands").on("wheel", Combat.Scroll);
  $(".sender-box").on("keyup", OnSendBoxKeyDown);
  $(".room_items").on("click", ".room-item", Process.selectItem);
  $(".bottom-bar").on(
    "click",
    ".tool-item,.state-bar,.item-command",
    MenuClick,
  );
  $(".sender-btn").on("click", SendChatMessage);
  $(".room_exits")
    .on("pointerdown", Process.before_click_exits)
    .on("pointerup", Process.click_exits);
  $(".room-title>.map-icon")
    .attr({
      role: "button",
      tabindex: "0",
      "aria-haspopup": "dialog",
      "aria-expanded": "false",
      "aria-label": "打开地图",
    })
    .on("click", function () {
      MAP.LoadMap();
    })
    .on("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        MAP.LoadMap();
        event.preventDefault();
      }
    });
  $(".validnum-box>.validnum-btn").on("click", SendValidateCode);
  Process.init();
  CheckLogin();
});
var GameClient;
var SelectedServer;
var screenTop = 0;
function init_mobile(_0x366316, _0x3bbd71, _0x1dac31, _0x37a617) {
  let _0x2a59f1 = window.devicePixelRatio;
  _0x366316 = Math.floor(_0x366316 / _0x2a59f1);
  _0x3bbd71 = Math.floor(_0x3bbd71 / _0x2a59f1);
  screenTop = _0x366316;
  let _0x148a40 = document.body.clientHeight - _0x366316 - _0x3bbd71;
  $(".login-content")
    .height(_0x148a40 + "px")
    .css("marginTop", _0x366316 + "px");
  $(".container")
    .height(_0x148a40 + "px")
    .css("marginTop", _0x366316 + "px");
}
function CheckLogin() {
  var _0x1d5ed0 = GetUserCookie("p");
  if (!_0x1d5ed0) {
    return $("#login_panel").show();
  }
  ShowServers();
}
function is_weixin() {
  var _0x2e40d8 = navigator.userAgent.toLowerCase();
  if (_0x2e40d8.match(/MicroMessenger/i) == "micromessenger") {
    return true;
  } else {
    return false;
  }
}
function LoginCommand(_0x5492b3) {
  var _0x134f8a = $(this).attr("command");
  switch (_0x134f8a) {
    case "ToRolePanel":
      HideAndShow($("#role_panel"));
      break;
    case "ToServerPanel":
      CloseServer();
      HideAndShow($("#slist_panel"));
      break;
    case "ToLogin":
      HideAndShow($("#login_panel"));
      break;
    case "Forget":
      HideAndShow($("#reset_panel"));
      break;
    case "CancleRegist":
      HideAndShow($("#login_panel"));
      break;
    case "Down":
      HideAndShow($("#download"));
      break;
    default:
      LoginMethods[_0x134f8a]();
      break;
  }
}
var LoginMethods = {
  initReg: false,
  isRegistValidation: false,
  ToRegist: function () {
    HideAndShow($("#regist_panel"));
    if (!LoginMethods.initReg) {
      LoginMethods.GetValidationImage();
      $(".validnum-box>.validnum-img").on(
        "click",
        LoginMethods.GetValidationImage,
      );
      LoginMethods.initReg = true;
    }
  },
  GetValidationImage: function () {
    API.UserAPI.ValidationImage(function (_0x566030) {
      $(".validnum-box>.validnum-img").attr(
        "src",
        "data:image/svg+xml;base64," + _0x566030,
      );
    });
  },
  ToUpdate: function () {
    HideAndShow("#pwd_panel");
    API.UserAPI.GetPhone(function (_0x18eea8) {
      if (_0x18eea8.code !== 1) {
        return ShowInputError("#update_pwd1", "获取绑定的手机号失败");
      }
      if (_0x18eea8.result) {
        $("#pwd_phone").prop("disabled", true).val(_0x18eea8.result);
        $("#pwd_bind").show();
      } else {
        $("#pwd_phone").prop("disabled", false).val("");
        $("#pwd_bind").hide();
      }
    });
  },
  ResetPwd: function () {
    var _0x2d16dd = $("#reset_name").val();
    if (!_0x2d16dd) {
      return ShowInputError("#reset_name", "请输入用户名");
    }
    if (!/^[a-z0-9]{5,15}$/.test(_0x2d16dd)) {
      return ShowInputError(
        "#reset_name",
        "用户名格式错误,需要5-15位字母开头的字母，数字或下划线，不区分大小写",
      );
    }
    var _0x50c6fb = $("#reset_phone").val();
    if (!_0x50c6fb) {
      return ShowInputError("#reset_phone", "请输入你的帐号绑定的手机号码");
    }
    if (!/^1\d{10}$/.test(_0x50c6fb)) {
      return ShowInputError("#reset_phone", "手机号码格式错误");
    }
    var _0x3b8c16 = "";
    var _0x2d98c6 = $("#reset_pwd1").val();
    if (!_0x2d98c6) {
      return ShowInputError("#reset_pwd1", "请输入你的新密码");
    }
    var _0x40337c = $("#reset_pwd2").val();
    if (!_0x40337c) {
      return ShowInputError("#reset_pwd2", "请重复输入你的新密码");
    }
    if (_0x40337c.length < 6 || _0x40337c.length > 20) {
      return ShowInputError("#update_pwd2", "密码长度在6到20之间");
    }
    if (_0x40337c != _0x2d98c6) {
      return ShowInputError("#reset_pwd2", "两次密码输入不一致");
    }
    ShowLoader("正在修改密码", "#reset_panel");
    API.UserAPI.ResetPasswordByPhone(
      _0x2d16dd,
      _0x50c6fb,
      _0x3b8c16,
      _0x2d98c6,
      function (_0x4a7e5c) {
        if (_0x4a7e5c.code) {
          HideAndShow("#login_panel");
        } else {
          ShowInputError("#reset_pwd2", _0x4a7e5c.result ?? "重置失败");
          HideAndShow("#reset_panel");
        }
      },
    );
  },
  BindPhone: function () {
    HideAndShow("#bind_panel");
    API.UserAPI.GetPhone(function (_0x1d66e2) {
      $("#phone_valid").val("");
      $("#phone_pwd").val("");
      if (_0x1d66e2.code !== 1) {
        return $(".input-error").html(_0x1d66e2.result);
      }
      $(".input-error").remove();
      let _0x5d1db1 = _0x1d66e2.result;
      if (_0x5d1db1) {
        $("#phone_no").prop("disabled", true).val(_0x5d1db1);
        $("#phone_valid").parent().show().prev().show();
        $("#phone_no").prev().html("你已绑定手机，再次验证会取消绑定");
        $("#phone_no").parent().next().find("span:last()").html("解除绑定");
      } else {
        $("#phone_no").prop("disabled", false).val("");
        $("#phone_no")
          .prev()
          .html("你要绑定的手机(不验证，目前仅作为二级密码验证使用)");
        $("#phone_valid").parent().hide().prev().hide();
        $("#phone_no").parent().next().find("span:last()").html("绑定");
      }
    });
  },
  CheckValid: function () {
    var _0x31bcb7 = $("#phone_no");
    var _0x56cf22 = "";
    var _0x37abb3 = "";
    if (!_0x31bcb7.is(":disabled")) {
      _0x56cf22 = _0x31bcb7.val();
      if (!_0x56cf22) {
        return ShowInputError("#phone_no", "请输入你的帐号绑定的手机号码");
      }
      if (!/^1\d{10}$/.test(_0x56cf22)) {
        return ShowInputError("#phone_no", "手机号码格式错误");
      }
    } else {
      _0x37abb3 = $("#phone_valid").val();
      if (!_0x37abb3) {
        return ShowInputError(
          $("#phone_valid").parent(),
          "请输入你接收到的六位验证码",
        );
      }
      if (!/^\d{4}$/.test(_0x37abb3)) {
        return ShowInputError(
          $("#phone_valid").parent(),
          "请输入六位数字的验证码",
        );
      }
    }
    var _0x358032 = $("#phone_pwd").val();
    if (!_0x358032) {
      return ShowInputError("#phone_pwd", "请重复输入你的新密码");
    }
    if (_0x358032.length < 6 || _0x358032.length > 20) {
      return ShowInputError("#phone_pwd", "密码长度在6到20之间");
    }
    API.UserAPI.BindPhone(
      _0x37abb3,
      _0x56cf22,
      _0x358032,
      function (_0x532492) {
        if (_0x532492.code < 1) {
          ShowInputError(
            $("#phone_valid").parent(),
            _0x532492.result ?? "绑定失败",
          );
          HideAndShow("#bind_panel");
        } else {
          HideAndShow("#role_panel");
        }
      },
    );
  },
  ReLogin: function () {
    HideAndShow($("#login_panel"));
    var _0xc426ab = new Date();
    _0xc426ab.setTime(-1000);
    var _0x2bcdac = document.cookie;
    var _0x38c3dc = _0x2bcdac.split("; ");
    for (var _0x351515 = 0; _0x351515 < _0x38c3dc.length; _0x351515++) {
      var _0x51816e = _0x38c3dc[_0x351515].split("=");
      document.cookie =
        _0x51816e[0] + "=''; expires=" + _0xc426ab.toGMTString();
    }
  },
  UpdatePwd: function () {
    $("#pwd_panel").find(".input-error").remove();
    var _0xf02479 = $("#update_pwd1").val();
    var _0x1e9879 = $("#update_pwd2").val();
    var _0x33fc97 = $("#update_pwd3").val();
    if (_0xf02479.length < 6 || _0xf02479.length > 20) {
      return ShowInputError("#update_pwd1", "密码长度在6到20之间");
    }
    if (_0x1e9879.length < 6 || _0x1e9879.length > 20) {
      return ShowInputError("#update_pwd2", "密码长度在6到20之间");
    }
    if (_0x33fc97 != _0x1e9879) {
      return ShowInputError("#update_pwd3", "两次密码输入不一致");
    }
    var _0x57d3c0;
    if ($("#pwd_bind").is(":visible")) {
      _0x57d3c0 = $("#pwd_no").val();
      if (!_0x57d3c0) {
        return ShowInputError($("#pwd_no").parent(), "请输入你绑定的手机尾号");
      }
      if (!/^\d{4}$/.test(_0x57d3c0)) {
        return ShowInputError($("#pwd_no").parent(), "请输入你绑定的手机尾号");
      }
    }
    ShowLoader("正在修改密码", "#pwd_panel");
    API.UserAPI.ChangePassword(
      _0xf02479,
      _0x1e9879,
      _0x57d3c0,
      function (_0x3260c8) {
        if (_0x3260c8.code) {
          HideAndShow($("#slist_panel"));
        } else {
          ShowInputError("#update_pwd1", _0x3260c8.result || "修改失败");
          HideAndShow("#pwd_panel");
        }
      },
    );
  },
  LoginIn: function () {
    var _0x543343 = $("#login_name").val().toLowerCase();
    var _0x1c0ad6 = $("#login_pwd").val();
    if (!_0x543343) {
      return ShowInputError("#login_name", "请输入用户名");
    }
    if (!/^[a-z0-9]{5,15}$/.test(_0x543343)) {
      return ShowInputError(
        "#login_name",
        "用户名格式错误,需要5-15位字母开头的字母，数字或下划线，不区分大小写",
      );
    }
    if (!_0x1c0ad6) {
      return ShowInputError("#login_pwd", "请输入密码");
    }
    if (_0x1c0ad6.length < 6 || _0x1c0ad6.length > 20) {
      return ShowInputError("#login_pwd", "密码长度在6到20之间");
    }
    ShowLoader("正在登录", "#login_panel");
    API.UserAPI.Login(_0x543343, _0x1c0ad6, function (_0x37a151) {
      if (_0x37a151.code) {
        ShowServers();
      } else {
        ShowInputError("#login_name", _0x37a151.result || "登陆失败");
        HideAndShow("#login_panel");
      }
    });
  },
  SelectServer: function () {
    if (!SERVERS) {
      return;
    }
    var _0x13e30b = parseInt($(".server-list>.select").attr("index"));
    if (!(_0x13e30b >= 0) || !(_0x13e30b < SERVERS.length)) {
      return Confirm.Show({
        content: "你没有选择要连接的服务器。",
      });
    }
    var _0x10b1cc = SERVERS[_0x13e30b];
    if (!_0x10b1cc) {
      Confirm.Show({
        content: "你没有选择要连接的服务器。",
      });
    }
    ShowLoader("正在连接服务器");
    ConnectServer(_0x10b1cc);
    SetCookie("s", _0x13e30b);
  },
  SelectRole: function () {
    var _0x3490e6 = $(".role-list>.select");
    if (!_0x3490e6.length) {
      return;
    }
    var _0x25bb9e = _0x3490e6.attr("roleid");
    SendCommand("login " + _0x25bb9e);
    ShowLoader("正在进入游戏", "#role_panel");
  },
  CreateRole: function () {
    var _0x59f49e = {};
    _0x59f49e.name = $("#reg_name").val();
    _0x59f49e.gender = $("#gender_0").is(":checked") ? 1 : 2;
    _0x59f49e.str = parseInt($("#reg_str").val());
    _0x59f49e.con = parseInt($("#reg_con").val());
    _0x59f49e.dex = parseInt($("#reg_dex").val());
    _0x59f49e.int = parseInt($("#reg_int").val());
    if (!/^[\u4E00-\u9FA5]{2,5}$/.test(_0x59f49e.name)) {
      return ShowInputError("#reg_name", "名称格式错误，只能使用2-5位中文字符");
    }
    if (_0x59f49e.str < 15 || _0x59f49e.str > 30) {
      return ShowInputError("#reg_name", "臂力需要在15-30之间");
    }
    if (_0x59f49e.con < 15 || _0x59f49e.con > 30) {
      return ShowInputError("#reg_name", "根骨需要在15-30之间");
    }
    if (_0x59f49e.dex < 15 || _0x59f49e.dex > 30) {
      return ShowInputError("#reg_name", "身法需要在15-30之间");
    }
    if (_0x59f49e.int < 15 || _0x59f49e.int > 30) {
      return ShowInputError("#reg_name", "悟性需要在15-30之间");
    }
    if (_0x59f49e.str + _0x59f49e.con + _0x59f49e.dex + _0x59f49e.int != 80) {
      return ShowInputError(
        "#reg_name",
        "先天属性需要在15-30之间，并且总和等于80",
      );
    }
    ShowLoader("正在创建角色", "#addrole_panel");
    SendCommand(
      "createrole " +
        _0x59f49e.name +
        " " +
        _0x59f49e.gender +
        " " +
        _0x59f49e.str +
        " " +
        _0x59f49e.con +
        " " +
        _0x59f49e.dex +
        " " +
        _0x59f49e.int,
    );
  },
  AddRole: function () {
    var _0x56e10e = $(".role-list>.role-item").length;
    if (_0x56e10e > 4) {
      return Confirm.Show({
        content: "你只能最多创建五个角色",
      });
    }
    HideAndShow($("#addrole_panel"));
    RefreshInput("name");
    RefreshInput("prop");
    RefreshInput("id");
  },
  DeleteRole: function () {
    var _0x3d4940 = $(".role-list>.select");
    if (!_0x3d4940.length) {
      return;
    }
    var _0x34fdfa = _0x3d4940.attr("roleid");
    if (!_0x34fdfa) {
      return;
    }
    Confirm.Show({
      content: "是否确认删除角色：" + _0x3d4940.html(),
      onOK: function () {
        SendCommand("deleterole " + _0x34fdfa);
      },
    });
  },
  Regist: function () {
    var _0x4701fd = $("#regist_name").val().toLowerCase();
    var _0x474185 = $("#regist_pwd1").val();
    if (!_0x4701fd) {
      return ShowInputError("#regist_name", "请输入用户名");
    }
    if (!/^[a-z0-9]{5,15}$/.test(_0x4701fd)) {
      return ShowInputError("#regist_name", "用户名需要是5-10个英文字符");
    }
    if (!_0x474185) {
      return ShowInputError("#regist_pwd1", "请输入密码");
    }
    if (_0x474185.length < 6 || _0x474185.length > 20) {
      return ShowInputError("#regist_pwd1", "密码长度在6到20之间");
    }
    if (_0x474185 != $("#regist_pwd2").val()) {
      return ShowInputError("#regist_pwd2", "重复密码输入不一致，请重新输入");
    }
    var _0xacbbb6 = $("#regist_val").val();
    if (!_0xacbbb6) {
      return ShowInputError("#regist_valpanel", "请输入图片中的验证码");
    }
    if (_0xacbbb6.length != 4) {
      return ShowInputError("#regist_valpanel", "请输入图片中的四位验证码");
    }
    API.UserAPI.Regist(
      {
        name: _0x4701fd,
        pwd: _0x474185,
        valno: _0xacbbb6,
      },
      function (_0x56a84f) {
        if (_0x56a84f.code == 1) {
          ShowServers();
        } else {
          ShowInputError("#regist_name", _0x56a84f.result || "注册失败");
          HideAndShow("#regist_panel");
        }
      },
    );
  },
};
function SendValidateCode() {
  var _0x17f4de = $(this);
  if (_0x17f4de.is(":disabled")) {
    return;
  }
  var _0x49e003 = _0x17f4de.parent().prev().prev();
  var _0x2f14e2 = _0x49e003.val();
  if (!_0x49e003.is(":disabled")) {
    if (!_0x2f14e2) {
      return ShowInputError(_0x49e003, "请输入你的帐号绑定的手机号码");
    }
    if (!/^1\d{10}$/.test(_0x2f14e2)) {
      return ShowInputError(_0x49e003, "手机号码格式错误");
    }
  } else {
    _0x2f14e2 = "";
  }
  API.UserAPI.SendValidateCode(_0x2f14e2, function (_0x32d98a) {
    if (!_0x32d98a) {
      ShowInputError(_0x17f4de.parent(), "验证码发送失败");
    }
  });
  _0x17f4de.prop("disabled", true);
  _0x17f4de.html("120秒后重新发送");
  SetButtonText(0, _0x17f4de);
}
function SetButtonText(_0x398247, _0x15d1fb) {
  if (_0x398247 == 120) {
    _0x15d1fb.prop("disabled", false);
    _0x15d1fb.html("发送验证码");
  } else {
    _0x15d1fb.html(120 - _0x398247 + "秒后重新发送");
    _0x398247++;
    window.setTimeout(SetButtonText.bind(this, _0x398247, _0x15d1fb), 1000);
  }
}
function SetCookie(_0x216cfc, _0x37f82d) {
  var _0x2a51ef = new Date();
  _0x2a51ef.setTime(_0x2a51ef.getTime() + 25920000000);
  var _0x110ae9 = "expires=" + _0x2a51ef.toUTCString();
  document.cookie =
    _0x216cfc + "=" + _0x37f82d + "; expires=" + _0x2a51ef.toGMTString();
}
var SERVERS;
function ShowServers() {
  if (!SERVERS) {
    ShowLoader("正在获取服务器列表");
    API.UserAPI.GetServer(function (_0x53808f) {
      if (!_0x53808f || typeof _0x53808f == "string") {
        ShowInputError("#login_pwd", "获取服务器列表出错");
        return;
      }
      SERVERS = _0x53808f;
      DisplayServer(_0x53808f);
      ShowServers();
    });
    return;
  }
  var _0x5ab6a1 = SERVERS;
  if (!_0x5ab6a1 || !_0x5ab6a1.length) {
    HideAndShow("#login_panel");
    ShowInputError("#login_pwd", "获取服务器列表出错");
  } else {
    var _0x334b29 = GetUserCookie("s");
    var _0xd8d39c = _0x334b29
      ? SERVERS[_0x334b29]
      : _0x5ab6a1.length == 1
        ? SERVERS[0]
        : null;
    if (_0xd8d39c) {
      ShowLoader("正在连接服务器");
      return ConnectServer(_0xd8d39c);
    }
    HideAndShow("#slist_panel");
  }
}
function DisplayServer() {
  if (!SERVERS) {
    return;
  }
  var _0x5f59b5 =
    location.hostname.startsWith("127.0.0.1") ||
    location.hostname.startsWith("localhost");
  var _0xae028e = location.search.startsWith("?test");
  if (_0x5f59b5) {
    SERVERS.push({
      id: 100,
      name: "本地测试1",
      ip: "127.0.0.1",
      port: 31200,
    });
    SERVERS.push({
      id: 101,
      name: "本地测试2",
      ip: "127.0.0.1",
      port: 31201,
    });
  }
  var _0x251479 = [];
  var _0x49d5b2 = "武神传说2";
  for (var _0x8499e = 0; _0x8499e < SERVERS.length; _0x8499e++) {
    if (!_0xae028e && !_0x5f59b5 && SERVERS[_0x8499e].istest) {
      continue;
    }
    _0x251479.push("<li class='role-item");
    if (_0x8499e == 0) {
      _0x251479.push(" select");
    }
    _0x251479.push("' index='" + _0x8499e + "'>");
    _0x251479.push(_0x49d5b2);
    _0x251479.push("&nbsp;&nbsp;");
    _0x251479.push(SERVERS[_0x8499e].name);
    if (SERVERS[_0x8499e].isdef) {
      _0x251479.push(
        "<span style='color:red;font-size:0.5rem;line-height:2rem;height:2rem;'>&nbsp;（推荐）</span>",
      );
    }
    _0x251479.push("</li>");
  }
  $(".server-list")
    .html(_0x251479.join(""))
    .on("click", "li", function () {
      var _0x5437a9 = $(this);
      if (_0x5437a9.is(".select")) {
        return;
      }
      _0x5437a9.parent().find(".select").removeClass("select");
      _0x5437a9.addClass("select");
    });
}
function GetUserCookie(_0x60e958) {
  var _0xd736b9;
  var _0x3cbc76 = new RegExp("(^| )" + _0x60e958 + "=([^;]*)(;|$)");
  if ((_0xd736b9 = document.cookie.match(_0x3cbc76))) {
    return unescape(_0xd736b9[2]);
  } else {
    return null;
  }
}
function ContainerCommand(_0x4df99f) {
  var _0x3c348a = $(_0x4df99f.target);
  var _0x21830e = _0x3c348a.attr("cmd");
  if (!_0x21830e) {
    _0x21830e = _0x3c348a.parent().attr("cmd");
  }
  if (_0x21830e) {
    var actionBarItem = _0x3c348a.closest(".room-commands > .act-item");
    if (
      !_0x4df99f.WGLoadoutBypass &&
      actionBarItem.length &&
      typeof window.WGRunActionBarCommandWithLoadout === "function" &&
      window.WGRunActionBarCommandWithLoadout(_0x21830e, function () {
        ContainerCommand({
          target: actionBarItem[0],
          WGLoadoutBypass: true,
        });
      })
    )
      return false;
    var isItemPopupCommand =
        _0x3c348a.closest(".WG_item_popup").length > 0,
      isSidePanelMenuCommand = /^#menu\s+showchat(?:\s|$)/.test(_0x21830e),
      isFloatingDialogCommand =
        _0x3c348a.closest(".dialog.WG_floating_dialog").length > 0;
    var isDetailCommand =
      IsWGPluginFeatureEnabled("characterPopup") &&
      Process.isPopupDetailCommand(_0x21830e);
    if (!isDetailCommand && Process.cancelPendingDetailPopups)
      Process.cancelPendingDetailPopups();
    isFloatingDialogCommand &&
      !isSidePanelMenuCommand &&
      Dialog.prepareLayerRequest(_0x21830e, _0x3c348a);
    let _0x48edcc = _0x21830e[0];
    if (_0x48edcc == "_") {
      var _0x5b1469 = _0x21830e.split(" ");
      switch (_0x5b1469[0]) {
        case "_confirm":
          Confirm.Process(_0x5b1469);
          isItemPopupCommand &&
            Process.activateItemPopupSecondary(
              $(".dialog-confirm"),
              _0x3c348a.closest("[cmd]")[0],
            );
          break;
        case "_setting":
          Setting.save(_0x5b1469[1], _0x5b1469[2]);
          break;
        case "_trade":
          Dialog.trade.confirm(_0x5b1469[1]);
          break;
        case "_close":
          Warn.Close(_0x3c348a);
          break;
        case "_hide":
          Storage.ban_user(_0x5b1469[1]);
          break;
        case "_skillcalc":
          Dialog.skillcalc.open(_0x5b1469[1], _0x5b1469[2]);
          break;
        case "_closed":
          Dialog.hide();
        case "_party":
          Dialog.party.command(_0x5b1469[1]);
          break;
      }
    } else if (_0x48edcc === "#") {
      var menuLayerMatch = _0x21830e.match(/^#menu\s+(\S+)/);
      if (isSidePanelMenuCommand) {
        Dialog.clearLayerRequests();
      } else if (menuLayerMatch && Dialog.isShow) {
        var menuLayerRequest = Dialog.consumeLayerRequest();
        menuLayerRequest &&
          menuLayerRequest.sourceItem == Dialog.curItem &&
          menuLayerMatch[1] != Dialog.curItem &&
          Dialog.pushLayer(menuLayerMatch[1], menuLayerRequest);
      }
      SCRIPT.run(_0x21830e);
    } else {
      var keepItemPopupOpen =
        IsWGPluginFeatureEnabled("characterPopup") &&
        Process.prepareCharacterTextView(_0x21830e, _0x3c348a);
      if (
        !keepItemPopupOpen &&
        IsWGPluginFeatureEnabled("characterPopup") &&
        Process.isPopupDetailCommand(_0x21830e)
      ) {
        keepItemPopupOpen = true;
        Process.prepareDetailPopup(_0x21830e, _0x3c348a);
      }
      if (!keepItemPopupOpen && Process.cancelPendingDetailPopups)
        Process.cancelPendingDetailPopups();
      isItemPopupCommand &&
        !keepItemPopupOpen &&
        Process.prepareItemPopupSecondary(_0x21830e, _0x3c348a);
      SendCommand(_0x21830e);
      if (
        !_0x3c348a.closest(".dialog-fb").length &&
        _0x3c348a.closest(".dialog-content").length > 0
      ) {
        _0x3c348a.closest(".item-commands").remove();
      }
    }
    return false;
  } else {
    if (Process.cancelPendingDetailPopups) Process.cancelPendingDetailPopups();
    if (
      isShowChat &&
      !(
        window.WGIsSideChatPanelOpen && window.WGIsSideChatPanelOpen()
      )
    ) {
      if (!_0x3c348a.closest(".chat-panel").length) {
        $(".chat-panel").addClass("hide");
        isShowChat = false;
      }
    }
    Confirm.Close();
  }
}
function IsTopWGPopupLayer(element) {
  var target = $(element).first();
  if (!target.length || !target.is(":visible")) return false;
  var candidates = $(
      ".WG_plugin_settings:not([hidden]), " +
        ".WG_auto_first_round:not([hidden]), " +
        ".WG_equipment_picker:not([hidden]), " +
        ".WG_map_modal:not([hidden]), " +
        ".WG_item_popup:visible, " +
        ".dialog-confirm:visible, " +
        ".dialog.WG_floating_dialog:visible",
    ),
    topElement = null,
    topZIndex = -Infinity,
    topDepth = -Infinity;
  candidates.each(function () {
    var candidate = $(this);
    if (!candidate.is(":visible")) return;
    var zIndex = Number.parseInt(candidate.css("z-index"), 10),
      depth = Number(
        candidate.attr("data-popup-depth") ||
          candidate.attr("data-dialog-depth") ||
          0,
      );
    if (!Number.isFinite(zIndex)) zIndex = 0;
    if (
      zIndex > topZIndex ||
      (zIndex === topZIndex && depth >= topDepth)
    ) {
      topElement = this;
      topZIndex = zIndex;
      topDepth = depth;
    }
  });
  return topElement === target[0];
}
var LastCommand;
function IsWGPluginFeatureEnabled(feature) {
  try {
    var flags = JSON.parse(
      window.localStorage.getItem("WG_plugin_feature_flags_v1") || "{}",
    );
    return flags[feature] !== false;
  } catch (error) {
    return true;
  }
}
function SendCommand(_0x557412) {
  if (ClientConnection.isConnecting()) {
    return;
  }
  if (!GameClient || !GameClient.Connected()) {
    LastCommand = _0x557412;
    ReceiveMessage("<red>连接中断，正在重新连线...</red>");
    ConnectServer(SelectedServer);
    return;
  }
  if (
    IsWGPluginFeatureEnabled("characterPopup") &&
    Process.cancelPendingDetailPopups &&
    Process.isPopupDetailCommand &&
    !Process.isPopupDetailCommand(
      String(_0x557412 || "")
        .trim()
        .split(/[;\n]/)[0],
    )
  )
    Process.cancelPendingDetailPopups();
  window.WG &&
    typeof window.WG.observeDashboardCommand == "function" &&
    window.WG.observeDashboardCommand(_0x557412);
  Dialog.extend.record(_0x557412);
  Setting.observeAutoWorkCommand(_0x557412);
  GameClient.Send(_0x557412);
}
function ChannelChanged() {
  var _0xb39189 = $(this);
  var _0x7258fb = _0xb39189.attr("channel");
  if (_0x7258fb == "emote") {
    return ShowEmotePanel();
  }
  if (_0xb39189.is(".selected")) {
    return;
  }
  var _0x26712f = _0xb39189.parent();
  _0x26712f.children().removeClass("selected");
  _0xb39189.addClass("selected");
  _0x26712f.attr("channel", _0x7258fb);
  $(".sender-box").focus();
  return false;
}
function ShowEmotePanel() {
  var _0x47ee1b = $(".channel-emotes");
  if (_0x47ee1b.is(".hide")) {
    _0x47ee1b.removeClass("hide");
    if (!Process.emtoes) {
      SendCommand("emote");
      Process.emtoes = [];
      $(".sender-box").blur();
      _0x47ee1b.on("click", "span", function () {
        var _0x4d0aaa = $(this).html();
        $(".sender-box")
          .val("*" + _0x4d0aaa)
          .focus();
        $(".channel-emotes").addClass("hide");
      });
    }
  } else {
    $(".channel-emotes").addClass("hide");
  }
}
function MenuClick(_0x30ac21) {
  var _0x2d4317 = $(this).attr("command");
  if (!_0x2d4317) {
    _0x2d4317 = $(this).attr("cmd");
    if (_0x2d4317) {
      SendCommand(_0x2d4317);
    }
    return false;
  }
  return HandlerMenuCommand(
    _0x2d4317,
    !!(
      _0x30ac21 &&
      _0x30ac21.originalEvent &&
      _0x30ac21.originalEvent.isTrusted
    ),
  );
}
function HandlerMenuCommand(_0x5aedbd, _0x33659e) {
  switch (_0x5aedbd) {
    case "showtool":
      ToolAction.ShowTools();
      break;
    case "showchat":
      return ShowChat();
    case "showcombat":
      return Combat.Show();
    case "pluginsettings":
      return (
        window.WGOpenPluginSettings && window.WGOpenPluginSettings()
      );
    case "stopstate":
      if (Dialog.extend.is_record) {
        return Dialog.extend.stop_record();
      }
      SendCommand("state stop");
      break;
    case "stateinfo":
      SendCommand("state info");
      break;
    default:
      if (_0x5aedbd == "skills" && !_0x33659e) {
        return false;
      }
      Dialog.isShow &&
        Dialog.layerStack &&
        Dialog.layerStack.length &&
        Dialog.clearLayerStack();
      Dialog.show(_0x5aedbd);
      break;
  }
  return false;
}
var isShowChat = false;
function ShowChat() {
  if (
    !window.WGOpenSideChatPanel &&
    window.WG &&
    typeof window.WG.initSideChatPanel == "function"
  )
    window.WG.initSideChatPanel();
  if (window.WGToggleSideChatPanel) {
    window.WGToggleSideChatPanel();
    isShowChat = Boolean(
      window.WGIsSideChatPanelOpen && window.WGIsSideChatPanelOpen(),
    );
    return false;
  }
  return false;
}
var ToolAction = unsafeWindow.WSMudClient.createModule("tool-action", {
  jquery: $,
});
function CloseServer() {
  if (GameClient && GameClient.Connected()) {
    GameClient.Destroy();
  }
  GameClient = null;
}
const ClientConnection = unsafeWindow.WSMudClient.createModule("connection", {
  jquery: $,
  getClient: function () {
    return GameClient;
  },
  setClient: function (client) {
    GameClient = client;
  },
  setSelectedServer: function (server) {
    SelectedServer = server;
  },
  closeServer: CloseServer,
  createClient: function (ip, port) {
    return new WSClient(ip, port);
  },
  getUserCookie: GetUserCookie,
  sendCommand: SendCommand,
  getProcess: function () {
    return Process;
  },
  getReceiveData: function () {
    return ReceiveData;
  },
  getReceiveMessage: function () {
    return ReceiveMessage;
  },
  hideAndShow: HideAndShow,
});
var ConnectServer = ClientConnection.connectServer,
  ShowInputError = ClientConnection.showInputError,
  ShowLoader = ClientConnection.showLoader;
const ClientMessaging = unsafeWindow.WSMudClient.createModule("message-queue", {
  jquery: $,
  isMobile: function () {
    return Util.isMobile;
  },
  hostWindow: window,
  getDialog: function () {
    return Dialog;
  },
  getProcess: function () {
    return Process;
  },
  sendCommand: function (command) {
    return SendCommand(command);
  },
  createName: function (gender) {
    return create_name(gender);
  },
  createId: function () {
    return create_id();
  },
  createProp: function () {
    return create_prop();
  },
});
const MessageQueue = ClientMessaging.MessageQueue;
const DetailPopupPolicy = unsafeWindow.WSMudClient.createModule(
  "detail-popup-policy",
);
function ReceiveMessage(message) {
  return ClientMessaging.ReceiveMessage(message);
}
function ReceiveData(data) {
  return ClientMessaging.ReceiveData(data);
}
function OnSendBoxKeyDown(event) {
  return ClientMessaging.OnSendBoxKeyDown(event);
}
function SendChatMessage() {
  return ClientMessaging.SendChatMessage();
}
function RefreshInput(type) {
  return ClientMessaging.RefreshInput(type);
}
var Process = {
  itemsElement: null,
  contentScroll: true,
  message: null,
  channel: null,
  clear: function () {
    Dialog.pack.items = null;
    Dialog.skills.items = null;
    if (this.resetRoomRendererSession) this.resetRoomRendererSession();
    this.state(null);
  },
  init: function () {
    Process.itemsElement = $(".room_items");
    this.message = MessageQueue.create($(".content-message"));
    this.ChannelElement = $(".channel");
    this.ChannelElement.on("click", Dialog.channel.show.bind(Dialog.channel));
    this.channel = MessageQueue.create(this.ChannelElement, 4, 200);
    if (
      typeof WG != "undefined" &&
      typeof WG.isSideChatPanelOpen == "function" &&
      WG.isSideChatPanelOpen() &&
      typeof WG.setSideChatPanelOpen == "function"
    ) {
      WG.setSideChatPanelOpen(true);
    }
  },
  startMoveMessage: function (_0x1608c8) {
    window.addEventListener("mousemove", Process.moveMessage);
    window.addEventListener("mouseup", Process.endMoveMessage);
    Process.mouseY = _0x1608c8.clientY;
  },
  moveMessage: function (_0x2a720e) {
    let _0xd833a7 = Process.mouseY - _0x2a720e.clientY;
    let _0x119cdc = MessageContent[0];
    let _0x242058 = MessageContent.height();
    let _0x2685d9 = _0x119cdc.style.marginBottom;
    if (_0x2685d9) {
      _0x2685d9 = parseInt(_0x2685d9.replace("px", ""));
    } else {
      _0x2685d9 = 0;
    }
    _0x2685d9 = _0x2685d9 + _0xd833a7;
    if (_0x2685d9 < 0) {
      _0x2685d9 = 0;
    } else if (_0x2685d9 > _0x242058 * 0.7) {
      return;
    }
    _0x119cdc.style.marginBottom = _0x2685d9 + "px";
    Process.mouseY = _0x2a720e.clientY;
    _0x2a720e.preventDefault();
  },
  endMoveMessage: function () {
    window.removeEventListener("mousemove", Process.moveMessage);
    window.removeEventListener("mouseup", Process.endMoveMessage);
  },
  regist: function (_0x32e92b) {
    if (_0x32e92b.result) {
      HideAndShow("#addrole_panel");
      $("#addrole_panel .input-error").html(_0x32e92b.result);
    }
  },
  emote: function (_0x1a64b2) {
    Process.emotes = _0x1a64b2.items || 0;
    var _0x507961 = [];
    for (var _0xb2fa5e = 0; _0xb2fa5e < Process.emotes.length; _0xb2fa5e++) {
      _0x507961.push("<span>");
      _0x507961.push(Process.emotes[_0xb2fa5e]);
      _0x507961.push("</span>");
    }
    $(".channel-emotes").html(_0x507961.join(""));
  },
  deleterole: function (_0x4029d4) {
    if (_0x4029d4.result) {
      var _0x19c7f9 = $(
        "#role_panel>ul>.content>.role-list>.role-item[roleid='" +
          _0x4029d4.id +
          "']",
      );
      _0x19c7f9.remove();
      var _0x1dd818 = $("#role_panel>ul>.content>.role-list>.role-item");
      if (_0x19c7f9.is(".select") && _0x1dd818.length) {
        $(_0x1dd818[0]).addClass("select");
      } else if (!_0x1dd818.length) {
        LoginMethods.AddRole();
      }
    } else {
      Confirm.Show({
        content:
          "<span class='input-error'>" +
          (_0x4029d4.message || "删除失败") +
          "</span>",
      });
    }
  },
  cross: function (_0x2cd24b) {
    var _0x3a36b7 = null;
    for (var _0x25ec47 = 0; _0x25ec47 < SERVERS.length; _0x25ec47++) {
      if (SERVERS[_0x25ec47].ID == _0x2cd24b.sid) {
        _0x3a36b7 = SERVERS[_0x25ec47];
      }
    }
    if (!_0x3a36b7) {
      return;
    }
    if (Process.resetRoomRendererSession) Process.resetRoomRendererSession();
    GameClient.ChangeServer = true;
    GameClient.Close();
    Dialog.pack.items = null;
    if (_0x2cd24b.cross_type == "duizhan") {
      Dialog.skills.items = null;
      Dialog.skills.isShow = false;
    }
    console.log("重新连接到", _0x3a36b7.Name);
    if (!_0x2cd24b.pid) {
      Process.die({
        relive: true,
      });
    }
    ConnectServer(_0x3a36b7, _0x2cd24b.pid);
  },
  roles: function (_0x44e48e) {
    var _0x7024bc = _0x44e48e.roles;
    if (!_0x7024bc.length) {
      LoginMethods.AddRole();
    } else {
      HideAndShow("#role_panel");
      var _0x41a4d8 = [];
      for (var _0x204716 = 0; _0x204716 < _0x7024bc.length; _0x204716++) {
        _0x41a4d8.push("<li class='role-item");
        if (_0x204716 == 0) {
          _0x41a4d8.push(" select");
        }
        _0x41a4d8.push("' roleid='" + _0x7024bc[_0x204716].id + "'>");
        _0x41a4d8.push(_0x7024bc[_0x204716].title);
        _0x41a4d8.push("&nbsp;&nbsp;");
        _0x41a4d8.push(_0x7024bc[_0x204716].name);
        _0x41a4d8.push("</li>");
      }
      $(".role-list").html(_0x41a4d8.join(""));
    }
  },
  loginerror: function (_0x48736f) {
    $(".container").hide();
    $(".login-content").show();
    ShowLoader("<strong>登陆失败：</strong>" + _0x48736f.msg + "");
  },
  login: function (_0x5d7772) {
    if (
      Process.player &&
      Process.player != _0x5d7772.id &&
      Process.resetRoomRendererSession
    ) {
      Process.resetRoomRendererSession();
    }
    if (!Process.player) {
      HideAndShow(".container");
    }
    Process.player = _0x5d7772.id;
    Process.level = _0x5d7772.level;
    Setting.load(_0x5d7772.setting);
    if (LastCommand) {
      SendCommand(LastCommand);
      LastCommand = null;
    }
  },
  levelup: function (_0x4be67d) {
    Process.level = _0x4be67d.level;
  },
  selectItem: function (_0x1beadb) {
    if ($(_0x1beadb.target).is(".status-item")) {
      var _0x3efbe1 = _0x1beadb.target.getAttribute("sid");
      let _0x1ebd2d = $(_0x1beadb.target).closest(".room-item").attr("itemid");
      if (!_0x3efbe1) {
        return;
      }
      if (_0x1ebd2d === Process.player) {
        return SendCommand("status " + _0x3efbe1);
      }
      return SendCommand("status " + _0x3efbe1 + " " + _0x1ebd2d);
    }
    var _0xcca15e = $(this).attr("itemid");
    console.log(_0xcca15e);
    if (_0xcca15e) {
      Process.cancelPendingDetailPopups();
      if (_0xcca15e == Process.player) {
        var _0x531da4 = $(this).find(".item-name").html();
        var _0x2039a9 = [
          {
            cmd: "look " + _0xcca15e,
            name: "查看",
          },
          {
            cmd: "dazuo",
            name: "打坐",
          },
          {
            cmd: "liaoshang",
            name: "疗伤",
          },
        ];
        if (Dialog.team.items && Dialog.team.items.length) {
          _0x2039a9.push({
            cmd: "team out",
            name: "退出队伍",
          });
          if (Dialog.team.isCap) {
            _0x2039a9.push({
              cmd: "team dismiss",
              name: "解散队伍",
            });
            _0x2039a9.push({
              cmd: "team set",
              name: "更改分配方式",
            });
          }
        }
        Process.item({
          id: _0xcca15e,
          name: _0x531da4,
          me: 1,
          desc: _0x531da4,
          commands: _0x2039a9,
        });
        return;
      }
      SendCommand("select " + _0xcca15e);
    }
  },
  isCharacterItem: function (item) {
    var commands = (item && item.commands) || [];
    return Boolean(
      item &&
        item.id != null &&
        (item.p ||
          item.me ||
          item.hp != null ||
          item.max_hp != null ||
          item.max_mp != null ||
          commands.some(function (command) {
            return (
              command &&
              /^(?:fight|kill|team add)\s+\S+/.test(
                String(command.cmd || "").trim(),
              )
            );
          })),
    );
  },
  isPopupDetailCommand: function (command) {
    return DetailPopupPolicy.isPopupDetailCommand(command);
  },
  prepareCharacterTextView: function (command, sourceElement) {
    var normalized = String(command || "")
        .trim()
        .replace(/\s+/g, " "),
      match = normalized.match(/^look\s+(\S+)$/);
    if (!match) return false;
    var characterId = match[1],
      sourcePopup = sourceElement.closest(".WG_item_popup").first();
    if (
      !sourcePopup.length ||
      sourcePopup.attr("data-popup-kind") != "character" ||
      String(sourcePopup.attr("itemid")) != String(characterId)
    )
      return false;
    var actions = sourcePopup.find(".WG_item_popup_actions").first(),
      notice = actions.find(".WG_character_look_notice");
    if (!notice.length)
      notice = $(
        "<div class=\"WG_character_look_notice\" role=\"status\"></div>",
      ).appendTo(actions);
    notice.text("完整人物信息已显示在信息栏。");
    return true;
  },
  prepareDetailPopup: function (command, sourceElement) {
    var normalized = String(command || "")
        .trim()
        .replace(/\s+/g, " "),
      commandElement = sourceElement.closest("[cmd]"),
      sourcePopup = sourceElement.closest(".WG_item_popup").first(),
      sourceSecondary = sourceElement
        .closest(
          ".WG_item_popup_secondary, .dialog",
        )
        .first(),
      sourceSurface = sourcePopup.length
        ? sourcePopup
        : sourceSecondary.length
          ? sourceSecondary
          : commandElement.closest(".dialog").first(),
      pending = {
        command: normalized,
        title: commandElement.html() || commandElement.text() || "查看详情",
        sourceElement: commandElement[0] || sourceElement[0] || null,
        sourcePopupElement: sourcePopup[0] || null,
        sourceSecondaryElement: sourceSecondary[0] || null,
        sourceSurfaceElement: sourceSurface[0] || null,
        createdAt: Date.now(),
      },
      described = DetailPopupPolicy.describePopupDetailCommand(normalized);
    if (!described || !described.kind) return null;
    pending.kind = described.kind;
    pending.id = described.id;
    pending.from = described.from;
    pending.expectedDialog = described.expectedDialog;
    pending.textType = described.textType;
    if (described.kind == "text-detail")
      pending.timeout = DetailPopupPolicy.textDetailTimeout;
    if (described.kind == "skill") {
      var skill =
        (Dialog.skills.skills && Dialog.skills.skills[pending.id]) ||
        (Dialog.master.skills && Dialog.master.skills[pending.id]);
      skill && skill.name && (pending.title = skill.name);
    } else if (described.kind == "pack-item") {
      pending.packOwner = /^dc\s+/.test(normalized)
        ? Dialog.pack2
        : Dialog.pack;
      pending.item = pending.packOwner.get_item(pending.id);
      var sourceObject = commandElement
        .closest(".item-commands")
        .prev(".obj-item");
      if (
        !pending.item &&
        sourceObject.length &&
        Dialog.list.find_item
      ) {
        pending.item = Dialog.list.find_item(
          Number(sourceObject.attr("otype")),
          pending.id,
        );
      }
      if (!pending.item && pending.packOwner.eqs)
        for (var index = 0; index < pending.packOwner.eqs.length; index++)
          if (
            pending.packOwner.eqs[index] &&
            pending.packOwner.eqs[index].id == pending.id
          ) {
            pending.item = pending.packOwner.eqs[index];
            break;
          }
      pending.item &&
        pending.item.name &&
        (pending.title = pending.item.name);
    } else if (described.kind == "ranking-character") {
      var rankingItem = sourceElement.closest(".top-item");
      if (!rankingItem.length)
        rankingItem = sourceElement
          .closest(".item-commands")
          .prev(".top-item");
      var rankingName = rankingItem.find(".top-name");
      rankingName.length && (pending.title = rankingName.html());
    }
    Process.queueDetailPopupRequest(pending);
    return pending;
  },
  detailPopupRequestTimeout: 8000,
  detailPopupRequests: [],
  detailPopupRequestSequence: 0,
  queueDetailPopupRequest: function (pending) {
    var now = Date.now();
    Process.detailPopupRequests = (Process.detailPopupRequests || []).filter(
      function (request) {
        var timeout = request.timeout || Process.detailPopupRequestTimeout;
        return now - request.createdAt <= timeout;
      },
    );
    for (var request of Process.detailPopupRequests)
      if (request.sourceSurfaceElement === pending.sourceSurfaceElement)
        request.superseded = true;
    pending.requestId = ++Process.detailPopupRequestSequence;
    Process.detailPopupRequests.push(pending);
    if (Process.detailPopupRequests.length > 12)
      Process.detailPopupRequests.splice(
        0,
        Process.detailPopupRequests.length - 12,
      );
  },
  cancelPendingDetailPopups: function () {
    Process.detailPopupRequests = [];
  },
  cancelDetailPopupRequestsForSurface: function (sourceElement) {
    var source = $(sourceElement || null).closest(
        ".WG_item_popup, .dialog.WG_floating_dialog, .dialog",
      )[0],
      requests = Process.detailPopupRequests || [];
    if (!source) return;
    Process.detailPopupRequests = requests.filter(function (request) {
      return request.sourceSurfaceElement !== source;
    });
  },
  matchesDetailPopupData: function (pending, data) {
    return DetailPopupPolicy.matchesDetailPopupData(pending, data);
  },
  takeDetailPopupRequest: function (data) {
    var now = Date.now(),
      requests = Process.detailPopupRequests || [];
    Process.detailPopupRequests = requests.filter(function (request) {
      if (
        now - request.createdAt >
        (request.timeout || Process.detailPopupRequestTimeout)
      )
        return false;
      if (
        request.sourceSurfaceElement &&
        typeof $ == "function" &&
        (!$.contains(document, request.sourceSurfaceElement) ||
          !$(request.sourceSurfaceElement).is(":visible"))
      )
        return false;
      return true;
    });
    for (var index = 0; index < Process.detailPopupRequests.length; index++)
      if (
        Process.matchesDetailPopupData(
          Process.detailPopupRequests[index],
          data,
        )
      )
        return Process.detailPopupRequests.splice(index, 1)[0];
    return null;
  },
  createPackItemPopupCommands: function (data, pending) {
    var commands = ["<div class='item-commands'>"],
      from = data.from || pending.from,
      packOwner = pending.packOwner || Dialog.pack,
      commandBefore = packOwner.command_before || "";
    if (from == "eq") {
      commands.push(
        '<span cmd="' +
          commandBefore +
          "uneq " +
          data.id +
          '">取消装备</span>',
      );
    } else if (from == "item" && pending.item) {
      SCRIPT.LAST_OBJ = pending.item;
      packOwner.create_item_command(pending.item, commands, data.commands);
    } else if (from == "store" || from == "sj") {
      commands.push(
        '<span cmd="_confirm qu ' + data.id + '">取出</span>',
      );
    } else if (from && from != "item") {
      commands.push(
        '<span cmd="_confirm buy 1 ' +
          data.id +
          " from " +
          from +
          '">购买</span>',
      );
    }
    commands.push("</div>");
    return commands.length > 2 ? commands.join("") : "";
  },
  createRankingPopupContent: function (data) {
    var template = $(".hidden-item .dialog-score").first();
    if (!template.length && Dialog.score.footer[0][1]?.jquery)
      template = Dialog.score.footer[0][1];
    if (!template.length) template = $(".dialog-score").first();
    if (!template.length) {
      var fallback = $("<dl class='WG_item_popup_score_fallback'></dl>");
      for (var property of [
        ["等级", "level"],
        ["门派", "family"],
        ["经验", "exp"],
        ["气血", "hp"],
        ["内力", "mp"],
        ["攻击", "gj"],
        ["防御", "fy"],
      ])
        if (data[property[1]] != null)
          fallback.append(
            $("<dt></dt>").text(property[0]),
            $("<dd></dd>").html(data[property[1]]),
          );
      return $("<div></div>").append(fallback).html();
    }
    var score = template.clone(false).removeAttr("style");
    score.find("[data-prop]").each(function () {
      var property = $(this).attr("data-prop");
      $(this).html(data[property] == null ? 0 : data[property]);
    });
    return $("<div class='WG_item_popup_score'></div>")
      .append(score)
      .prop("outerHTML");
  },
  consumeDetailPopupMessage: function (message) {
    if (!IsWGPluginFeatureEnabled("characterPopup")) return false;
    var now = Date.now(),
      requests = Process.detailPopupRequests || [];
    Process.detailPopupRequests = requests.filter(function (request) {
      if (
        now - request.createdAt >
        (request.timeout || Process.detailPopupRequestTimeout)
      )
        return false;
      if (
        request.sourceSurfaceElement &&
        typeof $ == "function" &&
        (!$.contains(document, request.sourceSurfaceElement) ||
          !$(request.sourceSurfaceElement).is(":visible"))
      )
        return false;
      return true;
    });
    for (var index = 0; index < Process.detailPopupRequests.length; index++) {
      var pending = Process.detailPopupRequests[index];
      if (pending.kind != "text-detail") continue;
      var classification = DetailPopupPolicy.classifyDetailText(message);
      if (classification == "ignore") continue;
      pending = Process.detailPopupRequests.splice(index, 1)[0];
      if (classification == "error" || pending.superseded) return false;
      Dialog.consumeLayerRequest(pending.command);
      Process.showPendingDetailPopup(
        {
          id: pending.id,
          name: pending.title,
          desc: message,
          popupKind:
            pending.textType == "skill-help" ? "skill-help" : "jianghu-loot",
        },
        "",
        pending,
      );
      return true;
    }
    return false;
  },
  consumeDetailPopupData: function (data) {
    var pending = Process.takeDetailPopupRequest(data);
    if (!pending) return false;
    var matchesSkill = pending.kind == "skill",
      matchesItem = pending.kind == "pack-item",
      matchesText = pending.kind == "text-detail";
    if (pending.superseded) return true;
    Dialog.consumeLayerRequest(pending.command);
    if (matchesSkill) {
      var skillOwner =
        DetailPopupPolicy.resolveSkillDetailOwnerKind(pending, data) ==
        "master"
          ? Dialog.master
          : Dialog.skills;
      if (data.id && skillOwner.skills && skillOwner.skills[data.id])
        Object.assign(skillOwner.skills[data.id], data);
      var popupSkill =
        (skillOwner.skills && skillOwner.skills[data.id]) || data;
      Process.showPendingDetailPopup(
        {
          id: pending.id,
          name: pending.title,
          desc: data.desc,
          popupKind: "skill-detail",
        },
        skillOwner.createDescriptionCommands
          ? skillOwner.createDescriptionCommands(popupSkill)
          : "",
        pending,
      );
    } else if (matchesItem) {
      Process.showPendingDetailPopup(
        {
          id: pending.id,
          name: pending.title,
          desc: data.desc,
          popupKind: "pack-item-detail",
        },
        Process.createPackItemPopupCommands(data, pending),
        pending,
      );
    } else if (matchesText) {
      Process.showPendingDetailPopup(
        {
          id: pending.id || data.id,
          name: pending.title || data.name,
          desc: data.desc,
          popupKind:
            pending.textType == "skill-help" ? "skill-help" : "jianghu-loot",
        },
        "",
        pending,
      );
    } else {
      var isItemDescription = data.type == "item" && data.desc != null;
      Process.characterPopupOpenedAt = Date.now();
      Process.showPendingDetailPopup(
        {
          id: data.id || "ranking-character",
          name: data.name || pending.title,
          desc: isItemDescription
            ? data.desc
            : Process.createRankingPopupContent(data),
          popupKind: "ranking-character",
        },
        isItemDescription
          ? Process.createItemCommandHtml(data.commands)
          : "",
        pending,
      );
    }
    return true;
  },
  prepareItemPopupSecondary: function (command, sourceElement) {
    Process.pendingItemPopupSecondary = {
      command: String(command || "").trim(),
      sourceElement: sourceElement.closest("[cmd]")[0] || null,
      createdAt: Date.now(),
    };
  },
  consumeItemPopupSecondary: function () {
    var pending = Process.pendingItemPopupSecondary;
    Process.pendingItemPopupSecondary = null;
    return pending && Date.now() - pending.createdAt <= 5000
      ? pending
      : null;
  },
  activateItemPopupSecondary: function (secondaryElement, returnFocus) {
    var sourcePopup = $(returnFocus).closest(".WG_item_popup"),
      popup = sourcePopup.length
        ? sourcePopup
        : $(".WG_item_popup").not(".WG_item_popup_child").first(),
      secondary = $(secondaryElement).first();
    if (
      !popup.is(":visible") ||
      !secondary.length ||
      !secondary.is(":visible")
    )
      return false;
    Process.releaseItemPopupSecondary();
    Process.itemPopupSecondaryElement = secondary[0];
    Process.itemPopupSecondaryReturnFocus = returnFocus || null;
    Process.itemPopupSecondaryParentPopup = popup[0];
    var sourceDepth = Number(popup.attr("data-popup-depth")) || 0;
    secondary
      .addClass("WG_item_popup_secondary")
      .attr("data-popup-depth", sourceDepth + 1);
    popup
      .addClass("WG_has_secondary")
      .attr("aria-hidden", "true")
      .find(".WG_item_popup_dialog")
      .prop("inert", true);
    return true;
  },
  releaseItemPopupSecondary: function (secondaryElement) {
    var active = Process.itemPopupSecondaryElement;
    if (
      secondaryElement &&
      active &&
      $(secondaryElement).first()[0] !== active
    )
      return;
    active &&
      $(active)
        .removeClass("WG_item_popup_secondary WG_item_popup_parent_dimmed")
        .removeAttr("data-popup-depth")
        .prop("inert", false);
    Process.itemPopupSecondaryElement = null;
    var popup = Process.itemPopupSecondaryParentPopup
      ? $(Process.itemPopupSecondaryParentPopup)
      : $(".WG_item_popup").not(".WG_item_popup_child").first();
    Process.itemPopupSecondaryParentPopup = null;
    popup
      .removeClass("WG_has_secondary")
      .attr("aria-hidden", popup.is(":visible") ? "false" : "true")
      .find(".WG_item_popup_dialog")
      .prop("inert", false);
    var returnFocus = Process.itemPopupSecondaryReturnFocus;
    Process.itemPopupSecondaryReturnFocus = null;
    returnFocus &&
      document.documentElement.contains(returnFocus) &&
      $(returnFocus).trigger("focus");
  },
  itemPopupPositionKey: "WG_item_popup_position_v2",
  applyItemPopupPosition: function (left, top, persist, popupElement) {
    var popup = popupElement ? $(popupElement).first() : $(".WG_item_popup").first(),
      dialog = popup.find(".WG_item_popup_dialog").first();
    if (!dialog.length) {
      return;
    }
    var margin = 8,
      maxLeft = Math.max(margin, window.innerWidth - dialog.outerWidth() - margin),
      maxTop = Math.max(margin, window.innerHeight - dialog.outerHeight() - margin),
      position = {
        left: Math.max(margin, Math.min(Number(left) || margin, maxLeft)),
        top: Math.max(margin, Math.min(Number(top) || margin, maxTop)),
      };
    dialog.css({
      left: position.left + "px",
      top: position.top + "px",
      transform: "none",
    });
    persist &&
      !popup.hasClass("WG_item_popup_child") &&
      window.localStorage.setItem(
        Process.itemPopupPositionKey,
        JSON.stringify(position),
      );
  },
  restoreItemPopupPosition: function (popupElement, parentSurface) {
    var popup = popupElement ? $(popupElement).first() : $(".WG_item_popup").first(),
      dialog = popup.find(".WG_item_popup_dialog").first(),
      savedPosition = window.localStorage.getItem(Process.itemPopupPositionKey);
    if (!dialog.length) {
      return;
    }
    if (popup.hasClass("WG_item_popup_child")) {
      var parentRect = $(parentSurface)[0].getBoundingClientRect();
      Process.applyItemPopupPosition(
        parentRect.left + 28,
        parentRect.top + 28,
        false,
        popup,
      );
      return;
    }
    if (savedPosition) {
      try {
        savedPosition = JSON.parse(savedPosition);
        if (
          Number.isFinite(Number(savedPosition.left)) &&
          Number.isFinite(Number(savedPosition.top))
        ) {
          Process.applyItemPopupPosition(
            savedPosition.left,
            savedPosition.top,
            false,
            popup,
          );
          return;
        }
      } catch (error) {
        window.localStorage.removeItem(Process.itemPopupPositionKey);
      }
    }
    var main = $(".container").first(),
      mainRect = main.length
        ? main[0].getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    Process.applyItemPopupPosition(
      mainRect.left + (mainRect.width - dialog.outerWidth()) / 2,
      mainRect.top + (mainRect.height - dialog.outerHeight()) / 2,
      false,
      popup,
    );
  },
  initItemPopupDrag: function (popup) {
    var header = popup.find(".WG_item_popup_header"),
      dialog = popup.find(".WG_item_popup_dialog"),
      dragState = null;
    header
      .off(".WG_item_popup_drag")
      .on("pointerdown.WG_item_popup_drag", function (event) {
        if ($(event.target).closest(".WG_item_popup_close").length) {
          return;
        }
        var pointerEvent = event.originalEvent;
        if (pointerEvent.button != null && pointerEvent.button !== 0) {
          return;
        }
        var rect = dialog[0].getBoundingClientRect();
        dragState = {
          pointerId: pointerEvent.pointerId,
          startX: pointerEvent.clientX,
          startY: pointerEvent.clientY,
          startLeft: rect.left,
          startTop: rect.top,
        };
        header.addClass("WG_dragging");
        this.setPointerCapture && this.setPointerCapture(pointerEvent.pointerId);
        event.preventDefault();
      })
      .on("pointermove.WG_item_popup_drag", function (event) {
        var pointerEvent = event.originalEvent;
        if (!dragState || pointerEvent.pointerId !== dragState.pointerId) {
          return;
        }
        Process.applyItemPopupPosition(
          dragState.startLeft + pointerEvent.clientX - dragState.startX,
          dragState.startTop + pointerEvent.clientY - dragState.startY,
          false,
          popup,
        );
        event.preventDefault();
      })
      .on(
        "pointerup.WG_item_popup_drag pointercancel.WG_item_popup_drag",
        function (event) {
          var pointerEvent = event.originalEvent;
          if (!dragState || pointerEvent.pointerId !== dragState.pointerId) {
            return;
          }
          var rect = dialog[0].getBoundingClientRect();
          header.removeClass("WG_dragging");
          Process.applyItemPopupPosition(rect.left, rect.top, true, popup);
          dragState = null;
        },
      );
    $(window)
      .off("resize.WG_item_popup_drag")
      .on("resize.WG_item_popup_drag", function () {
        if (!popup.is(":visible")) {
          return;
        }
        $(".WG_item_popup:visible").each(function () {
          var visiblePopup = $(this),
            visibleDialog = visiblePopup.find(".WG_item_popup_dialog").first(),
            rect = visibleDialog[0].getBoundingClientRect();
          Process.applyItemPopupPosition(
            rect.left,
            rect.top,
            false,
            visiblePopup,
          );
        });
      });
  },
  createItemPopupElement: function (depth) {
    depth = Number(depth) || 0;
    var titleId = "WG_item_popup_title_" + depth + "_" + Date.now();
    var popup = $(
      '<div class="WG_item_popup' +
        (depth ? " WG_item_popup_child" : "") +
        '" aria-hidden="true" data-popup-depth="' +
        depth +
        '">' +
        '<section class="WG_item_popup_dialog" role="dialog" aria-modal="false" aria-labelledby="' +
        titleId +
        '">' +
        '<header class="WG_item_popup_header">' +
        '<span class="WG_item_popup_title" id="' +
        titleId +
        '"></span>' +
        '<button class="WG_item_popup_close" type="button" aria-label="关闭">×</button>' +
        "</header>" +
        '<div class="WG_item_popup_body">' +
        '<div class="WG_item_popup_desc"></div>' +
        '<div class="WG_item_popup_actions"></div>' +
        "</div>" +
        "</section>" +
        "</div>",
    ).appendTo(".container");
    depth && popup.css("z-index", 2147483604 + depth);
    Process.initItemPopupDrag(popup);
    popup.on("click", ".WG_item_popup_close", function () {
      var currentPopup = $(this).closest(".WG_item_popup");
      currentPopup.hasClass("WG_item_popup_child")
        ? Process.closeItemPopupLayer(currentPopup)
        : Process.closeItemPopup();
    });
    return popup;
  },
  ensureItemPopup: function () {
    var popup = $(".WG_item_popup").not(".WG_item_popup_child").first();
    if (popup.length) {
      return popup;
    }
    popup = Process.createItemPopupElement(0);
    $(document)
      .off("keydown.WG_item_popup")
      .on("keydown.WG_item_popup", function (event) {
        if (
          event.key === "Escape" &&
          $(".WG_item_popup:visible").length
        ) {
          var childPopup = $(".WG_item_popup_child:visible").last();
          var topPopup = childPopup.length
            ? childPopup
            : $(".WG_item_popup").not(".WG_item_popup_child").first();
          if (!IsTopWGPopupLayer(topPopup)) return;
          if (childPopup.length) {
            Process.closeItemPopupLayer(childPopup);
          } else if (!Process.itemPopupSecondaryElement) {
            Process.closeItemPopup();
          } else {
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      });
    return popup;
  },
  showItemPopup: function (item, commandHtml) {
    var popup = Process.ensureItemPopup();
    Process.releaseItemPopupSecondary();
    Process.closeItemPopupChildren();
    popup
      .attr("itemid", item.id || "")
      .attr("data-popup-kind", item.popupKind || "");
    popup.find(".WG_item_popup_title").html(item.name || "交互");
    popup.find(".WG_item_popup_desc").html(item.desc || "");
    popup.find(".WG_item_popup_actions").html(commandHtml);
    popup.css("display", "block").attr("aria-hidden", "false");
    Process.restoreItemPopupPosition(popup);
  },
  showPendingDetailPopup: function (item, commandHtml, pending) {
    var source = $((pending && pending.sourceElement) || null),
      parentPopup = $((pending && pending.sourcePopupElement) || null),
      parentNative = $((pending && pending.sourceSecondaryElement) || null),
      parentSurface = parentPopup.length
        ? parentPopup.find(".WG_item_popup_dialog").first()
        : parentNative.first();
    if (!parentPopup.length) parentPopup = source.closest(".WG_item_popup");
    if (!parentNative.length)
      parentNative = source.closest(
        ".WG_item_popup_secondary, .dialog",
      );
    if (!parentSurface.length)
      parentSurface = parentPopup.length
        ? parentPopup.find(".WG_item_popup_dialog").first()
        : parentNative.first();
    if (!parentSurface.length) {
      Process.showItemPopup(item, commandHtml);
      return;
    }
    var parentDepth = parentPopup.length
      ? Number(parentPopup.attr("data-popup-depth")) || 0
      : parentNative.hasClass("dialog")
        ? (Number(parentNative.attr("data-dialog-depth")) || 0) + 1
        : Number(parentNative.attr("data-popup-depth")) || 1;
    var depth = parentDepth + 1;
    Process.closeItemPopupChildren(depth);
    var popup = Process.createItemPopupElement(depth);
    popup.data("WG_item_popup_parent", parentSurface[0]);
    popup.data("WG_item_popup_return_focus", pending.sourceElement || null);
    parentSurface
      .addClass("WG_item_popup_parent_dimmed")
      .prop("inert", true);
    popup
      .attr("itemid", item.id || "")
      .attr("data-popup-kind", item.popupKind || "")
      .css("display", "block")
      .attr("aria-hidden", "false");
    popup.find(".WG_item_popup_title").html(item.name || "详情");
    popup.find(".WG_item_popup_desc").html(item.desc || "");
    popup.find(".WG_item_popup_actions").html(commandHtml);
    Process.restoreItemPopupPosition(popup, parentSurface);
    popup.find(".WG_item_popup_close").trigger("focus");
  },
  closeItemPopupChildren: function (fromDepth) {
    var children = $(".WG_item_popup_child");
    if (fromDepth != null)
      children = children.filter(function () {
        return Number($(this).attr("data-popup-depth")) >= Number(fromDepth);
      });
    children.each(function () {
      var parentSurface = $($(this).data("WG_item_popup_parent"));
      parentSurface
        .removeClass("WG_item_popup_parent_dimmed")
        .prop("inert", false);
      $(this).remove();
    });
  },
  closeItemPopupLayer: function (popupElement) {
    var popup = $(popupElement).first(),
      depth = Number(popup.attr("data-popup-depth")) || 1,
      parentSurface = $(popup.data("WG_item_popup_parent")),
      returnFocus = popup.data("WG_item_popup_return_focus");
    Process.closeItemPopupChildren(depth);
    parentSurface
      .removeClass("WG_item_popup_parent_dimmed")
      .prop("inert", false);
    if (returnFocus && document.documentElement.contains(returnFocus)) {
      $(returnFocus).trigger("focus");
    } else {
      parentSurface.find("[cmd]").first().trigger("focus");
    }
  },
  appendCharacterPopupCommands: function (items) {
    var popup = $(".WG_item_popup").not(".WG_item_popup_child").first();
    if (
      !popup.is(":visible") ||
      !["character", "ranking-character"].includes(
        popup.attr("data-popup-kind"),
      ) ||
      !Process.characterPopupOpenedAt ||
      Date.now() - Process.characterPopupOpenedAt > 8000
    ) {
      return false;
    }
    var commandBox = popup.find(".WG_item_popup_actions .item-commands");
    for (var index = 0; index < items.length; index++) {
      var command = items[index];
      if (!command || !command.cmd) {
        continue;
      }
      var duplicate = commandBox
        .children("span")
        .filter(function () {
          return $(this).attr("cmd") === command.cmd;
        }).length;
      if (!duplicate) {
        $("<span></span>")
          .attr("cmd", command.cmd)
          .html(command.name)
          .appendTo(commandBox);
      }
    }
    return true;
  },
  createItemCommandHtml: function (commands) {
    commands = Array.isArray(commands) ? commands : [];
    var commandHtml = ["<div class='item-commands'>"];
    for (var index = 0; index < commands.length; index++) {
      if (!commands[index] || !commands[index].cmd) {
        continue;
      }
      commandHtml.push("<span cmd='" + commands[index].cmd + "'>");
      commandHtml.push(commands[index].name || commands[index].cmd);
      commandHtml.push("</span>");
    }
    commandHtml.push("</div>");
    return commandHtml.join("");
  },
  closeItemPopup: function (itemId) {
    Process.cancelPendingDetailPopups();
    Process.pendingItemPopupSecondary = null;
    var popup = $(".WG_item_popup").not(".WG_item_popup_child").first();
    if (!popup.length) {
      return;
    }
    if (itemId != null && popup.attr("itemid") != itemId) {
      return;
    }
    Process.releaseItemPopupSecondary();
    Process.closeItemPopupChildren();
    popup
      .hide()
      .attr("aria-hidden", "true")
      .removeAttr("itemid data-popup-kind");
  },
  item: function (_0x20d2ed) {
    var roomItem = Process.queryRoomItem(_0x20d2ed.id);
    if (roomItem) {
      for (var roomProperty in roomItem)
        if (_0x20d2ed[roomProperty] == null)
          _0x20d2ed[roomProperty] = roomItem[roomProperty];
    }
    _0x20d2ed.commands = _0x20d2ed.commands ?? [];
    SCRIPT.LAST_OBJ = _0x20d2ed;
    Dialog.extend.append(_0x20d2ed.commands, "item", _0x20d2ed);
    if (Process.consumeDetailPopupData(_0x20d2ed)) {
      return;
    }
    var _0x10fecf = Process.createItemCommandHtml(_0x20d2ed.commands);
    if (IsWGPluginFeatureEnabled("characterPopup")) {
      Process.itemsElement.find(".item-commands").remove();
      var isCharacter = Process.isCharacterItem(_0x20d2ed);
      _0x20d2ed.popupKind = isCharacter ? "character" : "scene-item";
      isCharacter && (Process.characterPopupOpenedAt = Date.now());
      Process.showItemPopup(_0x20d2ed, _0x10fecf);
      return;
    }
    ReceiveMessage(_0x20d2ed.desc);
    if (Setting.show_command && Combat.STATUS[_0x20d2ed.id]) {
      Process.itemsElement.find(".item-commands").remove();
      var roomItemElement = Combat.STATUS[_0x20d2ed.id].elem.parent();
      $(_0x10fecf).insertAfter(roomItemElement);
      Process.message.scroll2end();
      return;
    }
    ReceiveMessage(_0x10fecf);
  },
  actions: function (_0x2947ab) {
    Combat.ShowActions(_0x2947ab);
  },
  cmds: function (_0x2580fd) {
    if (!_0x2580fd.items) {
      return;
    }
    var _0x4e20df = ["<div class='item-commands'>"];
    if (!_0x2580fd.items.length) {
      _0x2580fd.items = [_0x2580fd.items];
    }
    if (Process.appendCharacterPopupCommands(_0x2580fd.items)) {
      return;
    }
    for (var _0xf68166 = 0; _0xf68166 < _0x2580fd.items.length; _0xf68166++) {
      _0x4e20df.push("<span cmd='" + _0x2580fd.items[_0xf68166].cmd + "'>");
      _0x4e20df.push(_0x2580fd.items[_0xf68166].name);
      _0x4e20df.push("</span>");
    }
    _0x4e20df.push("</div>");
    ReceiveMessage(_0x4e20df.join(""));
  },
  map: function (_0x3fc7d5) {
    MAP.SetMapBuffer(_0x3fc7d5.map, _0x3fc7d5.path);
    MAP.ShowMap(_0x3fc7d5.map, _0x3fc7d5.path);
  },
  updatemap: function (_0x52bdab) {
    MAP.UpdateMap(_0x52bdab.map, _0x52bdab);
  },
  dialog: function (_0x4ce96c) {
    if (Process.consumeDetailPopupData(_0x4ce96c)) {
      return;
    }
    var floatingLayer = Dialog.peekLayerRequest(),
      openedFloatingLayer = false,
      opensPanel = Process.isDialogPanelPayload(_0x4ce96c);
    if (!opensPanel && floatingLayer) {
      Dialog.consumeLayerRequest();
      floatingLayer = null;
    }
    if (
      opensPanel &&
      floatingLayer &&
      Dialog.isShow &&
      floatingLayer.sourceItem == Dialog.curItem &&
      Dialog.curItem != _0x4ce96c.dialog
    ) {
      floatingLayer = Dialog.consumeLayerRequest();
      if (floatingLayer.superseded) return;
      openedFloatingLayer = Dialog.pushLayer(
        _0x4ce96c.dialog,
        floatingLayer,
      );
    }
    var itemPopupSecondary = Process.consumeItemPopupSecondary();
    openedFloatingLayer && Dialog.show(_0x4ce96c.dialog);
    Dialog.processingPayload = true;
    try {
      Dialog.show(_0x4ce96c.dialog, _0x4ce96c);
    } finally {
      Dialog.processingPayload = false;
    }
    itemPopupSecondary &&
      opensPanel &&
      (!Dialog.isShow || Dialog.curItem != _0x4ce96c.dialog) &&
      Dialog.show(_0x4ce96c.dialog);
    itemPopupSecondary &&
      opensPanel &&
      Dialog.isShow &&
      Process.activateItemPopupSecondary(
        Dialog.element,
        itemPopupSecondary.sourceElement,
      );
  },
  isDialogPanelPayload: function (data) {
    return DetailPopupPolicy.isDialogPanelPayload(data);
  },
  sc: function (_0x2f613b) {
    Combat.StatusChanged(_0x2f613b);
  },
  perform: function (_0x3369b1) {
    Combat.ShowPFM(_0x3369b1);
  },
  disobj: function (_0x2dd29c) {
    Combat.DisObj(_0x2dd29c);
  },
  changepfm: function (_0x165f6b) {
    Combat.ChangeDistime(_0x165f6b);
  },
  clearDistime: function (_0xcaff29) {
    Combat.ClearDistime(_0xcaff29);
  },
  pay: function (_0x17efa4) {
    if (_0x17efa4.pay === 3) {
      ReceiveMessage("<yel>请打开微信扫描二维码支付：</yel>\n");
      let _0x39c398 = $(
        '<div style="width:100%;text-align:center;"><img style="border:solid 2px #808088" src="' +
          _0x17efa4.url +
          '"/></div>',
      );
      _0x39c398.children(0).on("load", function () {
        ReceiveMessage("");
      });
      MessagePage.append(_0x39c398);
    } else {
      window.location.href = _0x17efa4.url;
    }
  },
  dispfm: function (_0x59e9e) {
    Combat.On_Perform(_0x59e9e);
  },
  status: function (_0x2a371e) {
    Combat.StatusItemChanged(_0x2a371e);
  },
  combat: function (_0x4f3872) {
    if (_0x4f3872.start) {
      if (Setting.auto_showcombat == 1 && !Combat.IsShow) {
        Combat.Show();
      }
      if (Setting.auto_hideroom == 1) {
        if (!Setting.hide_roomdesc) {
          $(".room_desc").hide();
        }
      }
    }
    if (_0x4f3872.end) {
      if (Setting.auto_hideroom == 1) {
        if (!Setting.hide_roomdesc) {
          $(".room_desc").show();
        }
      }
    }
  },
  state: function (_0x511c2d) {
    Setting.handleAutoWorkState(_0x511c2d);
    if (_0x511c2d && _0x511c2d.state) {
      var _0x41b653 = ["<span class='title'>" + _0x511c2d.state + "</span>"];
      if (_0x511c2d.commands) {
        for (
          var _0x3fb8ef = 0;
          _0x3fb8ef < _0x511c2d.commands.length;
          _0x3fb8ef++
        ) {
          _0x41b653.push(
            "<span class='item-command' cmd='" +
              _0x511c2d.commands[_0x3fb8ef].cmd +
              "'>",
          );
          _0x41b653.push(_0x511c2d.commands[_0x3fb8ef].name);
          _0x41b653.push("</span>");
        }
      }
      $(".state-bar").html(_0x41b653.join("")).css("visibility", "visible");
      if (_0x511c2d.no_stop) {
        $(".state-tool").hide();
      } else {
        $(".state-tool").show();
      }
      Process.states = _0x511c2d.desc;
      if (Process.timer) {
        clearInterval(Process.timer);
      }
      if (Process.states && Process.states.length) {
        if (typeof Process.states == "string") {
          Process.states = [Process.states];
        }
        Process.timer = setInterval(
          Process.updatestate,
          _0x511c2d.interval || 5000,
        );
      }
    } else {
      $(".state-bar").empty().css("visibility", "hidden");
      $(".state-tool").hide();
      clearInterval(Process.timer);
    }
  },
  updatestate: function () {
    if (Process.states && GameClient) {
      var _0x52ad0b = Process.states.length;
      ReceiveMessage(Process.states[parseInt(Math.random() * _0x52ad0b)]);
    }
  },
  die: function (_0x413fb6) {
    if (_0x413fb6.relive) {
      return Process.state({});
    }
    Process.state({
      state: "<hiw>你已经死亡：</hiw>",
      no_stop: true,
      desc: [
        "<blk>一股阴冷的气息包围着你。</blk>",
        "<blu>朦胧中你好像听到有人在喊：过来吧，过来吧！</blu>",
      ],
      commands: _0x413fb6.commands,
      interval: 12000,
    });
  },
  warn: function (_0x599a9c) {
    Warn.Show(_0x599a9c);
  },
  msg: function (_0x117822) {
    var _0x5b27ab = Dialog.channel.createElement(_0x117822, !Setting.no_spmsg);
    if (!_0x5b27ab) {
      return;
    }
    if (!Setting.no_spmsg) {
      Process.channel.push(_0x5b27ab);
      Process.channel.scroll2end();
    } else {
      ReceiveMessage(_0x5b27ab);
    }
  },
  addAction: function (_0x375eed) {
    Combat.AddObj(_0x375eed.id, _0x375eed.name, _0x375eed.distime);
  },
  removeAction: function (_0x33b669) {
    Combat.DisObj({
      id: _0x33b669.id,
      remove: true,
    });
  },
};
const ClientRoomRenderer = unsafeWindow.WSMudClient.createModule(
  "room-renderer",
  {
    jquery: $,
    documentRef: document,
    getProcess: function () {
      return Process;
    },
    getSetting: function () {
      return Setting;
    },
    getCombat: function () {
      return Combat;
    },
    getMap: function () {
      return MAP;
    },
    receiveMessage: function (message) {
      return ReceiveMessage(message);
    },
    sendCommand: function (command) {
      return SendCommand(command);
    },
    nodeFilterShowText: function () {
      return NodeFilter.SHOW_TEXT;
    },
  },
);
Object.assign(Process, ClientRoomRenderer);
var Warn = unsafeWindow.WSMudClient.createModule("warnings", {
  jquery: $,
  hostWindow: window,
});
var Combat = unsafeWindow.WSMudClient.createModule("combat", {
  jquery: $,
  hostWindow: window,
  timers: window,
  getSendCommand: function () { return SendCommand; },
  getSetting: function () { return Setting; },
  getProcess: function () { return Process; },
  getDialog: function () { return Dialog; },
});
var mapRuntime = unsafeWindow.WSMudClient.createModule("map", {
  jquery: $,
  documentRef: document,
  timers: window,
  getSendCommand: function () { return SendCommand; },
  getProcess: function () { return Process; },
  isFeatureEnabled: IsWGPluginFeatureEnabled,
  isTopPopupLayer: IsTopWGPopupLayer,
});
var MAP = mapRuntime.MAP;
var CreateHeadPanel = mapRuntime.CreateHeadPanel;

var Touch = unsafeWindow.WSMudClient.createModule("touch", {
  documentRef: document,
});
const Dialog = {
  isShow: false,
  curItem: null,
  layerStack: [],
  pendingLayerRequests: [],
  show: function (_0x5ecb78, _0xb973d1) {
    if (!_0x5ecb78) {
      return;
    }
    if (!_0xb973d1) {
      var pendingLayer = this.peekLayerRequest();
      if (
        pendingLayer &&
        this.isShow &&
        pendingLayer.sourceItem == this.curItem &&
        _0x5ecb78 != this.curItem
      ) {
        pendingLayer = this.consumeLayerRequest();
        this.pushLayer(_0x5ecb78, pendingLayer);
      }
      if (this.isShow && _0x5ecb78 == this.curItem) {
        if (this.processingPayload) return;
        return this.hide();
      }
      if (this.curItem && _0x5ecb78 != this.curItem) {
        Process.cancelPendingDetailPopups && Process.cancelPendingDetailPopups();
        this.saveSkillsWindowGeometry();
        if (Dialog[Dialog.curItem].close) {
          Dialog[Dialog.curItem].close();
        }
        Dialog[Dialog.curItem].isShow = false;
        Dialog.contentElement.empty();
      }
      this.init();
      this.curItem = _0x5ecb78;
      this.activateFloatingDialog();
      this[_0x5ecb78].show(_0xb973d1);
      Process.message.scroll2end();
    } else {
      this[_0x5ecb78].onData(_0xb973d1);
    }
  },
  select: function (_0x23b6a8) {
    if (this.isShow && _0x23b6a8 == this.curItem) {
      return this.hide();
    }
    if (this.curItem && _0x23b6a8 != this.curItem) {
      this.saveSkillsWindowGeometry();
      if (Dialog[Dialog.curItem].close) {
        Dialog[Dialog.curItem].close();
      }
      Dialog[Dialog.curItem].isShow = false;
      Dialog.contentElement.empty();
    }
    this.init();
    this.curItem = _0x23b6a8;
    this.activateFloatingDialog();
  },
  init: function () {
    if (this.isShow) {
      return;
    }
    if (!this.isInit) {
      this.contentElement = $(".dialog>.dialog-content");
      this.titleElement = $(".dialog>.dialog-header>.dialog-title");
      this.iconElement = $(".dialog>.dialog-header>.dialog-icon");
      this.footerElement = $(".dialog>.dialog-footer").on(
        "click",
        ".footer-item",
        Dialog.footerClick,
      );
      this.hiddenElement = $(".hidden-item");
      this.element = $(".dialog");
      $(".dialog>.dialog-header>.dialog-close").on("click", Dialog.hide);
      $(document)
        .off("keydown.WG_floating_dialog")
        .on("keydown.WG_floating_dialog", function (event) {
          if (
            event.key === "Escape" &&
            Dialog.isShow &&
            Dialog.element.hasClass("WG_floating_dialog") &&
            IsTopWGPopupLayer(Dialog.element)
          ) {
            Dialog.hide();
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        });
      this.isInit = true;
    }
    $(".content-room").addClass("hide");
    this.element.removeClass("hide");
    this.isShow = true;
  },
  skillsWindowGeometryKey: "WG_skills_window_geometry",
  getFloatingDialogGeometryKey: function () {
    return "WG_floating_dialog_geometry_" + (this.curItem || "default");
  },
  initSkillsWindow: function () {
    if (this.skillsWindowInitialized || !this.element || !this.element.length) {
      return;
    }
    this.skillsWindowInitialized = true;
    var header = this.element.children(".dialog-header"),
      dragState = null;
    header
      .off(".WG_skills_window_drag")
      .on("pointerdown.WG_skills_window_drag", function (event) {
        if ($(event.target).closest(".dialog-close").length) return;
        var pointerEvent = event.originalEvent;
        if (pointerEvent.button != null && pointerEvent.button !== 0) return;
        var rect = Dialog.element[0].getBoundingClientRect();
        dragState = {
          pointerId: pointerEvent.pointerId,
          startX: pointerEvent.clientX,
          startY: pointerEvent.clientY,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        header.addClass("WG_dragging");
        this.setPointerCapture && this.setPointerCapture(pointerEvent.pointerId);
        event.preventDefault();
      })
      .on("pointermove.WG_skills_window_drag", function (event) {
        var pointerEvent = event.originalEvent;
        if (!dragState || pointerEvent.pointerId !== dragState.pointerId) return;
        Dialog.applySkillsWindowGeometry(
          {
            left: dragState.left + pointerEvent.clientX - dragState.startX,
            top: dragState.top + pointerEvent.clientY - dragState.startY,
            width: dragState.width,
            height: dragState.height,
          },
          false,
        );
        event.preventDefault();
      })
      .on(
        "pointerup.WG_skills_window_drag pointercancel.WG_skills_window_drag",
        function (event) {
          var pointerEvent = event.originalEvent;
          if (!dragState || pointerEvent.pointerId !== dragState.pointerId) return;
          header.removeClass("WG_dragging");
          dragState = null;
          Dialog.saveSkillsWindowGeometry();
        },
      );
    if (window.ResizeObserver) {
      this.skillsWindowResizeObserver = new ResizeObserver(function () {
        if (!Dialog.element.hasClass("WG_floating_dialog")) return;
        Dialog.clampSkillsWindowGeometry();
        Dialog.positionSkillsConfirm();
        clearTimeout(Dialog.skillsWindowSaveTimer);
        Dialog.skillsWindowSaveTimer = setTimeout(function () {
          Dialog.saveSkillsWindowGeometry();
        }, 120);
      });
      this.skillsWindowResizeObserver.observe(this.element[0]);
    }
    $(window)
      .off("resize.WG_skills_window")
      .on("resize.WG_skills_window", function () {
        if (Dialog.element.hasClass("WG_floating_dialog")) {
          Dialog.clampSkillsWindowGeometry();
          Dialog.positionSkillsConfirm();
        }
      });
  },
  applySkillsWindowGeometry: function (geometry, persist) {
    if (!this.element || !this.element.length) return;
    var margin = 10,
      maxWidth = Math.max(1, window.innerWidth - margin * 2),
      maxHeight = Math.max(1, window.innerHeight - margin * 2),
      width = Math.max(Math.min(520, maxWidth), Math.min(Number(geometry.width) || 960, maxWidth)),
      height = Math.max(Math.min(360, maxHeight), Math.min(Number(geometry.height) || 720, maxHeight)),
      left = Math.max(margin, Math.min(Number(geometry.left) || margin, window.innerWidth - width - margin)),
      top = Math.max(margin, Math.min(Number(geometry.top) || margin, window.innerHeight - height - margin));
    this.element.css({
      left: left + "px",
      top: top + "px",
      width: width + "px",
      height: height + "px",
      transform: "none",
    });
    this.positionSkillsConfirm();
    persist && this.saveSkillsWindowGeometry();
  },
  restoreSkillsWindowGeometry: function () {
    var geometryKey = this.getFloatingDialogGeometryKey(),
      saved = window.localStorage.getItem(geometryKey),
      geometry = null;
    if (saved)
      try {
        geometry = JSON.parse(saved);
      } catch (error) {
        window.localStorage.removeItem(geometryKey);
      }
    if (!geometry) {
      var mainRect = $(".container")[0].getBoundingClientRect(),
        layerDepth = (this.layerStack || []).length,
        width = Math.min(mainRect.width, window.innerWidth - 32),
        height = Math.min(780, window.innerHeight - 32);
      geometry = {
        left: Math.min(
          mainRect.left + layerDepth * 12,
          window.innerWidth - width - 16,
        ),
        top: (window.innerHeight - height) / 2,
        width: width,
        height: height,
      };
    }
    this.applySkillsWindowGeometry(geometry, false);
  },
  saveSkillsWindowGeometry: function () {
    if (!this.element || !this.element.hasClass("WG_floating_dialog")) return;
    var rect = this.element[0].getBoundingClientRect();
    window.localStorage.setItem(
      this.getFloatingDialogGeometryKey(),
      JSON.stringify({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }),
    );
  },
  clampSkillsWindowGeometry: function () {
    if (!this.element || !this.element.hasClass("WG_floating_dialog")) return;
    var rect = this.element[0].getBoundingClientRect();
    this.applySkillsWindowGeometry(
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      false,
    );
  },
  activateSkillsWindow: function () {
    this.activateFloatingDialog();
  },
  activateFloatingDialog: function () {
    if (!IsWGPluginFeatureEnabled("floatingPanels")) {
      this.element.removeClass("WG_floating_dialog WG_skills_window");
      $(".content-room").addClass("hide");
      return;
    }
    this.initSkillsWindow();
    this.element.addClass("WG_floating_dialog");
    (this.curItem == "skills" || this.curItem == "master") &&
      this.element.addClass("WG_skills_window");
    this.element
      .attr("data-dialog-depth", (this.layerStack || []).length)
      .css(
        "--WG-dialog-z",
        2147483601 + (this.layerStack || []).length * 3,
      );
    $(".content-room").removeClass("hide");
    this.restoreSkillsWindowGeometry();
  },
  deactivateSkillsWindow: function () {
    this.deactivateFloatingDialog();
  },
  deactivateFloatingDialog: function () {
    if (!this.element || !this.element.hasClass("WG_floating_dialog")) return;
    this.saveSkillsWindowGeometry();
    if (typeof Confirm !== "undefined" && Confirm.isShow) Confirm.Close();
    this.element
      .removeClass("WG_floating_dialog WG_skills_window")
      .removeAttr("data-dialog-depth")
      .css({
        left: "",
        top: "",
        width: "",
        height: "",
        transform: "",
        "z-index": "",
      });
    this.element[0].style.removeProperty("--WG-dialog-z");
    $(".dialog-confirm")
      .removeClass("WG_skills_confirm")
      .css({ left: "", top: "", width: "", bottom: "" });
    this.isShow && $(".content-room").addClass("hide");
  },
  positionSkillsConfirm: function () {
    if (
      !this.element ||
      !this.element.hasClass("WG_floating_dialog") ||
      typeof Confirm === "undefined" ||
      !Confirm.isShow ||
      !Confirm.element ||
      !Confirm.element.is(":visible")
    )
      return;
    var rect = this.element[0].getBoundingClientRect(),
      inset = 12,
      confirmHeight = Confirm.element.outerHeight() || 96;
    Confirm.element
      .addClass("WG_skills_confirm")
      .css({
        left: rect.left + inset + "px",
        top: Math.max(rect.top + 54, rect.bottom - confirmHeight - inset) + "px",
        width: Math.max(280, rect.width - inset * 2) + "px",
        bottom: "auto",
      });
  },
  prepareLayerRequest: function (command, sourceElement) {
    if (!IsWGPluginFeatureEnabled("floatingPanels")) {
      this.clearLayerRequests();
      return;
    }
    var now = Date.now(),
      request = {
        command: String(command || ""),
        sourceElement: sourceElement.closest("[cmd]")[0] || sourceElement[0],
        sourceDialog: this.element && this.element[0],
        sourceItem: this.curItem,
        createdAt: now,
      };
    this.pendingLayerRequests = (this.pendingLayerRequests || []).filter(
      function (pending) {
        return now - pending.createdAt <= 2500;
      },
    );
    for (var pending of this.pendingLayerRequests)
      if (
        pending.sourceDialog === request.sourceDialog &&
        pending.sourceItem === request.sourceItem
      )
        pending.superseded = true;
    this.pendingLayerRequests.push(request);
    if (this.pendingLayerRequests.length > 12)
      this.pendingLayerRequests.splice(
        0,
        this.pendingLayerRequests.length - 12,
      );
  },
  consumeLayerRequest: function (command) {
    this.peekLayerRequest();
    var requests = this.pendingLayerRequests || [],
      index = 0;
    if (command != null) {
      index = requests.findIndex(function (pending) {
        return pending.command == command;
      });
      if (index < 0) return null;
    }
    return requests.length ? requests.splice(index, 1)[0] : null;
  },
  peekLayerRequest: function () {
    var now = Date.now();
    this.pendingLayerRequests = (this.pendingLayerRequests || []).filter(
      function (pending) {
        return now - pending.createdAt <= 2500;
      },
    );
    return this.pendingLayerRequests[0] || null;
  },
  clearLayerRequests: function () {
    this.pendingLayerRequests = [];
  },
  pushLayer: function (nextItem, pending) {
    if (!this.isShow || !this.element || !this.element.length) return false;
    this.saveSkillsWindowGeometry();
    var rect = this.element[0].getBoundingClientRect(),
      depth = (this.layerStack || []).length,
      snapshot = this.element.clone(false, false);
    snapshot
      .removeClass("dialog WG_floating_dialog WG_skills_window hide")
      .addClass("WG_dialog_snapshot")
      .attr({ "aria-hidden": "true", inert: "" })
      .css({
        left: rect.left + "px",
        top: rect.top + "px",
        width: rect.width + "px",
        height: rect.height + "px",
        zIndex: 2147483600 + depth * 3,
      })
      .insertBefore(this.element);
    var frame = {
      curItem: this.curItem,
      content: this.contentElement.contents().detach(),
      title: this.titleElement.contents().detach(),
      footer: this.footerElement.contents().detach(),
      iconClass: this.iconElement.attr("class"),
      geometry: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      snapshot: snapshot,
      returnFocus: pending && pending.sourceElement,
    };
    this.layerStack.push(frame);
    this.curItem = null;
    this.isShow = false;
    this.element.removeClass("WG_skills_window");
    this.element.addClass("hide");
    return true;
  },
  popLayer: function () {
    var frame = this.layerStack && this.layerStack.pop();
    if (!frame) return false;
    if (this.curItem && this[this.curItem]) this[this.curItem].isShow = false;
    this.contentElement.contents().detach();
    this.titleElement.empty();
    this.footerElement.empty();
    frame.snapshot.remove();
    this.contentElement.append(frame.content);
    this.titleElement.append(frame.title);
    this.footerElement.append(frame.footer);
    this.iconElement.attr("class", frame.iconClass || "dialog-icon");
    this.curItem = frame.curItem;
    this.isShow = true;
    this[this.curItem] && (this[this.curItem].isShow = true);
    this.element.removeClass("hide");
    this.activateFloatingDialog();
    this.applySkillsWindowGeometry(frame.geometry, false);
    frame.returnFocus &&
      document.documentElement.contains(frame.returnFocus) &&
      $(frame.returnFocus).trigger("focus");
    return true;
  },
  clearLayerStack: function () {
    for (var index = this.layerStack.length - 1; index >= 0; index--) {
      var frame = this.layerStack[index];
      frame.snapshot && frame.snapshot.remove();
      this[frame.curItem] && (this[frame.curItem].isShow = false);
    }
    this.layerStack = [];
  },
  hide: function () {
    if (
      Dialog.curItem &&
      Dialog[Dialog.curItem] &&
      Dialog[Dialog.curItem].hide &&
      Dialog[Dialog.curItem].hide() == false
    ) {
      return;
    }
    Dialog.close();
  },
  footerClick: function () {
    var _0x3791a3 = $(this);
    if (_0x3791a3.is(".select")) {
      return;
    }
    var _0x4eb39c = _0x3791a3.attr("for");
    _0x3791a3.parent().find(".select").removeClass("select");
    _0x3791a3.addClass("select");
    Dialog[Dialog.curItem].footerChanged(_0x4eb39c, _0x3791a3);
  },
  title: function (_0x255583) {
    Dialog.titleElement.html(_0x255583);
  },
  icon: function (_0x32898e) {
    this.iconElement.attr(
      "class",
      "dialog-icon glyphicon glyphicon-" + _0x32898e,
    );
  },
  footer: function (_0xdaa19e) {
    if (_0xdaa19e) {
      this.footerElement.html(_0xdaa19e);
    } else {
      this.footerElement.empty();
    }
  },
  close: function () {
    if (!Dialog.isShow) {
      return;
    }
    if (Dialog.layerStack && Dialog.layerStack.length) {
      return Dialog.popLayer();
    }
    Dialog.deactivateFloatingDialog();
    Dialog.clearLayerRequests();
    Process.cancelPendingDetailPopups && Process.cancelPendingDetailPopups();
    Dialog.isShow = false;
    $(".content-room").removeClass("hide");
    Dialog.element.addClass("hide");
    Process.releaseItemPopupSecondary(Dialog.element);
  },
  score: {
    footer: [
      ["属性", ".dialog-score"],
      ["详细", ".dialog-score2"],
      ["称号", ".dialog-titles"],
    ],
    selectIndex: 0,
    onData: function (_0x3ddb88) {
      console.log(_0x3ddb88);
      this.data = _0x3ddb88;
      this.init_elem();
      Dialog.titleElement.html(_0x3ddb88.name);
      Dialog.icon("user");
      if (_0x3ddb88.titles) {
        this.titles = _0x3ddb88.titles;
        this.create_titles();
      } else {
        if (_0x3ddb88.id && _0x3ddb88.id != this.uid) {
          this.uid = _0x3ddb88.id;
          if (this.uid != Process.player) {
            Dialog.footerElement.find(".footer-item:eq(2)").hide();
          } else {
            Dialog.footerElement.find(".footer-item:eq(2)").show();
          }
        }
        var _0x4e64fa = $(
          _0x3ddb88.name ? this.footer[0][1] : this.footer[1][1],
        );
        var _0x3b4542 = _0x4e64fa.find("span");
        for (var _0x46a5f3 = 0; _0x46a5f3 < _0x3b4542.length; _0x46a5f3++) {
          var _0xa64fb0 = $(_0x3b4542[_0x46a5f3]);
          var _0x4688f3 = _0xa64fb0.attr("data-prop");
          if (_0x4688f3) {
            _0xa64fb0.html(_0x3ddb88[_0x4688f3] || 0);
          }
        }
      }
    },
    init_elem: function () {
      Dialog.init();
      Dialog.curItem = "score";
      if (this.isShow) {
        return;
      }
      Dialog.footer("");
      for (var _0x27424e = 0; _0x27424e < this.footer.length; _0x27424e++) {
        var _0xc57e1f = $(
          "<span class='footer-item " +
            (this.selectIndex == _0x27424e ? "select" : "") +
            "' for='" +
            _0x27424e +
            "'>" +
            this.footer[_0x27424e][0] +
            "</span>",
        ).appendTo(Dialog.footerElement);
        this.footer[_0x27424e][1] = $(this.footer[_0x27424e][1]);
      }
      this.isShow = true;
      this.footerChanged(this.selectIndex);
    },
    show: function (_0x44b140) {
      if (_0x44b140) {
        return;
      }
      if (!this.selectIndex) {
        SendCommand("score");
      } else if (this.selectIndex == 1) {
        SendCommand("score2");
      } else {
        SendCommand("score title");
      }
      this.init_elem();
    },
    close: function () {
      this.footer[this.selectIndex][1].remove();
      Dialog.footer("");
      this.isShow = false;
    },
    footerChanged: function (_0x59cfe1) {
      var _0x1b399f = this.data;
      _0x59cfe1 = parseInt(_0x59cfe1);
      this.footer[this.selectIndex][1].remove();
      this.selectIndex = _0x59cfe1;
      var _0xd72a5a = $(this.footer[this.selectIndex][1]).appendTo(
        Dialog.contentElement.empty(),
      );
      if (_0x59cfe1 == 1) {
        if (this.uid && Process.player != this.uid) {
          SendCommand("score2 " + this.uid);
        } else {
          SendCommand("score2");
        }
      } else if (_0x59cfe1 == 2) {
        if (!this.titles) {
          SendCommand("score title");
        }
        _0xd72a5a.on(
          "click",
          ".btn-noused",
          function (_0x491e36) {
            var _0x5d6551 = $(_0x491e36.target);
            if (_0x5d6551.is("red")) {
              _0x5d6551 = _0x5d6551.parent();
            }
            var _0x46fc4e = parseInt(_0x5d6551.attr("index"));
            for (
              var _0x377a93 = 0;
              _0x377a93 < this.titles.length;
              _0x377a93++
            ) {
              if (_0x377a93 == _0x46fc4e) {
                this.titles[_0x377a93].use = this.titles[_0x377a93].use
                  ? false
                  : true;
              } else {
                this.titles[_0x377a93].use = false;
              }
            }
            SendCommand("title " + _0x46fc4e);
            this.create_titles();
          }.bind(this),
        );
      }
    },
    create_titles: function () {
      var _0x48d53b = $(".dialog-titles");
      var _0x966a38 = [];
      for (var _0x33e5b0 = 0; _0x33e5b0 < this.titles.length; _0x33e5b0++) {
        _0x966a38.push(
          "<div class='title-item",
          this.titles[_0x33e5b0].use ? " selected" : "",
          "'>",
        );
        _0x966a38.push(this.titles[_0x33e5b0].title);
        _0x966a38.push("<span class='btn-noused' index='");
        _0x966a38.push(_0x33e5b0);
        _0x966a38.push("'>");
        _0x966a38.push(this.titles[_0x33e5b0].use ? "<red>取消</red>" : "使用");
        _0x966a38.push("</span>");
        _0x966a38.push("</div>");
      }
      _0x48d53b.html(
        _0x966a38.length
          ? _0x966a38.join("")
          : "<div class='empty'>你还没有获得任何称号</div>",
      );
    },
  },
  map: {
    onData: function (_0x31b79c) {
      $(".WG_map_modal_title").html(_0x31b79c.title || "地图");
    },
    show: function () {
      Dialog.close();
      MAP.LoadMap();
    },
    hide: function () {
      MAP.CloseModal();
    },
    close: function () {
      MAP.CloseModal();
    },
  },
};
const ClientDialogSkills = unsafeWindow.WSMudClient.createModule("dialog-skills", {
  getDialog: () => Dialog,
  getProcess: () => Process,
  getSendCommand: () => SendCommand,
  getJQuery: () => $,
  getCheckScroll: () => checkScroll,
  getWrapName: () => wrap_name,
  getExtend: () => Dialog.extend,
  getScript: () => SCRIPT,
  getSetting: () => Setting,
});
Dialog.skills = ClientDialogSkills.skills;
Dialog.master = ClientDialogSkills.master;
const ClientSkillCalculator = unsafeWindow.WSMudClient.createModule("skill-calculator", {
  jquery: $,
  getDialog: function () { return Dialog; },
  getGameState: function () {
    return typeof G !== "undefined" ? G : window.G || {};
  },
  getWrapName: function () { return wrap_name; },
});
var SKILL_TRAINING_FORMULA_PARAMS =
  ClientSkillCalculator.SKILL_TRAINING_FORMULA_PARAMS;
function ParseSkillTrainingEfficiency(value) {
  return ClientSkillCalculator.ParseSkillTrainingEfficiency(value);
}
function CalculateSkillTrainingCost(options) {
  return ClientSkillCalculator.CalculateSkillTrainingCost(options);
}
function FormatSkillTrainingDuration(minutes) {
  return ClientSkillCalculator.FormatSkillTrainingDuration(minutes);
}
Dialog.skillcalc = ClientSkillCalculator.skillcalc;
Dialog.pack = {
  close: Dialog.skills.close,
  hide: Dialog.skills.hide,
  command_before: "",
  updateitem: function (_0x3ee572) {
    if (_0x3ee572.money != undefined) {
      this.money = _0x3ee572.money;
      this.show_moeny();
    }
    if (_0x3ee572.eq_group !== undefined) {
      this.eq_group = _0x3ee572.eq_group;
      this.show_moeny();
    } else if (_0x3ee572.eq != undefined && this.items) {
      for (var _0x4bc416 = 0; _0x4bc416 < this.items.length; _0x4bc416++) {
        if (this.items[_0x4bc416].id == _0x3ee572.id) {
          this.eqs[_0x3ee572.eq] = this.items[_0x4bc416];
          this.items.splice(_0x4bc416, 1);
          break;
        }
      }
      this.show_items();
    } else if (_0x3ee572.uneq != undefined && this.items) {
      var _0x33f22 = this.eqs[_0x3ee572.uneq];
      _0x33f22.can_eq = 1;
      _0x33f22.count = 1;
      this.items.push(_0x33f22);
      this.eqs[_0x3ee572.uneq] = null;
      this.show_items();
    } else if (_0x3ee572.locked >= 0) {
      let _0x582111 = this.get_item(_0x3ee572.id);
      if (_0x582111) {
        _0x582111.is_lock = _0x3ee572.locked;
        let _0x2140ea = this.packElement.find(
          '[oindex="' + _0x3ee572.id + '"]',
        );
        if (_0x582111.is_lock) {
          _0x2140ea.addClass("lock");
        } else {
          _0x2140ea.removeClass("lock");
        }
      }
    } else if (_0x3ee572.jldesc) {
      var _0x4445cf = [];
      _0x4445cf.push(_0x3ee572.jldesc);
      _0x4445cf.push("<span class='item-commands'>");
      _0x4445cf.push(
        '<span cmd="' +
          this.command_before +
          "jinglian " +
          _0x3ee572.id +
          ' ok">精炼</span>',
      );
      _0x4445cf.push(
        '<span cmd="' +
          this.command_before +
          "jinglian " +
          _0x3ee572.id +
          ' full">精炼到满级</span>',
      );
      _0x4445cf.push("</span>");
      this.show_sub(_0x4445cf.join(""));
    } else if (_0x3ee572.xqdesc) {
      var _0x4445cf = [];
      _0x4445cf.push(_0x3ee572.xqdesc);
      _0x4445cf.push("<span class='item-commands'>");
      for (
        var _0x4bc416 = 0;
        _0x4bc416 < _0x3ee572.stones.length;
        _0x4bc416++
      ) {
        var _0xdf85d6 = _0x3ee572.stones[_0x4bc416];
        _0x4445cf.push(
          '<span cmd="' +
            this.command_before +
            "xiangqian " +
            _0x3ee572.id +
            " " +
            _0xdf85d6.id +
            '">镶嵌' +
            _0xdf85d6.name +
            "</span><br/>",
        );
      }
      _0x4445cf.push("</span>");
      this.show_sub(_0x4445cf.join(""));
    } else if (_0x3ee572.desc) {
      var _0x4445cf = [];
      _0x4445cf.push(_0x3ee572.desc);
      _0x4445cf.push("<span class='item-commands'>");
      var _0x22eedc = _0x3ee572.from;
      if (_0x22eedc == "eq") {
        _0x4445cf.push(
          '<span cmd="' +
            this.command_before +
            "uneq " +
            _0x3ee572.id +
            '">取消装备</span>',
        );
      } else if (_0x22eedc == "item") {
        var _0x36ebb8 = this.get_item(_0x3ee572.id);
        SCRIPT.LAST_OBJ = _0x36ebb8;
        if (_0x36ebb8) {
          this.create_item_command(_0x36ebb8, _0x4445cf, _0x3ee572.commands);
        }
      } else if (_0x22eedc == "store") {
        _0x4445cf.push(
          '<span cmd="_confirm qu ' + _0x3ee572.id + '">取出</span>',
        );
      } else if (_0x22eedc == "sj") {
        _0x4445cf.push(
          '<span cmd="_confirm qu ' + _0x3ee572.id + '">取出</span>',
        );
      } else {
        _0x4445cf.push(
          '<span cmd="_confirm buy 1 ' +
            _0x3ee572.id +
            " from " +
            Dialog.list.seller +
            '">购买</span>',
        );
      }
      _0x4445cf.push("</span>");
      this.show_sub(_0x4445cf.join(""));
    } else if (_0x3ee572.remove && this.items) {
      var _0x188f67 = this.items;
      for (var _0x4bc416 = 0; _0x4bc416 < _0x188f67.length; _0x4bc416++) {
        if (_0x188f67[_0x4bc416].id == _0x3ee572.id) {
          if (_0x3ee572.remove >= _0x188f67[_0x4bc416].count) {
            _0x188f67.splice(_0x4bc416, 1);
            Combat.DisObj(_0x3ee572);
          } else {
            _0x188f67[_0x4bc416].count -= _0x3ee572.remove;
          }
          break;
        }
      }
      if (this.isShow) {
        this.show_items();
      } else {
        return false;
      }
    } else if (_0x3ee572.name && this.items) {
      var _0x33f22 = this.get_item(_0x3ee572.id);
      if (_0x33f22) {
        _0x33f22.count = _0x3ee572.count;
        _0x33f22.name = _0x3ee572.name;
      } else {
        this.items.push(_0x3ee572);
      }
      if (this.isShow) {
        this.show_items();
      } else {
        return false;
      }
    } else if (_0x3ee572.max_item_count) {
      this.max_count = _0x3ee572.max_item_count;
      ReceiveMessage(
        (Dialog.pack2.isShow ? Dialog.pack2.target_name : "你") +
          "的背包容量扩充为" +
          this.max_count +
          "。",
      );
      this.show_items();
    } else {
      return false;
    }
    return true;
  },
  get_item: function (_0x4380dc, _0x2225c9) {
    _0x2225c9 = _0x2225c9 || this.items;
    if (!_0x2225c9) {
      return;
    }
    for (var _0x3ded5a = 0; _0x3ded5a < _0x2225c9.length; _0x3ded5a++) {
      if (_0x2225c9[_0x3ded5a] && _0x2225c9[_0x3ded5a].id == _0x4380dc) {
        return _0x2225c9[_0x3ded5a];
      }
    }
  },
  show_sub: function (_0x50859a) {
    if (this.objelement) {
      this.objelement.remove();
    }
    var _0x4b45b0 = this.packElement;
    if (Dialog.list.isShow) {
      _0x4b45b0 = Dialog.list.rightElement;
    }
    this.objelement = $("<pre class='obj-desc'>" + _0x50859a + "</pre>")
      .appendTo(_0x4b45b0.parent())
      .on(
        "click",
        function () {
          this.objelement.remove();
          this.objelement = null;
          _0x4b45b0.show();
        }.bind(this),
      );
    _0x4b45b0.hide();
  },
  onData: function (_0xfc7ce6) {
    if (_0xfc7ce6.items) {
      this.eqs = this.formatEqs(_0xfc7ce6.eqs || []);
      this.money = _0xfc7ce6.money;
      this.eq_group = _0xfc7ce6.eq_group;
      this.items = this.formatItems(_0xfc7ce6.items);
      this.max_count = _0xfc7ce6.max_item_count;
      if (this.isShow) {
        this.show_items();
        this.show_moeny();
      }
    } else {
      if (Dialog.pack2.isShow && !_0xfc7ce6.name) {
        return Dialog.pack2.onData(_0xfc7ce6);
      }
      if (this.updateitem(_0xfc7ce6)) {
        return;
      }
    }
    if (!this.isShow) {
      if (Dialog.list.isShow) {
        return Dialog.list.update_pack(_0xfc7ce6);
      }
      if (Dialog.trade.isShow) {
        return Dialog.trade.update_pack(_0xfc7ce6);
      }
    }
  },
  formatItems: function (_0x4a06fb) {
    let _0x354bc6 = [];
    for (let _0x3ec440 of _0x4a06fb) {
      _0x354bc6.push({
        name: _0x3ec440[0],
        id: _0x3ec440[1],
        count: _0x3ec440[2],
        grade: _0x3ec440[3],
        unit: _0x3ec440[4],
        value: _0x3ec440[5],
        can_eq: _0x3ec440[6],
        can_use: _0x3ec440[7],
        can_study: _0x3ec440[8],
        can_open: _0x3ec440[9],
        can_combine: _0x3ec440[10],
        is_lock: _0x3ec440[11],
      });
    }
    return _0x354bc6;
  },
  formatEqs: function (_0x529e0f) {
    let _0x47ac9c = [];
    for (let _0x57fc02 of _0x529e0f) {
      if (!_0x57fc02) {
        _0x47ac9c.push(_0x57fc02);
      } else {
        _0x47ac9c.push({
          name: _0x57fc02[0],
          id: _0x57fc02[1],
          grade: _0x57fc02[2],
          can_use: _0x57fc02[3],
          is_lock: _0x57fc02[4],
        });
      }
    }
    return _0x47ac9c;
  },
  show_moeny: function () {
    if (!this.isShow) {
      return;
    }
    let _0x774a01 = moneyToStr(this.money);
    let _0x3992fa = [];
    for (let _0x525ec9 = 0; _0x525ec9 < 3; _0x525ec9++) {
      _0x3992fa.push(
        '<span class="footer-item eq-group',
        _0x525ec9 === this.eq_group ? " select" : "",
        '" for="',
        _0x525ec9 + 1,
        '">',
        _0x525ec9 + 1,
        "</span>",
      );
    }
    _0x3992fa.push("<div class='obj-money'>");
    if (this.packElement.is(".cleanup")) {
      _0x3992fa.push("<span for='cancle' class='footer-item'>取消</span>");
      _0x3992fa.push("<span for='store' class='footer-item'>自动存仓</span>");
      _0x3992fa.push("<span for='sell' class='footer-item'>清理杂物</span>");
      _0x3992fa.push(
        "<span for='cleanup' class='footer-item'>确定</span></div>",
      );
    } else {
      _0x3992fa.push(
        "你",
        _0x774a01 ? "身上有" + _0x774a01 : "身上没有任何银两",
      );
      _0x3992fa.push(
        "<span for='cleanup' class='footer-item'>整理包裹</span></div>",
      );
    }
    Dialog.footer(_0x3992fa.join(""));
  },
  cleanup_cmds: {
    cleanup: true,
    cancle: true,
    store: true,
    sell: true,
  },
  footerChanged: function (_0x1a7872, _0x56a589) {
    if (this.cleanup_cmds[_0x1a7872]) {
      return this.cleanup(_0x1a7872, _0x56a589);
    }
    let _0x3f3e81 = parseInt(_0x1a7872) - 1;
    if (!(_0x3f3e81 >= 0) || !(_0x3f3e81 < 3)) {
      return;
    }
    SendCommand("eqgroup " + _0x3f3e81);
  },
  cleanup: function (_0x4e99c0, _0x787752) {
    let _0x4e00e9 = this;
    _0x787752.removeClass("select");
    if (_0x4e00e9.packElement.is(".cleanup")) {
      if (_0x4e99c0 == "cleanup") {
        _0x4e00e9.packElement
          .find(".obj-item>.selected")
          .each(this.cleanup_item);
      } else if (_0x4e99c0 == "store") {
        SendCommand((this.command_before ?? "") + "store all");
      } else if (_0x4e99c0 == "sell") {
        SendCommand((this.command_before ?? "") + "sell all");
      }
      _0x4e00e9.packElement.removeClass("cleanup");
      this.show_moeny();
    } else {
      _0x4e00e9.packElement.find(".item-commands").remove();
      _0x4e00e9.packElement.addClass("cleanup");
      _0x4e00e9.show_items();
      this.show_moeny();
    }
  },
  cleanup_item: function (_0x2116b2, _0x11d162) {
    let _0x238887 = $(_0x11d162);
    let _0x4cde66 = _0x238887.parent().attr("oindex");
    let _0x29da09 = _0x238887.attr("cmd");
    SendCommand(_0x29da09 + " " + _0x4cde66);
  },
  show_items: function () {
    if (!this.packElement) {
      return;
    }
    this.createItems();
    this.create_eqs();
    Dialog.icon("briefcase");
    var _0x1bcc20 = this.target_name || "你";
    Dialog.title(
      this.items && this.items.length
        ? _0x1bcc20 +
            "身上共有" +
            this.items.length +
            "/" +
            this.max_count +
            "件物品"
        : _0x1bcc20 + "身上没有任何东西",
    );
  },
  init_element: function () {
    if (!this.element) {
      this.element = $(
        '<div class="dialog-pack"><div class="eq-list"><div class="eq-item"><span class="eq-type">武器</span><span class="eq-name"></span></div><div class="eq-item"><span class="eq-type">衣服</span><span class="eq-name"></span></div > <div class="eq-item"><span class="eq-type">鞋</span><span class="eq-name"></span></div> <div class="eq-item"><span class="eq-type">头部</span><span class="eq-name"></span></div> <div class="eq-item"><span class="eq-type">披风</span><span class="eq-name"></span></div> <div class="eq-item"><span class="eq-type">戒指</span><span class="eq-name"></span></div> <div class="eq-item"><span class="eq-type">项链</span><span class="eq-name"></span></div> <div class="eq-item"><span class="eq-type">饰品</span><span class="eq-name"></span></div> <div class="eq-item"><span class="eq-type">护腕</span><span class="eq-name"></span></div><div class="eq-item"><span class="eq-type">腰带</span><span class="eq-name"></span></div><div class="eq-item"><span class="eq-type">暗器</span><span class="eq-name"></span></div></div><div class="obj-list"></div></div>',
      );
      this.packElement = this.element.find(".obj-list");
      this.eqElement = this.element.find(".eq-list");
    }
  },
  show: function () {
    if (!Dialog.isShow) {
      Dialog.show();
    }
    if (this.objelement) {
      this.objelement.remove();
      this.objelement = null;
      if (this.packElement) {
        this.packElement.show();
      }
    }
    if (this.isShow) {
      return SendCommand(this.items ? "pack none" : "pack");
    }
    this.isShow = true;
    this.init_element();
    this.packElement.on("click", ".obj-item", Dialog.pack.item_click);
    this.eqElement.on("click", ".eq-item", Dialog.pack.eqitem_click);
    this.packElement.removeClass("cleanup");
    this.element.appendTo(Dialog.contentElement);
    if (!this.items) {
      SendCommand("pack");
    } else {
      SendCommand("pack none");
      this.show_items();
    }
  },
  create_eqs: function () {
    var _0x397d47 = this.eqElement.children();
    for (var _0x1ed610 = 0; _0x1ed610 < _0x397d47.length; _0x1ed610++) {
      var _0x1cc0a4 = this.eqs[_0x1ed610];
      if (_0x1cc0a4) {
        $(_0x397d47[_0x1ed610])
          .attr("class", "eq-item grade" + _0x1cc0a4.grade)
          .attr("oindex", _0x1ed610)
          .find(".eq-name")
          .html(_0x1cc0a4.name);
      } else {
        $(_0x397d47[_0x1ed610])
          .attr("class", "eq-item empty")
          .attr("oindex", "")
          .find(".eq-name")
          .html("");
      }
    }
  },
  levels: {
    wht: 0,
    hig: 1,
    hic: 2,
    hiy: 3,
    hiz: 4,
    hio: 5,
    ord: 6,
  },
  sort_items: function (_0x2fe6b4) {
    if (!_0x2fe6b4 || !Setting.auto_sortitem) {
      return _0x2fe6b4;
    }
    var _0x3ed2b6 = [];
    for (var _0x378ab1 = 0; _0x378ab1 < _0x2fe6b4.length; _0x378ab1++) {
      var _0x2c07fb = _0x2fe6b4[_0x378ab1];
      var _0x41b032 = false;
      for (var _0x37892c = 0; _0x37892c < _0x3ed2b6.length; _0x37892c++) {
        if (_0x2c07fb.grade < _0x3ed2b6[_0x37892c].grade) {
          _0x3ed2b6.splice(_0x37892c, 0, _0x2c07fb);
          _0x41b032 = true;
          break;
        }
      }
      if (!_0x41b032) {
        _0x3ed2b6.push(_0x2c07fb);
      }
    }
    return _0x3ed2b6;
  },
  createItems: function () {
    if (!this.items) {
      return;
    }
    var _0x9c7f01 = Dialog.pack.sort_items(this.items);
    var _0xdddb7f = [];
    let _0x5129de = this.packElement?.is(".cleanup");
    for (var _0x36da83 = 0; _0x36da83 < this.max_count; _0x36da83++) {
      var _0x255f93 = _0x9c7f01[_0x36da83];
      if (_0x255f93) {
        _0xdddb7f.push(
          '<div class="obj-item ',
          _0x255f93.is_lock ? "lock " : "",
          "grade",
          _0x255f93.grade,
          '" oindex="',
        );
        _0xdddb7f.push(_0x255f93.id);
        _0xdddb7f.push('">');
        _0xdddb7f.push(_0x255f93.name);
        if (this.show_type == 1) {
          _0xdddb7f.push("<span class='obj-value'>");
          _0xdddb7f.push("每");
          _0xdddb7f.push(_0x255f93.unit);
          _0xdddb7f.push(moneyToStr(_0x255f93.value));
          _0xdddb7f.push("：");
          _0xdddb7f.push(_0x255f93.count);
          _0xdddb7f.push(_0x255f93.unit);
          _0xdddb7f.push("</span>");
        } else if (_0x255f93.count > 1) {
          _0xdddb7f.push("<span class='obj-value'>");
          _0xdddb7f.push(_0x255f93.count);
          _0xdddb7f.push(_0x255f93.unit);
          _0xdddb7f.push("</span>");
        }
        if (_0x5129de) {
          if (_0x255f93.grade > 0) {
            _0xdddb7f.push(
              "<span cmd='store' class='obj-oper",
              _0x255f93.can_study ? " selected" : " ",
              "'>存仓库</span>",
            );
          }
          if (
            _0x255f93.can_combine &&
            _0x255f93.count >= _0x255f93.can_combine
          ) {
            _0xdddb7f.push("<span cmd='combine' class='obj-oper'>合成</span>");
          }
          if (this.target_name) {
            _0xdddb7f.push(
              "<span cmd='give ",
              Process.player,
              " ",
              _0x255f93.count,
              "' class='obj-oper'>拿来</span>",
            );
          }
          if (_0x255f93.can_eq && _0x255f93.grade > 0) {
            _0xdddb7f.push("<span cmd='sell' class='obj-oper'>卖掉</span>");
            _0xdddb7f.push("<span cmd='fenjie' class='obj-oper'>分解</span>");
          } else if (_0x255f93.value > 0) {
            _0xdddb7f.push("<span cmd='sell' class='obj-oper'>卖掉</span>");
          } else if (!_0x255f93.grade) {
            _0xdddb7f.push("<span cmd='drop' class='obj-oper'>丢掉</span>");
          }
        }
      } else {
        _0xdddb7f.push('<div class="obj-item" oindex="">');
      }
      _0xdddb7f.push("</div>");
    }
    this.packElement.html(_0xdddb7f.join(""));
  },
  create_item_command: function (_0x2a2239, _0x4b9620, _0x2b04d3) {
    _0x4b9620.push(
      '<span cmd="_confirm ' +
        this.command_before +
        "drop " +
        _0x2a2239.count +
        " " +
        _0x2a2239.id +
        '">丢掉</span>',
    );
    _0x4b9620.push(
      '<span cmd="lockobj ' + _0x2a2239.id + '">',
      _0x2a2239.is_lock ? "解锁" : "锁定",
      "</span>",
    );
    if (_0x2a2239.can_eq) {
      _0x4b9620.push(
        '<span cmd="' +
          this.command_before +
          "eq " +
          _0x2a2239.id +
          '">装备</span>',
      );
      if (!this.command_before) {
        _0x4b9620.push('<span cmd="jinglian ' + _0x2a2239.id + '">精炼</span>');
        _0x4b9620.push(
          '<span cmd="xiangqian ' + _0x2a2239.id + '">镶嵌</span>',
        );
        _0x4b9620.push(
          '<span cmd="shortcut ' + _0x2a2239.id + '">设置快速装备</span>',
        );
      }
      _0x4b9620.push(
        '<span cmd="' +
          this.command_before +
          "fenjie " +
          _0x2a2239.id +
          '">分解</span>',
      );
    }
    if (_0x2a2239.can_use) {
      _0x4b9620.push(
        '<span cmd="' +
          this.command_before +
          "use " +
          _0x2a2239.id +
          '">使用</span>',
      );
      if (!_0x2a2239.can_eq && !this.command_before) {
        _0x4b9620.push(
          '<span cmd="shortcut ' + _0x2a2239.id + '">设置快速使用</span>',
        );
      }
    }
    if (_0x2a2239.can_open) {
      _0x4b9620.push(
        '<span cmd="' +
          this.command_before +
          "open " +
          _0x2a2239.id +
          '">打开</span>',
      );
    }
    if (_0x2a2239.can_study) {
      _0x4b9620.push(
        '<span cmd="' +
          this.command_before +
          "study " +
          _0x2a2239.id +
          '">学习</span>',
      );
    }
    if (_0x2a2239.can_combine && _0x2a2239.count >= _0x2a2239.can_combine) {
      _0x4b9620.push(
        '<span cmd="_confirm ' +
          this.command_before +
          "combine " +
          _0x2a2239.id +
          " " +
          _0x2a2239.can_combine +
          '">合成</span>',
      );
    }
    if (this.command_before) {
      _0x4b9620.push(
        '<span cmd="_confirm ' +
          this.command_before +
          "give " +
          Process.player +
          " " +
          _0x2a2239.count +
          " " +
          _0x2a2239.id +
          '">拿来</span>',
      );
    }
    _0x2b04d3 = _0x2b04d3 || [];
    Dialog.extend.append(_0x2b04d3, "pack", _0x2a2239);
    for (var _0x48d2a5 = 0; _0x48d2a5 < _0x2b04d3.length; _0x48d2a5++) {
      if (_0x2b04d3[_0x48d2a5].extend) {
        _0x4b9620.push(
          '<span cmd="',
          _0x2b04d3[_0x48d2a5].cmd,
          '">',
          _0x2b04d3[_0x48d2a5].name,
          "</span>",
        );
      } else {
        _0x4b9620.push(
          '<span cmd="packitem ',
          _0x2b04d3[_0x48d2a5].cmd,
          " ",
          _0x2a2239.id,
          '">',
          _0x2b04d3[_0x48d2a5].name,
          "</span>",
        );
      }
    }
  },
  item_click: function (_0x9bdc41) {
    let _0x1be2ce = $(_0x9bdc41.target);
    let _0x56c6f6 = Dialog.pack.packElement.is(".cleanup");
    if (_0x56c6f6 && _0x1be2ce.is(".obj-oper")) {
      return Dialog.pack.item_cleanup(_0x1be2ce);
    }
    _0x1be2ce = $(this);
    var _0x50f096 = _0x1be2ce.attr("oindex");
    if (!_0x50f096) {
      return;
    }
    var _0x563af6 = Dialog.pack.get_item(_0x50f096);
    Dialog.pack.packElement.find(".item-commands").remove();
    if (!_0x563af6) {
      return;
    }
    SCRIPT.LAST_OBJ = _0x563af6;
    var _0x4bb373 = ["<span class='item-commands'>"];
    _0x4bb373.push(
      '<span cmd="checkobj ' + _0x563af6.id + ' from item">查看</span>',
    );
    Dialog.pack.create_item_command(_0x563af6, _0x4bb373);
    _0x4bb373.push("</span>");
    _0x1be2ce = $(_0x4bb373.join("")).insertAfter(_0x1be2ce);
    checkScroll(_0x1be2ce);
  },
  eqitem_click: function () {
    var _0x279b5b = Dialog.pack.eqs[$(this).attr("oindex")];
    if (!_0x279b5b) {
      return;
    }
    IsWGPluginFeatureEnabled("characterPopup") &&
      Process.prepareDetailPopup(
        "checkobj " + _0x279b5b.id + " from eq",
        $(this),
      );
    SendCommand("checkobj " + _0x279b5b.id + " from eq");
  },
  item_cleanup: function (_0x3a2692) {
    if (_0x3a2692.is(".selected")) {
      _0x3a2692.removeClass("selected");
    } else {
      _0x3a2692.parent().find(".selected").removeClass("selected");
      _0x3a2692.addClass("selected");
    }
    return false;
  },
};
function checkScroll(_0x377dfa) {
  const _0x31c03c = _0x377dfa.parent();
  const _0x188ee7 = _0x31c03c[0].getBoundingClientRect();
  const _0x3f65ce = _0x377dfa[0].getBoundingClientRect();
  const _0x3c264d =
    _0x3f65ce.top >= _0x188ee7.top && _0x3f65ce.bottom <= _0x188ee7.bottom;
  if (!_0x3c264d) {
    const _0x2b9634 =
      _0x31c03c.scrollTop() + (_0x3f65ce.bottom - _0x188ee7.bottom);
    _0x31c03c[0].scrollTop = _0x2b9634;
  }
}
Dialog.pack2 = {
  onData: function (_0x38c253) {
    this.show();
    if (_0x38c253.items) {
      this.eqs = this.formatEqs(_0x38c253.eqs || []);
      this.money = _0x38c253.money;
      this.id = _0x38c253.id;
      this.command_before = "dc " + this.id + " ";
      this.items = this.formatItems(_0x38c253.items);
      this.target_name = _0x38c253.name;
      this.max_count = _0x38c253.max_item_count;
      this.show_items();
      this.show_moeny();
    } else {
      this.updateitem(_0x38c253);
    }
  },
  cleanup_cmds: Dialog.pack.cleanup_cmds,
  formatEqs: Dialog.pack.formatEqs,
  formatItems: Dialog.pack.formatItems,
  createItems: Dialog.pack.createItems,
  create_eqs: Dialog.pack.create_eqs,
  init_element: Dialog.pack.init_element,
  show_items: Dialog.pack.show_items,
  updateitem: Dialog.pack.updateitem,
  footerChanged: Dialog.pack.footerChanged,
  cleanup: Dialog.pack.cleanup,
  show_moeny: function () {
    if (!this.isShow) {
      return;
    }
    let _0xd61475 = moneyToStr(this.money);
    let _0x5d3e02 = [];
    _0x5d3e02.push("<div class='obj-money'>");
    if (this.packElement.is(".cleanup")) {
      _0x5d3e02.push("<span for='cancle' class='footer-item'>取消</span>");
      _0x5d3e02.push("<span for='store' class='footer-item'>自动存仓</span>");
      _0x5d3e02.push("<span for='sell' class='footer-item'>清理杂物</span>");
      _0x5d3e02.push(
        "<span for='cleanup' class='footer-item'>确定</span></div>",
      );
    } else {
      _0x5d3e02.push(
        this.target_name,
        _0xd61475 ? "身上有" + _0xd61475 : "身上没有任何银两",
      );
      _0x5d3e02.push(
        "<span for='cleanup' class='footer-item'>整理</span></div>",
      );
    }
    Dialog.footer(_0x5d3e02.join(""));
  },
  cleanup_item: function (_0x386c5f, _0x4404d5) {
    let _0x2e8866 = $(_0x4404d5);
    let _0x285b3d = _0x2e8866.parent().attr("oindex");
    let _0x75d756 = _0x2e8866.attr("cmd");
    SendCommand(
      Dialog.pack2.command_before + " " + _0x75d756 + " " + _0x285b3d,
    );
  },
  show_sub: Dialog.pack.show_sub,
  close: Dialog.skills.close,
  hide: function () {
    this.element.remove();
    this.isShow = false;
  },
  get_item: Dialog.pack.get_item,
  create_item_command: Dialog.pack.create_item_command,
  show: function () {
    if (!Dialog.isShow) {
      Dialog.show("pack2");
    }
    if (this.objelement) {
      this.objelement.remove();
      this.objelement = null;
      if (this.packElement) {
        this.packElement.show();
      }
    }
    if (this.isShow) {
      return;
    }
    this.isShow = true;
    this.init_element();
    this.packElement.on("click", ".obj-item", this.item_click);
    this.eqElement.on("click", ".eq-item", this.eqitem_click);
    this.element.appendTo(Dialog.contentElement);
  },
  item_click: function (_0x2ceaf3) {
    let _0x4e45d4 = $(_0x2ceaf3.target);
    let _0x536620 = Dialog.pack2.packElement.is(".cleanup");
    if (_0x536620 && _0x4e45d4.is(".obj-oper")) {
      return Dialog.pack.item_cleanup(_0x4e45d4);
    }
    _0x4e45d4 = $(this);
    var _0x408781 = _0x4e45d4.attr("oindex");
    if (!_0x408781) {
      return;
    }
    var _0x5e2229 = Dialog.pack2.get_item(_0x408781);
    Dialog.pack2.element.find(".item-commands").remove();
    if (!_0x5e2229) {
      return;
    }
    SCRIPT.LAST_OBJ = _0x5e2229;
    var _0x3dae53 = ["<span class='item-commands'>"];
    _0x3dae53.push(
      '<span cmd="' +
        Dialog.pack2.command_before +
        " checkobj " +
        _0x5e2229.id +
        ' from item">查看</span>',
    );
    Dialog.pack2.create_item_command(_0x5e2229, _0x3dae53);
    _0x3dae53.push("</span>");
    _0x4e45d4 = $(_0x3dae53.join("")).insertAfter(_0x4e45d4);
    checkScroll(_0x4e45d4);
  },
  eqitem_click: function () {
    var _0x2ed954 = Dialog.pack2.eqs[$(this).attr("oindex")];
    if (!_0x2ed954) {
      return;
    }
    IsWGPluginFeatureEnabled("characterPopup") &&
      Process.prepareDetailPopup(
        Dialog.pack2.command_before +
          " checkobj " +
          _0x2ed954.id +
          " from eq",
        $(this),
      );
    SendCommand(
      Dialog.pack2.command_before + " checkobj " + _0x2ed954.id + " from eq",
    );
  },
};
Dialog.trade = {
  hide: function () {
    this.element.remove();
    this.isShow = false;
  },
  close: function () {
    this.hide();
  },
  onData: function (_0x4c555a) {
    if (!this.isShow) {
      Dialog.show("trade");
    }
    Dialog.title("和" + _0x4c555a.name + "交易中");
    var _0x3b35d1 = Dialog.pack.items;
    this.trade_target = _0x4c555a.target;
    this.trade_list.length = 0;
    if (!Dialog.pack.items) {
      SendCommand("pack");
    } else {
      this.update_pack();
    }
    Dialog.pack.isShow = false;
    this.create_items(
      this.leftElement.empty(),
      this.trade_list,
      this.max_count,
    );
  },
  update_pack: function (_0xa735f0) {
    this.create_items(
      this.rightElement.empty(),
      Dialog.pack.items,
      Dialog.pack.max_count,
    );
  },
  max_count: 10,
  trade_list: [],
  show: function (_0x539220) {
    if (this.isShow) {
      return;
    }
    Dialog.init();
    Dialog.curItem = "trade";
    if (!this.element) {
      this.element = $(
        '<div class="dialog-list"><div class="obj-list"></div><div class="obj-list"></div></div >',
      );
      this.leftElement = $(this.element.children()[0]);
      this.rightElement = $(this.element.children()[1]);
    }
    this.leftElement.on("click", ".obj-item", this.left_click);
    this.rightElement.on("click", ".obj-item", this.right_click);
    this.element.appendTo(Dialog.contentElement.empty());
    this.create_footer();
    this.isShow = true;
  },
  create_footer: function () {
    var _0x297b2c = ["<div class='item-commands'>"];
    _0x297b2c.push("<span cmd='_trade ok'>确定</span>");
    _0x297b2c.push("<span  cmd='_trade cancle'>取消</span>");
    _0x297b2c.push("</div>");
    Dialog.footer(_0x297b2c.join(""));
  },
  confirm: function (_0x864ab5) {
    if (_0x864ab5 === "ok" && this.trade_list.length) {
      for (var _0x258bbf = 0; _0x258bbf < this.trade_list.length; _0x258bbf++) {
        SendCommand(
          "give " +
            this.trade_target +
            " " +
            this.trade_list[_0x258bbf].count +
            " " +
            this.trade_list[_0x258bbf].id,
        );
      }
    }
    Dialog.hide();
  },
  create_items: function (_0x466c10, _0x357db9, _0x2713ad) {
    var _0x1c5d5d = [];
    _0x357db9 = Dialog.pack.sort_items(_0x357db9);
    for (var _0x489e4b = 0; _0x489e4b < _0x2713ad; _0x489e4b++) {
      var _0x54421b = _0x357db9[_0x489e4b];
      _0x1c5d5d.push('<div class="obj-item');
      if (_0x54421b) {
        _0x1c5d5d.push(
          _0x54421b.is_lock ? " lock" : "",
          " grade",
          _0x54421b.grade,
        );
        _0x1c5d5d.push('"');
        _0x1c5d5d.push(" oindex='" + _0x54421b.id + "'>");
        _0x1c5d5d.push(_0x54421b.name);
        if (_0x54421b.count > 1) {
          _0x1c5d5d.push("<span class='obj-value'>");
          _0x1c5d5d.push(_0x54421b.count);
          _0x1c5d5d.push(_0x54421b.unit);
          _0x1c5d5d.push("</span>");
        }
      } else {
        _0x1c5d5d.push('">');
      }
      _0x1c5d5d.push("</div>");
    }
    _0x466c10.html(_0x1c5d5d.join(""));
  },
  left_click: function () {
    var _0x5aa81f = $(this);
    var _0x1d4be9 = _0x5aa81f.attr("oindex");
    if (!_0x1d4be9) {
      return;
    }
    var _0xc7697 = null;
    for (
      var _0xe83d0f = 0;
      _0xe83d0f < Dialog.trade.trade_list.length;
      _0xe83d0f++
    ) {
      if (Dialog.trade.trade_list[_0xe83d0f].id == _0x1d4be9) {
        _0xc7697 = Dialog.trade.trade_list[_0xe83d0f];
        break;
      }
    }
    if (!_0xc7697) {
      return;
    }
    Dialog.trade.cancle_trade(_0xc7697);
    return false;
  },
  enable_item: function (_0x14a09d, _0x3801bb) {
    var _0x2abc3f = this.rightElement.find(
      ".obj-item[oindex='" + _0x14a09d.id + "']",
    );
    if (!_0x2abc3f.length) {
      return;
    }
    if (_0x3801bb) {
      _0x2abc3f.removeClass("disabled");
    } else {
      _0x2abc3f.addClass("disabled");
    }
  },
  right_click: function () {
    var _0xb5e691 = $(this);
    if (_0xb5e691.is(".disabled")) {
      return;
    }
    var _0x855a6 = _0xb5e691.attr("oindex");
    if (!_0x855a6) {
      return;
    }
    var _0x429bf7 = Dialog.pack.get_item(_0x855a6);
    if (!_0x429bf7) {
      return;
    }
    if (_0x429bf7.count > 1) {
      Confirm.Show_trade_add(_0x429bf7);
    } else {
      Dialog.trade.add_trade(_0x429bf7);
    }
    return false;
  },
  add_trade: function (_0x40427d) {
    for (var _0xbc130f = 0; _0xbc130f < this.trade_list.length; _0xbc130f++) {
      if (_0x40427d.id == this.trade_list[_0xbc130f].id) {
        this.trade_list[_0xbc130f].count += _0x40427d.count;
        return this.create_items();
      }
    }
    this.trade_list.push(_0x40427d);
    this.create_items(
      this.leftElement.empty(),
      this.trade_list,
      this.max_count,
    );
    this.enable_item(_0x40427d, false);
  },
  cancle_trade: function (_0x5b1293) {
    for (var _0x5cd88e = 0; _0x5cd88e < this.trade_list.length; _0x5cd88e++) {
      if (_0x5b1293.id == this.trade_list[_0x5cd88e].id) {
        this.trade_list.splice(_0x5cd88e, 1);
        _0x5cd88e--;
      }
    }
    this.create_items(
      this.leftElement.empty(),
      this.trade_list,
      this.max_count,
    );
    this.enable_item(_0x5b1293, true);
  },
};
const level_desc = ["wht", "hig", "hic", "hiy", "him", "hio", "ord"];
function wrap_name(_0x52f089) {
  let _0x47b052 = level_desc[_0x52f089.grade];
  return "<" + _0x47b052 + ">" + _0x52f089.name + "</" + _0x47b052 + ">";
}
Dialog.list = {
  hide: function () {
    this.element.remove();
    this.isShow = false;
  },
  close: function () {
    this.hide();
  },
  updateitem: function (_0xc30114) {
    if (_0xc30114.store) {
      if (!this.stores || !this.isShow) {
        return Dialog.pack.onData({
          remove: _0xc30114.store,
          id: _0xc30114.id,
        });
      }
      var _0x147fa3 = this.find_item(1, _0xc30114.id);
      var _0xa427a1 = this.find_item(3, _0xc30114.storeid);
      if (!_0x147fa3) {
        _0x147fa3 = Object.assign({}, _0xa427a1);
        _0x147fa3.id = _0xc30114.id;
        _0x147fa3.count = -_0xc30114.store;
        Dialog.pack.items.push(_0x147fa3);
      } else {
        _0x147fa3.count -= _0xc30114.store;
      }
      if (!_0xa427a1) {
        _0xa427a1 = Object.assign({}, _0x147fa3);
        _0xa427a1.id = _0xc30114.storeid;
        _0xa427a1.count = _0xc30114.store;
        this.stores.push(_0xa427a1);
      } else {
        _0xa427a1.count += _0xc30114.store;
      }
      if (_0xa427a1.count == 0) {
        this.stores.Remove(_0xa427a1);
      }
      if (_0x147fa3.count == 0) {
        Dialog.pack.items.Remove(_0x147fa3);
      }
    } else if (_0xc30114.sell) {
      var _0x147fa3 = this.find_item(2, _0xc30114.id);
      if (_0x147fa3) {
        _0x147fa3.count -= _0xc30114.sell;
        return this.create_items(
          this.selllist,
          this.leftElement,
          2,
          this.selllist.length,
        );
      }
    }
    if (this.isstore && this.isShow) {
      this.create_items(this.stores, this.leftElement, 3, this.max_store_count);
      Dialog.title(
        !this.is_bookshelf
          ? "你的仓库中有" +
              this.stores.length +
              "/" +
              this.max_store_count +
              "件物品"
          : "你的书架上有" +
              this.stores.length +
              "/" +
              this.max_store_count +
              "本秘籍",
      );
    }
    this.update_pack();
    if (_0xc30114.money != undefined) {
      this.show_footer(_0xc30114.money);
    }
  },
  find_item: function (_0x230339, _0x409baf) {
    var _0x1284f1 = Dialog.pack.items;
    if (_0x230339 == 2) {
      _0x1284f1 = this.selllist;
    } else if (_0x230339 == 3) {
      _0x1284f1 = this.stores;
    }
    for (var _0x2b995e = 0; _0x2b995e < _0x1284f1.length; _0x2b995e++) {
      if (_0x1284f1[_0x2b995e].id == _0x409baf) {
        return _0x1284f1[_0x2b995e];
      }
    }
  },
  formatItems: function (_0x1b1d43) {
    let _0x5b64db = [];
    for (let _0x57bd70 of _0x1b1d43) {
      _0x5b64db.push({
        name: _0x57bd70[0],
        id: _0x57bd70[1],
        count: _0x57bd70[2],
        grade: _0x57bd70[3],
        unit: _0x57bd70[4],
        value: _0x57bd70[5],
      });
    }
    return _0x5b64db;
  },
  onData: function (_0xb95c1a) {
    if (_0xb95c1a.id) {
      return this.updateitem(_0xb95c1a);
    }
    var _0x9f28dd =
      _0xb95c1a.gongji ??
      _0xb95c1a.jungong ??
      _0xb95c1a.yaoyuan ??
      _0xb95c1a.canye;
    if (_0xb95c1a.selllist) {
      this.show();
      this.isstore = false;
      this.gongji = _0x9f28dd;
      this.money_name = null;
      this.selllist = this.formatItems(_0xb95c1a.selllist);
      if (_0xb95c1a.gongji >= 0) {
        this.money_name = "门派功绩";
      } else if (_0xb95c1a.jungong >= 0) {
        this.money_name = "军功";
      } else if (_0xb95c1a.yaoyuan >= 0) {
        this.money_name = "<ord>妖元</ord>";
      }
      this.create_items(
        this.selllist,
        this.leftElement,
        2,
        this.selllist.length,
      );
      Dialog.titleElement.html(_0xb95c1a.title);
      Dialog.icon("shopping-cart");
      if (_0xb95c1a.seller) {
        this.seller = _0xb95c1a.seller;
      }
      this.update_pack();
    } else if (_0xb95c1a.stores) {
      this.show();
      this.isstore = true;
      this.stores = Dialog.pack.formatItems(_0xb95c1a.stores);
      this.create_items(
        this.stores,
        this.leftElement,
        3,
        _0xb95c1a.max_store_count,
      );
      this.is_bookshelf = !!_0xb95c1a.bookshelf;
      Dialog.titleElement.html(
        !this.is_bookshelf
          ? "你的仓库中有" +
              _0xb95c1a.stores.length +
              "/" +
              _0xb95c1a.max_store_count +
              "件物品"
          : "你的书架上有" +
              _0xb95c1a.stores.length +
              "/" +
              _0xb95c1a.max_store_count +
              "本秘籍",
      );
      this.max_store_count = _0xb95c1a.max_store_count;
      Dialog.icon("lock");
      this.update_pack();
    }
    if (_0x9f28dd >= 0) {
      this.gongji = _0x9f28dd;
      this.show_footer(_0x9f28dd);
    }
  },
  show: function (_0x245b78) {
    if (!Dialog.isShow || Dialog.curItem != "list") {
      Dialog.show("list");
    }
    if (this.rightElement) {
      this.rightElement.show();
      if (Dialog.pack.objelement) {
        Dialog.pack.objelement.remove();
      }
    }
    if (this.isShow) {
      return;
    }
    if (!this.element) {
      this.element = $(
        '<div class="dialog-list"><div class="trade-list"></div><div class="obj-list"></div></div >',
      );
      this.leftElement = $(this.element.children()[0]);
      this.rightElement = $(this.element.children()[1]);
    }
    this.element.on("click", ".obj-item", Dialog.list.item_click);
    this.element.appendTo(Dialog.contentElement.empty());
    this.isShow = true;
  },
  show_footer: function (_0x293516) {
    _0x293516 = this.money_name ? this.gongji : _0x293516;
    let _0x3d74b4 = this.isstore ? "store" : "sell";
    if (this.isstore) {
      var _0x4a55c9 = this.money_name
        ? "你目前有" + _0x293516 + "<hiy>" + this.money_name + "</hiy>"
        : "你身上有" + moneyToStr(_0x293516);
      Dialog.footerElement.html(
        "<div class='obj-money'>" +
          _0x4a55c9 +
          "<span cmd='" +
          _0x3d74b4 +
          " all'>存仓库</span></div>",
      );
    } else {
      var _0x4a55c9 = this.money_name
        ? "你目前有" + _0x293516 + "<hiy>" + this.money_name + "</hiy>"
        : "你身上有" + moneyToStr(_0x293516);
      Dialog.footerElement.html(
        "<div class='obj-money'>" +
          _0x4a55c9 +
          "<span cmd='" +
          _0x3d74b4 +
          " all'>清理杂物</span></div>",
      );
    }
  },
  update_pack: function () {
    var _0x2b89cb = Dialog.pack.items;
    if (!_0x2b89cb) {
      SendCommand("pack");
    } else {
      this.create_items(_0x2b89cb, this.rightElement, 1, Dialog.pack.max_count);
      this.show_footer(Dialog.pack.money);
    }
  },
  create_items: function (_0x3e543d, _0x32b94b, _0x45d90c, _0x1182ab) {
    var _0x148ad9 = [];
    var _0x4454f9 = _0x3e543d;
    if (_0x45d90c === 1 || _0x45d90c === 3) {
      _0x4454f9 = Dialog.pack.sort_items(_0x3e543d);
    }
    for (var _0x19dd1d = 0; _0x19dd1d < _0x1182ab; _0x19dd1d++) {
      var _0xe167f9 = _0x4454f9[_0x19dd1d];
      _0x148ad9.push('<div class="obj-item');
      if (_0xe167f9) {
        _0x148ad9.push(
          _0xe167f9.is_lock ? " lock" : "",
          " grade",
          _0xe167f9.grade,
        );
        _0x148ad9.push('" obj="');
        _0x148ad9.push(_0xe167f9.id);
        _0x148ad9.push('" otype="');
        _0x148ad9.push(_0x45d90c);
        _0x148ad9.push('">');
        if (_0x45d90c === 1) {
          _0x148ad9.push('<span class="grade', _0xe167f9.grade, '">');
          _0x148ad9.push(_0xe167f9.name);
          _0x148ad9.push("</span>");
        } else {
          _0x148ad9.push(_0xe167f9.name);
        }
        _0x148ad9.push("<span class='obj-value'>");
        if (_0x45d90c == 2) {
          _0x148ad9.push("每");
          _0x148ad9.push(_0xe167f9.unit);
          _0x148ad9.push(
            this.money_name
              ? _0xe167f9.value + "<hiy>" + this.money_name + "</hiy>"
              : moneyToStr(_0xe167f9.value),
          );
          if (_0xe167f9.count == -1) {
            _0x148ad9.push("：大量现货");
          } else {
            _0x148ad9.push("：剩余");
            _0x148ad9.push(_0xe167f9.count);
            _0x148ad9.push(_0xe167f9.unit);
          }
        } else if (_0x45d90c === 1 && !this.isstore) {
          if (this.is_canye) {
            _0x148ad9.push(this.canye_value(_0xe167f9));
          } else if (_0xe167f9.value) {
            _0x148ad9.push("每");
            _0x148ad9.push(_0xe167f9.unit);
            _0x148ad9.push(moneyToStr(_0xe167f9.value));
            _0x148ad9.push("：");
            _0x148ad9.push(_0xe167f9.count);
            _0x148ad9.push(_0xe167f9.unit);
          } else {
            _0x148ad9.push("不可出售");
          }
        } else if (_0xe167f9.count > 1) {
          _0x148ad9.push(_0xe167f9.count);
          _0x148ad9.push(_0xe167f9.unit);
        }
        _0x148ad9.push("</span>");
      } else {
        _0x148ad9.push('">');
      }
      _0x148ad9.push("</div>");
    }
    _0x32b94b.html(_0x148ad9.join(""));
  },
  item_click: function () {
    var _0x1e2e53 = $(this);
    var _0x33ce52 = _0x1e2e53.attr("obj");
    var _0x76692e = _0x1e2e53.attr("otype");
    var _0x4b2722 = Dialog.list.find_item(_0x76692e, _0x33ce52);
    if (!_0x4b2722) {
      return;
    }
    var _0x5922d6 = ["<div class='item-commands'>"];
    if (Dialog.list.isstore) {
      if (_0x76692e == 3) {
        _0x5922d6.push(
          '<span cmd="checkobj ' +
            _0x33ce52 +
            " from " +
            (Dialog.list.is_bookshelf ? "sj" : "store") +
            '">查看</span>',
        );
        _0x5922d6.push('<span cmd="_confirm qu ' + _0x33ce52 + '">取出</span>');
      } else if (_0x76692e == 1) {
        _0x5922d6.push(
          '<span cmd="checkobj ' + _0x33ce52 + ' from item">查看</span>',
        );
        if (Dialog.list.is_bookshelf) {
          _0x5922d6.push(
            '<span cmd="_confirm store ' +
              _0x4b2722.count +
              " " +
              _0x33ce52 +
              '">放到书架</span>',
          );
        } else {
          _0x5922d6.push(
            '<span cmd="_confirm store ' +
              _0x4b2722.count +
              " " +
              _0x33ce52 +
              '">存到仓库</span>',
          );
        }
      }
    } else if (_0x76692e == 2) {
      _0x5922d6.push(
        '<span cmd="checkobj ' +
          _0x33ce52 +
          " from " +
          Dialog.list.seller +
          '">查看</span>',
      );
      if (_0x4b2722.count) {
        _0x5922d6.push(
          '<span cmd="_confirm buy ' +
            _0x4b2722.count +
            " " +
            _0x33ce52 +
            " from " +
            Dialog.list.seller +
            '">购买</span>',
        );
      }
    } else if (_0x76692e == 1) {
      _0x5922d6.push(
        '<span cmd="checkobj ' + _0x33ce52 + ' from item">查看</span>',
      );
      _0x5922d6.push(
        '<span cmd="_confirm sell ' +
          _0x4b2722.count +
          " " +
          _0x33ce52 +
          " to " +
          Dialog.list.seller +
          '">卖掉</span>',
      );
    }
    _0x5922d6.push("</div>");
    Dialog.list.element.find(".item-commands").remove();
    _0x1e2e53 = $(_0x5922d6.join("")).insertAfter(_0x1e2e53);
    checkScroll(_0x1e2e53);
  },
};
function moneyToStr(_0x55d22b) {
  if (!_0x55d22b) {
    return "";
  }
  var _0x51e754 = [];
  if (_0x55d22b >= 10000) {
    _0x51e754.push(parseInt(_0x55d22b / 10000) + "两<hiy>黄金</hiy>");
    _0x55d22b = _0x55d22b % 10000;
  }
  if (_0x55d22b > 100) {
    _0x51e754.push(parseInt(_0x55d22b / 100) + "两<wht>白银</wht>");
    _0x55d22b = _0x55d22b % 100;
  }
  if (_0x55d22b > 0) {
    _0x51e754.push(_0x55d22b + "个<yel>铜板</yel>");
  }
  return _0x51e754.join("");
}
const ClientDialogChannel = unsafeWindow.WSMudClient.createModule(
  "dialog-channel",
  {
    getDialog: () => Dialog,
    getProcess: () => Process,
    getJQuery: () => $,
    getWindow: () => window,
  },
);
Dialog.channel = ClientDialogChannel.channel;
Dialog.setting = {
  footer: [
    ["显示", "setting"],
    ["<yel>高级</yel>", "custom"],
    ["快捷键", "keys"],
    ["扩展", "extend"],
  ],
  selectitem: null,
  init: function () {
    if (this.settingElement) {
      return;
    }
    if (Util.isMobile) {
      this.footer.splice(2, 1);
    }
    this.settingElement = $(".dialog-setting");
    this.settingElement
      .find('.setting-item[for="item_firstme"]')
      .remove();
    this.extendElement = $(".dialog-extend");
    this.keysElement = $(".dialog-skeys");
    this.customElement = $(".dialog-custom");
    var _0x22e32b = $(".setting>.setting-item");
    for (var _0x78e257 = 0; _0x78e257 < _0x22e32b.length; _0x78e257++) {
      var _0x49c64f = $(_0x22e32b[_0x78e257]);
      var _0x47613a = _0x49c64f.attr("for");
      if (!_0x47613a) {
        continue;
      }
      var _0x163801 = Setting[_0x47613a];
      switch (_0x47613a) {
        case "fontsize":
          this.select_color(
            _0x49c64f.find(".color-item"),
            _0x163801,
            "fontSize",
          );
          break;
        case "font":
          this.select_color(
            _0x49c64f.find(".color-item"),
            _0x163801,
            "fontFamily",
          );
          break;
        case "fontcolor":
          this.select_color(
            _0x49c64f.find(".color-item"),
            _0x163801,
            "backgroundColor",
          );
          break;
        case "backcolor":
          this.select_color(
            _0x49c64f.find(".color-item"),
            _0x163801,
            "backgroundColor",
          );
          break;
        case "combat_size":
        case "menu_size":
        case "dialog_size":
          this.select_value(_0x49c64f.find(".color-item"), _0x163801);
          break;
        case "auto_pfm":
        case "auto_pfm2":
          if (_0x163801) {
            _0x49c64f.find(".switch ").addClass("on");
            _0x49c64f.find(".switch-text").html("开");
            $("#" + _0x47613a)
              .show()
              .val(_0x163801);
          }
          break;
        case "auto_work":
          if (_0x163801) {
            _0x49c64f.find(".switch ").addClass("on");
            _0x49c64f.find(".switch-text").html("开");
            $("#" + _0x47613a)
              .show()
              .val(_0x163801 != 1 ? _0x163801 : "");
          }
          break;
        default:
          if (_0x163801 == 1) {
            _0x49c64f.find(".switch ").addClass("on");
            _0x49c64f.find(".switch-text").html("开");
          }
          break;
      }
    }
  },
  show: function () {
    this.init();
    if (this.isShow) {
      return;
    }
    this.footerChanged("setting");
    Dialog.icon("cog");
    Dialog.title("设置");
    Dialog.footerElement.empty();
    for (var _0x5dfca3 = 0; _0x5dfca3 < this.footer.length; _0x5dfca3++) {
      var _0x2a0734 = $(
        "<span class='footer-item' for='" +
          this.footer[_0x5dfca3][1] +
          "'>" +
          this.footer[_0x5dfca3][0] +
          "</span>",
      ).appendTo(Dialog.footerElement);
      if (_0x5dfca3 == 0) {
        _0x2a0734.addClass("select");
      }
    }
    this.isShow = true;
  },
  select_color: function (_0x884fd0, _0x529881, _0x1b2a53) {
    for (var _0x486e64 = 0; _0x486e64 < _0x884fd0.length; _0x486e64++) {
      if (_0x884fd0[_0x486e64].style[_0x1b2a53] == _0x529881) {
        $(_0x884fd0[_0x486e64]).addClass("select");
      } else {
        $(_0x884fd0[_0x486e64]).removeClass("select");
      }
    }
  },
  select_value: function (_0x3408e7, _0x3f412b) {
    for (var _0x33ed5c = 0; _0x33ed5c < _0x3408e7.length; _0x33ed5c++) {
      if ($(_0x3408e7[_0x33ed5c]).attr("value") == _0x3f412b) {
        $(_0x3408e7[_0x33ed5c]).addClass("select");
      } else {
        $(_0x3408e7[_0x33ed5c]).removeClass("select");
      }
    }
  },
  footerChanged: function (_0x10521b) {
    let _0x10af9f = this[_0x10521b + "Element"];
    if (!_0x10af9f || _0x10af9f === this.selectitem) {
      return;
    }
    if (this.selectitem) {
      this.selectitem.remove();
    }
    this.selectitem = _0x10af9f;
    if (this.child) {
      this.child.hide();
    }
    this.child = null;
    if (_0x10521b == "setting") {
      this.selectitem.on("click", ".switch", this.switchClick);
      this.selectitem.on("click", ".color-item", this.colorClick);
    } else if (_0x10521b == "custom") {
      this.selectitem.on("click", ".switch", this.switchClick);
      this.selectitem.on("click", ".setting-ok", this.save_custom);
    } else {
      this.child = Dialog[_0x10521b];
      this.child.show(this.selectitem);
    }
    this.selectitem.appendTo(Dialog.contentElement);
  },
  helpClick: function () {
    var _0x36cd4c = $(this);
    var _0x171a56 = _0x36cd4c.attr("action");
    switch (_0x171a56) {
      case "tologin":
        break;
      case "torole":
        GameClient.Close();
        HideAndShow("#role_panel", function () {
          Process.player = null;
          Process.clear();
        });
        break;
      case "toserver":
        Process.clear();
        Process.player = null;
        GameClient.Close();
        break;
      default:
        break;
    }
  },
  close_help: function () {
    if (this.frame) {
      this.frame.remove();
      this.selectitem.removeClass("help-detl");
      this.frame = null;
    }
  },
  hide: function () {
    if (this.child && this.child.hide() === false) {
      return false;
    }
    this.close();
  },
  close: function () {
    this.child?.close();
    this.selectitem?.remove();
    this.isShow = false;
    this.selectitem = null;
    this.child = null;
  },
  save_custom: function () {
    if ($(".dialog-custom>.setting-item[for='auto_pfm']>.switch").is(".on")) {
      var _0x5ebe57 = $("#auto_pfm").val();
      if (!_0x5ebe57) {
        return ReceiveMessage("<hir>你没有设置自动出招的绝招。</hir>");
      }
      if (_0x5ebe57.length > 300) {
        return ReceiveMessage("<hir>你设置的出招过长。</hir>");
      }
      Setting.save("auto_pfm", _0x5ebe57);
    }
    if ($(".dialog-custom>.setting-item[for='auto_pfm2']>.switch").is(".on")) {
      var _0x5ebe57 = $("#auto_pfm2").val();
      if (!_0x5ebe57) {
        return ReceiveMessage("<hir>你没有设置自动反击的绝招。</hir>");
      }
      if (_0x5ebe57.length > 300) {
        return ReceiveMessage("<hir>你设置的出招过长。</hir>");
      }
      Setting.save("auto_pfm2", _0x5ebe57);
    }
    if ($(".dialog-custom>.setting-item[for='auto_work']>.switch").is(".on")) {
      var _0x5ebe57 = $("#auto_work").val();
      if (_0x5ebe57 && _0x5ebe57.length > 400) {
        return ReceiveMessage("<hir>你设置的过长。</hir>");
      }
      Setting.save("auto_work", _0x5ebe57 || 1);
    }
    ReceiveMessage("<hic>设置已保存。</hic>");
  },
  get_pfms: function (_0x2045a1) {
    if (!Combat.Skills) {
      return ReceiveMessage("<hir>你没有可用的绝招设置。</hir>");
    }
    var _0x198648 = [];
    for (var _0x134b11 = 0; _0x134b11 < Combat.Skills.length; _0x134b11++) {
      if (_0x198648.length > 0) {
        _0x198648.push(",");
      }
      _0x198648.push(Combat.Skills[_0x134b11].id);
    }
    $("#" + _0x2045a1).val(_0x198648.join(""));
    ReceiveMessage(
      "已预设置为你默认的绝招(未保存)，你可以修改为适合你的出招顺序后点击保存",
    );
  },
  switchClick: function (_0x24ee8a) {
    var _0x3218ad = $(this);
    var _0x35c1bc = _0x3218ad.parent().attr("for");
    var _0x361fee = 0;
    if (_0x3218ad.is(".on")) {
      _0x3218ad.removeClass("on");
      _0x3218ad.find(".switch-text").html("关");
    } else {
      _0x3218ad.addClass("on");
      _0x3218ad.find(".switch-text").html("开");
      _0x361fee = 1;
    }
    switch (_0x35c1bc) {
      case "auto_pfm":
      case "auto_pfm2":
        if (_0x361fee) {
          $("#" + _0x35c1bc).show();
          Dialog.setting.get_pfms(_0x35c1bc);
          Setting[_0x35c1bc] = 0;
        } else {
          $("#" + _0x35c1bc).hide();
          Setting.save(_0x35c1bc, 0);
        }
        break;
      case "auto_work":
        if (_0x361fee) {
          $("#" + _0x35c1bc).show();
        } else {
          $("#" + _0x35c1bc).hide();
          Setting.save(_0x35c1bc, 0);
        }
        break;
      default:
        Setting.save(_0x35c1bc, _0x361fee);
        break;
    }
    _0x24ee8a.cancelable = true;
    return false;
  },
  COLORS: {
    "rgb(255, 255, 255)": "#fff",
    "rgb(189, 195, 199)": "#bdc3c7",
    "rgb(0, 128, 0)": "#008000",
  },
  colorClick: function () {
    var _0x296945 = $(this);
    if (_0x296945.is(".select")) {
      return;
    }
    var _0x25c4d4 = _0x296945.parent();
    _0x25c4d4.children().removeClass("select");
    _0x296945.addClass("select");
    var _0x15c241 = _0x25c4d4.closest(".setting-item").attr("for");
    if (!_0x15c241) {
      return;
    }
    var _0x3ed51d = "";
    switch (_0x15c241) {
      case "combat_size":
      case "dialog_size":
      case "menu_size":
        _0x3ed51d = _0x296945.attr("value");
        break;
      case "fontsize":
        _0x3ed51d = _0x296945[0].style.fontSize;
        break;
      case "fontcolor":
        _0x3ed51d =
          Dialog.setting.COLORS[_0x296945[0].style.backgroundColor] ?? "";
        break;
      case "backcolor":
        _0x3ed51d = _0x296945[0].style.backgroundColor;
        break;
      case "font":
        _0x3ed51d = _0x296945[0].style.fontFamily;
        if (!_0x3ed51d) {
          _0x3ed51d = "none";
        }
        break;
    }
    Setting.save(_0x15c241, _0x3ed51d);
  },
};
const ClientDialogTasks = unsafeWindow.WSMudClient.createModule(
  "dialog-tasks",
  {
    getDialog: () => Dialog,
    getJQuery: () => $,
    getSendCommand: () => SendCommand,
  },
);
Dialog.tasks = ClientDialogTasks.tasks;
const ClientDialogStats = unsafeWindow.WSMudClient.createModule("dialog-stats", {
  getDialog: () => Dialog,
  jquery: $,
  getSendCommand: () => SendCommand,
});
Dialog.stats = ClientDialogStats.stats;
const ClientDialogJianghu = unsafeWindow.WSMudClient.createModule(
  "dialog-jianghu",
  {
    getDialog: () => Dialog,
    jquery: $,
    getSendCommand: () => SendCommand,
    getReceiveMessage: () => ReceiveMessage,
  },
);
Dialog.jh_fam = ClientDialogJianghu.jh_fam;
Dialog.jh_fb = ClientDialogJianghu.jh_fb;
Dialog.jh_ar = ClientDialogJianghu.jh_ar;
Dialog.jh = ClientDialogJianghu.jh;
const ClientDialogShop = unsafeWindow.WSMudClient.createModule("dialog-shop", {
  getDialog: () => Dialog,
  jquery: $,
  getSendCommand: () => SendCommand,
  getMoneyToStr: () => moneyToStr,
});
Dialog.shop = ClientDialogShop.shop;

const ClientDialogSocial = unsafeWindow.WSMudClient.createModule(
  "dialog-social",
  {
    getDialog: () => Dialog,
    jquery: $,
    getSendCommand: () => SendCommand,
    getToolAction: () => ToolAction,
    getReceiveMessage: () => ReceiveMessage,
    getProcess: () => Process,
    getFormatTimeSpan: () => format_time_span,
  },
);
Dialog.message = ClientDialogSocial.message;
Dialog.relation = ClientDialogSocial.relation;
Dialog.party = ClientDialogSocial.party;
Dialog.team = ClientDialogSocial.team;

const ClientDialogEvents = unsafeWindow.WSMudClient.createModule(
  "dialog-events",
  {
    getDialog: () => Dialog,
    jquery: $,
    getSendCommand: () => SendCommand,
    getToolAction: () => ToolAction,
  },
);
Dialog.events = ClientDialogEvents.events;

const ClientDialogPm = unsafeWindow.WSMudClient.createModule("dialog-pm", {
  getDialog: () => Dialog,
  jquery: $,
  getSendCommand: () => SendCommand,
  getMoneyToStr: () => moneyToStr,
  now: () => Date.now(),
  timers: {
    setInterval: setInterval,
    clearInterval: clearInterval,
  },
});
Dialog.pm = ClientDialogPm.pm;

function format_time_span(_0x4d27f3) {
  let _0x12b5c4 = Math.floor(_0x4d27f3 / 1000);
  if (_0x12b5c4 < 0) {
    _0x12b5c4 = 0;
  }
  if (_0x12b5c4 > 3600) {
    let _0x541fc3 = Math.floor(_0x12b5c4 / 3600) + "小时";
    _0x12b5c4 = _0x12b5c4 % 3600;
    _0x541fc3 += Math.floor(_0x12b5c4 / 60) + "分";
    return _0x541fc3;
  }
  let _0x1d1672 = Math.floor(_0x12b5c4 / 60) + "分";
  _0x12b5c4 = _0x12b5c4 % 60;
  return _0x1d1672 + _0x12b5c4 + "秒";
}
const ClientDialogKeys = unsafeWindow.WSMudClient.createModule("dialog-keys", {
  getDialog: () => Dialog,
  jquery: $,
  documentRef: document,
  windowRef: window,
  storageUtil,
  getUtilities: () => Util,
  getScript: () => SCRIPT,
});
Dialog.keys = ClientDialogKeys.keys;
const ClientDialogExtensions = unsafeWindow.WSMudClient.createModule("dialog-extensions", {
  getDialog: () => Dialog,
  getJQuery: () => $,
  getProcess: () => Process,
  getReceiveMessage: () => ReceiveMessage,
  getCombat: () => Combat,
  getScript: () => SCRIPT,
  getStorageUtil: () => storageUtil,
  now: () => Date.now(),
  timers: { setTimeout },
});
Dialog.extend = ClientDialogExtensions.extend;
Dialog.friend = {
  show: function () {
    if (!this.data) {
      return SendCommand("friend");
    }
  },
  onData: function (_0x13458b) {},
};
Dialog.pay = {
  createElement: function () {},
  show: function () {
    this.isShow = true;
    this.element = this.createElement();
    this.element.appendTo(Dialog.contentElement);
  },
  close: function () {
    this.element.remove();
    this.isShow = false;
  },
};
const SCRIPT = unsafeWindow.WSMudClient.createModule("script-engine", {
  jquery: $,
  hostWindow: window,
  PromiseConstructor: Promise,
  getSendCommand: function () { return SendCommand; },
  getReceiveMessage: function () { return ReceiveMessage; },
  getHandlerMenuCommand: function () { return HandlerMenuCommand; },
  getUtilities: function () { return Util; },
  getProcess: function () { return Process; },
  getDialog: function () { return Dialog; },
  getMapDirExits: function () { return MAP_DIR_EXITS; },
  getConfirmation: function () { return Confirm; },
});
const ClientSettings = unsafeWindow.WSMudClient.createModule("settings", {
  jquery: $,
  documentRef: document,
  hostWindow: window,
  getDialog: function () { return Dialog; },
  getProcess: function () { return Process; },
  getCombat: function () { return Combat; },
  getScript: function () { return SCRIPT; },
  isConnected: function () { return GameClient && GameClient.Connected(); },
  sendCommand: SendCommand,
});
const MAP_DIR_EXITS = ClientSettings.MAP_DIR_EXITS;
var Setting = ClientSettings.Setting,
  create_name = ClientSettings.createName,
  create_id = ClientSettings.createId,
  create_prop = ClientSettings.createProp;
var Confirm = unsafeWindow.WSMudClient.createModule("confirmation", {
  jquery: $,
  documentRef: document,
  hostWindow: window,
  getDialog: function () { return Dialog; },
  getProcess: function () { return Process; },
  getUtil: function () { return Util; },
  sendCommand: SendCommand,
  isTopPopupLayer: IsTopWGPopupLayer,
});
const ClientUtilities = unsafeWindow.WSMudClient.createModule("utilities", {
  jquery: $,
  hostWindow: window,
  documentRef: document,
  navigator,
  timers: { setTimeout: setTimeout.bind(window) },
  json: JSON,
  DateConstructor: Date,
  PromiseConstructor: Promise,
  parseInt,
  encodeURIComponent,
  escape,
  unescape,
  FunctionConstructor: Function,
  domParser: typeof DOMParser === "function" ? DOMParser : null,
  activeXObject: typeof ActiveXObject === "function" ? ActiveXObject : null,
});
ClientUtilities.installLegacyExtensions();
var Util = ClientUtilities;
var mysocket = WebSocket;
window.WebSocket = null;
const ClientNetworkApi = unsafeWindow.WSMudClient.createModule("network-api", {
  Socket: mysocket,
  getReceiveMessage: function () {
    return ReceiveMessage;
  },
  getUtil: function () {
    return Util;
  },
});
var WSClient = ClientNetworkApi.WSClient;
var API = ClientNetworkApi.API;
