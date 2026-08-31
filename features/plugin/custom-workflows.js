/** Custom workflow storage, execution, quick buttons and Vue editors. */
(function registerCustomWorkflows(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "custom-workflows",
    function install(context) {
      const WG = context.WG;
      const G = context.G;
      const UI = context.UI;
      const T = context.T;
      const L = context.L || {};
      const services = context.services || {};
      const storage = context.storage;
      const jquery = context.jquery || global.jQuery;
      const VueConstructor = context.Vue || global.Vue;
      const messageAppend = context.messageAppend;
      const messageClear = context.messageClear;
      const prompt = context.prompt || global.prompt;
      const legacy = context.legacy || {};
      const logger = context.logger || global.console;

      if (!WG || !G || !UI || !T || !storage || typeof storage.get !== "function" ||
          typeof storage.set !== "function" || typeof jquery !== "function" ||
          typeof messageAppend !== "function" || typeof messageClear !== "function") {
        throw new TypeError("自定义流程需要显式 WG、G、UI、T、storage、jquery 和消息上下文");
      }
      if (typeof VueConstructor !== "function") {
        throw new TypeError("自定义流程需要显式 Vue 上下文");
      }

      const $ = jquery;
      const previousService = WG.customWorkflows;
      let workflows =
        typeof legacy.getWorkflows === "function"
          ? legacy.getWorkflows()
          : [];
      let workflowsRoleId = getRoleId();
      let displaySettingRoleId = getRoleId();

      function getRoleId() {
        return typeof legacy.getRoleId === "function" ? legacy.getRoleId() : "";
      }

      function getRoleName() {
        return typeof legacy.getRoleName === "function" ? legacy.getRoleName() : "";
      }

      function workflowsKey(roleId = getRoleId()) {
        return roleId + "_zml";
      }

      function workflowsDisplayKey() {
        return getRoleId() + "_zmlshowsetting";
      }

      function getWorkflows() {
        const roleId = getRoleId();
        const fallback =
          workflowsRoleId === roleId &&
          typeof legacy.getWorkflows === "function"
            ? legacy.getWorkflows()
            : [];
        workflowsRoleId = roleId;
        workflows = storage.get(workflowsKey(), fallback);
        if (typeof legacy.setWorkflows === "function")
          legacy.setWorkflows(workflows);
        return workflows;
      }

      function saveWorkflows(value) {
        saveWorkflowsForRole(getRoleId(), value);
      }

      function saveWorkflowsForRole(roleId, value) {
        if (roleId === getRoleId()) {
          workflowsRoleId = roleId;
          workflows = value;
          if (typeof legacy.setWorkflows === "function")
            legacy.setWorkflows(workflows);
        }
        storage.set(workflowsKey(roleId), value);
      }

      function getDisplaySetting() {
        const roleId = getRoleId();
        const fallback =
          displaySettingRoleId === roleId &&
          typeof legacy.getWorkflowDisplaySetting === "function"
            ? legacy.getWorkflowDisplaySetting()
            : 0;
        displaySettingRoleId = roleId;
        const value = storage.get(workflowsDisplayKey(), fallback);
        if (typeof legacy.setWorkflowDisplaySetting === "function")
          legacy.setWorkflowDisplaySetting(value);
        return value;
      }

      function getRemoteConfig() {
        return context.remoteConfig || services.remoteConfig;
      }

      function getRaid() {
        if (typeof context.getRaid === "function") return context.getRaid();
        if (typeof legacy.getRaid === "function") return legacy.getRaid();
        return global.ToRaid;
      }

      function executeLegacyScript(source) {
        const execute =
          context.executeLegacyScript ||
          (typeof WG.executeLegacyScript === "function" &&
            WG.executeLegacyScript);
        if (typeof execute !== "function") {
          throw new Error("自定义流程缺少 executeLegacyScript 兼容桥");
        }
        return execute(source);
      }

      async function zmlfire(zml) {
        if (!zml) return;
        messageAppend("运行" + zml.name, 2);
        if (0 == zml.zmlType || "" == zml.zmlType || null == zml.zmlType) {
          await WG.SendCmd(zml.zmlRun);
          return;
        }
        if (1 == zml.zmlType) {
          const raid = getRaid();
          if (raid && typeof raid.perform === "function")
            raid.perform(zml.zmlRun);
          return;
        }
        if (2 == zml.zmlType) executeLegacyScript(zml.zmlRun);
      }

      function zmlztjk() {
        workflows = getWorkflows();
        const panelRoleId = getRoleId();
        // Keep the historical array check exactly as it was in the legacy body.
        (!1) instanceof Array && (workflows = []);
        messageClear();
        messageAppend(UI.zmlandztjkui);
        new VueConstructor({
          el: "#zmlandztjk",
          data: {},
          created() {
            this.zmldata = workflows;
          },
          methods: {
            run: function (entry) {
              if (panelRoleId !== getRoleId()) return;
              WG.zmlfire(entry);
            },
            zml: function () {
              WG.zml_edit();
            },
            ztjk: function () {
              WG.ztjk_edit();
            },
            startjk: function () {
              if (panelRoleId !== getRoleId()) return;
              WG.ztjk_func();
            },
            stopjk: function () {
              if (panelRoleId !== getRoleId()) return;
              WG.ztjk_hook != null
                ? (WG.remove_hook(WG.ztjk_hook),
                  (WG.ztjk_hook = void 0),
                  messageAppend("已取消注入", 2))
                : messageAppend("未注入", 2);
            },
          },
        });
      }

      function zml_edit() {
        workflows = getWorkflows();
        const editorRoleId = getRoleId();
        // Keep the historical array check exactly as it was in the legacy body.
        (!1) instanceof Array && (workflows = []);
        messageClear();
        messageAppend(UI.zmlsetting);
        new VueConstructor({
          el: "#zmldialog",
          data: {
            singnalzml: { name: "", zmlType: "0", zmlRun: "" },
            zmldata: workflows,
          },
          created() {
            this.zmldata = workflows;
          },
          methods: {
            add: function () {
              var entry,
                value = {
                  name: this.singnalzml.name,
                  zmlRun: this.singnalzml.zmlRun,
                  zmlShow: 0,
                  zmlType: this.singnalzml.zmlType,
                };
              let isNew = !0;
              for (entry of this.zmldata)
                entry.name == value.name &&
                  ((value.zmlShow = entry.zmlShow),
                  (entry = value),
                  (isNew = !1));
              (isNew && this.zmldata.push(value),
                saveWorkflowsForRole(editorRoleId, this.zmldata),
                L.msg("保存成功"));
            },
            del: function () {
              this.zmldata.forEach((entry, index) => {
                entry.name == this.singnalzml.name &&
                  (this.zmldata.baoremove(index),
                  saveWorkflowsForRole(editorRoleId, this.zmldata),
                  L.msg("删除成功"));
              });
            },
            getShare: function () {
              const shareId = prompt("请输入分享码");
              const remoteConfig = getRemoteConfig();
              if (!remoteConfig || typeof remoteConfig.getShareJson !== "function")
                return;
              remoteConfig.getShareJson(shareId, (response) => {
                response = JSON.parse(response.json);
                null != response.zmlRun
                  ? (this.singnalzml = response)
                  : L.msg("不合法");
              });
            },
            edit: function (entry) {
              this.singnalzml = entry;
            },
            showp: function (entry) {
              showQuickWorkflow(entry, editorRoleId);
            },
            share: function (entry) {
              if (editorRoleId !== getRoleId()) return;
              const remoteConfig = getRemoteConfig();
              if (remoteConfig && typeof remoteConfig.shareJson === "function")
                remoteConfig.shareJson(G.id, entry);
            },
          },
        });
      }

      function showQuickWorkflow(entry, roleId = getRoleId()) {
        if (roleId !== getRoleId()) return;
        const displaySetting = getDisplaySetting();
        let container = $(".room-commands");
        for (const child of (container = 1 == displaySetting
          ? $(".zdy-commands")
          : container).children())
          if (child.textContent == entry.name)
            return (
              child.remove(),
              (entry.zmlShow = 0),
              saveWorkflows(workflows),
              void messageAppend("删除快速使用" + entry.name, 1)
            );
        (container.append(
          '<span class="act-item act-item-zdy">' + entry.name + "</span>",
        ),
          (entry.zmlShow = 1),
          saveWorkflows(workflows),
          messageAppend("设置快速使用" + entry.name, 0, 1),
          $(".act-item-zdy").off("click"),
          $(".act-item-zdy").on("click", function () {
            T.usezml(0, this.textContent, "");
          }));
      }

      function zml_showp() {
        workflows = getWorkflows();
        $(".zdy-commands").empty();
        $(".act-item-zdy").remove();
        const displaySetting = getDisplaySetting();
        for (const entry of workflows) {
          let container = $(".room-commands");
          if (1 == displaySetting) {
            for (const child of container.children())
              child.textContent == entry.name && child.remove();
            if (!WG.isseted) {
              let bottom = $(".tool-bar.right-bar").css("bottom");
              (bottom.replace("px", ""),
                (bottom = parseInt(bottom)),
                (bottom += 24),
                $(".tool-bar.right-bar").css("bottom", bottom + "px"),
                (WG.isseted = !0));
            }
            container = $(".zdy-commands");
          } else
            for (const child of $(".zdy-commands").children())
              child.textContent == entry.name && child.remove();
          1 == entry.zmlShow &&
            (container.append(
              '<span class="act-item act-item-zdy">' + entry.name + "</span>",
            ),
            messageAppend("设置快速使用" + entry.name, 0, 1),
            $(".act-item-zdy").off("click"),
            $(".act-item-zdy").on("click", function () {
              T.usezml(0, this.textContent, "");
            }));
        }
      }

      const service = {
        zmlfire,
        zmlztjk,
        zml_edit,
        zml_showp,
        getRoleId,
        getRoleName,
      };
      WG.customWorkflows = service;

      return {
        destroy() {
          if (WG.customWorkflows === service)
            WG.customWorkflows = previousService;
          $(".act-item-zdy").remove();
        },
      };
    },
  );
})(window);
