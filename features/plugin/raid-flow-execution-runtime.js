/** Raid-flow command execution and timing runtime. */
(function registerRaidFlowExecutionRuntime(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-execution-runtime",
    function createRaidFlowExecutionRuntime(context) {
      const getMessage = context.getMessage || (() => global.Message);
      const getCompiler = context.getCompiler || (() => null);
      const getSortInsert = context.getSortInsert || (() => global.SortInsert);
      const getCmdPrehandlerPriority =
        context.getCmdPrehandlerPriority || (() => ({ ordinary: 50 }));
      const getCmdExecutorPriority =
        context.getCmdExecutorPriority ||
        (() => ({ compiler: 90, high: 30, ordinary: 20, low: 10 }));
      const getCmdPrehandleCenter =
        context.getCmdPrehandleCenter || (() => null);
      const getCmdExecutor = context.getCmdExecutor || (() => CmdExecutor);
      const getCmdExecuteCenter = context.getCmdExecuteCenter || (() => null);
      const getPerformer = context.getPerformer || (() => Performer);
      const getRole = context.getRole || (() => null);
      const getWG = context.getWG || (() => null);
      const getSystemTips = context.getSystemTips || (() => null);
      const getSystemCmdDelay = context.getSystemCmdDelay || (() => 1500);
      const getSkillStateMachine =
        context.getSkillStateMachine || (() => SkillStateMachine);
      const getUnpackSystemCmd =
        context.getUnpackSystemCmd || (() => UnpackSystemCmd);
      const getAtCmdExecutor = context.getAtCmdExecutor || (() => AtCmdExecutor);
      const getUntilRoleFreePerformerPromise =
        context.getUntilRoleFreePerformerPromise ||
        (() => UntilRoleFreePerformerPromise);
      const getAssertHolderCenter =
        context.getAssertHolderCenter || (() => null);
      const getDungeonCatalog = context.getDungeonCatalog || (() => null);
      const getAncientCmdExecuter =
        context.getAncientCmdExecuter || (() => AncientCmdExecuter);
      const setWorkflowRunning =
        context.setWorkflowRunning || (() => {});

      class CmdPrehandler {
        constructor(e, t) {
          ((this._handle = e),
            (this.priority =
              t || getCmdPrehandlerPriority().ordinary));
        }
        handle(e, t) {
          return this._handle(e, t);
        }
      }
      class CmdPrehandleCenter extends CmdPrehandler {
        constructor() {
          (super(function (e, t) {
            var o,
              n = t;
            for (o of this._handlers) n = o.handle(e, n);
            return n;
          }, -1),
            (this._handlers = []),
            (this.instance = this));
        }
        static shared() {
          return (
            this.instance || (this.instance = new CmdPrehandleCenter()),
            this.instance
          );
        }
        addHandler(e) {
          getSortInsert()(this._handlers, e, (e, t) => e.priority >= t.priority);
        }
      }
      class CmdExecutor {
        constructor(e, t, o) {
          ((this._appropriate = e),
            (this._execute = t),
            (this.priority =
              o || getCmdExecutorPriority().ordinary));
        }
        appropriate(e) {
          return this._appropriate(e);
        }
        execute(e, t) {
          return this._execute(e, t);
        }
      }
      var CmdExecuteCenter = {
        addExecutor: function (e) {
          getSortInsert()(
            this._executors,
            e,
            (e, t) => e.priority >= t.priority,
          );
        },
        execute: function (e, t) {
          var o,
            n = null;
          for (o of this._executors)
            if (o.appropriate(t)) {
              n = o;
              break;
            }
          if (null == n) throw "无法处理此命令: " + t;
          return n.execute(e, t);
        },
        _executors: [],
      };
      class Performer {
        constructor(e, t) {
          ((this._name = e),
            (this._source = t),
            (this._log = !1),
            (this._running = !1),
            (this._pausing = !1));
        }
        name() {
          return this._name;
        }
        runing() {
          return this._running;
        }
        pausing() {
          return this._pausing;
        }
        log(e) {
          return null == e || 1 == /\/\/\s*~silent\s*\n/.test(this._source)
            ? this._log
            : void (this._log = e);
        }
        start(e) {
          if (!this._running) {
            try {
              var o = new Date().getTime(),
                n = ((this._cmds = getCompiler().compile(this._source)),
                new Date().getTime());
              console.log(`编译总耗时: ${n - o} 毫秒`);
            } catch (e) {
              return void getMessage().append("<ord>编译错误</ord>: " + e);
            }
            (this._log &&
              getMessage().append(`<hiy>开始执行，流程: ${this._name}...</hiy>`),
              (this._running = !0),
              (this._pausing = !1),
              (this._callback = e),
              (this._pc = 0),
              (this._cc = !0),
              (this._guarding = !1),
              (this._subflows = []),
              this._perform());
          }
        }
        stop() {
          if (this._running) {
            this._running = !1;
            for (var e of this._subflows) e.stop();
            (this._log &&
              getMessage().append(`<hiy>执行完毕，流程: ${this._name}。</hiy>`),
              this._callback && this._callback());
          }
        }
        pause() {
          if (this._running) {
            (this._log &&
              getMessage().append(`<hiy>暂停执行，流程: ${this._name}...</hiy>`),
              (this._pausing = !0));
            for (var e of this._subflows) e.pause();
          }
        }
        resume() {
          if (this._running && this._pausing) {
            (this._log &&
              getMessage().append(`<hiy>恢复执行，流程: ${this._name}。</hiy>`),
              (this._pausing = !1));
            for (var e of this._subflows) e.resume();
            this._perform();
          }
        }
        guarding() {
          return this._guarding;
        }
        timeSeries(e) {
          if (null == e) return this._systemCmdTimeSeries;
          this.guarding() || (this._systemCmdTimeSeries = e);
        }
        async _perform() {
          if (this._running && !this._pausing && !this._doing) {
            var e = this._cmds[this._pc];
            this._pc += 1;
            try {
              ((this._doing = !0), await getCmdExecuteCenter().execute(this, e));
            } catch (e) {
              return (
                getMessage().append("<ord>执行错误</ord>: " + e),
                void this.stop()
              );
            } finally {
              this._doing = !1;
            }
            this._perform();
          }
        }
      }
      const ManagedPerformerCenter = {
        start: function (name, source, log, callback) {
          const performer = new (getPerformer())(name, source);
          performer.log(log != null ? log : true);
          const key = "key" + this._counter;
          this._counter += 1;
          this._performers[key] = performer;
          performer.start(function () {
            delete ManagedPerformerCenter._performers[key];
            if (ManagedPerformerCenter.getAll().length === 0)
              setWorkflowRunning(false);
            if (callback) callback();
          });
          setWorkflowRunning(true);
          return performer;
        },
        getAll: function () {
          return Object.values(this._performers);
        },
        _counter: 0,
        _performers: {},
      };
      class AtCmdExecutor extends CmdExecutor {
        constructor(n, r, e) {
          super(
            function (e) {
              return 0 == e.indexOf("@" + n);
            },
            function (e, t) {
              t = getCmdPrehandleCenter().shared().handle(e, t);
              let o = /^\s*(.*)\s*$/.exec(t.substring(n.length + 1))[1];
              return (o && 0 == o.length && (o = null), r(e, o));
            },
            e,
          );
        }
      }
      class UntilAtCmdExecutor extends CmdExecutor {
        constructor(i, l, e, a, s) {
          (super(
            function (e) {
              return 0 == e.indexOf("@" + i);
            },
            function (n, r) {
              function Dd(t) {
                var e = getCmdPrehandleCenter().shared().handle(n, r);
                let o = /^\s*(.*)\s*$/.exec(e.substring(i.length + 1))[1];
                (null != o && 0 == o.length && (o = null),
                  1 == l(n, o)
                    ? null != s
                      ? setTimeout((e) => {
                          t();
                        }, s)
                      : t()
                    : setTimeout(
                        (e) => {
                          Dd(t);
                        },
                        null != a ? a : 500,
                      ));
              }
              return (
                n.log() && getMessage().cmdLog("等待，直至符合条件", r),
                new Promise((e) => {
                  Dd(e);
                })
              );
            },
            e,
          ),
            (this._key = i),
            (this._assert = l));
        }
      }
      class UntilSearchedAtCmdExecutor extends UntilAtCmdExecutor {
        constructor(e, d) {
          super(e, function (t, e) {
            var o = [],
              n = /\(\$[a-zA-Z0-9_]+?\)/g;
            let r = n.exec(e);
            for (; null != r;) (o.push(r[0]), (r = n.exec(e)));
            let i = e;
            for (let e = 0; e < o.length; e++) {
              var l = o[e];
              i = i.replace(l, "(.+?)");
            }
            var a = d(i, t.timeSeries());
            if (null == a) return !1;
            for (let e = 0; e < o.length; e++) {
              var s = o[e],
                s = s.substring(2, s.length - 1),
                u = a[e + 1];
              null != u && context.updateVariable(t, s, u);
            }
            return !0;
          });
        }
      }
      function PerformerPromise(o, n, r) {
        return new Promise((t) => {
          var e = new (getPerformer())("", o);
          (r && e.log(r),
            e.start((e) => {
              n ? n(t) : t();
            }));
        });
      }
      function UntilRoleFreePerformerPromise(e, t) {
        return PerformerPromise("@until (:free) == true", e, t);
      }
      var SkillStateMachine = {
          perform: function (e, t) {
            var o = new Date().getTime();
            this._perform(e, t, o);
          },
          _perform: function (n, t, r) {
            if (!(null != this._skillStack[n] && this._skillStack[n] > r)) {
              let o = this;
              if ((!getRole().isFree() && !t) || getRole().coolingSkill(n) || getRole().rtime)
                setTimeout((e) => {
                  o._perform(n, t, r);
                }, 200);
              else {
                ((this._skillStack[n] = r), getWG().SendCmd("perform " + n));
                let t = setInterval((e) => {
                  getRole().coolingSkill(n) || 0 == getRole().combating
                    ? (clearInterval(t),
                      null != o._skillStack[n] &&
                        o._skillStack[n] == r &&
                        delete o._skillStack[n])
                    : getRole().isFree() && !getRole().rtime && getWG().SendCmd("perform " + n);
                }, 1e3);
              }
            }
          },
          reset: function () {
            this._skillStack = {};
          },
          _skillStack: {},
          _performNum: 0,
        },
        systemCmdDelay = 1500;
      let UnpackSystemCmd = function (e) {
        let t = e;
        var o = /([^;]+)\[(\d+?)\]/g;
        let n = o.exec(e);
        for (; null != n;) {
          var r = n[1],
            i = parseInt(n[2]),
            i = new Array(i).fill(r).join(";");
          ((t = t.replace(n[0], i)), (n = o.exec(e)));
        }
        return t;
      };
      function registerSystemCommandExecutors() {
        (() => {
          var e = new (getAtCmdExecutor())("cmdDelay", function (e, t) {
            e._cmdDelay = parseInt(t);
          });
          getCmdExecuteCenter().addExecutor(e);
        })();
        var getDungeonFlow =
          (() => {
            var e = new (getCmdExecutor())(
              (e) => !0,
              (i, e) => {
                let l = getCmdPrehandleCenter().shared().handle(i, e);
                return (
                  (l = getUnpackSystemCmd()(l)),
                  getUntilRoleFreePerformerPromise()((o) => {
                    let n = new Date().getTime(),
                      e = 0;
                    var t = n - getSystemTips().rejectTimestamp,
                      r = (function createWorker(e) {
                        return (
                          (e = new Blob(["(function(){" + e.toString() + "})()"])) ,
                          (e = window.URL.createObjectURL(e)),
                          new Worker(e)
                        );
                      })(
                        "setTimeout(() =>  postMessage('0'), " +
                          (e = t < 1500 ? t : e) +
                          ")",
                      );
                    r.onmessage = function (e) {
                      (r.terminate(),
                        i.log() && getMessage().cmdLog("执行系统命令", l),
                        i.timeSeries(n),
                        (i.systemCmdTimestamp = n),
                        getWG().SendCmd(l));
                      var t = null == i._cmdDelay ? getSystemCmdDelay() : i._cmdDelay;
                      setTimeout(o, t);
                    };
                  })
                );
              },
              getCmdExecutorPriority().low,
            );
            getCmdExecuteCenter().addExecutor(e);
          })();
          (() => {
            var e = new (getAtCmdExecutor())("force", function (o, n) {
              return new Promise((e) => {
                (o.log() && getMessage().cmdLog("强行执行系统命令", n),
                  getWG().SendCmd(n));
                var t = null == o._cmdDelay ? getSystemCmdDelay() : o._cmdDelay;
                setTimeout(e, t);
              });
            });
            getCmdExecuteCenter().addExecutor(e);
          })(),
          (() => {
            var e = new (getAtCmdExecutor())("perform", function (e, t) {
              var o;
              for (o of t.split(",")) getSkillStateMachine().perform(o, !1);
            });
            getCmdExecuteCenter().addExecutor(e);
          })(),
          (() => {
            var e = new (getAtCmdExecutor())("on", function (e, t) {
              global.TriggerCenter.activate(t);
            });
            getCmdExecuteCenter().addExecutor(e);
          })(),
          (() => {
            var e = new (getAtCmdExecutor())("off", function (e, t) {
              global.TriggerCenter.deactivate(t);
            });
            getCmdExecuteCenter().addExecutor(e);
          })();
        return function (e) {
          return getDungeonCatalog().getSource(e);
        };
      }
      class AncientCmdExecuter {
        constructor(e, t, o, n, r, i) {
          ((this.cmds = e),
            (this.willStartExecute = t),
            (this.didFinishExecute = o),
            (this.willPerformCmd = n),
            (this.didPerformCmd = r),
            (this.interval = i || 1e3));
        }
        execute() {
          this.isWorking ||
            ((this.isWorking = !0),
            this.willStartExecute && this.willStartExecute(),
            this._performCmd(0));
        }
        _performCmd(e) {
          if (e >= this.cmds.length) this._finishExecute();
          else if (getRole().isFree()) {
            var t = this.cmds[e];
            if (this.willPerformCmd) {
              var o = null,
                o = (0 < e && (o = this.cmds[e - 1]), this.willPerformCmd(o, t));
              if (!o) return void this._delayPerformCmd(e);
              t = o;
            }
            ( -1 == t.indexOf("@") &&
              -1 == t.indexOf("kill?") &&
              getWG().SendCmd(t),
              this.didPerformCmd && this.didPerformCmd(t),
              -1 != t.indexOf("[exit]")
                ? this._finishExecute()
                : this._delayPerformCmd(e + 1));
          } else this._delayPerformCmd(e);
        }
        _delayPerformCmd(e) {
          var t = this;
          window.setTimeout(function () {
            t._performCmd(e);
          }, t.interval);
        }
        _finishExecute() {
          ((this.isWorking = !1),
            getWG().remove_hook(getAncientCmdExecuter()._hookIndex),
            this.didFinishExecute && this.didFinishExecute());
        }
      }
      return {
        CmdPrehandlerPriority: getCmdPrehandlerPriority(),
        CmdPrehandler,
        CmdPrehandleCenter,
        CmdExecutorPriority: getCmdExecutorPriority(),
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
        systemCmdDelay,
        UnpackSystemCmd,
        registerSystemCommandExecutors,
        AncientCmdExecuter,
      };
    },
  );
})(window);
