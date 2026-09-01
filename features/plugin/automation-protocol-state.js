/** Main automation protocol-state hook, kept as one legacy-ordered handler. */
(function registerAutomationProtocolState(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "automation-protocol-state",
    function create(context) {
      const getWG = context.getWG;
      const getG = context.getG;
      const getGI = context.getGI;
      const getJquery = context.getJquery || (() => context.jquery || global.$);
      const timers = context.timers || {
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
      };
      const storage = context.storage || {
        get: function (key, fallback) {
          return arguments.length > 1
            ? global.GM_getValue(key, fallback)
            : global.GM_getValue(key);
        },
        set: (key, value) => global.GM_setValue(key, value),
      };
      const getRoleId = context.getRoleId || (() => undefined);
      const getWs = context.getWs || (() => undefined);
      const getMessageAppend =
        context.getMessageAppend || (() => global.messageAppend);
      const getZdyskilllist = context.getZdyskilllist || (() => "");
      const setZdyskilllist = context.setZdyskilllist || (() => {});
      const getBusyInfo = context.getBusyInfo || (() => "关");
      const setBattleTime = context.setBattleTime || (() => {});

      function init() {
        var o = !1;
        getWG().add_hook(
          [
            "status",
            "login",
            "levelup",
            "exits",
            "room",
            "items",
            "itemadd",
            "itemremove",
            "sc",
            "text",
            "state",
            "msg",
            "perform",
            "clearDistime",
            "dispfm",
            "combat",
            "die",
          ],
          function handleProtocolState(o) {
            const WG = getWG();
            const G = getG();
            const $ = getJquery();
            const messageAppend = getMessageAppend();
            switch (o.type) {
              case "login":
                (function () {
                  var shouldGreetChief = !G.connected || G.id != o.id;
                  G.id != o.id &&
                    WG.stopPotentialWorkAutoCheck &&
                    WG.stopPotentialWorkAutoCheck();
                  (G.id != o.id &&
                    ((G.hp = void 0),
                    (G.maxHp = void 0),
                    (G.mp = void 0),
                    (G.maxMp = void 0)),
                    (G.id = o.id),
                    (G.connected = !0),
                    (WG.online = !0),
                    WG.applyDashboardLevel(o.level),
                    WG.requestDashboardSnapshot(),
                    WG.requestAutomationScore2());
                  shouldGreetChief &&
                    WG.scheduleDashboardStateRefresh &&
                    WG.scheduleDashboardStateRefresh({ pack: true, delay: 200 });
                  var socket = getWs();
                  shouldGreetChief &&
                    (!WG.isPluginFeatureEnabled ||
                      WG.isPluginFeatureEnabled("autoGreetOnOpen")) &&
                    socket &&
                    1 == socket.readyState &&
                    socket.send("sx greet");
                })();
                break;
              case "levelup":
                (WG.applyDashboardLevel(o.level),
                  WG.requestDashboardSnapshot());
                break;
              case "exits":
                ((G.exits = new Map()),
                  o.items.north &&
                    G.exits.set("north", { exits: o.items.north }),
                  o.items.south &&
                    G.exits.set("south", { exits: o.items.south }),
                  o.items.east &&
                    G.exits.set("east", { exits: o.items.east }),
                  o.items.west &&
                    G.exits.set("west", { exits: o.items.west }),
                  o.items.northup &&
                    G.exits.set("northup", { exits: o.items.northup }),
                  o.items.southup &&
                    G.exits.set("southup", { exits: o.items.southup }),
                  o.items.eastup &&
                    G.exits.set("eastup", { exits: o.items.eastup }),
                  o.items.westup &&
                    G.exits.set("westup", { exits: o.items.westup }),
                  o.items.northdown &&
                    G.exits.set("northdown", { exits: o.items.northdown }),
                  o.items.southdown &&
                    G.exits.set("southdown", { exits: o.items.southdown }),
                  o.items.eastdown &&
                    G.exits.set("eastdown", { exits: o.items.eastdown }),
                  o.items.westdown &&
                    G.exits.set("westdown", { exits: o.items.westdown }),
                  o.items.up && G.exits.set("up", { exits: o.items.up }),
                  o.items.down &&
                    G.exits.set("down", { exits: o.items.down }),
                  o.items.enter &&
                    G.exits.set("enter", { exits: o.items.enter }),
                  o.items.out && G.exits.set("out", { exits: o.items.out }));
                break;
              case "room":
                var a = o.path.split("/");
                ((G.map = a[0]),
                  (G.room = a[1]),
                  "home" == G.map || "kuang" == G.room
                    ? (G.can_auto = !0)
                    : (G.can_auto = !1),
                  (G.room_name = o.name),
                  G.in_fight &&
                    ((G.in_fight = !1),
                    WG.auto_preform("stop"),
                    WG.clean_dps()));
                break;
              case "items":
                G.items = new Map();
                for (var e = 0; e < o.items.length; e++) {
                  var i = o.items[e];
                  if (i.id) {
                    if (i.id == G.id && null != i.status) {
                      G.selfStatus = [];
                      for (var n = 0; n < i.status.length; n++)
                        G.selfStatus.push(i.status[n].sid);
                    }
                    i.id == G.id &&
                      ((G.hp = i.hp),
                      (G.maxHp = i.max_hp),
                      (G.mp = i.mp),
                      (G.maxMp = i.max_mp));
                    let e = $.trim($("<body>" + i.name + "</body>").text());
                    var l = e.lastIndexOf(" "),
                      d = e.lastIndexOf("<");
                    let t = "",
                      s = "";
                    (0 <= d && (s = e.substr(d + 1, 2)),
                      0 <= l &&
                        ((t = e.substr(0, l)),
                        (e = e.substr(l + 1).replace(/<.*>/g, ""))),
                      G.items.set(i.id, {
                        name: e,
                        title: t,
                        state: s,
                        max_hp: i.max_hp,
                        max_mp: i.max_mp,
                        hp: i.hp,
                        mp: i.mp,
                        p: i.p,
                        damage: 0,
                        status: i.status,
                      }));
                  }
                }
                break;
              case "itemadd":
                if (o.id) {
                  let e = $.trim($("<body>" + o.name + "</body>").text());
                  var a = e.lastIndexOf(" "),
                    r = e.lastIndexOf("<");
                  let t = "",
                    s = "";
                  (0 <= a &&
                    ((t = e.substr(0, a)),
                    0 <= r && (s = e.substr(r + 1, 2)),
                    (e = e.substr(a + 1).replace(/<.*>/g, ""))),
                    G.items.set(o.id, {
                      name: e,
                      title: t,
                      state: s,
                      max_hp: o.max_hp,
                      max_mp: o.max_mp,
                      hp: o.hp,
                      mp: o.mp,
                      p: o.p,
                      damage: 0,
                      status: o.status,
                    }));
                }
                break;
              case "itemremove":
                G.items.delete(o.id);
                break;
              case "sc":
                r = G.items.get(o.id);
                (r &&
                  (void 0 !== o.hp && (r.hp = o.hp),
                  void 0 !== o.max_hp && (r.max_hp = o.max_hp),
                  void 0 !== o.mp && (r.mp = o.mp),
                  void 0 !== o.max_mp && (r.max_mp = o.max_mp)),
                  void 0 !== o.hp && o.id != G.id && (G.scid = o.id),
                  o.id == G.id &&
                    (null != o.hp && (G.hp = o.hp),
                    null != o.max_hp && (G.maxHp = o.max_hp),
                    null != o.mp && (G.mp = o.mp),
                    null != o.max_mp && (G.maxMp = o.max_mp)));
                break;
              case "perform":
                ((G.skills = o.skills),
                  "" == getZdyskilllist() &&
                    (setZdyskilllist(JSON.stringify(o.skills)),
                    storage.set(
                      getRoleId() + "_zdyskilllist",
                      getZdyskilllist(),
                    )),
                  WG.renderAutoFirstRoundDialog());
                break;
              case "clearDistime":
                G.cds.forEach(function (e, t) {
                  G.cds.set(t, !1);
                });
              case "dispfm":
                (o.id &&
                  (o.distime,
                  G.cds.set(o.id, !0),
                  (s = o.id),
                  timers.setTimeout(function () {
                    G.cds.set(s, !1);
                    var e = {
                      data: JSON.stringify({ type: "enapfm", id: s }),
                    };
                    WG.receive_message(e);
                  }, o.distime)),
                  o.rtime &&
                    (G.gcd && timers.clearTimeout(getGI().gcdThread),
                    (G.gcd = !0),
                    (getGI().gcdThread = timers.setTimeout(function () {
                      G.gcd = !1;
                    }, o.rtime))));
                break;
              case "combat":
                (o.start &&
                  (WG.resetAutoFirstRoundCombat(),
                  (G.in_fight = !0),
                  setBattleTime(new Date()),
                  WG.auto_preform()),
                  o.end &&
                    ((G.in_fight = !1),
                    WG.auto_preform("stop"),
                    WG.clean_dps()));
                break;
              case "status":
                if (
                  (null != o.count &&
                    G.status.set(o.id, { sid: o.sid, count: o.count }),
                  o.id == G.id)
                )
                  if ("add" == o.action)
                    (G.selfStatus.push(o.sid),
                      o.duration &&
                        timers.setTimeout(
                          () => {
                            G.selfStatus.remove(o.sid);
                          },
                          o.duration - (o.overtime || 0),
                        ));
                  else if ("remove" == o.action) {
                    var t = [];
                    for (let e = 0; e < G.selfStatus.length; e++)
                      G.selfStatus[e] != o.sid && t.push(G.selfStatus[e]);
                    G.selfStatus = t;
                  } else "clear" == o.action && (G.selfStatus = []);
                if ("开" === getBusyInfo())
                  if (o.id == G.id) {
                    if (
                      "add" == o.action &&
                      ("busy" == o.sid || "faint" == o.sid)
                    ) {
                      var s = o.id;
                      if (
                        (messageAppend(
                          `你被${o.name}了${o.duration / 1e3}秒`,
                          2,
                          0,
                        ),
                        "绊字诀" == o.name)
                      )
                        return;
                    }
                  } else
                    "add" != o.action ||
                      ("busy" != o.sid &&
                        "faint" != o.sid &&
                        "chidun" != o.sid &&
                        "unarmed" != o.sid) ||
                      messageAppend(
                        `${G.items.get(o.id).name}被${o.name}了${o.duration / 1e3}秒`,
                        2,
                        0,
                      );
                var m = G.items.get(o.id);
                if (null != m)
                  if ("add" == o.action)
                    (null == m.status && (m.status = []),
                      m.status.push({
                        sid: o.sid,
                        name: o.name,
                        duration: o.duration,
                        overtime: 0,
                      }));
                  else if ("remove" == o.action) {
                    for (let e = 0; e < m.status.length; e++)
                      if (m.status[e].sid == o.sid) {
                        m.status.splice(e, 1);
                        break;
                      }
                  } else if ("clear" == o.action)
                    for (let e = 0; e < m.status.length; e++) m.status.splice(e, 1);
                break;
              case "text":
                (0 <= o.msg.indexOf("还没准备好，你还不能使用。") &&
                  (G.gcd ||
                    ((G.gcd = !0),
                    timers.setTimeout(() => {
                      G.gcd = !1;
                    }, 500))),
                  (0 <= o.msg.indexOf("不要急") ||
                    0 <= o.msg.indexOf("你现在手忙脚乱") ||
                    0 <= o.msg.indexOf("你正在昏迷") ||
                    0 <= o.msg.indexOf("你上个技能")) &&
                    G.auto_preform &&
                    (G.gcd ||
                      ((G.gcd = !0),
                      timers.setTimeout(() => {
                        G.gcd = !1;
                      }, 500))));
                break;
              case "die":
                G.selfStatus = [];
            }
          },
        );
      }

      return { init };
    },
  );
})(window);
