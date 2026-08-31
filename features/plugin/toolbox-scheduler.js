/** Calculator toolbox and scheduled command management. */
(function registerToolboxScheduler(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("toolbox-scheduler", function install(context) {
    const { WG, G, UI, T, L, legacy, messageAppend, messageClear } = context;
    function loadTimeQuestions() {
      return GM_getValue(
        legacy.getRoleId() + "_timequestion",
        legacy.getTimeQuestions(),
      );
    }
    function saveTimeQuestions(value) {
      legacy.setTimeQuestions(value);
      GM_setValue(legacy.getRoleId() + "_timequestion", value);
    }

    Object.assign(WG, {
      calc: function () {
        messageClear();
        (messageAppend(UI.jsquivue),
          new Vue({
            el: ".JsqVueUI",
            data: { status: 1 },
            methods: {
              qnjs_btn: function () {
                WG.qnjs();
              },
              lxjs_btn: function () {
                WG.lxjs();
              },
              khjs_btn: function () {
                WG.khjs();
              },
              zcjs_btn: function () {
                WG.zcjs();
              },
              getskilljson: function () {
                WG.getPlayerSkill();
              },
              autoAddLianxi: function () {
                var e = prompt("请输入修炼到多少级", "1");
                null != e &&
                  ("NaN" == parseFloat(e).toString()
                    ? messageAppend("请输入数字")
                    : WG.selectLowKongfu(e));
              },
              onekeydaily: function () {
                WG.SendCmd("$daily");
              },
              onekeypk: function () {
                WG.auto_fight();
              },
              onekeysansan: function () {
                legacy.getRaid()
                  ? legacy.getRaid().perform(`//~silent
                        // 导入三三懒人包流程，方便后续导入操作
                        // 自命令类型选 Raidjs流程
                        // 四区白三三
                        ($f_ss)={"name":"三三懒人包","source":"https://cdn.jsdelivr.net/gh/mapleobserver/wsmud-script/三三懒人包.flow.txt","finder":"根文件夹"}
                        @js var time=Date.parse(new Date());var f=(f_ss);var n=f["name"];var s=f["source"];var fd=f["finder"];WorkflowConfig.removeWorkflow({"name":n,"type":"flow","finder":fd});$.get(s,{stamp:time},function(data,status){WorkflowConfig.createWorkflow(n,data,fd);});
                        @await 2000
                        tm 【三三懒人包】流程已导入，如果曾用早期版本的懒人包导入过流程，请先删除这些流程后再使用。`)
                  : messageAppend("请先安装Raid.js");
              },
              onelddh: function () {
                legacy.getRaid()
                  ? legacy.getRaid().perform(`//
                        ($f_ss)={"name":"来点动画","source":"http://ii74.oss-cn-qingdao.aliyuncs.com/gif.txt","finder":"根文件夹"}
                        @js var time=Date.parse(new Date());var f=(f_ss);var n=f["name"];var s=f["source"];var fd=f["finder"];WorkflowConfig.removeWorkflow({"name":n,"type":"flow","finder":fd});$.get(s,{stamp:time},function(data,status){WorkflowConfig.createWorkflow(n,data,fd);});
                        @awiat 2000
                        tm 来点动画已导入`)
                  : messageAppend("请先安装Raid.js");
              },
              onekeystore: function () {
                WG.SendCmd("$store");
              },
              onekeysell: function () {
                WG.SendCmd("$drop");
              },
              onekeyfenjie: function () {
                WG.SendCmd("$fenjie");
              },
              updatestore: function () {
                WG.update_store();
              },
              cleandps: function () {
                WG.clean_dps();
              },
              sortstore: function () {
                WG.sort_all();
              },
              sortbag: function () {
                WG.sort_all_bag();
              },
              dsrw: function () {
                WG.dsj();
              },
              zdybtnset: function () {
                WG.zdy_btnset();
              },
              cleankksboss: function () {
                (GM_setValue(legacy.getRoleId() + "_autoKsBoss", null),
                  GM_setValue(legacy.getRoleId() + "_automarry", null),
                  L.msg("操作成功"));
              },
              onekeydelaytest: function () {
                WG.wsdelaytest();
              },
              yuanshen: function () {
                window.location.href =
                  "https://ys.mihoyo.com/cloud/?utm_source=default#/";
              },
              onekeyyaota: function () {
                T.goyt();
              },
            },
          }));
      },
      dsj_hook: void 0,
      dsj_func: function () {
        const timequestion = loadTimeQuestions();
        (WG.dsj_hook && WG.remove_hook(WG.dsj_hook),
          messageAppend("已注入定时任务", 0, 1),
          (WG.dsj_hook = WG.add_hook("time", (t) => {
            if ("time" == t.type) {
              let e = 0;
              for (var s of timequestion)
                (((s.h == t.h && s.m == t.m && s.s == t.s) ||
                  ("" == s.h && s.m == t.m && s.s == t.s) ||
                  ("" == s.h && "" == s.m && s.s == t.s)) &&
                  (messageAppend("已触发计划" + s.name, 1, 0),
                  WG.SendCmd(s.send),
                  1 == s.type) &&
                  (messageAppend("一次性任务,已移除" + s.name, 1, 0),
                  timequestion.baoremove(e),
                  saveTimeQuestions(timequestion)),
                  (e += 1));
            }
          })));
      },
      dsj: function () {
        const timequestion = loadTimeQuestions();
        (WG.dsj_func(),
          messageClear(),
          messageAppend(UI.timeoutui),
          $(".startQuest").off("click"),
          $(".removeQuest").off("click"));
        for (let o of timequestion) {
          var e = `<span class='addrun${o.name}'>编辑${o.name}</span>
                <span class='stoprun${o.name}'>删除${o.name}</span>
             <br/>
                `;
          ($(".questlist").append(e),
            $(".addrun" + o.name).on("click", () => {
              ($("#questname").val(o.name),
                $("#rtype").val(o.type),
                $("#ht").val(o.h),
                $("#mt").val(o.m),
                $("#st").val(o.s),
                $("#zml_info").val(o.send));
            }),
            $(".stoprun" + o.name).on("click", () => {
              var e,
                t = o.name;
              let s = 0;
              for (e of timequestion)
                (e.name == t && timequestion.baoremove(s), (s += 1));
              (saveTimeQuestions(timequestion), WG.dsj());
            }));
        }
        ($(".startQuest").on("click", () => {
          let e = $("#questname").val();
          var t,
            s = $("#rtype").val(),
            o = $("#ht").val(),
            a = $("#mt").val(),
            i = $("#st").val(),
            n = $("#zml_info").val(),
            l = {
              name: (e = e.replaceAll(" ", "_")),
              type: s,
              send: n,
              h: o,
              m: a,
              s: i,
            };
          let d = 0;
          for (t of timequestion) {
            if (e == t.name)
              return (
                (timequestion[d] = l),
                saveTimeQuestions(timequestion),
                void WG.dsj()
              );
            d += 1;
          }
          (timequestion.push(l),
            saveTimeQuestions(timequestion),
            WG.dsj());
        }),
          $(".removeQuest").on("click", () => {
            var e,
              t = $("#questname").val();
            let s = 0;
            for (e of timequestion) {
              if (e.name == t) return void timequestion.baoremove(s);
              s += 1;
            }
            (saveTimeQuestions(timequestion), WG.dsj());
          }));
      },
      qnjs: function () {
        messageClear();
        (messageAppend(UI.qnjsui),
          new Vue({
            el: ".QianNengCalc",
            data: { qnsx: { m: 0, c: 0, color: 0 } },
            methods: {
              qnjscalc: function () {
                ($.each(this.qnsx, (e, t) => {
                  this.qnsx[e] = Number(t);
                }),
                  messageAppend(
                    "需要潜能:" +
                      WG.dian(this.qnsx.c, this.qnsx.m, this.qnsx.color),
                  ));
              },
            },
          }));
      },
      lxjs: function () {
        messageClear();
        (messageAppend(UI.lxjsui),
          new Vue({
            el: ".StudyTimeCalc",
            data: {
              jsqsx: {
                xtwx: 0,
                htwx: 0,
                lxxl: 0,
                clevel: 0,
                mlevel: 0,
                color: 0,
              },
            },
            created() {
              ((this.jsqsx.xtwx = G.score.int),
                (this.jsqsx.htwx = G.score.int_add),
                (this.jsqsx.lxxl = parseInt(
                  G.score2.lianxi_per.replaceAll("%", ""),
                )));
            },
            methods: {
              lxjscalc: function () {
                $.each(this.jsqsx, (e, t) => {
                  this.jsqsx[e] = Number(t);
                });
                var e = WG.lx(
                  this.jsqsx.xtwx,
                  this.jsqsx.htwx,
                  this.jsqsx.lxxl,
                  this.jsqsx.clevel,
                  this.jsqsx.mlevel,
                  this.jsqsx.color,
                );
                messageAppend(
                  "需要潜能:" + e.qianneng + "     所需时间:" + e.time,
                );
              },
            },
          }));
      },
      khjs: function () {
        messageClear();
        (messageAppend(UI.khjsui),
          new Vue({
            el: ".KaihuaCalc",
            data: { khsx: { nl: 0, xg: 0, hg: 0 } },
            created() {
              ((this.khsx.nl = G.score.max_mp),
                (this.khsx.xg = G.score.con),
                (this.khsx.hg = G.score.con_add));
            },
            methods: {
              khjscalc: function () {
                ($.each(this.khsx, (e, t) => {
                  this.khsx[e] = Number(t);
                }),
                  messageAppend(
                    "你的分值:" +
                      WG.gen(this.khsx.nl, this.khsx.xg, this.khsx.hg),
                  ));
              },
            },
          }));
      },
      zcjs: function () {
        messageClear();
        (messageAppend(UI.zcjsui),
          new Vue({
            el: ".ZiChuangCalc",
            data: { zcsx: { level: 0, percentage: 0 } },
            methods: {
              zcjscalc: function () {
                messageAppend(
                  "自创" +
                    this.zcsx.level +
                    "级,词条百分比:" +
                    this.zcsx.percentage +
                    " 需要词条等级:" +
                    Math.ceil(
                      (this.zcsx.percentage - 4 - 0.0025 * this.zcsx.level) /
                        this.zcsx.level /
                        25e-6,
                    ),
                );
              },
            },
          }));
      },
    });
  });
})(window);
