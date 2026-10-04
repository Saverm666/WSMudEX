"""Run the advanced-settings save handler, state handler and SCRIPT in Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
settings_source = (root / "sources/game-client/63-dialog-lists-and-settings.jsfrag").read_text()
save = "function () {" + settings_source.split("save_custom: function () {", 1)[1].split("\n  get_pfms:", 1)[0].rsplit("},", 1)[0] + "}"
process_source = (root / "sources/game-client/40-protocol-process.jsfrag").read_text()
state = "function (payload) {" + process_source.split("state: function (_0x511c2d) {", 1)[1].split("\n  updatestate:", 1)[0].rsplit("},", 1)[0].replace("_0x511c2d", "payload") + "}"
upstream = (root / "features/upstream-automation.js").read_text()
transport = "var send_cmd = function" + upstream.split("var send_cmd = function", 1)[1].split("\n\n    } else", 1)[0]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route("http://test.local/**", lambda route: route.fulfill(content_type="text/html", body="""
          <div class='dialog-custom'><div class='setting-item' for='auto_work'><span class='switch on'></span></div>
          <textarea id='auto_work'>#wg work</textarea><button id='save'>保存设置</button></div>
          <div class='state-bar'></div><div class='state-tool'></div>
        """))
        page.goto("http://test.local/")
        page.wait_for_load_state("networkidle")
        for path in ["vendor/jquery-3.7.1.js", "client/core.js", "client/modules/settings.js", "client/modules/script-engine.js", "client/modules/utilities.js"]:
            page.add_script_tag(path=root / path)
        page.evaluate("""() => {
          window.commands = []; window.actions = []; window.messages = [];
          window.connected = true;
          window.Process = {player: 'role-1', updatestate() {}};
          window.Dialog = {keys: {init_key() {}}, extend: {init_extend() {}}};
          window.Combat = {};
          window.ReceiveMessage = message => messages.push(message);
          window.SendCommand = command => {
            Setting.observeAutoWorkCommand(command);
            commands.push(command);
          };
          window.WGRunNativeExtensionAction = action => actions.push(action);
          window.Util = WSMudClient.createModule('utilities', {hostWindow: window});
          window.SCRIPT = WSMudClient.createModule('script-engine', {
            hostWindow: window, getUtilities: () => Util,
            getSendCommand: () => SendCommand, getReceiveMessage: () => ReceiveMessage
          });
          window.Setting = WSMudClient.createModule('settings', {
            jquery: $, documentRef: document, hostWindow: window,
            getProcess: () => Process, getDialog: () => Dialog, getCombat: () => Combat,
            getScript: () => SCRIPT, isConnected: () => connected, sendCommand: SendCommand
          }).Setting;
        }""")
        page.add_script_tag(content="window.saveCustom = " + save + "; window.onState = " + state + "; $('#save').on('click', saveCustom);")
        page.add_script_tag(content="var unsafeWindow = window, G = {cmd_echo: false}, ws = {readyState: 1, send(command) { commands.push(command); }};\n" + transport)

        # Reproduce the old path with the real save UI: it sent #wg to the server.
        page.evaluate("""() => {
          const save = Setting.save;
          Setting.save = (key, value) => commands.push('setting ' + key + ' ' + value);
          $('#save').click();
          Setting.save = save;
        }""")
        assert page.evaluate("commands") == ["setting auto_work #wg work"]
        page.evaluate("commands.length = 0")
        page.locator("#save").click()
        assert page.evaluate("commands") == ["setting auto_work 0"]
        assert page.evaluate("localStorage.getItem('WSMudEX_auto_work_script_role-1')") == "#wg work"
        page.evaluate("Setting.load({auto_work: '0'})")
        assert page.evaluate("Setting.auto_work") == "#wg work"
        page.evaluate("onState({state: '打坐运功'}); onState({}); onState({})")
        page.wait_for_timeout(30)
        assert page.evaluate("actions") == ["work"]
        for title in ["学习内功", "练习技能", "读书"]:
            page.evaluate("title => {onState({state: title}); onState({});}", title)
        page.wait_for_timeout(30)
        assert page.evaluate("actions.length") == 4
        page.evaluate("onState({state: '打坐运功'}); SendCommand('stopstate'); onState({})")
        page.evaluate("onState({state: '打坐运功'}); send_cmd('stopstate', true); onState({})")
        page.evaluate("onState({state: '挖矿'}); onState({}); onState({state: '死亡'}); onState({})")
        page.evaluate("onState({state: '学习内功'}); connected = false; onState({}); connected = true")
        assert page.evaluate("actions.length") == 4
        page.evaluate("Process.player = 'role-2'; Setting.load({auto_work: 0}); onState({state: '打坐'}); onState({})")
        assert page.evaluate("Setting.auto_work") == 0
        assert page.evaluate("actions.length") == 4
        page.evaluate("Process.player = 'role-1'; Setting.load({auto_work: 0}); Setting.save('auto_work', 'wa')")
        assert page.evaluate("commands.at(-1)") == "setting auto_work wa"
        assert page.evaluate("localStorage.getItem('WSMudEX_auto_work_script_role-1')") is None
        page.evaluate("Setting.load({auto_work: '#wg work'})")
        assert page.evaluate("commands.at(-1)") == "setting auto_work 0"
        page.evaluate("Setting.save('auto_work', 0); onState({state: '打坐'}); onState({})")
        assert page.evaluate("actions.length") == 4
        assert page.evaluate("localStorage.getItem('WSMudEX_auto_work_script_role-1')") is None
        assert not errors, errors
        print("验证通过：真实高级设置保存、客户端脚本状态触发、重复包去重、主动停止、断线、角色隔离、恢复、禁用、普通命令和旧服务端配置迁移。")
    finally:
        browser.close()
