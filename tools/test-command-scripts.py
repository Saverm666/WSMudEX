"""Exercise real action-button dispatch and SCRIPT with browser timers."""
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


parser = argparse.ArgumentParser()
parser.add_argument("--reproduce", action="store_true")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = (root / "sources/game-client/20-command-dispatch.jsfrag").read_text()
dispatch = source.split("function IsTopWGPopupLayer")[0]
send = "function SendCommand" + source.split("function SendCommand", 1)[1].split("function ChannelChanged")[0]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        errors = []
        script_errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: script_errors.append(message.text) if "扩展执行失败" in message.text else None)
        page.set_content('<div class="container"><div class="room-commands"><span class="act-item">执行</span></div></div>')
        for path in ["vendor/jquery-3.7.1.js", "client/core.js", "client/modules/script-engine.js", "client/modules/utilities.js", "client/modules/network-api.js", "client/modules/dialog-extensions.js"]:
            page.add_script_tag(path=root / path)
        page.evaluate("""() => {
          window.sent = [];
          window.messages = [];
          window.LastCommand = null;
          window.IsWGPluginFeatureEnabled = () => false;
          window.ClientConnection = { isConnecting: () => false };
          window.Process = { player: 'test-player', cur_room: { items: [] }, cancelPendingDetailPopups() {} };
          window.Dialog = { extend: { record() {} } };
          window.Setting = { observeAutoWorkCommand() {} };
          window.ReceiveMessage = message => messages.push(message);
          const network = WSMudClient.createModule('network-api', { getReceiveMessage: () => ReceiveMessage });
          window.GameClient = new network.WSClient('test', 1);
          GameClient.ws = { readyState: 1, send(command) {
            sent.push({ command, time: performance.now() });
            if (command === 'go north') setTimeout(() => {
              Process.cur_room.items = [{ id: 'npc-cheng', name: '程药发', hp: 100 }];
            }, 40);
          } };
          window.unsafeWindow = window;
          window.SCRIPT = WSMudClient.createModule('script-engine', {
            jquery: $, hostWindow: window, getSendCommand: () => SendCommand,
            getReceiveMessage: () => ReceiveMessage, getUtilities: () => Util,
            getProcess: () => Process
          });
          window.Extend = WSMudClient.createModule('dialog-extensions', {
            jquery: $, getProcess: () => Process, getDialog: () => Dialog,
            getScript: () => SCRIPT
          }).extend;
        }""")
        utilities_bridge = (root / "sources/game-client/85-utilities.jsfrag").read_text()
        if args.reproduce:
            utilities_bridge = utilities_bridge.replace("setTimeout: setTimeout.bind(window)", "setTimeout")
        page.add_script_tag(content=utilities_bridge)
        page.add_script_tag(content=dispatch + "\n" + send)
        page.evaluate("$('.container').on('click', ContainerCommand)")

        def run(command, delay):
            page.evaluate("""command => {
              sent.length = 0;
              Process.cur_room.items = [];
              Extend.groups = {};
              Extend.init_extend_item({ for: 'action', name: '测试', content: command, on: true });
              $('.act-item').attr('cmd', Extend.groups.action[0].cmd).click();
            }""", command)
            page.wait_for_timeout(delay)
            return page.evaluate("sent")

        team = "team out;say 共鸣;#wait 700;team reply ok"
        npc = "jh fam 0 start;go west;go north;go north;#wait 100;select @npc(程药发);ask1 @npc(程药发);goto yamen2"
        if args.reproduce:
            for command, expected in [(team, ["team out", "say 共鸣"]), (npc, ["jh fam 0 start", "go west", "go north", "go north"])]:
                result = run(command, 800)
                assert [item["command"] for item in result] == expected, result
                print("已复现：使用实际 utilities 桥接后，命令在 #wait 处中断：", result)
            assert len(script_errors) == 2 and all('Illegal invocation' in error for error in script_errors), script_errors
            print("捕获实际脚本异常：", script_errors)
        else:
            result = run(team, 850)
            assert [item["command"] for item in result] == ["team out", "say 共鸣", "team reply ok"], result
            assert result[2]["time"] - result[1]["time"] >= 690, result
            result = run(npc, 250)
            assert [item["command"] for item in result] == ["jh fam 0 start", "go west", "go north", "go north", "select npc-cheng", "ask1 npc-cheng", "goto yamen2"], result
            assert result[4]["time"] - result[3]["time"] >= 90, result
            assert [item["command"] for item in run("look", 30)] == ["look"]
            assert [item["command"] for item in run("#wait 20;say done", 80)] == ["say done"]
            assert not page.evaluate("SCRIPT.is_running")
            assert not errors, errors
            assert not script_errors, script_errors
            print("验证通过：按钮顺序执行、700/100ms 等待、动态 NPC ID 展开、后续命令、单命令与 # 开头脚本。")
    finally:
        browser.close()
