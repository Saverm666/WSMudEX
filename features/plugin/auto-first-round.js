/** First-round combat ordering, dialog behavior and per-combat scheduling. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("auto-first-round", function install(context) {
    const { WG, G, UI, legacy, messageAppend } = context;

    Object.assign(WG, {
      autoFirstRoundVersion: 1,
      getAutoFirstRoundStorageKey: function () {
        return (
          (legacy.getRoleId() || G.id || legacy.getRoleName() || "anonymous") +
          "_WG_auto_first_round_v1"
        );
      },
      normalizeAutoFirstRoundOrder: function (order) {
        var result = [];
        if (!Array.isArray(order)) return result;
        for (var value of order) {
          var id = String(value || "").trim();
          id && !result.includes(id) && result.push(id);
        }
        return result;
      },
      loadAutoFirstRoundConfig: function () {
        var cacheKey = WG.getAutoFirstRoundStorageKey();
        if (WG.autoFirstRoundLoadedKey === cacheKey)
          return WG.autoFirstRoundOrder || [];
        WG.autoFirstRoundLoadedKey = cacheKey;
        var cached = GM_getValue(cacheKey, null);
        WG.autoFirstRoundOrder = WG.normalizeAutoFirstRoundOrder(
          cached && cached.version === WG.autoFirstRoundVersion
            ? cached.order
            : [],
        );
        return WG.autoFirstRoundOrder;
      },
      saveAutoFirstRoundConfig: function (order) {
        WG.autoFirstRoundOrder = WG.normalizeAutoFirstRoundOrder(order);
        GM_setValue(WG.getAutoFirstRoundStorageKey(), {
          version: WG.autoFirstRoundVersion,
          order: WG.autoFirstRoundOrder.slice(),
        });
      },
      getAutoFirstRoundSkills: function () {
        var skills = Array.isArray(G.skills) ? G.skills : [];
        if (!skills.length && legacy.getCustomSkillList())
          try {
            var savedSkills = JSON.parse(legacy.getCustomSkillList());
            Array.isArray(savedSkills) && (skills = savedSkills);
          } catch (error) {}
        var blocked = String(legacy.getDisabledPerforms() || "")
          .split(",")
          .map(function (id) {
            return id.trim();
          })
          .filter(Boolean);
        for (var blockedId of legacy.getBlockedPerforms() || [])
          blockedId && !blocked.includes(blockedId) && blocked.push(blockedId);
        blocked.push("force.tuoli");
        var result = [],
          known = {};
        for (var skill of skills || []) {
          var id = String((skill && skill.id) || "").trim();
          if (!id || known[id] || blocked.includes(id)) continue;
          known[id] = true;
          result.push({
            id: id,
            name: skill.name || id,
          });
        }
        return result;
      },
      renderAutoFirstRoundDialog: function () {
        var popup = $(".WG_auto_first_round");
        if (!popup.length || popup.prop("hidden")) return;
        var skills = WG.getAutoFirstRoundSkills(),
          skillMap = {},
          selected = popup.find(".WG_auto_first_round_selected").empty(),
          available = popup.find(".WG_auto_first_round_available").empty(),
          order = WG.autoFirstRoundDraft || [];
        for (var skill of skills) skillMap[skill.id] = skill;
        order.forEach(function (id, index) {
          var skill = skillMap[id],
            row = $("<div>", {
              class: "WG_auto_first_round_row",
              "data-skill-id": id,
              role: "listitem",
              "aria-posinset": index + 1,
              "aria-setsize": order.length,
            }).appendTo(selected);
          $("<span>", {
            class: "WG_auto_first_round_drag_handle",
            role: "button",
            tabindex: 0,
            text: "⠿",
            title: "拖动调整顺序",
            "aria-label":
              "拖动调整" +
              WG.dashboardPlainText(skill ? skill.name : id) +
              "的顺序；键盘可使用上下方向键",
          }).appendTo(row);
          $("<span>", {
            class: "WG_auto_first_round_index",
            text: index + 1,
          }).appendTo(row);
          $("<span>", {
            class: "WG_auto_first_round_name",
            text: skill
              ? WG.dashboardPlainText(skill.name)
              : id + "（当前不可用）",
          }).appendTo(row);
          var controls = $("<span>", {
            class: "WG_auto_first_round_controls",
          }).appendTo(row);
          $("<button>", {
            class: "WG_auto_first_round_button WG_auto_first_round_remove",
            type: "button",
            "data-first-round-command": "remove",
            "data-skill-id": id,
            text: "×",
            title: "移除",
            "aria-label": "移除" + WG.dashboardPlainText(skill ? skill.name : id),
          }).appendTo(controls);
        });
        for (var skill of skills)
          if (!order.includes(skill.id))
            $("<button>", {
              class: "WG_auto_first_round_add",
              type: "button",
              "data-first-round-command": "add",
              "data-skill-id": skill.id,
              text: "+ " + WG.dashboardPlainText(skill.name),
            }).appendTo(available);
        if (!order.length)
          $("<div>", {
            class: "WG_auto_first_round_empty",
            text: "未设置，首轮沿用普通自动出招",
          }).appendTo(selected);
        if (!available.children().length)
          $("<div>", {
            class: "WG_auto_first_round_empty",
            text: skills.length ? "所有招式均已加入" : "尚未取得可用招式数据",
          }).appendTo(available);
      },
      openAutoFirstRoundDialog: function (trigger) {
        WG.loadAutoFirstRoundConfig();
        WG.autoFirstRoundDraft = (WG.autoFirstRoundOrder || []).slice();
        WG.autoFirstRoundLastFocus = trigger || document.activeElement;
        var popup = $(".WG_auto_first_round"),
          source = $(".WG_side_rail_right")[0];
        if (source) {
          var typography = window.getComputedStyle(source);
          popup.css({
            "font-family": typography.fontFamily,
            "font-size": typography.fontSize,
            "font-weight": typography.fontWeight,
            "line-height": typography.lineHeight,
          });
        }
        popup.prop("hidden", false);
        WG.renderAutoFirstRoundDialog();
        popup.find(".WG_auto_first_round_close").trigger("focus");
        WG.getAutoFirstRoundSkills().length || WG.Send("combat");
      },
      closeAutoFirstRoundDialog: function () {
        WG.endAutoFirstRoundDrag();
        $(".WG_auto_first_round").prop("hidden", true);
        var focusTarget = WG.autoFirstRoundLastFocus;
        WG.autoFirstRoundLastFocus = null;
        WG.autoFirstRoundDraft = null;
        focusTarget && $(focusTarget).trigger("focus");
      },
      changeAutoFirstRoundDraft: function (command, skillId) {
        var order = WG.autoFirstRoundDraft || [],
          index = order.indexOf(skillId);
        if (command === "add" && index < 0) order.push(skillId);
        else if (command === "remove" && index >= 0) order.splice(index, 1);
        WG.autoFirstRoundDraft = order;
        WG.renderAutoFirstRoundDialog();
      },
      syncAutoFirstRoundDragOrder: function () {
        var rows = $(".WG_auto_first_round_selected .WG_auto_first_round_row"),
          order = [];
        rows.each(function (index) {
          var row = $(this),
            skillId = row.attr("data-skill-id");
          skillId && order.push(skillId);
          row
            .attr("aria-posinset", index + 1)
            .attr("aria-setsize", rows.length)
            .find(".WG_auto_first_round_index")
            .text(index + 1);
        });
        WG.autoFirstRoundDraft = order;
        return order;
      },
      beginAutoFirstRoundDrag: function (event) {
        var nativeEvent = event.originalEvent || event,
          row = $(event.currentTarget),
          handle = $(event.target).closest(".WG_auto_first_round_drag_handle");
        if (
          (nativeEvent.button != null && nativeEvent.button !== 0) ||
          $(event.target).closest("button").length ||
          (nativeEvent.pointerType !== "mouse" && !handle.length)
        )
          return;
        WG.endAutoFirstRoundDrag();
        WG.autoFirstRoundDrag = {
          row: row,
          pointerId: nativeEvent.pointerId,
          startY: nativeEvent.clientY,
          dragging: false,
        };
        row[0].setPointerCapture &&
          row[0].setPointerCapture(nativeEvent.pointerId);
        event.preventDefault();
      },
      moveAutoFirstRoundDrag: function (event) {
        var drag = WG.autoFirstRoundDrag,
          nativeEvent = event.originalEvent || event;
        if (!drag || drag.pointerId !== nativeEvent.pointerId) return;
        if (!drag.dragging) {
          if (Math.abs(nativeEvent.clientY - drag.startY) < 5) return;
          drag.dragging = true;
          drag.row.addClass("is-dragging");
          drag.row.parent().addClass("is-sorting");
        }
        var list = drag.row.parent(),
          rows = list.children(".WG_auto_first_round_row").not(drag.row),
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
        WG.syncAutoFirstRoundDragOrder();
        event.preventDefault();
      },
      endAutoFirstRoundDrag: function (event) {
        var drag = WG.autoFirstRoundDrag;
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
        drag.dragging && WG.syncAutoFirstRoundDragOrder();
        WG.autoFirstRoundDrag = null;
      },
      keyAutoFirstRoundDrag: function (event) {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        var row = $(event.currentTarget).closest(".WG_auto_first_round_row"),
          sibling =
            event.key === "ArrowUp"
              ? row.prev(".WG_auto_first_round_row")
              : row.next(".WG_auto_first_round_row");
        if (!sibling.length) return;
        event.key === "ArrowUp"
          ? row.insertBefore(sibling)
          : row.insertAfter(sibling);
        WG.syncAutoFirstRoundDragOrder();
        row.find(".WG_auto_first_round_drag_handle").trigger("focus");
        event.preventDefault();
      },
      resetAutoFirstRoundCombat: function () {
        WG.clearAutoFirstRoundAdvanceTimer();
        WG.autoFirstRoundPrepared = false;
        WG.autoFirstRoundActive = false;
        WG.autoFirstRoundQueue = [];
        WG.autoFirstRoundIndex = 0;
        WG.autoFirstRoundReadyAt = 0;
        WG.autoFirstRoundPending = null;
      },
      cancelAutoFirstRound: function () {
        WG.clearAutoFirstRoundAdvanceTimer();
        WG.autoFirstRoundActive = false;
        WG.autoFirstRoundQueue = [];
        WG.autoFirstRoundIndex = 0;
        WG.autoFirstRoundReadyAt = 0;
        WG.autoFirstRoundPending = null;
      },
      getAutoFirstRoundReleaseDelay: function () {
        var releaseTime = G.score2 && G.score2.releasetime,
          match = String(releaseTime == null ? "" : releaseTime)
            .replace(/<[^>]*>/g, "")
            .match(/(-?\d+(?:\.\d+)?)\s*秒/),
          releaseDelay = match ? Number(match[1]) * 1000 : 0;
        return Math.max(350, Number.isFinite(releaseDelay) ? releaseDelay : 0);
      },
      clearAutoFirstRoundAdvanceTimer: function () {
        if (WG.autoFirstRoundAdvanceTimer != null)
          clearTimeout(WG.autoFirstRoundAdvanceTimer);
        WG.autoFirstRoundAdvanceTimer = null;
      },
      scheduleAutoFirstRoundAdvance: function (releaseTime) {
        WG.clearAutoFirstRoundAdvanceTimer();
        if (!WG.autoFirstRoundActive) return;
        var delay = Math.max(0, Number(releaseTime) || 0) + 30;
        WG.autoFirstRoundAdvanceTimer = setTimeout(function () {
          WG.autoFirstRoundAdvanceTimer = null;
          WG.processAutoFirstRound();
        }, delay);
      },
      prepareAutoFirstRound: function () {
        if (!G.auto_preform || !G.in_fight || WG.autoFirstRoundPrepared) return;
        WG.autoFirstRoundPrepared = true;
        WG.autoFirstRoundQueue = WG.loadAutoFirstRoundConfig().slice();
        WG.autoFirstRoundIndex = 0;
        WG.autoFirstRoundReadyAt = 0;
        WG.autoFirstRoundPending = null;
        WG.autoFirstRoundActive = WG.autoFirstRoundQueue.length > 0;
      },
      acknowledgeAutoFirstRoundPerform: function (data) {
        var pending = WG.autoFirstRoundPending;
        if (
          !WG.autoFirstRoundActive ||
          !pending ||
          !data ||
          String(data.id || "") !== pending.id
        )
          return false;
        WG.autoFirstRoundIndex += 1;
        WG.autoFirstRoundPending = null;
        WG.autoFirstRoundReadyAt =
          Date.now() + Math.max(0, Number(data.rtime) || 0);
        WG.scheduleAutoFirstRoundAdvance(data.rtime);
        return true;
      },
      getAutoFirstRoundConfirmTimeout: function () {
        return Math.max(1200, WG.getAutoFirstRoundReleaseDelay() + 500);
      },
      processAutoFirstRound: function () {
        if (!G.auto_preform) {
          WG.cancelAutoFirstRound();
          return false;
        }
        if (!WG.autoFirstRoundActive) return false;
        if (Date.now() < (WG.autoFirstRoundReadyAt || 0)) return true;
        if (G.gcd || !WG.is_free()) return true;
        var pending = WG.autoFirstRoundPending,
          now = Date.now();
        if (pending) {
          if (
            now - pending.sentAt < WG.getAutoFirstRoundConfirmTimeout()
          )
            return true;
          if (pending.attempts >= 3) {
            typeof messageAppend === "function" &&
              messageAppend(
                "<hir>首轮出招未收到成功确认，已跳过：" +
                  pending.id +
                  "</hir>",
              );
            WG.autoFirstRoundIndex += 1;
            WG.autoFirstRoundPending = null;
          } else {
            pending.attempts += 1;
            pending.sentAt = now;
            WG.Send("perform " + pending.id);
            return true;
          }
        }
        var skills = WG.getAutoFirstRoundSkills(),
          available = {};
        for (var skill of skills) available[skill.id] = true;
        while (WG.autoFirstRoundIndex < WG.autoFirstRoundQueue.length) {
          var skillId = WG.autoFirstRoundQueue[WG.autoFirstRoundIndex];
          if (!available[skillId]) {
            WG.autoFirstRoundIndex += 1;
            continue;
          }
          if (G.cds.get(skillId)) return true;
          WG.autoFirstRoundPending = {
            id: skillId,
            sentAt: now,
            attempts: 1,
          };
          WG.Send("perform " + skillId);
          return true;
        }
        WG.autoFirstRoundActive = false;
        WG.autoFirstRoundReadyAt = 0;
        return false;
      },
    });

    var protocolHook =
      typeof WG.add_hook === "function"
        ? WG.add_hook(["combat", "dispfm"], function (data) {
            if (data.type === "combat") {
              if (data.start) WG.resetAutoFirstRoundCombat();
              else if (data.end) WG.cancelAutoFirstRound();
              return;
            }
            WG.acknowledgeAutoFirstRoundPerform(data);
          })
        : null;

    return {
      destroy: function () {
        protocolHook != null &&
          typeof WG.remove_hook === "function" &&
          WG.remove_hook(protocolHook);
      },
    };
  });
})(window);
