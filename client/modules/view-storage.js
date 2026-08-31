/** Login-panel transitions, iOS presentation and client-side storage. */
(function registerViewStorageModule(global) {
  "use strict";

  global.WSMudClient.registerModule("view-storage", function create(context) {
    const { jquery, hostWindow, storage, logger } = context;

    function hideAndShow(target, callback) {
      let visible;
      const children = jquery(".login-content").children();
      for (let index = 0; index < children.length; index += 1) {
        if (jquery(children[index]).css("display") !== "none") {
          visible = jquery(children[index]);
          break;
        }
      }
      if (!visible) visible = jquery("#login_panel");
      visible.animate({ opacity: 0 }, "fast", function () {
        visible.hide();
        if (target === ".container") jquery(".login-content").hide();
        else jquery(".login-content").show();
        if (!target) return;
        const next = jquery(target);
        next.show();
        next.css("opacity", "0");
        next.animate({ opacity: 1 }, "slow", callback);
      });
    }

    function initIos() {
      hostWindow.isios = true;
      jquery(
        "<style type='text/css'>body{-webkit-user-select:none;-webkit-user-drag:none;}</style>",
      ).appendTo("head");
      jquery(".download_cmd").remove();
    }

    function showNews(newsId) {
      hideAndShow(jquery("#new_panel "));
      jquery("#news_frame").attr("src", "/news/" + newsId + ".html");
    }

    const storageUtil = {
      setItem: function (key, value) {
        try {
          if (!value) return this.removeItem(key);
          storage.setItem(
            key,
            typeof value === "object" ? JSON.stringify(value) : value,
          );
          return true;
        } catch (error) {
          logger.error("存储数据失败:", error);
          return false;
        }
      },
      getItem: function (key, fallback = null) {
        try {
          const value = storage.getItem(key);
          if (!value) return fallback;
          if (value[0] === "{" || value[0] === "[") return JSON.parse(value);
          return value;
        } catch (error) {
          logger.error("获取数据失败:", error);
          return fallback;
        }
      },
      removeItem: function (key) {
        try {
          storage.removeItem(key);
          return true;
        } catch (error) {
          logger.error("移除数据失败:", error);
          return false;
        }
      },
      clearAll: function () {
        try {
          storage.clear();
          return true;
        } catch (error) {
          logger.error("清除所有数据失败:", error);
          return false;
        }
      },
    };

    return { hideAndShow, initIos, showNews, storageUtil };
  });
})(window);
