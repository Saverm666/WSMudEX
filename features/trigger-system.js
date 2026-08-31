(() => {
  const triggerEventBus = unsafeWindow.WSMudPlugin.createService(
    "trigger-event-bus",
  );
  const triggerCore = unsafeWindow.WSMudPlugin.createService(
    "trigger-core",
    {
      eventBus: triggerEventBus,
      getRoleId: function () {
        return unsafeWindow.Role.id;
      },
      perform: function (source, name, silent) {
        return unsafeWindow.ToRaid.perform(source, name, silent);
      },
      storage: {
        get: function (key, fallback) {
          return GM_getValue(key, fallback);
        },
        set: function (key, value) {
          return GM_setValue(key, value);
        },
      },
      logger: console,
    },
  );
  const templates = triggerCore.templates;
  const triggerCenter = triggerCore.TriggerCenter;
  let wg = null,
    messageAppend = null,
    messageClear = null,
    toRaid = null,
    role = null;
  const triggerMonitors = unsafeWindow.WSMudPlugin.createService(
    "trigger-monitors",
    {
      triggerCore,
      eventBus: triggerEventBus,
      getWG: function () {
        return wg;
      },
      getRole: function () {
        return role;
      },
      timers: { setTimeout, clearTimeout },
      Date,
    },
  );
  const triggerUi = unsafeWindow.WSMudPlugin.createService("trigger-ui", {
    triggerCenter,
    templates,
    hostWindow: unsafeWindow,
    getVue: function () {
      return unsafeWindow.Vue;
    },
    getToRaid: function () {
      return toRaid;
    },
    messageAppend: function () {
      return messageAppend;
    },
    messageClear: function () {
      return messageClear;
    },
    storage: {
      listValues: function () {
        return GM_listValues();
      },
      get: function (key) {
        return GM_getValue(key);
      },
      set: function (key, value) {
        return GM_setValue(key, value);
      },
    },
  });
  const monitorLifecycle = {
    run: function () {
      return triggerMonitors.run();
    },
    start: triggerMonitors.start,
    stop: triggerMonitors.stop,
    resetForRole: triggerMonitors.resetForRole,
  };
  let started = !1,
    activeRoleId = null,
    initialized = !1,
    initRetryTimer = null;
  function scheduleInit() {
    null == initRetryTimer &&
      (initRetryTimer = setTimeout(function () {
        initRetryTimer = null;
        __init__();
      }, 300));
  }
  function onLogin() {
    const nextRole = unsafeWindow.Role;
    if (null == nextRole || null == nextRole.id) return;
    role = nextRole;
    if (!started) {
      ((started = !0),
        (activeRoleId = nextRole.id),
        triggerCenter.run(),
        monitorLifecycle.start());
      return;
    }
    if (activeRoleId == nextRole.id) return;
    ((activeRoleId = nextRole.id),
      triggerCenter.reload(),
      monitorLifecycle.resetForRole());
  }
  function __init__() {
    ((wg = unsafeWindow.WG),
      (messageAppend = unsafeWindow.messageAppend),
      (messageClear = unsafeWindow.messageClear),
      (toRaid = unsafeWindow.ToRaid),
      null == wg || null == toRaid
        ? scheduleInit()
        : ((role = unsafeWindow.Role),
          (unsafeWindow.TriggerUI = triggerUi.TriggerUI),
          (unsafeWindow.TriggerConfig = triggerUi.TriggerConfig),
          (unsafeWindow.TriggerCenter = triggerCenter),
          initialized ||
            ((initialized = !0), wg.add_hook("login", onLogin))));
  }
  $(document).ready(function () {
    __init__();
  });
})();
