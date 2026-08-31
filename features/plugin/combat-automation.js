/** Automatic combat skill scheduling. */
(function registerCombatAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("combat-automation", function install(context) {
    const { WG, G, legacy } = context;
    const blockedPerforms = legacy.getBlockedPerforms();
    const getSkills = () => (Array.isArray(G.skills) ? G.skills : []);

    Object.assign(WG, {
      reportAutoAttackState: function (enabled) {
        var dialog = global.Dialog,
          process = global.Process,
          channel = dialog && dialog.channel,
          message =
            "自动攻击 " + (enabled ? "已开启" : "已关闭"),
          data = {
            ch: "tm",
            name: G.name || "插件",
            uid: G.id || null,
            content: message,
          };
        if (
          !channel ||
          !process ||
          !process.channel ||
          typeof channel.createElement !== "function"
        )
          return;
        var rendered = channel.createElement(data, false);
        rendered && process.channel.push(rendered);
        process.channel.scroll2end && process.channel.scroll2end();
      },
      auto_preform_switch: function () {
        G.auto_preform
          ? ((G.auto_preform = !1),
            WG.reportAutoAttackState(false),
            WG.auto_preform("stop"))
          : ((G.auto_preform = !0),
            WG.reportAutoAttackState(true),
            WG.auto_preform());
        WG.syncAutoAttackUiState();
      },
      forcebufskil: "",
      bufskill: {},
      xubuf: null,
      pfmskill: null,
      is_free: function () {
        return !(
          WG.hasStr("faint", G.selfStatus) ||
          WG.hasStr("busy", G.selfStatus) ||
          WG.hasStr("rash", G.selfStatus) ||
          WG.hasStr("bss", G.selfStatus)
        );
      },
      is_zero_releasetime: function () {
        var releaseTime = G.score2 && G.score2.releasetime;
        if (releaseTime == null) return false;
        var match = String(releaseTime)
          .replace(/<[^>]*>/g, "")
          .match(/(-?\d+(?:\.\d+)?)\s*秒/);
        return !!match && Number(match[1]) === 0;
      },
      auto_preform: function (e) {
        if ("stop" == e)
          ((G.selfStatus = []),
            (WG.xubuf = null),
            (WG.pfmskil = null),
            (WG.pfmskill = null),
            G.preform_timer &&
              (clearInterval(G.preform_timer),
              (G.preform_timer = void 0),
              $(".auto_perform").css("background", ""),
              (WG.forcebufskil = ""),
              (WG.bufskill = {})));
        else if (!G.preform_timer && 0 != G.auto_preform) {
          var t;
          WG.prepareAutoFirstRound();
          $(".auto_perform").css("background", "#3E0000");
          if (!getSkills().length)
            messageAppend(
              "<hir>自动施法尚未收到可用招式列表；等待战斗协议刷新</hir>",
            );
          var disabledPerforms = GM_getValue(
            legacy.getRoleId() + "_unauto_pfm",
            legacy.getDisabledPerforms(),
          );
          legacy.setDisabledPerforms(disabledPerforms);
          for (t of disabledPerforms.split(","))
            WG.hasStr(t, blockedPerforms) || blockedPerforms.push(t);
          if (
            (WG.hasStr("force.tuoli", blockedPerforms) ||
              blockedPerforms.push("force.tuoli"),
            G.auto_pfm_mode)
          ) {
            (!G.score2 || G.score2.releasetime == null) &&
              typeof WG.requestAutomationScore2 === "function" &&
              WG.requestAutomationScore2();
            let a = [
                "force.cui",
                "force.power",
                "force.xi",
                "force.xin",
                "force.chu",
                "force.ztd",
                "force.zhen",
                "force.busi",
                "force.wang",
              ],
              i = {
                weapon: ["sword.wu", "blade.shi", "sword.yu"],
                ztd: ["force.ztd"],
                mingyu: ["force.wang"],
                force: ["*"],
                dodge: [
                  "dodge.power",
                  "dodge.fo",
                  "dodge.gui",
                  "dodge.lingbo",
                  "dodge.zhui",
                ],
              };
            ((WG.xubuf = null),
              (WG.pfmskill = null),
              (G.preform_timer = setInterval(() => {
                var o;
                0 == G.in_fight
                  ? WG.auto_preform("stop")
                  : WG.processAutoFirstRound()
                    ? void 0
                  : ((o = []),
                    null == WG.xubuf &&
                      (WG.xubuf = setTimeout(async () => {
                        for (var e of getSkills())
                          if (!WG.hasStr(e.id, blockedPerforms)) {
                            for (var t in i)
                              for (var s of i[t])
                                if (s == e.id) {
                                  if (
                                    !G.gcd &&
                                    !G.cds.get(e.id) &&
                                    !WG.hasStr(t, G.selfStatus)
                                  ) {
                                    for (
                                      WG.Send("perform " + e.id),
                                        await WG.sleep(200);
                                      !G.cds.get(e.id);
                                    ) {
                                      if (0 == G.in_fight)
                                        return void WG.auto_preform("stop");
                                      if (!WG.is_free()) break;
                                      (WG.Send("perform " + e.id),
                                        await WG.sleep(200));
                                    }
                                    WG.hasStr(t, G.selfStatus) &&
                                      (console.log("buf技能" + e.id),
                                      (WG.bufskill[t] = e.id));
                                  }
                                  break;
                                }
                            if (
                              WG.hasStr(e.id, a) &&
                              !G.gcd &&
                              !G.cds.get(e.id) &&
                              !WG.hasStr("force", G.selfStatus)
                            ) {
                              for (
                                WG.Send("perform " + e.id), await WG.sleep(200);
                                !G.cds.get(e.id) &&
                                !WG.hasStr("force", G.selfStatus);
                              ) {
                                if (0 == G.in_fight)
                                  return void WG.auto_preform("stop");
                                if (!WG.is_free()) break;
                                (WG.Send("perform " + e.id),
                                  await WG.sleep(200));
                              }
                              (WG.hasStr("force", G.selfStatus) &&
                                (console.log("内功buf技能" + e.id),
                                (WG.forcebufskil = e.id)),
                                o.push(e.id));
                            }
                          }
                        WG.xubuf = null;
                      }, 10)),
                    null == WG.pfmskill &&
                      (WG.pfmskill = setTimeout(async () => {
                        for (var e of getSkills())
                          if (!WG.hasStr(e.id, blockedPerforms)) {
                            if (G.gcd) break;
                            if (!(
                              G.gcd ||
                              G.cds.get(e.id) ||
                              WG.hasStr(e.id, a) ||
                              WG.hasStr(e.id, i)
                            )) {
                              if (
                                (WG.Send("perform " + e.id),
                                !WG.is_zero_releasetime())
                              )
                                break;
                              if ((await WG.sleep(20), !WG.is_free())) break;
                            }
                            if (
                              "" != WG.forcebufskil &&
                              !G.gcd &&
                              !G.cds.get(e.id) &&
                              WG.hasStr(e.id, a) &&
                              e.id != WG.forcebufskil &&
                              !WG.hasStr(e.id, i.mingyu) &&
                              !WG.hasStr(e.id, i.ztd) &&
                              (console.log("使用无buf的内功技能" + e.id),
                              WG.Send("perform " + e.id),
                              !WG.is_free())
                            )
                              break;
                          }
                        WG.pfmskill = null;
                          }, 10)));
              }, 300)));
          } else
            G.preform_timer = setInterval(() => {
              if (0 == G.in_fight) {
                WG.auto_preform("stop");
                return;
              }
              if (WG.processAutoFirstRound()) return;
              for (var e of getSkills()) {
                if (
                  !WG.inArray(e.id, blockedPerforms) &&
                  !G.gcd &&
                  !G.cds.get(e.id)
                ) {
                  WG.Send("perform " + e.id);
                  break;
                }
              }
            }, 350);
        }
      },
    });
  });
})(window);
