"""Browser regression for the shipped room rewrite and room renderer."""
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "features/upstream-automation.js").read_text()
marker = source.index("//精简房间描述、生成功能按钮")
start = source.rfind("            if (data.type == 'room') {", 0, marker)
end = source.index("\n            WG.run_hook(data.type, data);", marker)
branch = source[start:end]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_content("""
            <div class="room-name"></div><div class="room_desc"></div>
            <div class="room_items"></div><div class="room-commands"></div>
        """)
        page.add_script_tag(path=str(ROOT / "vendor/jquery-3.7.1.js"))
        page.evaluate("window.WSMudClient = {registerModule(name, factory) {window.roomFactory = factory;}}")
        page.add_script_tag(path=str(ROOT / "client/modules/room-renderer.js"))
        page.evaluate("""branch => {
            window.sent = [];
            const process = {
                closeItemPopup() {}, message: {clear() {}},
                searchItems() {},
            };
            const renderer = roomFactory({
                jquery: $, getProcess: () => process,
                getSetting: () => ({}), receiveMessage() {},
                getCombat: () => ({ShowRoomCommands(commands) {
                    $('.room-commands').empty();
                    commands.forEach(command => $('<button>').attr('cmd', command.cmd)
                        .html(command.name).appendTo('.room-commands'));
                }}),
                getMap: () => ({SetRoom() {}, OnRoomChanged() {}}),
            });
            // Capture the command at the fixture's transport boundary.
            $(document).on('click', '[cmd]', function () {sent.push($(this).attr('cmd'));});
            const rewrite = new Function('data', 'msg', 'deepCopy', 'WG', 'ws_on_message', '$', branch);
            window.renderRoom = data => rewrite(data, {data: JSON.stringify(data)},
                value => ({...value}), {run_hook() {}},
                message => renderer.room(JSON.parse(message.data)), $);
        }""", branch)
        cases = [
            ("<CMD cmd='look men'>门(men)</CMD>", "look men", "门"),
            ('<CMD cmd="look men">门(men)</CMD>', "look men", "门"),
            ("<CMD cmd='look men'>门(men)<CMD>", "look men", "门"),
            ("<cmd cmd='look tree'>大榕树(tree)</cmd>", "look tree", "大榕树"),
            ("<span cmd='look painting'>画</span>", "look painting", "画"),
        ]
        for index, (tag, command, name) in enumerate(cases):
            page.evaluate("data => renderRoom(data)", {
                "type": "room", "name": "测试房间", "path": f"test/{index}",
                "desc": f"这里是测试房间。附近有一个{tag}，后面还有一段足够长的房间描述。",
                "commands": [],
            })
            entrance = page.locator(f'.room_desc [cmd="{command}"]').first
            expect(entrance).to_be_visible()
            expect(entrance).to_have_text(name)
            entrance.click()
            assert page.evaluate("sent.at(-1)") == command
            button = page.locator(f'.room-commands [cmd="{command}"]')
            expect(button).to_be_visible()
            button.click()
            assert page.evaluate("sent.at(-1)") == command
            page.locator("#show").click()
            expect(page.locator("#more")).to_be_visible()
            expect(entrance).to_be_visible()
            page.locator("#hide").click()
            expect(page.locator("#more")).to_be_hidden()
            expect(entrance).to_be_visible()
        assert not errors, errors
        print("通过：5 组房间入口可见、点击命令、描述展开/收起；无浏览器异常。")
    finally:
        browser.close()
