/** Canonical static data shared by the automation suite and migrated features. */
(function registerAutomationStaticData(global) {
  "use strict";

  const state = {
    needfind: {
      "武当派-林间小径": ["go south"],
      "峨眉派-走廊": [
        "go north",
        "go south;go south",
        "go north;go east;go east",
      ],
      "丐帮-暗道": ["go east", "go east;go east", "go east"],
      "逍遥派-林间小道": [
        "go west;go north",
        "go south;go south",
        "go north;go west",
      ],
      "少林派-竹林": ["go north"],
      "逍遥派-地下石室": ["go up"],
      "逍遥派-木屋": ["go south;go south;go south;go south"],
    },
    place: {
      住房: "jh fam 0 start;go west;go west;go north;go enter",
      "住房-卧室":
        "jh fam 0 start;go west;go west;go north;go enter;go north;store",
      "住房-小花园":
        "jh fam 0 start;go west;go west;go north;go enter;go northeast",
      "住房-炼药房": "jh fam 0 start;go west;go west;go north;go enter;go east",
      "住房-练功房": "jh fam 0 start;go west;go west;go north;go enter;go west",
      "扬州城-钱庄": "jh fam 0 start;go north;go west;store",
      "扬州城-广场": "jh fam 0 start",
      "扬州城-醉仙楼": "jh fam 0 start;go north;go north;go east",
      "扬州城-杂货铺": "jh fam 0 start;go east;go south",
      "扬州城-打铁铺": "jh fam 0 start;go east;go east;go south",
      "扬州城-药铺": "jh fam 0 start;go east;go east;go north",
      "扬州城-衙门正厅": "jh fam 0 start;go west;go north;go north",
      "扬州城-镖局正厅": "jh fam 0 start;go west;go west;go south;go south",
      "扬州城-矿山": "jh fam 0 start;go west;go west;go west;go west",
      "扬州城-江边":
        "jh fam 0 start;go north;go north;go north;go north",
      "扬州城-药林":
        "jh fam 0 start;go east;go east;go east;go east;go south",
      "扬州城-喜宴": "jh fam 0 start;go north;go north;go east;go up",
      "扬州城-擂台": "jh fam 0 start;go west;go south",
      "扬州城-当铺": "jh fam 0 start;go south;go east",
      "扬州城-书院": "jh fam 0 start;go east;go north",
      "扬州城-帮派": "jh fam 0 start;go south;go south;go east",
      "扬州城-有间客栈": "jh fam 0 start;go north;go east",
      "扬州城-赌场": "jh fam 0 start;go south;go west",
      "帮会-大门": "jh fam 0 start;go south;go south;go east;go east",
      "帮会-大院": "jh fam 0 start;go south;go south;go east;go east;go east",
      "帮会-练功房":
        "jh fam 0 start;go south;go south;go east;go east;go east;go north",
      "帮会-聚义堂":
        "jh fam 0 start;go south;go south;go east;go east;go east;go east",
      "帮会-仓库":
        "jh fam 0 start;go south;go south;go east;go east;go east;go east;go north",
      "帮会-炼药房":
        "jh fam 0 start;go south;go south;go east;go east;go east;go south",
      "扬州城-扬州武馆": "jh fam 0 start;go south;go south;go west",
      "扬州城-武庙": "jh fam 0 start;go north;go north;go west",
      "武当派-广场": "jh fam 1 start;",
      "武当派-三清殿": "jh fam 1 start;go north",
      "武当派-石阶": "jh fam 1 start;go west",
      "武当派-练功房": "jh fam 1 start;go west;go west",
      "武当派-太子岩": "jh fam 1 start;go west;go northup",
      "武当派-桃园小路": "jh fam 1 start;go west;go northup;go north",
      "武当派-舍身崖": "jh fam 1 start;go west;go northup;go north;go east",
      "武当派-南岩峰": "jh fam 1 start;go west;go northup;go north;go west",
      "武当派-乌鸦岭":
        "jh fam 1 start;go west;go northup;go north;go west;go northup",
      "武当派-五老峰":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup",
      "武当派-虎头岩":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup",
      "武当派-朝天宫":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north",
      "武当派-三天门":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north",
      "武当派-紫金城":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north",
      "武当派-林间小径":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north",
      "武当派-后山小院":
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north;go north",
      "少林派-广场": "jh fam 2 start;",
      "少林派-山门殿": "jh fam 2 start;go north",
      "少林派-东侧殿": "jh fam 2 start;go north;go east",
      "少林派-西侧殿": "jh fam 2 start;go north;go west",
      "少林派-天王殿": "jh fam 2 start;go north;go north",
      "少林派-大雄宝殿": "jh fam 2 start;go north;go north;go northup",
      "少林派-钟楼": "jh fam 2 start;go north;go north;go northeast",
      "少林派-鼓楼": "jh fam 2 start;go north;go north;go northwest",
      "少林派-后殿":
        "jh fam 2 start;go north;go north;go northwest;go northeast",
      "少林派-练武场":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north",
      "少林派-罗汉堂":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go east",
      "少林派-般若堂":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go west",
      "少林派-方丈楼":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north",
      "少林派-戒律院":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go east",
      "少林派-达摩院":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go west",
      "少林派-竹林":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north",
      "少林派-藏经阁":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north;go west",
      "少林派-达摩洞":
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north;go north;go north",
      "华山派-镇岳宫": "jh fam 3 start;",
      "华山派-苍龙岭": "jh fam 3 start;go eastup",
      "华山派-舍身崖": "jh fam 3 start;go eastup;go southup",
      "华山派-峭壁": "jh fam 3 start;go eastup;go southup;jumpdown",
      "华山派-山谷": "jh fam 3 start;go eastup;go southup;jumpdown;go southup",
      "华山派-山间平地":
        "jh fam 3 start;go eastup;go southup;jumpdown;go southup;go south",
      "华山派-林间小屋":
        "jh fam 3 start;go eastup;go southup;jumpdown;go southup;go south;go east",
      "华山派-玉女峰": "jh fam 3 start;go westup;go north",
      "华山派-玉女祠": "jh fam 3 start;go westup;go north;go west",
      "华山派-练武场": "jh fam 3 start;go westup;go north;go north",
      "华山派-练功房": "jh fam 3 start;go westup;go north;go north;go east",
      "华山派-客厅": "jh fam 3 start;go westup;go north;go north;go north",
      "华山派-偏厅":
        "jh fam 3 start;go westup;go north;go north;go north;go east",
      "华山派-寝室":
        "jh fam 3 start;go westup;go north;go north;go north;go north",
      "华山派-玉女峰山路": "jh fam 3 start;go westup",
      "华山派-玉女峰小径": "jh fam 3 start;go westup;go southup",
      "华山派-思过崖": "jh fam 3 start;go westup;go southup;go southup",
      "华山派-山洞":
        "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter",
      "华山派-长空栈道":
        "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup",
      "华山派-落雁峰":
        "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup;go westup",
      "华山派-华山绝顶":
        "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup;go westup;jumpup",
      "峨眉派-金顶": "jh fam 4 start",
      "峨眉派-庙门": "jh fam 4 start;go west",
      "峨眉派-广场": "jh fam 4 start;go west;go south",
      "峨眉派-走廊": "jh fam 4 start;go west;go south;go west",
      "峨眉派-休息室": "jh fam 4 start;go west;go south;go east;go south",
      "峨眉派-厨房": "jh fam 4 start;go west;go south;go east;go east",
      "峨眉派-练功房": "jh fam 4 start;go west;go south;go west;go west",
      "峨眉派-小屋":
        "jh fam 4 start;go west;go south;go west;go north;go north",
      "峨眉派-清修洞":
        "jh fam 4 start;go west;go south;go west;go south;go south",
      "峨眉派-大殿": "jh fam 4 start;go west;go south;go south",
      "峨眉派-睹光台": "jh fam 4 start;go northup",
      "峨眉派-华藏庵": "jh fam 4 start;go northup;go east",
      "逍遥派-青草坪": "jh fam 5 start",
      "逍遥派-林间小道": "jh fam 5 start;go east",
      "逍遥派-练功房": "jh fam 5 start;go east;go north",
      "逍遥派-木板路": "jh fam 5 start;go east;go south",
      "逍遥派-工匠屋": "jh fam 5 start;go east;go south;go south",
      "逍遥派-休息室": "jh fam 5 start;go west;go south",
      "逍遥派-木屋": "jh fam 5 start;go north;go north",
      "逍遥派-地下石室": "jh fam 5 start;go down;go down",
      "丐帮-树洞内部": "jh fam 6 start",
      "丐帮-树洞下": "jh fam 6 start;go down",
      "丐帮-暗道": "jh fam 6 start;go down;go east",
      "丐帮-破庙密室": "jh fam 6 start;go down;go east;go east;go east",
      "丐帮-土地庙": "jh fam 6 start;go down;go east;go east;go east;go up",
      "丐帮-林间小屋":
        "jh fam 6 start;go down;go east;go east;go east;go east;go east;go up",
      "杀手楼-大门": "jh fam 7 start",
      "杀手楼-大厅": "jh fam 7 start;go north",
      "杀手楼-暗阁": "jh fam 7 start;go north;go up",
      "杀手楼-铜楼": "jh fam 7 start;go north;go up;go up",
      "杀手楼-休息室": "jh fam 7 start;go north;go up;go up;go east",
      "杀手楼-银楼": "jh fam 7 start;go north;go up;go up;go up;go up",
      "杀手楼-练功房":
        "jh fam 7 start;go north;go up;go up;go up;go up;go east",
      "杀手楼-金楼":
        "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up",
      "杀手楼-书房":
        "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up;go west",
      "杀手楼-平台":
        "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up;go up",
      "襄阳城-广场": "jh fam 8 start",
      "襄阳城-南城门": "jh fam 8 start;go south;go south;go south;go south",
      "襄阳城-北城门": "jh fam 8 start;go north;go north;go north;go north;",
      "襄阳城-西城门": "jh fam 8 start;go west;go west;go west;go west",
      "襄阳城-东城门": "jh fam 8 start;go east;go eastgo east;go east",
      武道塔: "jh fam 9 start",
    },
    mpz_path: {
      武当派:
        "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north",
      华山派: "jh fam 3 start;go westup;go north",
      少林派:
        "jh fam 2 start;go north;go north;go northwest;go northeast;go north",
      峨眉派: "jh fam 4 start;go west;go south;go west;go south",
      逍遥派: "jh fam 5 start;go west;go east;go down",
      丐帮: "jh fam 6 start;go down;go east;go east;go east;go east;go east",
    },
    sm_array: {
      武当: {
        place: "武当派-三清殿",
        npc: "武当派第二代弟子 武当首侠 宋远桥",
        sxplace: "武当派-太子岩",
        sx: "首席弟子",
      },
      华山: {
        place: "华山派-镇岳宫",
        npc: "市井豪杰 高根明",
        sxplace: "华山派-练武场",
        sx: "首席弟子",
      },
      少林: {
        place: "少林派-天王殿",
        npc: "少林寺第三十九代弟子 道觉禅师",
        sxplace: "少林派-练武场",
        sx: "大师兄",
      },
      逍遥: {
        place: "逍遥派-青草坪",
        npc: "聪辩老人 苏星河",
        sxplace: "-jh fam 5 start;go west",
        sx: "首席弟子",
      },
      丐帮: {
        place: "丐帮-树洞下",
        npc: "丐帮七袋弟子 左全",
        sxplace: "丐帮-破庙密室",
        sx: "首席弟子",
      },
      峨眉: {
        place: "峨眉派-庙门",
        npc: "峨眉派第五代弟子 苏梦清",
        sxplace: "峨眉派-广场",
        sx: "大师姐",
      },
      武馆: {
        place: "扬州城-扬州武馆",
        npc: "武馆教习",
        sxplace: "扬州城-扬州武馆",
      },
      杀手楼: {
        place: "杀手楼-大厅",
        npc: "杀手教习 何小二",
        sxplace: "杀手楼-练功房",
        sx: "金牌杀手",
      },
    },
  };

  global.WSMudPlugin.registerService(
    "automation-static-data",
    function createAutomationStaticData() {
      return {
        getNeedFindRoutes: function () {
          return state.needfind;
        },
        setNeedFindRoutes: function (value) {
          state.needfind = value;
          return value;
        },
        getPlaceRoutes: function () {
          return state.place;
        },
        setPlaceRoutes: function (value) {
          state.place = value;
          return value;
        },
        getMpzPath: function () {
          return state.mpz_path;
        },
        setMpzPath: function (value) {
          state.mpz_path = value;
          return value;
        },
        getMasterTasks: function () {
          return state.sm_array;
        },
        setMasterTasks: function (value) {
          state.sm_array = value;
          return value;
        },
      };
    },
  );
})(window);
