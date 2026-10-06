/** Raid-flow parser, compiler and execution engine. */
!(function () {
  var Message = {
    append: function (e) {
      console.log(e);
    },
    clean: function () {},
    cmdLog: function (e, t) {
      let o = `&nbsp;&nbsp;<hic>${e}</hic>`;
      (null != t && (o += ": " + t), this.append(o));
    },
  };
  function CopyObject(e) {
    return JSON.parse(JSON.stringify(e));
  }
  var FlowStore = null,
    PersistentVariables = null,
    CmdGroupManager = null,
    WorkflowConfigManager = null,
    CodeTranslator = null,
    WorkflowConfig = null;
  const raidFlowStorage = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-storage",
    {
      getRoleId: function () {
        return null == Role ? null : Role.id;
      },
      storage: {
        get: function (key, fallback) {
          return 1 < arguments.length
            ? GM_getValue(key, fallback)
            : GM_getValue(key);
        },
        set: function (key, value) {
          return GM_setValue(key, value);
        },
        remove: function (key) {
          return GM_deleteValue(key);
        },
        list: function () {
          return GM_listValues();
        },
      },
      alert: function (message) {
        return alert(message);
      },
    },
  );
  ((FlowStore = raidFlowStorage.FlowStore),
    (PersistentVariables = raidFlowStorage.PersistentVariables),
    (CmdGroupManager = raidFlowStorage.CmdGroupManager),
    (WorkflowConfigManager = raidFlowStorage.WorkflowConfigManager),
    (CodeTranslator = raidFlowStorage.CodeTranslator),
    (WorkflowConfig = raidFlowStorage.WorkflowConfig));
  const raidFlowCompiler = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-compiler",
    {
      getFlowStore: function () {
        return FlowStore;
      },
      appendMessage: function (html) {
        Message.append(html);
      },
    },
  );
  const SortInsert = raidFlowCompiler.SortInsert;
  const SourceCodeHelper = raidFlowCompiler.SourceCodeHelper;
  const PrecompileRule = raidFlowCompiler.PrecompileRule;
  const PrecompileRuleCenter = raidFlowCompiler.PrecompileRuleCenter;
  const PrecompileRulePriority = raidFlowCompiler.PrecompileRulePriority;
  const raidFlowAssert = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-assert",
  );
  var AssertLeftMarkHandlerCenter =
      raidFlowAssert.AssertLeftMarkHandlerCenter,
    AssertHolderCenter = raidFlowAssert.AssertHolderCenter;
  let AssertWrapper = raidFlowAssert.AssertWrapper,
    AssertHolder = raidFlowAssert.AssertHolder;
  let CmdPrehandlerPriority = { ordinary: 50 },
    CmdPrehandler,
    CmdPrehandleCenter,
    CmdExecutorPriority = {
      compiler: 90,
      high: 30,
      ordinary: 20,
      low: 10,
    },
    CmdExecutor,
    CmdExecuteCenter,
    Performer,
    ManagedPerformerCenter,
    AtCmdExecutor,
    UntilAtCmdExecutor,
    UntilSearchedAtCmdExecutor,
    PerformerPromise,
    UntilRoleFreePerformerPromise,
    SkillStateMachine,
    __systemCmdDelay = 1500,
    UnpackSystemCmd,
    AncientCmdExecuter;
  const raidFlowExecutionRuntime = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-execution-runtime",
    {
      getMessage: function () {
        return Message;
      },
      getCompiler: function () {
        return raidFlowCompiler;
      },
      getSortInsert: function () {
        return SortInsert;
      },
      getCmdPrehandlerPriority: function () {
        return CmdPrehandlerPriority;
      },
      getCmdExecutorPriority: function () {
        return CmdExecutorPriority;
      },
      getCmdPrehandleCenter: function () {
        return CmdPrehandleCenter;
      },
      getCmdExecutor: function () {
        return CmdExecutor;
      },
      getCmdExecuteCenter: function () {
        return CmdExecuteCenter;
      },
      getPerformer: function () {
        return Performer;
      },
      getRole: function () {
        return Role;
      },
      getWG: function () {
        return WG;
      },
      getSystemTips: function () {
        return SystemTips;
      },
      getSystemCmdDelay: function () {
        return __systemCmdDelay;
      },
      getSkillStateMachine: function () {
        return SkillStateMachine;
      },
      getUnpackSystemCmd: function () {
        return UnpackSystemCmd;
      },
      getAtCmdExecutor: function () {
        return AtCmdExecutor;
      },
      getUntilRoleFreePerformerPromise: function () {
        return UntilRoleFreePerformerPromise;
      },
      getAssertHolderCenter: function () {
        return AssertHolderCenter;
      },
      getDungeonCatalog: function () {
        return DungeonCatalog;
      },
      getAncientCmdExecuter: function () {
        return AncientCmdExecuter;
      },
      updateVariable: function () {
        return UpdateVariable.apply(null, arguments);
      },
      setWorkflowRunning: function (running) {
        $("#workflows-button").css(
          "border-color",
          running ? "#00FF00" : "inherit",
        );
      },
    },
  );
  ((CmdPrehandlerPriority =
    raidFlowExecutionRuntime.CmdPrehandlerPriority),
    (CmdPrehandler = raidFlowExecutionRuntime.CmdPrehandler),
    (CmdPrehandleCenter = raidFlowExecutionRuntime.CmdPrehandleCenter),
    (CmdExecutorPriority = raidFlowExecutionRuntime.CmdExecutorPriority),
    (CmdExecutor = raidFlowExecutionRuntime.CmdExecutor),
    (CmdExecuteCenter = raidFlowExecutionRuntime.CmdExecuteCenter),
    (Performer = raidFlowExecutionRuntime.Performer),
    (ManagedPerformerCenter =
      raidFlowExecutionRuntime.ManagedPerformerCenter),
    (AtCmdExecutor = raidFlowExecutionRuntime.AtCmdExecutor),
    (UntilAtCmdExecutor = raidFlowExecutionRuntime.UntilAtCmdExecutor),
    (UntilSearchedAtCmdExecutor =
      raidFlowExecutionRuntime.UntilSearchedAtCmdExecutor),
    (PerformerPromise = raidFlowExecutionRuntime.PerformerPromise),
    (UntilRoleFreePerformerPromise =
      raidFlowExecutionRuntime.UntilRoleFreePerformerPromise),
    (SkillStateMachine = raidFlowExecutionRuntime.SkillStateMachine),
    (__systemCmdDelay = raidFlowExecutionRuntime.systemCmdDelay),
    (UnpackSystemCmd = raidFlowExecutionRuntime.UnpackSystemCmd),
    (AncientCmdExecuter = raidFlowExecutionRuntime.AncientCmdExecuter));
  function TryCalculate(expression) {
    return /^[0-9\+\-\*\/% ]*$/g.test(expression)
      ? eval(expression)
      : expression;
  }
  ((() => {
    var e = new CmdExecutor(
      function (e) {
        return "%exit" == e;
      },
      function (e, t) {
        e.stop();
      },
      CmdExecutorPriority.compiler,
    );
    CmdExecuteCenter.addExecutor(e);
  })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return "%pass" == e;
        },
        function (e, t) {},
        CmdExecutorPriority.compiler,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    !(function () {
      let appropriate = function (e) {
          return 0 == e.indexOf("%PC=CC");
        },
        execute = function (performer, cmd) {
          performer._pc = eval("performer._cc" + cmd.substring(6));
        },
        executor = new CmdExecutor(
          appropriate,
          execute,
          CmdExecutorPriority.compiler,
        );
      CmdExecuteCenter.addExecutor(executor);
    })(),
    !(function () {
      let appropriate = function (e) {
          return 0 == e.indexOf("%PC=");
        },
        execute = function (performer, cmd) {
          performer._pc = eval(cmd.substring(4));
        },
        executor = new CmdExecutor(
          appropriate,
          execute,
          CmdExecutorPriority.compiler,
        );
      CmdExecuteCenter.addExecutor(executor);
    })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return 0 == e.indexOf("%CC=");
        },
        function (e, t) {
          ((t = CmdPrehandleCenter.shared().handle(e, t)),
            (t = AssertHolderCenter.get(t.substring(4))));
          e._cc = t();
        },
        CmdExecutorPriority.compiler,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return "%guardStart" == e;
        },
        function (e, t) {
          e._guarding = !0;
        },
        CmdExecutorPriority.compiler,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return "%guardEnd" == e;
        },
        function (e, t) {
          e._guarding = !1;
        },
        CmdExecutorPriority.compiler,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return /^<===[^爫]*===>$/.test(e);
        },
        function (e, t) {
          ((t = t.slice(4, -4)), (t = new Performer("subflow", t)));
          (e._subflows.push(t), t.start());
        },
        CmdExecutorPriority.compiler,
      );
      CmdExecuteCenter.addExecutor(e);
    })());
  function UpdateVariable(e, t, o) {
    /^_*[A-Z][a-zA-Z0-9_]*$/.test(t)
      ? PersistentVariables.save(t, TryCalculate(o))
      : /^_*[a-z][a-zA-Z0-9_]*$/.test(t) &&
        (null == e.tempParams && (e.tempParams = {}),
        (e.tempParams[t] = TryCalculate(o)));
  }
  (() => {
    var o = /^\(\$([A-Za-z_][a-zA-Z0-9_]*?)\)\s*=\s*(.+)\s*/,
      e = new CmdExecutor(
        function (e) {
          return o.test(e);
        },
        function (e, t) {
          ((t = CmdPrehandleCenter.shared().handle(e, t)), (t = o.exec(t)));
          UpdateVariable(e, t[1], t[2]);
        },
      );
    CmdExecuteCenter.addExecutor(e);
  })();
  var VariableStore = {
    register: function (e) {
      this._allGetAll.push(e);
    },
    getAll: function () {
      var e,
        t = {};
      for (e of this._allGetAll) {
        var o,
          n = e();
        for (o in n) n.hasOwnProperty(o) && (t[o] = n[o]);
      }
      return t;
    },
    _allGetAll: [],
  };
  (() => {
    let r = function (e, t) {
      for (var o = [], n = /\([:a-zA-Z0-9_]+?\)/g, r = n.exec(e); null != r;)
        (o.push(r[0]), (r = n.exec(e)));
      let i = e;
      for (let e = 0; e < o.length; e++) {
        var l = o[e],
          a = t[l.substring(1, l.length - 1)];
        (null == a && (a = "null"), (i = i.replace(l, a)));
      }
      var s,
        u = [],
        d = /\((:[a-zA-Z0-9_]+?)\s+([^\(\)\s][^\(\)]*?)\s*\)/g;
      let c = d.exec(i);
      for (; null != c;)
        (u.push({ value: c[0], key: c[1] + " ", params: c[2] }),
          (c = d.exec(i)));
      for (s of u) {
        var g = t[s.key];
        let e = "null";
        (null != g && "function" == typeof g && (e = g(s.params)),
          (i = i.replace(s.value, e)));
      }
      return i;
    };
    var e = new CmdPrehandler(function (e, t) {
      var o = {},
        e =
          (Object.assign(o, VariableStore.getAll(), e.tempParams),
          ((e, t) => {
            let o = e;
            for (;;) {
              var n = r(o, t);
              if (n == o) return o;
              o = n;
            }
          })(t, o));
      return e;
    });
    CmdPrehandleCenter.shared().addHandler(e);
  })();
  ((() => {
    var e = new AtCmdExecutor("wait", function (e, t) {
      return (
        e.log() && Message.cmdLog(`等待 ${(t / 1e3).toFixed(2)} 秒`),
        raidFlowExecutionRuntime.waitForPerformerDelay(e, t)
      );
    });
    CmdExecuteCenter.addExecutor(e);
  })(),
    (() => {
      var e = new AtCmdExecutor("await", function (e, n) {
        return raidFlowExecutionRuntime.waitForPerformerWorkerDelay(e, n);
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    !(function () {
      let executor = new AtCmdExecutor("debug", function (performer, param) {
        let text = param;
        ">" == text[0] && (text = JSON.stringify(eval(text.substring(1))));
        var message = `&nbsp;&nbsp;[debug]: <hiz>${text}</hiz>`;
        Message.append(message);
      });
      CmdExecuteCenter.addExecutor(executor);
    })(),
    (() => {
      var e = new AtCmdExecutor("print", function (e, t) {
        Message.append(t);
      });
      CmdExecuteCenter.addExecutor(e);
    })());
  ((() => {
    var e = new UntilAtCmdExecutor("until", function (e, t) {
      return AssertHolderCenter.get(t)();
    });
    CmdExecuteCenter.addExecutor(e);
  })(),
    !(function () {
      let appropriate = function (e) {
          return 0 == e.indexOf("@js ");
        },
        execute = function (performer, cmd) {
          let validCmd = CmdPrehandleCenter.shared().handle(performer, cmd),
            exp = validCmd.substring(4),
            result =
              (performer.log() && Message.cmdLog("调用 js", exp),
              /^\(\$([A-Za-z_][a-zA-Z0-9_]*?)\)\s*=\s*/.exec(exp));
          if (null == result) eval(exp);
          else {
            let name = result[1];
            ((exp = exp.substring(result[0].length)),
              UpdateVariable(performer, name, eval(exp)));
          }
        },
        executor = new CmdExecutor(appropriate, execute);
      CmdExecuteCenter.addExecutor(executor);
    })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return 0 == e.indexOf("@stop ");
        },
        function (e, t) {
          let o = CmdPrehandleCenter.shared().handle(e, t).substring(6);
          e.log() && Message.cmdLog("停止流程", o);
          var n,
            t = /^\(\$([A-Za-z_][a-zA-Z0-9_]*?)\)\s*=\s*/.exec(o);
          null == t
            ? ManagedPerformerCenter.getAll()
                .filter((e) => e.name() == o)
                .forEach((e) => e.stop())
            : ((n = t[1]),
              (o = o.substring(t[0].length)),
              UpdateVariable(
                e,
                n,
                ManagedPerformerCenter.getAll()
                  .filter((e) => e.name() == o)
                  .forEach((e) => e.stop()),
              ));
        },
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    VariableStore.register((e) => ({
      ":date": new Date().getDate(),
      ":day": new Date().getDay(),
      ":hour": new Date().getHours(),
      ":minute": new Date().getMinutes(),
      ":second": new Date().getSeconds(),
    })),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return 0 == e.indexOf("$wait ");
        },
        function (e, t) {
          return PerformerPromise("@wait " + t.substring(6), null, e.log());
        },
      );
      CmdExecuteCenter.addExecutor(e);
    })());
  var __ConfigDomIdCounter = 0;
  function GetConfigDomId() {
    var e = __ConfigDomIdCounter;
    return ((__ConfigDomIdCounter += 1), "wsmud_raid_config_dom_id_" + e);
  }
  var __ConfigPanelHtml = "",
    __ConfigPanelInits = [],
    __ConfigPanelActions = [];
  class HashCmdExecutor extends CmdExecutor {
    constructor(t, n) {
      (super(
        function (e) {
          return 0 == e.indexOf("#" + t);
        },
        function (e, t) {
          var o = CmdPrehandleCenter.shared()
              .handle(e, t)
              .substring(this._key.length + 2),
            e = n(e, t, o);
          null != e &&
            (e.html && (__ConfigPanelHtml += e.html),
            e.init && __ConfigPanelInits.push(e.init),
            e.action) &&
            __ConfigPanelActions.push(e.action);
        },
      ),
        (this._key = t));
    }
  }
  ((() => {
    var e = new HashCmdExecutor("input", function (e, t, o) {
      o = /^\(\$([a-zA-Z0-9_]+)\)\s?=\s?([^,]+?),(.*)\s*$/.exec(o);
      if (null == o) throw "错误的格式: " + t;
      let n = o[1];
      t = o[2];
      let r = null == o[3] ? "" : o[3],
        i = GetConfigDomId();
      return {
        html: `
            <p>
                <label for="${i}">&nbsp;* ${t}:&nbsp;</label><input style='width:80px' id ="${i}" type="text">
            </p>`,
        init: function () {
          $("#" + i).val(r);
        },
        action: function () {
          var e = {};
          return ((e[n] = $("#" + i).val()), e);
        },
      };
    });
    CmdExecuteCenter.addExecutor(e);
  })(),
    (() => {
      var e = new HashCmdExecutor("select", function (e, t, o) {
        o = /^\(\$([a-zA-Z0-9_]+)\)\s?=\s?([^,]+?),([^,]+?),([^,]+?)\s*$/.exec(
          o,
        );
        if (null == o) throw "错误的格式: " + t;
        let n = o[1];
        var t = o[2],
          r = o[3].split("|");
        let i = o[4],
          l = GetConfigDomId(),
          a = "";
        r.forEach((e) => {
          a += `<option value="${e}">${e}</option>`;
        });
        return {
          html: `
            <p>
                <label for="${l}">&nbsp;* ${t}:&nbsp;</label><select style='width:80px' id="${l}">
                    ${a}
                </select>
            </p>`,
          init: function () {
            $("#" + l).val(i);
          },
          action: function () {
            var e = {};
            return ((e[n] = $("#" + l).val()), e);
          },
        };
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new CmdExecutor(
        function (e) {
          return /^#config\s*$/.test(e);
        },
        function (n, e) {
          return new Promise((e) => {
            var t = layer.open({
              type: 1,
              skin: "layui-layer-rim",
              area: "350px",
              title: "配置参数",
              zIndex: 2147483500,
              content: __ConfigPanelHtml,
              offset: "auto",
              shift: 2,
              move: !1,
              closeBtn: 0,
              success: function (e, t) {
                __ConfigPanelInits.forEach((e) => {
                  e();
                });
                for (var o of e[0].children)
                  "layui-layer-content" == o.className &&
                    o.setAttribute(
                      "style",
                      "max-height: 370px;color: rgb(0, 128, 0);",
                    );
              },
              end: function () {
                ((__ConfigPanelHtml = ""),
                  (__ConfigPanelInits = []),
                  (__ConfigPanelActions = []));
              },
              btn: ["运行流程", "取消"],
              yes: function () {
                (__ConfigPanelActions.forEach((e) => {
                  var t,
                    o = e();
                  for (t in o)
                    o.hasOwnProperty(t) && UpdateVariable(n, t, o[t]);
                }),
                  layer.close(t),
                  e());
              },
              btn2: function () {
                (n.stop(), e());
              },
            });
          });
        },
      );
      CmdExecuteCenter.addExecutor(e);
    })());
  var WG = null,
    messageAppend = null,
    messageClear = null,
    T = null,
    L = null;
  ((Message.append = function (e) {
    messageAppend(e);
  }),
    (Message.clean = function () {
      messageClear();
    }));
  let RoleState = {
    none: "发呆",
    liaoshang: "疗伤",
    dazuo: "打坐",
    wakuang: "挖矿",
    gongzuo: "工作",
    lianxi: "练习",
    xuexi: "学习",
    biguan: "闭关",
    lianyao: "炼药",
    lingwu: "领悟",
    dushu: "读书",
    juhun: "聚魂",
    tuiyan: "推演",
  };
  function FindItem(e, t, o, n, r) {
    var i,
      l = o ? t : "^" + t + "$",
      a =
        (/<[a-zA-Z]{3}>.+<\/[a-zA-Z]{3}>/g.test(t)
          ? (l = "^" + t + "$")
          : null != n &&
            null !=
              (n = {
                white: "wht",
                w: "wht",
                green: "hig",
                g: "hig",
                blue: "hic",
                b: "hic",
                yellow: "hiy",
                y: "hiy",
                purple: "HIZ",
                p: "HIZ",
                orange: "hio",
                o: "hio",
                red: "ord",
                r: "ord",
              }[n]) &&
            (l = o
              ? "<" + n + ">.*" + t + ".*</" + n + ">"
              : "<" + n + ">" + t + "</" + n + ">"),
        new RegExp(l));
    for (i of e) if (a.test(i.name) && !FilterCenter.filter(r, i)) return i;
    return null;
  }
  var Role = {
      id: null,
      name: null,
      grade: null,
      family: null,
      energy: 0,
      money: 0,
      hp: 0,
      maxHp: 0,
      mp: 0,
      maxMp: 0,
      status: {},
      equipments: [],
      items: {},
      stores: {},
      _weaponType: "",
      skills: {},
      profitInfo: null,
      kongfu: {
        quan: null,
        nei: null,
        zhao: null,
        qing: null,
        jian: null,
        dao: null,
        gun: null,
        zhang: null,
        bian: null,
        an: null,
      },
      init: function () {
        (WG.add_hook("login", function (e) {
          Role.resetSkillCooldowns(null, true);
          SkillStateMachine.reset();
          ((Role.id = e.id),
            (Role.status = []),
            setTimeout(function () {
              (WG.suppressNextResponse(
                function (response) {
                  return (
                    response &&
                    response.type == "dialog" &&
                    response.dialog == "skills" &&
                    Array.isArray(response.items)
                  );
                },
                5000,
              ),
                WG.Send("cha"));
            }, 2e3),
            UI.showToolbar());
        }),
          $("li[command=SelectRole]").on("click", function () {
            Role.name = $(".role-list .select").text().split(/\s+/).pop();
          }),
          Role._monitorHpMp(),
          Role._monitorStatus(),
          Role._monitorState(),
          Role._monitorDeath(),
          Role._monitorSkillCD(),
          Role._monitorSkills(),
          Role._monitorGains(),
          Role._monitorItems(),
          Role._monitorCombat(),
          Role._monitorInfo(),
          Role._monitorWeapon());
      },
      hasStatus: function (e) {
        e = Role.status[e];
        return null != e && !(e < new Date().getTime());
      },
      isFree: function () {
        return (
          !Role.hasStatus("busy") &&
          !Role.hasStatus("faint") &&
          !Role.hasStatus("rash")
        );
      },
      gains(t, o) {
        var n = Role._gains.slice(),
          r = -1,
          i = -1;
        for (let e = 0; e < n.length; e++)
          if (n[e].timestamp >= t) {
            r = e;
            break;
          }
        for (let e = n.length - 1; 0 <= e; e--)
          if (n[e].timestamp <= o) {
            i = e;
            break;
          }
        return -1 == r || -1 == i ? [] : n.slice(r, i + 1);
      },
      state: RoleState.none,
      wearing: function (e) {
        for (var t of this.equipments) if (null != t && t.id == e) return !0;
        return !1;
      },
      getEqId: function (e) {
        e = this.equipments[e];
        return null == e ? null : e.id;
      },
      living: !0,
      combating: !1,
      rtime: !1,
      shimen: function (e) {
        var t = new Date().getTime();
        Role._shimen(0, t, e);
      },
      atPath: function (e) {
        switch (arguments.length) {
          case 0:
            return Room.path;
          case 1:
            return e == Room.path;
        }
      },
      inRoom: function (e) {
        switch (arguments.length) {
          case 0:
            return Room.name;
          case 1:
            return e == Room.name;
        }
      },
      findItem: function (e, t, o, n) {
        return FindItem(Object.values(Role.items), e, t, o, n);
      },
      renew: function (e) {
        new Performer(
          "",
          `
            stopstate;$to 扬州城-武庙
            @liaoshang
            [if] (:mpPer)<0.8
                @dazuo
                stopstate
            `,
        ).start(e);
      },
      cleanBag: function (e) {
        (WG.clean_all(), e && e());
      },
      tidyBag: function (e) {
        Role._tidyBag(0, e);
      },
      hasCoolingSkill: function () {
        return 0 < Role._coolingSkills.length;
      },
      coolingSkills: function () {
        var e,
          t = [];
        for (e of Role._coolingSkills) t.push(e);
        return t;
      },
      coolingSkill: function (e) {
        return -1 != this.coolingSkills().indexOf(e);
      },
      hasSkill: function (e) {
        return -1 != $(".combat-commands").html().indexOf(e);
      },
      weapon: function () {
        return Role._weaponType;
      },
      _renewHookIndex: null,
      _renewStatus: "resting",
      _coolingSkills: [],
      _gains: [],
      _shimen: function (e, t, o) {
        (0 == e && (WG.SendCmd("stopstate"), WG.sm_button()),
          null != SystemTips.search("你先去休息|和本门毫无瓜葛|你没有", t)
            ? o()
            : setTimeout(function () {
                Role._shimen(e + 1, t, o);
              }, 1e3));
      },
      _tidyBag: function (e, t) {
        (0 == e && WG.sell_all(),
          WG.packup_listener
            ? 10 < e
              ? (WG.packup_listener && WG.sell_all(), t())
              : window.setTimeout(function () {
                  Role._tidyBag(e + 1, t);
                }, 1e3)
            : window.setTimeout(t, 1e3));
      },
      _monitorHpMp: function () {
        WG.add_hook(["items", "sc", "itemadd"], function (e) {
          switch (e.type) {
            case "items":
              if (null != e.items)
                for (var t = e.items.length - 1; 0 <= t; t--) {
                  var o = e.items[t];
                  if (o.id == Role.id) {
                    ((Role.hp = o.hp),
                      (Role.maxHp = o.max_hp),
                      (Role.mp = o.mp),
                      (Role.maxMp = o.max_mp));
                    break;
                  }
                }
              break;
            case "itemadd":
            case "sc":
              e.id == Role.id &&
                (null != e.hp && (Role.hp = e.hp),
                null != e.max_hp && (Role.maxHp = e.max_hp),
                null != e.mp && (Role.mp = e.mp),
                null != e.max_mp) &&
                (Role.maxMp = e.max_mp);
          }
        });
      },
      _monitorStatus: function () {
        WG.add_hook(["items", "status", "itemadd"], function (e) {
          switch (e.type) {
            case "items":
              if (null != e.items)
                for (var t = e.items.length - 1; 0 <= t; t--) {
                  var o = e.items[t];
                  if (o.id == Role.id) {
                    if (null == o.status) break;
                    Role.status = {};
                    for (
                      var n = new Date().getTime(), r = o.status.length - 1;
                      0 <= r;
                      r--
                    ) {
                      var i = o.status[r];
                      Role.status[i.sid] = n + i.duration - i.overtime;
                    }
                    break;
                  }
                }
              break;
            case "status":
              var l;
              e.id == Role.id &&
                ((l = new Date().getTime()),
                "add" == e.action
                  ? (Role.status[e.sid] = l + e.duration)
                  : "remove" == e.action && delete Role.status[e.sid]);
              break;
            case "itemadd":
              if (e.id == Role.id && null != e.status) {
                Role.status = {};
                for (
                  var a = new Date().getTime(), s = e.status.length - 1;
                  0 <= s;
                  s--
                ) {
                  var u = e.status[s];
                  Role.status[u.sid] = a + u.duration - u.overtime;
                }
              }
          }
        });
      },
      _monitorState: function () {
        WG.add_hook("state", function (e) {
          var t = e.state;
          if (null != t)
            for (var o in RoleState)
              if (RoleState.hasOwnProperty(o)) {
                o = RoleState[o];
                if (-1 != t.indexOf(o)) return void (Role.state = o);
              }
          Role.state = RoleState.none;
        });
      },
      _monitorDeath: function () {
        WG.add_hook("die", function (e) {
          1 == e.relive ? (Role.living = !0) : (Role.living = !1);
        });
      },
      _monitorInfo: function () {
        WG.add_hook("dialog", function (e) {
          var t;
          "score" == e.dialog &&
            e.id == Role.id &&
            (null != e.level &&
              ((t = e.level.replace(/<\/?.+?>/g, "")),
              (Role.grade = t.replace(/ /g, ""))),
            null != e.family && (Role.family = e.family),
            null != e.jingli) &&
            ((t = e.jingli.split("/")), (Role.energy = t[0]));
        });
      },
      _monitorItems: function () {
        WG.add_hook("dialog", function (t) {
          if (null != t.dialog) {
            if ("pack" == t.dialog) {
              if (null != t.items) {
                ((Role.items = {}), (t = structuredClone(t)));
                for (let e of (t = WG.deserializePackData(t)).items)
                  e.id && (Role.items[e.id] = e);
              } else if (null != t.id) {
                if (null == t.remove && null != t.count)
                  return void (Role.items[t.id] = t);
                if (null != t.remove) {
                  var e = Role.items[t.id];
                  if (null == e) return;
                  (null != e.count ? (e.count -= t.remove) : (e.count = 0),
                    0 == e.count && delete Role.items[t.id]);
                }
              }
              (null != t.eqs
                ? (Role.equipments = CopyObject(t.eqs))
                : null != t.uneq && null != t.id
                  ? (((o = Role.equipments[t.uneq]).count = 1),
                    (o.id = t.id),
                    (Role.items[o.id] = o),
                    (Role.equipments[t.uneq] = null))
                  : null != t.eq &&
                    null != t.id &&
                    ((o = Role.items[t.id]),
                    (Role.equipments[t.eq] = o),
                    delete Role.items[t.id]),
                null != t.money && (Role.money = t.money));
            }
            if ("list" == t.dialog)
              if (null != t.stores) {
                ((Role.stores = {}), (t = structuredClone(t)));
                for (let e of (t = WG.deserializePackData(t)).stores)
                  e.id && (Role.stores[e.id] = e);
              } else {
                var o;
                null != t.id &&
                  null != t.storeid &&
                  null != t.store &&
                  ((e = Role.items[t.id]),
                  (o = Role.stores[t.storeid]),
                  null == e &&
                    (((e = Object.assign({}, o, { count: 0 })).id = t.id),
                    (Role.items[e.id] = e)),
                  null == o &&
                    ((o = Object.assign({}, e, { count: 0 })),
                    (Role.stores[o.id] = o)),
                  (e.count -= t.store),
                  (o.count += t.store),
                  e.count <= 0 && delete Role.items[t.id],
                  o.count <= 0) &&
                  delete Role.stores[t.storeid];
              }
          }
        });
      },
      _monitorGains: function () {
        WG.add_hook("dialog", function (e) {
          var t, o, n;
          "pack" == e.dialog &&
            null != e.id &&
            null != e.name &&
            null != e.unit &&
            null != e.count &&
            null == e.remove &&
            ((t = new Date().getTime()),
            (o = Role.items[e.id]),
            (n = e.count),
            null != o && null != o.count && (n -= o.count),
            Role._gains.push({
              timestamp: t,
              name: e.name,
              count: n,
              unit: e.unit,
            }));
        });
      },
      resetSkillCooldowns: function (id, resetGcd) {
        this._skillCooldownTimers || (this._skillCooldownTimers = new Map());
        for (const [skill, timer] of this._skillCooldownTimers) {
          if (id != null && skill !== id) continue;
          clearTimeout(timer);
          this._skillCooldownTimers.delete(skill);
        }
        this._coolingSkills = [...this._skillCooldownTimers.keys()];
        if (resetGcd) {
          clearTimeout(this._rtimer);
          this._rtimer = null;
          this.rtime = false;
        }
      },
      _monitorSkillCD: function () {
        WG.add_hook("clearDistime", event => Role.resetSkillCooldowns(event.id));
        WG.add_hook("dispfm", function (event) {
          if (event.id != null) {
            Role._skillCooldownTimers || (Role._skillCooldownTimers = new Map());
            clearTimeout(Role._skillCooldownTimers.get(event.id));
            const timer = setTimeout(() => {
              if (Role._skillCooldownTimers.get(event.id) !== timer) return;
              Role._skillCooldownTimers.delete(event.id);
              Role._coolingSkills = [...Role._skillCooldownTimers.keys()];
            }, event.distime || 0);
            Role._skillCooldownTimers.set(event.id, timer);
            Role._coolingSkills = [...Role._skillCooldownTimers.keys()];
          }
          if (event.rtime != null && event.rtime !== 0) {
            clearTimeout(Role._rtimer);
            Role.rtime = true;
            Role._rtimer = setTimeout(() => { Role.rtime = false; }, event.rtime);
          }
        });
      },
      _monitorSkills: function () {
        function Y4(e, t, o) {
          switch (e) {
            case "unarmed":
              ((Role.kongfu.quan = t), (Role.kongfu.quan_c = o));
              break;
            case "force":
              ((Role.kongfu.nei = t), (Role.kongfu.nei_c = o));
              break;
            case "parry":
              ((Role.kongfu.zhao = t), (Role.kongfu.zhao_c = o));
              break;
            case "dodge":
              ((Role.kongfu.qing = t), (Role.kongfu.qing_c = o));
              break;
            case "sword":
              ((Role.kongfu.jian = t), (Role.kongfu.jian_c = o));
              break;
            case "blade":
              ((Role.kongfu.dao = t), (Role.kongfu.dao_c = o));
              break;
            case "club":
              ((Role.kongfu.gun = t), (Role.kongfu.gun_c = o));
              break;
            case "staff":
              ((Role.kongfu.zhang = t), (Role.kongfu.zhang_c = o));
              break;
            case "whip":
              ((Role.kongfu.bian = t), (Role.kongfu.bian_c = o));
              break;
            case "throwing":
              ((Role.kongfu.an = t), (Role.kongfu.an_c = o));
          }
        }
        WG.add_hook("dialog", function (e) {
          if (null != e.dialog && "skills" == e.dialog) {
            if (null != e.items)
              for (var t of e.items) {
                var o,
                  n = t.enable_skill || null,
                  r = "";
                Role.skills = e.items;
                for (o of e.items)
                  o.id == n && (r = /<([^<>]*)>/.exec(o.name)[1]);
                Y4(t.id, n, r.toLocaleLowerCase());
              }
            if (null != e.id && null != e.enable) {
              0 == (n = e.enable) && (n = "none");
              var i,
                r = "";
              for (i of Role.skills)
                i.id == n && (r = /<([^<>]*)>/.exec(i.name)[1]);
              Y4(e.id, n, r);
            }
          }
        });
      },
      _monitorCombat: function () {
        (WG.add_hook("combat", function (e) {
          null != e.start && 1 == e.start
            ? (Role.combating = !0)
            : null != e.end && 1 == e.end && (Role.combating = !1);
        }),
          WG.add_hook("text", function (e) {
            null != e.msg &&
              ((-1 == e.msg.indexOf("只能在战斗中使用") &&
                -1 == e.msg.indexOf("这里不允许战斗") &&
                -1 == e.msg.indexOf("没时间这么做")) ||
                (Role.combating = !1),
              -1 != e.msg.indexOf("战斗中打坐，你找死吗？") ||
                -1 != e.msg.indexOf("你正在战斗")) &&
              (Role.combating = !0);
          }));
      },
      _monitorWeapon: function () {
        WG.add_hook("perform", function (e) {
          null != e.skills &&
            (-1 != JSON.stringify(e.skills).indexOf("sword")
              ? (Role._weaponType = "sword")
              : -1 != JSON.stringify(e.skills).indexOf("blade")
                ? (Role._weaponType = "blade")
                : (Role._weaponType = ""));
        });
      },
    };
  var Room;
  const raidFlowRoom = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-room",
    {
      addHook: function (type, handler) {
        return WG.add_hook(type, handler);
      },
      now: function () {
        return new Date().getTime();
      },
      filter: function () {
        return FilterCenter.filter.apply(FilterCenter, arguments);
      },
      getRoom: function () {
        return Room;
      },
    },
  );
  Room = raidFlowRoom.Room;
  var SystemTip,
    MsgTip,
    SystemTips,
    MsgTips,
    DialogList,
    TaskList,
    Xiangyang;
  const raidFlowObservers = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-observers",
    {
      addHook: function (type, handler) {
        return WG.add_hook(type, handler);
      },
      now: function () {
        return new Date().getTime();
      },
      clone: function (value) {
        return structuredClone(value);
      },
      deserializePackData: function (value) {
        return WG.deserializePackData(value);
      },
      findItem: function () {
        return FindItem.apply(null, arguments);
      },
      createSystemTip: function () {
        return new SystemTip(...arguments);
      },
      createMsgTip: function () {
        return new MsgTip(...arguments);
      },
    },
  );
  ((SystemTip = raidFlowObservers.SystemTip),
    (MsgTip = raidFlowObservers.MsgTip),
    (SystemTips = raidFlowObservers.SystemTips),
    (MsgTips = raidFlowObservers.MsgTips),
    (DialogList = raidFlowObservers.DialogList),
    (TaskList = raidFlowObservers.TaskList),
    (Xiangyang = raidFlowObservers.Xiangyang));
  VariableStore.register((e) => PersistentVariables.getAll());
  VariableStore.register((e) => ({
      ":online": WG.online,
      ":id": Role.id,
      ":name": Role.name,
      ":grade": Role.grade,
      ":family": Role.family,
      ":energy": Role.energy,
      ":money": Role.money,
      ":hp": Role.hp,
      ":maxHp": Role.maxHp,
      ":hpPer": Role.hp / Role.maxHp,
      ":mp": Role.mp,
      ":maxMp": Role.maxMp,
      ":mpPer": Role.mp / Role.maxMp,
      ":living": Role.living,
      ":state": Role.state,
      ":combating": Role.combating,
      ":free": Role.isFree,
      ":gains": Role.profitInfo,
      ":room": Room.name,
      ":path": Room.path,
      ":eq0": Role.getEqId(0),
      ":eq1": Role.getEqId(1),
      ":eq2": Role.getEqId(2),
      ":eq3": Role.getEqId(3),
      ":eq4": Role.getEqId(4),
      ":eq5": Role.getEqId(5),
      ":eq6": Role.getEqId(6),
      ":eq7": Role.getEqId(7),
      ":eq8": Role.getEqId(8),
      ":eq9": Role.getEqId(9),
      ":eq10": Role.getEqId(10),
      ":kf_quan": Role.kongfu.quan,
      ":kf_nei": Role.kongfu.nei,
      ":kf_zhao": Role.kongfu.zhao,
      ":kf_qing": Role.kongfu.qing,
      ":kf_jian": Role.kongfu.jian,
      ":kf_dao": Role.kongfu.dao,
      ":kf_gun": Role.kongfu.gun,
      ":kf_zhang": Role.kongfu.zhang,
      ":kf_bian": Role.kongfu.bian,
      ":kf_an": Role.kongfu.an,
      ":kf_quan_c": Role.kongfu.quan_c,
      ":kf_nei_c": Role.kongfu.nei_c,
      ":kf_zhao_c": Role.kongfu.zhao_c,
      ":kf_qing_c": Role.kongfu.qing_c,
      ":kf_jian_c": Role.kongfu.jian_c,
      ":kf_dao_c": Role.kongfu.dao_c,
      ":kf_gun_c": Role.kongfu.gun_c,
      ":kf_zhang_c": Role.kongfu.zhang_c,
      ":kf_bian_c": Role.kongfu.bian_c,
      ":kf_an_c": Role.kongfu.an_c,
    }));
  VariableStore.register((e) => ({
      ":room ": function (e) {
        var t;
        for (t of e.split(",")) if (-1 != Room.name.indexOf(t)) return !0;
        return !1;
      },
      ":cd ": function (e) {
        return Role.coolingSkill(e);
      },
      ":status ": function (e) {
        var t = e.split(",");
        if (1 < t.length) {
          var o = t[0],
            t = t[1],
            t = Room.getItem(t);
          if (null != t && null != t.status)
            for (var n of t.status) if (n.sid == o) return !0;
          return !1;
        }
        return Role.hasStatus(e);
      },
      ":hp ": function (e) {
        e = Room.getItem(e);
        return null != e ? e.hp : -1;
      },
      ":weapon ": function (e) {
        return e == Role.weapon();
      },
      ":maxHp ": function (e) {
        e = Room.getItem(e);
        return null != e ? e.max_hp : -1;
      },
      ":mp ": function (e) {
        e = Room.getItem(e);
        return null != e ? e.mp : -1;
      },
      ":maxMp ": function (e) {
        e = Room.getItem(e);
        return null != e ? e.max_mp : -1;
      },
      ":exist ": function (e) {
        return null != e && null != Room.getItem(e);
      },
      ":findName ": function (e) {
        return null != e && null != (e = Room.getItem(e))
          ? e.name
              .replace(/<.+?>|&lt.*/g, "")
              .split(" ")
              .pop()
          : null;
      },
    }));
  let FilterCenter = {
    filter: function (filterExp, obj) {
      if (null == filterExp) return !1;
      let exp = filterExp.substring(1, filterExp.length - 2),
        yes = eval("" + exp);
      return yes;
    },
  };
  function ReplacePlaceholder(e) {
    for (
      var t =
          /\{([a-z]?)([^a-z%#]+?|<\w+>[^a-z%#]+?<\/\w+>)([a-z]?)(%?)(#?)\}\??(#[^#{}]*#)?/g,
        o = [],
        n = t.exec(e);
      null != n;
    )
      (o.push({
        text: n[0],
        location: "" == n[1] ? null : n[1],
        name: n[2],
        blurry: "%" != n[4],
        quality: "" == n[3] ? null : n[3],
        type: "#" != n[5] ? "id" : "amount",
        filterExp: n[6],
      }),
        (n = t.exec(e)));
    var r;
    let i = e;
    for (r of o) {
      var l = ((t) => {
        let e = [];
        for (var o of (e =
          null == t.location
            ? null == t.quality
              ? ["r", "b", "d"]
              : ["b", "d"]
            : [t.location])) {
          let e = null;
          switch (o) {
            case "r":
              e = Room.getItemId(t.name, t.blurry, !1, t.filterExp);
              break;
            case "b":
              var n = Role.findItem(t.name, t.blurry, t.quality, t.filterExp);
              n && (e = "id" == t.type ? n.id : n.count);
              break;
            case "d":
              n = DialogList.findItem(t.name, t.blurry, t.quality, t.filterExp);
              n && (e = "id" == t.type ? n.id : n.count);
          }
          if (null != e) return e;
        }
        return null;
      })(r);
      i = i.replace(r.text, l);
    }
    return i;
  }
  ((() => {
    var e = new CmdPrehandler(function (e, t) {
      return ReplacePlaceholder(t);
    });
    CmdPrehandleCenter.shared().addHandler(e);
  })(),
    (() => {
      var e = new PrecompileRule(function (e) {
        var t,
          o,
          n = [],
          r = "",
          i = !1;
        for (t of e)
          if (
            ((0 != t.indexOf("`") && !i) ||
              (0 == (o = t).indexOf("`") && (o = t.substr(1)),
              (r =
                r +
                " " +
                (o = "`" == t[t.length - 1] ? t.substr(0, t.length - 1) : o)),
              (i = !0)),
            "`" == t[t.length - 1])
          )
            ((n[n.length - 1] = n[n.length - 1] + r), (r = ""), (i = !1));
          else if (!i) {
            var l = /^\s*/.exec(t)[0],
              a = /(\{[^\}]+\})([^\?]|$)/g;
            let e = a.exec(t);
            for (var s = t.indexOf("@js"); null != e && -1 == s;)
              (n.push(`${l}@until ${e[1]}? != null`), (e = a.exec(t)));
            n.push(t);
          }
        return n;
      }, PrecompileRulePriority.low);
      PrecompileRuleCenter.shared().addRule(e);
    })(),
    (() => {
      var e = new CmdExecutor(
        (e) => 0 == e.indexOf("<-stopSSAuto") || 0 == e.indexOf("@stopSSAuto"),
        (e, t) => {
          (e.log() &&
            Message.cmdLog(
              "暂停自动婚宴和自动Boss",
              "目前手动终止流程不会自动恢复",
            ),
            WG.stopAllAuto());
        },
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new CmdExecutor(
        (e) =>
          0 == e.indexOf("stopSSAuto->") || 0 == e.indexOf("@recoverSSAuto"),
        (e, t) => {
          (e.log() && Message.cmdLog("恢复自动婚宴和自动Boss设置"),
            WG.reSetAllAuto());
        },
      );
      CmdExecuteCenter.addExecutor(e);
    })());
  var __RecordGainsFrom = null;
  ((() => {
    var e = new CmdExecutor(
      (e) => 0 == e.indexOf("<-recordGains"),
      (e, t) => {
        (e.log() && Message.cmdLog("开始记录物品获取"),
          (__RecordGainsFrom = new Date().getTime()));
      },
    );
    CmdExecuteCenter.addExecutor(e);
  })(),
    (() => {
      var e = new CmdExecutor(
        (e) => 0 == e.indexOf("recordGains->"),
        (e, t) => {
          var o,
            n,
            r = Role.gains(__RecordGainsFrom, new Date().getTime()),
            i = {},
            l =
              (r.forEach((e) => {
                var t = 0,
                  o = i[e.name];
                (o && (t = o.count),
                  (i[e.name] = { count: t + e.count, unit: e.unit }));
              }),
              "");
          for (o in (-1 == t.indexOf("recordGains->silent") &&
            (Message.clean(), Message.append("&nbsp;&nbsp;> 战利品列表如下：")),
          i))
            i.hasOwnProperty(o) &&
              ((n = i[o]),
              -1 == t.indexOf("recordGains->silent") &&
                Message.append(
                  "&nbsp;&nbsp;* " + o + " <wht>" + n.count + n.unit + "</wht>",
                ),
              (l += `&nbsp;&nbsp;* ${o} <wht>${n.count}${n.unit}</wht><br>`));
          ((Role.profitInfo = "" != l ? l : null),
            0 != t.indexOf("recordGains->nopopup") &&
              0 != t.indexOf("recordGains->silent") &&
              layer.open({
                type: 1,
                area: ["380px", "300px"],
                title: "战利品列表",
                content: l,
                offset: "auto",
                shift: 2,
              }));
        },
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("toolbar", function (e, t) {
        return (
          e.timeSeries(new Date().getTime()),
          $(`span[command=${t}]`).click(),
          new Promise((t) => {
            setTimeout((e) => {
              ($(".glyphicon-remove-circle").click(), t());
            }, 500);
          })
        );
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilAtCmdExecutor(
        "liaoshang",
        function (e, t) {
          return 1 <= Role.hp / Role.maxHp
            ? (WG.SendCmd("stopstate"), !0)
            : (Role.state != RoleState.liaoshang &&
                WG.SendCmd("stopstate;liaoshang"),
              !1);
        },
        null,
        1e3,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilAtCmdExecutor(
        "dazuo",
        function (e, t) {
          return 0.99 < Role.mp / Role.maxMp
            ? (WG.SendCmd("stopstate"), !0)
            : (Role.state != RoleState.dazuo && WG.SendCmd("stopstate;dazuo"),
              !1);
        },
        null,
        1e3,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilAtCmdExecutor(
        "eq",
        function (e, t) {
          t = t.split(",");
          let o = [];
          return (
            t.forEach((e) => {
              Role.wearing(e) || o.push("eq " + e);
            }),
            !(0 < o.length && (WG.SendCmd("stopstate;" + o.join(";")), 1))
          );
        },
        null,
        1e3,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilAtCmdExecutor("cd", function (e, t) {
        if (null == t) return !Role.hasCoolingSkill();
        let o = t,
          n = !1;
        "^" == o[0] && ((o = o.substring(1)), (n = !0));
        var r = o.split(",");
        if (n) {
          for (var i of Role.coolingSkills()) if (-1 == r.indexOf(i)) return !1;
        } else {
          var l,
            a = Role.coolingSkills();
          for (l of r) if (-1 != a.indexOf(l)) return !1;
        }
        return !0;
      });
      CmdExecuteCenter.addExecutor(e);
    })());
  ((() => {
    var e = new UntilSearchedAtCmdExecutor("tip", (e, t) =>
      SystemTips.search(e, t),
    );
    CmdExecuteCenter.addExecutor(e);
  })(),
    (() => {
      var e = new UntilSearchedAtCmdExecutor("msgtip", (e, t) =>
        MsgTips.search(e, t),
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilSearchedAtCmdExecutor("task", (e, t) =>
        TaskList.search(e, t),
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilSearchedAtCmdExecutor("xy", (e, t) =>
        Xiangyang.search(e, t),
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilAtCmdExecutor(
        "kill",
        function (e, t) {
          var o = t.split(","),
            n = [];
          for (let t = 0; t < o.length; t++) {
            const r = o[t];
            let e = !0;
            ("%" == r.substring(r.length - 1) &&
              ((r = r.substring(0, r.length - 1)), (e = !1)),
              n.push({ name: r, blurry: e }));
          }
          if (Room.didKillItemsInRoom(n)) return !0;
          {
            let t = "";
            return (
              n.forEach((e) => {
                e = Room.getItemId(e.name, e.blurry, !0);
                null != e && (t += "kill " + e + ";");
              }),
              WG.SendCmd(t),
              !1
            );
          }
        },
        null,
        1e3,
        1e3,
      );
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new UntilAtCmdExecutor("dialog", function (e, t) {
        return DialogList.timestamp > e.timeSeries();
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("cleanBag", function (e, t) {
        return (
          e.log() && Message.cmdLog("清理包裹"),
          UntilRoleFreePerformerPromise((e) => {
            (WG.SendCmd("$cleanall"), setTimeout(e, 1e3));
          })
        );
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("tidyBag", function (e, t) {
        return (
          e.log() && Message.cmdLog("整理包裹"),
          UntilRoleFreePerformerPromise((t) => {
            Role.tidyBag((e) => {
              setTimeout(t, 1e3);
            });
          })
        );
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("shimen", function (e, t) {
        return (
          e.log() && Message.cmdLog("自动完成允许放弃的放弃师门"),
          UntilRoleFreePerformerPromise((t) => {
            Role.shimen((e) => {
              setTimeout(t, 1e3);
            });
          })
        );
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("renew", function (e, t) {
        return (
          e.log() && Message.cmdLog("恢复角色气血和内力"),
          UntilRoleFreePerformerPromise((t) => {
            Role.renew((e) => {
              setTimeout(t, 1e3);
            });
          })
        );
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("beep", function (e, t) {
        Beep();
      });
      CmdExecuteCenter.addExecutor(e);
    })(),
    (() => {
      var e = new AtCmdExecutor("push", function (e, t) {
        Push(t);
      });
      CmdExecuteCenter.addExecutor(e);
    })());
  let GetDungeonFlow;
      (GetDungeonFlow =
        raidFlowExecutionRuntime.registerSystemCommandExecutors()),
    AutoDungeonName = function (e) {
      var e = e.split(" "),
        t = e[0];
      "小树林" == t && (t = "树林");
      let o = "";
      switch (e[1]) {
        case "0":
          if (GetDungeonFlow(t)) return t;
          if (((o = t + "(简单)"), GetDungeonFlow(o))) return o;
          break;
        case "1":
          if (((o = t + "(困难)"), null != GetDungeonFlow(o))) return o;
          break;
        case "2":
          if (((o = t + "(组队)"), null != GetDungeonFlow(o))) return o;
      }
      return null;
    };
  function InjectRoomTransitionRecovery(dungeonSource) {
    return dungeonSource.replace(
      /^([ \t]*)(go\s+.+)$/gm,
      "$1[if] (:mpPer) < (mpPer)\n$1    @dazuo\n$1$2",
    );
  }
  function GetDungeonSource(e) {
    e = GetDungeonFlow(e);
    return null == e
      ? null
      : `
[if] (_DungeonHpThreshold) == null
    ($_DungeonHpThreshold) = 50
[if] (_DungeonMpThreshold) == null
    ($_DungeonMpThreshold) = 80
[if] (_DungeonWaitSkillCD) == null
    ($_DungeonWaitSkillCD) = 打开
[if] (_DungeonBagCleanWay) == null
    ($_DungeonBagCleanWay) = 存仓及售卖
[if] (_DungeonRecordGains) == null
    ($_DungeonRecordGains) = 是
#select ($_DungeonHpThreshold) = 副本内疗伤，当气血低于百分比,100|90|80|70|60|50|40|30|20|10,(_DungeonHpThreshold)
#select ($_DungeonMpThreshold) = 进入下一房间前打坐，当内力低于百分比,100|90|80|70|60|50|40|30|20|10,(_DungeonMpThreshold)
#select ($_DungeonWaitSkillCD) = Boss战前等待技能冷却,打开|关闭,(_DungeonWaitSkillCD)
#select ($_DungeonBagCleanWay) = 背包清理方案,不清理|售卖|存仓及售卖,(_DungeonBagCleanWay)
#select ($_DungeonRecordGains) = 结束后显示收益统计,是|否,(_DungeonRecordGains)
#input ($_repeat) = 重复次数,1
#config
[if] (arg0) != null
    ($_DungeonHpThreshold) = (arg0)
[if] (arg1) != null
    ($_DungeonWaitSkillCD) = (arg1)
[if] (arg2) != null
    ($_DungeonBagCleanWay) = (arg2)
[if] (arg3) != null
    ($_repeat) = (arg3)
<-stopSSAuto
stopstate
<---
[if] (_DungeonHpThreshold) == null
    ($_DungeonHpThreshold) = 50
[if] (_DungeonMpThreshold) == null
    ($_DungeonMpThreshold) = 80
($hpPer) = (_DungeonHpThreshold)/100
($mpPer) = (_DungeonMpThreshold)/100
[if] (:hpPer) < (hpPer)
    @liaoshang
--->
[if] (_DungeonRecordGains) == 是
    <-recordGains
($_i) = 0
[if] (_repeat) == null
    ($_repeat) = 1
[while] (_i) < (_repeat)
    @renew
    [if] (_DungeonBagCleanWay) == 售卖
        @cleanBag
    [else if] (_DungeonBagCleanWay) == 存仓及售卖
        @tidyBag
${SourceCodeHelper.appendHeader("    ", InjectRoomTransitionRecovery(e))}
    cr;cr over
    ($_i) = (_i) + 1
[if] (_DungeonBagCleanWay) == 售卖
    @cleanBag
[else if] (_DungeonBagCleanWay) == 存仓及售卖
    @tidyBag
$to 住房-练功房;dazuo
[if] (_DungeonRecordGains) == 是
    recordGains->
stopSSAuto->`;
  }
  (() => {
    var e = new AtCmdExecutor("fb", function (e, t) {
      let n = AutoDungeonName(t);
      if (null != n) {
        let o = GetDungeonSource(n);
        return new Promise((t) => {
          var e = new Performer("自动副本-" + n, o);
          (e.log(!0),
            e.start((e) => {
              t();
            }));
        });
      }
      Message.append("暂不支持次副本哦，欢迎到论坛分享此副本流程。");
    });
    CmdExecuteCenter.addExecutor(e);
  })();
  let DungeonCatalog = unsafeWindow.WSMudPlugin.createService(
      "raid-flow-dungeons",
    ),
    Dungeons = DungeonCatalog.getAll(),
    RaidFlowServer = unsafeWindow.WSMudPlugin.createService(
      "raid-flow-server",
      {
        gm: {
          listValues: GM_listValues,
          getValue: GM_getValue,
          setValue: GM_setValue,
          setClipboard: GM_setClipboard,
        },
        getRoleId: () => Role.id,
        getFlowStore: () => FlowStore,
        getWorkflowConfig: () => WorkflowConfig,
        getTriggerConfig: () => unsafeWindow.TriggerConfig,
        getTriggerCenter: () => unsafeWindow.TriggerCenter,
        messageAppend: (e) => Message.append(e),
        noticeMessage: (e) => L.msg(e),
        getScriptVersion: () => GM_info.script.version,
        jquery: $,
        layer: layer,
        alert: alert,
      },
    ),
    Server = RaidFlowServer.Server;
  let UI = {
    showToolbar: function () {
      if ($("#raidToolbar").length) {
        UI._toolbarHidden = !1;
        $("#raidToolbar").removeClass("WG_raid_toolbar_collapsed");
        $("#raidToolbar .hideRaidToolbar")
          .attr({ "aria-expanded": "true", "aria-label": "收起流程菜单", title: "收起流程菜单" })
          .text("‹");
        return;
      }
      UI._toolbarHidden &&
        ((UI._toolbarHidden = !1),
        $(".WG_log").before(`
            <style>
                .raid-item{
                    display: inline-block;
                    border: solid 1px gray;
                    color: gray;
                    background-color: black;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 0.5em;
                    //min-width: 2.5em;
                    margin-right: 0em;
                    //margin-left: 0.4em;
                    position: relative;
                    padding-left: 0.3em;
                    padding-right: 0.3em;
                    line-height: 28px;
                }
            </style>
            <div id="raidToolbar">
                <div class="raidToolbar">
                    <button type="button" class="raid-item hideRaidToolbar" aria-expanded="true" aria-label="收起流程菜单" title="收起流程菜单">‹</button>
                    <span class="raid-item forum">🐟 <hiy>咸鱼</hiy></span>
                    <span class="raid-item shortcut">🍯 <hiz>捷径</hiz></span>
                    <span class="raid-item trigger">🍟 <hio>触发</hio></span>
                    <span class="raid-item customFlow" id="workflows-button">🥗 <hig>流程</hig></span>
                    <span class="raid-item moreRaid">🍺 <hic>副本</hic></span>
                    <!--<span class="raid-item hideRaidToolbar" style="float:right;"><wht>测试</wht></span>-->
                </div>
            </div>`),
        $(".customFlow").on("click", UI.workflows),
        $(".trigger").on("click", UI.trigger),
        $(".forum").on("click", UI.forum),
        $(".shortcut").on("click", UI.shortcut),
        $(".moreRaid").on("click", UI.dungeons),
        $("#raidToolbar .hideRaidToolbar").on("click", function () {
          UI._toolbarHidden ? UI.showToolbar() : UI.hideToolbar();
        }));
    },
    hideToolbar: function () {
      UI._toolbarHidden = !0;
      $("#raidToolbar").addClass("WG_raid_toolbar_collapsed");
      $("#raidToolbar .hideRaidToolbar")
        .attr({ "aria-expanded": "false", "aria-label": "展开流程菜单", title: "展开流程菜单" })
        .text("›");
    },
    trigger: function () {
      null == unsafeWindow.TriggerUI
        ? (UI._appendHtml(
            "🍟 <hio>触发器</hio>",
            `
                <span class = "zdy-item install-trigger" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 前往安装 </span>
                `,
          ),
          $(".install-trigger").on("click", function () {
            window.open("https://greasyfork.org/zh-CN/scripts/378984", "_blank")
              .location;
          }))
        : unsafeWindow.TriggerUI.triggerHome();
    },
    forum: function () {
      (UI._appendHtml(
        "🐟 <hiy>一键咸鱼</hiy>",
        `
            <span class = "zdy-item xianyu-xyjq" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🤌 襄阳捐钱 </span>
            <span class = "zdy-item xianyu-ksyb" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🦆 快速运镖 </span>
            <span class="zdy-item xianyu-sdyt" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🐉 扫荡妖塔</span>
            <span class="zdy-item xianyu-mghyj" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🍟 门贡换元晶</span>
            <br><br>
            <span class="zdy-item xianyu-xybm" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🐘 襄阳报名</span>
            <span class="zdy-item xianyu-ltbm" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🏆 擂台报名</span>
            <span class="zdy-item xianyu-cbt" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 💎 藏宝图</span>
            <span class = "zdy-item xianyu-setting" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🔧 参数设置 </span>
            <br><br>
            <hr style="background-color: gray; height: 1px; width: calc(100% - 4em); border: none;"><br>
            <span class = "zdy-item about-script" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🦶 <wht>脚本教程</wht> </span>
            <!--<span class = "zdy-item about-flow" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> <wht>流程讨论</wht> </span>-->
            <!--<span class = "zdy-item about-trigger" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> <wht>触发器讨论</wht> </span>-->
            <span class = "zdy-item about-bug" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🐞 <wht>Bug 提交</wht> </span>
            <!--<br><br>-->
            <!--<hr style="background-color: gray; height: 1px; width: calc(100% - 4em); border: none;"><br>-->
            <span class = "zdy-item about-yaofang" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 💊 药方清单 </span>
            <span class = "zdy-item suqingHome" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🍿 <hig>苏</hig><hio>轻</hio><hiy>工</hiy><wht>具</wht><hic>包</hic> </span>`,
      ),
        $(".xianyu-xyjq").on("click", function () {
          DungeonsShortcuts.xianyu_xyjq();
        }),
        $(".xianyu-ksyb").on("click", function () {
          DungeonsShortcuts.xianyu_ksyb();
        }),
        $(".xianyu-sdyt").on("click", function () {
          DungeonsShortcuts.xianyu_sdyt();
        }),
        $(".xianyu-mghyj").on("click", function () {
          DungeonsShortcuts.xianyu_mghyj();
        }),
        $(".xianyu-cbt").on("click", function () {
          DungeonsShortcuts.cangbaotu();
        }),
        $(".xianyu-xybm").on("click", function () {
          DungeonsShortcuts.xianyu_xybm();
        }),
        $(".xianyu-ltbm").on("click", function () {
          DungeonsShortcuts.xianyu_ltbm();
        }),
        $(".xianyu-setting").on("click", function () {
          DungeonsShortcuts.xianyu_setting();
        }),
        $(".about-script").on("click", function () {
          window.open("https://www.yuque.com/wsmud/doc", "_blank").location;
        }),
        $(".about-bug").on("click", function () {
          window.open("https://www.yuque.com/wsmud/doc/gr9gyy", "_blank")
            .location;
        }),
        $(".about-yaofang").on("click", function () {
          window.open("https://emeisuqing.github.io/wsmud.old/", "_blank")
            .location;
        }),
        $(".suqingHome").on("click", function () {
          window.open("https://emeisuqing.github.io/wsmud/", "_blank").location;
        }));
    },
    shortcut: function () {
      var e = `
            <span class="zdy-item outMaze" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 走出桃花林 </span>
            <span class = "zdy-item zhoubotong" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 找到周伯通 </span>
            <span class = "zdy-item cihang" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 慈航七重门 </span>
            <span class = "zdy-item zhanshendian" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 战神殿解谜 </span>
            <span class = "zdy-item guzongmen" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 古宗门寻路 </span>
            <span class = "zdy-item cangbaotu" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 藏宝图寻宝 </span>
            <span class = "zdy-item uploadConfig" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 上传本地配置 </span>
            <span class = "zdy-item downloadConfig" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 下载云端配置 </span>
            <span class = "zdy-item uploadFlows" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 分享角色流程 </span>
            <span class = "zdy-item downloadFlows" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 拷贝角色流程 </span>
            <span class = "zdy-item uploadTriggers" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 分享角色触发 </span>
            <span class = "zdy-item downloadTriggers" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 拷贝角色触发 </span>
            <span class = "zdy-item importFlow" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 导入流程 </span>
            <span class = "zdy-item importTrigger" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 导入触发器 </span>
            <!--<span class = "zdy-item translateCode" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 流程转换修复 </span>-->
            <span class = "zdy-item raidVersion" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;"> 🏹 ${GM_info.script.version} </span>`;
      (UI._appendHtml("🍯 <hiz>捷径</hiz>", e),
        $(".outMaze").on("click", function () {
          (WG.SendCmd("stopstate"), THIsland.outMaze());
        }),
        $(".zhoubotong").on("click", function () {
          (WG.SendCmd("stopstate"), THIsland.zhoubotong());
        }),
        $(".cihang").on("click", function () {
          (WG.SendCmd("stopstate"), DungeonsShortcuts.cihang());
        }),
        $(".zhanshendian").on("click", function () {
          (WG.SendCmd("stopstate"), DungeonsShortcuts.zhanshendian());
        }),
        $(".guzongmen").on("click", function () {
          (WG.SendCmd("stopstate"), DungeonsShortcuts.guzongmen());
        }),
        $(".cangbaotu").on("click", function () {
          (WG.SendCmd("stopstate"), DungeonsShortcuts.cangbaotu());
        }),
        $(".uploadConfig").on("click", (e) => {
          Server.uploadConfig();
        }),
        $(".downloadConfig").on("click", (e) => {
          layer.confirm(
            "下载成功将会完全覆盖该浏览器所有角色配置！",
            {
              title: "<red>! 警告</red>",
              btn: ["那还是算了", "好的继续"],
              shift: 2,
            },
            function (e) {
              layer.close(e);
            },
            function () {
              layer.prompt(
                { title: "输入配置获取码", formType: 0, shift: 2 },
                function (e, t) {
                  (layer.close(t), Server.downloadConfig(e));
                },
              );
            },
          );
        }),
        $(".uploadFlows").on("click", (e) => {
          Server.uploadFlows();
        }),
        $(".downloadFlows").on("click", (e) => {
          layer.confirm(
            "拷贝成功将会完全覆盖原有角色流程！",
            {
              title: "<red>! 警告</red>",
              btn: ["那还是算了", "好的继续"],
              shift: 2,
            },
            function (e) {
              layer.close(e);
            },
            function () {
              layer.prompt(
                { title: "输入角色流程获取码", formType: 0, shift: 2 },
                function (e, t) {
                  (layer.close(t), Server.downloadFlows(e));
                },
              );
            },
          );
        }),
        $(".uploadTriggers").on("click", (e) => {
          Server.uploadTriggers();
        }),
        $(".downloadTriggers").on("click", (e) => {
          layer.confirm(
            "拷贝成功将会完全覆盖原有角色触发器！",
            {
              title: "<red>! 警告</red>",
              btn: ["那还是算了", "好的继续"],
              shift: 2,
            },
            function (e) {
              layer.close(e);
            },
            function () {
              layer.prompt(
                { title: "输入角色触发获取码", formType: 0, shift: 2 },
                function (e, t) {
                  (layer.close(t), Server.downloadTriggers(e));
                },
              );
            },
          );
        }),
        $(".importFlow").on("click", (e) => {
          var t = `
                #input ($token)=分享码,
                #select ($target)=目标文件夹,${WorkflowConfig.getFinderNames().join("|")},${WorkflowConfig.rootFinderName}
                #config
                @js Server.importFlow("(token)", "(target)");
                `,
            t = new Performer("导入流程", t);
          (t.log(!1), t.start());
        }),
        $(".importTrigger").on("click", (e) => {
          var t = new Performer(
            "导入触发器",
            `
                #input ($token)=分享码,
                #config
                @js Server.importTrigger("(token)");
                `,
          );
          (t.log(!1), t.start());
        }),
        $(".translateCode").on("click", (e) => {
          layer.prompt(
            {
              title: "客栈->流程讨论，阅读使用说明后操作",
              formType: 0,
              shift: 2,
            },
            function (e, t) {
              "我确认开始转换" == e && (layer.close(t), CodeTranslator.run());
            },
          );
        }),
        $(".raidVersion").on("click", (e) => {
          Server.getNotice();
        }));
    },
    dungeons: function () {
      UI._appendHtml("🍺 <hic>自动副本</hic>", "");
      var e = UI._dungeonsContentModel();
      UI._mountableDiv().appendChild(e.$el);
    },
    workflows: function () {
      0 == ManagedPerformerCenter.getAll().length
        ? UI.workflowsHome()
        : UI.runningFlows();
    },
    workflowsHome: function () {
      (UI._appendHtml(
        "🥗 <hig>工作流程</hig>",
        "",
        `
            <select style='width:80px' id="workflows-opts">
                <option value="none">选择操作</option>
                <option value="createFinder">新建文件夹</option>
                <option value="createFlow">新建流程</option>
            </select>`,
        null,
        "<wht>运行中</wht>",
        UI.runningFlows,
      ),
        $("#workflows-opts").val("none"),
        $("#workflows-opts").change(function () {
          switch ($("#workflows-opts").val()) {
            case "createFinder":
              UI.createFinder();
              break;
            case "createFlow":
              UI.createWorkflow(WorkflowConfig.rootFinderName);
          }
        }));
      var e = UI._workflowContentModel(
        WorkflowConfig.finderList(WorkflowConfig.rootFinderName),
      );
      UI._mountableDiv().appendChild(e.$el);
    },
    runningFlows: function () {
      UI._appendHtml(
        "🥗 <hig>运行中流程</hig>",
        "",
        null,
        null,
        UI._backTitle,
        UI.workflowsHome,
      );
      var e = UI._runningFlowsContentModel();
      UI._mountableDiv().appendChild(e.$el);
    },
    createFinder: function () {
      UI._appendHtml(
        "🥗 <hig>新建文件夹</hig>",
        `
            <div style="margin: 0 2em 5px 2em;text-align:center;width:calc(100% - 4em)">
                <label for="create-finder-name"> 名称:</label><input id ="create-finder-name" style='width:120px' type="text"  name="create-finder-name" value="">
            </div>`,
        "<wht>保存</wht>",
        function () {
          var e = $("#create-finder-name").val(),
            e = WorkflowConfig.createFinder(e);
          1 == e ? UI.workflowsHome() : alert(e);
        },
        UI._backTitle,
        UI.workflowsHome,
      );
    },
    modifyFinder: function (t) {
      (UI._appendHtml(
        "🥗 <hig>修改文件夹</hig>",
        `
            <div style="margin: 0 2em 5px 2em;text-align:center;width:calc(100% - 4em)">
                <label for="modify-finder-name"> 名称:</label><input id ="modify-finder-name" style='width:120px' type="text"  name="modify-finder-name" value="">
            </div>`,
        "删除",
        function () {
          confirm("删除文件夹将删除其中的所有流程，确认删除吗？") &&
            (WorkflowConfig.removeFinder(t), UI.workflowsHome());
        },
        UI._backSaveTitle,
        function () {
          var e = $("#modify-finder-name").val(),
            e = WorkflowConfig.modifyFinder(t, e);
          1 != e ? alert(e) : UI.workflowsHome();
        },
      ),
        $("#modify-finder-name").val(t.name));
    },
    openFinder: function (e) {
      var t;
      e == WorkflowConfig.rootFinderName
        ? UI.workflowsHome()
        : ((t = WorkflowConfig.finderList(e)),
          UI._appendHtml(
            `<wht>📂 ${e}</wht>`,
            "",
            null,
            null,
            UI._backTitle,
            UI.workflowsHome,
          ),
          (e = UI._workflowContentModel(t)),
          UI._mountableDiv().appendChild(e.$el));
    },
    createWorkflow: function (o) {
      UI._appendHtml(
        "🥗 <hig>新建流程</hig>",
        `
            <div style="margin: 0 2em 5px 2em;text-align:left;width:calc(100% - 4em)">
                <label for="create-flow-name"> 名称:</label><input id ="create-flow-name" style='width:120px' type="text"  name="create-flow-name" value="">
            </div>
            <textarea class = "settingbox hide" style = "height:5rem;display:inline-block;font-size:0.8em;width:calc(100% - 4em)" id = "create-flow-source"></textarea>`,
        "<wht>保存</wht>",
        function () {
          var e = $("#create-flow-name").val(),
            t = $("#create-flow-source").val(),
            e = WorkflowConfig.createWorkflow(e, t, o);
          1 == e ? UI.workflowsHome() : alert(e);
        },
        UI._backTitle,
        UI.workflowsHome,
      );
    },
    modifyWorkflow: function (n) {
      let t = "";
      WorkflowConfig.getFinderNames().forEach((e) => {
        t += `<option value="${e}">${e}</option>`;
      });
      var e = `
            <div style="margin: 0 2em 5px 2em;text-align:left;width:calc(100% - 4em)">
                <label for="modify-flow-name"> 名称:</label><input id ="modify-flow-name" style='width:120px' type="text"  name="modify-flow-name" value="">
                <label for="modify-flow-finder">移动至</label><select id="modify-flow-finder">
                    ${t}
                </select>
            </div>
            <textarea class = "settingbox hide" style = "height:5rem;display:inline-block;font-size:0.8em;width:calc(100% - 4em)" id = "modify-flow-source"></textarea>
            <span class="raid-item shareFlow">分享此流程</span>`;
      (UI._appendHtml(
        "🥗 <hig>修改流程</hig>",
        e,
        "删除",
        function () {
          confirm("确认删除此工作流程吗？") &&
            (WorkflowConfig.removeWorkflow(n), UI.workflowsHome());
        },
        UI._backSaveTitle,
        function () {
          var e = $("#modify-flow-name").val(),
            t = $("#modify-flow-source").val(),
            o = $("#modify-flow-finder").val(),
            e = WorkflowConfig.modifyWorkflow(n, e, t, o);
          1 != e ? alert(e) : UI.openFinder(o);
        },
      ),
        $("#modify-flow-name").val(n.name),
        $("#modify-flow-source").val(FlowStore.get(n.name)),
        $("#modify-flow-finder").val(n.finder),
        $(".shareFlow").on("click", function () {
          var e = {
            name: $("#modify-flow-name").val(),
            source: $("#modify-flow-source").val(),
          };
          UI._share("流程", e);
        }));
    },
    _toolbarHidden: !0,
    _backTitle: "<wht>< 返回</wht>",
    _backSaveTitle: "<wht>< 保存&返回</wht>",
    _appendHtml(e, t, o, n, r, i) {
      r = `
            <div class = "item-commands" style="text-align:center">
                <div style="margin-top:0.5em">
                    <div style="width:8em;float:left;text-align:left;padding:0px 0px 0px 2em;height:1.23em" id="wsmud_raid_left">${null == r ? "" : r}</div>
                    <div style="width:calc(100% - 16em);float:left;text-align:center;height:1.23em">${e}</div>
                    <div style="width:8em;float:right;text-align:right;padding:0px 2em 0px 0px;height:1.23em" id="wsmud_raid_right">${null == o ? "" : o}</div>
                </div>
                <br><br>
                ${t}
            </div>`;
      (Message.clean(),
        Message.append(r),
        $("#wsmud_raid_left").on("click", function () {
          i && i();
        }),
        $("#wsmud_raid_right").on("click", function () {
          n && n();
        }));
    },
    _mountableDiv: function () {
      return document
        .getElementsByClassName("WG_log")[0]
        .getElementsByTagName("pre")[0]
        .getElementsByTagName("div")[0];
    },
    _workflowContentModel: function (l) {
      return new Vue({
        el: "#WorkflowsContentModel",
        methods: {
          createSpan: function (e, t) {
            let o = {
              width: "120px",
              "background-color": "#12e4a0",
              border: "solid 1px rgb(107, 255, 70)",
              "border-radius": "0.5em",
              color: "#000dd4",
              padding: "10px 10px",
            };
            var n = {
                attrs: { class: "zdy-item" },
                style: (o =
                  "finder" == t.type
                    ? {
                        width: "120px",
                        "background-color": "#0359c3",
                        border: "solid 1px rgb(107, 203, 255)",
                        "border-radius": "0.5em",
                        color: "white",
                        padding: "10px 10px",
                      }
                    : o),
              },
              r = e(
                "div",
                {
                  style: {
                    width: "30px",
                    float: "left",
                    "background-color": "#ffffff4f",
                    "border-radius": "4px",
                  },
                  on: {
                    click: function () {
                      "finder" == t.type
                        ? UI.modifyFinder(t)
                        : UI.modifyWorkflow(t);
                    },
                  },
                },
                "⚙",
              ),
              i = e(
                "div",
                {
                  attrs: { class: "breakText" },
                  style: { width: "85px", float: "right" },
                  on: {
                    click: function () {
                      "finder" == t.type
                        ? UI.openFinder(t.name)
                        : ManagedPerformerCenter.start(
                            t.name,
                            FlowStore.get(t.name),
                          );
                    },
                  },
                },
                "finder" == t.type ? t.name : "▶️" + t.name,
              );
            return e("span", n, [r, i]);
          },
        },
        render: function (t) {
          var o = this;
          let n = [],
            r = [];
          l.forEach((e) => {
            ("finder" == e.type && r.push(o.createSpan(t, e)),
              "flow" == e.type && n.push(o.createSpan(t, e)));
          });
          var e = [],
            i =
              (0 < n.length && e.push(n),
              0 < r.length &&
                (e.push(
                  t("hr", {
                    style: {
                      "background-color": "gray",
                      height: "1px",
                      width: "calc(100% - 4em)",
                      border: "none",
                    },
                  }),
                ),
                e.push(r)),
              t(
                "style",
                ".breakText {word-break:keep-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
              ));
          return (
            e.push(i),
            t("div", { attrs: { class: "item-commands" } }, e)
          );
        },
      });
    },
    _dungeonsContentModel: function () {
      return new Vue({
        el: "#DungeonsContentModel",
        methods: {
          getItems: function () {
            return Dungeons;
          },
          createSpan: function (e, t) {
            return e(
              "span",
              {
                attrs: { class: "zdy-item WG_dungeon_choice" },
                style: {
                  height: "30px",
                  "line-height": "28px",
                  "border-radius": "0.5em",
                },
                on: {
                  click: function () {
                    ManagedPerformerCenter.start(
                      "自动副本-" + t.name,
                      GetDungeonSource(t.name),
                    );
                  },
                },
              },
              null != t.desc ? t.desc : t.name,
            );
          },
        },
        render: function (t) {
          var e = this.getItems(),
            o = this,
            e = e.map(function (e) {
              return o.createSpan(t, e);
            });
          return t("div", { attrs: { class: "item-commands WG_dungeon_choices" } }, e);
        },
      });
    },
    _runningFlowsContentModel: function () {
      return new Vue({
        el: "#WorkflowsContentModel",
        methods: {
          createSpan: function (e, t) {
            var o = {
                attrs: { class: "zdy-item" },
                style: {
                  width: "120px",
                  "background-color": "#05b77d",
                  border: "solid 1px rgb(107, 255, 70)",
                  "border-radius": "0.5em",
                  color: "white",
                  padding: "10px 10px",
                },
              },
              n = e(
                "div",
                {
                  style: {
                    width: "30px",
                    float: "left",
                    "background-color": "#ffffff4f",
                    "border-radius": "4px",
                  },
                  on: {
                    click: function () {
                      (t.pausing() ? t.resume() : t.pause(),
                        UI.runningFlows(),
                        t.pausing()
                          ? Message.append(
                              `<hiy>暂停执行，流程: ${t.name()}...</hiy>`,
                            )
                          : Message.append(
                              `<hiy>恢复执行，流程: ${t.name()}。</hiy>`,
                            ));
                    },
                  },
                },
                t.pausing() ? "▶️" : "⏸",
              ),
              r = e(
                "div",
                {
                  attrs: { class: "breakText" },
                  style: { width: "85px", float: "right" },
                  on: {
                    click: function () {
                      t.stop();
                    },
                  },
                },
                "⏹" + t.name(),
              );
            return e("span", o, [n, r]);
          },
        },
        render: function (t) {
          var e = ManagedPerformerCenter.getAll(),
            o = this,
            e = e.map(function (e) {
              return o.createSpan(t, e);
            }),
            n = t(
              "style",
              ".breakText {word-break:keep-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            );
          return (
            e.push(n),
            t("div", { attrs: { class: "item-commands" } }, e)
          );
        },
      });
    },
    _shareData: null,
    _share: function (e, t) {
      UI._shareData = t;
      ((t = `
            [if] (__FormUserName) == null
                (__FormUserName) = (:name)
            #input ($__FormUserName)=当前角色名,(:name)
            #config
            ($__FormUserName)=(:name)
            ($password)=233
            @js Server.shareFlowTrigger("(__FormUserName)", "(password)", "${e}", UI._shareData);
            `),
        (e = new Performer("分享" + e, t)));
      (e.log(!1), e.start());
    },
  };
  let THIsland;
  const raidFlowTHIsland = unsafeWindow.WSMudPlugin.createService(
    "raid-flow-th-island",
    {
      getRole: function () {
        return Role;
      },
      getWG: function () {
        return WG;
      },
      appendMessage: function (html) {
        return Message.append(html);
      },
      getTHIsland: function () {
        return THIsland;
      },
      getAncientCmdExecuter: function () {
        return AncientCmdExecuter;
      },
    },
  );
  THIsland = raidFlowTHIsland.THIsland;
  let registerRaidShortcutAtCommand = function (e, t) {
    var o = new AtCmdExecutor(e, t);
    CmdExecuteCenter.addExecutor(o);
  };
  let raidFlowShortcuts = unsafeWindow.WSMudPlugin.createService(
      "raid-flow-shortcuts",
      {
        Performer: Performer,
        THIsland: THIsland,
        registerAtCommand: registerRaidShortcutAtCommand,
      },
    ),
    DungeonsShortcuts = raidFlowShortcuts.DungeonsShortcuts,
    ToRaid = {
      menu: UI.showToolbar,
      perform: function (e, t, o) {
        ManagedPerformerCenter.start(t || "第三方调用", e, o);
      },
      existAutoDungeon: function (e) {
        return null != AutoDungeonName(e);
      },
      shareTrigger: function (e) {
        UI._share("触发", e);
      },
    };
  function __init__() {
    null == (WG = unsafeWindow.WG)
      ? setTimeout(() => {
          __init__();
        }, 300)
      : ((messageAppend = unsafeWindow.messageAppend),
        (messageClear = unsafeWindow.messageClear),
        (T = unsafeWindow.T),
        (L = unsafeWindow.L),
        (unsafeWindow.ToRaid = ToRaid),
        (unsafeWindow.Role = Role).init(),
        Room.init(),
        SystemTips.init(),
        MsgTips.init(),
        DialogList.init(),
        TaskList.init(),
        Xiangyang.init());
  }
  $(document).ready(function () {
    (__init__(), null == WG && setTimeout(__init__, 300));
  });
})();
