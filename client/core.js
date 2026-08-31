/** Registry for independently loaded game-client modules. */
(function initializeClientRuntime(global) {
  "use strict";

  if (global.WSMudClient) return;

  const definitions = new Map();

  function registerModule(name, create) {
    if (!name || typeof create !== "function") {
      throw new TypeError("客户端模块必须提供名称和创建函数");
    }
    if (definitions.has(name)) {
      throw new Error("客户端模块重复注册: " + name);
    }
    definitions.set(name, create);
  }

  function createModule(name, context) {
    const create = definitions.get(name);
    if (!create) throw new Error("客户端模块未注册: " + name);
    return create(context || {});
  }

  global.WSMudClient = Object.freeze({
    registerModule,
    createModule,
    hasModule: (name) => definitions.has(name),
  });
})(window);
