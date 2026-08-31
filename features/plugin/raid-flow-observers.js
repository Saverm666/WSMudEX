/** Raid flow protocol observers and bounded search caches. */
(function registerRaidFlowObservers(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-observers",
    function createRaidFlowObservers(context) {
      const addHook = context.addHook || (() => {});
      const now = context.now || (() => new Date().getTime());
      const clone = context.clone || ((value) => structuredClone(value));
      const deserializePackData =
        context.deserializePackData || ((value) => value);
      const findItem = context.findItem || (() => null);
      const createSystemTip =
        context.createSystemTip || ((text) => new SystemTip(text));
      const createMsgTip =
        context.createMsgTip ||
        ((content, ch, name, uid) => new MsgTip(content, ch, name, uid));

      class SystemTip {
        constructor(text) {
          ((this.timestamp = now()), (this.text = text));
        }
      }

      const SystemTips = {
        init: function () {
          this._monitorSystemTips();
        },
        search: function (expression, timestamp) {
          const regexp = new RegExp(expression);
          const tips = this._tips.slice();
          for (let index = tips.length - 1; 0 <= index; index--) {
            let tip = tips[index];
            if (tip.timestamp < timestamp) break;
            tip = regexp.exec(tip.text);
            if (tip) return tip;
          }
          return null;
        },
        clean: function (timestamp) {
          for (;;) {
            if (this._tips.length <= 0) break;
            if (this._tips[0].timestamp > timestamp) break;
            this._tips.shift();
          }
        },
        rejectTimestamp: null,
        _monitorSystemTips: function () {
          const observers = this;
          (addHook("text", function (event) {
            const tip = createSystemTip(event.msg);
            (observers._push(tip),
              "不要急，慢慢来。" == event.msg &&
                (observers.rejectTimestamp = now()));
          }),
            addHook("item", function (event) {
              const text = event.desc;
              null != text && observers._push(createSystemTip(text));
            }));
        },
        _push: function (tip) {
          (this._tips.length >= this._maxCapacity && this._tips.shift(),
            this._tips.push(tip));
        },
        _tips: [],
        _maxCapacity: 100,
      };

      class MsgTip {
        constructor(content, ch, name, uid) {
          ((this.timestamp = now()),
            (this.content = content),
            (this.ch = ch),
            (this.name = name),
            (this.uid = uid));
        }
      }

      const MsgTips = {
        init: function () {
          this._monitorSystemTips();
        },
        search: function (expression, timestamp) {
          const regexp = new RegExp(expression);
          const tips = this._tips.slice();
          for (let index = tips.length - 1; 0 <= index; index--) {
            let tip = tips[index];
            if (tip.timestamp < timestamp) break;
            tip = regexp.exec(tip.content);
            if (tip) return tip;
          }
          return null;
        },
        clean: function (timestamp) {
          for (;;) {
            if (this._tips.length <= 0) break;
            if (this._tips[0].timestamp > timestamp) break;
            this._tips.shift();
          }
        },
        rejectTimestamp: null,
        _monitorSystemTips: function () {
          const observers = this;
          addHook("msg", function (event) {
            observers._push(
              createMsgTip(event.content, event.ch, event.name, event.uid),
            );
          });
        },
        _push: function (tip) {
          (this._tips.length >= this._maxCapacity && this._tips.shift(),
            this._tips.push(tip));
        },
        _tips: [],
        _maxCapacity: 100,
      };

      const DialogList = {
        init: function () {
          this._monitorDialogList();
        },
        timestamp: null,
        findItem: function (name, blurry, quality, filterExp) {
          return findItem(this._list, name, blurry, quality, filterExp);
        },
        _list: [],
        _monitorDialogList: function () {
          const observers = this;
          addHook("dialog", function (event) {
            let list = null;
            (null != event.selllist
              ? ((event = clone(event)),
                (event = deserializePackData(event)),
                (list = event.selllist))
              : null != event.stores
                ? ((event = clone(event)),
                  (event = deserializePackData(event)),
                  (list = event.stores))
                : "pack2" == event.dialog &&
                  null != event.items &&
                  (list = event.items),
              null != list && ((observers.timestamp = now()), (observers._list = list)));
          });
        },
      };

      const TaskList = {
        init: function () {
          this._monitorTasksList();
        },
        search: function (expression, timestamp) {
          if (!(this._timestamp < timestamp)) {
            const regexp = new RegExp(expression);
            for (const text of this._list) {
              const match = regexp.exec(text);
              if (match) return match;
            }
          }
          return null;
        },
        _timestamp: null,
        _list: [],
        _monitorTasksList: function () {
          const observers = this;
          addHook("dialog", function (event) {
            if (null != event.dialog && "tasks" == event.dialog && null != event.items) {
              const list = [];
              for (const item of event.items) list.push(item.desc);
              ((observers._timestamp = now()), (observers._list = list));
            }
          });
        },
      };

      const Xiangyang = {
        init: function () {
          this._monitorXiangyang();
        },
        search: function (expression, timestamp) {
          return (
            (!(this._timestamp < timestamp) &&
              new RegExp(expression).exec(this._desc)) ||
            null
          );
        },
        _timestamp: null,
        _desc: "",
        _monitorXiangyang: function () {
          const observers = this;
          addHook("dialog", function (event) {
            null != event.dialog &&
              "fam" == event.t &&
              8 == event.index &&
              null != event.desc &&
              ((observers._timestamp = now()), (observers._desc = event.desc));
          });
        },
      };

      return {
        SystemTip,
        MsgTip,
        SystemTips,
        MsgTips,
        DialogList,
        TaskList,
        Xiangyang,
      };
    },
  );
})(window);
