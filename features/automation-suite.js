/** Main player automation suite: UI enhancements, commands and scheduled tasks. */
!(function () {
  ((Array.prototype.baoremove = function (e) {
    if (isNaN(e) || e > this.length) return !1;
    this.splice(e, 1);
  }),
    (Array.prototype.remove = function (e) {
      e = this.indexOf(e);
      -1 < e && this.splice(e, 1);
    }),
    (String.prototype.replaceAll = function (e, t) {
      return this.replace(new RegExp(e, "gm"), t);
    }));
  var copyToClipboard = function (e) {
    var t = document.createElement("textarea");
    ((t.value = e),
      document.body.appendChild(t),
      t.select(),
      document.execCommand("Copy"),
      t.parentNode.removeChild(t));
  };
  let chatContainer = null;
  function smartAutoScroll() {
    (chatContainer =
      chatContainer || document.querySelector(".content-message")) &&
      chatContainer.scrollHeight -
        chatContainer.scrollTop -
        chatContainer.clientHeight <
        100 &&
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
  }
  function initObserver() {
    document.body
      ? new MutationObserver(function (e) {
          let o = !1;
          (e.forEach(function (e) {
            if ("childList" === e.type && 0 !== e.addedNodes.length) {
              chatContainer && chatContainer.contains(e.target) && (o = !0);
            }
          }),
            o && smartAutoScroll());
        }).observe(document.body, { childList: !0, subtree: !0 })
      : setTimeout(initObserver, 0);
  }
  function dateFormat(e, t) {
    var s,
      o,
      a = {
        "Y+": t.getFullYear().toString(),
        "m+": (t.getMonth() + 1).toString(),
        "d+": t.getDate().toString(),
        "H+": t.getHours().toString(),
        "M+": t.getMinutes().toString(),
        "S+": t.getSeconds().toString(),
      };
    for (o in a)
      (s = new RegExp("(" + o + ")").exec(e)) &&
        (e = e.replace(
          s[1],
          1 == s[1].length ? a[o] : a[o].padStart(s[1].length, "0"),
        ));
    return e;
  }
  function addWan(e, t, s, o) {
    var e = getDigit(e);
    return 3 < e
      ? (5 <= (e = e % 8) && (e = 4),
        Math.round(t / Math.pow(10, e + s - o)) / Math.pow(10, o) + "万")
      : Math.round(t / Math.pow(10, s - o)) / Math.pow(10, o);
  }
  function getDigit(e) {
    for (var t = -1; 1 <= e;) (t++, (e /= 10));
    return t;
  }
  function addChineseUnit(e, t) {
    t = null == t ? 2 : t;
    var s = Math.floor(e),
      o = getDigit(s),
      a = [];
    if (3 < o) {
      var i = Math.floor(o / 8);
      if (1 <= i) {
        o = Math.round(s / Math.pow(10, 8 * i));
        a.push(addWan(o, e, 8 * i, t));
        for (var n = 0; n < i; n++) a.push("亿");
        return a.join("");
      }
      return addWan(s, e, 0, t);
    }
    return e;
  }
  function getQueryVariable(e) {
    for (
      var t = window.location.search.substring(1).split("&"), s = 0;
      s < t.length;
      s++
    ) {
      var o = t[s].split("=");
      if (o[0] == e) return o[1];
    }
    return !1;
  }
  $(document).ready(function () {
    ((chatContainer = document.querySelector(".content-message")),
      initObserver());
  });
  let show_msg;
  var CanUse = !1,
    _ws,
    ws,
    ws_on_message,
    cmd_queue,
    cmd_busy,
    echo,
    _send_cmd,
    send_cmd,
    L =
      (WebSocket
        ? (console.log("插件可正常运行,Plugins can run normally"),
          (CanUse = !0),
          (show_msg = function (e) {
            ws_on_message({ type: "text", data: e });
          }),
          (_ws = WebSocket),
          (unsafeWindow.WebSocket = function (e) {
            ws = new _ws(e);
          }),
          (unsafeWindow.WebSocket.prototype = {
            CONNECTING: _ws.CONNECTING,
            OPEN: _ws.OPEN,
            CLOSING: _ws.CLOSING,
            CLOSED: _ws.CLOSED,
            get url() {
              return ws.url;
            },
            get protocol() {
              return ws.protocol;
            },
            get readyState() {
              return ws.readyState;
            },
            get bufferedAmount() {
              return ws.bufferedAmount;
            },
            get extensions() {
              return ws.extensions;
            },
            get binaryType() {
              return ws.binaryType;
            },
            set binaryType(e) {
              ws.binaryType = e;
            },
            get onopen() {
              return ws.onopen;
            },
            set onopen(e) {
              ws.onopen = e;
            },
            get onmessage() {
              return ws.onmessage;
            },
            set onmessage(e) {
              ((ws_on_message = e),
                (ws.onmessage = WG.receive_message),
                unsafeWindow.funny &&
                  null != unsafeWindow.funny.API &&
                  ((unsafeWindow.funny.API.ws_on_message = e),
                  (unsafeWindow.funny.API.websocket = ws)));
            },
            get onclose() {
              return ws.onclose;
            },
            set onclose(t) {
              ws.onclose = (e) => {
                (WG.stopPotentialWorkAutoCheck &&
                  WG.stopPotentialWorkAutoCheck(),
                  WG.resetMasterTaskAutomation &&
                    WG.resetMasterTaskAutomation(),
                  WG.resetActivityAutomation &&
                    WG.resetActivityAutomation(),
                  WG.resetYaotaAutomation && WG.resetYaotaAutomation(),
                  WG.resetLegacyStatusMonitors &&
                    WG.resetLegacyStatusMonitors(),
                  WG.resetDailyWorkflows && WG.resetDailyWorkflows(),
                  (WG.online = !1),
                  (G.connected = !1),
                  (auto_relogin = GM_getValue(
                    roleid + "_auto_relogin",
                    auto_relogin,
                  )),
                  t(e),
                  "开" == auto_relogin &&
                    setTimeout(() => {
                      (console.log(new Date()), KEY.do_command("score"));
                    }, 1e4));
              };
            },
            get onerror() {
              return ws.onerror;
            },
            set onerror(e) {
              ws.onerror = e;
            },
            send: function (e) {
              var t;
              if (
                (null == G.cookie && (G.cookie = e),
                -1 < e.indexOf(G.id) &&
                  !G.connected &&
                  (e = G.cookie + " " + G.id),
                G.cmd_echo &&
                  ((t = new Date().toLocaleTimeString()),
                  show_msg("<hic>" + t + "</hic> <hiy>" + e + "</hiy>")),
                "$" == e[0])
              )
                WG.SendCmd(e);
              else {
                if ("@" == e[0]) {
                  if (unsafeWindow && unsafeWindow.ToRaid)
                    return void ToRaid.perform(e);
                  (messageAppend(
                    "插件未安装,请访问 https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid 下载并安装",
                  ),
                    window.open(
                      "https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid ",
                      "_blank",
                    ).location);
                }
                switch (
                  ((0 != e.indexOf("jh ") && 0 != e.indexOf("go ")) ||
                    ("开" == auto_rewardgoto && WG.Send("tm " + e)),
                  e)
                ) {
                  case "sm":
                    T.sm();
                    break;
                  case "wk":
                    WG.zdwk();
                    break;
                  case "backup":
                    WG.make_config();
                    break;
                  case "load":
                    WG.load_config();
                    break;
                  default:
                    ws.send(e);
                }
              }
            },
            close: function () {
              ws.close();
            },
          }),
          (cmd_queue = []),
          (cmd_busy = !1),
          (echo = !1),
          (_send_cmd = function () {
            if (ws && 1 == ws.readyState)
              if (0 < cmd_queue.length) {
                cmd_busy = !0;
                for (
                  var e = new Date().getTime(), t = 0;
                  t < cmd_queue.length;
                  t++
                )
                  if (
                    !cmd_queue[t].timestamp ||
                    cmd_queue[t].timestamp >= e - 1300
                  ) {
                    cmd_queue.splice(0, t);
                    break;
                  }
                for (t = 0; t < Math.min(cmd_queue.length, 5); t++)
                  if (!cmd_queue[t].timestamp)
                    try {
                      (ws.send(cmd_queue[t].cmd), (cmd_queue[t].timestamp = e));
                    } catch (e) {
                      return ((cmd_busy = !1), void (cmd_queue = []));
                    }
                cmd_queue[cmd_queue.length - 1].timestamp
                  ? (cmd_busy = !1)
                  : setTimeout(_send_cmd, 100);
              } else cmd_busy = !1;
            else ((cmd_busy = !1), (cmd_queue = []));
          }),
          (send_cmd = function (e, t) {
            if (ws && 1 == ws.readyState)
              if (((e = e instanceof Array ? e : e.split(";")), t))
                for (var s, o = 0; o < e.length; o++)
                  (G.cmd_echo &&
                    ((s = new Date().toLocaleTimeString()),
                    show_msg("<hic>" + s + "</hic> <hiy>" + e[o] + "</hiy>")),
                    ws.send(e[o]));
              else {
                for (o = 0; o < e.length; o++)
                  cmd_queue.push({ cmd: e[o], timestamp: 0 });
                cmd_busy || _send_cmd();
              }
          }))
        : console.log(
            "插件不可运行,请打开'https://greasyfork.org/zh-CN/forum/discussion/41547/x'",
          ),
      {
        msg: function (e) {
          layer ? layer.msg(e, { offset: "50%", shift: 5 }) : messageAppend(e);
        },
        isMobile: function () {
          var e = navigator.userAgent,
            t =
              !e.match(/(iPad).*OS\s([\d_]+)/) &&
              e.match(/(iPhone\sOS)\s([\d_]+)/),
            e = e.match(/(Android)\s+([\d.]+)/);
          return t || e;
        },
      }),
    roomItemSelectIndex = -1;
  let itemKeys = [
      "name",
      "id",
      "count",
      "grade",
      "unit",
      "value",
      "can_eq",
      "can_use",
      "can_study",
      "can_open",
      "can_combine",
      "locked",
    ],
    eqKeys = ["name", "id", "grade", "can_use", "locked"],
    selllistKeys = ["name", "id", "count", "locked", "unit", "value"],
    storeKeys = [
      "name",
      "id",
      "count",
      "grade",
      "unit",
      "value",
      "can_eq",
      "can_use",
      "can_study",
      "can_open",
      "can_combine",
    ];
  var automationStaticData = unsafeWindow.WSMudPlugin.createService(
      "automation-static-data",
    ),
    timer = 0,
    cnt = 0,
    zb_npc,
    zb_place,
    next = 0,
    roomData = [],
    packData = [],
    storeData = [],
    eqData = [],
    store_list = [],
    lock_list = [],
    needfind = automationStaticData.getNeedFindRoutes(),
    pgoods = {},
    goods = {
      米饭: { id: null, type: "wht", sales: "店小二", place: "扬州城-醉仙楼" },
      包子: { id: null, type: "wht", sales: "店小二", place: "扬州城-醉仙楼" },
      鸡腿: { id: null, type: "wht", sales: "店小二", place: "扬州城-醉仙楼" },
      面条: { id: null, type: "wht", sales: "店小二", place: "扬州城-醉仙楼" },
      扬州炒饭: {
        id: null,
        type: "wht",
        sales: "店小二",
        place: "扬州城-醉仙楼",
      },
      米酒: { id: null, type: "wht", sales: "店小二", place: "扬州城-醉仙楼" },
      花雕酒: {
        id: null,
        type: "wht",
        sales: "店小二",
        place: "扬州城-醉仙楼",
      },
      女儿红: {
        id: null,
        type: "wht",
        sales: "店小二",
        place: "扬州城-醉仙楼",
      },
      醉仙酿: {
        id: null,
        type: "hig",
        sales: "店小二",
        place: "扬州城-醉仙楼",
      },
      神仙醉: {
        id: null,
        type: "hiy",
        sales: "店小二",
        place: "扬州城-醉仙楼",
      },
      布衣: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      钢刀: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      钢刀: {
        id: null,
        type: "wht",
        sales: "铁匠铺老板 铁匠",
        place: "扬州城-打铁铺",
      },
      木棍: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      英雄巾: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      布鞋: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      铁戒指: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      簪子: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      长鞭: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      钓鱼竿: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      鱼饵: {
        id: null,
        type: "wht",
        sales: "杂货铺老板 杨永福",
        place: "扬州城-杂货铺",
      },
      铁剑: {
        id: null,
        type: "wht",
        sales: "铁匠铺老板 铁匠",
        place: "扬州城-打铁铺",
      },
      铁棍: {
        id: null,
        type: "wht",
        sales: "铁匠铺老板 铁匠",
        place: "扬州城-打铁铺",
      },
      铁杖: {
        id: null,
        type: "wht",
        sales: "铁匠铺老板 铁匠",
        place: "扬州城-打铁铺",
      },
      铁镐: {
        id: null,
        type: "wht",
        sales: "铁匠铺老板 铁匠",
        place: "扬州城-打铁铺",
      },
      飞镖: {
        id: null,
        type: "wht",
        sales: "铁匠铺老板 铁匠",
        place: "扬州城-打铁铺",
      },
      hig金创药: {
        id: null,
        type: "hig",
        sales: "药铺老板 平一指",
        place: "扬州城-药铺",
      },
      hig引气丹: {
        id: null,
        type: "hig",
        sales: "药铺老板 平一指",
        place: "扬州城-药铺",
      },
    },
    equip = { 铁镐: 0 },
    npcs = {
      店小二: 0,
      "铁匠铺老板 铁匠": 0,
      "药铺老板 平一指": 0,
      "杂货铺老板 杨永福": 0,
    },
    place = automationStaticData.getPlaceRoutes(),
    mpz_path = automationStaticData.getMpzPath(),
    diff_colors = {
      normal: "",
      access:
        "https://cdn.jsdelivr.net/gh/mapleobserver/wsmud-script/plugins/wsmud_color_accessibility.css",
      flat: "https://cdn.jsdelivr.net/gh/mapleobserver/wsmud-script/plugins/wsmud_color_flat.css",
    },
    fb_path = [],
    drop_list = [],
    fenjie_list = [],
    blacklist = "",
    blackpfm = [],
    role,
    roleid,
    family = null,
    sm_loser = "开",
    sm_price = null,
    sm_getstore = null,
    sm_any = "开",
    wudao_pfm = "",
    ks_pfm = "2000",
    ks_wait = "120",
    automarry = null,
    autoKsBoss = null,
    stopauto = !1,
    getitemShow = null,
    zmlshowsetting = 0,
    bagFull = 0,
    pushSwitch = "关",
    pushType = "0",
    pushToken = "",
    auto_command = null,
    eqlist = {},
    skilllist = {},
    unauto_pfm = "",
    auto_pfmswitch = "开",
    auto_pfm_mode = "开",
    auto_rewardgoto = "关",
    busy_info = "关",
    saveAddr = "关",
    auto_updateStore = "关",
    auto_relogin = "关",
    autoeq = "",
    zml = [],
    zdy_item_store = "",
    zdy_item_store2 = "",
    zdy_item_lock = "",
    zdy_item_drop = "",
    zdy_item_fenjie = "",
    ztjk_item = [],
    zdyskills = "关",
    zdyskilllist = "",
    welcome = "",
    shieldswitch = "开",
    shield = "",
    shieldkey = "",
    statehml = "",
    backimageurl = "",
    loginhml = "",
    timequestion = [],
    silence = "开",
    pfmnum = 0,
    pfmdps = 0,
    dpssakada = "开",
    critical = 0,
    criticalnum = 0,
    dpslock = 0,
    battletime = 0,
    lastcri = 0,
    lastpfm = 0,
    funnycalc = "关",
    inzdy_btn = !1,
    zdy_btnlist = [],
    auto_buylist = "",
    auto_skillPaperSelllist = "",
    color_select = "normal",
    exit1 = void 0,
    exit2 = void 0,
    exit3 = void 0,
    KEY = unsafeWindow.WSMudPlugin.createService("automation-keyboard", {
      getWG: function () {
        return WG;
      },
      getG: function () {
        return G;
      },
      getButtonMode: function () {
        return inzdy_btn;
      },
      getJquery: function () {
        return $;
      },
      getDocument: function () {
        return document;
      },
      getWindow: function () {
        return window;
      },
      getTimers: function () {
        return {
          setTimeout: setTimeout,
        };
      },
      getKeyApi: function () {
        return KEY;
      },
      setExitState: function (primary, upper, lower) {
        exit1 = primary;
        exit2 = upper;
        exit3 = lower;
      },
    });
  function textBecomeImg(e, t, s) {
    var o = document.createElement("canvas"),
      a = 0,
      a =
        (t <= 32
          ? (a = 1)
          : 32 < t && t <= 60
            ? (a = 2)
            : 60 < t && t <= 80
              ? (a = 4)
              : 80 < t && t <= 100
                ? (a = 6)
                : 100 < t && (a = 10),
        (o.height = t + a),
        o.getContext("2d"));
    return (
      a.clearRect(0, 0, o.width, o.height),
      (a.fillStyle = s),
      (a.font = t + "px KaiTi"),
      (a.textBaseline = "middle"),
      a.fillText(e, 0, t / 2),
      (o.width = a.measureText(e).width),
      (a.fillStyle = s),
      (a.font = t + "px KaiTi"),
      (a.textBaseline = "middle"),
      a.fillText(e, 0, t / 2),
      o.toDataURL("image/png")
    );
  }
  function messageClear() {
    $(".WG_log pre").html("");
  }
  var log_line = 0;
  function textShow(e) {
    imgShow(textBecomeImg(e, 90, "red"));
  }
  function imgShow(e, t = 2e3) {
    ($(".container .content-message").css(
      "background",
      "url(" + e + ") no-repeat center center",
    ),
      setTimeout(() => {
        $(".container .content-message").css("background", "");
      }, t));
  }
  function messageAppend(e, t = 0, s = 0) {
    var o;
    s
      ? ((o = e + "\n"),
        1 == t
          ? (o = "<hiy>" + o + "</hiy>")
          : 2 == t
            ? (o = "<hig>" + o + "</hig>")
            : 3 == t
              ? (o = "<hiw>" + o + "</hiw>")
              : 4 == t && (o = "<hir>" + o + "</hir>"),
        $(".content-message pre").append(o))
      : (100 < log_line && ((log_line = 0), $(".WG_log pre").empty()),
        (o = e + "\n"),
        1 == t
          ? (o = "<hiy>" + o + "</hiy>")
          : 2 == t
            ? (o = "<hig>" + o + "</hig>")
            : 3 == t
              ? (o = "<hiw>" + o + "</hiw>")
              : 4 == t && (o = "<hir>" + o + "</hir>"),
        $(".WG_log pre").append(o),
        log_line++,
        ($(".WG_log")[0].scrollTop = 99999));
  }
  function syncAutomationStaticDataFromService() {
    needfind = reconcileAutomationStaticData(
      "needfind",
      needfind,
      automationStaticData.getNeedFindRoutes(),
      (value) => automationStaticData.setNeedFindRoutes(value),
    );
    place = reconcileAutomationStaticData(
      "place",
      place,
      automationStaticData.getPlaceRoutes(),
      (value) => automationStaticData.setPlaceRoutes(value),
    );
    mpz_path = reconcileAutomationStaticData(
      "mpz_path",
      mpz_path,
      automationStaticData.getMpzPath(),
      (value) => automationStaticData.setMpzPath(value),
    );
    sm_array = reconcileAutomationStaticData(
      "sm_array",
      sm_array,
      automationStaticData.getMasterTasks(),
      (value) => automationStaticData.setMasterTasks(value),
    );
  }
  function syncAutomationStaticDataToService() {
    automationStaticData.setNeedFindRoutes(needfind);
    automationStaticData.setPlaceRoutes(place);
    automationStaticData.setMpzPath(mpz_path);
    automationStaticData.setMasterTasks(sm_array);
    automationStaticDataSnapshot.needfind = needfind;
    automationStaticDataSnapshot.place = place;
    automationStaticDataSnapshot.mpz_path = mpz_path;
    automationStaticDataSnapshot.sm_array = sm_array;
  }
  function reconcileAutomationStaticData(
    key,
    legacyValue,
    serviceValue,
    setServiceValue,
  ) {
    var previousValue = automationStaticDataSnapshot[key];
    if (legacyValue !== previousValue) {
      setServiceValue(legacyValue);
      automationStaticDataSnapshot[key] = legacyValue;
      return legacyValue;
    }
    if (serviceValue !== previousValue) {
      automationStaticDataSnapshot[key] = serviceValue;
      return serviceValue;
    }
    return legacyValue;
  }
  var sm_array = automationStaticData.getMasterTasks(),
    automationStaticDataSnapshot = {
      needfind: needfind,
      place: place,
      mpz_path: mpz_path,
      sm_array: sm_array,
    },
    PackDataCodec = unsafeWindow.WSMudPlugin.createService("pack-data-codec", {
      getItemKeys: () => itemKeys,
      getEqKeys: () => eqKeys,
      getSelllistKeys: () => selllistKeys,
      getStoreKeys: () => storeKeys,
    }),
    WG = {
      online: !1,
      sm_state: -1,
      sm_item: null,
      sm_store: null,
      deserializePackData: PackDataCodec.deserializePackData,
      init: function () {
        $("li[command=SelectRole]").on("click", function () {
          WG.login();
        });
      },
      inArray: function (t, s) {
        for (let e = 0; e < s.length; e++) {
          var o = s[e];
          if ("<" == o[0]) {
            if (o == t) return !0;
          } else if ("" != o && 0 <= t.indexOf(o)) return !0;
        }
        return !1;
      },
      hasStr: function (t, s) {
        if (null == s.length) {
          for (var e in s) for (var o of s[e]) if (o == t) return !0;
        } else for (let e = 0; e < s.length; e++) if (s[e] == t) return !0;
        return !1;
      },
      set_value(e, t) {
        return GM_setValue(e, t);
      },
      get_value(e) {
        return GM_getValue(e);
      },
      login: function () {
        ((role = $(".role-list .select")
          .text()
          .split(/[\s\n]/)
          .pop()),
          (roleid = $(".role-list .select").attr("roleid")),
          GM_listValues().map(function (e) {
            var t;
            0 == e.indexOf(role + "_") &&
              ((t = e.split(role + "_")[1]),
              console.log(t),
              GM_setValue(roleid + "_" + t, GM_getValue(e, null)),
              GM_deleteValue(e));
          }),
          WG.loadDashboardSnapshot(),
          $(".bottom-bar").append(
            "<span class='item-commands' style='display:none'><span WG='WG' cmd=''></span></span>",
          ));
        var e = UI.wgui(),
          e =
            ($(".content-message").after(e),
            $(".content-bottom").after("<div class='zdy-commands'></div>"),
            GM_addStyle(`.zdy-item {
                    display: inline-block;
                    border: solid 1px gray;
                    color: gray;
                    background-color: black;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 0.5em;
                    min-width: 2.5em;
                    margin-right: 0.1em;
                    position: relative;
                    padding: 0.1em 0.3em;
                    margin-bottom: 2px;
                    transition: background-size 0.2s linear;
                    background: linear-gradient(to top, rgba(128, 128, 128, 0.5) 0%, rgba(128, 128, 128, 0.5) 100%);
                    background-size: 0% 100%;
                    background-position: 100% 100%;
                    background-repeat: no-repeat;
                }
                .zdy-commands {
                    white-space: nowrap;
                    overflow-x: auto;
                    display: block;
                    line-height: 2em;
                    margin-bottom: 0.25em;
                }
                .zdy-commands>.act-item {
                    display: inline-block;
                    border: solid 1px gray;
                    color: gray;
                    background-color: black;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 4px;
                    min-width: 2.5em;
                    margin-right: 0.5em;
                    position: relative;
                    padding-left: 0.4em;
                    padding-right: 0.4em;
                    margin-bottom: 2px;
                    /* transition: background-size 0.2s linear; */
                    background: linear-gradient(to top, rgba(128, 128, 128, 0.5) 0%, rgba(128, 128, 128, 0.5) 100%);
                    background-size: 0% 100%;
                    background-position: 100% 100%;
                    background-repeat: no-repeat;
                }
                .item-plushp{display: inline-block;float: right;width: 100px;}
                .item-dps{display: inline-block;float: right;width: 100px;}
                .settingbox {margin-left: 0.625 em;border: 1px solid gray;background-color: transparent;color: unset;resize: none;width: 80% ;height: 3rem;}
                .runtest textarea{display:block;width:300px;height:160px;border:10px solid #F8F8F8;border-top-width:0;padding:10px;line-height:20px;overflow:auto;background-color:#3F3F3F;color:#eee;font-size:12px;font-family:Courier New}
                .layui-btn,.layui-input,.layui-select,.layui-textarea,.layui-upload-button{outline:0;-webkit-appearance:none;transition:all .3s;-webkit-transition:all .3s;box-sizing:border-box}
                .layui-btn{display:inline-block;height:38px;line-height:38px;padding:0 18px;background-color:#009688;color:#fff;white-space:nowrap;text-align:center;font-size:14px;border:none;border-radius:2px;cursor:pointer}
                .layui-btn-normal{background-color:#1E9FFF}
                .layui-layer-moves{background-color:transparent}
                .switch2 {display: inline-block;position: relative;height: 1.25em;width: 3.125em;line-height: 1.25em;
                border-radius: 0.875em;background: #dedede;cursor: pointer;-ms-user-select: none;-moz-user-select: none;
                -webkit-user-select: none;user-select: none;vertical-align: middle;text-align: center;}
                .switch2 > .switch-button {position: absolute;left: 0px;height: 1.25em;width: 1.25em;
                border-radius: 0.875em;background: #fff;box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
                transition: 0.3s;-webkit-transition: 0.3s;left: 0px;}
                .switch2 > .switch-text {color:#898989;margin-left: 0.625em;}
                .on>.switch-button {right:0px;left:auto;}
                .on>.switch-text {color:#ffffff;margin-right: 0.625em;    margin-left: 0px;}
                .on {background-color:#008000;}
                .crit{
                    height:24px;
                    position:relative;
                    animation:myfirst 1s;
                    -webkit-animation:myfirst 0.4s; /* Safari and Chrome */
                }
                    @keyframes myfirst
                {
                    0%   {background:red; left:0px; top:0px;}
                    33% {background:red; left:0px; top:-14px;}
                    66% {background:red; left:0px; top:14px;}
                    100% {background:red; left:0px; top:0px;}
                }

                @-webkit-keyframes myfirst /* Safari and Chrome */
                {
                    0%   {background:red; left:0px; top:0px;}
                    33% {background:red; left:0px; top:-30px;}
                    100% {background:red; left:0px; top:0px;}
                }
                .rainbow-text{
                    color:red;
                    background-image: repeating-linear-gradient(45deg, violet, indigo, blue, green, yellow, orange, red, violet);
                    background-size:800% 800%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: rainbow 8s ease infinite;
                    -webkit-animation: rainbow 8s ease infinite;
                    font-weight: bold;
                }
                @keyframes rainbow
                {
                    0%{background-position:0% 50%}
                    50%{background-position:100% 25%}
                    100%{background-position:0% 50%}
                }
                @keyframes highlight-gradient {
                    0% {
                        background-position: 0% 50%;
                    }
                    100% {
                        background-position: 100% 50%;
                    }
                }
                
                .high-light-name {
                    animation:  highlight-gradient 5s infinite;
                    background: linear-gradient(90deg, #f0f, #0ff, #ff0, #f0f);
                    background-size: 200% 200%;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: bold;
                }
                #raidToolbar,
                #raidToolbar * {
                    box-sizing: content-box;
                }
                .WG_log * {
                    box-sizing: content-box;
                }
                    `),
            (npcs = GM_getValue("npcs", npcs)),
            (pgoods = GM_getValue("goods", goods)),
            (equip = GM_getValue(roleid + "_equip", equip)),
            GI.configInit(),
            "" != backimageurl &&
              GM_addStyle(`body{background-color:rgb(0,0,0,.25)}
                div{ opacity:1;}
                html{background:rgba(255,255,255,0.25);
                background-image:url('${backimageurl}');
                background-repeat:no-repeat;
                background-size:100% 100%;
                -moz-background-size:100% 100%;} `),
            (color_select = GM_getValue("color_select", color_select)),
            document.createElement("link"));
        ((e.rel = "stylesheet"),
          (e.type = "text/css"),
          (e.href = diff_colors[color_select]),
          document.getElementsByTagName("head")[0].appendChild(e),
          WG.initSideDashboard(),
          WG.initChatDrawer(),
          WG.initSideRailResizers(),
          WG.initPluginSettings(),
          WG.initFloatingToggleDrag(),
          $(".WG_floating_toggle").off("click").on("click", WG.showhideborad),
          $(".WG_floating_close")
            .off("click")
            .on("click", () => WG.setFloatingPanelOpen(false)),
          setTimeout(() => {
            try {
              GM_registerMenuCommand &&
                (GM_registerMenuCommand("初始化", WG.update_id_all),
                GM_registerMenuCommand("设  置", WG.setting),
                GM_registerMenuCommand("调  试", WG.cmd_echo_button));
            } catch (e) {}
            var e = "";
            ((document.title = role + "-MUD游戏-武神传说"),
              WG.ensureNativeControlsVisible(),
              KEY.do_command("pack"),
              setTimeout(() => {
                var t = role;
                (G.level &&
                  ((t = G.level + role), G.isGod()) &&
                  $(".zdy-item.zdwk").html("挂机(Y)"),
                  (t = welcome + "" + t),
                  CanUse
                    ? (("开" != shieldswitch && "开" != silence) ||
                        messageAppend("已注入屏蔽系统", 0, 1),
                      0 == npcs["店小二"]
                        ? (e = `
                                <hiy>欢迎${t},插件已加载！第一次使用,请在设置中,初始化ID,并且设置一下是否自动婚宴,自动传送boss
                                插件版本: ${GM_info.script.version}
                                </hiy>`)
                        : (e = `
                                <hiy>欢迎${t},插件已加载！
                                插件版本: ${GM_info.script.version}
                                </hiy>`),
                      WG.ztjk_func(),
                      WG.zml_showp(),
                      WG.dsj_func(),
                      setTimeout(() => {
                        WG.wsdelaytest();
                      }, 1e3),
                      G.level && G.isGod() && WG.ytjk_func())
                    : (e = `
                            <hiy>欢迎${role},插件未正常加载！
                            当前浏览器不支持自动喜宴自动boss,请使用centbrowser浏览器
                            谷歌系浏览器,请在network中勾选disable cache,多刷新几次,直至提示已加载!
                            多次刷新无法仍然出现本提示，请打开tampermonkey 插件设置
                            开启高级设置，在最下方实验 设置 “注入模式：即时”“严格模式：禁用”
                            实在不会用加群交流
                            插件版本: ${GM_info.script.version}
                            </hiy>`),
                  messageAppend(e));
              }, 500),
              KEY.do_command("showcombat"));
            (WG.setFloatingPanelOpen(
              localStorage.getItem("closeBorad") === "false",
            ),
              WG.runLoginhml(),
              setInterval(() => {
                var e = new Date(),
                  e = {
                    data: JSON.stringify({
                      type: "time",
                      h: e.getHours(),
                      m: e.getMinutes(),
                      s: e.getSeconds(),
                      time: e.toTimeString(),
                    }),
                  };
                WG.receive_message(e);
              }, 1e3));
          }, 1e3));
      },
      executeLegacyScript: function (source) {
        syncAutomationStaticDataFromService();
        try {
          return eval(source);
        } finally {
          syncAutomationStaticDataToService();
        }
      },
      zmlfire: async function (zml) {
        return WG.customWorkflows && WG.customWorkflows.zmlfire
          ? WG.customWorkflows.zmlfire(zml)
          : void 0;
      },
      zmlztjk: function () {
        return WG.customWorkflows && WG.customWorkflows.zmlztjk
          ? WG.customWorkflows.zmlztjk()
          : void 0;
      },
      zml_edit: function () {
        return WG.customWorkflows && WG.customWorkflows.zml_edit
          ? WG.customWorkflows.zml_edit()
          : void 0;
      },
      isseted: !1,
      zml_showp: function () {
        return WG.customWorkflows && WG.customWorkflows.zml_showp
          ? WG.customWorkflows.zml_showp()
          : void 0;
      },
      ztjk_edit: function () {
        ((ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item)),
          messageClear(),
          messageAppend(UI.ztjksetting),
          $(".ztjk_sharedfind").on("click", () => {
            var e = prompt("请输入分享码");
            S.getShareJson(e, (e) => {
              e = JSON.parse(e.json);
              null != e.type
                ? ($("#ztjk_name").val(e.name),
                  $("#ztjk_type").val(e.type),
                  $("#ztjk_action").val(e.action),
                  $("#ztjk_keyword").val(e.keyword),
                  $("#ztjk_ishave").val(e.ishave),
                  $("#ztjk_send").val(e.send),
                  $("#ztjk_senduser").val(e.senduser),
                  $("#ztjk_maxcount").val(e.maxcount),
                  $("#ztjk_istip").val(e.istip))
                : L.msg("不合法");
            });
          }),
          $(".ztjk_editadd").on("click", function () {
            var s = {
              name: $("#ztjk_name").val(),
              type: $("#ztjk_type").val(),
              action: $("#ztjk_action").val(),
              keyword: $("#ztjk_keyword").val(),
              ishave: $("#ztjk_ishave").val(),
              send: $("#ztjk_send").val(),
              senduser: $("#ztjk_senduser").val(),
              isactive: 1,
              maxcount: $("#ztjk_maxcount").val(),
              istip: $("#ztjk_istip").val(),
            };
            let o = !0;
            (ztjk_item.forEach(function (e, t) {
              e.name == $("#ztjk_name").val() && ((ztjk_item[t] = s), (o = !1));
            }),
              o && ztjk_item.push(s),
              GM_setValue(roleid + "_ztjk", ztjk_item),
              WG.ztjk_edit(),
              messageAppend("保存成功", 2),
              WG.ztjk_func());
          }),
          $(".ztjk_editdel").on("click", function () {
            let s = $("#ztjk_name").val();
            ztjk_item.forEach(function (e, t) {
              e.name == s &&
                (ztjk_item.baoremove(t),
                GM_setValue(roleid + "_ztjk", ztjk_item),
                WG.ztjk_edit(),
                messageAppend("删除成功", 2),
                WG.ztjk_func());
            });
          }),
          ztjk_item.forEach(function (e, t) {
            var s = "<span class='addrun" + t + "'>编辑" + e.name + "</span>",
              s = ($("#ztjk_show").append(s), "注入"),
              s =
                "<span class='setaction" +
                t +
                "'>" +
                (s = e.isactive && 1 == e.isactive ? "暂停" : s) +
                e.name +
                "</span>",
              s =
                ($("#ztjk_set").append(s),
                "<span class='shareztjk" + t + "'>分享" + e.name + "</span>");
            $("#ztjk_show").append(s);
          }),
          ztjk_item.forEach(function (e, t) {
            ($(".addrun" + t).on("click", function () {
              ($("#ztjk_name").val(e.name),
                $("#ztjk_type").val(e.type),
                $("#ztjk_action").val(e.action),
                $("#ztjk_keyword").val(e.keyword),
                $("#ztjk_ishave").val(e.ishave),
                $("#ztjk_send").val(e.send),
                $("#ztjk_senduser").val(e.senduser),
                $("#ztjk_maxcount").val(e.maxcount),
                null == e.istip && $("#ztjk_istip").val(1),
                $("#ztjk_istip").val(e.istip));
            }),
              $(".setaction" + t).on("click", function () {
                (0 <= this.textContent.indexOf("暂停")
                  ? (ztjk_item[t].isactive = 0)
                  : (ztjk_item[t].isactive = 1),
                  GM_setValue(roleid + "_ztjk", ztjk_item),
                  WG.ztjk_func(),
                  WG.ztjk_edit());
              }),
              $(".shareztjk" + t).on("click", function () {
                S.shareJson(G.id, e);
              }));
          }));
      },
      gpSkill_hook: void 0,
      getPlayerSkill: async function () {
        ((WG.gpSkill_hook = WG.add_hook("dialog", (t) => {
          t.dialog &&
            "skills" == t.dialog &&
            t.items &&
            null != t.items &&
            (messageAppend(`<div class="item-commands ">
                <span class = "copycha" data-clipboard-target = ".target1" >
                        技能详情复制到剪贴板 </span></div> `),
            $(".copycha").on("click", () => {
              var e = G.level.replace(/<\/?.+?>/g, "").replace(/ /g, ""),
                e = {
                  player: role,
                  roleid: roleid,
                  level: e,
                  family: G.pfamily,
                  items: t.items,
                };
              (copyToClipboard(JSON.stringify(e)), messageAppend("复制成功"));
            }),
            WG.remove_hook(WG.gpSkill_hook),
            (WG.gpSkill_hook = void 0));
        })),
          KEY.do_command("skills"),
          KEY.do_command("skills"),
          WG.Send("cha"));
      },
      make_config: async function () {
        let t = {};
        (GM_listValues().forEach((e) => {
          0 <= e.indexOf(roleid) && (t[e] = GM_getValue(e));
        }),
          (t._shieldswitch = GM_getValue("_shieldswitch", shieldswitch)),
          (t._shield = GM_getValue("_shield", shield)),
          (t._shieldkey = GM_getValue("_shieldkey", shieldkey)),
          (t._pushSwitch = GM_getValue("_pushSwitch", pushSwitch)),
          (t._pushType = GM_getValue("_pushType", pushType)),
          (t._pushToken = GM_getValue("_pushToken", pushToken)),
          S.uploadUserConfig(G.id, t, (e) => {
            "true" == e && L.msg("已成功上传");
          }));
      },
      load_config: async function () {
        S.getUserConfig(G.id, (e) => {
          if ("" != e) {
            var t,
              s = JSON.parse(e);
            for (t in s) GM_setValue(t, s[t]);
            (GI.configInit(),
              WG.setting(),
              WG.ztjk_func(),
              WG.zml_showp(),
              WG.dsj_func(),
              L.msg("已成功加载"));
          }
        });
      },
      setting: function () {
        var a,
          keyitem =
            (KEY.do_command("setting"),
            $(".footer-item")[$(".footer-item").length - 1].click(),
            0 == $(".dialog-extend .zdy_dialog").length &&
              ((a = UI.syssetting()), $(".dialog-extend").prepend(a)),
            $(".dialog-extend").off("click"),
            $("#family").off("change"),
            $("#wudao_pfm").off("focusout"),
            $(".savebtn").off("click"),
            $(".clear_skillJson").off("click"),
            $(".backup_btn").off("click"),
            $(".clean_dps").off("click"),
            $(".load_btn").off("click"),
            $(".update_store").off("click"),
            $(".update_id_all").off("click"),
            $(".clean_id_all").off("click"),
            $("#autobuy").off("change"),
            $("#autoSkillPaperSell").off("change"),
            $("#loginhml").off("change"),
            $("#backimageurl").off("change"),
            $("#statehml").off("change"),
            $("#shieldkey").off("focusout"),
            $("#shield").off("focusout"),
            $("#funnycalc").off("click"),
            $("#dpssakada").off("click"),
            $("#silence").off("click"),
            $("#zdyskilllist").off("change"),
            $("#zdyskillsswitch").off("click"),
            $("#shieldswitch").off("click"),
            $("#welcome").off("focusout"),
            $("#blacklist").off("change"),
            $("#auto_command").off("change"),
            $("#store_fenjie_info").off("change"),
            $("#store_drop_info").off("change"),
            $("#lock_info").off("change"),
            $("#store_info2").off("change"),
            $("#store_info").off("change"),
            $("#unauto_pfm").off("change"),
            $("#getitemShow").off("click"),
            $("#zmlshowsetting").off("change"),
            $("#bagFull").off("change"),
            $("pushSwitch").off("click"),
            $("pushType").off("change"),
            $("pushToken").off("change"),
            $("#autorelogin").off("click"),
            $("#autoupdateStore").off("click"),
            $("#saveAddr").off("click"),
            $("#autorewardgoto").off("click"),
            $("#autopfmswitch").off("click"),
            $("#auto_eq").off("change"),
            $("#ks_Boss").off("click"),
            $("#marry_kiss").off("click"),
            $("#ks_wait").off("focusout"),
            $("#ks_pfm").off("focusout"),
            $("#sm_getstore").off("click"),
            $("#sm_price").off("click"),
            $("#sm_any").off("click"),
            $("#sm_loser").off("click"),
            $(".dialog-extend").on("click", ".switch2", UI.switchClick),
            $("#family").change(function () {
              ((family = $("#family").val()),
                GM_setValue(roleid + "_family", family));
            }),
            $("#wudao_pfm").focusout(function () {
              ((wudao_pfm = $("#wudao_pfm").val()),
                GM_setValue(roleid + "_wudao_pfm", wudao_pfm));
            }),
            $("#sm_loser").click(function () {
              ((sm_loser = WG.switchReversal($(this))),
                GM_setValue(roleid + "_sm_loser", sm_loser));
            }),
            $("#sm_any").click(function () {
              ((sm_any = WG.switchReversal($(this))),
                GM_setValue(roleid + "_sm_any", sm_any));
            }),
            $("#sm_price").click(function () {
              ((sm_price = WG.switchReversal($(this))),
                GM_setValue(roleid + "_sm_price", sm_price));
            }),
            $("#sm_getstore").click(function () {
              ((sm_getstore = WG.switchReversal($(this))),
                GM_setValue(roleid + "_sm_getstore", sm_getstore));
            }),
            $("#ks_pfm").focusout(function () {
              ((ks_pfm = $("#ks_pfm").val()),
                GM_setValue(roleid + "_ks_pfm", ks_pfm));
            }),
            $("#ks_wait").focusout(function () {
              ((ks_wait = $("#ks_wait").val()),
                GM_setValue(roleid + "_ks_wait", ks_wait));
            }),
            $("#marry_kiss").click(function () {
              ((automarry = WG.switchReversal($(this))),
                GM_setValue(roleid + "_automarry", automarry));
            }),
            $("#ks_Boss").click(function () {
              ((autoKsBoss = WG.switchReversal($(this))),
                GM_setValue(roleid + "_autoKsBoss", autoKsBoss));
            }),
            $("#auto_eq").focusout(function () {
              ((autoeq = $("#auto_eq").val()),
                GM_setValue(roleid + "_auto_eq", autoeq));
            }),
            $("#autopfmswitch").click(function () {
              ((auto_pfmswitch = WG.switchReversal($(this))),
                GM_setValue(roleid + "_auto_pfmswitch", auto_pfmswitch),
                (G.auto_preform = "开" == auto_pfmswitch),
                WG.updateNativeAutoAttackActionState());
            }),
            $("#autopfmmode").click(function () {
              ((auto_pfm_mode = WG.switchReversal($(this))),
                GM_setValue(roleid + "_auto_pfm_mode", auto_pfm_mode),
                (G.auto_pfm_mode = "开" == auto_pfm_mode));
            }),
            $("#autorewardgoto").click(function () {
              ((auto_rewardgoto = WG.switchReversal($(this))),
                GM_setValue(roleid + "_auto_rewardgoto", auto_rewardgoto));
            }),
            $("#busyinfo").click(function () {
              ((busy_info = WG.switchReversal($(this))),
                GM_setValue(roleid + "_busy_info", busy_info));
            }),
            $("#saveAddr").click(function () {
              ((saveAddr = WG.switchReversal($(this))),
                GM_setValue(roleid + "_saveAddr", saveAddr));
            }),
            $("#autoupdateStore").click(function () {
              ((auto_updateStore = WG.switchReversal($(this))),
                GM_setValue(roleid + "_auto_updateStore", auto_updateStore));
            }),
            $("#autorelogin").click(function () {
              ((auto_relogin = WG.switchReversal($(this))),
                GM_setValue(roleid + "_auto_relogin", auto_relogin));
            }),
            $("#zmlshowsetting").change(function () {
              ((zmlshowsetting = $("#zmlshowsetting").val()),
                GM_setValue(roleid + "_zmlshowsetting", zmlshowsetting),
                WG.zml_showp());
            }),
            $("#bagFull").change(function () {
              ((bagFull = $("#bagFull").val()),
                GM_setValue(roleid + "_bagFull", bagFull));
            }),
            $("#pushSwitch").click(function () {
              ((pushSwitch = WG.switchReversal($(this))),
                GM_setValue("_pushSwitch", pushSwitch));
            }),
            $("#pushType").change(function () {
              ((pushType = $("#pushType").val()),
                GM_setValue("_pushType", pushType));
            }),
            $("#pushToken").focusout(function () {
              ((pushToken = $("#pushToken").val()),
                GM_setValue("_pushToken", pushToken));
            }),
            $("#color_select").change(function () {
              ((color_select = $("#color_select").val()),
                GM_setValue("color_select", color_select));
            }),
            $("#getitemShow").click(function () {
              ((getitemShow = WG.switchReversal($(this))),
                GM_setValue(roleid + "_getitemShow", getitemShow),
                (G.getitemShow = "开" == getitemShow));
            }),
            $("#unauto_pfm").change(function () {
              ((unauto_pfm = $("#unauto_pfm").val()),
                GM_setValue(roleid + "_unauto_pfm", unauto_pfm));
              var e,
                t = unauto_pfm.split(",");
              blackpfm = [];
              for (e of t) e && blackpfm.push(e);
            }),
            $("#store_info").change(function () {
              ((zdy_item_store = $("#store_info").val()),
                GM_setValue(roleid + "_zdy_item_store", zdy_item_store),
                (store_list = (store_list = zdy_item_store.split(",")).concat(
                  zdy_item_store2.split(","),
                )));
            }),
            $("#store_info2").change(function () {
              ((zdy_item_store2 = $("#store_info2").val()),
                GM_setValue(roleid + "_zdy_item_store2", zdy_item_store2),
                (store_list = (store_list = zdy_item_store2.split(",")).concat(
                  zdy_item_store.split(","),
                )));
            }),
            $("#lock_info").change(function () {
              ((zdy_item_lock = $("#lock_info").val()),
                GM_setValue(roleid + "_zdy_item_lock", zdy_item_lock),
                (lock_list = zdy_item_lock.split(",")));
            }),
            $("#store_drop_info").change(function () {
              ((zdy_item_drop = $("#store_drop_info").val()),
                GM_setValue(roleid + "_zdy_item_drop", zdy_item_drop),
                (drop_list = zdy_item_drop.split(",")));
            }),
            $("#store_fenjie_info").change(function () {
              ((zdy_item_fenjie = $("#store_fenjie_info").val()),
                GM_setValue(roleid + "_zdy_item_fenjie", zdy_item_fenjie),
                (fenjie_list = zdy_item_fenjie.split(",")));
            }),
            $("#auto_command").change(function () {
              ((auto_command = $("#auto_command").val()),
                GM_setValue(roleid + "_auto_command", auto_command));
            }),
            $("#blacklist").change(function () {
              ((blacklist = $("#blacklist").val()),
                GM_setValue(roleid + "_blacklist", blacklist));
            }),
            $("#welcome").focusout(function () {
              ((welcome = $("#welcome").val()),
                GM_setValue(roleid + "_welcome", welcome));
            }),
            $("#shieldswitch").click(function () {
              ((shieldswitch = WG.switchReversal($(this))),
                GM_setValue("_shieldswitch", shieldswitch),
                "开" == shieldswitch && messageAppend("已注入屏蔽系统", 0, 1));
            }),
            $("#zdyskillsswitch").click(function () {
              ((zdyskills = WG.switchReversal($(this))),
                GM_setValue(roleid + "_zdyskills", zdyskills),
                "开" == zdyskills &&
                  messageAppend(
                    "已开启自定义技能顺序，填写顺序后，请刷新游戏生效",
                    0,
                    1,
                  ));
            }),
            $("#zdyskilllist").change(function () {
              JSON.parse($("#zdyskilllist").val());
              if ((!1) instanceof Array) return (alert("无效的输入"), !1);
              ((zdyskilllist = $("#zdyskilllist").val()),
                GM_setValue(roleid + "_zdyskilllist", zdyskilllist));
            }),
            $("#silence").click(function () {
              ((silence = WG.switchReversal($(this))),
                GM_setValue(roleid + "_silence", silence),
                "开" == silence && messageAppend("已开启安静模式", 0, 1));
            }),
            $("#dpssakada").click(function () {
              ((dpssakada = WG.switchReversal($(this))),
                GM_setValue(roleid + "_dpssakada", dpssakada),
                "开" == dpssakada && messageAppend("已开启战斗统计", 0, 1));
            }),
            $("#funnycalc").click(function () {
              ((funnycalc = WG.switchReversal($(this))),
                GM_setValue(roleid + "_funnycalc", funnycalc),
                "开" == funnycalc && messageAppend("已开启FUNNY计算", 0, 1));
            }),
            $("#shield").focusout(function () {
              ((shield = $("#shield").val()), GM_setValue("_shield", shield));
            }),
            $("#shieldkey").focusout(function () {
              ((shieldkey = $("#shieldkey").val()),
                GM_setValue("_shieldkey", shieldkey));
            }),
            $("#statehml").change(function () {
              ((statehml = $("#statehml").val()),
                GM_setValue(roleid + "_statehml", statehml));
            }),
            $("#backimageurl").change(function () {
              ((backimageurl = $("#backimageurl").val()),
                GM_setValue(roleid + "_backimageurl", backimageurl),
                "" != backimageurl &&
                  (WG.SendCmd("setting backcolor none"),
                  GM_addStyle(`body{
              background-color:rgb(0,0,0,.25)
                }
                div{
                    opacity:1;
                }
                html{
                background:rgba(255,255,255,0.25);
                background-image:url('${backimageurl}');
                background-repeat:no-repeat;
                background-size:100% 100%;
                -moz-background-size:100% 100%;
            }
            `)));
            }),
            $("#loginhml").change(function () {
              ((loginhml = $("#loginhml").val()),
                GM_setValue(roleid + "_loginhml", loginhml));
            }),
            $("#autobuy").change(function () {
              ((auto_buylist = $("#autobuy").val()),
                GM_setValue(roleid + "_auto_buylist", auto_buylist));
            }),
            $("#autoSkillPaperSell").change(function () {
              ((auto_skillPaperSelllist = $("#autoSkillPaperSell").val()),
                GM_setValue(
                  roleid + "_auto_skillPaperSelllist",
                  auto_skillPaperSelllist,
                ));
            }),
            $(".update_id_all").on("click", WG.update_id_all),
            $(".clean_id_all").on("click", WG.clean_id_all),
            $(".update_store").on("click", WG.update_store),
            $(".backup_btn").on("click", WG.make_config),
            $(".load_btn").on("click", WG.load_config),
            $(".clean_dps").on("click", WG.clean_dps),
            $(".clear_skillJson").on("click", () => {
              (messageAppend("已关闭自定义，请刷新重新获取技能数据!"),
                (zdyskills = "关"),
                GM_setValue(roleid + "_zdyskilllist", ""),
                GM_setValue(roleid + "_zdyskills", zdyskills));
            }),
            $(".savebtn").on("click", function () {
              var e,
                t = [];
              for (e of keyitem) {
                var s = { name: "无", send: "" },
                  o = $("#name" + e).val(),
                  a = $("#send" + e).val();
                ("" != o && ((s.name = o), (s.send = a)), t.push(s));
              }
              ((zdy_btnlist = t),
                GM_setValue(roleid + "_zdy_btnlist", zdy_btnlist),
                messageAppend("保存自定义按钮成功"),
                WG.zdy_btnListInit());
            }),
            $("#family").val(family),
            $("#wudao_pfm").val(wudao_pfm),
            $("#sm_loser").val(sm_loser),
            $("#sm_any").val(sm_any),
            $("#sm_price").val(sm_price),
            $("#sm_getstore").val(sm_getstore),
            $("#ks_pfm").val(ks_pfm),
            $("#ks_wait").val(ks_wait),
            $("#marry_kiss").val(automarry),
            $("#ks_Boss").val(autoKsBoss),
            $("#auto_eq").val(autoeq),
            $("#autopfmswitch").val(auto_pfmswitch),
            $("#autopfmmode").val(auto_pfm_mode),
            $("#autorewardgoto").val(auto_rewardgoto),
            $("#busyinfo").val(busy_info),
            $("#saveAddr").val(saveAddr),
            $("#autoupdateStore").val(auto_updateStore),
            $("#autorelogin").val(auto_relogin),
            $("#zmlshowsetting").val(zmlshowsetting),
            $("#bagFull").val(bagFull),
            $("#pushSwitch").val(pushSwitch),
            $("#pushType").val(pushType),
            $("#pushToken").val(pushToken),
            $("#color_select").val(color_select),
            $("#getitemShow").val(getitemShow),
            $("#unauto_pfm").val(unauto_pfm),
            $("#store_info").val(zdy_item_store),
            $("#store_info2").val(zdy_item_store2),
            $("#lock_info").val(zdy_item_lock),
            $("#store_drop_info").val(zdy_item_drop),
            $("#store_fenjie_info").val(zdy_item_fenjie),
            $("#auto_command").val(auto_command),
            $("#blacklist").val(blacklist),
            $("#welcome").val(welcome),
            $("#shieldswitch").val(shieldswitch),
            $("#silence").val(silence),
            $("#dpssakada").val(dpssakada),
            $("#funnycalc").val(funnycalc),
            $("#shield").val(shield),
            $("#shieldkey").val(shieldkey),
            $("#statehml").val(statehml),
            $("#backimageurl").val(backimageurl),
            $("#loginhml").val(loginhml),
            $("#autobuy").val(auto_buylist),
            $("#autoSkillPaperSell").val(auto_skillPaperSelllist),
            $("#zdyskillsswitch").val(zdyskills),
            $("#zdyskilllist").val(zdyskilllist),
            ["Q", "W", "E", "R", "T", "Y"]),
          item;
        let zdybtni = 0;
        for (item of keyitem)
          ($("#name" + item).val(zdy_btnlist[zdybtni].name),
            $("#send" + item).val(zdy_btnlist[zdybtni].send),
            (zdybtni += 1));
        for (let w = $(".setting>.setting-item2"), t = 0; t < w.length; t++) {
          var s = $(w[t]),
            i = s.attr("for"),
            n;
          if (i) {
            syncAutomationStaticDataFromService();
            try {
              n = eval(i);
            } finally {
              syncAutomationStaticDataToService();
            }
          }
          "开" == n &&
            (s.find(".switch2").addClass("on"),
            s.find(".switch-text").html("开"));
        }
      },
      runLoginhml: function () {
        WG.SendCmd(loginhml);
      },
      selectLowKongfu: function (c = 0) {
        ((WG.gpSkill_hook = WG.add_hook("dialog", (e) => {
          if (e.dialog && "skills" == e.dialog && e.items && null != e.items) {
            var t,
              s = "jh fam 0 start,go west,go west,go north,go enter,go west,",
              o = "",
              a = "",
              i = "wakuang",
              n = (G.isGod() && (i = "xiulian"), []),
              l = [],
              d = c,
              r = ((0 != c && !isNaN(c)) || (d = e.limit), 0),
              m = [];
            for (t of e.items) {
              if (5 < r) break;
              (t.enable_skill && m.push(t.enable_skill),
                (WG.inArray(t.id, m) || 0 <= t.name.indexOf("基本")) &&
                  parseInt(t.level) < parseInt(d) &&
                  ((o += `lianxi ${t.id} ${d},`),
                  r < 4 && ((a += `lianxi ${t.id} ${d},`), l.push(t.name)),
                  n.push(t.name),
                  r++));
            }
            (("setting auto_work " + s + o + i).length <= 200
              ? (WG.Send("setting auto_work " + s + o + i),
                messageAppend("添加" + n.join(",") + "到" + d))
              : (WG.Send("setting auto_work " + s + a + i),
                messageAppend("添加" + l.join(",") + "到" + d)),
              messageAppend("添加成功,数据刷新后显示"),
              WG.remove_hook(WG.gpSkill_hook),
              (WG.gpSkill_hook = void 0));
          }
        })),
          KEY.do_command("skills"),
          KEY.do_command("skills"),
          WG.Send("cha"));
      },
      silentResponseMatchers: [],
      suppressNextResponse: function (matcher, timeout) {
        if (typeof matcher != "function") return;
        WG.silentResponseMatchers.push({
          matcher: matcher,
          expiresAt: Date.now() + (Number(timeout) || 5000),
        });
      },
      consumeSilentResponse: function (event) {
        var now = Date.now();
        for (
          var index = WG.silentResponseMatchers.length - 1;
          index >= 0;
          index--
        ) {
          var pending = WG.silentResponseMatchers[index];
          if (!pending || pending.expiresAt < now) {
            WG.silentResponseMatchers.splice(index, 1);
            continue;
          }
          try {
            if (pending.matcher(event)) {
              WG.silentResponseMatchers.splice(index, 1);
              return true;
            }
          } catch (error) {
            console.error("silent response matcher error", error);
            WG.silentResponseMatchers.splice(index, 1);
          }
        }
        return false;
      },
      hooks: [],
      hook_index: 0,
      add_hook: function (e, t) {
        e = { index: WG.hook_index++, types: e, fn: t };
        return (WG.hooks.push(e), e.index);
      },
      remove_hook: function (e) {
        for (var t = 0; t < this.hooks.length; t++)
          this.hooks[t].index == e && this.hooks.baoremove(t);
      },
      run_hook: function (e, t) {
        for (var s = 0; s < this.hooks.length; s++)
          try {
            var o = this.hooks[s];
            (o.types == t.type ||
              (o.types instanceof Array && 0 <= $.inArray(t.type, o.types))) &&
              o.fn(t);
          } catch (e) {
            console.error("hook error", e);
          }
      },
      receive_message: function (t) {
        if (t && t.data) {
          var s,
            e,
            o,
            a = function (e) {
              var t,
                s = {};
              for (t in e) s[t] = "object" == typeof e[t] ? a(e[t]) : e[t];
              return s;
            };
          if (
            ((s =
              "{" == t.data[0] || "[" == t.data[0]
                ? new Function("return " + t.data + ";")()
                : { type: "text", msg: t.data }),
            G.cmd_echo && "time" != s.type && console.log(s),
            G.yaotaFlag &&
              "string" == typeof s.msg &&
              0 <= (i = s.msg).indexOf("一股奇异的能量涌入你的体内，你获得") &&
              ((G.yaoyuan = G.yaoyuan + parseInt(i.replace(/[^0-9]/gi, ""))),
              $("#yt_prog").html(
                "<hiy>目前已获得 " + G.yaoyuan + " 妖元</hiy>",
              ),
              261 == G.yaoyuan) &&
              $("#yt_prog").html(
                "<hiy>目前已获得 " + G.yaoyuan + " 妖元，boss出现！</hiy>",
              ),
            "开" == silence)
          ) {
            if ("state" == s.type)
              if (null == s.silence)
                if (s.desc != [])
                  return (
                    (s.desc = []),
                    (s.silence = 1),
                    ((i = a(t)).data = JSON.stringify(s)),
                    WG.run_hook(s.type, s),
                    void ws_on_message.apply(this, [i])
                  );
            if ("text" == s.type) {
              var i = s.msg.split(
                /.*造成<wht>|.*造成<hir>|<\/wht>点|<\/hir>点/,
              );
              if (i[2])
                return (
                  (n = i[2].split(/伤害|\(|</)),
                  messageAppend(
                    `造成<wht>${i[1]}</wht>点<hir>${n[0]}</hir>伤害！`,
                    0,
                    1,
                  ),
                  void WG.run_hook(s.type, s)
                );
            }
          }
          if ("msg" == s.type && "开" == shieldswitch) {
            if (
              null != shield &&
              (0 <= shield.indexOf(s.name) || 0 <= shield.indexOf(s.uid))
            )
              return;
            for (e of shieldkey.split(","))
              if ("" != e && 0 <= s.content.indexOf(e)) return;
          }
          if ("text" == s.type)
            if ("开" == shieldswitch)
              for (o of shieldkey.split(","))
                if ("" != o && 0 <= s.msg.indexOf(o)) return;
          if ("dialog" == s.type && "fam" == s.t && null == s.k)
            if (null != UI.toui[s.index])
              return (
                (s.desc += "\n"),
                (s.desc += UI.toui[s.index]),
                (s.k = "knva"),
                ((i = a(t)).data = JSON.stringify(s)),
                WG.run_hook(s.type, s),
                void ws_on_message.apply(this, [i])
              );
          if (WG.captureEquipmentPickerResponse(s)) return;
          if (WG.consumeSilentResponse(s)) {
            WG.run_hook(s.type, s);
            return;
          }
          if (
            ("text" == s.type &&
              "什么？" == s.msg &&
              null != G.wsdelaySetTime &&
              (G.wsdelaySetCount <= 3
                ? ((G.wsdelaySetCount += 1),
                  (G.wsdelay =
                    null == G.wsdelay
                      ? new Date().getTime() - G.wsdelaySetTime
                      : (new Date().getTime() - G.wsdelaySetTime + G.wsdelay) /
                        2),
                  (G.wsdelaySetTime = new Date().getTime()),
                  WG.SendCmd("test"))
                : ((G.wsdelay =
                    (new Date().getTime() - G.wsdelaySetTime + G.wsdelay) / 2),
                  WG.SendCmd(
                    "tm 服务器到本地来回延迟约 " + G.wsdelay + " 毫秒",
                  ),
                  (G.wsdelaySetTime = void 0),
                  (G.wsdelaySetCount = void 0))),
            "dialog" == s.type && "fb" == s.t && null == s.k)
          )
            ((s.desc += "\n"),
              (s.desc += UI.fbui(fb_path[s.index], s.is_multi, s.is_diffi)),
              (s.k = "knva"),
              ((n = a(t)).data = JSON.stringify(s)),
              WG.run_hook(s.type, s),
              ws_on_message.apply(this, [n]));
          else if (
            "dialog" == s.type &&
            "pack" == s.dialog &&
            "item" == s.from &&
            null == s.k
          )
            ((i = s.desc.split("\n")[0]),
              (s.desc += "\n"),
              (s.desc += UI.itemui(i)),
              (s.k = "knva"),
              ((n = a(t)).data = JSON.stringify(s)),
              WG.run_hook(s.type, s),
              ws_on_message.apply(this, [n]));
          else {
            if ("perform" == s.type)
              if ("开" == zdyskills)
                return (
                  (zdyskilllist = GM_getValue(
                    roleid + "_zdyskilllist",
                    zdyskilllist,
                  )),
                  (s.skills = JSON.parse(zdyskilllist)),
                  ((i = a(t)).data = JSON.stringify(s)),
                  WG.run_hook(s.type, s),
                  void ws_on_message.apply(this, [i])
                );
            if (
              "cmds" == s.type &&
              unsafeWindow &&
              unsafeWindow.ToRaid &&
              0 <= JSON.stringify(s.items).indexOf("进入副本")
            ) {
              var n = s.items[0].cmd;
              let e = "";
              e = 0 <= n.indexOf("1 0") ? n.replaceAll("1 0", "1") : n + " 0";
              ((i = { name: "扫荡指定次数" }),
                (i =
                  ((i.cmd = `@js ($sdnum) =prompt("请输入次数,注意:若副本掉落物品过多,请不要输入超过50次,否则可能号没了","10")
                                    [if] (sdnum)!=null
                                      ${e} (sdnum)`),
                  s.items.push(i),
                  { name: "偷渡指定次数" })),
                (n =
                  ((i.cmd = `@js ($sdnum) =prompt("请输入次数","10")
                                    [if] (sdnum)!=null
                                      [while] (sdnum) !=0
                                        ($sdnum) = (sdnum)-1
                                        ${n}
                                        cr over`),
                  s.items.push(i),
                  a(t))));
              ((n.data = JSON.stringify(s)),
                WG.run_hook(s.type, s),
                void ws_on_message.apply(this, [n]));
            } else if (
              ("dialog" == s.type &&
                "pack" == s.dialog &&
                s.name &&
                !(function autoUse(o) {
                  if (
                    /养精丹|朱果|潜灵果|背包扩充石|小箱子|师门补给包|随从礼包|技能重置包/.test(
                      o.name,
                    )
                  ) {
                    let t = ["stopstate"];
                    var a = o.count;
                    let s = "use";
                    /小箱子|师门补给包|随从礼包|技能重置包/.test(o.name) &&
                      (s = "open");
                    for (let e = 0; e < a; e++)
                      t.push(`$wait 250;${s} ` + o.id);
                    $(".content-message pre").append(
                      $(
                        `<div class="item-commands"><span class="autouse">使用 ${o.name} ${a}次</span></div>`,
                      ).click(() => WG.SendCmd(t)),
                    );
                  }
                })(s),
              "room" != s.type || /桃花岛|慈航静斋/.test(s.name))
            )
              (WG.run_hook(s.type, s),
                ws_on_message.apply(this, arguments),
                unsafeWindow.funny &&
                  null != unsafeWindow.funny.API &&
                  unsafeWindow.funny.API.onmessage(t));
            else {
              let e = s.desc;
              (30 < e.length &&
                ((n = (i = e.replace(/<([^<]+)>/g, "")).substr(0, 30)),
                i.substr(30),
                (s.desc = `<span id="show">${n} <hic>»»»</hic></span><span id="more" style="display:none">${i}</span><span id="hide" style="display:none"> <hiy>«««</hiy></span>`)),
                e.includes("cmd") &&
                  ((e = (e = (e = (e = (e = e.replace(
                    "<hig>椅子</hig>",
                    "椅子",
                  )).replace(
                    "<CMD cmd='look men'>门(men)</CMD>",
                    "<cmd cmd='look men'>门</cmd>",
                  )).replace(/span/g, "cmd")).replace(/"/g, "'")).replace(
                    /\((.*?)\)/g,
                    "",
                  )),
                  console.log("desc" + e),
                  (n = e.match(/<cmd cmd='([^']+)'>([^<]+)<\/cmd>/g)),
                  console.log("cmds：" + n),
                  n.forEach((e) => {
                    e = e.match(/<cmd cmd='(.*)'>(.*)<\/cmd>/);
                    s.commands.unshift({
                      cmd: e[1],
                      name: `<hic>${e[2]}</hic>`,
                    });
                  }),
                  n.forEach((e) => (s.desc = `<hic>${e}</hic>　` + s.desc))));
              i = a(t);
              ((i.data = JSON.stringify(s)),
                WG.run_hook(s.type, s),
                ws_on_message.apply(this, [i]),
                $("#show").click(() => {
                  ($("#more").show(), $("#show").hide(), $("#hide").show());
                }),
                void $("#hide").click(() => {
                  ($("#more").hide(), $("#show").show(), $("#hide").hide());
                }));
            }
          }
        }
      },
    },
    UI = unsafeWindow.WSMudPlugin.createService("automation-ui-templates", {
      legacy: {
        getCustomButtonList: function () {
          return zdy_btnlist;
        },
        getLockedItems: function () {
          return lock_list;
        },
        getRaid: function () {
          return unsafeWindow.ToRaid;
        },
      },
    }),
    G = unsafeWindow.WSMudPlugin.createService("automation-state"),
    commandRuntime = unsafeWindow.WSMudPlugin.createService("command-engine", {
      WG: WG,
      G: G,
      L: L,
      services: {
        speech: {
          playtts: function (text) {
            return FakerTTS.playtts(text);
          },
        },
        beep: function () {
          return Beep();
        },
        MusicBox: function CommandMusicBox(options) {
          return new MusicBox(options);
        },
      },
      messageAppend: messageAppend,
      messageClear: messageClear,
      legacy: {
        getRoomData: function () {
          return roomData;
        },
        getPackData: function () {
          return packData;
        },
        getBlockedPerforms: function () {
          return blackpfm;
        },
        loadWorkflows: function () {
          zml = GM_getValue(roleid + "_zml", zml);
          return zml;
        },
        loadStatusMonitors: function () {
          ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item);
          return ztjk_item;
        },
        saveStatusMonitors: function () {
          GM_setValue(roleid + "_ztjk", ztjk_item);
        },
        getKeyApi: function () {
          return KEY;
        },
        performRaid: function (source) {
          var raid = unsafeWindow.ToRaid;
          return raid && raid.perform(source);
        },
      },
    }),
    T = commandRuntime.T,
    ProConsole = commandRuntime.ProConsole,
    ProtocolState = unsafeWindow.WSMudPlugin.createService(
      "automation-protocol-state",
      {
        getWG: function () {
          return WG;
        },
        getG: function () {
          return G;
        },
        getGI: function () {
          return GI;
        },
        clone: structuredClone,
        getJquery: function () {
          return $;
        },
        timers: {
          setTimeout: setTimeout,
          clearTimeout: clearTimeout,
        },
        storage: {
          get: function (key, fallback) {
            return arguments.length > 1
              ? GM_getValue(key, fallback)
              : GM_getValue(key);
          },
          set: function (key, value) {
            GM_setValue(key, value);
          },
        },
        getRoleId: function () {
          return roleid;
        },
        getWs: function () {
          return ws;
        },
        getMessageAppend: function () {
          return messageAppend;
        },
        getZdyskilllist: function () {
          return zdyskilllist;
        },
        setZdyskilllist: function (value) {
          zdyskilllist = value;
        },
        getBusyInfo: function () {
          return busy_info;
        },
        setBattleTime: function (value) {
          battletime = value;
        },
      },
    ),
    GI = {
      gcdThread: null,
      init: function () {
        var o = !1;
        (WG.add_hook(["dialog", "text"], function (e) {
          if ("dialog" == e.type) {
            (null == WG.packup_listener &&
              null != e.id &&
              null != e.store &&
              o &&
              (WG.SendCmd("store"), (o = !1)),
              (e = structuredClone(e)));
            var t = (e = WG.deserializePackData(e)).stores;
            if (null != t) {
              store_list = [];
              for (var s of t) store_list.push(s.name.toLowerCase());
              ((zdy_item_store = store_list.join(",")),
                $("#store_info").val(zdy_item_store),
                GM_setValue(roleid + "_zdy_item_store", zdy_item_store),
                (store_list = store_list.concat(zdy_item_store2.split(","))));
            }
          } else
            ((auto_updateStore = GM_getValue(
              roleid + "_auto_updateStore",
              auto_updateStore,
            )),
              null == WG.sort_hook &&
                "开" == auto_updateStore &&
                e.msg.indexOf("书架") < 0 &&
                (/^你把(.+)存入仓库。$/.test(e.msg) ||
                  /^你从仓库里取出(.+)。$/.test(e.msg)) &&
                (o = !0));
        }),
          WG.add_hook("dialog", function (e) {
            if (
              ("pack" == e.dialog &&
                null != e.items &&
                ((e = structuredClone(e)),
                (e = WG.deserializePackData(e)),
                (packData = e.items),
                (eqData = e.eqs),
                (G.eqs = e.eqs)),
              "pack" == e.dialog && null != e.uneq && (G.eqs[e.uneq] = null),
              "pack" == e.dialog &&
                null != e.eq &&
                (G.eqs[e.eq] = { id: e.id, name: "" }),
              "skills" == e.dialog)
            ) {
              if (
                (null != e.enable &&
                  "开" == zdyskills &&
                  (messageAppend("检测到更换技能,请刷新重新获取技能数据!"),
                  (zdyskills = "关"),
                  GM_setValue(roleid + "_zdyskilllist", ""),
                  GM_setValue(roleid + "_zdyskills", zdyskills)),
                e.items)
              )
                for (var t of e.items)
                  if (0 <= t.name.indexOf("基本"))
                    if (t.enable_skill) {
                      for (var s of G.enable_skills)
                        if (s.type == t.id) {
                          s.name = t.enable_skill;
                          break;
                        }
                    } else
                      for (var o of G.enable_skills)
                        if (o.type == t.id) {
                          o.name = "none";
                          break;
                        }
              if (null != e.enable)
                for (var a of G.enable_skills)
                  if (a.type == e.id) {
                    a.name = e.enable;
                    break;
                  }
            }
          }),
          ProtocolState.init(),
          WG.add_hook("state", function (e) {
            (WG.handlePotentialWorkState(e),
              console.dir(e),
              "state" != e.type ||
                null != e.state ||
                0 <= G.room_name.indexOf("副本") ||
                0 <= G.room_name.indexOf("襄阳") ||
                0 <= G.room_name.indexOf("矿山") ||
                0 <= G.room_name.indexOf("练功房") ||
                ((statehml = GM_getValue(roleid + "_statehml", statehml)),
                WG.SendCmd(statehml)));
          }),
          WG.add_hook("dialog", function (i) {
            if ("pack" == i.dialog && null != i.items && 0 <= i.items.length) {
              for (var e of i.items)
                e &&
                  e[0] &&
                  -1 < e[0].indexOf("铁镐") &&
                  (equip["铁镐"] = e[1]);
              for (var t of i.eqs)
                t &&
                  t[0] &&
                  -1 < t[0].indexOf("铁镐") &&
                  (equip["铁镐"] = t[1]);
            } else if ("pack" == i.dialog && null != i.desc) {
              messageClear();
              var o = i.desc.split("\n")[0];
              if (
                (messageAppend(
                  `<div class="item-commands ">
                <span class = "copyid" data-clipboard-target = ".target1" > ` +
                    o +
                    ":" +
                    i.id +
                    `复制到剪贴板 </span></div>
                         `,
                ),
                $(".copyid").off("click"),
                $(".copyid").on("click", () => {
                  var e = i.id;
                  (GM_setClipboard(e), messageAppend("复制成功"));
                }),
                i.desc)
              ) {
                var a = new RegExp(
                    "<hi[a-zA-Z]>\\s*(养精丹|朱果|潜灵果|背包扩充石|小箱子|师门补给包|随从礼包|技能重置包)\\s*</hi[a-zA-Z]>",
                    "i",
                  ),
                  a = i.desc.match(a);
                if (a) {
                  var a = a[1],
                    n = Role.findItem(a, !0, null, null);
                  let t = ["stopstate"];
                  var l = n.count || 1;
                  let s = "use";
                  /(小箱子|师门补给包|随从礼包|技能重置包)/.test(a)
                    ? (s = "open")
                    : /(养精丹|朱果|潜灵果)/.test(a) && (s = "eat");
                  for (let e = 0; e < l; e++) t.push(`$wait 250;${s} ` + i.id);
                  $(".content-message pre").append(
                    $(
                      `<div class="item-commands"><span class="autouse">使用 ${o} ${l}次</span></div>`,
                    ).click(() => WG.SendCmd(t)),
                  );
                }
              }
            } else if ("pack" == i.dialog && null != i.name) {
              n = { id: i.id, name: i.name, count: i.count };
              packData.push(n);
            } else if ("list" == i.dialog && null != i.stores)
              storeData = i.stores;
            else if ("list" == i.dialog && null != i.store) {
              let t = !0,
                s = null,
                o = null;
              for (let e = 0; e < packData.length; e++) {
                var d = packData[e];
                if (null != d && d.id == i.id) {
                  t = !1;
                  d = d.count - i.store;
                  0 == d ? (s = e) : (packData[e].count = d);
                  break;
                }
              }
              if (t)
                for (let e = 0; e < storeData.length; e++) {
                  var r = storeData[e];
                  if (null != r && r.id == i.storeid) {
                    r = { id: i.id, name: r.name, count: Math.abs(i.store) };
                    packData.push(r);
                    break;
                  }
                }
              let a = !0;
              for (let e = 0; e < storeData.length; e++) {
                var m = storeData[e];
                if (null != m && m.id == i.id) {
                  a = !1;
                  m = m.count + i.store;
                  0 === m ? (o = e) : (storeData[e].count = m);
                  break;
                }
              }
              if (a)
                for (let e = 0; e < packData.length; e++) {
                  var c = packData[e];
                  if (null != c && c.id === i.id) {
                    c = {
                      id: i.stroeid,
                      name: c.name,
                      count: Math.abs(i.store),
                    };
                    storeData.push(c);
                    break;
                  }
                }
              (null != s && packData.splice(s, 1),
                null != o && storeData.splice(o, 1));
            } else if ("pack" == i.dialog && null != i.jldesc) {
              a = i.jldesc.match(
                /<(.*)>(.*)<\/.*><br\/>精炼<(hig|hic|hiy|hiz|hio|ord)>＋(.*)\s</i,
              );
              if (a) {
                var o = a[1],
                  n = `<${o}>` + a[2] + `</${o}>`,
                  s = 13 - parseInt(a[4]);
                let t = [];
                for (let e = 0; e < s; e++) t.push(`jinglian ${i.id} ok`);
                $(".content-message pre").append(
                  $(
                    `<div class="item-commands"><span class="jinglian">精炼6星 => ${n}</span></div>`,
                  ).click(() => WG.SendCmd(t)),
                );
              }
            }
            if (
              "score" == i.dialog &&
              (null == i.id || null == G.id || i.id == G.id)
            ) {
              if (null != i.study_per) G.score2 = i;
              else if (null != i.limit_mp || null != i.level) {
                (console.log("score update"),
                  null != i.level && (G.level = i.level),
                  (G.score = Object.assign({}, G.score || {}, i)),
                  (WG.dashboardScoreRequestPending = false),
                  clearTimeout(WG.dashboardScoreRequestTimer),
                  WG.saveDashboardSnapshot());
                if (!G.family && null != i.family) {
                  ((G.pfamily = i.family),
                    (G.family = i.family.replaceAll("派", "")),
                    "无门无" == G.family && (G.family = "武馆"),
                    (family = G.family),
                    GM_setValue(roleid + "_family", G.family));
                }
              }
            }
          }),
          WG.add_hook(["dialog", "items"], (e) => {
            if ("dialog" == e.type) {
              if (e.selllist) {
                for (var t of e.selllist) {
                  var s = t.name.replace(/<[^>]+>/g, ""),
                    o = /<([^<>]*)>/.exec(t.name)[1];
                  (null != pgoods[s] && (pgoods[s].id = t.id),
                    null != pgoods[o + s] && (pgoods[o + s].id = t.id));
                }
                GM_setValue("goods", pgoods);
              }
            } else if ("items" == e.type)
              if (WG.at("扬州城-醉仙楼")) {
                for (var a of e.items)
                  if ("店小二" == a.name)
                    return (
                      (npcs["店小二"] = a.id),
                      void GM_setValue("npcs", npcs)
                    );
              } else
                for (var i of e.items) {
                  if ("店小二" == i.name) return;
                  if (null != npcs[i.name])
                    return (
                      (npcs[i.name] = i.id),
                      void GM_setValue("npcs", npcs)
                    );
                }
          }),
          WG.add_hook("msg", function (e) {
            var t, s;
            "sys" == e.ch
              ? ((t = GM_getValue(roleid + "_automarry", t)),
                0 <= e.content.indexOf("，婚礼将在一分钟后开始。") &&
                  (console.dir(e),
                  "开" == t && 0 == G.in_fight
                    ? stopauto || WG.at("副本")
                      ? (messageClear(),
                        messageAppend("<hiy>点击参加喜宴</hiy>"),
                        messageAppend(
                          "<div class=\"item-commands\"><span  id = 'onekeyjh'>参加喜宴</span></div>",
                        ),
                        $("#onekeyjh").on("click", function () {
                          WG.xiyan();
                        }))
                      : (console.log("xiyan"), WG.xiyan())
                    : ("关" != t && 1 != G.in_fight) ||
                      (messageClear(),
                      messageAppend(
                        "<hiy>点击参加喜宴,由于未开启自动传送,或者在战斗中,需要手动传送</hiy>",
                      ),
                      messageAppend(
                        "<div class=\"item-commands\"><span  id = 'onekeyjh'>参加喜宴</span></div>",
                      ),
                      $("#onekeyjh").on("click", function () {
                        WG.xiyan();
                      }))))
              : "rumor" == e.ch &&
                0 <= e.content.indexOf("听说") &&
                0 <= e.content.indexOf("出现在") &&
                0 <= e.content.indexOf("一带。") &&
                (console.dir(e),
                "开" == autoKsBoss && 0 == G.in_fight
                  ? stopauto || WG.at("副本")
                    ? ((s =
                        "<div class=\"item-commands\"><span id = 'onekeyKsboss'>传送到boss</span></div>"),
                      messageClear(),
                      messageAppend("boss已出现"),
                      messageAppend(s),
                      $("#onekeyKsboss").on("click", function () {
                        WG.kksBoss(e);
                      }))
                    : WG.kksBoss(e)
                  : ("关" != autoKsBoss && 1 != G.in_fight) ||
                    ((s =
                      "<div class=\"item-commands\"><span id = 'onekeyKsboss'>传送到boss</span></div>"),
                    messageClear(),
                    messageAppend(
                      "<hiy>boss已出现,由于未开启自动传送,或者在战斗中,需要手动传送</hiy>",
                    ),
                    messageAppend(s),
                    $("#onekeyKsboss").on("click", function () {
                      WG.kksBoss(e);
                    })));
          }),
          WG.add_hook("text", function (t) {
            if (
              (G.getitemShow &&
                (0 <= t.msg.indexOf("恭喜你得到") ||
                  (0 <= t.msg.indexOf("获得") &&
                    -1 == t.msg.indexOf("经验") &&
                    -1 == t.msg.indexOf("潜能") &&
                    -1 == t.msg.indexOf("提升")) ||
                  0 == t.msg.indexOf("你找到") ||
                  0 == t.msg.indexOf("你从") ||
                  (0 <= t.msg.indexOf("得到") &&
                    -1 == t.msg.indexOf("郭襄在得到倚天剑") &&
                    -1 == t.msg.indexOf("长白山得到剑谱"))) &&
                messageAppend(t.msg),
              (0 <= t.msg.indexOf("只能在战斗中使用。") ||
                -1 != t.msg.indexOf("这里不允许战斗") ||
                -1 != t.msg.indexOf("没时间这么做")) &&
                G.in_fight &&
                ((G.in_fight = !1), WG.auto_preform("stop"), WG.clean_dps()),
              0 <= t.msg.indexOf("加油，加油！！") &&
                0 == G.in_fight &&
                (WG.resetAutoFirstRoundCombat(),
                (G.in_fight = !0),
                WG.auto_preform()),
              0 <= t.msg.indexOf("你的内力不够，无法使用") &&
                null != G.preform_timer &&
                (WG.auto_preform("stop"),
                messageAppend("内力不足,停止自动出招", 1, 0)),
              "text" == t.type)
            ) {
              if (
                ((0 <= t.msg.indexOf(role + "身上东西太多了") ||
                  0 <= t.msg.indexOf("你身上东西太多了") ||
                  0 <= t.msg.indexOf("你拿不下那么多东西。")) &&
                  (WG.Send("tm 友情提示：请检查是否背包已满！"),
                  messageAppend("友情提示：请检查是否背包已满！", 1),
                  1 == bagFull
                    ? Beep()
                    : 2 == bagFull &&
                      FakerTTS.playtts(role + "，请检查是否背包已满！"),
                  0 <= WG.sm_state) &&
                  ((WG.sm_state = -1), $(".sm_button").text("师门(Q)")),
                0 <= t.msg.indexOf("长得") && 0 <= t.msg.indexOf("看起来"))
              ) {
                var s = t.msg.split("\n")[0].split(" ");
                let e = s[s.length - 1];
                0 <= e.indexOf("<") && (e = e.split("<")[0]);
                s = new Date().getMilliseconds();
                (messageAppend(
                  `<div class="item-commands"><span id="addshield${s}">屏蔽 ${e}</span></div>`,
                  0,
                  0,
                ),
                  $("#addshield" + s).on("click", function () {
                    ((shield =
                      "" != (shield = GM_getValue("_shield", shield))
                        ? shield + "," + e
                        : e),
                      GM_setValue("_shield", shield),
                      $("#shield").val(shield),
                      messageAppend("已屏蔽", 1, 1));
                  }));
              }
              var e;
              "开" == dpssakada &&
                (/.*造成<.*>.*<\/.*>点.*/.test(t.msg) &&
                  "你" !=
                    (e = (s = t.msg.split(
                      /.*造成<wht>|.*造成<hir>|<\/wht>点|<\/hir>点/,
                    ))[2].split(/伤害|\(|</))[2] &&
                  ("暴击" == e[0]
                    ? (lastcri = parseInt(s[1]))
                    : (lastpfm = parseInt(s[1])),
                  (dpslock = 1)),
                2 <=
                  (e = t.msg.split(
                    /看起来充满活力，一点也不累。|似乎有些疲惫，但是仍然十分有活力。|看起来可能有些累了。|动作似乎开始有点不太灵光，但是仍然有条不紊。|已经一副头重脚轻的模样，正在勉力支撑著不倒下去。|看起来已经力不从心了。|已经陷入半昏迷状态，随时都可能摔倒晕去。|似乎十分疲惫，看来需要好好休息了。|气喘嘘嘘，看起来状况并不太好。|摇头晃脑、歪歪斜斜地站都站不稳，眼看就要倒在地上。/,
                  )).length) &&
                (e[0].indexOf("你") < 0 &&
                  (0 < lastcri && ((critical += lastcri), (criticalnum += 1)),
                  0 < lastpfm) &&
                  ((pfmdps += lastpfm), (pfmnum += 1)),
                (lastpfm = lastcri = 0));
            }
          }),
          WG.add_hook("dialog", function (e) {
            "jh" == e.dialog && e.fbs && (fb_path = e.fbs);
          }),
          WG.add_hook(["text", "sc"], function (t) {
            if ("关" != funnycalc)
              if ("text" === t.type && /你的最大内力增加了/.test(t.msg)) {
                var e = t.msg.replace(/[^0-9]/gi, ""),
                  s = G.score,
                  o = s.max_mp,
                  s = s.limit_mp,
                  e = (s - o) / (6 * e);
                messageAppend(
                  `<hic class="remove_nl">你的最大内力从${o}到${s}还需${e < 60 ? parseInt(e) + "分钟" : `${parseInt(e / 60)}小时${parseInt(e % 60)}分钟`}。
</hic>`,
                  0,
                  1,
                );
              } else if ("sc" == t.type && t.id == G.id)
                null != t.max_mp &&
                  null != t.mp &&
                  ((G.score.max_mp = t.max_mp), (G.score.mp = t.mp));
              else if (
                "text" == t.type &&
                /你获得了(.*)点经验，(.*)点潜能/.test(t.msg)
              ) {
                o = t.msg.match(/获得了(.*)点经验，(.*)点潜能/);
                ((G.jy += parseInt(o[1])), (G.qn += parseInt(o[2])));
                let e = `<span class="remove_jy">共计获得了${G.jy}点经验和${G.qn}点潜能。
</span>`;
                setTimeout(
                  () =>
                    (function refresh_jy(e) {
                      ($(".remove_jy").remove(),
                        $(".content-message pre").append(e));
                    })(e),
                  200,
                );
              }
          }),
          WG.add_hook("roles", function (e) {
            (!(function sendRoles() {
              originWindow.source
                ? originWindow.source.postMessage(e.roles, "*")
                : setTimeout(sendRoles, 1e3);
            })(),
              setTimeout(() => {
                var t = getQueryVariable("login");
                if (t) {
                  var s = $("#role_panel > ul > li.content > ul >li");
                  for (let e = 0; e < s.length; e++)
                    t == e + 1
                      ? $(s[e]).addClass("select")
                      : $(s[e]).removeClass("select");
                  $("li[command=SelectRole]").click();
                }
              }, 5e3));
          }),
          WG.add_hook(
            [
              "login",
              "levelup",
              "items",
              "itemadd",
              "itemremove",
              "sc",
              "dialog",
              "text",
              "combat",
            ],
            function (event) {
              WG.syncDashboardAfterSkillProgress(event);
              if (
                event.type == "dialog" &&
                event.dialog == "score" &&
                (event.id == null || G.id == null || event.id == G.id)
              ) {
                WG.applyDashboardScoreSnapshot(event);
              } else if (event.type == "text" && event.msg) {
                var energyMatch = event.msg.match(/当前精力[：:]\s*(\d+)(?:\/(\d+))?/),
                  energyGainMatch = event.msg.match(
                    /你增加了\s*(\d+)\s*(?:点)?精力/,
                  ),
                  energySpentMatch = event.msg.match(
                    /你(?:已)?消耗(?:了)?(?:一个扫荡符[，,]\s*)?(\d+)\s*(?:点)?精力(?:快速完成|[。！!])?/,
                  ),
                  limitMpMatch = event.msg.match(/内力上限增加了\s*(\d+)/),
                  rewardMatch = event.msg.match(
                    /获得了(\d+)点经验[，,](\d+)点潜能/,
                  );
                /扫荡完成|精力快速完成/.test(event.msg) &&
                  WG.scheduleDashboardStateRefresh({ delay: 150 });
                if (energyMatch) {
                  var knownEnergy =
                    G.dashboardJingli ?? (G.score && G.score.jingli);
                  G.dashboardJingli = WG.mergeDashboardEnergyTotal(
                    knownEnergy,
                    energyMatch[1],
                  );
                } else if (energyGainMatch || energySpentMatch) {
                  var energyDelta = energyGainMatch
                      ? Number(energyGainMatch[1])
                      : -Number(energySpentMatch[1]),
                    mergedEnergy = WG.mergeDashboardEnergyDelta(
                      G.dashboardJingli ?? (G.score && G.score.jingli),
                      energyDelta,
                    );
                  if (mergedEnergy == null) WG.requestDashboardSnapshot();
                  else G.dashboardJingli = mergedEnergy;
                }
                if (limitMpMatch) {
                  G.score || (G.score = {});
                  if (G.score.limit_mp != null) {
                    G.score.limit_mp =
                      Number(G.score.limit_mp) + Number(limitMpMatch[1]);
                    WG.saveDashboardSnapshot();
                  } else WG.requestDashboardSnapshot();
                }
                if (rewardMatch && G.score) {
                  G.score.exp = Number(G.score.exp || 0) + Number(rewardMatch[1]);
                  G.score.pot = Number(G.score.pot || 0) + Number(rewardMatch[2]);
                }
              }
              WG.updateSideDashboard();
            },
          ));
      },
      configInit: function () {
        var e;
        ((family = GM_getValue(roleid + "_family", family)),
          (automarry = GM_getValue(roleid + "_automarry", automarry)),
          (autoKsBoss = GM_getValue(roleid + "_autoKsBoss", autoKsBoss)),
          (ks_pfm = GM_getValue(roleid + "_ks_pfm", ks_pfm)),
          (ks_wait = GM_getValue(roleid + "_ks_wait", ks_wait)),
          (eqlist = GM_getValue(roleid + "_eqlist", eqlist)),
          (skilllist = GM_getValue(roleid + "_skilllist", skilllist)),
          (autoeq = GM_getValue(roleid + "_auto_eq", autoeq)),
          null == family &&
            (family = $(".role-list .select").text().substr(0, 2)),
          (wudao_pfm = GM_getValue(roleid + "_wudao_pfm", wudao_pfm)),
          (sm_loser = GM_getValue(roleid + "_sm_loser", sm_loser)),
          (sm_any = GM_getValue(roleid + "_sm_any", sm_any)),
          (sm_price = GM_getValue(roleid + "_sm_price", sm_price)),
          (sm_getstore = GM_getValue(roleid + "_sm_getstore", sm_getstore)),
          (unauto_pfm = GM_getValue(roleid + "_unauto_pfm", unauto_pfm)),
          (auto_pfmswitch = GM_getValue(
            roleid + "_auto_pfmswitch",
            auto_pfmswitch,
          )),
          (auto_pfm_mode = GM_getValue(
            roleid + "_auto_pfm_mode",
            auto_pfm_mode,
          )),
          (auto_rewardgoto = GM_getValue(
            roleid + "_auto_rewardgoto",
            auto_rewardgoto,
          )),
          (busy_info = GM_getValue(roleid + "_busy_info", busy_info)),
          (saveAddr = GM_getValue(roleid + "_saveAddr", saveAddr)),
          (auto_updateStore = GM_getValue(
            roleid + "_auto_updateStore",
            auto_updateStore,
          )),
          (auto_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin)),
          (!(blacklist = GM_getValue(
            roleid + "_blacklist",
            blacklist,
          ))) instanceof Array && (blacklist = blacklist.split(",")),
          (getitemShow = GM_getValue(roleid + "_getitemShow", getitemShow)),
          (G.getitemShow = "开" == getitemShow),
          (zml = GM_getValue(roleid + "_zml", zml)),
          (zdy_item_store = GM_getValue(
            roleid + "_zdy_item_store",
            zdy_item_store,
          )),
          (zdy_item_store2 = GM_getValue(
            roleid + "_zdy_item_store2",
            zdy_item_store2,
          )),
          (zdy_item_lock = GM_getValue(
            roleid + "_zdy_item_lock",
            zdy_item_lock,
          )),
          (zdy_item_drop = GM_getValue(
            roleid + "_zdy_item_drop",
            zdy_item_drop,
          )),
          (zdy_item_fenjie = GM_getValue(
            roleid + "_zdy_item_fenjie",
            zdy_item_fenjie,
          )),
          zdy_item_store &&
            (store_list = store_list.concat(zdy_item_store.split(","))),
          zdy_item_store2 &&
            (store_list = store_list.concat(zdy_item_store2.split(","))),
          zdy_item_lock &&
            (lock_list = lock_list.concat(zdy_item_lock.split(","))),
          zdy_item_drop &&
            (drop_list = drop_list.concat(zdy_item_drop.split(","))),
          zdy_item_fenjie &&
            (fenjie_list = fenjie_list.concat(zdy_item_fenjie.split(","))),
          (ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item)),
          "开" == auto_pfmswitch && (G.auto_preform = !0),
          "开" == auto_pfm_mode && (G.auto_pfm_mode = !0),
          WG.updateNativeAutoAttackActionState(),
          (auto_command = GM_getValue(roleid + "_auto_command", auto_command)));
        for (e of unauto_pfm.split(",")) e && blackpfm.push(e);
        ((welcome = GM_getValue(roleid + "_welcome", welcome)),
          (shieldswitch = GM_getValue("_shieldswitch", shieldswitch)),
          (shield = GM_getValue("_shield", shield)),
          (shieldkey = GM_getValue("_shieldkey", shieldkey)),
          (statehml = GM_getValue(roleid + "_statehml", statehml)),
          (backimageurl = GM_getValue(roleid + "_backimageurl", backimageurl)),
          (loginhml = GM_getValue(roleid + "_loginhml", loginhml)),
          (timequestion = GM_getValue(roleid + "_timequestion", timequestion)),
          (silence = GM_getValue(roleid + "_silence", silence)),
          (dpssakada = GM_getValue(roleid + "_dpssakada", dpssakada)),
          (funnycalc = GM_getValue(roleid + "_funnycalc", funnycalc)),
          (auto_buylist = GM_getValue(roleid + "_auto_buylist", auto_buylist)),
          (auto_skillPaperSelllist = GM_getValue(
            roleid + "_auto_skillPaperSelllist",
            auto_skillPaperSelllist,
          )),
          (zdyskilllist = GM_getValue(roleid + "_zdyskilllist", zdyskilllist)),
          (zdyskills = GM_getValue(roleid + "_zdyskills", zdyskills)),
          (bagFull = GM_getValue(roleid + "_bagFull", bagFull)),
          (pushSwitch = GM_getValue("_pushSwitch", pushSwitch)),
          (pushType = GM_getValue("_pushType", pushType)),
          (pushToken = GM_getValue("_pushToken", pushToken)),
          (color_select = GM_getValue("color_select", color_select)),
          WG.zdy_btnListInit());
      },
    },
    S,
    FakerTTS,
    Beep,
    Push,
    MusicBox;
  var originWindow = {};
  var automationMessageMenu;
  $(document).ready(function () {
    function receiveMessage(event) {
      originWindow = event;
      return automationMessageMenu.receiveMessage(event);
    }
    function makeTp(e = 0) {
      return automationMessageMenu.makeTp(e);
    }
    function createSomeMenu() {
      return automationMessageMenu.createSomeMenu();
    }
    function executeLegacyScript(source) {
      syncAutomationStaticDataFromService();
      try {
        return eval(source);
      } finally {
        syncAutomationStaticDataToService();
      }
    }
    ($("head").append(
      '<link href="https://cdn.staticfile.org/jquery-contextmenu/3.0.0-beta.2/jquery.contextMenu.min.css" rel="stylesheet">',
    ),
      $("head").append(
        '<link href="https://cdn.staticfile.org/layer/2.3/skin/layer.css" rel="stylesheet">',
      ),
      $("head").append(
        '<link href="https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css" rel="stylesheet">',
      ),
      $("body").append(UI.codeInput),
      $("body").append(
        $('<audio id="beep-alert" preload="auto"></audio>').append(
          '<source src="https://cdn.jsdelivr.net/gh/mapleobserver/wsmud-script/plugins/complete.mp3" type="audio/mpeg">',
        ),
      ),
      setTimeout(() => {
        var e = document.createElement("script");
        (e.setAttribute("src", "https://cdn.staticfile.org/layer/2.3/layer.js"),
          document.head.appendChild(e),
          console.log("layer 加载完毕!"),
          setInterval(() => {
            var e = "";
            (parseInt(10 * Math.random()) < 3
              ? (e =
                  "<hir>【插件】有任何问题欢迎加入 武神传说-仙界 367657589 进行技术交流，脚本讨论。\n<hir>")
              : parseInt(10 * Math.random()) < 10 &&
                (e =
                  "<hir>【插件】欢迎访问 https://emeisuqing.github.io/wsmud.old/ 苏轻 助你武神之路上更加轻松愉快。\n<hir>"),
              parseInt(10 * Math.random()) < 2
                ? $(".channel pre").append(e)
                : console.log(""),
              ($(".channel")[0].scrollTop = 99999));
          }, 32e4));
      }, 2e3),
      (() => {
        var pluginRuntime = unsafeWindow.WSMudPlugin;
        if (!pluginRuntime)
          throw new Error("插件模块运行包未加载，停止初始化自动化套件");
        for (var featureName of [
          "notification-services",
          "automation-message-menu",
          "custom-workflows",
          "inventory-list-settings",
          "command-transport",
          "navigation-core",
          "wait-until-at",
          "activity-automation",
          "yaota-automation",
          "legacy-status-monitors",
          "master-task-automation",
          "daily-workflows",
          "data-maintenance",
          "custom-command-buttons",
          "equipment-loadouts",
          "wedding-automation",
          "yamen-automation",
          "room-state-bridge",
          "item-command-helpers",
          "inventory-cleanup",
          "warehouse-sorting",
          "medicine-automation",
          "item-use-automation",
          "sparring-recovery",
          "boss-hunter",
          "training-calculators",
          "combat-automation",
          "toolbox-scheduler",
          "role-switcher",
          "dashboard-equipment",
          "navigation-enhancements",
          "auto-first-round",
          "layout-controls",
          "ui-shell",
          "plugin-settings",
        ])
          if (!pluginRuntime.hasFeature(featureName))
            throw new Error("插件模块缺失: " + featureName);
        var pluginServices = {};
        pluginRuntime.installFeatures({
        WG: WG,
        G: G,
        UI: UI,
        T: T,
        L: L,
        services: pluginServices,
        jquery: $,
        clone: structuredClone,
        timers: {
          setTimeout: setTimeout,
          clearTimeout: clearTimeout,
          setInterval: setInterval,
          clearInterval: clearInterval,
        },
        confirm: function (message) {
          return window.confirm(message);
        },
        logger: console,
        getWG: function () {
          return WG;
        },
        getRoleName: function () {
          return role;
        },
        getRaid: function () {
          return unsafeWindow && unsafeWindow.ToRaid;
        },
        getTimer: function () {
          return timer;
        },
        getButtonMode: function () {
          return inzdy_btn;
        },
        getStopAuto: function () {
          return stopauto;
        },
        getNow: function () {
          return new Date();
        },
        deferred: function () {
          return jQuery.Deferred();
        },
        executeLegacyScript: executeLegacyScript,
        openWindow: function (url, target) {
          return window.open(url, target);
        },
        prompt: function (message, defaultValue) {
          return window.prompt(message, defaultValue);
        },
        messageAppend: messageAppend,
        messageClear: messageClear,
        storage: {
          get: function (key, fallback) {
            return arguments.length > 1
              ? GM_getValue(key, fallback)
              : GM_getValue(key);
          },
          set: function (key, value) {
            GM_setValue(key, value);
          },
        },
        legacy: {
          getRoleId: function () {
            return roleid;
          },
          getRoleName: function () {
            return role;
          },
          getWorkflows: function () {
            return zml;
          },
          setWorkflows: function (value) {
            zml = value;
          },
          getWorkflowDisplaySetting: function () {
            return zmlshowsetting;
          },
          setWorkflowDisplaySetting: function (value) {
            zmlshowsetting = value;
          },
          getCustomSkillList: function () {
            return zdyskilllist;
          },
          getCustomButtonList: function () {
            return zdy_btnlist;
          },
          setCustomButtonList: function (value) {
            zdy_btnlist = value;
          },
          getCustomButtonMode: function () {
            return inzdy_btn;
          },
          setCustomButtonMode: function (value) {
            inzdy_btn = value;
          },
          getEquipmentLoadouts: function () {
            return eqlist;
          },
          setEquipmentLoadouts: function (value) {
            eqlist = value;
          },
          getSkillLoadouts: function () {
            return skilllist;
          },
          setSkillLoadouts: function (value) {
            skilllist = value;
          },
          copyToClipboard: function (value) {
            return copyToClipboard(value);
          },
          getDisabledPerforms: function () {
            return unauto_pfm;
          },
          setDisabledPerforms: function (value) {
            unauto_pfm = value;
          },
          getBlockedPerforms: function () {
            return blackpfm;
          },
          getWudaoPerforms: function () {
            return wudao_pfm;
          },
          getPackGoods: function () {
            return pgoods;
          },
          getGoods: function () {
            return goods;
          },
          resetPackGoods: function () {
            pgoods = goods;
          },
          getNpcs: function () {
            return npcs;
          },
          getBossSettings: function () {
            return {
              blacklist: GM_getValue(roleid + "_blacklist", blacklist),
              pfmDelay: GM_getValue(roleid + "_ks_pfm", ks_pfm),
              waitSeconds: GM_getValue(roleid + "_ks_wait", ks_wait),
              autoEquipment: GM_getValue(roleid + "_auto_eq", autoeq),
            };
          },
          getBossRoutes: function () {
            return (needfind = reconcileAutomationStaticData(
              "needfind",
              needfind,
              automationStaticData.getNeedFindRoutes(),
              (value) => automationStaticData.setNeedFindRoutes(value),
            ));
          },
          getYamenNpc: function () {
            return zb_npc;
          },
          setYamenNpc: function (value) {
            zb_npc = value;
          },
          getYamenPlace: function () {
            return zb_place;
          },
          setYamenPlace: function (value) {
            zb_place = value;
          },
          getAutoCommand: function () {
            return GM_getValue(roleid + "_auto_command", auto_command);
          },
          replaceStoreList: function (value) {
            store_list = value;
          },
          setCustomStoreList: function (value) {
            zdy_item_store = value;
          },
          getEquipment: function () {
            return equip;
          },
          getPackData: function () {
            return packData;
          },
          getCustomStoreList2: function () {
            return zdy_item_store2;
          },
          setCustomStoreList2: function (value) {
            zdy_item_store2 = value;
          },
          getCustomItemLock: function () {
            return zdy_item_lock;
          },
          setCustomItemLock: function (value) {
            zdy_item_lock = value;
          },
          getCustomItemDrop: function () {
            return zdy_item_drop;
          },
          setCustomItemDrop: function (value) {
            zdy_item_drop = value;
          },
          getCustomItemDisassemble: function () {
            return zdy_item_fenjie;
          },
          setCustomItemDisassemble: function (value) {
            zdy_item_fenjie = value;
          },
          replaceLockList: function (value) {
            lock_list = value;
          },
          replaceDropList: function (value) {
            drop_list = value;
          },
          replaceDisassembleList: function (value) {
            fenjie_list = value;
          },
          getRoomData: function () {
            return roomData;
          },
          loadStatusMonitors: function () {
            ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item);
            return ztjk_item;
          },
          getPlaceRoutes: function () {
            return (place = reconcileAutomationStaticData(
              "place",
              place,
              automationStaticData.getPlaceRoutes(),
              (value) => automationStaticData.setPlaceRoutes(value),
            ));
          },
          getNeedFindRoutes: function () {
            return (needfind = reconcileAutomationStaticData(
              "needfind",
              needfind,
              automationStaticData.getNeedFindRoutes(),
              (value) => automationStaticData.setNeedFindRoutes(value),
            ));
          },
          getFamily: function () {
            return family;
          },
          formatDate: function (pattern, date) {
            return dateFormat(pattern, date);
          },
          getMasterTasks: function () {
            return (sm_array = reconcileAutomationStaticData(
              "sm_array",
              sm_array,
              automationStaticData.getMasterTasks(),
              (value) => automationStaticData.setMasterTasks(value),
            ));
          },
          getSmLoser: function () {
            return GM_getValue(roleid + "_sm_loser", sm_loser);
          },
          getSmGetStore: function () {
            return sm_getstore;
          },
          getSmAny: function () {
            return GM_getValue(roleid + "_sm_any", sm_any);
          },
          setSmAny: function (value) {
            sm_any = value;
          },
          getProcess: function () {
            return unsafeWindow && unsafeWindow.Process
              ? unsafeWindow.Process
              : undefined;
          },
          getSmPrice: function () {
            return sm_price;
          },
          getSaveAddress: function () {
            return saveAddr;
          },
          getStoreList: function () {
            return store_list;
          },
          getDropList: function () {
            return drop_list;
          },
          getAutoBuyList: function () {
            return auto_buylist;
          },
          getAutoSkillPaperSellList: function () {
            return auto_skillPaperSelllist;
          },
          getLockList: function () {
            return lock_list;
          },
          getDisassembleList: function () {
            return fenjie_list;
          },
          getKeyApi: function () {
            return KEY;
          },
          setRoomData: function (value) {
            roomData = value;
            if (unsafeWindow.roomData !== undefined) unsafeWindow.roomData = value;
          },
          getWorkTimer: function () {
            return timer;
          },
          setWorkTimer: function (value) {
            timer = value;
          },
          isTransportAvailable: function () {
            return CanUse;
          },
          getSendCommand: function () {
            return send_cmd;
          },
          setStopAuto: function (value) {
            stopauto = value;
          },
          getProConsole: function () {
            return ProConsole;
          },
          getPushSettings: function () {
            return {
              enabled: pushSwitch,
              type: pushType,
              token: pushToken,
            };
          },
          getRaid: function () {
            return unsafeWindow.ToRaid;
          },
          getTimeQuestions: function () {
            return timequestion;
          },
          setTimeQuestions: function (value) {
            timequestion = value;
          },
          getDpsState: function () {
            return {
              lock: dpslock,
              battleTime: battletime,
              normalCount: pfmnum,
              normalDamage: pfmdps,
              criticalCount: criticalnum,
              criticalDamage: critical,
            };
          },
          resetDpsState: function () {
            dpslock = criticalnum = critical = pfmnum = pfmdps = 0;
          },
          formatChineseUnit: function (value) {
            return addChineseUnit(value);
          },
          renderActionButtons: function () {
            return inzdy_btn ? UI.zdybtnui() : UI.btnui();
          },
        },
        });
        automationMessageMenu = pluginServices.automationMessageMenu;
        if (!automationMessageMenu)
          throw new Error("插件模块缺失: automation-message-menu 服务");
        S = pluginServices.remoteConfig;
        FakerTTS = pluginServices.speech;
        Beep = pluginServices.beep;
        Push = pluginServices.push;
        MusicBox = pluginServices.MusicBox;
      })(),
      KEY.init(),
      WG.init(),
      GI.init(),
      (unsafeWindow.WGRunNativeExtensionAction = WG.runNativeExtensionAction),
      (unsafeWindow.WGUpdateNativeAutoAttackActionState =
        WG.updateNativeAutoAttackActionState),
      (unsafeWindow.WG = WG),
      (unsafeWindow.T = T),
      (unsafeWindow.L = L),
      (unsafeWindow.G = G),
      (unsafeWindow.show_msg = show_msg),
      (unsafeWindow.messageClear = messageClear),
      (unsafeWindow.messageAppend = messageAppend),
      (unsafeWindow.send_cmd = send_cmd),
      (unsafeWindow.roomData = roomData),
      (unsafeWindow.MusicBox = MusicBox),
      (unsafeWindow.FakerTTS = FakerTTS),
      (unsafeWindow.Beep = Beep),
      (unsafeWindow.Push = Push),
      (unsafeWindow.WSStore = store),
      (unsafeWindow.imgShow = imgShow),
      window.addEventListener("message", receiveMessage, !1),
      $(".room-name").on("click", (e) => {
        (e.preventDefault(), $(".room-name").contextMenu({ x: 1, y: 1 }));
      }),
      $.contextMenu({
        selector: ".room-name",
        build: function (e, t) {
          return createSomeMenu();
        },
      }));
  });
})();
