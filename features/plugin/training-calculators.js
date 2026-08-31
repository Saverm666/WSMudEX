/** Currency, study and training-efficiency calculators. */
(function registerTrainingCalculators(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("training-calculators", function install(context) {
    const { WG } = context;

    Object.assign(WG, {
      formatCurrencyTenThou: function (value) {
        value = value.toString().replace(/\$|\,/g, "");
        const positive = (value = isNaN(value) ? "0" : value) ==
          (value = Math.abs(value));
        value = Math.floor(10 * value + 0.50000000001);
        value = Math.floor(value / 10).toString();
        for (
          let index = 0;
          index < Math.floor((value.length - (1 + index)) / 3);
          index += 1
        )
          value =
            value.substring(0, value.length - (4 * index + 3)) +
            "," +
            value.substring(value.length - (4 * index + 3));
        return (positive ? "" : "-") + value;
      },
      gen: function (base, efficiency, count) {
        return this.formatCurrencyTenThou(base / 100 + (efficiency * count) / 10);
      },
      dian: function (start, end, multiplier) {
        return this.formatCurrencyTenThou(
          (start + end) * ((end - start) / 2) * multiplier * 5,
        );
      },
      lx: function (first, second, percent, start, end, multiplier) {
        const potential = 2.5 * (end * end - start * start) * multiplier;
        const minutes =
          potential /
          (first + second) /
          (1 + percent / 100 - first / 100) /
          12;
        return {
          qianneng: potential,
          time:
            minutes < 60
              ? parseInt(minutes) + "分钟"
              : parseInt(minutes / 60) +
                "小时" +
                parseInt(minutes % 60) +
                "分钟",
        };
      },
    });
  });
})(window);
