/** Auto-perform skill enablement helpers. */
(function registerAutoPerformFilter(global) {
  "use strict";

  const ALWAYS_BLOCKED_PERFORMS = ["force.tuoli"];

  function parsePerformIdList(value) {
    var source = Array.isArray(value)
      ? value
      : String(value == null ? "" : value).split(/[,，;\s]+/);
    var result = [];
    for (var entry of source) {
      var id = String(entry || "").trim();
      if (id && result.indexOf(id) < 0) result.push(id);
    }
    return result;
  }

  function serializePerformIdList(ids) {
    return parsePerformIdList(ids).join(",");
  }

  function setPerformEnabled(disabledIds, skillId, enabled) {
    var id = String(skillId || "").trim();
    var result = parsePerformIdList(disabledIds);
    var index = result.indexOf(id);
    if (!id) return result;
    if (enabled) {
      if (index >= 0) result.splice(index, 1);
    } else if (index < 0) result.push(id);
    return result;
  }

  function listAutoPerformSkills(skills, disabledIds, alwaysBlocked) {
    var blocked = parsePerformIdList(
      alwaysBlocked == null ? ALWAYS_BLOCKED_PERFORMS : alwaysBlocked,
    );
    var disabled = parsePerformIdList(disabledIds);
    var result = [];
    var known = {};
    for (var skill of skills || []) {
      var id = String((skill && skill.id) || "").trim();
      if (!id || known[id] || blocked.indexOf(id) >= 0) continue;
      known[id] = true;
      result.push({
        id: id,
        name: (skill && skill.name) || id,
        enabled: disabled.indexOf(id) < 0,
      });
    }
    return result;
  }

  function filterEnabledPerformIds(skills, disabledIds, alwaysBlocked) {
    return listAutoPerformSkills(skills, disabledIds, alwaysBlocked)
      .filter(function (skill) {
        return skill.enabled;
      })
      .map(function (skill) {
        return skill.id;
      });
  }

  function applyDisabledPerformsToBlocked(
    blocked,
    previousDisabled,
    nextDisabled,
    alwaysBlocked,
  ) {
    var nextBlocked = Array.isArray(blocked) ? blocked.slice() : [];
    var always = parsePerformIdList(
      alwaysBlocked == null ? ALWAYS_BLOCKED_PERFORMS : alwaysBlocked,
    );
    var previous = parsePerformIdList(previousDisabled);
    var next = parsePerformIdList(nextDisabled);
    var id;
    var index;
    for (id of always) {
      if (nextBlocked.indexOf(id) < 0) nextBlocked.push(id);
    }
    for (id of previous) {
      if (next.indexOf(id) < 0 && always.indexOf(id) < 0) {
        index = nextBlocked.indexOf(id);
        if (index >= 0) nextBlocked.splice(index, 1);
      }
    }
    for (id of next) {
      if (nextBlocked.indexOf(id) < 0) nextBlocked.push(id);
    }
    return nextBlocked;
  }

  const api = {
    ALWAYS_BLOCKED_PERFORMS: ALWAYS_BLOCKED_PERFORMS,
    parsePerformIdList: parsePerformIdList,
    serializePerformIdList: serializePerformIdList,
    setPerformEnabled: setPerformEnabled,
    listAutoPerformSkills: listAutoPerformSkills,
    filterEnabledPerformIds: filterEnabledPerformIds,
    applyDisabledPerformsToBlocked: applyDisabledPerformsToBlocked,
  };

  if (typeof module === "object" && module.exports) module.exports = api;

  if (
    global.WSMudPlugin &&
    typeof global.WSMudPlugin.registerFeature === "function"
  ) {
    global.WSMudPlugin.registerFeature(
      "auto-perform-filter",
      function install(context) {
        const { WG, G, legacy } = context;

        var originalGetDisabledPerforms =
          legacy && typeof legacy.getDisabledPerforms === "function"
            ? legacy.getDisabledPerforms.bind(legacy)
            : null;
        var hooksAlive = true;

        function currentRoleId() {
          return (
            (legacy && legacy.getRoleId && legacy.getRoleId()) ||
            G.id ||
            (legacy && legacy.getRoleName && legacy.getRoleName()) ||
            "anonymous"
          );
        }

        function disabledStorageKey() {
          return currentRoleId() + "_unauto_pfm";
        }

        function loadDisabledPerformIds() {
          var stored = "";
          var fallback = originalGetDisabledPerforms
            ? originalGetDisabledPerforms()
            : "";
          if (typeof GM_getValue === "function")
            stored = GM_getValue(disabledStorageKey(), fallback);
          else stored = fallback;
          return parsePerformIdList(stored);
        }

        function persistDisabledPerformIds(ids) {
          var previous = loadDisabledPerformIds();
          var next = parsePerformIdList(ids);
          var serialized = serializePerformIdList(next);
          if (typeof GM_setValue === "function")
            GM_setValue(disabledStorageKey(), serialized);
          if (legacy && typeof legacy.setDisabledPerforms === "function")
            legacy.setDisabledPerforms(serialized);
          var blocked =
            legacy && typeof legacy.getBlockedPerforms === "function"
              ? legacy.getBlockedPerforms()
              : null;
          if (Array.isArray(blocked)) {
            var updated = applyDisabledPerformsToBlocked(
              blocked,
              previous,
              next,
            );
            blocked.length = 0;
            for (var id of updated) blocked.push(id);
          }
          if (typeof $ === "function")
            $("#" + ["unauto", "pfm"].join("_")).val(serialized);
          return next;
        }

        if (legacy)
          legacy.getDisabledPerforms = function () {
            return serializePerformIdList(loadDisabledPerformIds());
          };

        function refreshSettingsOnPerform() {
          if (
            !hooksAlive ||
            typeof $ !== "function" ||
            $(".WG_plugin_settings").prop("hidden")
          )
            return;
          WG.renderAutoPerformSkillSettings();
        }
        typeof WG.add_hook === "function" &&
          WG.add_hook("perform", refreshSettingsOnPerform);

        Object.assign(WG, {
          parsePerformIdList: parsePerformIdList,
          serializePerformIdList: serializePerformIdList,
          loadDisabledPerformIds: loadDisabledPerformIds,
          persistDisabledPerformIds: persistDisabledPerformIds,
          listAutoPerformSkills: function () {
            var skills = Array.isArray(G.skills) ? G.skills : [];
            if (!skills.length && legacy && legacy.getCustomSkillList)
              try {
                var savedSkills = JSON.parse(legacy.getCustomSkillList());
                Array.isArray(savedSkills) && (skills = savedSkills);
              } catch (error) {}
            return listAutoPerformSkills(skills, loadDisabledPerformIds());
          },
          setAutoPerformSkillEnabled: function (skillId, enabled) {
            return persistDisabledPerformIds(
              setPerformEnabled(loadDisabledPerformIds(), skillId, enabled),
            );
          },
          renderAutoPerformSkillSettings: function () {
            var host = $(".WG_plugin_settings_auto_skills");
            if (!host.length) return;
            host.empty();
            var skills = WG.listAutoPerformSkills();
            if (!skills.length) {
              $("<div>", {
                class: "WG_plugin_settings_empty",
                text: "尚未取得可用招式。进入战斗或打开战斗面板后会刷新列表。",
              }).appendTo(host);
              typeof WG.Send === "function" && WG.Send("combat");
              return;
            }
            for (var skill of skills) {
              var name =
                typeof WG.dashboardPlainText === "function"
                  ? WG.dashboardPlainText(skill.name)
                  : skill.name;
              WG.appendPluginSettingsSwitch(host, {
                kind: "autoSkill",
                id: skill.id,
                name: name,
                enabled: skill.enabled,
              });
            }
          },
        });

        return {
          destroy: function () {
            hooksAlive = false;
            if (legacy && originalGetDisabledPerforms)
              legacy.getDisabledPerforms = originalGetDisabledPerforms;
            if (WG.loadDisabledPerformIds === loadDisabledPerformIds) {
              delete WG.loadDisabledPerformIds;
              delete WG.persistDisabledPerformIds;
              delete WG.listAutoPerformSkills;
              delete WG.setAutoPerformSkillEnabled;
              delete WG.renderAutoPerformSkillSettings;
            }
          },
        };
      },
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
