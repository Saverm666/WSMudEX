/** Raid server/network service with explicit runtime dependencies. */
(function registerRaidFlowServer(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-server",
    function createRaidFlowServer(context) {
      const gm = context.gm;
      const getRoleId = context.getRoleId;
      const getFlowStore = context.getFlowStore;
      const getWorkflowConfig = context.getWorkflowConfig;
      const getTriggerConfig = context.getTriggerConfig;
      const getTriggerCenter = context.getTriggerCenter;
      const messageAppend = context.messageAppend;
      const noticeMessage = context.noticeMessage;
      const getScriptVersion = context.getScriptVersion;
      const jquery = context.jquery || context.jQuery;
      const layer = context.layer;
      const alertRef = context.alert;

      const Server = {
        uploadConfig: function () {
          let t = {};
          (gm.listValues().forEach((e) => {
            "roles" != e && (t[e] = gm.getValue(e));
          }),
            null != getTriggerConfig() &&
              ((e = getTriggerConfig().get()), (t["@@@trigger"] = e)));
          var e = JSON.stringify(t);
          Server._sync(
            "uploadConfig",
            { id: getRoleId(), value: e },
            (e) => {
              (gm.setClipboard(e),
                alertRef(`wsmud_Raid 配置上传成功，该浏览器所有角色配置会在服务器保存 24 小时。
  配置获取码：${e}，已复制到系统剪切板。`),
                messageAppend(`<hiy>角色配置获取码：${e}</hiy>`),
                messageAppend(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${e}');" >
                                   我无法复制 </span></div>`));
            },
            (e) => {
              alertRef("wsmud_Raid 配置上传失败！");
            },
          );
        },
        downloadConfig: function (e) {
          Server._sync(
            "downloadConfig",
            { pass: e },
            (e) => {
              var t,
                o = JSON.parse(e);
              for (t in o)
                "@@@trigger" == t
                  ? null != getTriggerConfig() &&
                    getTriggerConfig().set(o[t])
                  : "roles" != t && gm.setValue(t, o[t]);
              alertRef("wsmud_Raid 配置下载成功！");
            },
            (e) => {
              alertRef("wsmud_Raid 配置下载失败！");
            },
          );
        },
        uploadFlows: function () {
          var e = getFlowStore().getAll(),
            t = getWorkflowConfig()._rootList(),
            t = JSON.stringify({ map: t, flows: e });
          Server._sync(
            "uploadFlows",
            { id: getRoleId(), value: t },
            (e) => {
              (gm.setClipboard(e),
                alertRef(`角色流程上传成功，该角色流程会在服务器保存 24 小时。
  角色流程获取码：${e}，已复制到系统剪切板。`),
                messageAppend(`<hiy>角色流程获取码：${e}</hiy>`),
                messageAppend(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${e}');" >
                                   我无法复制 </span></div>`));
            },
            (e) => {
              alertRef("角色流程上传失败！");
            },
          );
        },
        downloadFlows: function (e) {
          Server._sync(
            "downloadFlows",
            { pass: e },
            (e) => {
              e = JSON.parse(e);
              (getFlowStore().corver(e.flows),
                getWorkflowConfig()._rootList(e.map),
                alertRef("拷贝角色流程成功！"));
            },
            (e) => {
              alertRef("错误的角色流程获取码！");
            },
          );
        },
        uploadTriggers: function () {
          var e = getTriggerCenter().getAllData(),
            e = JSON.stringify(e);
          Server._sync(
            "uploadTriggers",
            { id: getRoleId(), value: e },
            (e) => {
              (gm.setClipboard(e),
                alertRef(`角色触发器上传成功，该角色触发会在服务器保存 24 小时。
  角色触发器获取码：${e}，已复制到系统剪切板。`),
                messageAppend(`<hiy>角色触发获取码：${e}</hiy>`),
                messageAppend(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${e}');" >
                                      我无法复制 </span></div>`));
            },
            (e) => {
              alertRef("角色触发器上传失败！");
            },
          );
        },
        downloadTriggers: function (e) {
          Server._sync(
            "downloadTriggers",
            { pass: e },
            (e) => {
              e = JSON.parse(e);
              (getTriggerCenter().corver(e),
                alertRef("拷贝角色触发器成功！"));
            },
            (e) => {
              alertRef("错误的角色触发器获取码！");
            },
          );
        },
        getNotice: function () {
          let o = "NoticeDataKey",
            n = gm.getValue(o, {
              version: "0.0.0",
              type: "0",
              value: "欢迎使用 wsmud_Raid",
            });
          Server._async("notice", { version: n.version, id: getRoleId() }, (e) => {
            let t = n;
            if (
              (e.version > n.version && (gm.setValue(o, e), (t = e)),
              "0" == t.type)
            )
              noticeMessage(`
                      <div>
                      <p><hig>Raid：</hig>${t.value}</p>
                      <p style="text-align:center">(v-${getScriptVersion()})</p>
                      </div>`);
            else {
              let e = "HideVersionNoticeKey";
              gm.getValue(e, null) != t.version &&
                layer.open({
                  type: 1,
                  skin: "layui-layer-rim",
                  area: ["380px"],
                  title: "wsmud_Raid 提示",
                  content: t.value,
                  offset: "auto",
                  shift: 2,
                  move: !1,
                  closeBtn: 0,
                  btn: ["确认", "不再显示"],
                  yes: function (e) {
                    layer.close(e);
                  },
                  btn2: function () {
                    gm.setValue(e, t.version);
                  },
                });
            }
          });
        },
        shareFlowTrigger: function (e, t, o, n) {
          var r = n,
            e = {
              username: (r.author = e),
              password: t,
              name: n.name,
              phone: "",
              type: o,
              value: JSON.stringify(r),
            };
          Server._sync(
            "uploadSingle",
            e,
            (e) => {
              (gm.setClipboard(e),
                alertRef(
                  o +
                    `分享成功，该${o}会在服务器保存 30 天
  每次下载会延长保存 始于下载时刻的 30 天
  分享码：${e}
  已复制到系统剪切板。`,
                ),
                messageAppend(`<hiy>${o}分享码：${e}</hiy>`),
                messageAppend(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${e}');" >
                                           我无法复制 </span></div>`));
            },
            (e) => {
              alertRef(e);
            },
          );
        },
        importFlow: function (e, o) {
          -1 == e.indexOf("·流程")
            ? alertRef("错误的流程分享码！")
            : ((e = { token: e }),
              Server._sync(
                "downloadSingle",
                e,
                (e) => {
                  var e = JSON.parse(e),
                    t = getWorkflowConfig().createWorkflow(e.name, e.source, o);
                  1 == t
                    ? messageAppend(`<hiy>导入流程 ${e.name} 成功！</hiy>`)
                    : alertRef(t);
                },
                (e) => {
                  alertRef("错误的流程分享码！");
                },
              ));
        },
        importTrigger: function (e) {
          -1 == e.indexOf("·触发")
            ? alertRef("错误的触发器分享码！")
            : ((e = { token: e }),
              Server._sync(
                "downloadSingle",
                e,
                (e) => {
                  var e = JSON.parse(e),
                    t = getTriggerCenter().create(
                      e.name,
                      e.event,
                      e.conditions,
                      e.source,
                      e.active,
                    );
                  1 == t
                    ? messageAppend(`<hiy>导入触发器 ${e.name} 成功！</hiy>`)
                    : alertRef(t);
                },
                (e) => {
                  alertRef("错误的触发器分享码！");
                },
              ));
        },
        _address: "wsmud.ii74.com/S",
        _async(e, t, o, n) {
          this._get(!0, e, t, o, n);
        },
        _sync(e, t, o, n) {
          this._get(!1, e, t, o, n);
        },
        _get(e, t, o, n, r) {
          jquery.ajax({
            type: "post",
            url: `https://${Server._address}/` + t,
            data: o,
            async: e,
            success: function (t) {
              if (200 == t.code) null != n && n(t.data);
              else {
                let e = t.code;
                (null != t.data && (e = t.data), null != r && r(e));
              }
            },
            dataType: "json",
          });
        },
        _getPhone(t, o) {
          jquery.ajax({
            type: "post",
            url: "/UserAPI/GetPhone",
            async: !0,
            xhrFields: { withCredentials: !0 },
            success: function (e) {
              e ? ((e = e.replace(/\"/g, "")), null != t && t(e)) : o(e);
            },
          });
        },
      };

      return { Server };
    },
  );
})(window);
