/** Medicine recipe parsing and automated refining. */
(function registerMedicineAutomation(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("medicine-automation", function install(context) {
    const { WG, UI, L, messageAppend, messageClear } = context;

    Object.assign(WG, {
      findMedItems_hook: undefined,

      auto_Development_medicine: function () {
        messageClear();
        messageAppend(UI.lyui);
        new Vue({
          el: "#LianYao",
          data: { level: 0, num: 1, info: "" },
          created() {
            this.info = GM_getValue("lastmed", $("#medicint_info").val());
            this.level = GM_getValue(
              "lastmedlevel",
              $("#medicine_level").val(),
            );
          },
          methods: {
            startDev: function () {
              if (WG.at("住房-炼药房") || WG.at("帮会-炼药房")) {
                WG.auto_start_dev_med(
                  this.info.replace(" ", ""),
                  this.level,
                  this.num,
                );
              } else L.msg("请先前往炼药房");
            },
            stopDev: function () {
              WG.Send("stopstate");
            },
          },
        });
      },

      auto_start_dev_med: function (recipeText, level, count) {
        GM_setValue("lastmed", recipeText);
        GM_setValue("lastmedlevel", level);
        if (!recipeText) {
          L.msg("素材不足");
          return;
        }
        if (recipeText.split(",").length < 2) {
          L.msg("素材不足");
          return;
        }

        const recipes = recipeText.split("|").map(function (recipe) {
          return recipe.split(",");
        });
        if (WG.findMedItems_hook) WG.remove_hook(WG.findMedItems_hook);
        WG.findMedItems_hook = WG.add_hook("dialog", function (event) {
          if (event.dialog !== "pack" || !event.items || !event.items.length)
            return;

          const data = WG.deserializePackData(structuredClone(event));
          const ingredientIds = [];
          const matchedNames = [];
          for (const recipe of recipes) {
            const ids = [];
            const names = [];
            for (const ingredientName of recipe) {
              if (JSON.stringify(data.items).indexOf(ingredientName) < 0) continue;
              for (const item of data.items) {
                if (item.name.indexOf(ingredientName) >= 0) {
                  ids.push(item.id);
                  names.push(ingredientName);
                }
              }
            }
            ingredientIds.push(ids);
            matchedNames.push(names);
          }

          for (let index = 0; index < ingredientIds.length; index += 1) {
            if (ingredientIds[index].length === recipes[index].length) continue;
            const matched = new Set(matchedNames[index]);
            const missing = Array.from(
              new Set(recipes[index].filter((name) => !matched.has(name))),
            );
            L.msg("素材不足,请检查背包是否存在" + missing.join("."));
            WG.remove_hook(WG.findMedItems_hook);
            WG.findMedItems_hook = null;
            return;
          }

          const command = WG.make_med_cmd(ingredientIds, level, count);
          console.log(command);
          WG.SendStep(command);
          WG.remove_hook(WG.findMedItems_hook);
          WG.findMedItems_hook = null;
        });
        WG.Send("pack");
      },

      make_med_cmd: function (ingredientGroups, level, count) {
        let command = "";
        for (const group of ingredientGroups) {
          for (let batch = 0; batch < parseInt(count); batch += 1) {
            const start = "lianyao2 start " + level + ";";
            for (const ingredientId of group)
              command += start + "lianyao2 add " + ingredientId + ";";
            command += "lianyao2 stop;";
          }
        }
        return command + "$syso 炼制完成;";
      },
    });

    return {
      destroy: function () {
        if (!WG.findMedItems_hook) return;
        WG.remove_hook(WG.findMedItems_hook);
        WG.findMedItems_hook = null;
      },
    };
  });
})(window);
