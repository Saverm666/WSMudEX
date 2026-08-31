/** Trigger domain models and persistent trigger center. */
(function registerTriggerCore(global) {
  "use strict";

  global.WSMudPlugin.registerService("trigger-core", function create(context) {
    const eventBus = context.eventBus;
    const getRoleId = context.getRoleId;
    const perform = context.perform;
    const storage = context.storage;
    const logger = context.logger || console;

    function CopyObject(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function is_match(pattern, value) {
      return (
        (0 == pattern.length && 0 == value.length) ||
        ("*" == pattern[0] && 1 == pattern.length) ||
        (0 != pattern.length &&
          0 != value.length &&
          ("?" == pattern[0]
            ? is_match(pattern.substring(1), value.substring(1))
            : "*" == pattern[0]
              ? is_match(pattern.substring(1), value) ||
                is_match(pattern.substring(1), value.substring(1)) ||
                is_match(pattern, value.substring(1))
              : pattern[0] == value[0] &&
                is_match(pattern.substring(1), value.substring(1))))
      );
    }

    function equalFilter(expected, actual) {
      return expected == actual;
    }

    function includeFilter(expected, actual) {
      return (
        /^\s*\*?\s*$/.test(expected) ||
        -1 != expected.split("|").indexOf(actual)
      );
    }

    function excludeFilter(expected, actual) {
      return (
        logger.log(expected, actual),
        /^\s*\*?\s*$/.test(expected) ||
          -1 == expected.split("|").indexOf(actual)
      );
    }

    function containsFilter(expected, actual) {
      if (/^\s*\*?\s*$/.test(expected)) return true;
      let value;
      for (value of expected.split("|")) {
        if (-1 != actual.indexOf(value)) return true;
      }
      return false;
    }

    class Monitor {
      constructor(run) {
        this.run = run;
      }
    }

    class Filter {
      constructor(name, type, defaultValue, assert) {
        this.name = name;
        this.type = type;
        this.defaultValue = defaultValue;
        this.assert = assert == null ? equalFilter : assert;
      }
      description(value) {
        if (value == null) return this._desc == null ? this.name : this._desc;
        this._desc = value;
      }
    }

    class SelectFilter extends Filter {
      constructor(name, options, defaultIndex, assert) {
        super(name, "select", options[defaultIndex], assert);
        this.options = options;
      }
    }

    const inputFormats = { number: "数字", text: "文本" };

    class InputFilter extends Filter {
      constructor(name, format, defaultValue, assert) {
        super(name, "input", defaultValue, assert);
        this.format = format;
      }
    }

    class TriggerTemplate {
      constructor(event, filters, introduction) {
        this.event = event;
        this.filters = filters;
        this.introdution =
          introduction +
          `
// 如需更多信息，可以到论坛触发器版块发帖。`;
      }
      getFilter(name) {
        for (const filter of this.filters) {
          if (filter.name == name) return filter;
        }
        return null;
      }
    }

    const templates = {
      add: function (template) {
        this._templates[template.event] = template;
      },
      getAll: function () {
        return Object.values(this._templates);
      },
      get: function (event) {
        return this._templates[event];
      },
      _templates: {},
    };

    class Trigger {
      constructor(name, template, conditions, source) {
        this.name = name;
        this.template = template;
        this.conditions = conditions;
        this.source = source;
        this._action = function (event) {
          let key;
          let value;
          const data = CopyObject(event);
          for (key in conditions) {
            if (conditions.hasOwnProperty(key)) {
              const filter = template.getFilter(key);
              const expected = conditions[key];
              const actual = event[key];
              if (!filter.assert(expected, actual)) return;
              delete data[key];
            }
          }
          let command = source;
          for (value in data) {
            command = `($${value}) = ${data[value]}\n` + command;
          }
          if (0 == /\/\/\s*~silent\s*\n/.test(source)) {
            command = `@print 💡<hio>触发=>${name}</hio>\n` + command;
          }
          perform(command, name, !1);
        };
        this._observerIndex = null;
      }
      event() {
        return this.template.event;
      }
      active() {
        return this._observerIndex != null;
      }
      _activate() {
        if (this._observerIndex == null && this.template != null) {
          this._observerIndex = eventBus.observe(
            this.template.event,
            this._action,
          );
        }
      }
      _deactivate() {
        if (this._observerIndex != null) {
          eventBus.removeOberver(this._observerIndex);
          this._observerIndex = null;
        }
      }
    }

    class TriggerData {
      constructor(name, event, conditions, source, active) {
        this.name = name;
        this.event = event;
        this.conditions = conditions;
        this.source = source;
        this.active = active;
      }
    }

    const TriggerCenter = {
      run: function () {
        for (const name in storage.get(this._saveKey(), {})) {
          this._loadTrigger(name);
        }
      },
      reload: function () {
        for (const name in this._triggers) {
          if (this._triggers.hasOwnProperty(name)) {
            this._triggers[name]._deactivate();
            delete this._triggers[name];
          }
        }
        this.run();
      },
      getAllData: function () {
        return storage.get(this._saveKey(), {});
      },
      corver: function (data) {
        for (const trigger of this.getAll()) this.remove(trigger.name);
        for (let index in data) {
          index = data[index];
          this.create(
            index.name,
            index.event,
            index.conditions,
            index.source,
            index.active,
          );
        }
      },
      getAll: function () {
        return Object.values(this._triggers);
      },
      create: function (name, event, conditions, source, active) {
        let result = this._checkName(name);
        return 1 != result
          ? result
          : ((result = active != null && active),
            (active = new TriggerData(
              name,
              event,
              conditions,
              source,
              result,
            )),
            this._updateData(active),
            this._loadTrigger(name),
            !0);
      },
      modify: function (name, newName, conditions, source) {
        let event;
        const trigger = this._triggers[name];
        return trigger == null
          ? "修改不存在的触发器？"
          : ((event = trigger.event()),
            name == newName
              ? ((event = new TriggerData(
                  newName,
                  event,
                  conditions,
                  source,
                  trigger.active(),
                )),
                this._updateData(event),
                this._reloadTrigger(newName),
                !0)
              : (1 == (event = this.create(newName, event, conditions, source)) &&
                  (this.remove(name), this._loadTrigger(newName)),
                event));
      },
      remove: function (name) {
        let trigger = this._triggers[name];
        if (trigger != null) {
          trigger._deactivate();
          delete this._triggers[name];
          trigger = storage.get(this._saveKey(), {});
          delete trigger[name];
          storage.set(this._saveKey(), trigger);
        }
      },
      activate: function (pattern) {
        for (const name in this._triggers) {
          const trigger = this._triggers[name];
          if (
            is_match(pattern, name) &&
            trigger != null &&
            !trigger.active()
          ) {
            trigger._activate();
            const data = this._getData(name);
            data.active = true;
            this._updateData(data);
          }
        }
      },
      deactivate: function (pattern) {
        for (const name in this._triggers) {
          const trigger = this._triggers[name];
          if (
            is_match(pattern, name) &&
            trigger != null &&
            trigger.active()
          ) {
            trigger._deactivate();
            const data = this._getData(name);
            data.active = false;
            this._updateData(data);
          }
        }
      },
      _triggers: {},
      _saveKey: function () {
        return getRoleId() + "@triggers";
      },
      _reloadTrigger: function (name) {
        const trigger = this._triggers[name];
        if (trigger != null) trigger._deactivate();
        this._loadTrigger(name);
      },
      _loadTrigger: function (name) {
        let trigger;
        const data = this._getData(name);
        if (data != null) {
          if (
            "新聊天信息" === data.event &&
            data.conditions["忽略发言人"] === undefined
          ) {
            data.conditions["忽略发言人"] = "";
          }
          trigger = this._toTrigger(data);
          this._triggers[name] = trigger;
          if (data.active) trigger._activate();
        }
      },
      _getData: function (name) {
        return storage.get(this._saveKey(), {})[name];
      },
      _updateData: function (data) {
        const values = storage.get(this._saveKey(), {});
        values[data.name] = data;
        storage.set(this._saveKey(), values);
      },
      _toTrigger: function (data) {
        const template = templates.get(data.event);
        return new Trigger(data.name, template, data.conditions, data.source);
      },
      _checkName: function (name) {
        return this._triggers[name] != null
          ? "无法修改名称，已经存在同名触发器！"
          : /\S+/.test(name)
            ? !!/^[_a-zA-Z0-9\u4e00-\u9fa5]+$/.test(name) ||
              "触发器的名称只能使用中文、英文和数字字符。"
            : "触发器的名称不能为空。";
      },
    };

    return {
      CopyObject,
      is_match,
      equalFilter,
      includeFilter,
      excludeFilter,
      containsFilter,
      Monitor,
      Filter,
      SelectFilter,
      InputFilter,
      inputFormats,
      TriggerTemplate,
      templates,
      Trigger,
      TriggerData,
      TriggerCenter,
    };
  });
})(window);
