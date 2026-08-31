/** Skill training cost calculator and floating dialog. */
(function registerSkillCalculatorModule(global) {
  "use strict";

  global.WSMudClient.registerModule(
    "skill-calculator",
    function create(context) {
      const jquery = context.jquery;
      const getDialog = context.getDialog;
      const getGameState = context.getGameState;
      const getWrapName = context.getWrapName;
      if (
        typeof jquery !== "function" ||
        typeof getDialog !== "function" ||
        typeof getGameState !== "function" ||
        typeof getWrapName !== "function"
      ) {
        throw new TypeError(
          "技能计算器需要显式 jquery、getDialog、getGameState 和 getWrapName 上下文",
        );
      }

      const SKILL_TRAINING_FORMULA_PARAMS = [
        { name: "白色", x: 2, y: 5 },
        { name: "绿色", x: 2, y: 10 },
        { name: "蓝色", x: 7, y: 15 },
        { name: "黄色", x: 10, y: 20 },
        { name: "紫色", x: 12, y: 25 },
        { name: "橙色", x: 15, y: 30 },
        { name: "红色", x: 20, y: 35 },
      ];

      function ParseSkillTrainingEfficiency(value) {
        if (value == null || value === "") return "";
        var parts = String(value).match(/-?\d+(?:\.\d+)?/g);
        if (!parts || !parts.length) return "";
        return parts.reduce(function (total, part) {
          return total + Number(part);
        }, 0);
      }

      function CalculateSkillTrainingCost(options) {
        options = options || {};
        var currentLevel = Number(options.currentLevel),
          targetLevel = Number(options.targetLevel),
          grade = Number(options.grade),
          mode = options.mode === "study" ? "study" : "practice",
          practiceSpeed = Number(options.practiceSpeed),
          innateIntelligence = Number(options.innateIntelligence),
          acquiredIntelligence = Number(options.acquiredIntelligence),
          efficiency = Number(options.efficiency);
        if (
          !Number.isInteger(currentLevel) ||
          !Number.isInteger(targetLevel) ||
          currentLevel < 0 ||
          targetLevel <= currentLevel
        ) {
          return { error: "目标等级必须是大于当前等级的整数" };
        }
        if (!Number.isInteger(grade) || !SKILL_TRAINING_FORMULA_PARAMS[grade]) {
          return { error: "请选择技能颜色" };
        }
        if (!(practiceSpeed > 0)) {
          var totalIntelligence = innateIntelligence + acquiredIntelligence;
          practiceSpeed =
            mode === "study"
              ? Math.floor((totalIntelligence * (100 + efficiency)) / 100) * 3
              : Math.floor(
                  (totalIntelligence *
                    (100 + efficiency - innateIntelligence)) /
                    100,
                );
        }
        if (!(practiceSpeed > 0) || !Number.isFinite(practiceSpeed)) {
          return { error: "练习速度必须大于 0" };
        }
        var formula = SKILL_TRAINING_FORMULA_PARAMS[grade],
          levelSpan = targetLevel - currentLevel,
          triangularSpan =
            (targetLevel * (targetLevel - 1) -
              currentLevel * (currentLevel - 1)) /
            2,
          potential = levelSpan * formula.x + triangularSpan * formula.y,
          minutes = potential / practiceSpeed / 12;
        return {
          currentLevel: currentLevel,
          targetLevel: targetLevel,
          grade: grade,
          potential: potential,
          practiceSpeed: practiceSpeed,
          minutes: minutes,
        };
      }

      function FormatSkillTrainingDuration(minutes) {
        if (!(minutes >= 0) || !Number.isFinite(minutes)) return "—";
        if (minutes < 60) return minutes.toFixed(2) + " 分钟";
        var totalMinutes = Math.ceil(minutes),
          days = Math.floor(totalMinutes / 1440),
          hours = Math.floor((totalMinutes % 1440) / 60),
          remainingMinutes = totalMinutes % 60,
          parts = [];
        days && parts.push(days + " 天");
        hours && parts.push(hours + " 小时");
        (remainingMinutes || !parts.length) &&
          parts.push(remainingMinutes + " 分钟");
        return parts.join(" ");
      }

      const skillcalc = {
        isShow: false,
        skill: null,
        mode: "practice",
        readPercent: function (value) {
          return ParseSkillTrainingEfficiency(value);
        },
        getProfile: function () {
          var state = getGameState() || {},
            score = state.score || {},
            score2 = state.score2 || {};
          return {
            innateIntelligence:
              Number.isFinite(Number(score.int)) && score.int !== ""
                ? Number(score.int)
                : "",
            acquiredIntelligence:
              Number.isFinite(Number(score.int_add)) && score.int_add !== ""
                ? Number(score.int_add)
                : "",
            practiceEfficiency: this.readPercent(score2.lianxi_per),
            studyEfficiency: this.readPercent(score2.study_per),
          };
        },
        open: function (skillId, mode) {
          var dialog = getDialog(),
            source = mode === "study" ? dialog.master : dialog.skills,
            skill = source.skills && source.skills[skillId];
          if (!skill) return;
          var pending = dialog.consumeLayerRequest();
          if (
            pending &&
            dialog.isShow &&
            pending.sourceItem == dialog.curItem
          ) {
            dialog.pushLayer("skillcalc", pending);
          }
          this.skill = skill;
          this.mode = mode === "study" ? "study" : "practice";
          dialog.show("skillcalc");
        },
        show: function () {
          if (!this.skill) return;
          this.isShow = true;
          if (!this.element) {
            this.element = jquery('<div class="WG_skill_training_calc"></div>');
            this.element
              .on("click", ".WG_skill_calc_submit", this.calculate.bind(this))
              .on("input", "[data-skill-calc-auto]", this.updateSpeed.bind(this))
              .on("change", '[data-field="mode"]', this.changeMode.bind(this))
              .on("keydown", "input", function (event) {
                if (event.key === "Enter") skillcalc.calculate();
              });
          }
          this.render();
          var dialog = getDialog();
          this.element.appendTo(dialog.contentElement.empty());
          var wrapName = getWrapName();
          dialog.title(wrapName(this.skill) + " · 计算");
          dialog.icon("time");
          dialog.footer("");
          dialog.activateFloatingDialog();
          this.element.find('[data-field="targetLevel"]').trigger("focus").select();
        },
        hide: function () {},
        close: function () {
          this.element && this.element.detach();
          this.isShow = false;
        },
        render: function () {
          var profile = this.getProfile(),
            skill = this.skill,
            grade = Math.max(
              0,
              Math.min(
                SKILL_TRAINING_FORMULA_PARAMS.length - 1,
                Number(skill.grade) || 0,
              ),
            ),
            efficiency =
              this.mode === "study"
                ? profile.studyEfficiency
                : profile.practiceEfficiency,
            colors = [
              "#c0c0c0",
              "#00ff00",
              "#00ffff",
              "#ffff00",
              "#912cee",
              "#ffa600",
              "#cc3333",
            ],
            colorOptions = SKILL_TRAINING_FORMULA_PARAMS.map(function (
              formula,
              index,
            ) {
              return (
                '<option value="' +
                index +
                '" style="color:' +
                colors[index] +
                '"' +
                (index === grade ? " selected" : "") +
                ">" +
                formula.name +
                "</option>"
              );
            }).join("");
          this.element.html(
            '<div class="WG_skill_calc_intro">按当前角色属性，估算技能练到指定等级所需的潜能和时间。</div>' +
              '<div class="WG_skill_calc_form">' +
              '<label><span>计算方式</span><select data-field="mode" data-skill-calc-auto>' +
              '<option value="practice"' +
              (this.mode === "practice" ? " selected" : "") +
              ">练习</option>" +
              '<option value="study"' +
              (this.mode === "study" ? " selected" : "") +
              ">学习</option>" +
              "</select></label>" +
              '<label><span>技能颜色</span><select data-field="grade">' +
              colorOptions +
              "</select></label>" +
              '<label><span>当前等级</span><input data-field="currentLevel" type="number" min="0" step="1" value="' +
              (Number(skill.level) || 0) +
              '"></label>' +
              '<label><span>目标等级</span><input data-field="targetLevel" type="number" min="1" step="1" value="' +
              ((Number(skill.level) || 0) + 1) +
              '"></label>' +
              '<label><span>先天悟性</span><input data-field="innateIntelligence" data-skill-calc-auto type="number" step="1" value="' +
              profile.innateIntelligence +
              '"></label>' +
              '<label><span>后天悟性</span><input data-field="acquiredIntelligence" data-skill-calc-auto type="number" step="1" value="' +
              profile.acquiredIntelligence +
              '"></label>' +
              '<label><span class="WG_skill_calc_efficiency_label">' +
              (this.mode === "study" ? "学习效率" : "练习效率") +
              '</span><span class="WG_skill_calc_input_suffix"><input data-field="efficiency" data-skill-calc-auto type="number" step="0.01" value="' +
              efficiency +
              '"><em>%</em></span></label>' +
              '<label><span class="WG_skill_calc_speed_label">' +
              (this.mode === "study" ? "学习速度" : "练习速度") +
              '</span><input data-field="practiceSpeed" type="number" min="0" step="0.01"></label>' +
              "</div>" +
              '<div class="item-commands WG_skill_calc_actions"><span class="WG_skill_calc_submit">计算</span></div>' +
              '<div class="WG_skill_calc_error" role="alert"></div>' +
              '<div class="WG_skill_calc_result" aria-live="polite">' +
              '<div><small>所需潜能</small><strong data-result="potential">—</strong></div>' +
              '<div><small>预计时间</small><strong data-result="time">—</strong></div>' +
              '<div><small>采用速度</small><strong data-result="speed">—</strong></div>' +
              "</div>" +
              '<p class="WG_skill_calc_note">计算公式与“武神2综合工具网页版”的潜能计算一致；时间为连续学习或练习的理论值。</p>',
          );
          this.updateSpeed();
        },
        value: function (field) {
          return this.element.find('[data-field="' + field + '"]').val();
        },
        updateSpeed: function () {
          if (!this.element) return;
          var innate = Number(this.value("innateIntelligence")),
            acquired = Number(this.value("acquiredIntelligence")),
            efficiency = Number(this.value("efficiency")),
            totalIntelligence = innate + acquired,
            speed =
              this.value("mode") === "study"
                ? Math.floor((totalIntelligence * (100 + efficiency)) / 100) * 3
                : Math.floor(
                    (totalIntelligence *
                      (100 + efficiency - innate)) /
                      100,
                  );
          this.element
            .find('[data-field="practiceSpeed"]')
            .val(speed > 0 && Number.isFinite(speed) ? speed.toFixed(2) : "");
        },
        changeMode: function () {
          this.mode = this.value("mode") === "study" ? "study" : "practice";
          var profile = this.getProfile(),
            efficiency =
              this.mode === "study"
                ? profile.studyEfficiency
                : profile.practiceEfficiency;
          this.element.find('[data-field="efficiency"]').val(efficiency);
          this.element
            .find(".WG_skill_calc_efficiency_label")
            .text(this.mode === "study" ? "学习效率" : "练习效率");
          this.element
            .find(".WG_skill_calc_speed_label")
            .text(this.mode === "study" ? "学习速度" : "练习速度");
          this.updateSpeed();
        },
        calculate: function () {
          var result = CalculateSkillTrainingCost({
            mode: this.value("mode"),
            currentLevel: Number(this.value("currentLevel")),
            targetLevel: Number(this.value("targetLevel")),
            grade: Number(this.value("grade")),
            innateIntelligence: Number(this.value("innateIntelligence")),
            acquiredIntelligence: Number(this.value("acquiredIntelligence")),
            efficiency: Number(this.value("efficiency")),
            practiceSpeed: Number(this.value("practiceSpeed")),
          });
          var error = this.element.find(".WG_skill_calc_error");
          if (result.error) {
            error.text(result.error).addClass("show");
            this.element
              .find('[data-result="potential"], [data-result="time"], [data-result="speed"]')
              .text("—");
            return;
          }
          error.empty().removeClass("show");
          this.element
            .find('[data-result="potential"]')
            .text(result.potential.toLocaleString("zh-CN"));
          this.element
            .find('[data-result="time"]')
            .text(FormatSkillTrainingDuration(result.minutes));
          this.element
            .find('[data-result="speed"]')
            .text(
              result.practiceSpeed.toLocaleString("zh-CN", {
                maximumFractionDigits: 2,
              }),
            );
        },
      };

      return {
        SKILL_TRAINING_FORMULA_PARAMS,
        ParseSkillTrainingEfficiency,
        CalculateSkillTrainingCost,
        FormatSkillTrainingDuration,
        skillcalc,
      };
    },
  );
})(window);
