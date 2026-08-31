/** Plugin settings feature. Owns feature flags, settings UI behavior and menu entry. */
(function registerPluginSettings(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("plugin-settings", function install(context) {
    const { WG, G, legacy } = context;
    const settingsMarkup = `
      <div class="WG_plugin_settings" hidden aria-hidden="true">
        <section class="WG_plugin_settings_dialog" role="dialog" aria-modal="true" aria-labelledby="WG_plugin_settings_title">
          <header class="WG_plugin_settings_header">
            <span class="WG_plugin_settings_title" id="WG_plugin_settings_title">插件设置</span>
            <button class="WG_plugin_settings_close" type="button" aria-label="关闭插件设置">×</button>
          </header>
          <div class="WG_plugin_settings_body">
            <div class="WG_plugin_settings_column">
              <section class="WG_plugin_settings_section">
                <div class="WG_plugin_settings_heading">自动攻击</div>
                <div class="WG_plugin_settings_auto"></div>
                <div class="WG_plugin_settings_row">
                  <span>
                    <span class="WG_plugin_settings_name">自动出招配置</span>
                    <span class="WG_plugin_settings_desc">按当前装备技能设置每场战斗的串行出招顺序和黑名单。</span>
                  </span>
                  <button class="WG_plugin_settings_button WG_plugin_auto_open" type="button">打开</button>
                </div>
              </section>
              <section class="WG_plugin_settings_section">
                <div class="WG_plugin_settings_heading">配装快捷键</div>
                <div class="WG_plugin_settings_desc WG_plugin_settings_section_desc">自定义左侧配装 1 / 2 / 3 按钮的显示名称。</div>
                <div class="WG_plugin_settings_loadouts"></div>
              </section>
              <section class="WG_plugin_settings_section">
                <div class="WG_plugin_settings_heading">动作前配装</div>
                <div class="WG_plugin_settings_row">
                  <span>
                    <span class="WG_plugin_settings_name">按动作选择配装</span>
                    <span class="WG_plugin_settings_desc">为传送逻辑和动作栏按钮分别指定执行前切换的配装。</span>
                  </span>
                  <button class="WG_plugin_settings_button WG_plugin_loadout_rules_open" type="button">配置</button>
                </div>
              </section>
            </div>
            <div class="WG_plugin_settings_column">
              <section class="WG_plugin_settings_section">
                <div class="WG_plugin_settings_heading">功能开关</div>
                <div class="WG_plugin_settings_features"></div>
              </section>
            </div>
          </div>
          <section class="WG_plugin_settings_subpage WG_plugin_auto_page" hidden aria-hidden="true" aria-labelledby="WG_plugin_auto_title">
            <header class="WG_plugin_settings_subpage_header">
              <button class="WG_plugin_settings_button WG_plugin_auto_back" type="button">‹ 返回</button>
              <span class="WG_plugin_settings_title" id="WG_plugin_auto_title">自动出招配置</span>
            </header>
            <div class="WG_plugin_settings_subpage_body">
              <div class="WG_plugin_auto_config_columns">
                <div class="WG_plugin_auto_config_column">
                  <div class="WG_plugin_settings_group_title">出招顺序</div>
                  <div class="WG_plugin_settings_desc">每场战斗按此顺序逐招执行；完成后恢复冷却优先自动出招。</div>
                  <div class="WG_plugin_auto_order" role="list" aria-label="自动出招顺序"></div>
                </div>
                <div class="WG_plugin_auto_config_column">
                  <div class="WG_plugin_settings_group_title">出招黑名单</div>
                  <div class="WG_plugin_settings_desc">关闭开关即可暂不使用该技能。</div>
                  <div class="WG_plugin_auto_blacklist" aria-label="自动出招技能开关"></div>
                </div>
              </div>
            </div>
            <footer class="WG_plugin_settings_footer">
              <button class="WG_plugin_settings_button WG_plugin_auto_save" type="button">保存出招设置</button>
            </footer>
          </section>
          <section class="WG_plugin_settings_subpage WG_plugin_loadout_rules_page" hidden aria-hidden="true" aria-labelledby="WG_plugin_loadout_rules_title">
            <header class="WG_plugin_settings_subpage_header">
              <button class="WG_plugin_settings_button WG_plugin_loadout_rules_back" type="button">‹ 返回</button>
              <span class="WG_plugin_settings_title" id="WG_plugin_loadout_rules_title">动作前配装</span>
            </header>
            <div class="WG_plugin_settings_subpage_body WG_plugin_loadout_rules_body">
              <section class="WG_plugin_loadout_rule_section">
                <div class="WG_plugin_settings_heading">当前动作栏</div>
                <div class="WG_plugin_settings_desc WG_plugin_settings_section_desc">这里只显示当前动作栏中存在的按钮；为每个按钮选择执行前要切换的配装。</div>
                <div class="WG_plugin_button_loadout_rules"></div>
              </section>
            </div>
            <footer class="WG_plugin_settings_footer">
              <button class="WG_plugin_settings_button WG_plugin_loadout_rules_done" type="button">完成</button>
            </footer>
          </section>
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
          id: "floatingPanels",
          name: "多层悬浮面板",
          desc: "面板可拖动缩放，并保留父级页面。",
        },
        {
          id: "floatingToolbar",
          name: "悬浮工具窗",
          desc: "显示右下角的插件悬浮按钮和工具窗。关闭后可随时在此重新开启。",
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
        if (flags.floatingToolbar === false) {
          typeof WG.setFloatingPanelOpen === "function" &&
            WG.setFloatingPanelOpen(false);
        }
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
        WG.appendPluginSettingsSwitch(autoList, {
          kind: "feature",
          id: "autoAttackTeamMsg",
          name: "队伍频段提示",
          desc: "切换自动攻击时在队伍频段写入开启/关闭提示。关闭后仅同步按钮状态。",
          enabled: WG.isPluginFeatureEnabled("autoAttackTeamMsg"),
        });
        WG.renderNativeAutoPerformConfig();
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
      appendActionLoadoutRule: function (host, options) {
        var row = $("<label>", {
            class: "WG_plugin_loadout_rule",
          }).appendTo(host),
          copy = $("<span>", {
            class: "WG_plugin_loadout_rule_copy",
          }).appendTo(row);
        $("<span>", {
          class: "WG_plugin_settings_name",
          text: options.name,
        }).appendTo(copy);
        $("<code>", {
          class: "WG_plugin_loadout_rule_command",
          text: options.command,
          title: options.command,
        }).appendTo(copy);
        var select = $("<select>", {
          class: "WG_plugin_loadout_rule_select",
          "data-loadout-rule-section": options.section,
          "data-loadout-rule-key": options.key,
          "aria-label": options.name + "执行前配装",
        }).appendTo(row);
        $("<option>", { value: "", text: "不换装" }).appendTo(select);
        var names = WG.getQuickLoadoutNames();
        for (var group = 0; group < 3; group++)
          $("<option>", {
            value: String(group),
            text: names[group]
              ? "配装 " + (group + 1) + " · " + names[group]
              : "配装 " + (group + 1),
          }).appendTo(select);
        select.val(options.group == null ? "" : String(options.group));
      },
      renderActionLoadoutRules: function () {
        var buttonHost = $(".WG_plugin_button_loadout_rules").empty(),
          buttons = WG.rememberActionBarButtons(),
          config = WG.getActionLoadoutConfig();
        for (var button of buttons)
          WG.appendActionLoadoutRule(buttonHost, {
            section: "buttons",
            key: button.command,
            name: button.label,
            command: button.command,
            group: config.buttons[button.command],
          });
        if (!buttons.length)
          $("<div>", {
            class: "WG_plugin_settings_empty",
            text: "当前动作栏没有可配置按钮。请先打开战斗面板或进入包含动作按钮的场景。",
          }).appendTo(buttonHost);
      },
      closePluginSettingsSubpages: function () {
        $(".WG_plugin_settings_subpage")
          .prop("hidden", true)
          .attr("aria-hidden", "true");
        $(".WG_plugin_settings_dialog > .WG_plugin_settings_body").prop(
          "hidden",
          false,
        );
        $(".WG_plugin_settings_dialog > .WG_plugin_settings_footer")
          .last()
          .prop("hidden", false);
      },
      openActionLoadoutRulesPage: function () {
        WG.closePluginSettingsSubpages();
        $(".WG_plugin_settings_dialog > .WG_plugin_settings_body").prop(
          "hidden",
          true,
        );
        $(".WG_plugin_settings_dialog > .WG_plugin_settings_footer")
          .last()
          .prop("hidden", true);
        $(".WG_plugin_loadout_rules_page")
          .prop("hidden", false)
          .attr("aria-hidden", "false");
        WG.renderActionLoadoutRules();
        $(".WG_plugin_loadout_rules_back").trigger("focus");
      },
      openPluginSettings: function () {
        if ($(".WG_plugin_settings_subpage:not([hidden])").length)
          WG.closePluginSettingsSubpages();
        WG.renderPluginSettings();
        $(".WG_plugin_settings")
          .prop("hidden", false)
          .attr("aria-hidden", "false")
          .find(".WG_plugin_settings_close")
          .trigger("focus");
      },
      closePluginSettings: function () {
        WG.closePluginSettingsSubpages();
        $(".WG_plugin_settings")
          .prop("hidden", true)
          .attr("aria-hidden", "true");
        var focusTarget = $('.right-bar > [command="pluginsettings"]').first();
        focusTarget.trigger("focus");
      },
      parsePluginAutoPerformIds: function (value) {
        var source = Array.isArray(value)
          ? value
          : String(value == null ? "" : value).split(/[,，;\s]+/);
        var result = [];
        for (var entry of source) {
          var id = String(entry || "").trim();
          id && !result.includes(id) && result.push(id);
        }
        return result;
      },
      getPluginAutoPerformSkills: function () {
        var skills = Array.isArray(G.skills) ? G.skills.slice() : [];
        if (
          !skills.length &&
          typeof Combat !== "undefined" &&
          Array.isArray(Combat.Skills)
        )
          skills = Combat.Skills.slice();
        var result = [],
          seen = {};
        for (var skill of skills) {
          var id = String((skill && skill.id) || "").trim();
          if (!id || seen[id]) continue;
          seen[id] = true;
          result.push({ id: id, name: (skill && skill.name) || id });
        }
        return result;
      },
      getNativeAutoPerformOrder: function () {
        var value =
          typeof Setting !== "undefined" ? Setting.auto_pfm || "" : "";
        if (!value) value = $("#auto_pfm").val() || "";
        if (value) return WG.parsePluginAutoPerformIds(value);
        var localOrder =
          typeof WG.loadAutoFirstRoundConfig === "function"
            ? WG.loadAutoFirstRoundConfig()
            : [];
        return localOrder.slice();
      },
      getNativeAutoPerformBlacklist: function () {
        var value = $("#un" + "auto_pfm").val();
        if (value == null && typeof legacy !== "undefined" && legacy)
          value =
            typeof legacy.getDisabledPerforms === "function"
              ? legacy.getDisabledPerforms()
              : "";
        return WG.parsePluginAutoPerformIds(value);
      },
      saveNativeAutoPerformSettings: function (order, blacklist) {
        var normalizedOrder = WG.parsePluginAutoPerformIds(order),
          normalizedBlacklist = WG.parsePluginAutoPerformIds(blacklist),
          blacklistValue = normalizedBlacklist.join(","),
          nativeOrder = $("#auto_pfm"),
          nativeBlacklist = $("#un" + "auto_pfm");
        if (typeof WG.saveAutoFirstRoundConfig === "function")
          WG.saveAutoFirstRoundConfig(normalizedOrder);
        if (typeof Setting !== "undefined") Setting.auto_pfm = "";
        typeof WG.Send === "function" && WG.Send("setting auto_pfm none");
        if (nativeOrder.length) nativeOrder.val("");
        $(".dialog-custom>.setting-item[for='auto_pfm']>.switch")
          .removeClass("on")
          .find(".switch-text")
          .text("关");
        if (nativeBlacklist.length)
          nativeBlacklist.val(blacklistValue).trigger("change");
        else if (typeof WG.persistDisabledPerformIds === "function")
          WG.persistDisabledPerformIds(normalizedBlacklist);
        WG.pluginAutoPerformOrder = normalizedOrder;
        WG.pluginAutoPerformBlacklist = normalizedBlacklist;
      },
      renderNativeAutoPerformConfig: function () {
        var orderHost = $(".WG_plugin_auto_order").empty(),
          blacklistHost = $(".WG_plugin_auto_blacklist").empty();
        if (!orderHost.length || !blacklistHost.length) return;
        var skills = WG.getPluginAutoPerformSkills(),
          skillMap = {},
          order = WG.getNativeAutoPerformOrder(),
          blacklist = WG.getNativeAutoPerformBlacklist();
        for (var skill of skills) skillMap[skill.id] = skill;
        order = order.filter(function (id) {
          return skillMap[id];
        });
        for (var skill of skills)
          if (!order.includes(skill.id)) order.push(skill.id);
        WG.pluginAutoPerformOrder = order.slice();
        WG.pluginAutoPerformBlacklist = blacklist.slice();
        for (var index = 0; index < order.length; index++) {
          var id = order[index],
            skill = skillMap[id];
          $("<div>", {
            class: "WG_plugin_auto_order_item",
            draggable: "true",
            role: "listitem",
            "data-skill-id": id,
            "aria-label": "拖动调整" + (skill ? skill.name : id) + "的顺序",
          })
            .append($("<span>", {
              class: "WG_plugin_auto_order_handle",
              text: "⠿",
              "aria-hidden": "true",
              role: "button",
              tabindex: "0",
              title: "拖动调整顺序",
            }))
            .append($("<span>", {
              class: "WG_plugin_auto_order_index",
              text: index + 1,
            }))
            .append($("<span>", {
              class: "WG_plugin_auto_order_name",
              text: skill ? skill.name : id,
            }))
            .appendTo(orderHost);
        }
        for (var skill of skills)
          WG.appendPluginSettingsSwitch(blacklistHost, {
            kind: "nativeAutoSkill",
            id: skill.id,
            name: skill.name,
            enabled: blacklist.indexOf(skill.id) < 0,
          });
        if (!skills.length) {
          $("<div>", {
            class: "WG_plugin_settings_empty",
            text: "尚未取得当前装备技能，请先进入战斗或打开技能面板。",
          }).appendTo(orderHost);
          $("<div>", {
            class: "WG_plugin_settings_empty",
            text: "尚未取得当前装备技能。",
          }).appendTo(blacklistHost);
          typeof WG.Send === "function" && WG.Send("combat");
        }
      },
      syncPluginAutoPerformDragOrder: function () {
        var rows = $(".WG_plugin_auto_order .WG_plugin_auto_order_item"),
          order = [];
        rows.each(function (index) {
          var row = $(this),
            skillId = row.attr("data-skill-id");
          skillId && order.push(skillId);
          row.find(".WG_plugin_auto_order_index").text(index + 1);
        });
        WG.pluginAutoPerformOrder = order;
        return order;
      },
      beginPluginAutoPerformDrag: function (event) {
        var nativeEvent = event.originalEvent || event,
          row = $(event.currentTarget),
          handle = $(event.target).closest(".WG_plugin_auto_order_handle");
        if (
          (nativeEvent.button != null && nativeEvent.button !== 0) ||
          (nativeEvent.pointerType !== "mouse" && !handle.length)
        )
          return;
        WG.endPluginAutoPerformDrag();
        WG.pluginAutoPerformDrag = {
          row: row,
          pointerId: nativeEvent.pointerId,
          startY: nativeEvent.clientY,
          dragging: false,
        };
        row[0].setPointerCapture &&
          row[0].setPointerCapture(nativeEvent.pointerId);
        event.preventDefault();
      },
      movePluginAutoPerformDrag: function (event) {
        var drag = WG.pluginAutoPerformDrag,
          nativeEvent = event.originalEvent || event;
        if (!drag || drag.pointerId !== nativeEvent.pointerId) return;
        if (!drag.dragging) {
          if (Math.abs(nativeEvent.clientY - drag.startY) < 5) return;
          drag.dragging = true;
          drag.row.addClass("is-dragging");
          drag.row.parent().addClass("is-sorting");
        }
        var list = drag.row.parent(),
          rows = list.children(".WG_plugin_auto_order_item").not(drag.row),
          insertBefore = null;
        rows.each(function () {
          var rect = this.getBoundingClientRect();
          if (nativeEvent.clientY < rect.top + rect.height / 2) {
            insertBefore = this;
            return false;
          }
        });
        insertBefore ? drag.row.insertBefore(insertBefore) : list.append(drag.row);
        var listRect = list[0].getBoundingClientRect(),
          edgeSize = Math.min(42, listRect.height * 0.18);
        if (nativeEvent.clientY < listRect.top + edgeSize) list[0].scrollTop -= 14;
        else if (nativeEvent.clientY > listRect.bottom - edgeSize)
          list[0].scrollTop += 14;
        WG.syncPluginAutoPerformDragOrder();
        event.preventDefault();
      },
      endPluginAutoPerformDrag: function (event) {
        var drag = WG.pluginAutoPerformDrag;
        if (!drag) return;
        var nativeEvent = event && (event.originalEvent || event);
        if (
          nativeEvent &&
          nativeEvent.pointerId != null &&
          drag.pointerId !== nativeEvent.pointerId
        )
          return;
        drag.row.removeClass("is-dragging");
        drag.row.parent().removeClass("is-sorting");
        drag.dragging && WG.syncPluginAutoPerformDragOrder();
        WG.pluginAutoPerformDrag = null;
      },
      keyPluginAutoPerformDrag: function (event) {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        var row = $(event.currentTarget).closest(".WG_plugin_auto_order_item"),
          sibling =
            event.key === "ArrowUp"
              ? row.prev(".WG_plugin_auto_order_item")
              : row.next(".WG_plugin_auto_order_item");
        if (!sibling.length) return;
        event.key === "ArrowUp"
          ? row.insertBefore(sibling)
          : row.insertAfter(sibling);
        WG.syncPluginAutoPerformDragOrder();
        row.find(".WG_plugin_auto_order_handle").trigger("focus");
        event.preventDefault();
      },
      openPluginAutoPerformPage: function (trigger) {
        WG.pluginAutoPerformLastFocus = trigger || document.activeElement;
        WG.closePluginSettingsSubpages();
        $(".WG_plugin_settings_dialog > .WG_plugin_settings_body").prop(
          "hidden",
          true,
        );
        $(".WG_plugin_settings_dialog > .WG_plugin_settings_footer")
          .last()
          .prop("hidden", true);
        $(".WG_plugin_auto_page")
          .prop("hidden", false)
          .attr("aria-hidden", "false");
        WG.renderNativeAutoPerformConfig();
        $(".WG_plugin_auto_back").trigger("focus");
      },
      closePluginAutoPerformPage: function () {
        WG.endPluginAutoPerformDrag();
        WG.closePluginSettingsSubpages();
        var focusTarget = WG.pluginAutoPerformLastFocus;
        WG.pluginAutoPerformLastFocus = null;
        focusTarget && $(focusTarget).trigger("focus");
      },
      resetPluginSettings: function () {
        window.localStorage.removeItem(WG.pluginFeatureFlagsKey);
        WG.resetQuickLoadoutNames();
        WG.resetActionLoadoutConfig();
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
            ".WG_plugin_auto_open",
            function () {
              WG.openPluginAutoPerformPage(this);
            },
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_loadout_rules_open",
            WG.openActionLoadoutRulesPage,
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_loadout_rules_back, .WG_plugin_loadout_rules_done",
            WG.closePluginSettingsSubpages,
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_auto_back",
            WG.closePluginAutoPerformPage,
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_auto_save",
            function () {
              WG.saveNativeAutoPerformSettings(
                WG.pluginAutoPerformOrder || [],
                WG.pluginAutoPerformBlacklist || [],
              );
              WG.renderNativeAutoPerformConfig();
            },
          )
          .on(
            "click.WG_plugin_settings",
            ".WG_plugin_auto_blacklist .WG_plugin_switch",
            function () {
              var toggle = $(this),
                id = toggle.attr("data-plugin-setting-id"),
                enabled = toggle.attr("aria-checked") !== "true",
                blacklist = WG.parsePluginAutoPerformIds(
                  WG.pluginAutoPerformBlacklist || [],
                );
              if (enabled) blacklist = blacklist.filter((value) => value !== id);
              else if (!blacklist.includes(id)) blacklist.push(id);
              WG.pluginAutoPerformBlacklist = blacklist;
              toggle.attr("aria-checked", String(enabled));
            },
          )
          .on(
            "pointerdown.WG_plugin_settings",
            ".WG_plugin_auto_order_item",
            WG.beginPluginAutoPerformDrag,
          )
          .on(
            "pointermove.WG_plugin_settings",
            ".WG_plugin_auto_order_item",
            WG.movePluginAutoPerformDrag,
          )
          .on(
            "pointerup.WG_plugin_settings pointercancel.WG_plugin_settings",
            ".WG_plugin_auto_order_item",
            WG.endPluginAutoPerformDrag,
          )
          .on(
            "keydown.WG_plugin_settings",
            ".WG_plugin_auto_order_handle",
            WG.keyPluginAutoPerformDrag,
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
              } else if (kind == "nativeAutoSkill") {
                return;
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
          )
          .on(
            "change.WG_plugin_settings",
            ".WG_plugin_loadout_rule_select",
            function () {
              WG.setActionLoadout(
                $(this).attr("data-loadout-rule-section"),
                $(this).attr("data-loadout-rule-key"),
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
              if ($(".WG_plugin_settings_subpage:not([hidden])").length)
                WG.closePluginSettingsSubpages();
              else WG.closePluginSettings();
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
