/** External message dispatch and room context-menu runtime. */
(function registerAutomationMessageMenu(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "automation-message-menu",
    function install(context) {
      const services = context.services || {};
      const jquery = context.jquery || global.jQuery;
      const timers = context.timers || {};
      const logger = context.logger || global.console;
      const legacy = context.legacy || {};
      const $ = jquery;

      const getWG =
        typeof context.getWG === "function"
          ? context.getWG
          : () => context.WG;
      const getRoleName =
        typeof context.getRoleName === "function"
          ? context.getRoleName
          : () =>
              typeof legacy.getRoleName === "function"
                ? legacy.getRoleName()
                : "";
      const getRaid =
        typeof context.getRaid === "function"
          ? context.getRaid
          : () =>
              typeof legacy.getRaid === "function"
                ? legacy.getRaid()
                : global.ToRaid;
      const getTimer =
        typeof context.getTimer === "function"
          ? context.getTimer
          : () =>
              typeof legacy.getWorkTimer === "function"
                ? legacy.getWorkTimer()
                : 0;
      const getButtonMode =
        typeof context.getButtonMode === "function"
          ? context.getButtonMode
          : () =>
              typeof legacy.getCustomButtonMode === "function"
                ? legacy.getCustomButtonMode()
                : false;
      const getStopAuto =
        typeof context.getStopAuto === "function"
          ? context.getStopAuto
          : () => undefined;
      const getNow =
        typeof context.getNow === "function" ? context.getNow : () => new Date();
      const messageAppend = context.messageAppend;
      const executeLegacyScript = context.executeLegacyScript;
      const openWindow =
        typeof context.openWindow === "function"
          ? context.openWindow
          : (url, target) => global.open(url, target);
      const deferred =
        typeof context.deferred === "function"
          ? context.deferred
          : () => $.Deferred();

      if (typeof $ !== "function")
        throw new TypeError("消息菜单需要显式 jquery 上下文");
      if (typeof timers.setTimeout !== "function")
        throw new TypeError("消息菜单需要显式 timers.setTimeout 上下文");
      if (typeof executeLegacyScript !== "function")
        throw new TypeError("消息菜单需要 executeLegacyScript 兼容桥");

      function receiveMessage(event) {
        var origin = event.origin,
          data = event.data,
          jscode,
          WG = getWG();
        void origin;
        if (0 <= String(data).indexOf("denglu")) {
          if (null != getRoleName()) return;
          logger.log(data);
          let userName = data.split(" ")[1],
            userList = $("#role_panel > ul > li.content > ul >li");
          for (var user of userList)
            0 <= user.innerText.indexOf(userName)
              ? $(user).addClass("select")
              : $(user).removeClass("select");
          void $("li[command=SelectRole]").click();
        } else {
          try {
            if (JSON.parse(data) instanceof Object) return;
          } catch (error) {
            logger.log("Run at message");
          }
          if ("string" == typeof data) {
            if ("挖矿" === data || "修炼" === data) WG.zdwk();
            else if ("日常" === data) WG.SendCmd("$daily");
            else if ("挂机" === data) WG.SendCmd("stopstate");
            else if (0 <= data.split("\n")[0].indexOf("//")) {
              var raid = getRaid();
              raid && raid.perform(data);
            } else if (0 <= data.split("\n")[0].indexOf("#js")) {
              jscode = data.split("\n");
              jscode.baoremove(0);
              executeLegacyScript(jscode.join(""));
            } else WG.SendCmd(data);
          }
        }
      }

      function makeTp(type = 0) {
        var routes = {
            豪宅: "住房",
            衙门: "扬州城-衙门正厅",
            镖局: "扬州城-镖局正厅",
            当铺: "扬州城-当铺",
            擂台: "扬州城-擂台",
            药铺: "扬州城-药铺",
          },
          items = {};
        1 == type &&
          ((routes = {
            武当: "武当派-广场",
            少林: "少林派-广场",
            华山: "华山派-镇岳宫",
            峨眉: "峨眉派-金顶",
            逍遥: "逍遥派-青草坪",
            丐帮: "丐帮-树洞内部",
            武馆: "扬州城-扬州武馆",
            杀手楼: "杀手楼-大门",
          }),
          17 <= getNow().getHours()) &&
          (routes = {
            武当: "武当派-后山小院",
            少林: "少林派-方丈楼",
            华山: "华山派-客厅",
            峨眉: "峨眉派-清修洞",
            逍遥: "逍遥派-地下石室",
            丐帮: "丐帮-林间小屋",
            武馆: "扬州城-扬州武馆",
            杀手楼: "杀手楼-大门",
          });
        for (let name in routes)
          items[name] = {
            name: name,
            callback: function () {
              getWG().go(routes[name]);
            },
          };
        0 == type &&
          (items.wmls = {
            name: "武庙疗伤",
            callback: async function () {
              var WG = getWG();
              await WG.go("扬州城-武庙");
              WG.Send("liaoshang");
            },
          });
        var deferredValue = deferred();
        timers.setTimeout(function () {
          deferredValue.resolve(items);
        }, 20);
        return deferredValue.promise();
      }

      function createSomeMenu() {
        return {
          items: {
            关闭自动: {
              name: "关闭自动",
              visible: function (e, t) {
                return 0 != getTimer();
              },
              callback: function (e, t) {
                getWG().timer_close();
              },
            },
            自动: {
              name: "自动",
              visible: function (e, t) {
                return 0 == getTimer();
              },
              items: {
                自动武道: {
                  name: "自动武道",
                  callback: function (e, t) {
                    getWG().wudao_auto();
                  },
                },
                自动小树林: {
                  name: "自动小树林",
                  callback: function (e, t) {
                    getWG().grove_auto();
                  },
                },
                自动整理并清包: {
                  name: "自动整理并清包",
                  callback: function (e, t) {
                    getWG().sell_all();
                  },
                },
                自动比试: {
                  name: "自动比试",
                  visible: function (e, t) {
                    return null == getWG().fight_listener;
                  },
                  callback: function (e, t) {
                    getWG().auto_fight();
                  },
                },
                关闭比试: {
                  name: "关闭比试",
                  visible: function (e, t) {
                    return null != getWG().fight_listener;
                  },
                  callback: function (e, t) {
                    getWG().auto_fight();
                  },
                },
                自动使用道具: {
                  name: "自动使用道具",
                  callback: function (e, t) {
                    getWG().auto_useitem();
                  },
                },
                自动研药: {
                  name: "自动研药",
                  callback: function (e, t) {
                    getWG().auto_Development_medicine();
                  },
                },
                一键日常: {
                  name: "一键日常",
                  callback: function (e, t) {
                    getWG().oneKeyDaily();
                  },
                },
                一键请安: {
                  name: "一键请安",
                  callback: function (e, t) {
                    getWG().oneKeyQA();
                  },
                },
                一键扫荡: {
                  name: "一键扫荡",
                  callback: function (e, t) {
                    getWG().oneKeySD();
                  },
                },
                一键当铺购买: {
                  name: "一键当铺购买",
                  callback: function (e, t) {
                    getWG().tnBuy();
                  },
                },
              },
            },
            换装设置: {
              name: "换装设置",
              callback: function (e, t) {
                getWG().eqhelperui();
              },
            },
            换装: { name: "换装", items: getWG().eqloader() },
            "自命令,自定监控": {
              name: "自命令,自定监控",
              callback: function (e, t) {
                getWG().zmlztjk();
              },
            },
            手动喜宴: {
              name: "手动喜宴",
              callback: function (e, t) {
                (logger.log("当前自动状态:" + getStopAuto()), getWG().xiyan());
              },
            },
            快捷传送: { name: "常用地点", items: makeTp(0) },
            门派传送: { name: "门派传送", items: makeTp(1) },
            打开仓库: {
              name: "打开仓库",
              callback: function (e, t) {
                var WG = getWG();
                WG.at("扬州城-钱庄")
                  ? WG.Send("store")
                  : WG.go("扬州城-钱庄");
              },
            },
            切换菜单: {
              name: "切换菜单",
              callback: function (e, t) {
                let mode = getButtonMode() ? "off" : "on";
                getWG().zdy_btnshow(mode);
              },
            },
            简单工具: {
              name: "简单工具",
              callback: function (e, t) {
                getWG().calc();
              },
            },
            调试BOSS: {
              name: "调试BOSS",
              visible: !1,
              callback: function (e, t) {
                getWG().kksBoss({ content: "听说呼符出现在逍遥派-地下石室一带。" });
              },
            },
            "流程菜单Raid.js": {
              name: "流程菜单Raid.js",
              callback: function (e, t) {
                var raid = getRaid();
                raid
                  ? raid.menu()
                  : (messageAppend(
                      "插件未安装,请访问 https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid 下载并安装",
                    ),
                    openWindow(
                      "https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid ",
                      "_blank",
                    ).location);
              },
            },
            设置: {
              name: "设置",
              callback: function (e, t) {
                getWG().setting();
              },
            },
            打开面板: {
              name: "打开面板",
              visible: function (e, t) {
                return !$(".WG_floating_panel").is(":visible");
              },
              callback: function (e, t) {
                getWG().showhideborad();
              },
            },
            关闭面板: {
              name: "关闭面板",
              visible: function (e, t) {
                return $(".WG_floating_panel").is(":visible");
              },
              callback: function (e, t) {
                getWG().showhideborad();
              },
            },
            打开快捷操作栏: {
              name: "打开快捷操作栏",
              visible: function (e, t) {
                return "none" == $(".WG_button").css("display");
              },
              callback: function (e, t) {
                getWG().showhidebtn();
              },
            },
            关闭快捷操作栏: {
              name: "关闭快捷操作栏",
              visible: function (e, t) {
                return "none" != $(".WG_button").css("display");
              },
              callback: function (e, t) {
                getWG().showhidebtn();
              },
            },
          },
        };
      }

      services.automationMessageMenu = {
        receiveMessage,
        makeTp,
        createSomeMenu,
      };
      return {
        destroy: function () {
          if (services.automationMessageMenu) delete services.automationMessageMenu;
        },
      };
    },
  );
})(window);
