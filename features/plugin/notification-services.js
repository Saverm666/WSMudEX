/** Remote configuration sharing, speech, push notifications and audio helpers. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature(
    "notification-services",
    function install(context) {
      const { services, messageAppend, legacy } = context;

      const remoteConfig = {
        serverUrl: "https://wsmud.ii74.com",
        GetJson: function (path, data) {
          let result = "";
          $.post(remoteConfig.serverUrl + path, data, function (response) {
            result = response;
          });
          return result;
        },
        shareJson: function (username, value) {
          $.post(
            remoteConfig.serverUrl + "/sharejk",
            { username: username, json: JSON.stringify(value) },
            function (response) {
              response && response.code == 0
                ? (GM_setClipboard(response.shareid),
                  messageAppend(
                    "复制成功" + response.msg + ":" + response.shareid,
                  ))
                : messageAppend("失败了" + response.msg);
            },
          );
        },
        getShareJson: function (shareId, callback) {
          $.post(
            remoteConfig.serverUrl + "/getjk",
            { shareid: shareId },
            function (response) {
              response && response.code == 0
                ? callback(response)
                : messageAppend("失败了" + response.msg);
            },
          );
        },
        getUserConfig: function (id, callback) {
          $.get(remoteConfig.serverUrl + "/User/Load?id=" + id, function (data) {
            data && data != "" ? callback(data) : messageAppend("失败了");
          });
        },
        uploadUserConfig: function (id, value, callback) {
          $.post(
            remoteConfig.serverUrl + "/User/Backup",
            { id: id, data: JSON.stringify(value) },
            function (response) {
              response && response == "true"
                ? callback(response)
                : messageAppend("失败了,或配置已存在");
            },
          );
        },
      };

      const speech = {
        playtts: function (text) {
          try {
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "zh";
            utterance.voice = speechSynthesis
              .getVoices()
              .filter(function (voice) {
                return voice.name == "Whisper";
              })[0];
            speechSynthesis.speak(utterance);
          } catch (error) {
            try {
              android.speak(text);
            } catch (fallbackError) {
              console.log("这个真没有.");
            }
          }
        },
      };

      function beep() {
        document.getElementById("beep-alert").play();
      }

      function push(text) {
        if (!text) return;
        var settings = legacy.getPushSettings();
        if (
          settings.enabled != "开" ||
          settings.type == null ||
          settings.token == null
        ) {
          messageAppend(
            "通知功能未开启或设置不完整，请在 右键菜单-设置 中设置开启。",
            1,
          );
          return;
        }
        switch (String(settings.type)) {
          case "0":
            $.post(
              "https://sctapi.ftqq.com/" + settings.token + ".send?title=" + text,
            );
            break;
          case "1":
            $.post(
              "https://api.day.app/" +
                settings.token +
                "/武神传说/" +
                encodeURIComponent(text),
            );
            break;
          case "2":
            var payload = {
              token: settings.token,
              title: "武神传说",
              content: text,
            };
            $.ajaxSetup({ contentType: "application/json; charset=utf-8" });
            $.post("http://www.pushplus.plus/send/", JSON.stringify(payload));
            break;
          case "3":
            payload = { msg_type: "text", content: { text: text } };
            $.ajaxSetup({ contentType: "application/json; charset=utf-8" });
            $.post(
              "https://open.feishu.cn/open-apis/bot/v2/hook/" + settings.token,
              JSON.stringify(payload),
            );
            break;
          case "4":
            $.post(
              "https://qmsg.zendee.cn/send/" + settings.token + "?msg=" + text,
            );
            break;
          case "5":
            $.post(
              "https://qmsg.zendee.cn/group/" + settings.token + "?msg=" + text,
            );
        }
      }

      class MusicBox {
        constructor(options) {
          this.arrFrequency = [
            262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880,
            988, 1047, 1175, 1319, 1397, 1568, 1760, 1967,
          ];
          this.arrNotes = [
            "·1",
            "·2",
            "·3",
            "·4",
            "·5",
            "·6",
            "·7",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "1·",
            "2·",
            "3·",
            "4·",
            "5·",
            "6·",
            "7·",
          ];
          this.opts = Object.assign(
            {
              loop: false,
              musicText: "",
              autoplay: false,
              type: "sine",
              duration: 2,
            },
            options,
          );
          this.audioCtx = new (
            window.AudioContext || window.webkitAudioContext
          )();
          if (this.opts.autoplay)
            this.playMusic(this.opts.musicText, this.opts.autoplay);
        }
        createSound(frequency) {
          var oscillator = this.audioCtx.createOscillator();
          var gain = this.audioCtx.createGain();
          oscillator.connect(gain);
          gain.connect(this.audioCtx.destination);
          oscillator.type = this.opts.type;
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(1, this.audioCtx.currentTime + 0.01);
          oscillator.start(this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioCtx.currentTime + this.opts.duration,
          );
          oscillator.stop(this.audioCtx.currentTime + this.opts.duration);
        }
        createMusic(note) {
          var index = this.arrNotes.indexOf(note);
          if (index !== -1) this.createSound(this.arrFrequency[index]);
        }
        pressBtn(index) {
          this.createSound(this.arrFrequency[index]);
        }
        playMusic(source, speed = 2) {
          let index = 0;
          const notes = source.split(" ");
          const timer = setInterval(() => {
            try {
              var noteIndex = this.arrNotes.indexOf(notes[index]);
              if (notes[index] !== "-" && notes[index] !== "0")
                this.pressBtn(noteIndex);
              if (++index >= notes.length) {
                if (this.opts.loop) index = 0;
                else clearInterval(timer);
              }
            } catch (error) {
              alert("请输入正确的乐谱！");
              clearInterval(timer);
            }
          }, 1000 / speed);
          return timer;
        }
      }

      Object.assign(services, {
        remoteConfig,
        speech,
        beep,
        push,
        MusicBox,
      });
    },
  );
})(window);
