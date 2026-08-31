/** Horizontal tool-menu state and unread badges. */
(function registerToolActionModule(global) {
  "use strict";

  global.WSMudClient.registerModule("tool-action", function create(context) {
    const jquery = context.jquery;
    const documentRef = context.documentRef || global.document;
    const timers = context.timers || global;

    return {
      tools: null,
      hideTool: null,
      ToolState: 0,
      ToolOpacity: 0,
      ToolSpeed: 0,
      HasUserToggled: false,
      AnimationToken: 0,
      IsHorizontalEnabled: function () {
        if (!documentRef || !documentRef.documentElement) return true;
        return !jquery(documentRef.documentElement).hasClass(
          "WG_feature_horizontalMenu_off",
        );
      },
      InitTools: function () {
        this.tools = jquery(".right-bar>.tool-item");
        this.hideTool = jquery(".br-tool");
        this.bottom_tools = jquery(".bottom-bar>.tool-item");
        var horizontal = this.IsHorizontalEnabled(),
          isOpen =
            horizontal &&
            jquery(".right-bar").hasClass("WG_horizontal_menu_open");
        if (!horizontal) {
          jquery(".right-bar")
            .removeClass("WG_horizontal_menu_open")
            .removeAttr("id role");
          jquery(this.tools).removeAttr("role");
          jquery(this.hideTool).removeAttr("aria-controls aria-expanded title");
          return;
        }
        jquery(".right-bar").attr({
          id: "WG_horizontal_tool_menu",
          role: "menu",
        });
        jquery(this.tools).attr("role", "menuitem");
        jquery(this.hideTool).attr({
          "aria-controls": "WG_horizontal_tool_menu",
          "aria-expanded": String(isOpen),
          title: isOpen ? "收起菜单" : "展开菜单",
        });
        this.ToolState = isOpen ? 2 : 0;
        this.ToolOpacity = isOpen ? 100 : 0;
      },
      SetToolsOpen: function (isOpen) {
        this.InitTools();
        isOpen = Boolean(isOpen);
        this.AnimationToken += 1;
        for (var index = 0; index < this.tools.length; index++) {
          this.tools[index].style.display = isOpen ? "" : "none";
          this.tools[index].style.opacity = isOpen ? 1 : 0;
        }
        if (this.IsHorizontalEnabled()) {
          jquery(".right-bar").toggleClass("WG_horizontal_menu_open", isOpen);
          jquery(this.hideTool)
            .toggleClass("hide-tool", !isOpen)
            .attr("aria-expanded", String(isOpen))
            .attr("title", isOpen ? "收起菜单" : "展开菜单");
        } else {
          jquery(".right-bar").removeClass("WG_horizontal_menu_open");
          jquery(this.hideTool).toggleClass("hide-tool", !isOpen);
        }
        this.ToolState = isOpen ? 2 : 0;
        this.ToolOpacity = isOpen ? 100 : 0;
      },
      ShowTools: function () {
        this.InitTools();
        this.HasUserToggled = true;
        if (!this.IsHorizontalEnabled()) {
          this.ShowToolsNative();
          return;
        }
        this.SetToolsOpen(
          !jquery(".right-bar").hasClass("WG_horizontal_menu_open"),
        );
      },
      ShowToolsNative: function () {
        if (this.ToolState == 1) return;
        var opening = this.ToolState == 0,
          token = ++this.AnimationToken;
        if (opening) {
          for (var index = 0; index < this.tools.length; index++) {
            this.tools[index].style.display = "";
            this.tools[index].style.opacity = 0;
          }
          this.ToolSpeed = 200;
          this.ToolOpacity = 0;
          jquery(this.hideTool).removeClass("hide-tool");
        } else {
          this.ToolOpacity = 100;
          this.ToolSpeed = 100;
          jquery(this.hideTool).addClass("hide-tool");
        }
        this.ToolState = 1;
        timers.setTimeout(
          this.ShowToolsNativeAnimate.bind(this, opening ? 0 : 2, token),
          100,
        );
      },
      ShowToolsNativeAnimate: function (type, token) {
        if (token !== this.AnimationToken) return;
        var index, opacity;
        if (type == 0) {
          this.ToolOpacity += this.ToolSpeed;
          opacity = this.ToolOpacity;
          for (index = this.tools.length - 1; index >= 0; index--) {
            this.tools[index].style.opacity =
              opacity < 0 ? 0 : opacity > 100 ? 1 : opacity / 100;
            opacity -= 20;
            if (opacity < 0) break;
          }
          this.ToolOpacity -= 30;
          if (opacity < 100)
            timers.setTimeout(
              this.ShowToolsNativeAnimate.bind(this, type, token),
              100,
            );
          else this.ToolState = 2;
        } else {
          this.ToolOpacity -= this.ToolSpeed;
          opacity = this.ToolOpacity;
          for (index = 0; index < this.tools.length; index++) {
            this.tools[index].style.opacity =
              opacity < 0 ? 0 : opacity > 100 ? 1 : opacity / 100;
            opacity += 20;
            if (opacity >= 100) break;
          }
          this.ToolOpacity -= 20;
          if (opacity >= 0)
            timers.setTimeout(
              this.ShowToolsNativeAnimate.bind(this, type, token),
              100,
            );
          else {
            this.ToolState = 0;
            for (index = 0; index < this.tools.length; index++) {
              this.tools[index].style.display = "none";
            }
          }
        }
      },
      SetHorizontalEnabled: function (enabled) {
        this.HasUserToggled = false;
        if (documentRef && documentRef.documentElement)
          jquery(documentRef.documentElement).toggleClass(
          "WG_feature_horizontalMenu_off",
          !enabled,
          );
        this.SetToolsOpen(false);
      },
      showFlag: function (command, count) {
        this.InitTools();
        if (count < 0) count = 0;
        else if (count > 99) count = 99;
        let item = this.tools.filter("[command='" + command + "']");
        if (!item.length) {
          item = this.bottom_tools.filter("[command='" + command + "']");
        }
        if (count) item.find(".tag").removeClass("hide");
        else item.find(".tag").addClass("hide");
      },
    };
  });
})(window);
