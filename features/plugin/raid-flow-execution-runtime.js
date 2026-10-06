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
          this._runId = 0;
          this._stopHandlers = new Set();
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
              (this._runId += 1),
              (this._doing = false),
              this._perform());
          }
        }
        stop() {
          if (this._running) {
            this._running = !1;
            this._runId += 1;
            for (var handler of [...this._stopHandlers]) handler();
            this._stopHandlers.clear();
            for (var e of [...this._subflows]) e.stop();
            var callback = this._callback;
            this._callback = null;
            (this._log &&
              getMessage().append(`<hiy>执行完毕，流程: ${this._name}。</hiy>`),
              callback && callback());
          }
        }
        onStop(handler) {
          if (!this._running) {
            handler();
            return () => {};
          }
          this._stopHandlers.add(handler);
          return () => this._stopHandlers.delete(handler);
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
            const runId = this._runId;
            var e = this._cmds[this._pc];
            this._pc += 1;
            try {
              ((this._doing = !0), await getCmdExecuteCenter().execute(this, e));
            } catch (e) {
              if (runId !== this._runId) return;
              return (
                getMessage().append("<ord>执行错误</ord>: " + e),
                void this.stop()
              );
            } finally {
              if (runId === this._runId) this._doing = !1;
            }
            if (runId === this._runId) this._perform();
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
              n.log() && getMessage().cmdLog("等待，直至符合条件", r);
              return new Promise((resolve, reject) => {
                let timer = null, removeStop = () => {}, settled = false;
                const finish = error => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timer);
                  removeStop();
                  error ? reject(error) : resolve();
                };
                removeStop = n.onStop(() => finish());
                function poll() {
                  if (settled) return;
                  if (!n.runing()) return finish();
                  try {
                    if (!n.pausing()) {
                      const command = getCmdPrehandleCenter().shared().handle(n, r);
                      const argument = command.substring(i.length + 1).trim() || null;
                      if (l(n, argument) == true) {
                        if (s != null) timer = setTimeout(() => finish(), s);
                        else finish();
                        return;
                      }
                    }
                    timer = setTimeout(poll, a == null ? 500 : a);
                  } catch (error) {
                    finish(error);
                  }
                }
                poll();
              });
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
      function waitForPerformerDelay(owner, delay) {
        return new Promise(resolve => {
          let timer, removeStop = () => {};
          const finish = () => {
            clearTimeout(timer);
            removeStop();
            resolve();
          };
          removeStop = owner.onStop(finish);
          if (owner.runing()) timer = setTimeout(finish, delay);
        });
      }
      function waitForPerformerWorkerDelay(owner, delay) {
        return new Promise((resolve, reject) => {
          let worker = null, url = null, removeStop = () => {}, done = false;
          const finish = error => {
            if (done) return;
            done = true;
            if (worker) worker.terminate();
            if (url) window.URL.revokeObjectURL(url);
            removeStop();
            error ? reject(error) : resolve();
          };
          removeStop = owner.onStop(() => finish());
          if (done) return;
          try {
            const milliseconds = Number(delay);
            if (!Number.isFinite(milliseconds)) throw new Error("无效的等待时间");
            url = window.URL.createObjectURL(new Blob(["setTimeout(() => postMessage('0'), " + Math.max(0, milliseconds) + ")"]));
            worker = new Worker(url);
            worker.onerror = event => finish(new Error(event.message || "系统命令 Worker 执行失败"));
            worker.onmessage = () => finish();
          } catch (error) {
            finish(error);
          }
        });
      }
      function PerformerPromise(o, n, r, owner) {
        return new Promise((t) => {
          var e = new (getPerformer())("", o);
          if (owner && !owner.runing()) return t();
          if (owner) owner._subflows.push(e);
          r && e.log(r);
          e.start(() => {
            if (owner) {
              const index = owner._subflows.indexOf(e);
              if (index >= 0) owner._subflows.splice(index, 1);
              if (!owner.runing()) return t();
            }
            n ? n(t) : t();
          });
          if (owner && owner.pausing()) e.pause();
        });
      }
      function UntilRoleFreePerformerPromise(e, t, owner) {
        return PerformerPromise("@until (:free) == true", e, t, owner);
      }
      var SkillStateMachine = {
          perform: function (skillId, force, owner) {
            const previous = this._tasks.get(skillId);
            if (previous) previous.cancel();
            const task = { timer: null, removeStop: () => {} };
            const cancel = () => {
              clearTimeout(task.timer);
              task.removeStop();
              if (this._tasks.get(skillId) === task) {
                this._tasks.delete(skillId);
                delete this._skillStack[skillId];
              }
            };
            task.cancel = cancel;
            this._tasks.set(skillId, task);
            if (owner) task.removeStop = owner.onStop(cancel);
            const attempt = () => {
              if (this._tasks.get(skillId) !== task) return;
              if (owner && !owner.runing()) return cancel();
              if ((owner && owner.pausing()) || (!getRole().isFree() && !force) ||
                  getRole().coolingSkill(skillId) || getRole().rtime) {
                task.timer = setTimeout(attempt, 200);
                return;
              }
              this._skillStack[skillId] = Date.now();
              getWG().SendCmd("perform " + skillId);
              task.timer = setTimeout(retry, 1000);
            };
            const retry = () => {
              if (this._tasks.get(skillId) !== task) return;
              if ((owner && !owner.runing()) || getRole().coolingSkill(skillId) || !getRole().combating)
                return cancel();
              if ((!owner || !owner.pausing()) && getRole().isFree() && !getRole().rtime)
                getWG().SendCmd("perform " + skillId);
              task.timer = setTimeout(retry, 1000);
            };
            attempt();
          },
          reset: function () {
            for (const task of [...this._tasks.values()]) task.cancel();
            this._tasks.clear();
            this._skillStack = {};
          },
          _tasks: new Map(),
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
              async (i, command) => {
                const text = getUnpackSystemCmd()(getCmdPrehandleCenter().shared().handle(i, command));
                await getUntilRoleFreePerformerPromise()(null, false, i);
                if (!i.runing()) return;
                const elapsed = Date.now() - getSystemTips().rejectTimestamp;
                await waitForPerformerWorkerDelay(i, elapsed >= 0 && elapsed < 1500 ? 1500 - elapsed : 0);
                if (!i.runing()) return;
                // A pause can begin while the worker is waiting.
                await getUntilRoleFreePerformerPromise()(null, false, i);
                if (!i.runing()) return;
                i.log() && getMessage().cmdLog("执行系统命令", text);
                i.timeSeries(Date.now());
                i.systemCmdTimestamp = Date.now();
                getWG().SendCmd(text);
                await waitForPerformerDelay(i, i._cmdDelay == null ? getSystemCmdDelay() : i._cmdDelay);
              },
              getCmdExecutorPriority().low,
            );
            getCmdExecuteCenter().addExecutor(e);
          })();
          (() => {
            var e = new (getAtCmdExecutor())("force", function (o, n) {
              if (!o.runing()) return;
              o.log() && getMessage().cmdLog("强行执行系统命令", n);
              getWG().SendCmd(n);
              return waitForPerformerDelay(o, o._cmdDelay == null ? getSystemCmdDelay() : o._cmdDelay);
            });
            getCmdExecuteCenter().addExecutor(e);
          })(),
          (() => {
            var e = new (getAtCmdExecutor())("perform", function (e, t) {
              var o;
              for (o of t.split(",")) getSkillStateMachine().perform(o, !1, e);
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
        waitForPerformerDelay,
        waitForPerformerWorkerDelay,
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
