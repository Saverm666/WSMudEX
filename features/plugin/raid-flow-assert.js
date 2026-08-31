/** Assertion evaluation primitives for raid flows. */
(function registerRaidFlowAssert(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-assert",
    function createRaidFlowAssert() {
      var AssertLeftMarkHandlerCenter = {
        addHandler: function (e) {
          this._leftMarkHandlers.push(e);
        },
        getValue(t) {
          for (let e = 0; e < this._leftMarkHandlers.length; e++) {
            var o = this._leftMarkHandlers[e].handle(t);
            if (o.handle) return o.value;
          }
          return t;
        },
        _leftMarkHandlers: [],
      };
      class AssertWrapper {
        constructor(e) {
          var t = this;
          this.assert = function () {
            return e(t.text);
          };
        }
        setText(e) {
          this.text = e;
        }
      }
      class AssertHolder {
        constructor(e, t) {
          ((this.match = e), (this._getAssertWrapper = t));
        }
        getAssertWrapper() {
          return this._getAssertWrapper();
        }
      }
      var AssertHolderCenter = {
        addAssertHolder: function (e) {
          this._assertHolders.push(e);
        },
        get: function (e) {
          var o,
            n,
            r,
            t = e.replace(/^\s*|\s*$/g, ""),
            i = this,
            e = t.search(/&&|\|\|/g);
          if (-1 != e)
            return (
              (o = t.substring(e, e + 2)),
              (n = t.substring(0, e)),
              (r = t.substring(e + 2)),
              function () {
                var e = i.get(n),
                  t = i.get(r);
                switch (o) {
                  case "&&":
                    return e() && t();
                  case "||":
                    return e() || t();
                }
              }
            );
          if ("!" == t[0])
            return function () {
              return !i.get(t.substring(1))();
            };
          for (let e = 0; e < this._assertHolders.length; e++) {
            var l = this._assertHolders[e];
            if (l.match(t))
              return ((l = l.getAssertWrapper()).setText(t), l.assert);
          }
          return null;
        },
        _assertHolders: [],
      };
      (!(function addTureAssertHolder() {
        function b1(e) {
          return !0;
        }
        var e = new AssertHolder(
          function (e) {
            return "true" == e;
          },
          function () {
            return new AssertWrapper(b1);
          },
        );
        AssertHolderCenter.addAssertHolder(e);
      })(),
        !(function addFalseAssertHolder() {
          function g1(e) {
            return !1;
          }
          var e = new AssertHolder(
            function (e) {
              return "false" == e;
            },
            function () {
              return new AssertWrapper(g1);
            },
          );
          AssertHolderCenter.addAssertHolder(e);
        })(),
        !(function addPresetConfigAssertHolder() {
          function m1(e) {
            let t = e;
            t = (t = t.replace(/<(\w+)>/g, "「$1」")).replace(
              /<(\/\w+)>/g,
              "「¿$1」",
            );
            var e = a.exec(t)[0],
              o = (i = t.split(e))[0].replace(/^\s*|\s*$/g, ""),
              n = AssertLeftMarkHandlerCenter.getValue(o),
              r = i[1].replace(/^\s*|\s*$/g, ""),
              o = parseFloat(n),
              i = parseFloat(r),
              l = !1;
            switch ((isNaN(o) || isNaN(i) || ((n = o), (r = i), (l = !0)), e)) {
              case "=":
              case "==":
                return l ? Math.abs(n - r) < 0.001 : n == r;
              case ">":
                return r < n;
              case "<":
                return n < r;
              case ">=":
                return r <= n;
              case "<=":
                return n <= r;
              case "!=":
                return l ? 0.001 < Math.abs(n - r) : n != r;
              default:
                return !1;
            }
          }
          var a = new RegExp(">=?|<=?|!=|==?"),
            e = new AssertHolder(
              function (e) {
                return a.test(e);
              },
              function () {
                return new AssertWrapper(m1);
              },
            );
          AssertHolderCenter.addAssertHolder(e);
        })());

      return {
        AssertLeftMarkHandlerCenter,
        AssertWrapper,
        AssertHolder,
        AssertHolderCenter,
      };
    },
  );
})(window);
