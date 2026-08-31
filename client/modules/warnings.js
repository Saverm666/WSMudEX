/** Bottom-bar warning stack. */
(function registerWarningModule(global) {
  "use strict";

  global.WSMudClient.registerModule("warnings", function create(context) {
    const { jquery, hostWindow } = context;

    const warnings = {
      elements: [],
      Show: function (payload) {
        const markup = ["<div class='warn-dialog'>"];
        markup.push("<div class='warn-content'>");
        markup.push(payload.content);
        markup.push("</div>");
        markup.push("<div class='item-commands'>");
        for (const command of payload.cmds) {
          markup.push("<span cmd='");
          markup.push(command.cmd);
          markup.push("'>");
          markup.push(command.name);
          markup.push("</span>");
        }
        markup.push("</div>");
        const element = jquery(markup.join("")).appendTo(".bottom-bar");
        this.elements.push(element);
        this.Settop();
        const close = this.Close.bind(this, element);
        if (payload.time) hostWindow.setTimeout(close, payload.time);
        element.on("click", "span", close);
      },
      Close: function (element) {
        const index = this.elements.indexOf(element);
        if (index < 0) return;
        element.remove();
        this.elements.splice(index, 1);
        this.Settop();
      },
      Settop: function () {
        let bottom = jquery(".bottom-bar").height() + 8;
        for (const element of this.elements) {
          element.css("bottom", bottom);
          bottom += element.height() + 14;
        }
      },
    };

    // Preserve the historical public field name used by external scripts.
    Object.defineProperty(warnings, "Elemes", {
      enumerable: true,
      get: function () {
        return warnings.elements;
      },
      set: function (value) {
        warnings.elements = value;
      },
    });
    return warnings;
  });
})(window);
