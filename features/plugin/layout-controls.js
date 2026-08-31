/** Chat panel, side rails, responsive layout and floating panel controls. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("layout-controls", function install(context) {
    const { WG, G, UI, legacy, messageAppend } = context;

    Object.assign(WG, {
      showhidebtn: function () {
        if ($(".WG_button").css("display") === "none") {
          window.localStorage.setItem("closeBtn", "false");
          $(".WG_button").show();
        } else {
          window.localStorage.setItem("closeBtn", "true");
          $(".WG_button").hide();
        }
      },
      switchReversal: function (element) {
        return element.hasClass("on") ? "关" : "开";
      },
      chatDrawerStorageKey: "WG_chat_drawer_collapsed",
      setChatDrawerCollapsed: function (collapsed, persist) {
        if (!WG.isPluginFeatureEnabled("chatDrawer")) collapsed = false;
        collapsed = Boolean(collapsed);
        var container = $(".container").first(),
          toggle = container.find(".WG_chat_drawer_toggle").first();
        if (!container.length || !toggle.length) return;
        container.toggleClass("WG_chat_drawer_collapsed", collapsed);
        toggle
          .attr("aria-expanded", String(!collapsed))
          .attr("title", collapsed ? "展开聊天栏" : "收起聊天栏")
          .attr("aria-label", collapsed ? "展开聊天栏" : "收起聊天栏")
          .text(collapsed ? "聊天" : "收起");
        container
          .find(".WG_chat_drawer_resizer")
          .attr("aria-hidden", String(collapsed))
          .attr("tabindex", collapsed ? "-1" : "0");
        if (persist)
          window.localStorage.setItem(
            WG.chatDrawerStorageKey,
            collapsed ? "1" : "0",
          );
        if (
          !collapsed &&
          typeof Process != "undefined" &&
          Process.channel &&
          Process.channel.scroll2end
        )
          Process.channel.scroll2end();
      },
      chatDrawerHeightKey: "WG_chat_drawer_height",
      applyChatDrawerHeight: function (height, persist) {
        height = Math.max(12, Math.min(70, Number(height) || 32));
        WG.chatDrawerHeight = height;
        document.documentElement.style.setProperty(
          "--WG-chat-drawer-height",
          height + "vh",
        );
        $(".WG_chat_drawer_resizer").attr("aria-valuenow", Math.round(height));
        if (persist)
          window.localStorage.setItem(WG.chatDrawerHeightKey, String(height));
      },
      restoreChatDrawerHeight: function () {
        var savedHeight = Number(
          window.localStorage.getItem(WG.chatDrawerHeightKey),
        );
        WG.applyChatDrawerHeight(
          Number.isFinite(savedHeight) && savedHeight ? savedHeight : 32,
          false,
        );
      },
      initChatDrawerResizer: function (shell, bottomBar) {
        var resizer = shell.children(".WG_chat_drawer_resizer").first(),
          dragState = null;
        if (!resizer.length)
          resizer = $(
            '<div class="WG_chat_drawer_resizer" role="separator" aria-label="调整聊天区域高度" aria-orientation="horizontal" aria-valuemin="12" aria-valuemax="70" tabindex="0"></div>',
          ).prependTo(shell);
        WG.restoreChatDrawerHeight();
        resizer
          .off(".WG_chat_drawer_resize")
          .on("pointerdown.WG_chat_drawer_resize", function (event) {
            var pointerEvent = event.originalEvent;
            if (pointerEvent.button != null && pointerEvent.button !== 0) return;
            dragState = {
              pointerId: pointerEvent.pointerId,
              handle: this,
            };
            $(this).addClass("WG_dragging");
            $(document.body).addClass("WG_resizing_chat_drawer");
            this.setPointerCapture && this.setPointerCapture(pointerEvent.pointerId);
            event.preventDefault();
            event.stopPropagation();
          })
          .on("pointermove.WG_chat_drawer_resize", function (event) {
            var pointerEvent = event.originalEvent;
            if (!dragState || pointerEvent.pointerId !== dragState.pointerId) return;
            var bottomBarTop = bottomBar[0].getBoundingClientRect().top,
              height =
                ((bottomBarTop - pointerEvent.clientY) * 100) /
                window.innerHeight;
            WG.applyChatDrawerHeight(height, false);
            event.preventDefault();
          })
          .on(
            "pointerup.WG_chat_drawer_resize pointercancel.WG_chat_drawer_resize",
            function (event) {
              var pointerEvent = event.originalEvent;
              if (!dragState || pointerEvent.pointerId !== dragState.pointerId)
                return;
              $(dragState.handle).removeClass("WG_dragging");
              $(document.body).removeClass("WG_resizing_chat_drawer");
              WG.applyChatDrawerHeight(WG.chatDrawerHeight, true);
              dragState = null;
            },
          )
          .on("dblclick.WG_chat_drawer_resize", function (event) {
            WG.applyChatDrawerHeight(32, true);
            event.preventDefault();
          })
          .on("keydown.WG_chat_drawer_resize", function (event) {
            if (event.key != "ArrowUp" && event.key != "ArrowDown") return;
            WG.applyChatDrawerHeight(
              WG.chatDrawerHeight + (event.key == "ArrowUp" ? 2 : -2),
              true,
            );
            event.preventDefault();
          });
      },
      middleSplitRatioKey: "WG_middle_split_ratio",
      applyMiddleSplitRatio: function (ratio, persist) {
        ratio = Math.max(15, Math.min(85, Number(ratio) || 45));
        WG.middleSplitRatio = ratio;
        $(".container").addClass("WG_middle_split_managed");
        document.documentElement.style.setProperty(
          "--WG-room-panel-share",
          String(ratio),
        );
        document.documentElement.style.setProperty(
          "--WG-message-panel-share",
          String(100 - ratio),
        );
        document.documentElement.style.setProperty(
          "--WG-middle-split-position",
          ratio + "%",
        );
        $(".WG_message_boundary_resizer").attr(
          "aria-valuenow",
          Math.round(ratio),
        );
        if (persist)
          window.localStorage.setItem(
            WG.middleSplitRatioKey,
            String(ratio),
          );
      },
      resetMiddleSplitRatio: function (persist) {
        WG.applyMiddleSplitRatio(45, false);
        if (persist) window.localStorage.removeItem(WG.middleSplitRatioKey);
      },
      restoreMiddleSplitRatio: function () {
        window.localStorage.removeItem("WG_message_boundary_offset");
        window.localStorage.removeItem("WG_room_panel_height");
        var savedRatio = window.localStorage.getItem(WG.middleSplitRatioKey);
        savedRatio == null
          ? WG.resetMiddleSplitRatio(false)
          : WG.applyMiddleSplitRatio(Number(savedRatio), false);
      },
      initRoomInfoBoundaryResizer: function (
        controls,
        roomPanel,
        messagePanel,
      ) {
        var resizer = controls
            .children(".WG_message_boundary_resizer")
            .first(),
          dragState = null;
        if (!resizer.length)
          resizer = $(
            '<div class="WG_message_boundary_resizer" role="separator" aria-label="调整人物列表与信息栏边界" aria-orientation="horizontal" aria-valuemin="15" aria-valuemax="85" tabindex="0"></div>',
          ).appendTo(controls);
        roomPanel.css({ flex: "", "max-height": "", "overflow-y": "" });
        messagePanel.css("margin-bottom", "");
        WG.restoreMiddleSplitRatio();
        resizer
          .off(".WG_message_boundary_resize")
          .on("pointerdown.WG_message_boundary_resize", function (event) {
            var pointerEvent = event.originalEvent;
            if (pointerEvent.button != null && pointerEvent.button !== 0) return;
            var roomRect = roomPanel[0].getBoundingClientRect(),
              messageRect = messagePanel[0].getBoundingClientRect();
            if (messageRect.bottom <= roomRect.top) return;
            dragState = {
              pointerId: pointerEvent.pointerId,
              splitTop: roomRect.top,
              splitHeight: messageRect.bottom - roomRect.top,
              handle: this,
            };
            $(this).addClass("WG_dragging");
            $(document.body).addClass("WG_resizing_message_boundary");
            this.setPointerCapture && this.setPointerCapture(pointerEvent.pointerId);
            event.preventDefault();
            event.stopPropagation();
          })
          .on("pointermove.WG_message_boundary_resize", function (event) {
            var pointerEvent = event.originalEvent;
            if (!dragState || pointerEvent.pointerId !== dragState.pointerId) return;
            WG.applyMiddleSplitRatio(
              ((pointerEvent.clientY - dragState.splitTop) * 100) /
                dragState.splitHeight,
              false,
            );
            event.preventDefault();
          })
          .on(
            "pointerup.WG_message_boundary_resize pointercancel.WG_message_boundary_resize",
            function (event) {
              var pointerEvent = event.originalEvent;
              if (!dragState || pointerEvent.pointerId !== dragState.pointerId)
                return;
              $(dragState.handle).removeClass("WG_dragging");
              $(document.body).removeClass("WG_resizing_message_boundary");
              WG.applyMiddleSplitRatio(WG.middleSplitRatio, true);
              dragState = null;
            },
          )
          .on("dblclick.WG_message_boundary_resize", function (event) {
            WG.resetMiddleSplitRatio(true);
            event.preventDefault();
          })
          .on("keydown.WG_message_boundary_resize", function (event) {
            if (event.key != "ArrowUp" && event.key != "ArrowDown") return;
            WG.applyMiddleSplitRatio(
              WG.middleSplitRatio + (event.key == "ArrowDown" ? 2 : -2),
              true,
            );
            event.preventDefault();
          });
      },
      initChatDrawer: function () {
        var container = $(".container").first(),
          bottomBar = container.children(".bottom-bar").first(),
          shell = bottomBar.children(".WG_chat_drawer_shell").first(),
          middleSplit = container.children(".WG_middle_split").first(),
          channel = shell.children(".channel").first(),
          messagePanel = middleSplit.children(".content-message").first(),
          roomPanel = middleSplit.children(".content-room").first();
        if (!messagePanel.length)
          messagePanel = container.children(".content-message").first();
        if (!roomPanel.length)
          roomPanel = container.children(".content-room").first();
        if (!channel.length) channel = container.children(".channel").first();
        if (!channel.length) channel = middleSplit.children(".channel").first();
        if (
          !container.length ||
          !bottomBar.length ||
          !channel.length ||
          !messagePanel.length ||
          !roomPanel.length
        )
          return;
        if (!shell.length)
          shell = $('<div class="WG_chat_drawer_shell"></div>').prependTo(
            bottomBar,
          );
        if (!channel.parent().is(shell)) channel.appendTo(shell);
        shell.attr("aria-hidden", "true").hide();
        channel.attr("id", "WG_chat_drawer_content");
        if (!middleSplit.length)
          middleSplit = $('<div class="WG_middle_split"></div>').insertBefore(
            roomPanel,
          );
        if (!roomPanel.parent().is(middleSplit)) roomPanel.appendTo(middleSplit);
        if (!messagePanel.parent().is(middleSplit))
          messagePanel.appendTo(middleSplit);
        shell.children(".WG_chat_drawer_bar").remove();
        var controls = middleSplit
          .children(".WG_info_panel_controls")
          .first();
        if (!controls.length)
          controls = messagePanel
            .children(".WG_info_panel_controls")
            .first();
        if (!controls.length)
          controls = $('<div class="WG_info_panel_controls"></div>').appendTo(
            middleSplit,
          );
        else if (!controls.parent().is(middleSplit))
          controls.appendTo(middleSplit);
        controls.children(".WG_chat_drawer_toggle").remove();
        WG.initRoomInfoBoundaryResizer(controls, roomPanel, messagePanel);
        shell.children(".WG_chat_drawer_resizer").remove();
        container.addClass("WG_chat_drawer_collapsed");
      },
      isSideChatPanelOpen: function () {
        return $(".WG_side_rail_right").hasClass("WG_side_chat_open");
      },
      renderSideChatFilters: function () {
        var filters = $(".WG_side_chat_filters").first(),
          definitions =
            typeof Dialog != "undefined" &&
            Dialog.channel &&
            Dialog.channel.footer
              ? Dialog.channel.footer
              : [
                  ["全部", ""],
                  ["世界", "chat"],
                  ["队伍", "tm"],
                  ["门派", "fam"],
                  ["全区", "es"],
                  ["帮派", "pty"],
                  ["系统", "sys"],
                ],
          selected =
            typeof Dialog != "undefined" && Dialog.channel
              ? Dialog.channel.select_item || ""
              : "";
        if (!filters.length) return;
        filters.empty();
        for (var index = 0; index < definitions.length; index++) {
          var item = definitions[index];
          $("<button>")
            .attr({
              type: "button",
              class:
                "WG_side_chat_filter" +
                (item[1] == selected ? " is-selected" : ""),
              "data-channel-filter": item[1],
              "aria-pressed": String(item[1] == selected),
            })
            .text(item[0])
            .appendTo(filters);
        }
      },
      ensureSideChatComposer: function () {
        var host = $(".WG_side_chat_panel_host").first(),
          composer = host.children(".WG_side_chat_composer").first();
        if (!host.length) return $();
        if (!composer.length)
          composer = $(
            '<div class="WG_side_chat_composer" data-channel="chat"><div class="WG_side_chat_channels" role="toolbar" aria-label="发送频道"><button type="button" data-chat-channel="chat" class="is-selected">世界</button><button type="button" data-chat-channel="tm">队伍</button><button type="button" data-chat-channel="fam">门派</button><button type="button" data-chat-channel="say">房间</button><button type="button" data-chat-channel="es">全区</button><button type="button" data-chat-channel="pty">帮派</button></div><div class="WG_side_chat_input_row"><input class="WG_side_chat_input" type="text" maxlength="100" autocomplete="off" aria-label="聊天内容"><button class="WG_side_chat_send" type="button">发送</button></div></div>',
          ).appendTo(host);
        composer
          .off("click.WG_side_chat_composer keydown.WG_side_chat_composer")
          .on(
            "click.WG_side_chat_composer",
            "[data-chat-channel]",
            function () {
              var button = $(this),
                channel = button.attr("data-chat-channel") || "chat";
              composer.attr("data-channel", channel);
              button
                .addClass("is-selected")
                .attr("aria-pressed", "true")
                .siblings()
                .removeClass("is-selected")
                .attr("aria-pressed", "false");
              composer.find(".WG_side_chat_input").focus();
            },
          )
          .on("click.WG_side_chat_composer", ".WG_side_chat_send", function () {
            WG.sendSideChatMessage(composer);
          })
          .on("keydown.WG_side_chat_composer", ".WG_side_chat_input", function (event) {
            if (event.key !== "Enter" || event.isComposing) return;
            event.preventDefault();
            WG.sendSideChatMessage(composer);
          });
        composer
          .find("[data-chat-channel]")
          .attr("aria-pressed", "false")
          .filter(".is-selected")
          .attr("aria-pressed", "true");
        return composer;
      },
      sendSideChatMessage: function (composer) {
        composer = $(composer).first();
        var input = composer.find(".WG_side_chat_input").first(),
          message = String(input.val() || "").trim(),
          channel = composer.attr("data-channel") || "chat";
        if (!message) return false;
        if (message.length > 100) {
          typeof ReceiveMessage == "function" &&
            ReceiveMessage("<hir>你输入的内容太多了。</hir>");
          return false;
        }
        if (typeof SendCommand != "function") return false;
        input.val("");
        SendCommand(channel + " " + message);
        input.focus();
        return true;
      },
      restoreSideChatHistory: function () {
        if (
          typeof Process == "undefined" ||
          !Process.ChannelElement ||
          !Process.ChannelElement.length
        )
          return;
        var historyOrigin = $(".WG_chat_history_origin").first();
        if (
          !historyOrigin.length &&
          !Process.ChannelElement.parent().is(".WG_side_chat_history_host")
        )
          return;
        if (typeof Dialog != "undefined" && Dialog.channel)
          Dialog.channel.footerChanged("");
        Process.ChannelElement.removeClass("channel-dialog");
        if (historyOrigin.length && historyOrigin.parent().length)
          Process.ChannelElement.insertAfter(historyOrigin);
        else {
          var shell = $(
            ".container > .bottom-bar > .WG_chat_drawer_shell",
          ).first();
          if (shell.length) Process.ChannelElement.appendTo(shell);
          else Process.ChannelElement.insertBefore(".content-message");
        }
        Process.channel &&
          Process.channel.scroll2end &&
          Process.channel.scroll2end();
      },
      setSideChatPanelOpen: function (open) {
        var rail = $(".WG_side_rail_right").first(),
          actions = rail.children(".WG_side_dashboard_actions").first(),
          view = rail.children(".WG_side_chat_view").first(),
          historyHost = view.children(".WG_side_chat_history_host").first(),
          historyOrigin = $(".WG_chat_history_origin").first(),
          channel =
            typeof Process != "undefined" && Process.ChannelElement
              ? Process.ChannelElement
              : $(),
          composer = WG.ensureSideChatComposer(),
          chatTool = $(".container > .bottom-bar [command='showchat']").first(),
          open = Boolean(open);
        if (
          open &&
          (!WG.isPluginFeatureEnabled("chatDrawer") ||
            !rail.length ||
            !view.length ||
            !historyHost.length ||
            !composer.length)
        )
          return false;
        if (!rail.length || !view.length) return false;
        if (open) {
          WG.renderSideChatFilters();
          if (channel.length) {
            if (!historyOrigin.length) {
              historyOrigin = $(
                '<span class="WG_chat_history_origin" hidden></span>',
              );
              historyOrigin.insertBefore(channel);
            }
            channel.addClass("channel-dialog").appendTo(historyHost);
          }
          rail.addClass("WG_side_chat_open").attr("aria-label", "聊天面板");
          actions.attr("aria-hidden", "true").hide();
          view.prop("hidden", false).attr("aria-hidden", "false");
          chatTool
            .attr({
              "aria-controls": "WG_side_chat_view",
              "aria-expanded": "true",
            })
            .addClass("WG_chat_tool_active");
          composer.find(".WG_side_chat_input").val("").focus();
        } else {
          WG.restoreSideChatHistory();
          rail
            .removeClass("WG_side_chat_open")
            .attr("aria-label", "右侧信息栏");
          actions.attr("aria-hidden", "false").show();
          view.prop("hidden", true).attr("aria-hidden", "true");
          chatTool
            .attr({
              "aria-controls": "WG_side_chat_view",
              "aria-expanded": "false",
            })
            .removeClass("WG_chat_tool_active");
        }
        channel.length &&
          Process.channel &&
          Process.channel.scroll2end();
        window.isShowChat = open;
        return true;
      },
      toggleSideChatPanel: function () {
        return WG.setSideChatPanelOpen(!WG.isSideChatPanelOpen());
      },
      initSideChatPanel: function () {
        $(".chat-panel")
          .addClass("WG_legacy_chat_panel")
          .attr("aria-hidden", "true");
        if (!WG.sideChatEntryCaptureHandler) {
          WG.sideChatEntryCaptureHandler = function (event) {
            var target = event.target.closest &&
              event.target.closest(
                "[command='showchat'], [cmd='#menu showchat']",
              );
            if (!target) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!$('.WG_side_chat_view').length)
              WG.initSideChatPanel();
            WG.toggleSideChatPanel();
          };
          document.addEventListener(
            "click",
            WG.sideChatEntryCaptureHandler,
            true,
          );
        }
        window.WGToggleSideChatPanel = WG.toggleSideChatPanel;
        window.WGOpenSideChatPanel = function () {
          if (WG.isSideChatPanelOpen()) return true;
          if (!$('.WG_side_chat_view').length) WG.initSideChatPanel();
          return WG.setSideChatPanelOpen(true);
        };
        window.WGCloseSideChatPanel = function () {
          return WG.setSideChatPanelOpen(false);
        };
        window.WGIsSideChatPanelOpen = WG.isSideChatPanelOpen;
        var rail = $(".WG_side_rail_right").first(),
          actions = rail.children(".WG_side_dashboard_actions").first(),
          view = rail.children(".WG_side_chat_view").first(),
          wasSideChatOpen = rail.hasClass("WG_side_chat_open"),
          wasSideChatInitialized = WG.sideChatPanelInitialized === true,
          sideChatViewWasCreated = false;
        if (!rail.length) return;
        if (!actions.length)
          actions = $('<div class="WG_side_dashboard_actions"></div>').prependTo(
            rail,
          );
        actions.empty().attr("aria-hidden", "false").show();
        rail.children(".WG_action_group").remove();
        if (!view.length) {
          view = $(
            '<section class="WG_side_chat_view" id="WG_side_chat_view" hidden aria-hidden="true" aria-label="聊天面板"><header class="WG_side_chat_header"><span class="WG_side_chat_title">聊天</span><button class="WG_side_chat_close" type="button" aria-label="关闭右侧聊天">关闭</button></header><div class="WG_side_chat_filters" role="toolbar" aria-label="筛选聊天记录"></div><div class="WG_side_chat_history_host"></div><div class="WG_side_chat_panel_host"></div></section>',
          ).appendTo(rail);
          sideChatViewWasCreated = true;
        }
        rail
          .off("click.WG_side_chat")
          .on("click.WG_side_chat", ".WG_side_chat_close", function () {
            WG.setSideChatPanelOpen(false);
          })
          .on("click.WG_side_chat", ".WG_side_chat_filter", function () {
            if (typeof Dialog == "undefined" || !Dialog.channel) return;
            Dialog.channel.footerChanged($(this).attr("data-channel-filter"));
            WG.renderSideChatFilters();
          });
        var shouldOpenSideChat = sideChatViewWasCreated || wasSideChatOpen;
        WG.setSideChatPanelOpen(
          shouldOpenSideChat || !wasSideChatInitialized,
        );
        WG.sideChatPanelInitialized = true;
      },
      initSideDashboard: function () {
        WG.loadEquipmentSlotCache();
        WG.applyQuickLoadoutNames();
        WG.dashboardEquipmentSignature = null;
        WG.initSideChatPanel();
        $(".WG_side_rail_right").off(
          "click.WG_side_dashboard contextmenu.WG_auto_first_round",
        );
        $(".WG_equipment_list")
          .off("click.WG_equipment_picker keydown.WG_equipment_picker")
          .on(
            "click.WG_equipment_picker keydown.WG_equipment_picker",
            ".WG_equipment_item",
            function (event) {
              if (
                event.type == "keydown" &&
                event.key != "Enter" &&
                event.key != " "
              )
                return;
              event.preventDefault();
              WG.openEquipmentPicker(
                $(this).attr("data-slot-index"),
                this,
              );
            },
          );
        $(".WG_quick_loadouts")
          .off("click.WG_quick_loadout")
          .on("click.WG_quick_loadout", ".WG_quick_loadout", function () {
            var equipmentGroup = Number($(this).attr("data-equipment-group"));
            if (equipmentGroup >= 0 && equipmentGroup < 3)
              WG.Send("eqgroup " + equipmentGroup);
          });
        $(".WG_equipment_picker")
          .off("click.WG_equipment_picker")
          .on("click.WG_equipment_picker", function (event) {
            event.target === this && WG.closeEquipmentPicker();
          })
          .on(
            "click.WG_equipment_picker",
            ".WG_equipment_picker_close",
            WG.closeEquipmentPicker,
          )
          .on(
            "click.WG_equipment_picker",
            ".WG_equipment_picker_choice",
            function () {
              WG.equipFromPicker($(this).attr("data-item-id"));
            },
          );
        $(".WG_auto_first_round")
          .off(
            "click.WG_auto_first_round pointerdown.WG_auto_first_round_drag pointermove.WG_auto_first_round_drag pointerup.WG_auto_first_round_drag pointercancel.WG_auto_first_round_drag keydown.WG_auto_first_round_drag",
          )
          .on("click.WG_auto_first_round", function (event) {
            event.target === this && WG.closeAutoFirstRoundDialog();
          })
          .on(
            "click.WG_auto_first_round",
            ".WG_auto_first_round_close",
            WG.closeAutoFirstRoundDialog,
          )
          .on(
            "click.WG_auto_first_round",
            "[data-first-round-command]",
            function () {
              WG.changeAutoFirstRoundDraft(
                $(this).attr("data-first-round-command"),
                $(this).attr("data-skill-id"),
              );
            },
          )
          .on(
            "click.WG_auto_first_round",
            ".WG_auto_first_round_clear",
            function () {
              WG.autoFirstRoundDraft = [];
              WG.renderAutoFirstRoundDialog();
            },
          )
          .on(
            "click.WG_auto_first_round",
            ".WG_auto_first_round_save",
            function () {
              WG.saveAutoFirstRoundConfig(WG.autoFirstRoundDraft || []);
              messageAppend("<hio>自动攻击</hio>首轮出招顺序已保存");
              WG.closeAutoFirstRoundDialog();
            },
          )
          .on(
            "pointerdown.WG_auto_first_round_drag",
            ".WG_auto_first_round_row",
            WG.beginAutoFirstRoundDrag,
          )
          .on(
            "pointermove.WG_auto_first_round_drag",
            ".WG_auto_first_round_row",
            WG.moveAutoFirstRoundDrag,
          )
          .on(
            "pointerup.WG_auto_first_round_drag pointercancel.WG_auto_first_round_drag",
            ".WG_auto_first_round_row",
            WG.endAutoFirstRoundDrag,
          )
          .on(
            "keydown.WG_auto_first_round_drag",
            ".WG_auto_first_round_drag_handle",
            WG.keyAutoFirstRoundDrag,
          );
        $(document)
          .off("keydown.WG_equipment_picker keydown.WG_auto_first_round")
          .on("keydown.WG_equipment_picker", function (event) {
            if (
              event.key == "Escape" &&
              !$(".WG_equipment_picker").prop("hidden") &&
              (typeof IsTopWGPopupLayer != "function" ||
                IsTopWGPopupLayer($(".WG_equipment_picker")))
            ) {
              WG.closeEquipmentPicker();
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          })
          .on("keydown.WG_auto_first_round", function (event) {
            if (
              event.key == "Escape" &&
              !$(".WG_auto_first_round").prop("hidden") &&
              (typeof IsTopWGPopupLayer != "function" ||
                IsTopWGPopupLayer($(".WG_auto_first_round")))
            ) {
              WG.closeAutoFirstRoundDialog();
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          });
        $(window)
          .off("resize.WG_equipment_picker_position")
          .on(
            "resize.WG_equipment_picker_position",
            WG.scheduleEquipmentPickerPosition,
          );
        if (WG.equipmentPickerHook == null)
          WG.equipmentPickerHook = WG.add_hook(
            ["dialog", "actions"],
            WG.handleEquipmentPickerEvent,
          );
        WG.updateSideDashboard();
      },
      sideRailSizeKey: "WG_side_rail_widths",
      applySideRailWidths: function (leftWidth, rightWidth, persist) {
        leftWidth = Math.max(8, Math.min(30, Number(leftWidth) || 15));
        rightWidth = Math.max(8, Math.min(30, Number(rightWidth) || 15));
        WG.sideRailWidths = { left: leftWidth, right: rightWidth };
        document.documentElement.style.setProperty(
          "--WG-left-rail-width",
          leftWidth + "vw",
        );
        document.documentElement.style.setProperty(
          "--WG-right-rail-width",
          rightWidth + "vw",
        );
        !$(".WG_equipment_picker").prop("hidden") &&
          WG.scheduleEquipmentPickerPosition();
        persist &&
          window.localStorage.setItem(
            WG.sideRailSizeKey,
            JSON.stringify(WG.sideRailWidths),
          );
      },
      restoreSideRailWidths: function () {
        var savedWidths = window.localStorage.getItem(WG.sideRailSizeKey);
        if (savedWidths) {
          try {
            savedWidths = JSON.parse(savedWidths);
            if (
              Number.isFinite(Number(savedWidths.left)) &&
              Number.isFinite(Number(savedWidths.right))
            ) {
              WG.applySideRailWidths(
                savedWidths.left,
                savedWidths.right,
                false,
              );
              return;
            }
          } catch (error) {
            window.localStorage.removeItem(WG.sideRailSizeKey);
          }
        }
        WG.applySideRailWidths(15, 15, false);
      },
      initSideRailResizers: function () {
        var handles = $(".WG_rail_resizer"),
          dragState = null;
        if (!handles.length) return;
        WG.restoreSideRailWidths();
        handles
          .off(".WG_rail_resize")
          .on("pointerdown.WG_rail_resize", function (event) {
            var pointerEvent = event.originalEvent;
            if (pointerEvent.button != null && pointerEvent.button !== 0) return;
            dragState = {
              side: $(this).attr("data-side"),
              pointerId: pointerEvent.pointerId,
              handle: this,
            };
            $(this).addClass("WG_dragging");
            $(document.body).addClass("WG_resizing_rails");
            this.setPointerCapture && this.setPointerCapture(pointerEvent.pointerId);
            event.preventDefault();
          })
          .on("pointermove.WG_rail_resize", function (event) {
            var pointerEvent = event.originalEvent;
            if (!dragState || pointerEvent.pointerId !== dragState.pointerId) return;
            var leftWidth = WG.sideRailWidths.left,
              rightWidth = WG.sideRailWidths.right;
            dragState.side == "left"
              ? (leftWidth = (pointerEvent.clientX * 100) / window.innerWidth)
              : (rightWidth =
                  ((window.innerWidth - pointerEvent.clientX) * 100) /
                  window.innerWidth);
            WG.applySideRailWidths(leftWidth, rightWidth, false);
            event.preventDefault();
          })
          .on(
            "pointerup.WG_rail_resize pointercancel.WG_rail_resize",
            function (event) {
              var pointerEvent = event.originalEvent;
              if (!dragState || pointerEvent.pointerId !== dragState.pointerId)
                return;
              $(dragState.handle).removeClass("WG_dragging");
              $(document.body).removeClass("WG_resizing_rails");
              WG.applySideRailWidths(
                WG.sideRailWidths.left,
                WG.sideRailWidths.right,
                true,
              );
              dragState = null;
            },
          )
          .on("dblclick.WG_rail_resize", function () {
            WG.applySideRailWidths(15, 15, true);
          })
          .on("keydown.WG_rail_resize", function (event) {
            if (event.key != "ArrowLeft" && event.key != "ArrowRight") return;
            var direction = event.key == "ArrowRight" ? 1 : -1,
              leftWidth = WG.sideRailWidths.left,
              rightWidth = WG.sideRailWidths.right;
            $(this).attr("data-side") == "left"
              ? (leftWidth += direction)
              : (rightWidth -= direction);
            WG.applySideRailWidths(leftWidth, rightWidth, true);
            event.preventDefault();
          });
      },
      ensureNativeControlsVisible: function () {
        $(".bottom-bar > .tool-item")
          .not(".state-tool")
          .css({ visibility: "visible", opacity: 1 });
        if (typeof ToolAction !== "undefined") {
          ToolAction.InitTools();
          if (!ToolAction.HasUserToggled) ToolAction.SetToolsOpen(false);
        } else {
          $(".right-bar > .tool-item").css({ display: "none", opacity: 0 });
          $(".right-bar").removeClass("WG_horizontal_menu_open");
          $(".bottom-bar > .br-tool")
            .addClass("hide-tool")
            .attr("aria-expanded", "false")
            .attr("title", "展开菜单");
        }
      },
      setFloatingPanelOpen: function (isOpen) {
        window.localStorage.setItem("closeBorad", String(!isOpen));
        $(".WG_floating_panel").css("display", isOpen ? "flex" : "none");
        $(".WG_floating_toggle")
          .attr("aria-expanded", String(isOpen))
          .text(isOpen ? "收起插件" : "打开插件");
        isOpen && WG.positionFloatingPanel();
      },
      showhideborad: function (event) {
        if (WG.suppressFloatingToggleClick) {
          event && event.preventDefault();
          return;
        }
        WG.setFloatingPanelOpen(!$(".WG_floating_panel").is(":visible"));
      },
      floatingTogglePositionKey: "WG_floating_toggle_position",
      clampFloatingTogglePosition: function (left, top, button) {
        var margin = 8,
          width = button.outerWidth() || 0,
          height = button.outerHeight() || 0;
        return {
          left: Math.max(
            margin,
            Math.min(left, window.innerWidth - width - margin),
          ),
          top: Math.max(
            margin,
            Math.min(top, window.innerHeight - height - margin),
          ),
        };
      },
      applyFloatingTogglePosition: function (left, top, persist) {
        var button = $(".WG_floating_toggle");
        if (!button.length) return;
        var position = WG.clampFloatingTogglePosition(left, top, button);
        button.css({
          left: position.left + "px",
          top: position.top + "px",
          right: "auto",
          bottom: "auto",
        });
        persist &&
          window.localStorage.setItem(
            WG.floatingTogglePositionKey,
            JSON.stringify(position),
          );
        $(".WG_floating_panel").is(":visible") && WG.positionFloatingPanel();
      },
      restoreFloatingTogglePosition: function () {
        var savedPosition = window.localStorage.getItem(
          WG.floatingTogglePositionKey,
        );
        if (!savedPosition) return;
        try {
          savedPosition = JSON.parse(savedPosition);
          Number.isFinite(savedPosition.left) &&
            Number.isFinite(savedPosition.top) &&
            WG.applyFloatingTogglePosition(
              savedPosition.left,
              savedPosition.top,
              false,
            );
        } catch (error) {
          window.localStorage.removeItem(WG.floatingTogglePositionKey);
        }
      },
      positionFloatingPanel: function () {
        var button = $(".WG_floating_toggle")[0],
          panel = $(".WG_floating_panel")[0];
        if (!button || !panel) return;
        var margin = 8,
          gap = 10,
          buttonRect = button.getBoundingClientRect(),
          panelWidth = panel.offsetWidth,
          panelHeight = panel.offsetHeight,
          left = buttonRect.right - panelWidth,
          top = buttonRect.top - panelHeight - gap;
        top < margin && (top = buttonRect.bottom + gap);
        left = Math.max(
          margin,
          Math.min(left, window.innerWidth - panelWidth - margin),
        );
        top = Math.max(
          margin,
          Math.min(top, window.innerHeight - panelHeight - margin),
        );
        $(panel).css({
          left: left + "px",
          top: top + "px",
          right: "auto",
          bottom: "auto",
        });
      },
      initFloatingToggleDrag: function () {
        var button = $(".WG_floating_toggle"),
          dragState = null;
        if (!button.length) return;
        WG.restoreFloatingTogglePosition();
        button
          .off(".WG_floating_drag")
          .on("pointerdown.WG_floating_drag", function (event) {
            var pointerEvent = event.originalEvent;
            if (pointerEvent.button != null && pointerEvent.button !== 0) return;
            var rect = this.getBoundingClientRect();
            dragState = {
              pointerId: pointerEvent.pointerId,
              startX: pointerEvent.clientX,
              startY: pointerEvent.clientY,
              startLeft: rect.left,
              startTop: rect.top,
              dragged: false,
            };
            this.setPointerCapture && this.setPointerCapture(pointerEvent.pointerId);
          })
          .on("pointermove.WG_floating_drag", function (event) {
            var pointerEvent = event.originalEvent;
            if (!dragState || pointerEvent.pointerId !== dragState.pointerId) return;
            var deltaX = pointerEvent.clientX - dragState.startX,
              deltaY = pointerEvent.clientY - dragState.startY;
            if (!dragState.dragged && Math.hypot(deltaX, deltaY) < 5) return;
            dragState.dragged = true;
            button.addClass("WG_dragging");
            event.preventDefault();
            WG.applyFloatingTogglePosition(
              dragState.startLeft + deltaX,
              dragState.startTop + deltaY,
              false,
            );
          })
          .on(
            "pointerup.WG_floating_drag pointercancel.WG_floating_drag",
            function (event) {
              var pointerEvent = event.originalEvent;
              if (!dragState || pointerEvent.pointerId !== dragState.pointerId)
                return;
              button.removeClass("WG_dragging");
              if (dragState.dragged) {
                var rect = this.getBoundingClientRect();
                WG.applyFloatingTogglePosition(rect.left, rect.top, true);
                WG.suppressFloatingToggleClick = true;
                setTimeout(() => {
                  WG.suppressFloatingToggleClick = false;
                }, 0);
              }
              dragState = null;
            },
          );
        $(window)
          .off("resize.WG_floating_drag")
          .on("resize.WG_floating_drag", function () {
            var rect = button[0].getBoundingClientRect();
            WG.applyFloatingTogglePosition(rect.left, rect.top, true);
          });
      },
    });
  });
})(window);
