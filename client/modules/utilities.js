/** Historical client utilities and compatibility helpers. */
(function registerUtilitiesModule(global) {
  "use strict";

  global.WSMudClient.registerModule("utilities", function create(context) {
    const jquery = context.jquery;
    const hostWindow = context.hostWindow || global;
    const documentRef = context.documentRef || hostWindow.document;
    const navigatorRef = context.navigator || hostWindow.navigator;
    const timers = context.timers || hostWindow;
    const json = context.json || hostWindow.JSON || JSON;
    const DateConstructor = context.DateConstructor || hostWindow.Date || Date;
    const PromiseConstructor =
      context.PromiseConstructor || hostWindow.Promise || Promise;
    const parseIntFunction = context.parseInt || hostWindow.parseInt || parseInt;
    const encodeURIComponentFunction =
      context.encodeURIComponent ||
      hostWindow.encodeURIComponent ||
      encodeURIComponent;
    const escapeFunction = context.escape || hostWindow.escape || escape;
    const unescapeFunction = context.unescape || hostWindow.unescape || unescape;
    const FunctionConstructor = context.FunctionConstructor || Function;
    const domParserConstructor =
      context.domParser || hostWindow.DOMParser ||
      (typeof DOMParser === "function" ? DOMParser : null);
    const activeXObjectConstructor =
      context.activeXObject ||
      (typeof ActiveXObject === "function" ? ActiveXObject : null);

    const utilities = {
      ProxyHost: "/",
      isMobile: /Android|webOS|iPhone|iPad|iPod/i.test(
        navigatorRef && navigatorRef.userAgent,
      ),
      Json2Str: function (value) {
        if (typeof value == "object") {
          if (value == undefined || value == null) return "";
          return json.stringify(value);
        }
        return value;
      },
      Json2Str2: function (value) {
        if (value == undefined || value == null) return "";
        return json.stringify(value);
      },
      Date2Str: function (value) {
        if (value.valueOf) return "/Date(" + value.valueOf() + ")/";
        return value;
      },
      Clone: function (value) {
        const result = {};
        for (const key in value) result[key] = value[key];
        return result;
      },
      Sleep: function (delay) {
        if (!(delay > 0)) delay = 1000;
        return new PromiseConstructor(function (resolve) {
          timers.setTimeout(resolve, delay);
        });
      },
      Wait: async function (condition) {
        while (!condition()) await this.Sleep(1);
      },
      Str2Json: function (value) {
        if (value.substring(0, 1) != "{") value = "{" + value + "}";
        return new FunctionConstructor("return " + value)();
      },
      Str2Json2: function (value) {
        return new FunctionConstructor("return " + value)();
      },
      Str2XML: function (value) {
        let xmlDocument;
        if (!hostWindow.DOMParser) {
          if (!activeXObjectConstructor) {
            throw new Error("当前环境不支持 XML 解析");
          }
          xmlDocument = new activeXObjectConstructor("Microsoft.XMLDOM");
          xmlDocument.async = "false";
          xmlDocument.loadXML(value);
        } else {
          const parser = new domParserConstructor();
          xmlDocument = parser.parseFromString(value, "text/xml");
        }
        return jquery(xmlDocument.documentElement);
      },
      Settings: {
        MaxUploadFileLength: 31457280,
      },
      encode: function (value) {
        return encodeURIComponentFunction(value);
      },
      CookieHelper: {
        setCookie: function (name, value, expireMinutes) {
          let cookie = name + "=" + escapeFunction(value);
          if (expireMinutes) {
            const expireDate = new DateConstructor();
            expireDate.setTime(
              expireDate.getTime() + expireMinutes * 60 * 1000,
            );
            cookie += "; expires=" + expireDate.toGMTString();
          }
          documentRef.cookie = cookie;
        },
        getCookie: function (name) {
          if (documentRef.cookie.length > 0) {
            let begin = documentRef.cookie.indexOf(name + "=");
            if (begin != -1) {
              begin += name.length + 1;
              let end = documentRef.cookie.indexOf(";", begin);
              if (end == -1) end = documentRef.cookie.length;
              return unescapeFunction(documentRef.cookie.substring(begin, end));
            }
          }
          return "";
        },
        delCookie: function (name) {
          if (this.getCookie(name)) {
            const date = new DateConstructor();
            date.setYear(1000);
            documentRef.cookie = name + "=;" + date.toGMTString();
          }
        },
      },
      C_STR: "零一二三四五六七八九",
      C_STR2: ["", "十", "百", "千", "万", "亿"],
      C_STR3: ["", "万", "亿"],
      to_c: function (value) {
        if (!value) return "零";
        let result = "";
        let position = 0;
        let state = 0;
        while (value) {
          const digit = value % 10;
          if (position) {
            if (position % 4 == 0 && state != 3) {
              result = utilities.C_STR3[position / 4] + result;
              state = 3;
            } else if (digit && state != 2) {
              result = utilities.C_STR2[position % 4] + result;
              state = 2;
            }
          }
          if (digit) {
            if (digit != 1 || value > 10 || position % 4 != 1) {
              result = utilities.C_STR[digit] + result;
            }
            state = 1;
          } else if (state == 1) {
            result = utilities.C_STR[digit] + result;
            state = 0;
          }
          value = parseIntFunction(value / 10);
          position++;
        }
        return result;
      },
      Get: function (url, args, callback) {
        if (!url) return;
        const encoded = [];
        if (jquery.isPlainObject(args)) {
          for (const key in args) {
            if (args[key]) {
              encoded.push(key + "=" + utilities.encode(utilities.Json2Str(args[key])));
            }
          }
          url = url + "?" + encoded.join("&");
        } else if (jquery.isFunction(args)) {
          callback = args;
        } else if (jquery.isArray(args)) {
          for (let index = 0; index < args.length; index++) {
            encoded.push(utilities.encode(utilities.Json2Str(args[index])));
          }
          url = url + "/" + encoded.join("/");
        }
        return utilities.Request({
          url: this.ProxyHost + url,
          callBack: callback,
          type: "get",
        });
      },
      Post: function (url, args, callback) {
        const encoded = [];
        let data;
        if (jquery.isPlainObject(args)) {
          for (const key in args) {
            if (args[key]) encoded.push(key + "=" + utilities.Json2Str(args[key]));
          }
          data = encoded.join("&");
        } else if (args.length) {
          for (let index = 0; index < args.length; index++) {
            encoded.push(utilities.Json2Str(args[index]));
          }
          data = utilities.Json2Str2(encoded);
        } else {
          return;
        }
        return utilities.Request({
          url: this.ProxyHost + url,
          data,
          callBack: callback,
          type: "post",
        });
      },
      Request: function (options) {
        const callback = options.callBack;
        const hasCallback = jquery.isFunction(callback);
        const result = null;
        jquery.ajax(options.url, {
          data: options.data,
          type: options.type || "post",
          async: hasCallback,
          dataType: options.dataType || "json",
          xhrFields: { withCredentials: true },
          statusCode: { 404: function () {} },
          success: function (value) {
            if (jquery.isFunction(callback)) callback(value);
          },
          error: function (error) {
            const responseText = error.responseText;
            if (jquery.isFunction(callback)) callback(responseText);
          },
        });
        if (hasCallback == false) return result;
      },
      RequestOver: function (value) {
        if (value.Code < 0) return false;
        return true;
      },
      ToDate: function () {
        if (arguments.length == 0) return new DateConstructor();
        if (arguments.length == 1) {
          const parts = arguments[0].split("-");
          return new DateConstructor(
            parts[0],
            parseIntFunction(parts[1]) - 1,
            parts[2],
          );
        }
        return new DateConstructor(arguments[0], arguments[1], arguments[2]);
      },
      CheckInputs: function (element, values) {
        const inputs = element.find("input");
        for (let index = 0; index < inputs.length; index++) {
          const value = jquery(inputs[index]).val();
          let checked = false;
          if (values) {
            for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
              if (values[valueIndex] == value) {
                checked = true;
                continue;
              }
            }
          }
          if (checked) jquery(inputs[index]).prop("checked", true);
          else jquery(inputs[index]).removeProp("checked");
        }
      },
    };

    function installLegacyExtensions() {
      const arrayPrototype = (hostWindow.Array || Array).prototype;
      const datePrototype = (hostWindow.Date || Date).prototype;
      arrayPrototype.Remove = function (value) {
        const length = this.length;
        for (let index = 0; index < length; index++) {
          if (this[index] == value) {
            this.splice(index, 1);
            return this;
          }
        }
        return this;
      };
      arrayPrototype.RemoveAt = function (predicate) {
        for (let index = 0; index < this.length; index++) {
          if (predicate(this[index])) {
            this.splice(index, 1);
            index--;
          }
        }
      };
      arrayPrototype.Has = function (value) {
        const length = this.length;
        for (let index = 0; index < length; index++) {
          if (this[index] == value) return true;
        }
        return false;
      };
      arrayPrototype.Map = function (callback) {
        const length = this.length;
        const result = [];
        for (let index = 0; index < length; index++) {
          const value = callback(this[index]);
          if (value) result.push(value);
        }
        return result;
      };
      arrayPrototype.First = function (predicate) {
        const length = this.length;
        for (let index = 0; index < length; index++) {
          const value = this[index];
          if (predicate(value)) return value;
        }
        return null;
      };
      arrayPrototype.Where = function (predicate) {
        const length = this.length;
        const result = [];
        for (let index = 0; index < length; index++) {
          const value = this[index];
          if (predicate(value)) result.push(value);
        }
        return result;
      };
      datePrototype.AddDays = function (value) {
        this.setDate(this.getDate() + value);
        return this;
      };
      datePrototype.AddMonths = function (value) {
        this.setMonth(this.getMonth() + value);
        return this;
      };
      datePrototype.ToDateString = function () {
        let month = this.getMonth() + 1;
        if (month < 10) month = "0" + month;
        let day = this.getDate();
        if (day < 10) day = "0" + day;
        return this.getFullYear() + "-" + month + "-" + day;
      };
      datePrototype.AddYears = function (value) {
        this.setFullYear(this.getFullYear() + value);
        return this;
      };
    }

    utilities.installLegacyExtensions = installLegacyExtensions;
    return utilities;
  });
})(window);
