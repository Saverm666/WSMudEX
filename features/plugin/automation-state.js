/** Mutable state model shared by automation features. */
(function registerAutomationState(global) {
  "use strict";

  global.WSMudPlugin.registerService("automation-state", function create() {
    const state = {
      id: undefined,
      state: undefined,
      room_name: undefined,
      family: undefined,
      items: new Map(),
      stat_boss_success: 0,
      stat_boss_find: 0,
      stat_xiyan_success: 0,
      stat_xiyan_find: 0,
      cds: new Map(),
      in_fight: false,
      auto_preform: false,
      auto_pfm_mode: false,
      can_auto: false,
      level: undefined,
      getitemShow: undefined,
      wk_listener: undefined,
      potentialWorkSelectionPending: false,
      potentialWorkSelectionCancel: undefined,
      potentialWorkAutoCheckTimer: undefined,
      potentialWorkCurrentId: undefined,
      status: new Map(),
      score: undefined,
      yaoyuan: 0,
      yaotaFlag: false,
      yaotaCount: 0,
      jy: 0,
      qn: 0,
      selfStatus: [],
      wsdelaySetTime: undefined,
      wsdelaySetCount: undefined,
      wsdelay: undefined,
      enable_skills: [
        { type: "unarmed", name: "none" },
        { type: "force", name: "none" },
        { type: "parry", name: "none" },
        { type: "dodge", name: "none" },
        { type: "sword", name: "none" },
        { type: "throwing", name: "none" },
        { type: "blade", name: "none" },
        { type: "whip", name: "none" },
        { type: "club", name: "none" },
        { type: "staff", name: "none" },
      ],
      eqs: [],
      isGod: function () {
        return (
          state.level != null &&
          ["武帝", "武神", "剑神", "刀皇", "兵主", "战神"].some(
            function (title) {
              return state.level.indexOf(title) >= 0;
            },
          )
        );
      },
      cookie: undefined,
      connected: false,
    };
    return state;
  });
})(window);
