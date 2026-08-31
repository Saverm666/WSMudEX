/** Notification bus shared by trigger definitions and protocol monitors. */
(function registerTriggerEventBus(global) {
  "use strict";
  global.WSMudPlugin.registerService("trigger-event-bus", function create() {
    class Notification {
      constructor(name, params) {
        this.name = name;
        this.params = params;
      }
    }
    const observers = Object.create(null);
    let nextIndex = 0;
    return {
      Notification,
      observe(name, action) {
        const index = nextIndex++;
        observers[index] = { name, action };
        return index;
      },
      removeOberver(index) {
        delete observers[index];
      },
      post(notification) {
        Object.keys(observers).forEach((index) => {
          const observer = observers[index];
          if (observer.name === notification.name)
            observer.action(notification.params);
        });
      },
      clear() {
        Object.keys(observers).forEach((index) => delete observers[index]);
      },
    };
  });
})(window);
