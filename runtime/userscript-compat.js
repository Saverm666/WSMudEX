/** Tampermonkey/GreasyFork API compatibility layer backed by localStorage. */
let unsafeWindow = window,
  GM_info = {};
var httpRequest = new XMLHttpRequest();
function GM_addStyle(e) {
  try {
    var t = document.createElement("style");
    ((t.textContent = e),
      (
        document.head ||
        document.body ||
        document.documentElement ||
        document
      ).appendChild(t));
  } catch (e) {
    console.log("GM_addStyle: " + e);
  }
}
function GM_setValue(e, t) {
  try {
    localStorage.setItem(e, JSON.stringify(t));
  } catch (e) {
    console.log("GM_setValue: " + e);
  }
}
function GM_getValue(e, t) {
  e = localStorage.getItem(e);
  if (!e) return t;
  try {
    return JSON.parse(e);
  } catch (e) {
    return (console.log("GM_getValue: " + e), t);
  }
}
function GM_listValues() {
  var t = localStorage.length,
    o = [];
  for (let e = 0; e < t; e++) o.push(localStorage.key(e));
  return o;
}
function GM_deleteValue(e) {
  localStorage.removeItem(e);
}
function GM_setClipboard(e) {
  var t = document.createElement("input");
  (document.body.appendChild(t), (t.value = e), t.focus(), t.select());
  try {
    document.execCommand("copy");
  } catch (e) {
    console.log("GM_setClipboard: " + e.message);
  }
  (t.blur(), document.body.removeChild(t));
}
function GM_export(e = "wsmud_data.json") {
  try {
    var t = GM_listValues(),
      o = {};
    for (let e = 0; e < t.length; e++) o[t[e]] = GM_getValue(t[e]);
    var n = JSON.stringify(o, null, 2);
    return (
      console.log(n),
      "undefined" != typeof android &&
        android.exportToFile &&
        android.exportToFile(n, e),
      n
    );
  } catch (e) {
    return (console.log("GM_export: " + e.message), null);
  }
}
function GM_import(e) {
  try {
    var t,
      o = "string" == typeof e ? JSON.parse(e) : e;
    for (t in o) GM_setValue(t, o[t]);
    return (console.log("数据导入成功"), !0);
  } catch (e) {
    return (console.log("GM_import: " + e.message), !1);
  }
}
function GM_exportToFile() {
  return GM_export(
    "wsmud_data_" +
      new Date().toISOString().slice(0, 19).replace(/:/g, "-") +
      ".json",
  );
}
(httpRequest.open("GET", "http://wsmud.ii74.com/S/version", !0),
  httpRequest.send(),
  (httpRequest.onreadystatechange = function () {
    var e;
    4 == httpRequest.readyState &&
      200 == httpRequest.status &&
      ((e = httpRequest.responseText),
      console.log(e),
      (GM_info.script = JSON.parse(e)));
  }),
  (GM_info.script = { version: "" }));
