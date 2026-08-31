/** Plugin module registry for page-context features. */
(function initializePluginCore(global) {
  "use strict";

  if (global.WSMudPlugin) return;

  const definitions = new Map();
  const serviceDefinitions = new Map();
  const installed = new Map();
  const coreScriptUrl = document.currentScript && document.currentScript.src;

  if (coreScriptUrl && !document.querySelector("link[data-wsmud-plugin-styles]")) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL(
      "plugin-enhancements.css",
      coreScriptUrl,
    ).href;
    stylesheet.dataset.wsmudPluginStyles = "true";
    document.head.appendChild(stylesheet);
  }

  function registerFeature(name, install) {
    if (!name || typeof install !== "function") {
      throw new TypeError("插件模块必须提供名称和安装函数");
    }
    if (definitions.has(name)) {
      throw new Error("插件模块重复注册: " + name);
    }
    definitions.set(name, install);
  }

  function installFeatures(context) {
    for (const [name, install] of definitions) {
      if (installed.has(name)) continue;
      const lifecycle = install(context) || {};
      installed.set(name, lifecycle);
    }
  }

  function registerService(name, create) {
    if (!name || typeof create !== "function") {
      throw new TypeError("插件服务必须提供名称和创建函数");
    }
    if (serviceDefinitions.has(name)) {
      throw new Error("插件服务重复注册: " + name);
    }
    serviceDefinitions.set(name, create);
  }

  function createService(name, context) {
    const create = serviceDefinitions.get(name);
    if (!create) throw new Error("插件服务未注册: " + name);
    return create(context || {});
  }

  function destroyFeatures() {
    const entries = Array.from(installed.entries()).reverse();
    for (const [name, lifecycle] of entries) {
      if (typeof lifecycle.destroy === "function") lifecycle.destroy();
      installed.delete(name);
    }
  }

  global.WSMudPlugin = Object.freeze({
    registerFeature,
    registerService,
    createService,
    installFeatures,
    destroyFeatures,
    hasFeature: (name) => definitions.has(name),
    hasService: (name) => serviceDefinitions.has(name),
    isInstalled: (name) => installed.has(name),
  });
})(window);
