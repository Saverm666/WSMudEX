/** Plugin settings feature. Owns feature flags, settings UI behavior and menu entry. */
(function registerPluginSettings(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("plugin-settings", function install(context) {
    const { WG, G } = context;
    const settingsMarkup = `
      <div class="WG_plugin_settings" hidden aria-hidden="true">
        <section class="WG_plugin_settings_dialog" role="dialog" aria-modal="true" aria-labelledby="WG_plugin_settings_title">
          <header class="WG_plugin_settings_header">
            <span class="WG_plugin_settings_title" id="WG_plugin_settings_title">插件设置</span>
            <button class="WG_plugin_settings_close" type="button" aria-label="关闭插件设置">×</button>
          </header>
          <div class="WG_plugin_settings_body">
            <section class="WG_plugin_settings_section">
              <div class="WG_plugin_settings_heading">自动攻击</div>
              <div class="WG_plugin_settings_auto"></div>
            </section>
            <section class="WG_plugin_settings_section">
              <div class="WG_plugin_settings_heading">功能开关</div>
              <div class="WG_plugin_settings_features"></div>
            </section>
            <section class="WG_plugin_settings_section">
              <div class="WG_plugin_settings_heading">配装快捷键</div>
              <div class="WG_plugin_settings_desc WG_plugin_settings_section_desc">自定义左侧配装 1 / 2 / 3 按钮的显示名称。</div>
              <div class="WG_plugin_settings_loadouts"></div>
            </section>
          </div>
          <footer class="WG_plugin_settings_footer">
            <button class="WG_plugin_settings_button WG_plugin_settings_advanced" type="button">更多插件功能</button>
            <button class="WG_plugin_settings_button WG_plugin_settings_reset" type="button">恢复默认</button>
            <button class="WG_plugin_settings_button WG_plugin_settings_done" type="button">完成</button>
          </footer>
        </section>
      </div>`;

    function ensureSettingsView() {
      if (!$('.WG_plugin_settings').length) $("body").append(settingsMarkup);
    }

    Object.assign(WG, {
      pluginFeatureFlagsKey: "WG_plugin_feature_flags_v1",
      pluginFeatureDefinitions: [
        {
          id: "horizontalMenu",
          name: "横向三点菜单",
          desc: "让原生三点菜单从底部向左横排展开。",
        },
        {
          id: "chatDrawer",
          name: "右侧聊天面板",
          desc: "使用游戏原生聊天按钮打开或关闭右侧聊天。",
        },
        {
          id: "equipmentPicker",
          name: "装备快捷更换",
          desc: "点击左侧装备栏时打开装备选择面板。",
        },
        {
          id: "smartEquipmentOnTravel",
          name: "传送前智能换装",
          desc: "回家、去师父和潜能挂机前自动换成对应套装。",
        },
        {
          id: "floatingPanels",
          name: "多层悬浮面板",
          desc: "面板可拖动缩放，并保留父级页面。",
        },
        {
          id: "characterPopup",
          name: "人物与物品详情悬浮窗",
          desc: "查看场景人物、物品、技能和装备时使用独立详情窗。",
        },
        {
          id: "mapAutoRoute",
          name: "大地图自动寻路",
          desc: "点击大地图地点后自动按路径移动。",
        },
      ],
      getPluginFeatureFlags: function () {
        try {
          return JSON.parse(
            window.localStorage.getItem(WG.pluginFeatureFlagsKey) || "{}",
          );
        } catch (error) {
          return {};
        }
      },
      isPluginFeatureEnabled: function (feature) {
        return WG.getPluginFeatureFlags()[feature] !== false;
      },
      setPluginFeatureEnabled: function (feature, enabled) {
        var flags = WG.getPluginFeatureFlags();
        flags[feature] = Boolean(enabled);
        window.localStorage.setItem(
          WG.pluginFeatureFlagsKey,
          JSON.stringify(flags),
        );
        WG.applyPluginFeatureFlags();
      },
      applyPluginFeatureFlags: function () {
        var flags = WG.getPluginFeatureFlags(),
          root = $(document.documentElement);
        for (var feature of WG.pluginFeatureDefinitions)
          root.toggleClass(
            "WG_feature_" + feature.id + "_off",
            flags[feature.id] === false,
          );
        if (
          typeof ToolAction !== "undefined" &&
          typeof ToolAction.SetHorizontalEnabled === "function"
        )
          ToolAction.SetHorizontalEnabled(flags.horizontalMenu !== false);
        if (flags.chatDrawer === false) {
          typeof WG.setSideChatPanelOpen === "function" &&
            WG.setSideChatPanelOpen(false);
        } else if (typeof WG.initChatDrawer === "function")
          WG.initChatDrawer();
        if (flags.equipmentPicker === false) WG.closeEquipmentPicker();
        if (
          flags.characterPopup === false &&
          typeof Process !== "undefined" &&
          Process.closeItemPopup
        )
          Process.closeItemPopup();
        if (
          flags.mapAutoRoute === false &&
          typeof MAP !== "undefined" &&
          MAP.CancelAutoRoute
        )
          MAP.CancelAutoRoute();
        if (
          typeof Dialog !== "undefined" &&
          Dialog.isShow &&
          Dialog.element
        ) {
          if (flags.floatingPanels === false) {
            Dialog.clearLayerStack && Dialog.clearLayerStack();
            Dialog.clearLayerRequests && Dialog.clearLayerRequests();
            Dialog.deactivateFloatingDialog();
          } else Dialog.activateFloatingDialog();
        }
      },
      appendPluginSettingsSwitch: function (container, options) {
        var row = $("<div>", { class: "WG_plugin_settings_row" }).appendTo(
            container,
          ),
          copy = $("<span>").appendTo(row);
        $("<span>", {
          class: "WG_plugin_settings_name",
          text: options.name,
        }).appendTo(copy);
        options.desc &&
          $("<span>", {
            class: "WG_plugin_settings_desc",
            text: options.desc,
          }).appendTo(copy);
        $("<button>", {
          class:
            "WG_plugin_switch" +
            (options.id == "autoAttack" ? " WG_plugin_auto_toggle" : ""),
          type: "button",
          role: "switch",
          "aria-label": options.name,
          "aria-checked": String(options.enabled),
          "data-plugin-setting-kind": options.kind,
          "data-plugin-setting-id": options.id,
        }).appendTo(row);
      },
      renderPluginSettings: function () {
        var autoList = $(".WG_plugin_settings_auto").empty(),
          featureList = $(".WG_plugin_settings_features").empty(),
          loadoutList = $(".WG_plugin_settings_loadouts").empty(),
          loadoutNames = WG.getQuickLoadoutNames();
        WG.appendPluginSettingsSwitch(autoList, {
          kind: "auto",
          id: "autoAttack",
          name: "自动攻击",
          desc: "自动按冷却释放可用招式。",
          enabled: Boolean(G.auto_preform),
        });
        var firstRoundRow = $("<div>", {
            class: "WG_plugin_settings_row",
          }).appendTo(autoList),
          firstRoundCopy = $("<span>").appendTo(firstRoundRow);
        $("<span>", {
          class: "WG_plugin_settings_name",
          text: "首轮出招顺序",
        }).appendTo(firstRoundCopy);
        $("<span>", {
          class: "WG_plugin_settings_desc",
          text: "设置每场战斗首轮依次尝试的招式。",
        }).appendTo(firstRoundCopy);
        $("<button>", {
          class:
            "WG_plugin_settings_button WG_plugin_settings_auto_first_round",
          type: "button",
          text: "设置",
        }).appendTo(firstRoundRow);
        var skillGroup = $("<div>", {
          class: "WG_plugin_settings_group",
        }).appendTo(autoList);
        $("<div>", {
          class: "WG_plugin_settings_group_title",
          text: "自动出招招式",
        }).appendTo(skillGroup);
        $("<div>", {
          class: "WG_plugin_settings_desc",
          text: "关闭后，自动出招只使用仍开启的绝招。",
        }).appendTo(skillGroup);
        $("<div>", {
          class: "WG_plugin_settings_auto_skills",
        }).appendTo(skillGroup);
        typeof WG.renderAutoPerformSkillSettings === "function" &&
          WG.renderAutoPerformSkillSettings();
        for (var group = 0; group < 3; group++) {
          var loadoutRow = $("<label>", {
              class: "WG_plugin_settings_row WG_plugin_loadout_name_row",
              for: "WG_plugin_loadout_name_" + group,
            }).appendTo(loadoutList);
          $("<span>", {
            class: "WG_plugin_settings_name",
            text: "配装 " + (group + 1),
          }).appendTo(loadoutRow);
          $("<input>", {
            class: "WG_plugin_settings_input WG_plugin_loadout_name",
            id: "WG_plugin_loadout_name_" + group,
            type: "text",
            maxlength: 12,
            value: loadoutNames[group] || "",
            placeholder: String(group + 1),
            "data-equipment-group": String(group),
            "aria-label": "配装 " + (group + 1) + "名称",
          }).appendTo(loadoutRow);
        }
        for (var feature of WG.pluginFeatureDefinitions)
          WG.appendPluginSettingsSwitch(featureList, {
            kind: "feature",
            id: feature.id,
            name: feature.name,
            desc: feature.desc,
            enabled: WG.isPluginFeatureEnabled(feature.id),
          });
      },
      openPluginSettings: function () {
        WG.renderPluginSettings();
        $(".WG_plugin_settings")
          .prop("hidden", false)
          .attr("aria-hidden", "false")
          .find(".WG_plugin_settings_close")
          .trigger("focus");
      },
      closePluginSettings: function () {
        $(".WG_plugin_settings")
          .prop("hidden", true)
          .attr("aria-hidden", "true");
        var focusTarget = $('.right-bar > [command="pluginsettings"]').first();
        focusTarget.trigger("focus");
      },
      resetPluginSettings: function () {
        window.localStorage.removeItem(WG.pluginFeatureFlagsKey);
        WG.resetQuickLoadoutNames();
        WG.applyPluginFeatureFlags();
        WG.renderPluginSettings();
      },
      initPluginSettings: function () {
        ensureSettingsView();
        var pluginTool = $('.right-bar > [command="pluginsettings"]').first();
        if (!pluginTool.length) {
          pluginTool = $(
            '<span command="pluginsettings" class="tool-item" title="插件设置"><svg class="tool-icon WG_plugin_tool_icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 2v6m8-6v6M5 8h14v2a7 7 0 0 1-14 0V8Zm7 9v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span class="tool-text">插件</span></span>',
          ).prependTo(".right-bar");
        }
        pluginTool
          .addClass("WG_plugin_tool")
          .attr({ title: "插件设置", "aria-label": "插件设置" });
        var pluginToolText = pluginTool.children(".tool-text").first();
        if (!pluginToolText.length)
          pluginToolText = $('<span class="tool-text"></span>').appendTo(
            pluginTool,
          );
        pluginToolText.text("插件").removeAttr("hidden aria-hidden");
        if (typeof ToolAction !== "undefined" && ToolAction.tools) {
          ToolAction.tools = null;
          ToolAction.InitTools();
        }
        window.WGOpenPluginSettings = WG.openPluginSettings;
        $(".WG_plugin_settings")
          .off("click.WG_plugin_settings")
          .on("click.WG_plugin_settings", function (event) {
            event.target === this && WG.closePluginSettings();
          })
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_settings_close, .WG_plugin_settings_done",
            WG.closePluginSettings,
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_settings_reset",
            WG.resetPluginSettings,
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_settings_advanced",
            function () {
              WG.closePluginSettings();
              WG.setting();
            },
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_settings_auto_first_round",
            function () {
              WG.openAutoFirstRoundDialog(this);
            },
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_switch",
            function () {
              var toggle = $(this),
                kind = toggle.attr("data-plugin-setting-kind"),
                id = toggle.attr("data-plugin-setting-id"),
                enabled;
              if (kind == "auto") {
                WG.auto_preform_switch();
                enabled = Boolean(G.auto_preform);
              } else if (kind == "autoSkill") {
                enabled = toggle.attr("aria-checked") != "true";
                WG.setAutoPerformSkillEnabled(id, enabled);
              } else {
                enabled = toggle.attr("aria-checked") != "true";
                WG.setPluginFeatureEnabled(id, enabled);
              }
              toggle.attr("aria-checked", String(enabled));
            },
          )
          .on(
            "change.WG_plugin_settings",
            ".WG_plugin_loadout_name",
            function () {
              WG.setQuickLoadoutName(
                $(this).attr("data-equipment-group"),
                $(this).val(),
              );
            },
          );
        $(document)
          .off("keydown.WG_plugin_settings")
          .on("keydown.WG_plugin_settings", function (event) {
            if (
              event.key == "Escape" &&
              !$(".WG_plugin_settings").prop("hidden") &&
              (typeof IsTopWGPopupLayer != "function" ||
                IsTopWGPopupLayer($(".WG_plugin_settings")))
            ) {
              WG.closePluginSettings();
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          });
        WG.applyPluginFeatureFlags();
      },
    });

    return {
      destroy: function () {
        $(document).off("keydown.WG_plugin_settings");
        $(".WG_plugin_settings").off("click.WG_plugin_settings");
        delete window.WGOpenPluginSettings;
      },
    };
  });
})(window);
