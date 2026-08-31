/** Command aliases and the interactive command console. */
(function registerCommandEngine(global) {
  "use strict";

  global.WSMudPlugin.registerService("command-engine", function create(context) {
    const { WG, G, L, services, messageAppend, messageClear, legacy } = context;
    const T = {
      _recmd: function (e) {
        return e
          ? ((e = e instanceof Array ? e : e.split(";")).baoremove(0),
            e.join(";"))
          : "";
      },
      recmd: function (t, s) {
        for (let e = 0; e < t + 1; e++) s = T._recmd(s);
        return s;
      },
      findhook: void 0,
      _findItem: async function (s, o) {
        (console.log("finditem" + s),
          (T.findhook = WG.add_hook("dialog", async function (e) {
            if (e.items) {
              for (var t of e.items)
                t.name == s && (o(t.id), WG.remove_hook(T.findhook));
              o("");
            }
            WG.remove_hook(T.findhook);
          })),
          WG.Send("pack"));
      },
      pname: function (e = 0, t, s) {
        T.findPlayerByName(e, t, s);
      },
      findPlayerByName: function (e = 0, t, s) {
        let o = (s =
          0 <= (s = T.recmd(e - 1, s)).indexOf(",")
            ? s.split(",")
            : s.split(";"))[0].split("$")[0];
        ((s = T.recmd(0, s)),
          " " == (o = o.replaceAll("-", " "))[o.length - 1] &&
            (o = o.substring(0, o.length - 1)),
          console.log("findPlayerByName" + t));
        for (let e = 0; e < legacy.getRoomData().length; e++)
          legacy.getRoomData()[e].name &&
            0 <= legacy.getRoomData()[e].name.indexOf(t) &&
            WG.Send(o + " " + legacy.getRoomData()[e].id);
        WG.SendCmd(s);
      },
      findItem: async function (e = 0, t, s) {
        var o,
          a = (s =
            0 <= (s = T.recmd(e - 1, s)).indexOf(",")
              ? s.split(",")
              : s.split(";"))[0].split(" ")[0];
        ((s = T.recmd(0, s)), console.log("finditem" + t), WG.Send("pack"));
        for (o of legacy.getPackData())
          o.name == t &&
            (("fenjie" == a || "drop" == a) && 0 <= o.name.indexOf("★")
              ? messageAppend("高级物品 ,不分解")
              : WG.SendCmd(a + " " + o.id));
        WG.SendCmd(s);
      },
      wait: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          console.log("延时:" + t + "ms,延时触发:" + s),
          await WG.sleep(parseInt(t)),
          WG.SendCmd(s));
      },
      batwait: async function (e = 0, t, s) {
        G.in_fight &&
          ((s = T.recmd(e, s)),
          console.log("延时:" + t + "ms,延时触发:" + s),
          await WG.sleep(parseInt(t)),
          WG.SendCmd(s));
      },
      goyt: async function () {
        (WG.SendCmd("jh fam 9 start;go enter;go up;"), await WG.sleep(1e3));
        var t = "";
        for (let e = 0; e < legacy.getRoomData().length; e++)
          legacy.getRoomData()[e].name &&
            0 <= legacy.getRoomData()[e].name.indexOf("疯癫的老头") &&
            (t = legacy.getRoomData()[e].id);
        WG.SendCmd(
          "ggdl " +
            t +
            ";go north;go north;go north;go north;$wait 250;go north;go north;look shi;tiao1 shi;tiao3 shi;$wait 250;tiao1 shi;tiao3 shi;tiao2 shi;go north;",
        );
      },
      gogzm: async function () {
        (WG.SendCmd("jh fam 9 start;go enter;go up;"), await WG.sleep(1e3));
        var t = "";
        for (let e = 0; e < legacy.getRoomData().length; e++)
          legacy.getRoomData()[e].name &&
            0 <= legacy.getRoomData()[e].name.indexOf("疯癫的老头") &&
            (t = legacy.getRoomData()[e].id);
        WG.SendCmd(
          "ggdl " +
            t +
            ";go north;go north;go north;go north;$wait 250;go north;go north;$wait 250;look shi;tiao1 shi;tiao1 shi;tiao2 shi;$wait 250;jumpdown;",
        );
      },
      godddb: async function () {
        (WG.SendCmd("jh fam 9 start;go enter;go up;"), await WG.sleep(1e3));
        var t = "";
        for (let e = 0; e < legacy.getRoomData().length; e++)
          legacy.getRoomData()[e].name &&
            0 <= legacy.getRoomData()[e].name.indexOf("疯癫的老头") &&
            (t = legacy.getRoomData()[e].id);
        WG.SendCmd(
          "ggdl " +
            t +
            ";go north;go north;go north;go north;$wait 250;go north;go down;",
        );
      },
      killall: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          console.log("叫杀"),
          WG.kill_all(),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      getall: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          console.log("拾取"),
          WG.get_all(),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      cleanall: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          console.log("清包"),
          await WG.clean_all(),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      to: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        await WG.go(t);
        if (typeof WG.waitUntilAt === "function") await WG.waitUntilAt(t);
        else await WG.sleep(100);
        WG.SendCmd(s);
      },
      eq: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          "0" == t ? WG.uneqall() : WG.eqhelper(t),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      eqskill: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          "0" == t ? WG.uneqall(1) : WG.eqhelper(t, 1),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      eqdel: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          WG.eqhelperdel(t),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      zdwk: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)), WG.zdwk(), await WG.sleep(100), WG.SendCmd(s));
      },
      rzdwk: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          WG.zdwk("", !1),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      killhook: void 0,
      killw: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        var o = "";
        for (let e = 0; e < legacy.getRoomData().length; e++)
          legacy.getRoomData()[e].name &&
            0 <= legacy.getRoomData()[e].name.indexOf(t) &&
            (o = legacy.getRoomData()[e].id);
        ((T.killhook = WG.add_hook("itemremove", function (e) {
          e.id == o &&
            (WG.SendCmd(s), WG.remove_hook(T.killhook), (T.killhook = void 0));
        })),
          WG.SendCmd("kill " + o));
      },
      eqhook: void 0,
      eqw: async function (e = 0, o, t) {
        var a = T.recmd(e, t);
        if (0 <= o.indexOf("<"))
          T._findItem(o, async function (e) {
            let t = e,
              s = !0;
            if ("" == t) ((s = !1), WG.SendCmd(a));
            else
              for (
                T.eqhook = WG.add_hook("dialog", function (e) {
                  0 == e.eq &&
                    e.id == t &&
                    ((s = !1),
                    WG.SendCmd(a),
                    WG.remove_hook(T.eqhook),
                    (T.eqhook = void 0));
                });
                s;
              )
                (WG.Send("pack"), WG.SendCmd("eq " + t), await WG.sleep(1e3));
          });
        else {
          let t = o,
            s = !0;
          if ("" == t) ((s = !1), WG.SendCmd(a));
          else
            for (
              T.eqhook = WG.add_hook(["text", "dialog"], function (e) {
                ("dialog" == e.type &&
                  0 == e.eq &&
                  e.id == t &&
                  ((s = !1),
                  WG.SendCmd(a),
                  WG.remove_hook(T.eqhook),
                  (T.eqhook = void 0)),
                  "text" == e.type &&
                    0 <= e.msg.indexOf("你要装备什么") &&
                    ((s = !1),
                    WG.SendCmd(a),
                    WG.remove_hook(T.eqhook),
                    (T.eqhook = void 0)));
              });
              s;
            )
              (WG.Send("pack"), WG.SendCmd("eq " + t), await WG.sleep(1e3));
        }
      },
      usezml: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        for (var o of legacy.loadWorkflows())
          o.name == t && (await WG.zmlfire(o));
        (await WG.sleep(100), WG.SendCmd(s));
      },
      waitpfm: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        let o = !0,
          a = 0;
        for (; o;)
          (G.gcd ||
            G.cds.get(t) ||
            (WG.Send("perform " + t),
            a++,
            G.cds.get(t) && o && ((o = !1), WG.SendCmd(s)),
            !G.in_fight && o && ((o = !1), WG.SendCmd(s)),
            1 <= a && o && ((o = !1), WG.SendCmd(s))),
            a++,
            await WG.sleep(350));
      },
      startjk: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        for (var o of legacy.loadStatusMonitors())
          if (o.name == t) {
            ((o.isactive = 1),
              legacy.saveStatusMonitors(),
              WG.ztjk_func(),
              messageAppend("已注入" + o.name, 0, 1));
            break;
          }
        (await WG.sleep(100), WG.SendCmd(s));
      },
      stopjk: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        for (var o of legacy.loadStatusMonitors())
          if (o.name == t) {
            ((o.isactive = 0),
              legacy.saveStatusMonitors(),
              WG.ztjk_func(),
              messageAppend("已暂停" + o.name));
            break;
          }
        (await WG.sleep(100), WG.SendCmd(s));
      },
      sm: async function (e = 0, t, s = "") {
        for (
          s = T.recmd(e, s), WG.sm_button();
          0 <= $(".sm_button").text().indexOf("停止");
        )
          await WG.sleep(1e3);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      daily: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        const workflowGeneration =
          typeof WG.getDailyWorkflowGeneration === "function"
            ? WG.getDailyWorkflowGeneration()
            : undefined;
        const isCurrentWorkflow = () =>
          workflowGeneration === undefined ||
          (typeof WG.getDailyWorkflowGeneration === "function" &&
            WG.getDailyWorkflowGeneration() === workflowGeneration);
        legacy.getKeyApi().do_command("tasks");
        messageAppend("执行请安.", 1);
        if ((await WG.oneKeyQA()) === false || !isCurrentWorkflow()) return;
        WG.oneKeyDaily();
        await WG.sleep(2e3);
        if (!isCurrentWorkflow()) return;
        if (typeof WG.waitDailyWorkflow === "function") {
          if (!(await WG.waitDailyWorkflow()) || !isCurrentWorkflow()) return;
        } else {
          while (WG.daily_hook) await WG.sleep(1e3);
        }
        WG.Send("tasks");
        await WG.sleep(1e3);
        if (!isCurrentWorkflow()) return;
        WG.oneKeySD();
        if (typeof WG.waitSweepWorkflow === "function") {
          if (!(await WG.waitSweepWorkflow()) || !isCurrentWorkflow()) return;
        } else {
          while (WG.sd_hook) await WG.sleep(1e3);
        }
        await WG.sleep(100);
        if (isCurrentWorkflow()) WG.SendCmd(s);
      },
      xiyan: async function (e = 0, t, s) {
        for (s = T.recmd(e, s), WG.xiyan(), await WG.sleep(1e3); WG.marryhy;)
          await WG.sleep(1e3);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      yamen: async function (e = 0, t, s) {
        for (
          s = T.recmd(e, s), WG.go_yamen_task(), await WG.sleep(1e3);
          WG.yamen_lister;
        )
          await WG.sleep(1e3);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      wudao: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          WG.wudao_auto(),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      boss: async function (e = 0, t, s) {
        for (
          s = T.recmd(e, s),
            WG.kksBoss({ content: "听说xxx出现在逍遥派-青草坪一带。" }),
            await WG.sleep(1e3);
          WG.ksboss;
        )
          await WG.sleep(1e3);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      stoppfm: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          G.auto_preform &&
            ((G.auto_preform = !1),
            messageAppend("<hio>自动施法</hio>关闭"),
            WG.auto_preform("stop")),
          WG.updateNativeAutoAttackActionState(),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      startpfm: async function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          G.auto_preform ||
            ((G.auto_preform = !0),
            messageAppend("<hio>自动施法</hio>开启"),
            WG.auto_preform()),
          WG.updateNativeAutoAttackActionState(),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      stopautopfm: async function (e = 0, t, s) {
        var o;
        s = T.recmd(e, s);
        for (o of t.split(",")) WG.inArray(o, legacy.getBlockedPerforms()) || legacy.getBlockedPerforms().push(o);
        (console.log("当前自动施法黑名单为:" + legacy.getBlockedPerforms()),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      startautopfm: async function (e = 0, t, s) {
        s = T.recmd(e, s);
        for (var o = t.split(","), a = 0; a < legacy.getBlockedPerforms().length; a++)
          for (var i of o) i == legacy.getBlockedPerforms()[a] && legacy.getBlockedPerforms().baoremove(a);
        (console.log("当前自动施法黑名单为:" + legacy.getBlockedPerforms()),
          await WG.sleep(100),
          WG.SendCmd(s));
      },
      store: async function (e = 0, t, s) {
        for (s = T.recmd(e, s), await WG.sell_all(1, 0, 0); WG.packup_listener;)
          await WG.sleep(200);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      fenjie: async function (e = 0, t, s) {
        for (s = T.recmd(e, s), await WG.sell_all(0, 1, 0); WG.packup_listener;)
          await WG.sleep(200);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      drop: async function (e = 0, t, s) {
        for (s = T.recmd(e, s), await WG.sell_all(0, 0, 1); WG.packup_listener;)
          await WG.sleep(200);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      sellall: async function (e = 0, t, s) {
        for (s = T.recmd(e, s), await WG.sell_all(1, 1, 1); WG.packup_listener;)
          await WG.sleep(200);
        (await WG.sleep(100), WG.SendCmd(s));
      },
      callcontextMenu: function (e = 0, t, s) {
        $(".container").contextMenu({ x: 1, y: 1 });
      },
      stopallauto: function (e = 0, t, s) {
        ((s = T.recmd(e, s)),
          WG.stopAllAuto(),
          messageAppend("暂停自动喜宴及自动BOSS", 0, 1),
          WG.SendCmd(s));
      },
      startallauto: function (e, t, s) {
        ((s = T.recmd(e, s)),
          WG.reSetAllAuto(),
          messageAppend("恢复自动喜宴及自动BOSS", 0, 1),
          WG.SendCmd(s));
      },
      roll: function (e, t, s) {
        ((s = T.recmd(e, s)),
          1 == t
            ? WG.SendCmd("pty " + 100 * Math.random())
            : 2 == t
              ? WG.SendCmd("chat " + 100 * Math.random())
              : 3 == t && WG.SendCmd("say " + 100 * Math.random()),
          WG.SendCmd(s));
      },
      addstore: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.addstore(t), WG.SendCmd(s));
      },
      addlock: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.addlock(t), WG.SendCmd(s));
      },
      dellock: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.dellock(t), WG.SendCmd(s));
      },
      tnbuy: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.tnBuy(), WG.SendCmd(s));
      },
      zxbuy: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.zxBuy(), WG.SendCmd(s));
      },
      atlx: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.selectLowKongfu(parseInt(t)), WG.SendCmd(s));
      },
      addfenjieid: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.addfenjieid(t), WG.SendCmd(s));
      },
      adddrop: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.adddrop(t), WG.SendCmd(s));
      },
      clsSakada: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.clean_dps(), WG.SendCmd(s));
      },
      cls: function (e, t, s) {
        ((s = T.recmd(e, s)), messageClear(), WG.SendCmd(s));
      },
      syso: function (e, t, s) {
        ((s = T.recmd(e, s)), messageAppend(t), WG.SendCmd(s));
      },
      stop: function (e, t, s) {
        ((s = T.recmd(e, s)), WG.timer_close(), WG.SendCmd(s));
      },
      tts: function (e, t, s) {
        ((s = T.recmd(e, s)), services.speech.playtts(t), WG.SendCmd(s));
      },
      beep: async function (e, t, s) {
        ((s = T.recmd(e, s)), services.beep(), WG.SendCmd(s));
      },
      music: function (e, t, s) {
        s = T.recmd(e, s);
        new services.MusicBox({
          loop: !1,
          musicText:
            "6 - - 5 - 3 2 - 1 - - - 3 - - 2 1 - ·6 ·5 - - - ·5 - ·6 - ·5 - ·6 - 1 - - 2 - 3 5 6 - - 3 2 1 - 2",
          autoplay: 6,
          type: "triangle",
          duration: 2,
        });
        WG.SendCmd(s);
      },
    };
    const ProConsole = {
      init: function () {
        var lastrun;
        L.isMobile()
          ? layer.prompt(
              { title: "请输入...", formType: 2 },
              function (text, index) {
                var jscode;
                (layer.close(index),
                  null != text &&
                    (0 <= text.split("\n")[0].indexOf("//")
                      ? legacy.performRaid(text)
                      : 0 <= text.split("\n")[0].indexOf("#js")
                        ? ((jscode = text.split("\n")),
                          jscode.baoremove(0),
                          eval(jscode.join("")))
                        : WG.SendCmd(text)));
              },
            )
          : (layer.open({
              type: 1,
              title: "运行命令",
              shade: !1,
              offset: "rb",
              zIndex: 961024,
              success: function (e, t) {
                $(".runtesta").show();
              },
              content: $(".runtest"),
              end: function () {
                ($(".runtesta").off("click"), $(".runtesta").hide());
              },
            }),
            (lastrun = GM_getValue("_lastrun", "")),
            "" != lastrun && $("#testmain").val(lastrun),
            $(".runtesta").off("click"),
            $(".runtesta").on("click", function () {
              var jscode;
              0 <= $("#testmain").val().split("\n")[0].indexOf("//")
                ? legacy.performRaid($("#testmain").val())
                : 0 <= $("#testmain").val().split("\n")[0].indexOf("#js")
                  ? ((jscode = $("#testmain").val().split("\n")),
                    jscode.baoremove(0),
                    eval(jscode.join("")))
                  : WG.SendCmd($("#testmain").val());
            }),
            $("#testmain").focusout(function () {
              GM_setValue("_lastrun", $("#testmain").val());
            }));
      },
      close: function () {
        layer.close();
      },
    };

    return { T, ProConsole };
  });
})(window);
