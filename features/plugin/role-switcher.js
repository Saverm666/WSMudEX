/** Saved-character management and server/role switching UI. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("role-switcher", function install(context) {
  const { WG } = context;
  class Myapi {
    constructor() {
      this.roles = this.getValue("roles");
    }
    set roles(o) {
      (o instanceof Array
        ? (o.sort((o, e) => o.sort - e.sort),
          o.forEach((o, e) => {
            o.server ? (o.sort = e + 1) : (o.sort = 9999);
          }),
          (this._roles = o))
        : (this._roles = []),
        this.setValue("roles", this._roles));
    }
    get roles() {
      return this._roles;
    }
    addStyle(o) {
      GM_addStyle(o);
    }
    cookie() {
      var o = document.cookie.split(";").reduce((o, e) => {
        var l = e.indexOf("="),
          i = e.substr(0, l).trim(),
          e = e.substr(l + 1);
        return ((o[i] = e), o);
      }, {});
      return new Proxy(o, {
        set: (o, e, l) => (
          (document.cookie = e + "=" + l),
          Reflect.set(o, e, l)
        ),
        deleteProperty: (o, e) => (
          (document.cookie = e + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT;"),
          Reflect.deleteProperty(o, e)
        ),
      });
    }
    setValue(o, e) {
      localStorage.setItem(o, JSON.stringify(e));
    }
    getValue(o) {
      return JSON.parse(localStorage.getItem(o));
    }
    deleteValue(o) {
      localStorage.removeItem(o);
    }
  }
    var o = WG,
      s = Vue.observable(new Myapi());
    (o.add_hook("roles", function (o) {
      o.roles instanceof Array &&
        (o.roles.forEach((o) => {
          let { id: e, name: l, title: i } = o;
          o = s.roles.findIndex((o) => o.id === e);
          -1 === o
            ? s.roles.push({ id: e, name: l, title: i, sort: 9999 })
            : ((s.roles[o].name = l), (s.roles[o].title = i));
        }),
        (s.roles = s.roles.slice(0)));
    }),
      o.add_hook("login", function (o) {
        let e = o.id;
        var l;
        !s.id &&
          e &&
          ((s.id = e),
          (o = s.roles.findIndex((o) => o.id === e)),
          (s.name = s.roles[o].name),
          (l = s.cookie()),
          (s.roles[o].u = l.u),
          (s.roles[o].p = l.p),
          (s.roles[o].s = l.s),
          (s.roles[o].server = ["一区", "二区", "三区", "四区", "测试"][l.s]),
          (s.roles = s.roles.slice(0)));
      }));
    let e = s.getValue("auto-login-id");
    e
      ? (s.deleteValue("auto-login-id"),
        o.add_hook(["roles"], function () {
          (setTimeout(
            () => $(".role-item[role" + "id=" + e + "]").click(),
            1e3,
          ),
            setTimeout(
              () => $(".panel_item[command=SelectRole]").click(),
              2e3,
            ));
        }))
      : ($('li.panel_item[command="SelectRole"]').after(`
<li class="panel_item" id="wsmud-login" style="color:orange;" @click.stop="show = true">
  <span class="glyphicon glyphicon-ok"></span> <span style="margin-left:0.5rem">[苏轻]一键登录</span>
  <div v-if="show" class="login-dialog-bg" @click.stop="show = false">
    <div class="login-dialog" @click.stop>
      <div class="login-dialog-title">[苏轻]一键登录</div>
      <transition-group class="login-dialog-rows" tag="div" name="login-animate-list">
        <div class="login-dialog-row" v-for="(role, index) in roles" :key="role.id" v-if="role.server">
          <span class="login-dialog-role" @click="login(role)">[{{ role.server }}] {{ role.name }}</span>
          <span class="glyphicon glyphicon-arrow-up login-dialog-up" @click="up(index)"></span>
          <span class="glyphicon glyphicon-arrow-down login-dialog-down" @click="down(index)"></span>
          <span class="glyphicon glyphicon-trash login-dialog-remove" @click="remove(index)"></span>
        </div>
      </transition-group>
    </div>
  </div>
</li>
`),
        new Vue({
          data: { show: !1 },
          computed: {
            roles() {
              return s.roles;
            },
          },
          mounted() {
            var o,
              e,
              l,
              i = new URLSearchParams(window.location.search),
              r =
                (i.get("type") &&
                  ((o = i.get("username")),
                  (e = i.get("password")),
                  (l = i.get("area")),
                  (r = i.get("name")),
                  o) &&
                  e &&
                  l &&
                  r &&
                  $.ajax({
                    type: "POST",
                    url: "/UserAPI/Login",
                    data: "code=" + o + "&pwd=" + e,
                    success: function (o) {
                      (console.log(o), (s.cookie().s = l));
                      o = window.location.href.split("?")[0];
                      window.location = o + "?name=" + r;
                    },
                    error: function (o) {},
                  }),
                i.get("name"));
            if (r) for (var t of s.roles) t.name == r && this.login(t);
          },
          methods: {
            login(o) {
              var e = s.cookie();
              ((e.u = o.u),
                (e.p = o.p),
                (e.s = o.s),
                s.setValue("auto-login-id", o.id),
                (window.android ? android : window.location).reload());
            },
            up(o) {
              ((s.roles[o].sort = o - 1), (s.roles = s.roles.slice(0)));
            },
            down(o) {
              ((s.roles[o].sort = o + 3), (s.roles = s.roles.slice(0)));
            },
            remove(o) {
              (delete s.roles[o].server,
                (s.roles = s.roles.slice(0)),
                this.$forceUpdate());
            },
          },
          el: "#wsmud-login",
        }),
        s.addStyle(`
.login-dialog-bg {
  display: block;
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  z-index: 100;
  overflow-y: auto;
  background-color: #000000dd;
  cursor: default;
  user-select: none;
}
.login-dialog {
  display: block;
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 101;
  min-width: 300px;
  padding: 10px;
  transform: translate(-50%, -50%);
  border-radius: 10px;
  color: #999999;
  background-color: #080808;
  box-shadow: 0 0 5px #333333;
}
.login-dialog-title {
  color: #00f000;
  padding: 10px 0 10px 10px;
  text-shadow: 0 0 15px;
}
.login-dialog-rows {
  max-height: 230px;
  overflow: auto;
}
.login-dialog-row {
  cursor: pointer;
  padding: 10px;
  display: flex;
}
.login-dialog-role {
  flex: 1 0 auto;
}
.login-dialog-role:hover {
  color: #00ffff;
  text-shadow: 0 0 15px;
}
.login-dialog-up, .login-dialog-down, .login-dialog-remove {
  flex: 0 0 22px;
  margin-left: 5px;
}
.login-dialog-up:hover, .login-dialog-down:hover {
  color: #088000;
  text-shadow: 0 0 15px;
}
.login-dialog-remove:hover {
  color: #880000;
  text-shadow: 0 0 15px;
}
/* 图标 */
.glyphicon-arrow-up:before {
  content: "\\e093";
}
.glyphicon-arrow-down:before {
  content: "\\e094";
}
.glyphicon-trash:before {
  content: "\\e020";
}
/* 过渡动画效果 */
.login-animate-list-move {
  transition: transform 0.5s;
}
.login-animate-list-item {
  display: inline-block;
  margin-right: 10px;
}
.login-animate-list-enter-active, .login-animate-list-leave-active {
  transition: all 0.5s;
}
.login-animate-list-enter, .login-animate-list-leave-to {
  opacity: 0;
  transform: translateX(50px);
}
`));
  });
})(window);
