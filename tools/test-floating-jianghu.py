"""Check native Jianghu CSS and real dungeon rendering in a resized window."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--reproduce", action="store_true")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
native = (root.parent / "wsmud2/src/dialog/jh.js").read_text().split("const jh_css = `", 1)[1].rsplit("`;", 1)[0]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page(viewport={"width": 1200, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_content("""<div class='dialog WG_floating_dialog' style='width:900px;height:780px;left:30px;top:20px'>
          <div class='dialog-header'>江湖</div><div class='dialog-content'></div><div class='dialog-footer'></div></div>""")
        page.add_style_tag(content="body {font-size:16px} .dialog-header,.dialog-footer{height:40px} pre{font:inherit}")
        page.add_style_tag(content=native)
        page.add_style_tag(path=root / "features/plugin/plugin-enhancements.css")
        for path in ["vendor/jquery-3.7.1.js", "client/core.js", "client/modules/dialog-jianghu.js"]:
            page.add_script_tag(path=root / path)
        page.evaluate("""() => {
          window.commands = [];
          window.Dialog = {
            contentElement: $('.dialog-content'), footerElement: $('.dialog-footer'),
            title() {}, icon() {}
          };
          Object.assign(Dialog, WSMudClient.createModule('dialog-jianghu', {
            Dialog, jquery: $, sendCommand: command => commands.push(command), receiveMessage() {}
          }));
          Dialog.jh.show();
          const items = Array.from({length:30}, (_,index) => ({
            name: '副本' + index, unlock: true, index, desc: '燕子坞介绍',
            diffs: [1, 1], reward: '获得经验和潜能', status: []
          }));
          Dialog.jh_fb.items = items;
          Dialog.jh_fb.selected_index = 0;
          Dialog.jh.selected_item = Dialog.jh_fb;
          Dialog.jh_fb.show(Dialog.jh.listElement, Dialog.jh.descElement);
          Dialog.jh.create_footer();
        }""")

        def metrics():
            return page.evaluate("""() => {
              const rect = selector => document.querySelector(selector).getBoundingClientRect();
              return {gap: rect('.dialog-content').bottom - rect('.dialog-fb').bottom,
                leftGap: rect('.dialog-fb').bottom - rect('.fb-left').bottom,
                rightGap: rect('.dialog-fb').bottom - rect('.fb-right').bottom,
                outerOverflow: document.querySelector('.dialog-content').scrollHeight - document.querySelector('.dialog-content').clientHeight};
            }""")

        if args.reproduce:
            before = metrics()
            assert before["gap"] > 100, before
            print("已复现原生 25.5em 固定高度留白：", before)
        else:
            for height in [780, 500, 900]:
                page.evaluate("height => $('.dialog').css('height', height + 'px')", height)
                result = metrics()
                assert all(abs(result[key]) <= 1 for key in ["gap", "leftGap", "rightGap"]), result
                assert result["outerOverflow"] <= 1, result
            page.evaluate("$('.fb-left')[0].scrollTop = 10000")
            assert page.evaluate("$('.fb-left')[0].scrollTop") > 0
            assert page.evaluate("$('.fb-content')[0].scrollTop") == 0
            page.evaluate("Dialog.jh_fb.items[0].desc = '长描述\\n'.repeat(100); Dialog.jh_fb.showDetail(Dialog.jh_fb.items[0]); $('.fb-right')[0].scrollTop = 10000")
            assert page.evaluate("$('.fb-right')[0].scrollTop") > 0
            page.locator('.fb-right [cmd="jh fb 0 start1"]').evaluate("element => element.scrollIntoView()")
            assert page.locator('.fb-right [cmd="jh fb 0 start1"]').is_visible()
            assert page.locator('.dialog-footer [for="1"]').is_visible()
            page.evaluate("$('.dialog').removeClass('WG_floating_dialog')")
            assert abs(page.locator('.dialog-fb').bounding_box()["height"] - 25.5 * 16) <= 1
            assert not errors, errors
            print("验证通过：江湖面板随悬浮窗填满、两列独立滚动、长描述与进入按钮可达、底部标签可见、原生页面高度保留。")
    finally:
        browser.close()
