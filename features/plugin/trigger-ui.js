/** Trigger configuration and Vue-backed message UI service. */
(function registerTriggerUi(global) {
  "use strict";

  global.WSMudPlugin.registerService("trigger-ui", function createTriggerUi(
    context,
  ) {
    const triggerCenter = context.triggerCenter;
    const templates = context.templates;
    const hostWindow = context.hostWindow || global;
    const getVue = context.getVue || (() => hostWindow.Vue);
    const getToRaid = context.getToRaid || (() => null);
    const messageAppend = context.messageAppend || (() => {});
    const messageClear = context.messageClear || (() => {});
    const storage = context.storage || {};
    const h = {
      append: (html) => messageAppend()(html),
      clean: () => messageClear()(),
    };
    let currentVue = null;

    function destroyVue() {
      if (currentVue && typeof currentVue.$destroy === "function") {
        currentVue.$destroy();
      }
      currentVue = null;
    }

    function mountVue(options) {
      destroyVue();
      const Vue = getVue();
      currentVue = new Vue(options);
      return currentVue;
    }

    const TriggerUI = {
      triggerHome: function () {
        (TriggerUI._appendHtml(
          "🍟 <hio>触发器</hio>",
          `
            <style>.breakText {word-break:keep-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}</style>
            <span class="zdy-item" style="width:120px; height:30px; line-height:30px; border-radius:0.5em; " v-for="t in triggers" :style="activeStyle(t)">
                <div style="width: 30px; float: left; background-color: rgba(255, 255, 255, 0.31); border-radius: 4px;" v-on:click="editTrigger(t)">⚙</div>
                <div class="breakText" style="width: 85px; float: right;" v-on:click="switchStatus(t)">{{ t.name }}</div>
            </span>
            `,
          "<span v-on:click='createTrigger()'><wht>新建</wht></span>",
        ),
          mountVue({
            el: "#app",
            data: { triggers: triggerCenter.getAll() },
            methods: {
              switchStatus: function (e) {
                (e.active()
                  ? triggerCenter.deactivate(e.name)
                  : triggerCenter.activate(e.name),
                  TriggerUI.triggerHome());
              },
              editTrigger: TriggerUI.editTrigger,
              activeStyle: function (e) {
                return e.active()
                  ? {
                      "background-color": "#a0e6e0",
                      border: "1px solid #7284ff",
                      color: "#001bff",
                    }
                  : {};
              },
              createTrigger: TriggerUI.selectTriggerTemplate,
            },
          }));
      },
      selectTriggerTemplate: function () {
        (TriggerUI._appendHtml(
          "<wht>选择触发事件</wht>",
          `
            <span class="zdy-item" style="width:120px; height:30px; line-height:30px; border-radius:0.5em;" v-for="t in templates" v-on:click="select(t)">{{ t.event }}</span>
            `,
          null,
          "<span v-on:click='back()'>< 返回</span>",
        ),
          mountVue({
            el: "#app",
            data: { templates: templates.getAll() },
            methods: { select: TriggerUI.createTrigger, back: TriggerUI.triggerHome },
          }));
      },
      createTrigger: function (template) {
        TriggerUI._updateTrigger(template);
      },
      editTrigger: function (trigger) {
        TriggerUI._updateTrigger(trigger.template, trigger);
      },
      _updateTrigger: function (template, trigger) {
        let saveAction = "<span v-on:click='save'><wht>保存</wht></span>",
          backAction =
            (trigger &&
              (saveAction = "<span v-on:click='remove'>删除</span>"),
            "<span v-on:click='back'>< 返回</span>"),
          conditions =
            (trigger &&
              (backAction = "<span v-on:click='saveback'>< 保存&返回</span>"),
            TriggerUI._appendHtml(
              `<input style='width:110px;border-radius:0.25em;' type="text" placeholder="输入触发器名称" v-model="name">`,
              `
            <div style="margin:0 2em 0 2em">
                <div style="float:left;width:120px;border-radius:0.5em;">
                    <span class="zdy-item" style="width:90px" v-for="f in filters">
                    <p style="margin:0"><wht>{{ f.description() }}</wht></p>
                    <input v-if="f.type=='input'" style="width:80%;border-radius:0.5em;" v-model="conditions[f.name]">
                    <select v-if="f.type=='select'" v-model="conditions[f.name]">
                        <option v-for="opt in f.options" :value="opt">{{ opt }}</option>
                    </select>
                    </span>
                </div>
                <div style="float:right;width:calc(100% - 125px)">
                    <textarea class = "settingbox hide" style = "height:10rem;display:inline-block;font-size:0.8em;width:100%;border-radius:0.5em;" v-model="source"></textarea>
                    <span class="raid-item shareTrigger" v-if="canShared" v-on:click="share()">分享此触发器</span>
                </div>
            </div>
            `,
              saveAction,
              backAction,
            ),
            {});
        if (null != trigger) conditions = trigger.conditions;
        else for (const filter of template.filters) conditions[filter.name] = filter.defaultValue;
        let source = template.introdution;
        if (null != trigger) source = trigger.source;
        mountVue({
          el: "#app",
          data: {
            filters: template.filters,
            name: trigger ? trigger.name : "",
            conditions,
            source,
            canShared: null != trigger,
          },
          methods: {
            save: function () {
              const result = triggerCenter.create(
                this.name,
                template.event,
                this.conditions,
                this.source,
              );
              result == 1 ? TriggerUI.triggerHome() : hostWindow.alert(result);
            },
            remove: function () {
              hostWindow.confirm("确认删除此触发器吗？") &&
                (triggerCenter.remove(trigger.name), TriggerUI.triggerHome());
            },
            back: function () {
              TriggerUI.selectTriggerTemplate();
            },
            saveback: function () {
              const result = triggerCenter.modify(
                trigger.name,
                this.name,
                this.conditions,
                this.source,
              );
              result == 1 ? TriggerUI.triggerHome() : hostWindow.alert(result);
            },
            share: function () {
              getToRaid().shareTrigger(triggerCenter._getData(trigger.name));
            },
          },
        });
      },
      _appendHtml: function (title, body, right, left) {
        destroyVue();
        left = `
            <div class = "item-commands" style="text-align:center" id="app">
                <div style="margin-top:0.5em">
                    <div style="width:8em;float:left;text-align:left;padding:0px 0px 0px 2em;height:1.23em" id="wsmud_raid_left">${null == left ? "" : left}</div>
                    <div style="width:calc(100% - 16em);float:left;text-align:center;height:1.23em">${title}</div>
                    <div style="width:8em;float:right;text-align:right;padding:0px 2em 0px 0px;height:1.23em" id="wsmud_raid_right">${null == right ? "" : right}</div>
                </div>
                <br><br>
                ${body}
            </div>`;
        h.clean();
        h.append(left);
      },
    };

    const TriggerConfig = {
      get: function () {
        const values = {};
        storage.listValues().forEach((key) => {
          key !== "roles" && (values[key] = storage.get(key));
        });
        return values;
      },
      set: function (values) {
        for (const key in values) storage.set(key, values[key]);
        triggerCenter.reload();
      },
    };

    return { TriggerUI, TriggerConfig, destroy: destroyVue };
  });
})(window);
