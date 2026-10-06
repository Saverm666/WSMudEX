(function registerTriggerMonitors(global) {
  "use strict";

  global.WSMudPlugin.registerService("trigger-monitors", function create(context) {
    const triggerCore = context.triggerCore;
    const eventBus = context.eventBus;
    const getWG = context.getWG;
    const getRole = context.getRole;
    const timers = context.timers || {
      setTimeout: global.setTimeout.bind(global),
      clearTimeout: global.clearTimeout.bind(global),
    };
    const DateConstructor = context.Date || global.Date;
    const Notification = eventBus.Notification;
    const s = eventBus;
    const CopyObject = triggerCore.CopyObject;
    const Monitor = triggerCore.Monitor;
    const SelectFilter = triggerCore.SelectFilter;
    const InputFilter = triggerCore.InputFilter;
    const TriggerTemplate = triggerCore.TriggerTemplate;
    const n = triggerCore.templates;
    const c = triggerCore.equalFilter;
    const d = triggerCore.includeFilter;
    const e = triggerCore.excludeFilter;
    const f = triggerCore.containsFilter;
    const i = triggerCore.inputFormats;

    let a = null;
    let p = null;
    let g = Object.create(null);
    let started = false;
    let clockTimer = null;
    const cooldownTimers = new Map();
    const hookIds = [];
    const t = {
      _monitors: [],
      addMonitor: function (monitor) {
        this._monitors.push(monitor);
      },
    };

    function addHook(type, handler) {
      const wg = a || getWG();
      if (wg == null || typeof wg.add_hook !== "function") return null;
      const id = wg.add_hook(type, handler);
      hookIds.push(id);
      return id;
    }

    function scheduleSkillCooldown(skillId, delay) {
      timers.clearTimeout(cooldownTimers.get(skillId));
      let timerId;
      timerId = timers.setTimeout(() => {
        if (cooldownTimers.get(skillId) !== timerId) return;
        cooldownTimers.delete(skillId);
        const payload = { 技能id: skillId };
        payload.id = skillId;
        s.post(new Notification("技能冷却结束", payload));
      }, delay);
      cooldownTimers.set(skillId, timerId);
    }

    function registerDefinitions() {
      let r;
((r = [
        new SelectFilter("改变类型", ["新增", "移除", "层数刷新"], 0),
        new InputFilter("BuffId", i.text, "weapon", d),
        new SelectFilter("触发对象", ["自己", "他人"], 0),
      ]),
      (r = new TriggerTemplate(
        "Buff状态改变",
        r,
        `// Buff状态改变触发器
// 触发对象id：(id)
// buff的sid：(sid)
// buff层数：(count)
// duration持续时间：(duration)`,
      )),
      n.add(r),
      (r = new Monitor(function () {
        function M0(e, t, i) {
          (((i = {
            改变类型: i,
            BuffId: t,
            触发对象: e.id == p.id ? "自己" : "他人",
          }).id = e.id),
            (i.sid = t),
            (i.count = 0),
            (i.duration = 0),
            null != e.count && (i.count = e.count),
            null != e.duration && (i.duration = e.duration),
            (t = new Notification("Buff状态改变", i)),
            s.post(t));
        }
        addHook("status", (e) => {
          if (null != e.action && null != e.id && null != e.sid) {
            var t = { add: "新增", remove: "移除", refresh: "层数刷新" }[
              e.action
            ];
            if (null != t)
              if (e.sid instanceof Array) for (var i of e.sid) M0(e, i, t);
              else M0(e, e.sid, t);
          }
        });
      })),
      t.addMonitor(r),
      (r = [
        new SelectFilter(
          "频道",
          ["全部", "世界", "队伍", "门派", "全区", "帮派", "谣言", "系统"],
          0,
          function (e, t) {
            return "全部" == e || e == t;
          },
        ),
        new InputFilter("发言人", i.text, "", d),
        new InputFilter("忽略发言人", i.text, "", e),
        new InputFilter("关键字", i.text, "", f),
      ]),
      (r = new TriggerTemplate(
        "新聊天信息",
        r,
        `// 新聊天信息触发器
// 聊天信息内容：(content)
// 发言人：(name)
// 发言人id：(id)
// 频道：(channel)`,
      )),
      n.add(r),
      (r = new Monitor(function () {
        addHook("msg", (e) => {
          var t, i, n, r;
          null != e.ch &&
            null != e.content &&
            null !=
              (t = {
                chat: "世界",
                tm: "队伍",
                fam: "门派",
                es: "全区",
                pty: "帮派",
                rumor: "谣言",
                sys: "系统",
              }[e.ch]) &&
            ((i = null == e.name ? "无" : e.name),
            (n = null == e.uid ? null : e.uid),
            (r = e.content.replace(/\n/g, "")),
            ((e = {
              频道: t,
              发言人: i,
              关键字: e.content,
              忽略发言人: i,
            }).content = r),
            (e.name = i),
            (e.id = n),
            (e.channel = t),
            (r = new Notification("新聊天信息", e)),
            s.post(r));
        });
      })),
      t.addMonitor(r),
      (r = new InputFilter("人物名称", i.text, "", f)).description(
        "人名关键字",
      ),
      (r = new TriggerTemplate(
        "人物刷新",
        (r = [r]),
        `// 人物刷新触发器
// 刷新人物id：(id)
// 刷新人物名称：(name)`,
      )),
      n.add(r),
      (r = new Monitor(function () {
        addHook("itemadd", (e) => {
          var t;
          null != e.name &&
            null != e.id &&
            (((t = { 人物名称: e.name }).id = e.id),
            (t.name = e.name),
            (e = new Notification("人物刷新", t)),
            s.post(e));
        });
      })),
      t.addMonitor(r),
      (r = [new InputFilter("名称关键字", i.text, "", f)]),
      (r = new TriggerTemplate(
        "物品拾取",
        r,
        `// 物品拾取触发器
// 拾取物品id：(id)
// 拾取物品名称：(name)
// 拾取物品数量：(count)
// 物品品质：(quality)  值：白、绿、蓝、黄、紫、橙、红、未知`,
      )),
      n.add(r),
      (r = new Monitor(function () {
        addHook("dialog", function (e) {
          var t;
          "pack" == e.dialog &&
            null != e.id &&
            null != e.name &&
            null != e.count &&
            null == e.remove &&
            (((t = { 名称关键字: e.name }).id = e.id),
            (t.name = e.name),
            (t.count = e.count),
            (e = /<\w{3}>/.exec(e.name)[0]),
            (t.quality = {
              "<wht>": "白",
              "<hig>": "绿",
              "<hic>": "蓝",
              "<hiy>": "黄",
              "<HIZ>": "紫",
              "<hio>": "橙",
              "<ord>": "红",
            }[e]),
            (e = new Notification("物品拾取", t)),
            s.post(e));
        });
      })),
      t.addMonitor(r),
      (r = [new InputFilter("关键字", i.text, "", f)]),
      (r = new TriggerTemplate(
        "新提示信息",
        r,
        `// 新提示信息触发器
// 提示信息：(text)`,
      )),
      n.add(r),
      (r = new Monitor(function () {
        addHook("text", (e) => {
          var t;
          null != e.msg &&
            (((t = { 关键字: e.msg }).text = e.msg.replace(/\n/g, " ")),
            (e = new Notification("新提示信息", t)),
            s.post(e));
        });
      })),
      t.addMonitor(r),
      (r = [new SelectFilter("类型", ["进入战斗", "脱离战斗"], 0)]),
      (r = new TriggerTemplate("战斗状态切换", r, "// 战斗状态切换触发器")),
      n.add(r),
      (r = new Monitor(function () {
        (addHook("combat", (e) => {
          let t = null;
          null != e.start && 1 == e.start
            ? (t = { 类型: "进入战斗" })
            : null != e.end && 1 == e.end && (t = { 类型: "脱离战斗" });
          e = new Notification("战斗状态切换", t);
          s.post(e);
        }),
          addHook("text", function (e) {
            null == e.msg ||
              (-1 == e.msg.indexOf("只能在战斗中使用") &&
                -1 == e.msg.indexOf("这里不允许战斗") &&
                -1 == e.msg.indexOf("没时间这么做")) ||
              ((e = { 类型: "脱离战斗" }),
              (e = new Notification("战斗状态切换", e)),
              s.post(e));
          }));
      })),
      t.addMonitor(r),
      (r = [new SelectFilter("类型", ["已经死亡", "已经复活"], 0)]),
      (r = new TriggerTemplate("死亡状态改变", r, "// 死亡状态改变触发器")),
      n.add(r),
      (r = new Monitor(function () {
        addHook("die", (e) => {
          ((e = { 类型: null == e.relive ? "已经死亡" : "已经复活" }),
            (e = new Notification("死亡状态改变", e)));
          s.post(e);
        });
      })),
      t.addMonitor(r),
      (r = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
        38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
        56, 57, 58, 59,
      ]),
      (r = [
        new SelectFilter(
          "时",
          [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
            19, 20, 21, 22, 23,
          ],
          0,
          c,
        ),
        new SelectFilter("分", r, 0, c),
        new SelectFilter("秒", r, 0, c),
      ]),
      (r = new TriggerTemplate("时辰已到", r, "// 时辰已到触发器")),
      n.add(r),
      (r = new Monitor(function () {
        !(function timer() { if (!started) return;
          var e = new DateConstructor(),
            e = { 时: e.getHours(), 分: e.getMinutes(), 秒: e.getSeconds() },
            e = new Notification("时辰已到", e),
            e = (s.post(e), DateConstructor.now()),
            t = 1e3 * parseInt((e + 1e3) / 1e3) + 1;
          clockTimer = timers.setTimeout(() => {
            timer();
          }, t - e);
        })();
      })),
      t.addMonitor(r),
      (r = [new InputFilter("技能id", i.text, "", d)]),
      (r = new TriggerTemplate(
        "技能释放",
        r,
        `// 技能释放触发器
// 技能id：(id)
// 出招时间：(rtime)
// 冷却时间：(distime)`,
      )),
      n.add(r),
      (r = new InputFilter("技能id", i.text, "", d)),
      (r = new TriggerTemplate(
        "技能冷却结束",
        (r = [r]),
        `// 技能冷却结束触发器
// 技能id：(id)`,
      )),
      n.add(r),
      (r = new Monitor(function () {
        addHook("dispfm", (i) => {
          var e;
          null != i.id &&
            null != i.distime &&
            null != i.rtime &&
            (((e = { 技能id: i.id }).id = i.id),
            (e.rtime = i.rtime),
            (e.distime = i.distime),
            (e = new Notification("技能释放", e)),
            s.post(e),
            scheduleSkillCooldown(i.id, i.distime));
        });
        addHook("clearDistime", event => {
          const ids = event.id == null ? [...cooldownTimers.keys()] : [event.id];
          for (const id of ids) {
            if (!cooldownTimers.has(id)) continue;
            timers.clearTimeout(cooldownTimers.get(id));
            cooldownTimers.delete(id);
            s.post(new Notification("技能冷却结束", { 技能id: id, id }));
          }
        });
      })),
      t.addMonitor(r),
      {});
  ((r = [
    new InputFilter("人名关键字", i.text, "", f),
    new SelectFilter("类型", ["气血", "内力"], 0, c),
    new SelectFilter("当", ["低于", "高于"], 0, c),
    new SelectFilter("值类型", ["百分比", "数值"], 0, c),
    new InputFilter("值", i.number, 0, function (e, t) {
      var t = t.split(";"),
        i = parseFloat(t[0]),
        t = parseFloat(t[1]);
      return (e <= i && t < e) || (i <= e && e < t);
    }),
  ]),
    (r = new TriggerTemplate(
      "气血内力改变",
      r,
      `// 气血内力改变触发器
// 人物id：(id)
// 人物当前气血：(hp)
// 人物最大气血：(maxHp)
// 人物当前内力：(mp)
// 人物最大内力：(maxMp)`,
    )),
    n.add(r),
    (r = new Monitor(function () {
      (addHook("items", (e) => {
        if (null != e.items) {
          g = {};
          for (var t of e.items) g[t.id] = CopyObject(t);
        }
      }),
        addHook("itemadd", (e) => {
          g[e.id] = CopyObject(e);
        }));
      function dc(e, t) {
        ((e.id = t.id),
          (e.hp = t.hp),
          (e.maxHp = t.max_hp),
          (e.mp = t.mp),
          (e.maxMp = t.max_mp));
      }
      addHook("sc", (t) => {
        if (null != t.id) {
          var i = g[t.id];
          if (null != i) {
            if (null != t.hp) {
              let e = "低于";
              t.hp > i.hp && (e = "高于");
              var n = i.hp,
                r = ((i.hp / i.max_hp) * 100).toFixed(2),
                a =
                  ((i.hp = t.hp),
                  i.max_hp < i.hp && (i.max_hp = i.hp),
                  null != t.max_hp && (i.max_hp = t.max_hp),
                  i.hp),
                o = ((i.hp / i.max_hp) * 100).toFixed(2),
                r = {
                  人名关键字: i.name,
                  类型: "气血",
                  当: e,
                  值类型: "百分比",
                  值: r + ";" + o,
                },
                o = (dc(r, i), new Notification("气血内力改变", r)),
                r =
                  (s.post(o),
                  {
                    人名关键字: i.name,
                    类型: "气血",
                    当: e,
                    值类型: "数值",
                    值: n + ";" + a,
                  }),
                o = (dc(r, i), new Notification("气血内力改变", r));
              s.post(o);
            }
            if (null != t.mp) {
              let e = "低于";
              t.mp > i.mp && (e = "高于");
              ((n = i.mp),
                (a = ((i.mp / i.max_mp) * 100).toFixed(2)),
                (r =
                  ((i.mp = t.mp),
                  i.max_mp < i.mp && (i.max_mp = i.mp),
                  null != t.max_mp && (i.max_mp = t.max_mp),
                  i.mp)),
                (o = ((i.mp / i.max_mp) * 100).toFixed(2)),
                (t = {
                  人名关键字: i.name,
                  类型: "内力",
                  当: e,
                  值类型: "百分比",
                  值: a + ";" + o,
                }),
                (a = (dc(t, i), new Notification("气血内力改变", t))),
                (o =
                  (s.post(a),
                  {
                    人名关键字: i.name,
                    类型: "内力",
                    当: e,
                    值类型: "数值",
                    值: n + ";" + r,
                  })),
                (t = (dc(o, i), new Notification("气血内力改变", o))));
              s.post(t);
            }
          }
        }
      });
    })),
    t.addMonitor(r),
    (r = [
      new InputFilter("人名关键字", i.text, "", f),
      new SelectFilter("值类型", ["百分比", "数值"], 0, c),
      new InputFilter("值", i.number, 0, (e, t) => {
        var t = t.split(";"),
          i = parseFloat(t[0]),
          t = parseFloat(t[1]);
        return i <= e && e < t;
      }),
    ]),
    (r = new TriggerTemplate(
      "伤害已满",
      r,
      `// 伤害已满触发器
// 备注：限制条件-值 不支持多条件
// 人物id：(id)
// 人物名称：(name)
// 伤害数值：(value)
// 伤害百分比：(percent)`,
    )),
    n.add(r),
    (r = new Monitor(function () {
      function Qc(e, t, i, n) {
        ((e.id = t.id), (e.name = t.name), (e.value = i), (e.percent = n));
      }
      addHook("sc", (e) => {
        var t, i, n, r;
        null != e.id &&
          null != e.damage &&
          null != (t = g[e.id]) &&
          null != t.id &&
          null != t.name &&
          null != t.max_hp &&
          ((r = null == t._damage ? 0 : t._damage),
          (n = null == t._damagePer ? 0 : t._damagePer),
          (i = (((e = e.damage) / t.max_hp) * 100).toFixed(2)),
          (t._damage = e),
          (t._damagePer = i),
          (n = { 人名关键字: t.name, 值类型: "百分比", 值: n + ";" + i }),
          Qc(n, t, e, i),
          (n = new Notification("伤害已满", n)),
          s.post(n),
          (n = { 人名关键字: t.name, 值类型: "数值", 值: r + ";" + e }),
          Qc(n, t, e, i),
          (r = new Notification("伤害已满", n)),
          s.post(r));
      });
    })),
    t.addMonitor(r));

    }

    registerDefinitions();

    function start() {
      if (started) return false;
      a = getWG();
      p = getRole();
      if (a == null || p == null) {
        a = null;
        p = null;
        return false;
      }
      started = true;
      for (const monitor of t._monitors) monitor.run();
      return true;
    }

    function clearTimers() {
      if (clockTimer != null) {
        timers.clearTimeout(clockTimer);
        clockTimer = null;
      }
      for (const timerId of cooldownTimers.values()) timers.clearTimeout(timerId);
      cooldownTimers.clear();
    }

    function stop() {
      if (a != null && typeof a.remove_hook === "function") {
        for (const id of hookIds) a.remove_hook(id);
      }
      hookIds.length = 0;
      clearTimers();
      g = Object.create(null);
      a = null;
      p = null;
      started = false;
      return true;
    }

    function resetForRole() {
      stop();
      return start();
    }

    return {
      start,
      run: start,
      stop,
      resetForRole,
    };
  });
})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
