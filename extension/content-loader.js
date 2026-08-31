(() => {
  const PAGE_SCRIPT_PATHS = [
    "runtime/userscript-compat.js",
    "runtime/page-settings-sync.js",
    "vendor/jquery-3.7.1.js",
    "vendor/vue-2.6.11.js",
    "vendor/layer-2.3.js",
    "vendor/context-menu.js",
    "vendor/store-2.0.12.js",
    "features/plugin/core.js",
    "features/plugin/pack-data-codec.js",
    "features/plugin/binary-protocol.js",
    "features/plugin/role-switcher.js",
    "features/plugin/dashboard-equipment.js",
    "features/plugin/protocol-compatibility.js",
    "features/plugin/travel-equipment-option.js",
    "features/plugin/navigation-enhancements.js",
    "features/plugin/raid-flow-execution-runtime.js",
    "features/plugin/raid-flow-storage.js",
    "features/plugin/raid-flow-compiler.js",
    "features/plugin/raid-flow-assert.js",
    "features/plugin/raid-flow-dungeons.js",
    "features/plugin/raid-flow-shortcuts.js",
    "features/plugin/raid-flow-server.js",
    "features/plugin/raid-flow-observers.js",
    "features/plugin/raid-flow-room.js",
    "features/plugin/raid-flow-th-island.js",
    "features/plugin/auto-first-round.js",
    "features/plugin/auto-perform-filter.js",
    "features/plugin/layout-controls.js",
    "features/plugin/ui-shell.js",
    "features/plugin/plugin-settings.js",
    "features/plugin/trigger-event-bus.js",
    "features/plugin/trigger-core.js",
    "features/plugin/trigger-monitors.js",
    "features/plugin/trigger-ui.js",
    "features/upstream-automation.js",
    "features/plugin/native-client-compat.js",
    "features/raid-flow-engine.js",
    "features/trigger-system.js",
    "client/core.js",
    "client/modules/map.js",
    "client/modules/utilities.js",
    "client/modules/combat.js",
    "client/modules/tool-action.js",
    "client/modules/warnings.js",
    "client/modules/touch.js",
    "client/modules/view-storage.js",
    "client/modules/connection.js",
    "client/modules/network-api.js",
    "client/modules/settings.js",
    "client/modules/dialog-skills.js",
    "client/modules/skill-calculator.js",
    "client/modules/dialog-channel.js",
    "client/modules/dialog-tasks.js",
    "client/modules/dialog-jianghu.js",
    "client/modules/dialog-stats.js",
   "client/modules/dialog-keys.js",
    "client/modules/dialog-shop.js",
    "client/modules/dialog-social.js",
    "client/modules/dialog-events.js",
    "client/modules/dialog-pm.js",
    "client/modules/dialog-extensions.js",
    "client/modules/detail-popup-policy.js",
   "client/modules/message-queue.js",
    "client/modules/script-engine.js",
    "client/modules/confirmation.js",
    "client/modules/room-renderer.js",
    "client/game-client.js",
  ];

  let extensionEnabled = true;

  function pageLoadPlan() {
    return (
      (typeof globalThis !== "undefined" && globalThis.WSMudPageLoadPlan) ||
      (typeof window !== "undefined" && window.WSMudPageLoadPlan) ||
      null
    );
  }

  function injectPageScript(scriptUrl) {
    if (!extensionEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const scriptElement = document.createElement("script");
      scriptElement.src = scriptUrl;
      scriptElement.onload = () => {
        console.log("脚本加载成功:", scriptUrl);
        resolve();
      };
      scriptElement.onerror = () => {
        console.error("脚本加载失败:", scriptUrl);
        resolve();
      };
      document.head.appendChild(scriptElement);
    });
  }

  function loadPageScriptsInOrder() {
    if (!extensionEnabled) {
      console.log("扩展已禁用，跳过自定义脚本加载");
      return Promise.resolve();
    }

    const plan = pageLoadPlan();
    const scriptPaths = plan
      ? plan.selectPageScripts(location.hostname, PAGE_SCRIPT_PATHS)
      : PAGE_SCRIPT_PATHS;

    let loadingSequence = Promise.resolve();
    scriptPaths.forEach((scriptPath) => {
      loadingSequence = loadingSequence.then(() =>
        injectPageScript(chrome.runtime.getURL(scriptPath)),
      );
    });
    return loadingSequence;
  }

  function isWsmudHostname(hostname) {
    const plan = pageLoadPlan();
    if (plan) {
      return plan.isSupportedGameHost(hostname);
    }
    const host = String(hostname || "").toLowerCase();
    return (
      host === "wsmud2.com" ||
      host.endsWith(".wsmud2.com") ||
      host === "wsmud2.cn" ||
      host.endsWith(".wsmud2.cn") ||
      host === "wxmud1.com" ||
      host.endsWith(".wxmud1.com")
    );
  }

  function shouldReplaceGameClient() {
    const plan = pageLoadPlan();
    if (plan) {
      return plan.shouldReplaceGameClient(location.hostname);
    }
    return true;
  }

  function belongsToWsmud(scriptUrl) {
    try {
      const parsedUrl = new URL(scriptUrl, document.baseURI);
      return isWsmudHostname(parsedUrl.hostname);
    } catch (_error) {
      return /wsmud2\.(com|cn)|wxmud1\.com/i.test(String(scriptUrl || ""));
    }
  }

  function removeOriginalWsmudScript(scriptElement) {
    const scriptUrl = scriptElement.src;
    if (extensionEnabled && scriptUrl && belongsToWsmud(scriptUrl)) {
      scriptElement.remove();
      console.log("拦截脚本:", scriptUrl);
    }
  }

  function startOriginalScriptInterceptor() {
    if (!shouldReplaceGameClient()) {
      return;
    }

    const observer = new MutationObserver((mutationRecords) => {
      if (!extensionEnabled) {
        return;
      }

      let batchContainsScript = false;
      for (
        let recordIndex = 0;
        recordIndex < mutationRecords.length;
        recordIndex += 1
      ) {
        const mutationRecord = mutationRecords[recordIndex];
        if (
          mutationRecord.type === "childList" &&
          mutationRecord.addedNodes.length > 0
        ) {
          for (
            let nodeIndex = 0;
            nodeIndex < mutationRecord.addedNodes.length;
            nodeIndex += 1
          ) {
            const addedNode = mutationRecord.addedNodes[nodeIndex];
            if (
              addedNode.nodeType === Node.ELEMENT_NODE &&
              addedNode.tagName === "SCRIPT"
            ) {
              batchContainsScript = true;
              break;
            }
          }
          if (batchContainsScript) {
            break;
          }
        }
      }

      if (batchContainsScript) {
        mutationRecords.forEach((mutationRecord) => {
          mutationRecord.addedNodes.forEach((addedNode) => {
            if (
              addedNode.nodeType === Node.ELEMENT_NODE &&
              addedNode.tagName === "SCRIPT"
            ) {
              removeOriginalWsmudScript(addedNode);
            }
          });
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("load", () => observer.disconnect(), {
      once: true,
    });
  }

  function reportPageScriptLoading() {
    loadPageScriptsInOrder()
      .then(() => {
        if (extensionEnabled) {
          console.log("所有自定义脚本按顺序加载完成");
        }
      })
      .catch((error) => {
        console.error("脚本加载过程中出现错误:", error);
      });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateExtensionStatus") {
      extensionEnabled = message.enabled;
      console.log("扩展状态更新为:", extensionEnabled ? "启用" : "禁用");
    }
  });

  function pageSettingsSync() {
    return (
      (typeof globalThis !== "undefined" && globalThis.WSMudPageSettingsSync) ||
      (typeof window !== "undefined" && window.WSMudPageSettingsSync) ||
      null
    );
  }

  function persistPageSettings() {
    const sync = pageSettingsSync();
    if (!sync || !chrome.storage || !chrome.storage.local) {
      return;
    }
    const snapshot = sync.wrapSnapshot(sync.readPageStorage(localStorage));
    chrome.storage.local.set({ [sync.SNAPSHOT_KEY]: snapshot });
  }

  function hydratePageSettings(storedSettings) {
    const sync = pageSettingsSync();
    if (!sync) {
      return;
    }
    const snapshotValues = sync.unwrapSnapshot(
      storedSettings && storedSettings[sync.SNAPSHOT_KEY],
    );
    sync.hydrateMissingKeys(localStorage, snapshotValues);
  }

  chrome.storage.local.get(
    ["extensionEnabled", "wsmudSyncedPageSettings"],
    (storedSettings) => {
      extensionEnabled = storedSettings.extensionEnabled !== false;
      hydratePageSettings(storedSettings);
      startOriginalScriptInterceptor();

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", reportPageScriptLoading);
      } else {
        reportPageScriptLoading();
      }

      if (typeof setInterval === "function") {
        setInterval(persistPageSettings, 2000);
      }
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("pagehide", persistPageSettings);
        window.addEventListener("beforeunload", persistPageSettings);
      }
    },
  );

  chrome.runtime.onMessage.addListener(
    (message, _messageSender, sendResponse) => {
      if (message.action === "GM_export") {
        try {
          const exportedData = {};
          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            const storedValue = localStorage.getItem(key);
            try {
              exportedData[key] = JSON.parse(storedValue);
            } catch (_error) {
              exportedData[key] = storedValue;
            }
          }
          sendResponse({
            success: true,
            data: JSON.stringify(exportedData, null, 2),
          });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }

      if (message.action === "GM_import") {
        try {
          const importedData =
            typeof message.data === "string"
              ? JSON.parse(message.data)
              : message.data;
          for (const key in importedData) {
            const value = importedData[key];
            localStorage.setItem(key, JSON.stringify(value));
          }
          persistPageSettings();
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }

      if (message.action === "GM_listKeys") {
        try {
          const keys = [];
          for (let index = 0; index < localStorage.length; index += 1) {
            keys.push(localStorage.key(index));
          }
          sendResponse({ success: true, data: keys });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }

      if (message.action === "GM_deleteKey") {
        try {
          localStorage.removeItem(message.key);
          persistPageSettings();
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }

      return undefined;
    },
  );
})();
