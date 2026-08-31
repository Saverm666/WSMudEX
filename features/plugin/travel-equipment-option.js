/** Per-action loadout selection and action-bar command interception. */
(function registerTravelEquipmentOption(global) {
  "use strict";

  const ACTION_LOADOUT_VERSION = 1;

  function normalizeLoadoutGroup(value) {
    if (value === "" || value == null || value === false) return null;
    const group = Number(value);
    return Number.isInteger(group) && group >= 0 && group < 3 ? group : null;
  }

  function runAfterConfiguredLoadout(group, switchLoadout, done) {
    group = normalizeLoadoutGroup(group);
    if (group == null) {
      done && done();
      return false;
    }
    switchLoadout(group, done);
    return true;
  }

  const api = {
    ACTION_LOADOUT_VERSION: ACTION_LOADOUT_VERSION,
    normalizeLoadoutGroup: normalizeLoadoutGroup,
    runAfterConfiguredLoadout: runAfterConfiguredLoadout,
  };

  if (typeof module === "object" && module.exports) module.exports = api;

  if (
    global.WSMudPlugin &&
    typeof global.WSMudPlugin.registerFeature === "function"
  ) {
    global.WSMudPlugin.registerFeature(
      "travel-equipment-option",
      function install(context) {
        const { WG, G, legacy } = context;

        function roleKey() {
          return String(
            (legacy && legacy.getRoleId && legacy.getRoleId()) ||
              (G && G.id) ||
              (legacy && legacy.getRoleName && legacy.getRoleName()) ||
              "anonymous",
          );
        }

        function emptyConfig() {
          return {
            version: ACTION_LOADOUT_VERSION,
            builtin: {},
            buttons: {},
            labels: {},
          };
        }

        Object.assign(WG, {
          actionLoadoutVersion: ACTION_LOADOUT_VERSION,
          builtinActionDefinitions: [
            { id: "home", name: "回家", command: "#wg home" },
            { id: "master", name: "师父", command: "#wg master" },
            { id: "wumiao", name: "武庙", command: "#wg wumiao" },
            { id: "yamen", name: "衙门追捕", command: "#wg yamen" },
            { id: "work", name: "智能挂机", command: "#wg work" },
            { id: "cleanup", name: "清包", command: "#wg cleanup" },
            { id: "resonance", name: "队伍共鸣", command: "#wg resonance" },
            { id: "auto", name: "自动攻击", command: "#wg auto" },
          ],
          getActionLoadoutConfigKey: function () {
            return roleKey() + "_WG_action_loadouts_v" + ACTION_LOADOUT_VERSION;
          },
          getActionLoadoutConfig: function () {
            var saved = GM_getValue(WG.getActionLoadoutConfigKey(), null),
              config = emptyConfig();
            if (!saved || saved.version !== ACTION_LOADOUT_VERSION) return config;
            for (var section of ["builtin", "buttons"])
              for (var key of Object.keys(saved[section] || {})) {
                var group = normalizeLoadoutGroup(saved[section][key]);
                group != null && (config[section][key] = group);
              }
            for (var command of Object.keys(saved.labels || {})) {
              var label = String(saved.labels[command] || "").trim();
              label && (config.labels[command] = label.slice(0, 40));
            }
            return config;
          },
          saveActionLoadoutConfig: function (config) {
            config = config || emptyConfig();
            config.version = ACTION_LOADOUT_VERSION;
            GM_setValue(WG.getActionLoadoutConfigKey(), config);
          },
          setActionLoadout: function (section, key, value) {
            if (section !== "builtin" && section !== "buttons") return;
            key = String(key || "").trim();
            if (!key) return;
            var config = WG.getActionLoadoutConfig(),
              group = normalizeLoadoutGroup(value);
            if (group == null) delete config[section][key];
            else config[section][key] = group;
            WG.saveActionLoadoutConfig(config);
          },
          resetActionLoadoutConfig: function () {
            WG.saveActionLoadoutConfig(emptyConfig());
          },
          listCurrentActionBarButtons: function () {
            var result = [],
              seen = {};
            $(".room-commands > .act-item").each(function () {
              var command = String($(this).attr("cmd") || "").trim(),
                label = String($(this).text() || "").trim();
              if (!command || !label || seen[command]) return;
              seen[command] = true;
              result.push({ command: command, label: label.slice(0, 40) });
            });
            return result;
          },
          rememberActionBarButtons: function () {
            var config = WG.getActionLoadoutConfig(),
              changed = false,
              current = WG.listCurrentActionBarButtons();
            current.forEach(function (button) {
              if (config.labels[button.command] === button.label) return;
              config.labels[button.command] = button.label;
              changed = true;
            });
            changed && WG.saveActionLoadoutConfig(config);
            return current;
          },
          switchToActionLoadout: function (group, done) {
            group = normalizeLoadoutGroup(group);
            if (group == null) return done && done();
            if (WG.currentEquipmentGroup === group) return done && done();
            var finished = false,
              hook,
              timer,
              finish = function () {
                if (finished) return;
                finished = true;
                hook != null && WG.remove_hook(hook);
                timer != null && clearTimeout(timer);
                WG.currentEquipmentGroup = group;
                done && done();
              };
            hook = WG.add_hook("dialog", function (event) {
              event &&
                event.dialog === "pack" &&
                Number(event.eq_group) === group &&
                finish();
            });
            timer = setTimeout(finish, 1500);
            WG.Send("eqgroup " + group);
          },
          runAfterActionLoadout: function (section, key, done) {
            var config = WG.getActionLoadoutConfig(),
              group = config[section] && config[section][key];
            return runAfterConfiguredLoadout(
              group,
              WG.switchToActionLoadout,
              done,
            );
          },
          runAfterBuiltinActionLoadout: function (action, done) {
            if (WG.actionBarLoadoutReplayActive) {
              done && done();
              return false;
            }
            return WG.runAfterActionLoadout("builtin", action, done);
          },
          runActionBarCommandWithLoadout: function (command, done) {
            command = String(command || "").trim();
            var config = WG.getActionLoadoutConfig(),
              group = normalizeLoadoutGroup(config.buttons[command]);
            if (group == null) return false;
            return runAfterConfiguredLoadout(
              group,
              WG.switchToActionLoadout,
              function () {
                WG.actionBarLoadoutReplayActive = true;
                try {
                  done && done();
                } finally {
                  WG.actionBarLoadoutReplayActive = false;
                }
              },
            );
          },
          installActionBarLoadoutObserver: function () {
            WG.rememberActionBarButtons();
            if (
              WG.actionBarLoadoutObserver ||
              typeof MutationObserver === "undefined"
            )
              return;
            var host = document.querySelector(".room-commands");
            if (!host) return;
            WG.actionBarLoadoutObserver = new MutationObserver(function () {
              WG.rememberActionBarButtons();
            });
            WG.actionBarLoadoutObserver.observe(host, { childList: true });
          },
          destroyActionBarLoadoutObserver: function () {
            WG.actionBarLoadoutObserver && WG.actionBarLoadoutObserver.disconnect();
            WG.actionBarLoadoutObserver = null;
          },
        });

        global.WGRunActionBarCommandWithLoadout =
          WG.runActionBarCommandWithLoadout;
        setTimeout(WG.installActionBarLoadoutObserver, 0);

        return {
          destroy: function () {
            WG.destroyActionBarLoadoutObserver();
            if (
              global.WGRunActionBarCommandWithLoadout ===
              WG.runActionBarCommandWithLoadout
            )
              delete global.WGRunActionBarCommandWithLoadout;
          },
        };
      },
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
