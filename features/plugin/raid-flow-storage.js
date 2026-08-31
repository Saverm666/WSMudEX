/** Raid flow persistence and legacy workflow configuration service. */
(function registerRaidFlowStorage(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-storage",
    function createRaidFlowStorage(context) {
      const getRoleId = context.getRoleId || (() => null);
      const storage = context.storage || {};
      function read(key, fallback) {
        return arguments.length > 1
          ? storage.get(key, fallback)
          : storage.get(key);
      }
      const write = storage.set || (() => {});
      const remove = storage.remove || (() => {});
      const list = storage.list || (() => []);
      const report = context.alert || (() => {});

      class PersistentCache {
        constructor(save, getAll, removeEntry) {
          ((this._save = save),
            (this._getAll = getAll),
            (this._remove = removeEntry));
        }
        save(key, value) {
          this._save(key, value);
        }
        get(key) {
          return this.getAll()[key];
        }
        getAll() {
          return this._getAll();
        }
        remove(key) {
          this._remove(key);
        }
      }

      function flowStoreKey() {
        return "flow_store@" + getRoleId();
      }
      function readFlowStore() {
        const value = read(flowStoreKey(), null);
        return null == value ? read("flow_store@null", {}) : value;
      }
      const FlowStore = new PersistentCache(
        (key, value) => {
          const all = readFlowStore();
          ((all[key] = value), write(flowStoreKey(), all));
        },
        () => readFlowStore(),
        (key) => {
          const all = readFlowStore();
          (delete all[key], write(flowStoreKey(), all));
        },
      );
      FlowStore.corver = function corver(value) {
        write(flowStoreKey(), value);
      };

      function globalParamsKey() {
        return "global_params@" + getRoleId();
      }
      function readGlobalParams() {
        const value = read(globalParamsKey(), null);
        return null == value ? read("global_params@null", {}) : value;
      }
      const PersistentVariables = new PersistentCache(
        (key, value) => {
          const all = readGlobalParams();
          ((all[key] = value), write(globalParamsKey(), all));
        },
        () => readGlobalParams(),
        (key) => {
          const all = readGlobalParams();
          (delete all[key], write(globalParamsKey(), all));
        },
      );

      const CmdGroupManager = {
        getAll: function () {
          const result = [];
          list().map(function (key) {
            let id;
            0 == key.indexOf(CmdGroupManager._prefix) &&
              ((id = CmdGroupManager._id(key)),
              (key = CmdGroupManager.getName(id)),
              result.push({ id: id, name: key }));
          });
          return result;
        },
        getName: function (id) {
          const value = read(this._key(id));
          return null == value ? null : JSON.parse(value).name;
        },
        getCmdsText: function (id) {
          const value = read(this._key(id));
          return null == value ? "" : JSON.parse(value).cmdsStr;
        },
        getCmds: function (id) {
          let commands = this.getCmdsText(id).split(/^\s*|\s*\n+\s*/g);
          let first = commands[0];
          first != null && 0 == first.length && commands.splice(0, 1);
          const last = commands[commands.length - 1];
          last != null && 0 == last.length && commands.splice(commands.length - 1, 1);
          return commands;
        },
        createCmdGroup: function (name, commands) {
          const id = new Date().getTime();
          return this.updateCmdGroup(id, name, commands);
        },
        updateCmdGroup: function (id, name, commands) {
          return null != name && /\S+/g.test(name)
            ? null != commands && /\S+/g.test(commands)
              ? ((name = { name: name, cmdsStr: commands }),
                write(this._key(id), JSON.stringify(name)),
                !0)
              : (report("命令组不想没有任何内容..."), !1)
            : (report("命令组想要一个名字..."), !1);
        },
        removeCmdGroup: function (id) {
          remove(this._key(id));
        },
        _prefix: "@cmdgroup",
        _key: function (id) {
          return this._prefix + id;
        },
        _id: function (key) {
          return parseInt(key.substring(this._prefix.length));
        },
      };

      const WorkflowConfigManager = {
        getAll: function () {
          const result = [];
          list().map(function (key) {
            let id;
            WorkflowConfigManager._isMyKey(key) &&
              ((id = WorkflowConfigManager._id(key)),
              (key = WorkflowConfigManager.getName(id)),
              result.push({ id: id, name: key }));
          });
          return result;
        },
        getName: function (id) {
          const value = read(this._key(id));
          return null == value ? null : JSON.parse(value).name;
        },
        getCmdGroupInfos: function (id) {
          const value = read(this._key(id));
          return null == value ? null : JSON.parse(value).infos;
        },
        getWorkflow: function (id) {
          const workflows = [];
          for (const info of this.getCmdGroupInfos(id)) {
            const name = CmdGroupManager.getName(info.id);
            const commands = CmdGroupManager.getCmds(info.id);
            const commandWorkflow = new CommandWorkflow(
              name,
              commands,
              info.repeat,
            );
            workflows.push(commandWorkflow);
          }
          return new Workflow(this.getName(id), workflows, 1);
        },
        createWorkflowConfig: function (name, infos) {
          const id = new Date().getTime();
          return this.updateWorkflowConfig(id, name, infos);
        },
        updateWorkflowConfig: function (id, name, infos) {
          return null != name && /\S+/g.test(name)
            ? null == infos || infos.length <= 0
              ? (report("工作流不想没有任何内容..."), !1)
              : ((name = { name: name, infos: infos }),
                write(this._key(id), JSON.stringify(name)),
                !0)
            : (report("工作流想要一个名字..."), !1);
        },
        removeWorkflowConfig: function (id) {
          remove(this._key(id));
        },
        _prefix: "workflow@",
        _isMyKey: function (key) {
          return 0 == key.indexOf(this._prefix + getRoleId());
        },
        _key: function (id) {
          return this._prefix + getRoleId() + id;
        },
        _id: function (key) {
          return parseInt(key.substring((this._prefix + getRoleId()).length));
        },
      };

      const CodeTranslator = {
        run: function () {
          let finder = this._getFinder("原命令组");
          (finder && WorkflowConfig.removeFinder(finder),
            WorkflowConfig.createFinder("原命令组"),
            (finder = this._getFinder("原工作流程")));
          (finder && WorkflowConfig.removeFinder(finder),
            WorkflowConfig.createFinder("原工作流程"));
          let groups = CmdGroupManager.getAll();
          let workflows = WorkflowConfigManager.getAll();
          const unique = this._newSingleName(groups, workflows);
          ((groups = unique.group), (workflows = unique.flow));
          groups.forEach((group) => {
            const source = this._appendHeader(
              "    ",
              CmdGroupManager.getCmdsText(group.id),
            );
            WorkflowConfig.createWorkflow(
              group.name,
              `($_i) = 0
[while] (_i) < (arg0)
${source}
    ($_i) = (_i) + 1`,
              "原命令组",
            );
          });
          workflows.forEach((workflow) => {
            const infos = WorkflowConfigManager.getCmdGroupInfos(workflow.id);
            let source = "";
            infos.forEach((info) => {
              let name = null;
              for (const group of groups)
                if (group.id == info.id) {
                  name = group.name;
                  break;
                }
              source += `@call ${name} ${info.repeat}
`;
            });
            WorkflowConfig.createWorkflow(
              workflow.name,
              source,
              "原工作流程",
            );
          });
        },
        _newSingleName: function (groups, workflows) {
          groups = this._singleName(groups);
          workflows = this._singleName(workflows);
          groups.forEach((group) => {
            const name = group.name;
            for (const workflow of workflows)
              if (workflow.name == name) {
                group.name = "芫" + name;
                break;
              }
          });
          return { group: groups, flow: workflows };
        },
        _singleName: function (items) {
          for (const item of items)
            item.name = item.name.replace(/[^_a-zA-Z0-9\u4e00-\u9fa5]/g, "");
          for (let index = 0; index < items.length; index += 1) {
            const name = items[index].name;
            let suffix = 1;
            for (let next = index + 1; next < items.length; next += 1) {
              const item = items[next];
              item.name == name && ((item.name = name + "_" + suffix), (suffix += 1));
            }
          }
          return items;
        },
        _getFinder: function (name) {
          const root = WorkflowConfig._rootList();
          const index = WorkflowConfig._findFinder(name, root);
          return null == index ? null : root[index];
        },
        _appendHeader: function (indent, source) {
          let result = `
${source}`;
          return (result = (result = (result = result.replace(/(\n)/g, "$1" + indent)).replace(
            /\n\s*\n/g,
            "\n",
          )).replace(/^\s*\n/, ""));
        },
      };

      const WorkflowConfig = {
        rootFinderName: "根文件夹",
        rootFinderSortWay: function (value) {
          const key = "__WorkflowRootFinderSortWay";
          if (null == value) return read(key, "nameAsc");
          write(key, value);
        },
        finderList: function (finderName) {
          let entries = [];
          let index;
          let root;
          if (finderName == this.rootFinderName) entries = this._rootList();
          else {
            root = this._rootList();
            index = this._findFinder(finderName, root);
            null != index && ((root = root[index]), (entries = root.flows));
          }
          entries.forEach((entry) => {
            "flow" == entry.type && (entry.finder = finderName);
          });
          switch (this.rootFinderSortWay()) {
            case "updateDesc":
              entries.reverse();
              break;
            case "nameAsc":
              entries.sort((left, right) => left.name.localeCompare(right.name));
              break;
            case "nameDesc":
              entries.sort((left, right) => right.name.localeCompare(left.name));
          }
          return entries;
        },
        createFinder: function (name, flows) {
          const result = this._checkName(null, name, !0);
          if (1 != result) return result;
          const root = this._rootList();
          root.push({ name: name, type: "finder", flows: flows || [] });
          this._rootList(root);
          return !0;
        },
        modifyFinder: function (finder, name) {
          const result = this._checkName(finder.name, name, !0);
          return 1 != result
            ? result
            : finder.name == name ||
                (this.removeFinder(finder), this.createFinder(name, finder.flows));
        },
        removeFinder: function (finder) {
          const root = this._rootList();
          const index = this._findFinder(finder.name, root);
          if (null != index) {
            (root.splice(index, 1), this._rootList(root));
            for (const flow of finder.flows) FlowStore.remove(flow.name);
          }
        },
        createWorkflow: function (name, source, finderName) {
          const result = this._checkName(null, name, !1);
          if (1 != result) return result;
          const flow = { name: name, type: "flow" };
          const root = this._rootList();
          let inserted = !1;
          if (finderName == this.rootFinderName) root.push(flow), (inserted = !0);
          else {
            const index = this._findFinder(finderName, root);
            null != index && (root[index].flows.push(flow), (inserted = !0));
          }
          return inserted
            ? (FlowStore.save(name, source), this._rootList(root), !0)
            : `未找到名为"${finderName}"的文件夹。`;
        },
        modifyWorkflow: function (flow, name, source, finderName) {
          const result = this._checkName(flow.name, name, !1);
          return 1 != result
            ? result
            : flow.name != name || flow.finder != finderName
              ? (this.removeWorkflow(flow), this.createWorkflow(name, source, finderName))
              : (FlowStore.get(flow.name) != source && FlowStore.save(flow.name, source), !0);
        },
        removeWorkflow: function (flow) {
          const root = this._rootList();
          if (flow.finder == this.rootFinderName) {
            for (let index = 0; index < root.length; index += 1) {
              const entry = root[index];
              if ("flow" == entry.type && entry.name == flow.name) {
                root.splice(index, 1);
                break;
              }
            }
          } else {
            const finderIndex = this._findFinder(flow.finder, root);
            if (null != finderIndex) {
              const flows = root[finderIndex].flows;
              for (let index = 0; index < flows.length; index += 1)
                if (flows[index].name == flow.name) {
                  flows.splice(index, 1);
                  break;
                }
            }
          }
          (this._rootList(root), FlowStore.remove(flow.name));
        },
        getFinderNames: function () {
          const names = [this.rootFinderName];
          this._rootList().forEach((entry) => {
            "finder" == entry.type && names.push(entry.name);
          });
          return names;
        },
        _rootList: function (value) {
          const key = "WorkflowConfig_" + getRoleId();
          return (null != value && write(key, value), read(key, []));
        },
        _checkName: function (oldName, name, isFinder) {
          if (name != oldName) {
            const type = isFinder ? "文件夹" : "工作流程";
            if (!/\S+/.test(name)) return type + "的名称不能为空。";
            if (-1 != name.indexOf(this.rootFinderName))
              return type + `的名称中不能包含"${this.rootFinderName}"。`;
            if (!/^[_a-zA-Z0-9\u4e00-\u9fa5]+$/.test(name))
              return type + "的名称只能使用中文、英文和数字字符。";
            const entryType = isFinder ? "finder" : "flow";
            for (const entry of this._rootList()) {
              if (entry.type == entryType && entry.name == name)
                return `已经存在此名称的${type}。`;
              if ("finder" == entry.type && !isFinder)
                for (const flow of entry.flows)
                  if (flow.name == name) return `已经存在此名称的${type}。`;
            }
          }
          return !0;
        },
        _findFinder: function (name, root) {
          for (let index = 0; index < root.length; index += 1) {
            const entry = root[index];
            if ("finder" == entry.type && entry.name == name) return index;
          }
          return null;
        },
      };

      return {
        PersistentCache,
        FlowStore,
        PersistentVariables,
        CmdGroupManager,
        WorkflowConfigManager,
        CodeTranslator,
        WorkflowConfig,
      };
    },
  );
})(window);
