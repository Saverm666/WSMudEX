/** Side dashboard, equipment picker, smart equipment and native action bridge. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("dashboard-equipment", function install(context) {
    const { WG, G, UI, legacy, messageAppend } = context;

    Object.assign(WG, {
      dashboardEquipmentSlots: [
        "武器",
        "衣服",
        "鞋",
        "头部",
        "披风",
        "戒指",
        "项链",
        "饰品",
        "护腕",
        "腰带",
        "暗器",
      ],
      dashboardPlainText: function (value) {
        if (value == null || value === "") return "—";
        return $("<div>").html(String(value)).text().trim() || "—";
      },
      quickLoadoutNamesVersion: 1,
      getQuickLoadoutNamesKey: function () {
        return (
          String(legacy.getRoleId() || (G && G.id) || legacy.getRoleName() || "anonymous") +
          "_WG_quick_loadout_names_v" +
          WG.quickLoadoutNamesVersion
        );
      },
      getQuickLoadoutNames: function () {
        var saved = GM_getValue(WG.getQuickLoadoutNamesKey(), {}),
          names = {};
        if (!saved || typeof saved !== "object") return names;
        for (var group = 0; group < 3; group++)
          if (typeof saved[group] === "string" && saved[group].trim())
            names[group] = saved[group].trim();
        return names;
      },
      setQuickLoadoutNames: function (names) {
        var normalized = {};
        names = names && typeof names === "object" ? names : {};
        for (var group = 0; group < 3; group++) {
          var name = String(names[group] || "").trim();
          name && (normalized[group] = name.slice(0, 12));
        }
        GM_setValue(WG.getQuickLoadoutNamesKey(), normalized);
        WG.applyQuickLoadoutNames();
      },
      setQuickLoadoutName: function (equipmentGroup, name) {
        var group = Number(equipmentGroup);
        if (group < 0 || group >= 3 || !Number.isInteger(group)) return;
        var names = WG.getQuickLoadoutNames();
        names[group] = String(name || "").trim().slice(0, 12);
        WG.setQuickLoadoutNames(names);
      },
      resetQuickLoadoutNames: function () {
        WG.setQuickLoadoutNames({});
      },
      applyQuickLoadoutNames: function () {
        var names = WG.getQuickLoadoutNames();
        $(".WG_quick_loadout").each(function () {
          var group = Number($(this).attr("data-equipment-group")),
            fallback = Number.isInteger(group) && group >= 0 && group < 3
              ? String(group + 1)
              : "配装",
            name = names[group] || fallback;
          $(this)
            .text(name)
            .attr({
              title: "切换到配装 " + (group + 1) + "：" + name,
              "aria-label": "切换到配装 " + (group + 1) + "：" + name,
            });
        });
      },
      dashboardNumber: function (value) {
        var number = Number(value);
        return Number.isFinite(number)
          ? number.toLocaleString("zh-CN")
          : WG.dashboardPlainText(value);
      },
      dashboardSnapshotVersion: 1,
      getDashboardSnapshotKey: function () {
        return (
          (legacy.getRoleId() || G.id || legacy.getRoleName() || "anonymous") +
          "_WG_dashboard_snapshot_v1"
        );
      },
      formatDashboardLevel: function (value, currentValue) {
        if (value == null || value === "") return currentValue;
        if (!/^\d+$/.test(String(value))) return String(value);
        var level = Number(value),
          names = ["普通百姓", "武士", "武师", "宗师", "武圣", "武帝", "武神"],
          colors = ["nor", "wht", "hig", "hiy", "hiz", "hio", "ord"],
          current = String(currentValue || "");
        if (level === 6 && /武神|剑神|刀皇|兵主|战神/.test(current))
          return current;
        return names[level] == null
          ? currentValue
          : "<" + colors[level] + ">" + names[level] + "</" + colors[level] + ">";
      },
      saveDashboardSnapshot: function () {
        if (!legacy.getRoleId() && !G.id && !legacy.getRoleName()) return;
        var score = G.score || {},
          payload = {
            version: WG.dashboardSnapshotVersion,
            level: G.level == null ? null : G.level,
            limit_mp: score.limit_mp == null ? null : Number(score.limit_mp),
            updatedAt: Date.now(),
          };
        (payload.level != null || Number.isFinite(payload.limit_mp)) &&
          GM_setValue(WG.getDashboardSnapshotKey(), payload);
      },
      loadDashboardSnapshot: function () {
        var cacheKey = WG.getDashboardSnapshotKey();
        if (WG.dashboardSnapshotLoadedKey === cacheKey) return;
        WG.dashboardSnapshotLoadedKey = cacheKey;
        G.level = void 0;
        G.score || (G.score = {});
        delete G.score.limit_mp;
        var cached = GM_getValue(cacheKey, null);
        if (!cached || cached.version !== WG.dashboardSnapshotVersion) return;
        cached.level != null && (G.level = cached.level);
        cached.limit_mp != null &&
          Number.isFinite(Number(cached.limit_mp)) &&
          (G.score.limit_mp = Number(cached.limit_mp));
      },
      applyDashboardLevel: function (value) {
        var formatted = WG.formatDashboardLevel(value, G.level);
        formatted != null && formatted !== "" && (G.level = formatted);
        WG.saveDashboardSnapshot();
        WG.updateSideDashboard();
      },
      requestDashboardSnapshot: function () {
        if (WG.dashboardScoreRequestPending) return;
        WG.dashboardScoreRequestPending = true;
        typeof WG.suppressNextResponse === "function" &&
          WG.suppressNextResponse(
            function (event) {
              return (
                event.type === "dialog" &&
                event.dialog === "score" &&
                event.limit_mp != null
              );
            },
            8000,
          );
        clearTimeout(WG.dashboardScoreRequestTimer);
        WG.dashboardScoreRequestTimer = setTimeout(function () {
          WG.dashboardScoreRequestPending = false;
        }, 8000);
        WG.Send("score");
      },
      requestAutomationScore2: function () {
        typeof WG.suppressNextResponse === "function" &&
          WG.suppressNextResponse(
            function (event) {
              return (
                event.type === "dialog" &&
                event.dialog === "score" &&
                event.study_per != null
              );
            },
            8000,
          );
        WG.Send("score2");
      },
      requestSilentPackSnapshot: function (timeout) {
        clearTimeout(WG.equipmentPickerPackRequestTimer);
        WG.equipmentPickerPackRequest = true;
        WG.equipmentPickerPackRequestTimer = setTimeout(function () {
          WG.equipmentPickerPackRequest = false;
          WG.equipmentPickerPackRequestTimer = null;
        }, Number(timeout) || 3000);
        WG.Send("pack");
      },
      dashboardStateRefreshTimer: null,
      dashboardStateRecheckTimer: null,
      dashboardStateRefreshNeedsPack: false,
      scheduleDashboardStateRefresh: function (options) {
        options = options || {};
        WG.dashboardStateRefreshNeedsPack =
          WG.dashboardStateRefreshNeedsPack || options.pack === true;
        clearTimeout(WG.dashboardStateRefreshTimer);
        WG.dashboardStateRefreshTimer = setTimeout(function () {
          WG.dashboardStateRefreshTimer = null;
          var needsPack = WG.dashboardStateRefreshNeedsPack;
          WG.dashboardStateRefreshNeedsPack = false;
          if (needsPack) {
            WG.requestSilentPackSnapshot();
          }
          WG.requestDashboardSnapshot();
          if (needsPack) {
            clearTimeout(WG.dashboardStateRecheckTimer);
            WG.dashboardStateRecheckTimer = setTimeout(function () {
              WG.dashboardStateRecheckTimer = null;
              WG.requestSilentPackSnapshot();
              WG.requestDashboardSnapshot();
            }, 900);
          }
        }, Number.isFinite(Number(options.delay)) ? Number(options.delay) : 350);
      },
      observeDashboardCommand: function (command) {
        if (Array.isArray(command)) {
          for (var item of command) WG.observeDashboardCommand(item);
          return;
        }
        var source = String(command || "");
        if (/[;\n]/.test(source)) {
          for (var part of source.split(/[;\n]/))
            WG.observeDashboardCommand(part);
          return;
        }
        var normalized = source.trim().toLowerCase();
        if (!normalized) return;
        if (/^(?:eq|uneq|eqgroup)\b/.test(normalized)) {
          WG.scheduleDashboardStateRefresh({ pack: true, delay: 350 });
          return;
        }
        if (
          (/^cr\s+/.test(normalized) && !/^cr\s+over\b/.test(normalized)) ||
          /^jh\s+fb\s+\S+\s+start\b/.test(normalized)
        )
          WG.scheduleDashboardStateRefresh({ delay: 700 });
      },
      applyDashboardScoreSnapshot: function (event) {
        if (!event || event.dialog !== "score" || event.study_per != null)
          return false;
        var hasResource = ["hp", "max_hp", "mp", "max_mp", "jingli"].some(
          function (key) {
            return event[key] != null;
          },
        );
        if (!hasResource) return false;
        G.score = Object.assign({}, G.score || {}, event);
        event.hp != null && (G.hp = event.hp);
        event.max_hp != null && (G.maxHp = event.max_hp);
        event.mp != null && (G.mp = event.mp);
        event.max_mp != null && (G.maxMp = event.max_mp);
        event.jingli != null && (G.dashboardJingli = event.jingli);
        var player = G.items && G.id ? G.items.get(G.id) : null;
        if (player) {
          event.hp != null && (player.hp = event.hp);
          event.max_hp != null && (player.max_hp = event.max_hp);
          event.mp != null && (player.mp = event.mp);
          event.max_mp != null && (player.max_mp = event.max_mp);
        }
        return true;
      },
      syncDashboardAfterSkillProgress: function (event) {
        if (
          !event ||
          event.type !== "dialog" ||
          event.dialog !== "skills" ||
          event.id == null ||
          (event.exp == null && event.level == null)
        )
          return;
        WG.requestDashboardSnapshot();
      },
      parseDashboardEnergy: function (value) {
        var text = WG.dashboardPlainText(value),
          match = text.match(
            /^([\d,]+)(?:\s*\/\s*([\d,]+))?(?:\s*\(\s*\+\s*([\d,]+)\s*\))?$/,
          ),
          toNumber = function (part) {
            return part == null ? null : Number(part.replace(/,/g, ""));
          };
        if (!match)
          return {
            permanentText: text,
            permanent: null,
            maximum: null,
            timed: null,
          };
        return {
          permanentText:
            WG.dashboardNumber(toNumber(match[1])) +
            (match[2] == null
              ? ""
              : " / " + WG.dashboardNumber(toNumber(match[2]))),
          permanent: toNumber(match[1]),
          maximum: toNumber(match[2]),
          timed: toNumber(match[3]),
        };
      },
      mergeDashboardEnergyTotal: function (value, currentTotal) {
        var energy = WG.parseDashboardEnergy(value),
          total = Number(currentTotal);
        if (
          energy.permanent == null ||
          energy.timed == null ||
          !Number.isFinite(total)
        )
          return energy.maximum == null
            ? String(currentTotal)
            : String(currentTotal) + "/" + energy.maximum;
        var delta = total - (energy.permanent + energy.timed),
          permanent = energy.permanent,
          timed = energy.timed;
        if (delta >= 0) permanent += delta;
        else {
          var spent = -delta,
            timedSpent = Math.min(timed, spent);
          timed -= timedSpent;
          permanent = Math.max(0, permanent - (spent - timedSpent));
        }
        return (
          permanent +
          (energy.maximum == null ? "" : "/" + energy.maximum) +
          "(+" +
          timed +
          ")"
        );
      },
      mergeDashboardEnergyDelta: function (value, delta) {
        var energy = WG.parseDashboardEnergy(value),
          change = Number(delta);
        if (
          energy.permanent == null ||
          energy.timed == null ||
          !Number.isFinite(change)
        )
          return null;
        var permanent = energy.permanent,
          timed = energy.timed;
        if (change >= 0) permanent += change;
        else {
          var spent = -change,
            timedSpent = Math.min(timed, spent);
          timed -= timedSpent;
          permanent = Math.max(0, permanent - (spent - timedSpent));
        }
        return (
          permanent +
          (energy.maximum == null ? "" : "/" + energy.maximum) +
          "(+" +
          timed +
          ")"
        );
      },
      equipmentGradeNames: [
        "普通",
        "精良",
        "高级",
        "稀有",
        "绝世",
        "传说",
        "神器",
      ],
      equipmentSlotCacheVersion: 1,
      equipmentSlotCacheLimit: 500,
      equipmentSlotCache: {},
      equipmentSlotCacheLoadedKey: null,
      equipmentSlotCacheSaveTimers: {},
      equipmentPickerPending: {},
      equipmentPickerQuickIds: {},
      equipmentPickerItems: [],
      equipmentPickerEquipment: [],
      equipmentPickerSlot: null,
      getEquipmentSlotCacheKey: function () {
        var identity = legacy.getRoleId() || (G && G.id) || legacy.getRoleName() || "anonymous";
        return String(identity) + "_WG_equipment_slot_cache_v1";
      },
      loadEquipmentSlotCache: function () {
        var cacheKey = WG.getEquipmentSlotCacheKey();
        if (WG.equipmentSlotCacheLoadedKey == cacheKey) return;
        var saved = GM_getValue(cacheKey, null),
          entries =
            saved && saved.version == WG.equipmentSlotCacheVersion
              ? saved.entries
              : null,
          cache = {};
        if (Array.isArray(entries))
          for (var entry of entries.slice(-WG.equipmentSlotCacheLimit)) {
            if (!Array.isArray(entry) || entry.length < 2) continue;
            var itemId = String(entry[0] || ""),
              slotIndex = Number(entry[1]);
            if (
              itemId &&
              Number.isInteger(slotIndex) &&
              slotIndex >= -1 &&
              slotIndex < WG.dashboardEquipmentSlots.length
            )
              cache[itemId] = slotIndex;
          }
        WG.equipmentSlotCache = cache;
        WG.equipmentPickerPending = {};
        WG.equipmentSlotCacheLoadedKey = cacheKey;
      },
      saveEquipmentSlotCache: function () {
        var cacheKey = WG.getEquipmentSlotCacheKey(),
          entries = Object.keys(WG.equipmentSlotCache)
            .filter(function (itemId) {
              var slotIndex = WG.equipmentSlotCache[itemId];
              return (
                itemId &&
                Number.isInteger(slotIndex) &&
                slotIndex >= -1 &&
                slotIndex < WG.dashboardEquipmentSlots.length
              );
            })
            .slice(-WG.equipmentSlotCacheLimit)
            .map(function (itemId) {
              return [itemId, WG.equipmentSlotCache[itemId]];
            }),
          payload = {
            version: WG.equipmentSlotCacheVersion,
            entries: entries,
          };
        clearTimeout(WG.equipmentSlotCacheSaveTimers[cacheKey]);
        WG.equipmentSlotCacheSaveTimers[cacheKey] = setTimeout(function () {
          GM_setValue(cacheKey, payload);
          delete WG.equipmentSlotCacheSaveTimers[cacheKey];
        }, 120);
      },
      rememberEquipmentSlot: function (itemId, slotIndex) {
        itemId = String(itemId || "");
        slotIndex = Number(slotIndex);
        if (
          !itemId ||
          !Number.isInteger(slotIndex) ||
          slotIndex < -1 ||
          slotIndex >= WG.dashboardEquipmentSlots.length
        )
          return;
        delete WG.equipmentSlotCache[itemId];
        WG.equipmentSlotCache[itemId] = slotIndex;
        WG.saveEquipmentSlotCache();
      },
      parseEquipmentSlot: function (description) {
        var lines = String(description || "")
          .replace(/<[^>]*>/g, "")
          .split(/\r?\n/)
          .map(function (line) {
            return line.trim();
          })
          .filter(Boolean);
        for (var index = 0; index < WG.dashboardEquipmentSlots.length; index++)
          if (lines.indexOf(WG.dashboardEquipmentSlots[index]) >= 0)
            return index;
        return -1;
      },
      captureEquipmentPickerResponse: function (event) {
        if (!event || event.type != "dialog" || event.dialog != "pack")
          return false;
        if (WG.captureSmartEquipmentDetailResponse(event)) return true;
        if (event.items && WG.equipmentPickerPackRequest) {
          var manualPackOpen =
            typeof Dialog != "undefined" &&
            Dialog.isShow &&
            Dialog.curItem == "pack";
          clearTimeout(WG.equipmentPickerPackRequestTimer);
          WG.equipmentPickerPackRequestTimer = null;
          WG.equipmentPickerPackRequest = false;
          // 用户已经打开背包时，这份完整数据同时就是原生页面所等待的响应。
          // 结束后台请求标记，但不要吞掉数据，交给游戏客户端正常渲染。
          if (manualPackOpen) return false;
          event.WG_dashboard_silent_pack = true;
          WG.run_hook(event.type, event);
          return true;
        }
        if (
          event.eq != null &&
          WG.equipmentPickerEquipRequest &&
          WG.equipmentPickerEquipRequest == event.id
        ) {
          WG.equipmentPickerEquipment[event.eq] = {
            id: event.id,
            name: "",
          };
          WG.equipmentPickerEquipRequest = null;
          WG.run_hook(event.type, event);
          return true;
        }
        if (event.desc != null && WG.equipmentPickerPending[event.id]) {
          WG.rememberEquipmentSlot(
            event.id,
            WG.parseEquipmentSlot(event.desc),
          );
          delete WG.equipmentPickerPending[event.id];
          WG.renderEquipmentPicker();
          return true;
        }
        return false;
      },
      updateEquipmentQuickIds: function (actions) {
        var quickIds = {};
        for (var action of actions || []) {
          var match = String(action.cmd || "").match(/^use\s+(\S+)$/);
          match && (quickIds[match[1]] = true);
        }
        WG.equipmentPickerQuickIds = quickIds;
      },
      getEquipmentPickerItems: function () {
        var items = WG.equipmentPickerItems;
        if (!items || !items.length)
          items =
            typeof Dialog != "undefined" && Dialog.pack && Dialog.pack.items
              ? Dialog.pack.items
              : legacy.getPackData() || [];
        return (items || []).filter(function (item) {
          return item && item.can_eq && item.id;
        });
      },
      getEquipmentPickerEquipment: function () {
        if (WG.equipmentPickerEquipment.length)
          return WG.equipmentPickerEquipment;
        if (typeof Dialog != "undefined" && Dialog.pack && Dialog.pack.eqs)
          return Dialog.pack.eqs;
        return G.eqs || [];
      },
      scanEquipmentPickerItems: function () {
        var requests = [];
        for (var item of WG.getEquipmentPickerItems()) {
          if (
            !Object.prototype.hasOwnProperty.call(
              WG.equipmentSlotCache,
              item.id,
            ) &&
            !WG.equipmentPickerPending[item.id]
          ) {
            WG.equipmentPickerPending[item.id] = true;
            requests.push("checkobj " + item.id + " from item");
          }
        }
        WG.renderEquipmentPicker();
        for (var command of requests) WG.Send(command);
      },
      handleEquipmentPickerEvent: function (event) {
        if (!event) return;
        if (event.type == "actions") {
          WG.updateEquipmentQuickIds(event.actions);
          WG.renderEquipmentPicker();
          return;
        }
        if (event.type != "dialog" || event.dialog != "pack") return;
        event.eq_group != null && WG.updateQuickLoadoutState(event.eq_group);
        if (event.items) {
          // 完整后台快照使用的是插件对象格式，不能写回原生紧凑数组缓存。
          // 旧缓存若存在则必须失效，确保用户下次打开背包发送完整 pack。
          if (
            typeof Dialog != "undefined" &&
            Dialog.pack &&
            !(Dialog.isShow && Dialog.curItem == "pack")
          ) {
            Dialog.pack.items = null;
            Dialog.pack.eqs = null;
          }
          var data = WG.deserializePackData(structuredClone(event));
          WG.equipmentPickerItems = data.items || [];
          WG.equipmentPickerEquipment = data.eqs || [];
          G.eqs = WG.equipmentPickerEquipment;
          for (var index = 0; index < (data.eqs || []).length; index++) {
            var equippedItem = data.eqs[index];
            equippedItem &&
              equippedItem.id &&
              WG.rememberEquipmentSlot(equippedItem.id, index);
          }
          WG.equipmentPickerSlot != null && WG.scanEquipmentPickerItems();
        } else if (event.eq != null) {
          var equippedIndex = WG.equipmentPickerItems.findIndex(function (item) {
              return item && item.id == event.id;
            }),
            equippedItem =
              equippedIndex >= 0
                ? WG.equipmentPickerItems.splice(equippedIndex, 1)[0]
                : (legacy.getPackData() || []).find(function (item) {
                    return item && item.id == event.id;
                  }) || { id: event.id, name: "" };
          WG.equipmentPickerEquipment[event.eq] = equippedItem;
          G.eqs = WG.equipmentPickerEquipment;
          WG.scheduleDashboardStateRefresh({ pack: true, delay: 350 });
        } else if (event.uneq != null) {
          var unequippedItem = WG.equipmentPickerEquipment[event.uneq];
          if (unequippedItem) {
            unequippedItem.can_eq = 1;
            unequippedItem.count = 1;
            WG.equipmentPickerItems.push(unequippedItem);
          }
          WG.equipmentPickerEquipment[event.uneq] = null;
          G.eqs = WG.equipmentPickerEquipment;
          WG.scheduleDashboardStateRefresh({ pack: true, delay: 350 });
        }
        WG.updateDashboardEquipment();
      },
      sortEquipmentPickerItems: function (items, quickIds) {
        return (items || []).slice().sort(function (first, second) {
          var quickDifference =
            Number(Boolean(quickIds[second.id])) -
            Number(Boolean(quickIds[first.id]));
          if (quickDifference) return quickDifference;
          var gradeDifference =
            Number(second.grade || 0) - Number(first.grade || 0);
          if (gradeDifference) return gradeDifference;
          return WG.dashboardPlainText(first.name).localeCompare(
            WG.dashboardPlainText(second.name),
            "zh-CN",
          );
        });
      },
      appendEquipmentPickerItem: function (container, item, options) {
        options = options || {};
        var isCurrent = Boolean(options.current),
          grade = Number((item && item.grade) || 0),
          itemName = item && item.name ? item.name : "未装备",
          className =
            "WG_equipment_picker_choice grade" +
            grade +
            (isCurrent ? " is-current" : ""),
          choice = isCurrent
            ? $("<div>", {
                class: className,
                role: "group",
                "aria-label":
                  "当前装备" + WG.dashboardPlainText(itemName),
              })
            : $("<button>", {
                class: className,
                type: "button",
                "data-item-id": item.id,
                "aria-label": "装备" + WG.dashboardPlainText(itemName),
              });
        choice.appendTo(container);
        $("<span>", { class: "WG_equipment_picker_name" })
          .html(itemName)
          .appendTo(choice);
        var meta = $("<span>", {
          class: "WG_equipment_picker_meta",
        }).appendTo(choice);
        isCurrent &&
          $("<span>", {
            class: "WG_equipment_picker_current_badge",
            text: "当前",
          }).appendTo(meta);
        item &&
          item.id &&
          options.quickIds[item.id] &&
          $("<span>", {
            class: "WG_equipment_picker_quick",
            text: "快速",
          }).appendTo(meta);
        item &&
          item.name &&
          $("<span>", {
            text: WG.equipmentGradeNames[grade] || "品阶 " + grade,
          }).appendTo(meta);
        return choice;
      },
      renderEquipmentPicker: function () {
        var popup = $(".WG_equipment_picker"),
          slotIndex = WG.equipmentPickerSlot;
        if (!popup.length || popup.prop("hidden") || slotIndex == null) return;
        var quickIds = WG.equipmentPickerQuickIds,
          choices = WG.sortEquipmentPickerItems(
            WG.getEquipmentPickerItems().filter(function (item) {
              return WG.equipmentSlotCache[item.id] === slotIndex;
            }),
            quickIds,
          ),
          pendingCount = Object.keys(WG.equipmentPickerPending).length,
          equipment = WG.getEquipmentPickerEquipment(),
          currentItem = equipment[slotIndex],
          current = popup.find(".WG_equipment_picker_current").empty(),
          list = popup.find(".WG_equipment_picker_list").empty();
        popup
          .find(".WG_equipment_picker_title")
          .text(WG.dashboardEquipmentSlots[slotIndex] + " · 选择装备");
        WG.appendEquipmentPickerItem(current, currentItem, {
          current: true,
          quickIds: quickIds,
        });
        for (var item of choices)
          WG.appendEquipmentPickerItem(list, item, {
            quickIds: quickIds,
          });
        if (!choices.length)
          $("<div>", {
            class: "WG_equipment_picker_empty",
            text: pendingCount
              ? "正在读取可装备物品…"
              : "背包中没有适用于此栏位的装备",
          }).appendTo(list);
        WG.positionEquipmentPicker();
      },
      syncEquipmentPickerTypography: function () {
        var source = $(".WG_side_rail_left")[0],
          popup = $(".WG_equipment_picker");
        if (!source || !popup.length) return;
        var typography = window.getComputedStyle(source);
        popup.css({
          "font-family": typography.fontFamily,
          "font-size": typography.fontSize,
          "font-weight": typography.fontWeight,
          "line-height": typography.lineHeight,
        });
      },
      calculateEquipmentPickerPosition: function (
        anchorRect,
        dialogWidth,
        dialogHeight,
        viewportWidth,
        viewportHeight,
      ) {
        var margin = 10,
          gap = 10,
          compact = viewportWidth <= 720 || viewportHeight <= 520,
          placement = "right",
          left,
          top;
        if (compact) {
          placement = "sheet";
          left = Math.max(margin / 2, (viewportWidth - dialogWidth) / 2);
          top = viewportHeight - dialogHeight - margin / 2;
        } else {
          var rightLeft = anchorRect.right + gap,
            leftLeft = anchorRect.left - dialogWidth - gap,
            fitsRight = rightLeft + dialogWidth <= viewportWidth - margin,
            fitsLeft = leftLeft >= margin;
          if (
            fitsRight ||
            (!fitsLeft && viewportWidth - anchorRect.right >= anchorRect.left)
          ) {
            left = rightLeft;
          } else {
            placement = "left";
            left = leftLeft;
          }
          top = anchorRect.top - Math.min(44, dialogHeight * 0.14);
        }
        var edgeMargin = compact ? margin / 2 : margin;
        return {
          placement: placement,
          left: Math.max(
            edgeMargin,
            Math.min(left, viewportWidth - dialogWidth - edgeMargin),
          ),
          top: Math.max(
            edgeMargin,
            Math.min(top, viewportHeight - dialogHeight - edgeMargin),
          ),
        };
      },
      scheduleEquipmentPickerPosition: function () {
        cancelAnimationFrame(WG.equipmentPickerPositionFrame || 0);
        WG.equipmentPickerPositionFrame = requestAnimationFrame(function () {
          WG.equipmentPickerPositionFrame = null;
          WG.positionEquipmentPicker();
        });
      },
      positionEquipmentPicker: function (trigger) {
        var popup = $(".WG_equipment_picker"),
          dialog = popup.find(".WG_equipment_picker_dialog"),
          anchor = trigger || WG.equipmentPickerLastFocus;
        if (
          !popup.length ||
          popup.prop("hidden") ||
          !dialog.length ||
          !anchor ||
          !document.documentElement.contains(anchor)
        )
          return;
        var anchorRect = anchor.getBoundingClientRect(),
          dialogWidth = dialog.outerWidth(),
          dialogHeight = dialog.outerHeight(),
          viewportWidth = window.innerWidth,
          viewportHeight = window.innerHeight,
          position = WG.calculateEquipmentPickerPosition(
            anchorRect,
            dialogWidth,
            dialogHeight,
            viewportWidth,
            viewportHeight,
          );
        popup.attr("data-placement", position.placement);
        dialog.css({
          left: position.left + "px",
          top: position.top + "px",
        });
      },
      openEquipmentPicker: function (slotIndex, trigger) {
        if (!WG.isPluginFeatureEnabled("equipmentPicker")) return;
        slotIndex = Number(slotIndex);
        if (!Number.isInteger(slotIndex)) return;
        WG.loadEquipmentSlotCache();
        var popup = $(".WG_equipment_picker"),
          equipment = WG.getEquipmentPickerEquipment(),
          currentItem = equipment[slotIndex];
        currentItem &&
          currentItem.id &&
          WG.rememberEquipmentSlot(currentItem.id, slotIndex);
        WG.syncEquipmentPickerTypography();
        WG.equipmentPickerSlot = slotIndex;
        WG.equipmentPickerLastFocus = trigger || document.activeElement;
        popup.prop("hidden", false);
        WG.renderEquipmentPicker();
        WG.scanEquipmentPickerItems();
        popup.find(".WG_equipment_picker_close").trigger("focus");
        WG.requestSilentPackSnapshot(5000);
        WG.Send("actions");
      },
      closeEquipmentPicker: function () {
        var slotIndex = WG.equipmentPickerSlot,
          focusTarget = $(
            '.WG_equipment_item[data-slot-index="' + slotIndex + '"]',
          )[0] || WG.equipmentPickerLastFocus;
        $(".WG_equipment_picker").prop("hidden", true);
        WG.equipmentPickerSlot = null;
        focusTarget && $(focusTarget).trigger("focus");
        WG.equipmentPickerLastFocus = null;
      },
      equipFromPicker: function (itemId) {
        if (!itemId) return;
        var slotIndex = WG.equipmentPickerSlot,
          equipment = WG.getEquipmentPickerEquipment(),
          currentItem = equipment[slotIndex];
        currentItem &&
          currentItem.id &&
          WG.rememberEquipmentSlot(currentItem.id, slotIndex);
        WG.equipmentPickerEquipRequest = itemId;
        WG.Send("eq " + itemId);
        WG.closeEquipmentPicker();
        setTimeout(function () {
          WG.scheduleDashboardStateRefresh({ pack: true, delay: 0 });
          WG.Send("actions");
        }, 200);
      },
      setDashboardResource: function (key, current, maximum) {
        var row = $('.WG_resource_row[data-resource="' + key + '"]');
        if (!row.length) return;
        var hasCurrent = current != null && current !== "",
          hasMaximum = maximum != null && maximum !== "",
          value = hasCurrent ? WG.dashboardNumber(current) : "—";
        hasMaximum &&
          (value += " / " + WG.dashboardNumber(maximum));
        row.find(".WG_resource_value").text(value);
        if (row.find(".WG_resource_fill").length) {
          var percent =
            hasCurrent && hasMaximum && Number(maximum) > 0
              ? (Number(current) * 100) / Number(maximum)
              : 0;
          row
            .find(".WG_resource_fill")
            .css("width", Math.max(0, Math.min(100, percent)) + "%");
        }
      },
      dashboardEquipmentSignature: null,
      updateQuickLoadoutState: function (equipmentGroup) {
        var normalizedGroup = Number(equipmentGroup);
        $(".WG_quick_loadout").each(function () {
          var selected = Number($(this).attr("data-equipment-group")) === normalizedGroup;
          $(this)
            .toggleClass("is-active", selected)
            .attr("aria-pressed", String(selected));
        });
      },
      updateDashboardEquipment: function () {
        var equipmentList = $(".WG_equipment_list");
        if (!equipmentList.length) return;
        var equipment = G.eqs || [];
        if (WG.equipmentPickerEquipment.length) {
          equipment = WG.equipmentPickerEquipment;
        } else if (
          typeof Dialog !== "undefined" &&
          Dialog.pack &&
          Dialog.pack.eqs &&
          Dialog.pack.eqs.length
        ) {
          equipment = Dialog.pack.eqs;
        }
        var signature = WG.dashboardEquipmentSlots
          .map(function (_, index) {
            var item = equipment[index];
            return item
              ? [item.id || "", item.name || "", item.grade ?? ""].join("\u0001")
              : "";
          })
          .join("\u0002");
        if (signature === WG.dashboardEquipmentSignature) return;
        WG.dashboardEquipmentSignature = signature;
        equipmentList.empty();
        WG.dashboardEquipmentSlots.forEach(function (slotName, index) {
          var item = equipment[index],
            gradeClass =
              item && Number.isFinite(Number(item.grade))
                ? " grade" + Number(item.grade)
                : "";
          var equipmentRow = $("<div>", {
              class:
                "WG_equipment_item" + gradeClass + (item ? "" : " is-empty"),
              "data-slot-index": index,
              "data-equipment-id": item && item.id ? item.id : "",
              role: "button",
              tabindex: 0,
              "aria-haspopup": "dialog",
              "aria-label":
                "更换" + slotName + "，当前" +
                (item && item.name
                  ? WG.dashboardPlainText(item.name)
                  : "未装备"),
            })
              .append(
                $("<span>", { class: "WG_equipment_slot", text: slotName }),
              )
              .appendTo(equipmentList),
            equipmentName = $("<span>", {
              class: "WG_equipment_name",
            }).appendTo(equipmentRow);
          item && item.name
            ? equipmentName.html(item.name)
            : equipmentName.text("未装备");
        });
      },
      updateSideDashboard: function () {
        if (!$(".WG_side_rail_left").length) return;
        WG.applyQuickLoadoutNames();
        var score = G.score || {},
          player = G.items && G.id ? G.items.get(G.id) || {} : {},
          hp = player.hp != null ? player.hp : G.hp ?? score.hp,
          maxHp =
            G.maxHp != null ? G.maxHp : player.max_hp ?? score.max_hp,
          mp = player.mp != null ? player.mp : G.mp ?? score.mp,
          maxMp =
            G.maxMp != null ? G.maxMp : player.max_mp ?? score.max_mp,
          roleText = legacy.getRoleName() || "当前角色",
          levelSource = G.level || score.level,
          levelText = WG.dashboardPlainText(levelSource),
          realmColorMatch = String(levelSource || "").match(
            /<(wht|hig|hic|hiy|hiz|hio|ord|hir|hiw)\b/i,
          ),
          realmTag = realmColorMatch ? realmColorMatch[1].toLowerCase() : "nor";
        levelText !== "—" && (roleText += " · " + levelText);
        $(".WG_rail_role")
          .first()
          .empty()
          .append($("<" + realmTag + ">").text(roleText));
        WG.setDashboardResource("hp", hp, maxHp);
        WG.setDashboardResource("mp", mp, maxMp);
        if (score.limit_mp != null && score.limit_mp !== "") {
          var mpValue = $('.WG_resource_row[data-resource="mp"]')
            .find(".WG_resource_value");
          mpValue.text(
            mpValue.text() + " (" + WG.dashboardNumber(score.limit_mp) + ")",
          );
        }

        var energySource =
            G.dashboardJingli != null ? G.dashboardJingli : score.jingli,
          energy = WG.parseDashboardEnergy(energySource),
          energyRow = $('.WG_resource_row[data-resource="energy"]'),
          timedEnergy = energyRow.find(".WG_energy_timed_value"),
          hasTimedEnergy = energy.timed != null,
          energyPermanentPercent =
            energy.permanent != null &&
            energy.maximum != null &&
            energy.maximum > 0
              ? (energy.permanent * 100) / energy.maximum
            : 0;
        energyRow
          .find(".WG_energy_permanent_value")
          .text(energy.permanentText);
        timedEnergy
          .prop("hidden", !hasTimedEnergy)
          .toggleClass("is-depleted", hasTimedEnergy && energy.timed <= 0);
        timedEnergy
          .text(
            hasTimedEnergy && energy.timed > 0
              ? "(+" + WG.dashboardNumber(energy.timed) + ")"
              : "(已用完)",
          );
        energyRow
          .find(".WG_resource_track")
          .attr(
            "aria-label",
            energy.permanent != null
              ? "常驻精力 " +
                  WG.dashboardNumber(energy.permanent) +
                  " / " +
                  (energy.maximum == null
                    ? "未知上限"
                    : WG.dashboardNumber(energy.maximum))
              : "暂无常驻精力数据",
          );
        energyRow
          .find(".WG_resource_fill")
          .css(
            "width",
            Math.max(0, Math.min(100, energyPermanentPercent)) + "%",
          );
        WG.setDashboardResource("potential", score.pot);
        WG.setDashboardResource("experience", score.exp);

        WG.updateDashboardEquipment();
        $(".WG_plugin_auto_toggle").attr(
          "aria-checked",
          String(Boolean(G.auto_preform)),
        );
        WG.updateNativeAutoAttackActionState();
      },
      updateNativeAutoAttackActionState: function () {
        var enabled = Boolean(G.auto_preform),
          buttons = $(".room-commands > .act-item").filter(function () {
            return (
              String($(this).attr("cmd") || "")
                .trim()
                .toLowerCase() == "#wg auto"
            );
          });
        buttons
          .toggleClass("WG_native_auto_active", enabled)
          .attr({
            "aria-pressed": String(enabled),
            "aria-label": "自动攻击（" + (enabled ? "已开启" : "已关闭") + "）",
            title: "自动攻击：" + (enabled ? "已开启" : "已关闭"),
          });
      },
      smartEquipmentDetailPending: {},
      smartEquipmentPreparationToken: 0,
      potentialWorkEquipmentPreparationToken: 0,
      smartEquipmentDetailCacheVersion: 1,
      smartEquipmentDetailRequestConcurrency: 6,
      smartEquipmentDetailRequestTimeout: 1800,
      smartEquipmentDetailBatchDeadline: 5000,
      smartEquipmentDetailCache: {},
      smartEquipmentDetailCacheLoadedKey: null,
      smartEquipmentDetailCacheSaveTimers: {},
      smartEquipmentSelectionCacheVersion: 1,
      smartEquipmentSelectionCache: {},
      smartEquipmentSelectionCacheLoadedKey: null,
      smartEquipmentSelectionCacheSaveTimers: {},
      getSmartEquipmentDetailCacheKey: function () {
        return (
          String(legacy.getRoleId() || (G && G.id) || legacy.getRoleName() || "anonymous") +
          "_WG_smart_equipment_details_v1"
        );
      },
      loadSmartEquipmentDetailCache: function () {
        var cacheKey = WG.getSmartEquipmentDetailCacheKey();
        if (WG.smartEquipmentDetailCacheLoadedKey == cacheKey) return;
        var saved = GM_getValue(cacheKey, null);
        WG.smartEquipmentDetailCache =
          saved &&
          saved.version == WG.smartEquipmentDetailCacheVersion &&
          saved.items &&
          "object" == typeof saved.items
            ? saved.items
            : {};
        WG.smartEquipmentDetailCacheLoadedKey = cacheKey;
      },
      saveSmartEquipmentDetailCache: function () {
        var cacheKey = WG.getSmartEquipmentDetailCacheKey(),
          payload = {
            version: WG.smartEquipmentDetailCacheVersion,
            items: Object.assign({}, WG.smartEquipmentDetailCache),
          };
        clearTimeout(WG.smartEquipmentDetailCacheSaveTimers[cacheKey]);
        WG.smartEquipmentDetailCacheSaveTimers[cacheKey] = setTimeout(function () {
          GM_setValue(cacheKey, payload);
          delete WG.smartEquipmentDetailCacheSaveTimers[cacheKey];
        }, 120);
      },
      getCachedSmartEquipmentDetail: function (item) {
        WG.loadSmartEquipmentDetailCache();
        var cached = item && WG.smartEquipmentDetailCache[item.id];
        if (
          !cached ||
          cached.name != String(item.name || "") ||
          Number(cached.grade || 0) != Number(item.grade || 0)
        )
          return null;
        return Object.assign({}, item, {
          slot: cached.slot,
          intelligence: cached.intelligence,
          study: cached.study,
          description: cached.description,
        });
      },
      rememberSmartEquipmentDetail: function (detail) {
        if (!detail || !detail.id) return;
        WG.loadSmartEquipmentDetailCache();
        WG.smartEquipmentDetailCache[detail.id] = {
          name: String(detail.name || ""),
          grade: Number(detail.grade || 0),
          slot: Number(detail.slot),
          intelligence: Number(detail.intelligence || 0),
          study: Number(detail.study || 0),
          description: String(detail.description || ""),
          updatedAt: Date.now(),
        };
        WG.saveSmartEquipmentDetailCache();
      },
      pruneSmartEquipmentDetailCache: function (items) {
        WG.loadSmartEquipmentDetailCache();
        var available = {};
        for (var item of items || []) item && item.id && (available[item.id] = true);
        var changed = false;
        Object.keys(WG.smartEquipmentDetailCache).forEach(function (itemId) {
          if (!available[itemId]) {
            delete WG.smartEquipmentDetailCache[itemId];
            changed = true;
          }
        });
        changed && WG.saveSmartEquipmentDetailCache();
      },
      getSmartEquipmentSelectionCacheKey: function () {
        return (
          String(legacy.getRoleId() || (G && G.id) || legacy.getRoleName() || "anonymous") +
          "_WG_smart_equipment_selections_v1"
        );
      },
      loadSmartEquipmentSelectionCache: function () {
        var cacheKey = WG.getSmartEquipmentSelectionCacheKey();
        if (WG.smartEquipmentSelectionCacheLoadedKey == cacheKey) return;
        var saved = GM_getValue(cacheKey, null);
        WG.smartEquipmentSelectionCache =
          saved &&
          saved.version == WG.smartEquipmentSelectionCacheVersion &&
          saved.items &&
          "object" == typeof saved.items
            ? saved.items
            : {};
        WG.smartEquipmentSelectionCacheLoadedKey = cacheKey;
      },
      saveSmartEquipmentSelectionCache: function () {
        var cacheKey = WG.getSmartEquipmentSelectionCacheKey(),
          payload = {
            version: WG.smartEquipmentSelectionCacheVersion,
            items: Object.assign({}, WG.smartEquipmentSelectionCache),
          };
        clearTimeout(WG.smartEquipmentSelectionCacheSaveTimers[cacheKey]);
        WG.smartEquipmentSelectionCacheSaveTimers[cacheKey] = setTimeout(function () {
          GM_setValue(cacheKey, payload);
          delete WG.smartEquipmentSelectionCacheSaveTimers[cacheKey];
        }, 120);
      },
      buildSmartEquipmentSelectionFingerprint: function (mode, snapshot, candidates) {
        var inventory = (candidates || [])
          .map(function (item) {
            return [
              String(item.id || ""),
              String(item.name || ""),
              Number(item.grade || 0),
            ].join(":");
          })
          .sort()
          .join("|");
        if (mode != "study") return mode + "::" + inventory;
        var currentIntelligence = 0,
          currentStudy = 0;
        for (var item of candidates || []) {
          if (!item.smartCurrent) continue;
          var detail = WG.getCachedSmartEquipmentDetail(item);
          if (!detail) return null;
          currentIntelligence += Number(detail.intelligence || 0);
          currentStudy += Number(detail.study || 0);
        }
        var score = snapshot.score || {},
          score2 = snapshot.score2 || {},
          innate = Number(score.int),
          acquired = Number(score.int_add),
          baseIntelligence =
            (Number.isFinite(innate) ? innate : 0) +
            (Number.isFinite(acquired) ? acquired - currentIntelligence : 0),
          baseStudy =
            WG.parseSmartPercentTotal(score2.study_per) -
            (Number.isFinite(innate) ? innate : 0) -
            currentStudy;
        return [mode, baseIntelligence, baseStudy, inventory].join("::");
      },
      restoreSmartEquipmentSelection: function (mode, fingerprint, snapshot, candidates) {
        if (!fingerprint) return null;
        WG.loadSmartEquipmentSelectionCache();
        var cached = WG.smartEquipmentSelectionCache[mode];
        if (!cached || cached.fingerprint != fingerprint || !cached.picks)
          return null;
        var candidatesById = {};
        for (var item of candidates || []) candidatesById[item.id] = item;
        var picks = {};
        for (var slot of Object.keys(cached.picks)) {
          var target = candidatesById[cached.picks[slot]];
          if (!target) return null;
          picks[slot] = target;
        }
        var currentBySlot = {};
        ((snapshot.pack && snapshot.pack.eqs) || []).forEach(function (item, slot) {
          item && item.id && (currentBySlot[slot] = item);
        });
        return { picks: picks, currentBySlot: currentBySlot, cached: true };
      },
      rememberSmartEquipmentSelection: function (mode, fingerprint, selection) {
        if (!fingerprint || !selection) return;
        WG.loadSmartEquipmentSelectionCache();
        var picks = {};
        Object.keys(selection.picks || {}).forEach(function (slot) {
          var item = selection.picks[slot];
          item && item.id && (picks[slot] = item.id);
        });
        WG.smartEquipmentSelectionCache[mode] = {
          fingerprint: fingerprint,
          picks: picks,
          updatedAt: Date.now(),
        };
        WG.saveSmartEquipmentSelectionCache();
      },
      parseSmartEquipmentDetail: function (description) {
        var lines = String(description || "")
            .replace(/<[^>]*>/g, "")
            .split(/\r?\n/)
            .map(function (line) {
              return line.trim();
            })
            .filter(Boolean),
          result = {
            slot: WG.parseEquipmentSlot(description),
            intelligence: 0,
            study: 0,
          },
          sumProperty = function (line, label) {
            var expression = new RegExp(label + "[：:]\\s*\\+?(-?\\d+)", "g"),
              total = 0,
              match;
            while ((match = expression.exec(line)))
              total += Number(match[1]) || 0;
            return total;
          };
        for (var line of lines) {
          if (/要求|件套/.test(line)) continue;
          result.intelligence += sumProperty(line, "悟性");
          result.study += sumProperty(line, "学习效率");
        }
        return result;
      },
      captureSmartEquipmentDetailResponse: function (event) {
        var pending =
          event &&
          event.desc != null &&
          WG.smartEquipmentDetailPending[event.id];
        if (!pending) return false;
        clearTimeout(pending.timer);
        delete WG.smartEquipmentDetailPending[event.id];
        var detail = Object.assign(
          {},
          pending.item,
          WG.parseSmartEquipmentDetail(event.desc),
          { description: event.desc },
        );
        detail.slot >= 0 && WG.rememberEquipmentSlot(detail.id, detail.slot);
        WG.rememberSmartEquipmentDetail(detail);
        pending.resolve(detail);
        return true;
      },
      requestSmartEquipmentDetails: function (items) {
        var unique = {},
          requests = [],
          details = [];
        for (var item of items || [])
          item && item.id && !unique[item.id] &&
            ((unique[item.id] = true), requests.push(item));
        var queue = requests.filter(function (item) {
          var cached = WG.getCachedSmartEquipmentDetail(item);
          cached && details.push(cached);
          return !cached;
        });
        if (!queue.length) {
          details.complete = true;
          return Promise.resolve(details);
        }
        return new Promise(function (resolve) {
          var nextIndex = 0,
            active = 0,
            finished = false,
            ownedPending = {},
            deadline,
            finish = function () {
              if (finished) return;
              finished = true;
              clearTimeout(deadline);
              Object.keys(ownedPending).forEach(function (itemId) {
                var pending = ownedPending[itemId];
                clearTimeout(pending.timer);
                if (WG.smartEquipmentDetailPending[itemId] == pending)
                  delete WG.smartEquipmentDetailPending[itemId];
              });
              details.complete = details.length == requests.length;
              resolve(details);
            },
            launch = function () {
              if (finished) return;
              while (
                active < WG.smartEquipmentDetailRequestConcurrency &&
                nextIndex < queue.length
              ) {
                (function (item) {
                  active += 1;
                  var previous = WG.smartEquipmentDetailPending[item.id];
                  if (previous) {
                    clearTimeout(previous.timer);
                    previous.resolve(null);
                  }
                  var pending = {
                    item: item,
                    timer: null,
                    resolve: function (detail) {
                      if (ownedPending[item.id] != pending) return;
                      delete ownedPending[item.id];
                      active -= 1;
                      detail && details.push(detail);
                      if (nextIndex >= queue.length && active == 0) finish();
                      else launch();
                    },
                  };
                  pending.timer = setTimeout(function () {
                    if (WG.smartEquipmentDetailPending[item.id] == pending)
                      delete WG.smartEquipmentDetailPending[item.id];
                    pending.resolve(null);
                  }, WG.smartEquipmentDetailRequestTimeout);
                  ownedPending[item.id] = pending;
                  WG.smartEquipmentDetailPending[item.id] = pending;
                  WG.Send(
                    "checkobj " +
                      item.id +
                      " from " +
                      (item.smartSource == "eq" ? "eq" : "item"),
                  );
                })(queue[nextIndex++]);
              }
            };
          deadline = setTimeout(finish, WG.smartEquipmentDetailBatchDeadline);
          launch();
        });
      },
      parseSmartPercentTotal: function (value) {
        var matches = String(value == null ? "" : value).match(/-?\d+(?:\.\d+)?/g);
        if (!matches) return 0;
        return matches.reduce(function (total, part) {
          return total + Number(part);
        }, 0);
      },
      requestSmartEquipmentSnapshot: function (includeStats) {
        return new Promise(function (resolve) {
          var result = {
              pack: null,
              score: G.score || {},
              score2: G.score2 || {},
            },
            gotScore = !includeStats,
            gotScore2 = !includeStats,
            finished = false,
            hook,
            timer,
            finish = function (forced) {
              if (
                finished ||
                (!forced && (!result.pack || !gotScore || !gotScore2))
              )
                return;
              finished = true;
              clearTimeout(timer);
              hook != null && WG.remove_hook(hook);
              resolve(result.pack ? result : null);
            };
          hook = WG.add_hook("dialog", function (event) {
            if (!event) return;
            if (event.dialog == "pack" && event.items) {
              result.pack = WG.deserializePackData(structuredClone(event));
            } else if (event.dialog == "score" && event.study_per != null) {
              result.score2 = event;
              gotScore2 = true;
            } else if (
              event.dialog == "score" &&
              (event.int != null || event.int_add != null)
            ) {
              result.score = event;
              gotScore = true;
            }
            finish(false);
          });
          WG.suppressNextResponse(
            function (event) {
              return (
                event.type == "dialog" &&
                event.dialog == "pack" &&
                event.items != null
              );
            },
            6000,
          );
          if (includeStats) {
            WG.suppressNextResponse(
              function (event) {
                return (
                  event.type == "dialog" &&
                  event.dialog == "score" &&
                  event.study_per == null &&
                  (event.int != null || event.int_add != null)
                );
              },
              6000,
            );
            WG.suppressNextResponse(
              function (event) {
                return (
                  event.type == "dialog" &&
                  event.dialog == "score" &&
                  event.study_per != null
                );
              },
              6000,
            );
            WG.Send("score");
            WG.Send("score2");
          }
          timer = setTimeout(function () {
            finish(true);
          }, 6000);
          WG.Send("pack");
        });
      },
      buildSmartEquipmentCandidates: function (snapshot) {
        var candidates = [],
          pack = snapshot && snapshot.pack;
        for (var item of (pack && pack.items) || [])
          item &&
            item.can_eq &&
            item.id &&
            candidates.push(
              Object.assign({}, item, { smartSource: "item", smartCurrent: false }),
            );
        ((pack && pack.eqs) || []).forEach(function (item, slot) {
          item &&
            item.id &&
            candidates.push(
              Object.assign({}, item, {
                smartSource: "eq",
                smartCurrent: true,
                smartKnownSlot: slot,
              }),
            );
        });
        return candidates;
      },
      chooseSmartEquipment: function (mode, snapshot, details) {
        var currentBySlot = {},
          optionsBySlot = {};
        for (var detail of details || []) {
          if (detail.smartKnownSlot != null) detail.slot = detail.smartKnownSlot;
          if (!(detail.slot >= 0)) continue;
          optionsBySlot[detail.slot] || (optionsBySlot[detail.slot] = []);
          optionsBySlot[detail.slot].push(detail);
          detail.smartCurrent && (currentBySlot[detail.slot] = detail);
        }
        var slots = Object.keys(optionsBySlot)
          .map(Number)
          .sort(function (left, right) {
            return left - right;
          });
        if (mode == "intelligence") {
          var intelligencePicks = {};
          for (var slot of slots)
            intelligencePicks[slot] = optionsBySlot[slot]
              .slice()
              .sort(function (left, right) {
                return (
                  right.intelligence - left.intelligence ||
                  Number(Boolean(right.smartCurrent)) -
                    Number(Boolean(left.smartCurrent)) ||
                  right.study - left.study ||
                  Number(right.grade || 0) - Number(left.grade || 0)
                );
              })[0];
          return {
            picks: intelligencePicks,
            currentBySlot: currentBySlot,
          };
        }
        var states = [{ intelligence: 0, study: 0, picks: {}, changes: 0 }];
        for (var slot of slots) {
          var expanded = [];
          for (var state of states)
            for (var option of optionsBySlot[slot]) {
              var picks = Object.assign({}, state.picks);
              picks[slot] = option;
              expanded.push({
                intelligence: state.intelligence + option.intelligence,
                study: state.study + option.study,
                picks: picks,
                changes:
                  state.changes +
                  Number(
                    !currentBySlot[slot] ||
                      currentBySlot[slot].id != option.id,
                  ),
              });
            }
          var bestByIntelligence = {};
          for (var candidate of expanded) {
            var key = String(candidate.intelligence),
              known = bestByIntelligence[key];
            if (
              !known ||
              candidate.study > known.study ||
              (candidate.study == known.study &&
                candidate.changes < known.changes)
            )
              bestByIntelligence[key] = candidate;
          }
          var ordered = Object.keys(bestByIntelligence)
              .map(function (key) {
                return bestByIntelligence[key];
              })
              .sort(function (left, right) {
                return right.intelligence - left.intelligence;
              }),
            frontier = [],
            bestStudy = -Infinity;
          for (var candidate of ordered)
            if (candidate.study > bestStudy) {
              frontier.push(candidate);
              bestStudy = candidate.study;
            }
          states = frontier;
        }
        var currentIntelligence = 0,
          currentStudy = 0;
        Object.keys(currentBySlot).forEach(function (slot) {
          currentIntelligence += currentBySlot[slot].intelligence;
          currentStudy += currentBySlot[slot].study;
        });
        var score = snapshot.score || {},
          score2 = snapshot.score2 || {},
          innate = Number(score.int),
          acquired = Number(score.int_add),
          totalStudy = WG.parseSmartPercentTotal(score2.study_per),
          baseIntelligence =
            (Number.isFinite(innate) ? innate : 0) +
            (Number.isFinite(acquired)
              ? acquired - currentIntelligence
              : 0),
          baseStudy =
            totalStudy -
            (Number.isFinite(innate) ? innate : 0) -
            currentStudy,
          best = null,
          bestValue = -Infinity;
        for (var state of states) {
          var value =
            (baseIntelligence + state.intelligence) *
            (100 + baseStudy + state.study);
          if (
            value > bestValue ||
            (value == bestValue && best && state.changes < best.changes)
          ) {
            best = state;
            bestValue = value;
          }
        }
        return {
          picks: best ? best.picks : {},
          currentBySlot: currentBySlot,
          value: bestValue,
        };
      },
      applySmartEquipment: async function (selection, label) {
        var changed = [];
        for (var slot of Object.keys(selection.picks || {}).map(Number)) {
          var target = selection.picks[slot],
            current = selection.currentBySlot[slot];
          if (!target || (current && current.id == target.id)) continue;
          WG.Send("eq " + target.id);
          changed.push(WG.dashboardPlainText(target.name));
          await WG.sleep(250);
        }
        messageAppend(
          "<hio>智能换装</hio>" +
            (changed.length
              ? label + "已换上：" + changed.join("、")
              : label + "当前装备已是最优选择"),
        );
      },
      prepareSmartEquipment: function (mode, done) {
        var token = ++WG.smartEquipmentPreparationToken,
          label = mode == "study" ? "学习套装" : "悟性套装";
        messageAppend("<hio>智能换装</hio>正在计算" + label);
        WG.requestSmartEquipmentSnapshot(true)
          .then(function (snapshot) {
            if (token != WG.smartEquipmentPreparationToken || !snapshot)
              return null;
            var candidates = WG.buildSmartEquipmentCandidates(snapshot);
            WG.pruneSmartEquipmentDetailCache(candidates);
            var fingerprint = WG.buildSmartEquipmentSelectionFingerprint(
              mode,
              snapshot,
              candidates,
            );
            var cachedSelection = WG.restoreSmartEquipmentSelection(
              mode,
              fingerprint,
              snapshot,
              candidates,
            );
            if (cachedSelection)
              return {
                snapshot: snapshot,
                details: [],
                candidates: candidates,
                selection: cachedSelection,
                fingerprint: fingerprint,
              };
            return WG.requestSmartEquipmentDetails(candidates).then(function (
              details,
            ) {
              return {
                snapshot: snapshot,
                details: details,
                candidates: candidates,
                fingerprint: fingerprint,
              };
            });
          })
          .then(function (result) {
            if (!result || token != WG.smartEquipmentPreparationToken) return;
            var selection =
              result.selection ||
              WG.chooseSmartEquipment(mode, result.snapshot, result.details);
            result.selection ||
              (result.details.complete &&
                WG.rememberSmartEquipmentSelection(
                  mode,
                  result.fingerprint ||
                    WG.buildSmartEquipmentSelectionFingerprint(
                      mode,
                      result.snapshot,
                      result.candidates,
                    ),
                  selection,
                ));
            return WG.applySmartEquipment(selection, label);
          })
          .then(function () {
            token == WG.smartEquipmentPreparationToken && done && done();
          })
          .catch(function (error) {
            console.error("smart equipment preparation failed", error);
            if (token == WG.smartEquipmentPreparationToken) {
              messageAppend("<hio>智能换装</hio>读取失败，继续执行原动作");
              done && done();
            }
          });
      },
      preparePotentialWorkEquipment: function (work, done) {
        var token = ++WG.potentialWorkEquipmentPreparationToken,
          definitions = {
            mining: {
              label: "挖矿",
              pattern: /铁镐|移山镐/,
              slot: 0,
            },
            herbalism: {
              label: "采药",
              pattern: /药王神篇|神农百草经/,
              slot: 7,
            },
            fishing: {
              label: "钓鱼",
              pattern: /钓鱼竿/,
              slot: 0,
            },
          },
          definition = definitions[work && work.id];
        if (!definition) return done && done();
        WG.requestSmartEquipmentSnapshot(false)
          .then(function (snapshot) {
            if (
              !snapshot ||
              token != WG.potentialWorkEquipmentPreparationToken
            )
              return;
            var pack = snapshot.pack || {},
              current = pack.eqs && pack.eqs[definition.slot],
              choices = [];
            current &&
              definition.pattern.test(WG.dashboardPlainText(current.name)) &&
              choices.push(Object.assign({}, current, { smartCurrent: true }));
            for (var item of pack.items || [])
              item &&
                item.can_eq &&
                definition.pattern.test(WG.dashboardPlainText(item.name)) &&
                choices.push(item);
            choices.sort(function (left, right) {
              return (
                Number(right.grade || 0) - Number(left.grade || 0) ||
                Number(Boolean(right.smartCurrent)) -
                  Number(Boolean(left.smartCurrent))
              );
            });
            var target = choices[0];
            if (!target) {
              messageAppend(
                "<hio>智能换装</hio>背包中没有可用的" +
                  definition.label +
                  "装备",
              );
              return;
            }
            if (!current || current.id != target.id) {
              WG.Send("eq " + target.id);
              messageAppend(
                "<hio>智能换装</hio>" +
                  definition.label +
                  "已换上：" +
                  WG.dashboardPlainText(target.name),
              );
              return WG.sleep(500);
            }
            messageAppend(
              "<hio>智能换装</hio>" +
                definition.label +
                "工具已经是最高品级",
            );
          })
          .then(function () {
            token == WG.potentialWorkEquipmentPreparationToken && done && done();
          })
          .catch(function (error) {
            console.error("potential work equipment preparation failed", error);
            if (token == WG.potentialWorkEquipmentPreparationToken)
              done && done();
          });
      },
      runNativeExtensionAction: function (action) {
        switch (action) {
          case "home":
            return WG.go_home();
          case "master":
            return WG.go_master();
          case "wumiao":
            return WG.go_wumiao();
          case "cleanup":
            return WG.sell_all();
          case "work":
            return WG.zdwk();
          case "yamen":
            return WG.go_yamen_task();
          case "resonance":
          case "team":
            return WG.team_resonance();
          case "auto":
            return WG.auto_preform_switch();
          default:
            messageAppend("<hir>未知的原生扩展动作：" + action + "</hir>");
        }
      },
    });
  });
})(window);
