/** Legacy ztjk status monitors with explicit lifecycle ownership. */
(function registerLegacyStatusMonitors(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "legacy-status-monitors",
    function install(context) {
      const WG = context.WG;
      const G = context.G;
      const messageAppend = context.messageAppend;
      const clone = context.clone;
      const legacy = context.legacy || {};

      if (!WG || !G || typeof messageAppend !== "function") {
        throw new TypeError(
          "旧版状态监控需要显式 WG、G 和 messageAppend 上下文",
        );
      }
      if (typeof clone !== "function") {
        throw new TypeError("旧版状态监控需要显式 clone 上下文");
      }
      if (typeof legacy.loadStatusMonitors !== "function") {
        throw new TypeError("旧版状态监控需要 legacy.loadStatusMonitors");
      }
      if (typeof legacy.getRoomData !== "function") {
        throw new TypeError("旧版状态监控需要 legacy.getRoomData");
      }

      let monitorHook = WG.ztjk_hook;
      const previousHookDescriptor = Object.getOwnPropertyDescriptor(
        WG,
        "ztjk_hook",
      );
      const previousFunction = WG.ztjk_func;
      const previousReset = WG.resetLegacyStatusMonitors;

      function removeMonitorHook() {
        const hookId = monitorHook;
        monitorHook = undefined;
        if (hookId != null && typeof WG.remove_hook === "function") {
          WG.remove_hook(hookId);
        }
      }

      function loadMonitors() {
        return legacy.loadStatusMonitors();
      }

      function injectLegacyStatusMonitors() {
        removeMonitorHook();
        const monitors = loadMonitors();
        monitorHook = WG.add_hook(
          [
            "dispfm",
            "enapfm",
            "dialog",
            "room",
            "itemadd",
            "itemremove",
            "status",
            "text",
            "msg",
            "die",
            "combat",
            "sc",
          ],
          function handleLegacyStatusMonitor(event) {
            monitors.forEach(function (monitor) {
              if (1 != monitor.isactive || event.type != monitor.type)
                return;

              let keywordList = monitor.keyword.split("|");
              switch (monitor.type) {
                case "status":
                  if (event.name) {
                    if (monitor.action == event.action) {
                      for (const keyword of keywordList) {
                        if (
                          0 <= event.sid.indexOf(keyword) ||
                          0 <= event.name.indexOf(keyword)
                        ) {
                          if ("0" == monitor.ishave && event.id != G.id) {
                            if ("0" != monitor.istip)
                              messageAppend("已触发" + monitor.name, 1);
                            if (event.id) {
                              WG.SendCmd(
                                monitor.send.replace("{id}", event.id),
                              );
                            } else {
                              WG.SendCmd(monitor.send);
                            }
                          } else if ("1" == monitor.ishave && event.id == G.id) {
                            if (event.count != null && monitor.maxcount) {
                              if (
                                parseInt(event.count) <
                                parseInt(monitor.maxcount)
                              ) {
                                messageAppend(
                                  "当前层数" +
                                    event.count +
                                    ",已触发" +
                                    monitor.name,
                                  1,
                                );
                                if (event.id) {
                                  WG.SendCmd(
                                    monitor.send.replace("{id}", event.id),
                                  );
                                } else {
                                  WG.SendCmd(monitor.send);
                                }
                              }
                            } else {
                              if ("0" != monitor.istip)
                                messageAppend("已触发" + monitor.name, 1);
                              if (event.id) {
                                WG.SendCmd(
                                  monitor.send.replace("{id}", event.id),
                                );
                              } else {
                                WG.SendCmd(monitor.send);
                              }
                            }
                          }
                        }
                      }
                    }
                  } else if (monitor.action == event.action) {
                    for (const keyword of keywordList) {
                      if (0 <= event.sid.indexOf(keyword)) {
                        if ("0" == monitor.ishave && event.id != G.id) {
                          if ("1" == monitor.istip)
                            messageAppend("已触发" + monitor.name, 1);
                          if (event.id) {
                            WG.SendCmd(
                              monitor.send.replace("{id}", event.id),
                            );
                          } else {
                            WG.SendCmd(monitor.send);
                          }
                        } else if ("1" == monitor.ishave && event.id == G.id) {
                          if (event.count != null && monitor.maxcount) {
                            if (
                              parseInt(event.count) <
                              parseInt(monitor.maxcount)
                            ) {
                              if ("0" != monitor.istip)
                                messageAppend("已触发" + monitor.name, 1);
                              if (event.id) {
                                WG.SendCmd(
                                  monitor.send.replace("{id}", event.id),
                                );
                              } else {
                                WG.SendCmd(monitor.send);
                              }
                            }
                          } else {
                            if ("0" != monitor.istip)
                              messageAppend("已触发" + monitor.name, 1);
                            if (event.id) {
                              WG.SendCmd(
                                monitor.send.replace("{id}", event.id),
                              );
                            } else {
                              WG.SendCmd(monitor.send);
                            }
                          }
                        }
                      }
                    }
                  }
                  break;

                case "text":
                  for (const keyword of keywordList) {
                    if (0 <= event.msg.indexOf(keyword)) {
                      if ("0" != monitor.istip)
                        messageAppend("已触发" + monitor.name, 1);
                      if (event.msg) {
                        WG.SendCmd(
                          monitor.send.replace(
                            "{content}",
                            event.msg
                              .replaceAll("\n", "")
                              .replaceAll(",", "")
                              .replaceAll(";", ""),
                          ),
                        );
                      } else {
                        WG.SendCmd(monitor.send);
                      }
                    }
                  }
                  break;

                case "msg":
                  if (
                    monitor.senduser &&
                    "" != monitor.senduser &&
                    monitor.senduser != null
                  ) {
                    for (const sender of monitor.senduser.split("|")) {
                      if (event.name == sender) {
                        for (const keyword of keywordList) {
                          if (0 <= event.content.indexOf(keyword)) {
                            if ("0" != monitor.istip)
                              messageAppend("已触发" + monitor.name, 1);
                            if (event.content) {
                              WG.SendCmd(
                                monitor.send.replace(
                                  "{content}",
                                  event.content,
                                ),
                              );
                            } else {
                              WG.SendCmd(monitor.send);
                            }
                          }
                        }
                      } else if (
                        ("谣言" == sender && "rumor" == event.ch) ||
                        ("系统" == sender && "sys" == event.ch) ||
                        ("门派" == sender && "fam" == event.ch) ||
                        ("帮派" == sender && "pty" == event.ch)
                      ) {
                        for (const keyword of keywordList) {
                          if (0 <= event.content.indexOf(keyword)) {
                            if ("0" != monitor.istip)
                              messageAppend("已触发" + monitor.name, 1);
                            if (event.content) {
                              WG.SendCmd(
                                monitor.send.replace(
                                  "{content}",
                                  event.content,
                                ),
                              );
                            } else {
                              WG.SendCmd(monitor.send);
                            }
                          }
                        }
                      }
                    }
                  } else {
                    for (const keyword of keywordList) {
                      if (0 <= event.content.indexOf(keyword)) {
                        if ("0" != monitor.istip)
                          messageAppend("已触发" + monitor.name, 1);
                        if (event.content) {
                          WG.SendCmd(
                            monitor.send.replace(
                              "{content}",
                              event.content
                                .replaceAll("\n", "")
                                .replaceAll(",", "")
                                .replaceAll(";", ""),
                            ),
                          );
                        } else {
                          WG.SendCmd(monitor.send);
                        }
                      }
                    }
                  }
                  break;

                case "die":
                  if (event.commands != null) {
                    if ("0" != monitor.istip)
                      messageAppend("已触发" + monitor.name, 1);
                    WG.SendCmd(monitor.send);
                  }
                  break;

                case "itemadd":
                  for (const keyword of keywordList) {
                    if (0 <= event.name.indexOf(keyword)) {
                      if (2 == monitor.ishave && event.p != null) break;
                      if ("0" != monitor.istip)
                        messageAppend("已触发" + monitor.name, 1);
                      if (event.id) {
                        WG.SendCmd(monitor.send.replace("{id}", event.id));
                      } else {
                        WG.SendCmd(monitor.send);
                      }
                    }
                  }
                  break;

                case "room":
                  for (const keyword of keywordList) {
                    if (0 <= event.name.indexOf(keyword)) {
                      if ("0" != monitor.istip)
                        messageAppend("已触发" + monitor.name, 1);
                      WG.SendCmd(monitor.send.replace("{name}", event.name));
                      return;
                    }
                    for (const roomItem of legacy.getRoomData()) {
                      if (0 == roomItem) return;
                      if (
                        0 <= roomItem.name.indexOf(keyword) &&
                        roomItem.p == null
                      ) {
                        if ("0" != monitor.istip)
                          messageAppend("已触发" + monitor.name, 1);
                        WG.SendCmd(monitor.send.replace("{name}", event.name));
                        return;
                      }
                    }
                  }
                  break;

                case "dialog":
                  if (event.dialog && "pack" == event.dialog) {
                    const data = WG.deserializePackData(clone(event));
                    for (const keyword of keywordList) {
                      if (
                        data.name &&
                        0 <= data.name.indexOf(keyword)
                      ) {
                        if ("0" != monitor.istip)
                          messageAppend("已触发" + monitor.name, 1);
                        WG.SendCmd(monitor.send.replace("{id}", data.id));
                      }
                    }
                  }
                  break;

                case "combat":
                  for (const keyword of keywordList) {
                    if (
                      ("start" == keyword && 1 == event.start) ||
                      ("end" == keyword && 1 == event.end)
                    ) {
                      if ("0" != monitor.istip)
                        messageAppend("已触发" + monitor.name, 1);
                      WG.SendCmd(monitor.send);
                    }
                  }
                  break;

                case "sc": {
                  let item = G.items.get(G.id);
                  if ("0" == monitor.ishave) {
                    monitor.senduser;
                    const itemId = WG.find_item(monitor.senduser);
                    item = G.items.get(itemId);
                  }
                  if (
                    item &&
                    item.hp &&
                    (item.hp / item.max_hp) * 100 < parseInt(keywordList[0])
                  ) {
                    if ("0" != monitor.istip)
                      messageAppend("已触发" + monitor.name, 1);
                    WG.SendCmd(monitor.send);
                  }
                  if (
                    item &&
                    item.mp &&
                    (item.mp / item.max_mp) * 100 < parseInt(keywordList[1])
                  ) {
                    if ("0" != monitor.istip)
                      messageAppend("已触发" + monitor.name, 1);
                    WG.SendCmd(monitor.send);
                  }
                  break;
                }

                case "enapfm":
                  for (const keyword of keywordList) {
                    if (keyword == event.id) {
                      if ("0" != monitor.istip)
                        messageAppend("已触发" + monitor.name, 1);
                      WG.SendCmd(monitor.send);
                    }
                  }
                  break;

                case "dispfm":
                  for (const keyword of keywordList) {
                    if (keyword == event.id) {
                      if ("0" != monitor.istip)
                        messageAppend("已触发" + monitor.name, 1);
                      WG.SendCmd(monitor.send);
                    }
                  }
                  break;
              }
            });
          },
        );
        WG.ztjk_hook = monitorHook;
        messageAppend("已重新注入自动监控", 0, 1);
      }

      function resetLegacyStatusMonitors() {
        removeMonitorHook();
      }

      Object.defineProperty(WG, "ztjk_hook", {
        configurable: true,
        enumerable: true,
        get: () => monitorHook,
        set: (value) => {
          monitorHook = value;
        },
      });
      WG.ztjk_func = injectLegacyStatusMonitors;
      WG.resetLegacyStatusMonitors = resetLegacyStatusMonitors;

      const loginHook = WG.add_hook("login", resetLegacyStatusMonitors);

      return {
        resetLegacyStatusMonitors,
        stop: resetLegacyStatusMonitors,
        destroy() {
          if (loginHook != null && typeof WG.remove_hook === "function") {
            WG.remove_hook(loginHook);
          }
          resetLegacyStatusMonitors();
          if (WG.ztjk_func === injectLegacyStatusMonitors) {
            WG.ztjk_func = previousFunction;
          }
          if (WG.resetLegacyStatusMonitors === resetLegacyStatusMonitors) {
            WG.resetLegacyStatusMonitors = previousReset;
          }
          if (previousHookDescriptor) {
            Object.defineProperty(WG, "ztjk_hook", previousHookDescriptor);
          } else {
            delete WG.ztjk_hook;
          }
        },
      };
    },
  );
})(window);
