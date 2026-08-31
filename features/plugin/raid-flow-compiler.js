/** Stateless parser and compiler primitives for raid flows. */
(function registerRaidFlowCompiler(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-compiler",
    function createRaidFlowCompiler(context) {
      const getFlowStore = context.getFlowStore || (() => null);
      const appendMessage = context.appendMessage || (() => {});
      let __CallCounter = 0;

      let SortInsert = function (e, t, o) {
          let n = e.length;
          for (; 0 <= n; ) {
            if (0 == n) {
              e.splice(n, 0, t);
              break;
            }
            if (o(e[n - 1], t)) {
              e.splice(n, 0, t);
              break;
            }
            --n;
          }
        },
        SourceCodeHelper = {
          split: function (e) {
            var e = e.split(/\s*\n+/g),
              t = e[0],
              t =
                (null != t && 0 == /\S/.test(t) && e.splice(0, 1),
                e[e.length - 1]);
            return (
              null != t && 0 == /\S/.test(t) && e.splice(e.length - 1, 1),
              e
            );
          },
          appendHeader: function (e, t) {
            let o = `
` + t;
            return (o = (o = (o = o.replace(/(\n)/g, "$1" + e)).replace(
              /\n\s*\n/g,
              "\n",
            )).replace(/^\s*\n/, ""));
          },
        };

      class PrecompileRule {
        constructor(e, t) {
          ((this._handle = e), (this.priority = t));
        }
        handle(e) {
          return this._handle(e);
        }
      }

      class PrecompileRuleCenter extends PrecompileRule {
        constructor() {
          (super(function (e) {
            var t,
              o = e;
            for (t of this._rules) o = t.handle(o);
            return o;
          }, -1),
            (this._rules = []),
            (this.instance = this));
        }
        static shared() {
          return (
            this.instance || (this.instance = new PrecompileRuleCenter()),
            this.instance
          );
        }
        addRule(e) {
          SortInsert(this._rules, e, (e, t) => e.priority >= t.priority);
        }
      }

      class Precompiler {
        precompile(e) {
          e = SourceCodeHelper.split(e);
          return e.length <= 0 ? e : PrecompileRuleCenter.shared().handle(e);
        }
      }

      let ControlKeys = {
        while: "while",
        continue: "continue",
        break: "break",
        if: "if",
        elseif: "elseif",
        else: "else",
        exit: "exit",
      };

      class Compiler {
        constructor() {
          ((this._cc = "CC"), (this._pc = "PC"), (this._breakStacks = []));
        }
        compile(e) {
          var t;
          return null == e
            ? []
            : ((e = new Precompiler().precompile(e)),
              (t = ["[if] true"]),
              e.forEach((e) => {
                t.push("  " + e);
              }),
              (e = this._handleBlock(t, 0).cmds).push("%exit"),
              e);
        }
        _handleBlock(e, o, t) {
          var n = t,
            r = [],
            i = this._handleCondition(e[0]),
            l = function () {},
            a = this;
          switch (i.type) {
            case ControlKeys.while:
              (this._breakStacks.push([]),
                r.push(i.cmd),
                r.push(null),
                (l = function () {
                  r.push(`%${a._pc}=` + o);
                  var t = r.length + o;
                  ((r[1] = `%${a._pc}=${a._cc}?${o + 2}:` + t),
                    a._breakStacks.pop().forEach((e) => {
                      r[e - o] = `%${a._pc}=` + t;
                    }));
                }),
                (n = o));
              break;
            case ControlKeys.if:
              (r.push(i.cmd),
                r.push(null),
                (l = function () {
                  r.push("%pass");
                  var e = r.length + o;
                  r[1] = `%${a._pc}=${a._cc}?${o + 2}:` + e;
                }));
              break;
            case ControlKeys.elseif:
              (r.push(i.cmd),
                r.push(null),
                (l = function () {
                  r.push("%pass");
                  var e = r.length + o;
                  r[1] = `%${a._pc}=${a._cc}?${o + 2}:` + e;
                }));
              break;
            case ControlKeys.else:
              (r.push(null),
                (l = function () {
                  var e = r.length + o;
                  r[0] = `%${a._pc}=${a._cc}?${e}:` + (o + 1);
                }));
              break;
            case ControlKeys.continue:
              return (r.push(`%${a._pc}=` + t), {
                type: "continue",
                cmds: r,
              });
            case ControlKeys.break:
              return (
                r.push(null),
                this._breakStacks[this._breakStacks.length - 1].push(o),
                { type: "break", cmds: r }
              );
            case ControlKeys.exit:
              return (r.push("%exit"), { type: "exit", cmds: r });
            default:
              throw "未知的控制关键字: " + i.type;
          }
          for (var s = e.length, u = 1; u < s; ) {
            var d = e[u],
              c = /^\s*/g.exec(d)[0].length;
            if ("[" == d[c]) {
              for (var g = [d], h = u + 1; h < s; ) {
                var m = e[h];
                if (" " != m[c]) break;
                (g.push(m), (h += 1));
              }
              var f = r.length - 1,
                p = r.length + o,
                p = this._handleBlock(g, p, n);
              (p.cmds.forEach((e) => {
                r.push(e);
              }),
                "elseif" == p.type
                  ? (r[f] = `%${this._pc}=` + (r.length + o - 1))
                  : "else" == p.type &&
                    (r[f] = `%${this._pc}=` + (r.length + o)),
                (u = h));
            } else (r.push(d.substring(c)), (u += 1));
          }
          return (l(), { type: i.type, cmds: r });
        }
        _handleCondition(e) {
          var t,
            o = null,
            n = null;
          for (t of [
            { type: ControlKeys.while, regexp: /^\s*\[while\]/g },
            { type: ControlKeys.if, regexp: /^\s*\[if\]/g },
            { type: ControlKeys.elseif, regexp: /^\s*\[else\s?if\]/g },
            { type: ControlKeys.else, regexp: /^\s*\[else\]/g },
            { type: ControlKeys.continue, regexp: /^\s*\[continue\]/g },
            { type: ControlKeys.break, regexp: /^\s*\[break\]/g },
            { type: ControlKeys.exit, regexp: /^\s*\[exit\]/g },
          ]) {
            var r = t.regexp.exec(e);
            if (r) {
              ((o = t.type),
                (r = e.substring(r[0].length)),
                (n = `%${this._cc}=` + r));
              break;
            }
          }
          if (null == o) throw "编译失败: " + e;
          return { type: o, cmd: n };
        }
      }

      let PrecompileRulePriority = {
        subflow: 100,
        call: 90,
        annatition: 80,
        compatible: 70,
        guard: 60,
        emptyLine: 50,
        high: 30,
        ordinary: 20,
        low: 10,
      };

      (() => {
        var e = new PrecompileRule(function (e) {
          var t,
            o = [];
          for (t of e) /^\s*\/\//.test(t) || o.push(t);
          return o;
        }, PrecompileRulePriority.annatition);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (() => {
        var e = new PrecompileRule(function (e) {
          var t,
            o = [],
            n = !1;
          for (t of e)
            /^\s*\/\*/.test(t)
              ? (n = !0)
              : n && /\*\/\s*$/.test(t)
                ? (n = !1)
                : n || o.push(t);
          return o;
        }, PrecompileRulePriority.annatition);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (() => {
        var e = new PrecompileRule(function (e) {
          var t,
            o = [];
          let n = !1,
            r = null;
          for (t of e)
            null != /^(\s*)<===+\s*$/.exec(t)
              ? ((n = !0), (r = "<==="))
              : n
                ? null != /^\s*=+==>\s*$/.exec(t)
                  ? ((n = !1), (r += "===>"), o.push(r))
                  : (r += `
` + t)
                : o.push(t);
          return o;
        }, PrecompileRulePriority.subflow);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (() => {
        var e = new PrecompileRule(function (e) {
          var t,
            o = [],
            n = [],
            r = !1;
          for (t of e) {
            var i = /^(\s*)<---+/.exec(t);
            if (null != i) {
              var r = !0,
                i = { headerLength: i[1].length, cmds: [] };
              n.push(i);
            } else if (r)
              null == /^\s*-+-->/.exec(t)
                ? (i = n[n.length - 1]).cmds.push(t.substring(i.headerLength))
                : (r = !1);
            else {
              o.push(t);
              i = /^(\s*)[^\[\s]/.exec(t);
              if (null != i) {
                var l = i[1],
                  a = !1;
                for (let e = n.length; 0 < e; e--) {
                  var s = n[e - 1];
                  l.length < s.headerLength
                    ? n.pop()
                    : (a || (o.push(l + "%guardStart"), (a = !0)),
                      s.cmds.forEach((e) => {
                        o.push("" + l + e);
                      }));
                }
                a && o.push(l + "%guardEnd");
              }
            }
          }
          return o;
        }, PrecompileRulePriority.guard);
        PrecompileRuleCenter.shared().addRule(e);
      })();

      function CompatibleOperator(e) {
        return (e = (e = (e = e.replace(/([^&])[&]([^&])/g, "$1&&$2")).replace(
          /([^\|])[\|]([^\|])/g,
          "$1||$2",
        )).replace(/([^=<>!])[=]([^=])/g, "$1==$2"));
      }
      (() => {
        var e = new PrecompileRule(function (e) {
          let u = [];
          return (
            e.forEach((o) => {
              var n = /^(\s*)@call\s(\S+)(\s*(\S.*)+\s*|\s*)$/.exec(o);
              if (null == n) u.push(o);
              else {
                o = n[4];
                let t = "";
                if (null != o && 0 < o.length) {
                  var r = o.split(",");
                  for (let e = 0; e < r.length; e++) {
                    var i = r[e];
                    t += `($arg${e})=${i}
`;
                  }
                }
                var o = n[2],
                  l = getFlowStore().get(o);
                null == l && appendMessage(`<ord>未找到调用的流程 ${o}</ord>`);
                let e =
                  `[if] true
` +
                  SourceCodeHelper.appendHeader(
                    "    ",
                    t +
                      `
` +
                      l,
                  );
                var a,
                  o = __CallCounter,
                  l =
                    ((__CallCounter += 1),
                    (e = (e = e.replace(
                      /\(\$([_a-z][a-zA-Z0-9_]*?)\)/g,
                      `($__x${o}_$1)`,
                    )).replace(
                      /\(([_a-z][a-zA-Z0-9_]*?)\)/g,
                      `(__x${o}_$1)`,
                    )),
                    SourceCodeHelper.split(e));
                var s = n[1];
                for (a of l) /^\s*#/.test(a) || u.push("" + s + a);
              }
            }),
            u
          );
        }, PrecompileRulePriority.call);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (() => {
        var e = new PrecompileRule(function (e) {
          var t,
            o = [];
          for (t of e) /\S+/.test(t) && o.push(t);
          return o;
        }, PrecompileRulePriority.emptyLine);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (function addCompatibleGuardRule() {
        var e = new PrecompileRule(function (e) {
          var o = [];
          return (
            e.forEach((e) => {
              var t = /^\s*#(\[.*)$/.exec(e);
              null == t ? o.push(e) : ((e = t[1]), o.push("<---", e, "--->"));
            }),
            o
          );
        }, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (function addCompatibleUntilRule() {
        var e = new PrecompileRule(function (e) {
          var n = [];
          return (
            e.forEach((e) => {
              var t,
                o = /^(\s*)\[=(.+?)\](.*)$/.exec(e);
              null == o
                ? n.push(e)
                : ((e = o[1]),
                  (t = CompatibleOperator((t = o[2]))),
                  (o = o[3]),
                  n.push(e + "@until " + t),
                  /\S/.test(o) && n.push("" + e + o));
            }),
            n
          );
        }, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (function addCompatibleIfRule() {
        var e = new PrecompileRule(function (e) {
          var n = [];
          return (
            e.forEach((e) => {
              var t,
                o = /^(\s*)\[(.*?[=<>].*?|true|false)\](.*)$/i.exec(e);
              null == o
                ? n.push(e)
                : ((e = o[3]),
                  /\S/.test(e) &&
                    ((t = o[1]),
                    (o = CompatibleOperator((o = o[2]))),
                    n.push(t + "[if] " + o, t + "    " + e)));
            }),
            n
          );
        }, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (function addCompatibleNextRule() {
        var e = new PrecompileRule(function (e) {
          var o = [];
          return (
            e.forEach((e) => {
              var t = /^(\s*)@next(.*)$/i.exec(e);
              null == t ? o.push(e) : ((e = t[1]), o.push(e + "[continue]"));
            }),
            o
          );
        }, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(e);
      })();
      (function addCompatibleExitRule() {
        var e = new PrecompileRule(function (e) {
          var o = [];
          return (
            e.forEach((e) => {
              var t = /^(\s*)@exit(.*)$/i.exec(e);
              null == t ? o.push(e) : ((e = t[1]), o.push(e + "[break]"));
            }),
            o
          );
        }, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(e);
      })();

      return {
        compile(source) {
          return new Compiler().compile(source);
        },
        precompile(source) {
          return new Precompiler().precompile(source);
        },
        SortInsert,
        SourceCodeHelper,
        PrecompileRule,
        PrecompileRuleCenter,
        Precompiler,
        ControlKeys,
        Compiler,
        PrecompileRulePriority,
        CompatibleOperator,
        registerRule(handler, priority) {
          PrecompileRuleCenter.shared().addRule(
            new PrecompileRule(handler, priority),
          );
        },
      };
    },
  );
})(window);
