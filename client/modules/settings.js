/** Client preferences and login form helpers. */
(function registerSettingsModule(global) {
  "use strict";
  global.WSMudClient.registerModule("settings", function create(context) {
    const { jquery, documentRef } = context;
    const hostWindow = context.hostWindow || global;
    let autoWorkState = false;
    function scriptKey() {
      const player = context.getProcess().player;
      return player ? "WSMudEX_auto_work_script_" + player : null;
    }
    function isClientScript(value) {
      return typeof value === "string" && value.trim().startsWith("#");
    }
    function storedScript(value) {
      const key = scriptKey();
      if (!key) return "";
      try {
        if (value === undefined) return hostWindow.localStorage.getItem(key) || "";
        if (value) hostWindow.localStorage.setItem(key, value);
        else hostWindow.localStorage.removeItem(key);
      } catch (error) {
        console.log("中断后客户端脚本存储失败：", error);
      }
      return value || "";
    }
    const MAP_DIR_EXITS = { left: ["west", "westup", "westdown"], right: ["east", "eastup", "eastdown"], up: ["north", "northup", "northdown", "up"], down: ["south", "southup", "southdown", "down"], leftup: ["northwest"], leftdown: ["southwest"], rightup: ["northeast"], rightdown: ["southeast"] };
    const Setting = { keep_msg: 0, show_hpnum: 0, show_hp: 0, item_autoheight: 0, hide_roomdesc: 0, exits_dir: 0, show_sa: 0, show_command: 0, fontsize: "0.875rem", font: "", no_spmsg: 0, fontcolor: "#008000", backcolor: "black", auto_showcombat: 0, auto_sortitem: 0, auto_hideroom: 0, show_roomitem: 0, fullscreen: 0, channel_chat: 1, channel_tm: 1, channel_fam: 1, channel_es: 1, ban_pk: 0, off_plist: 0, combat_wrap: 0, combat_size: "1em", dialog_size: "1em", menu_size: "1em", action_wrap: 0, off_hp: 0, show_damage: 0, no_master: 0, no_team: 0, no_load: true,
      load(values) {
        autoWorkState = false;
        this.auto_work = 0;
        context.getDialog().keys.init_key();
        context.getDialog().extend.init_extend();
        if (values) {
          delete values.item_firstme;
          for (const key in values) {
            if (key !== "fullscreen") { this.set_prop(key, values[key]); this[key] = values[key]; }
          }
        }
        if (isClientScript(this.auto_work)) {
          storedScript(this.auto_work);
          context.sendCommand("setting auto_work 0");
        } else if (!this.auto_work || this.auto_work === "0") {
          const script = storedScript();
          if (isClientScript(script)) this.auto_work = script;
        } else storedScript("");
      },
      set_prop(key, value) { const Process = context.getProcess(); const Combat = context.getCombat(); switch (key) { case "fontsize": jquery(".container,.dialog-confirm").css("font-size", value); break; case "font": jquery(".container").css("font-family", value === "none" ? "" : value); break; case "combat_size": jquery(".content-bottom").css("font-size", value); break; case "dialog_size": jquery(".dialog").css("font-size", value); break; case "show_sa": Combat.refActions(); break; case "menu_size": jquery(".bottom-bar").css("font-size", value); break; case "fontcolor": jquery(documentRef.body).css("color", value); break; case "backcolor": jquery(documentRef.body).css("background-color", value); break; case "hide_roomdesc": jquery(".room_desc")[value ? "hide" : "show"](); break; case "exits_dir": Process.exits(); break; case "off_hp": jquery(".item-status")[value ? "hide" : "show"](); break; case "combat_wrap": jquery(".combat-commands").toggleClass("combat-wrap", !!value); break; case "action_wrap": jquery(".room-commands").toggleClass("combat-wrap", !!value); break; case "item_autoheight": value ? jquery(".room_items").removeAttr("style") : jquery(".room_items").attr("style", "max-height: 8rem; overflow-y: auto;"); break; case "show_hp": if (!Combat.IsShow) jquery(".room-item>.item-status")[value === 1 ? "show" : "hide"](); break; case "show_hpnum": if (Process.cur_room) Process.items(Process.cur_room); break; case "show_damage": jquery(".item-damage").remove(); break; case "fullscreen": value ? this.launchFullScreen() : this.exitFullscreen(); break; case "show_command": Process.itemsElement.find(".item-commands").remove(); break; case "no_spmsg": jquery(Process.ChannelElement)[value ? "hide" : "show"](); break; } },
      save(key, value) {
        this[key] = value;
        this.set_prop(key, value);
        if (key === "auto_work") {
          storedScript(isClientScript(value) ? value : "");
          if (isClientScript(value)) {
            context.sendCommand("setting auto_work 0");
            return;
          }
        }
        context.sendCommand("setting " + key + " " + value);
      },
      observeAutoWorkCommand(command) {
        if (/(?:^|;)\s*(?:stopstate|state\s+stop)\s*(?:;|$)/.test(String(command || "")))
          autoWorkState = false;
      },
      handleAutoWorkState(payload) {
        const title = String((payload && payload.state) || "").replace(/<[^>]*>/g, "").trim();
        const wasTraining = autoWorkState;
        autoWorkState = /^(?:你正在\s*)?(?:学习|练习|打坐|读书)/.test(title);
        if (title || !wasTraining || !isClientScript(this.auto_work)) return;
        if (context.isConnected && !context.isConnected()) return;
        const script = context.getScript && context.getScript();
        if (script) return script.run(this.auto_work.trim());
      },
      launchFullScreen(element = documentRef.documentElement) { const method = ["requestFullscreen", "mozRequestFullScreen", "webkitRequestFullscreen", "msRequestFullscreen"].find((name) => element[name]); if (method) element[method](); },
      exitFullscreen() { const method = ["exitFullscreen", "mozCancelFullScreen", "webkitExitFullscreen"].find((name) => documentRef[name]); if (method) documentRef[method](); },
    };
    const name0 = "万俟司马上官欧阳夏侯诸葛闻人东方赫连皇甫尉迟公羊澹台公冶宗政濮阳淳于单于太叔申屠公孙仲孙轩辕令狐锺离宇文长孙慕容鲜于闾丘司徒司空丌官司寇子车颛孙端木巫马公西乐正公良拓拔夹谷谷梁梁丘左丘东门西门";
    const name1 = "赵钱孙李周吴郑王冯陈楮卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎";
    const name2 = "世舜丞主产仁仇仓仕仞任伋众伸佐佺侃侪促俟信俣修倝倡倧偿储僖僧僳儒俊伟列则刚创前剑助劭势勘参叔吏嗣士壮孺守宽宾宋宗宙宣实宰尊峙峻崇崈川州巡帅庚战才承拯操斋昌晁暠曹曾珺玮珹琒琛琩琮琸瑎玚璟璥瑜生畴矗矢石磊砂碫示社祖祚祥禅稹穆竣竦综缜绪舱舷船蚩襦轼辑轩子杰榜碧葆莱蒲天乐东钢铎铖铠铸铿锋镇键镰馗旭骏骢骥驹驾骄诚诤赐慕端征坚建弓强彦御悍擎攀旷昂晷健冀凯劻啸柴木林森朴骞寒函高魁魏鲛鲲鹰丕乒候冕勰备宪宾密封山峰弼彪彭旁日明昪昴胜汉涵汗浩涛淏清澜浦澉澎澔瀚瀛灏沧虚豪豹辅辈迈邶合部阔雄霆震韩俯颁颇频颔风飒飙飚马亮仑仝代儋利力劼勒卓哲喆展帝弛弢弩彰征律德志忠思振挺掣旲旻昊昮晋晟晸朕朗段殿泰滕炅炜煜煊炎选玄勇君稼黎利贤谊金鑫辉墨欧有友闻问";
    const name3 = "筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜姬舒影荔枝思丽秀娟英华慧巧美娜静淑惠珠翠雅芝玉萍红娥玲芬芳燕彩春菊勤珍贞莉兰凤洁梅琳素云莲真环雪荣妹霞香月莺媛艳瑞凡佳嘉琼桂娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷姣婉娴瑾颖露瑶怡婵雁蓓纨仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希宁欣飘育滢馥";
    function createName(gender, mode) { mode = mode || Math.floor(Math.random() * 2) + 1; const result = []; if (mode === 2) { let index = Math.floor(Math.random() * name0.length); if (index % 2) index -= 1; result.push(name0[index++], name0[index]); } else result.push(name1[Math.floor(Math.random() * name1.length)]); const given = gender === 0 ? name2 : name3; result.push(given[Math.floor(Math.random() * given.length)]); if (Math.floor(Math.random() * 4) > 1) result.push(given[Math.floor(Math.random() * given.length)]); return result.join(""); }
    function createId() { const letters = "abcdefghijklmnopqrstuvwxyz"; const digits = "123456789"; const result = []; const length = Math.floor(Math.random() * 3) + 3; for (let index = 0; index < length; index += 1) result.push(index < 3 ? letters[Math.floor(Math.random() * letters.length)] : digits[Math.floor(Math.random() * digits.length)]); return result.join(""); }
    function createProp() { let sum = 20; const values = []; for (let index = 0; index < 4; index += 1) { let value = Math.floor(Math.random() * 15) + 1; if (sum >= value) { if (index === 3) value = sum; else sum -= value; } else { value = sum; sum = 0; } values[index] = value; } return { str: values[0] + 15, con: values[1] + 15, dex: values[2] + 15, int: values[3] + 15 }; }
    return { Setting, MAP_DIR_EXITS, createName, createId, createProp };
  });
})(window);
