/** Smart travel, team resonance and potential-work selection workflows. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("navigation-enhancements", function install(context) {
    const { WG, G, UI, legacy, messageAppend } = context;

    Object.assign(WG, {
      yamenTeleportRequestToken: 0,
      yamenTeleportResponseHook: void 0,
      yamenTeleportResponseTimer: void 0,
      yamenTeleportResponseResolve: void 0,
      cancelYamenTeleportRequest: function () {
        var finish = WG.yamenTeleportResponseResolve;
        if (finish) {
          finish("cancelled");
          return;
        }
        if (WG.yamenTeleportResponseHook != null) {
          WG.remove_hook(WG.yamenTeleportResponseHook);
          WG.yamenTeleportResponseHook = void 0;
        }
        if (WG.yamenTeleportResponseTimer != null) {
          clearTimeout(WG.yamenTeleportResponseTimer);
          WG.yamenTeleportResponseTimer = void 0;
        }
      },
      waitForYamenTaskResponse: function (npcId) {
        return new Promise(function (resolve) {
          var finish = function (result) {
            if (WG.yamenTeleportResponseResolve != finish) return;
            if (WG.yamenTeleportResponseHook != null)
              WG.remove_hook(WG.yamenTeleportResponseHook);
            clearTimeout(WG.yamenTeleportResponseTimer);
            WG.yamenTeleportResponseHook = void 0;
            WG.yamenTeleportResponseTimer = void 0;
            WG.yamenTeleportResponseResolve = void 0;
            resolve(result);
          };
          WG.yamenTeleportResponseResolve = finish;
          WG.yamenTeleportResponseHook = WG.add_hook("text", function (event) {
            var message = String((event && event.msg) || "").replace(
              /<[^>]*>/g,
              "",
            );
            if (
              message.indexOf("你来的正好") >= 0 ||
              message.indexOf("你还没加入衙门吧") >= 0 ||
              message.indexOf("你不是在追捕吗") >= 0
            )
              finish("accepted");
            else if (message.indexOf("已经是最高等级的神捕") >= 0)
              finish("highest");
            else if (message.indexOf("最近没有在逃的逃犯") >= 0)
              finish("empty");
            else if (message.indexOf("没有这个人") >= 0)
              finish("missing");
          });
          WG.yamenTeleportResponseTimer = setTimeout(function () {
            finish("timeout");
          }, 5000);
          WG.Send("ask1 " + npcId);
        });
      },
      go_yamen_teleport_task: async function () {
        WG.cancelYamenTeleportRequest();
        if (typeof WG.go_yamen_task !== "function") {
          messageAppend("<hir>衙门追捕模块尚未加载。</hir>");
          return;
        }
        var run = function () {
          return WG.go_yamen_task();
        };
        return typeof WG.runAfterBuiltinActionLoadout === "function"
          ? WG.runAfterBuiltinActionLoadout("yamen", run)
          : run();
      },
      smartHomeHook: void 0,
      smartHomeTimer: void 0,
      cancelSmartHomeWatch: function () {
        if (WG.smartHomeHook != null) {
          WG.remove_hook(WG.smartHomeHook);
          WG.smartHomeHook = void 0;
        }
        if (WG.smartHomeTimer != null) {
          clearTimeout(WG.smartHomeTimer);
          WG.smartHomeTimer = void 0;
        }
      },
      go_home: function () {
        return typeof WG.runAfterBuiltinActionLoadout === "function"
          ? WG.runAfterBuiltinActionLoadout("home", WG.startSmartHomeTravel)
          : WG.startSmartHomeTravel();
      },
      startSmartHomeTravel: function () {
        WG.cancelSmartHomeWatch();
        WG.smartHomeHook = WG.add_hook("room", function (event) {
          var path = "string" == typeof event.path ? event.path : "",
            name = "string" == typeof event.name ? event.name : "";
          if (0 == path.indexOf("home/")) {
            WG.cancelSmartHomeWatch();
            return;
          }
          if ("yz/home" != path && -1 == name.indexOf("住宅大门")) return;
          WG.cancelSmartHomeWatch();
          WG.go("扬州城-有间客栈");
        });
        WG.smartHomeTimer = setTimeout(function () {
          WG.cancelSmartHomeWatch();
        }, 1e4);
        WG.Send("goto home");
      },
      go_wumiao: function () {
        var run = function () {
          WG.go("扬州城-武庙");
        };
        return typeof WG.runAfterBuiltinActionLoadout === "function"
          ? WG.runAfterBuiltinActionLoadout("wumiao", run)
          : run();
      },
      team_resonance_hook: void 0,
      team_resonance_active: !1,
      team_resonance_waiting: !1,
      team_resonance_timer: void 0,
      team_resonance: function () {
        if (WG.team_resonance_active) return;
        WG.team_resonance_hook ||
          (WG.team_resonance_hook = WG.add_hook(["dialog", "text"], function (e) {
            if (!WG.team_resonance_active) return;
            if ("dialog" == e.type && "team" == e.dialog && !WG.team_resonance_waiting) {
              WG.team_resonance_waiting = !0;
              e.items && e.items.length ? WG.Send("team out") : messageAppend("当前没有队伍");
              WG.Send("say 共鸣");
              return;
            }
            if ("text" == e.type && WG.team_resonance_waiting && e.msg && e.msg.indexOf("邀请你加入组队") >= 0) {
              WG.Send("team reply ok");
              WG.team_resonance_active = !1;
              WG.team_resonance_waiting = !1;
              clearTimeout(WG.team_resonance_timer);
              WG.team_resonance_timer = void 0;
              messageAppend("已自动同意组队邀请");
            }
          }));
        WG.team_resonance_active = !0;
        WG.team_resonance_waiting = !1;
        clearTimeout(WG.team_resonance_timer);
        WG.team_resonance_timer = setTimeout(function () {
          WG.team_resonance_active = !1;
          WG.team_resonance_waiting = !1;
          WG.team_resonance_timer = void 0;
          messageAppend("等待组队邀请超时，已停止自动同意");
        }, 15000);
        WG.Send("team");
        messageAppend("正在检查队伍并发送：共鸣");
      },
      go_master: function () {
        var run = function () {
          WG.Send("goto fam1");
        };
        return typeof WG.runAfterBuiltinActionLoadout === "function"
          ? WG.runAfterBuiltinActionLoadout("master", run)
          : run();
      },
      showPotentialWorkMessage: function (message) {
        if (typeof global.ReceiveMessage === "function")
          return global.ReceiveMessage(message);
        messageAppend(message, 0, 1);
      },
      beginPotentialWorkAt: async function (target, command, workId, stopFirst) {
        WG.stopPotentialWorkAutoCheck();
        var cancelled = false, finishStage;
        var cancel = function () {
          cancelled = true;
          finishStage && finishStage(null);
        };
        G.potentialWorkArrivalCancel = cancel;
        var matches = function (name) {
          name = String(name || "").replace(/<[^>]*>/g, "").trim();
          return name === target || name === target.split("-").pop();
        };
        var waitForStage = function (stop) {
          return new Promise(function (resolve) {
            var hook, timer, finished = false;
            var finish = function (result) {
              if (finished) return;
              finished = true;
              clearTimeout(timer);
              hook != null && WG.remove_hook(hook);
              if (G.potentialWorkStopAck === finish)
                G.potentialWorkStopAck = void 0;
              finishStage = void 0;
              resolve(result);
            };
            finishStage = finish;
            timer = setTimeout(function () { finish(false); }, 8000);
            if (stop) {
              G.potentialWorkStopAck = finish;
              WG.Send("stopstate");
            } else {
              hook = WG.add_hook("room", function (event) {
                if (matches(event.name)) finish(true);
              });
            }
          });
        };
        try {
          var hasCurrentState = G.potentialWorkObservedState === void 0
            ? $(".state-bar .title").length > 0
            : G.potentialWorkObservedState;
          if (stopFirst && hasCurrentState) {
            var stopped = await waitForStage(true);
            if (cancelled) return;
            if (!stopped) {
              WG.showPotentialWorkMessage("<hio>智能挂机</hio>停止当前动作未获确认，请重试");
              return;
            }
          }
          await WG.go(target);
          if (cancelled) return;
          var arrived = matches(G.room_name) || await waitForStage(false);
          if (cancelled) return;
          if (!arrived || !G.connected || !WG.online) {
            WG.showPotentialWorkMessage("<hio>智能挂机</hio>未能到达" + target + "，未开始" +
              ({ mining: "挖矿", herbalism: "采药", fishing: "钓鱼" })[workId]);
            return;
          }
          WG.Send(command);
          WG.schedulePotentialWorkAutoCheck(workId);
        } finally {
          if (G.potentialWorkArrivalCancel === cancel)
            G.potentialWorkArrivalCancel = void 0;
        }
      },
      parsePotentialWorkBonuses: function (items) {
        var bonuses = { mining: 0, fishing: 0, herbalism: 0 },
          definitions = [
            {
              id: "mining",
              keywords: ["挖矿", "矿山", "挖矿指南", "挖矿宝典"],
            },
            { id: "fishing", keywords: ["钓鱼", "鱼获"] },
            {
              id: "herbalism",
              keywords: ["采药", "药王新篇"],
            },
          ];
        (items || []).forEach(function (item) {
          var text = String(
              (item && item[1] ? item[1] : "") +
                " " +
                (item && item[2] ? item[2] : ""),
            ).replace(/<[^>]*>/g, ""),
            values = [],
            match,
            valuePattern =
              /(?:经验|潜能|挖矿效率|钓鱼效率|采药效率)[^+＋\d]{0,10}[+＋]\s*(\d+)/g;
          while ((match = valuePattern.exec(text)))
            values.push(Number(match[1]));
          if (!values.length) return;
          definitions.forEach(function (definition) {
            if (
              definition.keywords.some(function (keyword) {
                return text.indexOf(keyword) >= 0;
              })
            )
              bonuses[definition.id] = Math.max(
                bonuses[definition.id],
                Math.max.apply(Math, values),
              );
          });
        });
        return bonuses;
      },
      rankPotentialWorks: function (items) {
        var bonuses = WG.parsePotentialWorkBonuses(items),
          works = [
            { id: "mining", name: "挖矿", bonus: bonuses.mining },
            {
              id: "herbalism",
              name: "采药",
              bonus: bonuses.herbalism,
            },
            { id: "fishing", name: "钓鱼", bonus: bonuses.fishing },
          ];
        return works.sort(function (left, right) {
          return right.bonus - left.bonus;
        });
      },
      requestBestPotentialWork: function (currentWorkId, quietWhenUnchanged) {
        if (G.potentialWorkSelectionPending) return;
        G.potentialWorkSelectionPending = true;
        var hook,
          timer,
          silentMatcher,
          finished = false,
          cancel = function () {
            if (finished) return false;
            finished = true;
            clearTimeout(timer);
            hook != null && WG.remove_hook(hook);
            if (silentMatcher && WG.silentResponseMatchers)
              for (
                var index = WG.silentResponseMatchers.length - 1;
                index >= 0;
                index--
              )
                WG.silentResponseMatchers[index].matcher == silentMatcher &&
                  WG.silentResponseMatchers.splice(index, 1);
            if (G.potentialWorkSelectionCancel == cancel) {
              G.potentialWorkSelectionPending = false;
              G.potentialWorkSelectionCancel = void 0;
            }
            return true;
          },
          finish = function (items, timedOut) {
            if (!cancel()) return;
            if (timedOut && currentWorkId) return;
            var ranked = WG.rankPotentialWorks(items),
              currentWork = currentWorkId
                ? ranked.find(function (work) {
                    return work.id == currentWorkId;
                  })
                : null;
            if (
              currentWork &&
              currentWork.bonus >= ranked[0].bonus
            ) {
              quietWhenUnchanged ||
                WG.showPotentialWorkMessage(
                  "<hio>智能挂机</hio>当前" +
                    currentWork.name +
                    "已是潜能收益最高项",
                );
              return;
            }
            currentWorkId && WG.stopPotentialWorkAutoCheck();
            WG.startPotentialWork(ranked[0], ranked.slice(1));
          };
        G.potentialWorkSelectionCancel = cancel;
        hook = WG.add_hook("dialog", function (event) {
          if (event.dialog == "events" && event.items) finish(event.items);
        });
        silentMatcher = function (event) {
          return (
            event.type == "dialog" &&
            event.dialog == "events" &&
            event.items != null
          );
        };
        WG.suppressNextResponse(silentMatcher, 5000);
        timer = setTimeout(function () {
          finish([], true);
        }, 5000);
        WG.Send("events");
      },
      startPotentialWork: function (work, fallbacks) {
        work = work || { id: "mining", name: "挖矿", bonus: 0 };
        WG.startPreparedPotentialWork(work, fallbacks);
      },
      startPreparedPotentialWork: function (work, fallbacks) {
        work = work || { id: "mining", name: "挖矿", bonus: 0 };
        fallbacks = fallbacks || [];
        var bonusText = work.bonus
          ? "（活动额外 +" + work.bonus + " 潜能/10秒）"
          : "（当前无挂机潜能活动加成）";
        WG.showPotentialWorkMessage("<hio>智能挂机</hio>选择" + work.name + bonusText);
        if (work.id == "herbalism") {
          return WG.beginPotentialWorkAt("扬州城-药林", "cai", "herbalism", true);
        }
        if (work.id == "fishing") {
          WG.startFishingPotentialWork(fallbacks);
          return;
        }
        WG.zdwk(void 0, false, true);
      },
      startFishingPotentialWork: function (fallbacks) {
        var hook,
          timer,
          finished = false,
          fallback = function (reason) {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            hook != null && WG.remove_hook(hook);
            reason && WG.showPotentialWorkMessage("<hio>智能挂机</hio>" + reason);
            WG.startPotentialWork(
              fallbacks && fallbacks.length
                ? fallbacks[0]
                : { id: "mining", name: "挖矿", bonus: 0 },
              fallbacks ? fallbacks.slice(1) : [],
            );
          };
        hook = WG.add_hook("dialog", function (event) {
          if (event.dialog != "pack" || !event.items) return;
          var pack = WG.deserializePackData(structuredClone(event)),
            equippedRod =
              pack.eqs &&
              pack.eqs[0] &&
              String(pack.eqs[0].name || "").indexOf("钓鱼竿") >= 0,
            rod = null,
            hasBait = false;
          (pack.items || []).forEach(function (item) {
            var name = String(item.name || "");
            if (name.indexOf("钓鱼竿") >= 0 && (!rod || item.grade > rod.grade))
              rod = item;
            name.indexOf("鱼饵") >= 0 && Number(item.count || 1) > 0 &&
              (hasBait = true);
          });
          if (!hasBait) return fallback("没有鱼饵，改选下一项");
          if (!equippedRod && !rod)
            return fallback("没有钓鱼竿，改选下一项");
          finished = true;
          clearTimeout(timer);
          WG.remove_hook(hook);
          WG.Send("stopstate");
          !equippedRod && WG.Send("eq " + rod.id);
          setTimeout(function () {
            WG.beginPotentialWorkAt("扬州城-江边", "diao", "fishing");
          }, equippedRod ? 0 : 500);
        });
        WG.suppressNextResponse(
          function (event) {
            return (
              event.type == "dialog" &&
              event.dialog == "pack" &&
              event.items != null
            );
          },
          5000,
        );
        timer = setTimeout(function () {
          fallback("背包检查超时，改选下一项");
        }, 5000);
        WG.Send("pack");
      },
      stopPotentialWorkAutoCheck: function () {
        G.potentialWorkArrivalCancel && G.potentialWorkArrivalCancel();
        G.potentialWorkSelectionCancel &&
          G.potentialWorkSelectionCancel();
        G.potentialWorkAutoCheckTimer &&
          clearTimeout(G.potentialWorkAutoCheckTimer);
        G.potentialWorkAutoCheckTimer = void 0;
        G.potentialWorkCurrentId = void 0;
      },
      schedulePotentialWorkAutoCheck: function (currentWorkId) {
        if (!currentWorkId) return WG.stopPotentialWorkAutoCheck();
        G.potentialWorkCurrentId = currentWorkId;
        if (G.potentialWorkAutoCheckTimer) return;
        G.potentialWorkAutoCheckTimer = setTimeout(function () {
          G.potentialWorkAutoCheckTimer = void 0;
          if (
            !G.connected ||
            !WG.online ||
            !G.potentialWorkCurrentId
          )
            return WG.stopPotentialWorkAutoCheck();
          WG.requestBestPotentialWork(G.potentialWorkCurrentId, true);
          WG.schedulePotentialWorkAutoCheck(G.potentialWorkCurrentId);
        }, 5000);
      },
      handlePotentialWorkState: function (event) {
        if (!event)
          return WG.stopPotentialWorkAutoCheck();
        G.potentialWorkObservedState = !!event.state;
        if (!event.state && G.potentialWorkStopAck) {
          G.potentialWorkStopAck(true);
          return true;
        }
        var state = String(event.state || "").replace(/<[^>]*>/g, ""),
          currentWorkId = state.indexOf("挖矿") >= 0
            ? "mining"
            : state.indexOf("采药") >= 0
              ? "herbalism"
              : state.indexOf("钓鱼") >= 0
                ? "fishing"
                : null;
        if (!currentWorkId) return WG.stopPotentialWorkAutoCheck();
        if (G.potentialWorkCurrentId == currentWorkId)
          return WG.schedulePotentialWorkAutoCheck(currentWorkId);
        WG.stopPotentialWorkAutoCheck();
        G.potentialWorkCurrentId = currentWorkId;
        WG.requestBestPotentialWork(currentWorkId);
        WG.schedulePotentialWorkAutoCheck(currentWorkId);
      },
      zdwk: async function (e, t = !0, skipPotentialSelection = false) {
        if (e != "remove" && t !== false && !skipPotentialSelection)
          return WG.requestBestPotentialWork();
        if (t && G.level && G.isGod()) {
          await WG.go("住房-练功房");
          WG.Send("xiulian");
        }
        else if (legacy.isTransportAvailable()) {
          if ("remove" == e)
            G.wk_listener &&
              (WG.remove_hook(G.wk_listener), (G.wk_listener = void 0));
          else if (!G.wk_listener) {
            let i,
              t = !1;
            ((G.wk_listener = WG.add_hook(
              ["dialog", "text"],
              async function (s) {
                if ("dialog" == s.type && "pack" == s.dialog) {
                  s = structuredClone(s);
                  let t;
                  if ((s = WG.deserializePackData(s)).name) {
                    if (/铁镐|移山镐/.test(s.name))
                      return (
                        WG.Send("eq " + s.id),
                        await WG.sleep(2e3),
                        await WG.beginPotentialWorkAt("扬州城-矿山", "wa", "mining"),
                        void WG.zdwk("remove", !1)
                      );
                  } else if (s.items) {
                    if (
                      s.eqs[0] &&
                      /铁镐|移山镐/.test(String(s.eqs[0].name || ""))
                    )
                      return (
                        await WG.sleep(1e3),
                        await WG.beginPotentialWorkAt("扬州城-矿山", "wa", "mining"),
                        void WG.zdwk("remove", !1)
                      );
                    for (let e = 0; e < s.items.length; e++) {
                      var o = s.items[e];
                      if (
                        /铁镐|移山镐/.test(String(o.name || "")) &&
                        (!t || Number(o.grade || 0) > Number(t.grade || 0))
                      )
                        t = o;
                    }
                    if (t) {
                      t = t.id;
                    }
                    if (t)
                      return (
                        WG.Send("eq " + t),
                        await WG.sleep(2e3),
                        await WG.beginPotentialWorkAt("扬州城-矿山", "wa", "mining"),
                        void WG.zdwk("remove", !1)
                      );
                    (await WG.go("扬州城-打铁铺"), WG.Send("look 1"));
                  }
                }
                var e;
                if (
                  ("text" == s.type && "你要看什么？" == s.msg
                    ? (e = WG.getIdByName("铁匠"))
                      ? ((i = e), WG.Send("list " + e))
                      : (messageAppend("<hio>自动挖矿</hio>未发现铁匠"),
                        WG.zdwk("remove", !1))
                    : "text" == s.type &&
                      ("你挥着铁镐开始认真挖矿。" == s.msg
                        ? WG.zdwk("remove")
                        : ("你现在正忙。" == s.msg ||
                            "你正在战斗，待会再说。" == s.msg ||
                            0 <= s.msg.indexOf("不要急") ||
                            0 <= s.msg.indexOf("这个方向没有出路")) &&
                          0 == t &&
                          ((t = !0),
                          messageAppend("卡顿,五秒后再次尝试操作", 0, 1),
                          setTimeout(() => {
                            ((t = !1), WG.zdwk("remove", !1), WG.zdwk());
                          }, 5e3))),
                  "dialog" == s.type && "list" == s.dialog && s.seller == i)
                ) {
                  ((s = structuredClone(s)), (s = WG.deserializePackData(s)));
                  let t;
                  for (let e = 0; e < s.selllist.length; e++) {
                    var a = s.selllist[e];
                    if ("<wht>铁镐</wht>" == a.name) {
                      t = a.id;
                      break;
                    }
                  }
                  t
                    ? (WG.Send("buy 1 " + t + " from " + i),
                      await WG.sleep(2e3))
                    : (messageAppend(
                        "<hio>自动挖矿</hio>无法购买<wht>铁镐</wht>",
                      ),
                      WG.zdwk("remove", !1));
                }
              },
            )),
              WG.Send("stopstate;pack"));
          }
        } else {
          t = $(".room_items .room-item:first .item-name").text();
          if (
            (-1 == (t = t.indexOf("<挖矿"))
              ? (messageAppend("当前不在挖矿状态"),
                0 == legacy.getWorkTimer() &&
                  (console.log(legacy.getWorkTimer()),
                  WG.go("扬州城-矿山"),
                  WG.eq("铁镐"),
                  WG.Send("wa"),
                  legacy.setWorkTimer(setInterval(WG.zdwk, 5e3))))
              : WG.timer_close(),
            WG.at("扬州城-矿山") && -1 == t)
          )
            (WG.go("扬州城-打铁铺"),
              WG.buy(legacy.getPackGoods()["铁镐"]),
              messageAppend("自动买铁镐"));
          else if (WG.at("扬州城-打铁铺")) {
            var s,
              e = $(".dialog-list > .obj-list:eq(1)");
            if (e.length) {
              messageAppend("查找铁镐ID");
              for (var o of e.children())
                if (
                  ((s = (o = $(o)).attr("obj")),
                  "铁镐" == $(o.children()[0]).html())
                ) {
                  ((legacy.getEquipment()["铁镐"] = s), WG.eq("铁镐"));
                  break;
                }
              (GM_setValue(legacy.getRoleId() + "_equip", legacy.getEquipment()),
                WG.go("扬州城-矿山"),
                WG.Send("wa"));
            }
          }
        }
      },
    });
  });
})(window);
