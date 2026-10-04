"""Test real backpack/warehouse rendering with native CSS and floating sizing."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--reproduce", action="store_true")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
native = (root.parent / "wsmud2/src/dialog/packet.js").read_text()
native_css = "\n".join(native.split("const " + name + " = `", 1)[1].split("`;", 1)[0] for name in ["packet_css", "list_css"])

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        for mode in ["pack", "list"]:
            page = browser.new_page(viewport={"width": 1200, "height": 1000})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.set_content("""<div class='dialog WG_floating_dialog' style='width:900px;height:780px;left:30px;top:20px'>
              <div class='dialog-header'>物品</div><div class='dialog-content'></div><div class='dialog-footer'></div></div>""")
            page.add_style_tag(content="body{font-size:16px}.dialog-header,.dialog-footer{height:40px}.obj-item{min-height:30px}pre{font:inherit}")
            page.add_style_tag(content=native_css)
            page.add_style_tag(path=root / "features/plugin/plugin-enhancements.css")
            page.add_script_tag(path=root / "vendor/jquery-3.7.1.js")
            page.evaluate("""() => {
              window.Dialog = {
                isShow: true, curItem: 'list',
                contentElement: $('.dialog-content'), footerElement: $('.dialog-footer'),
                skills: {close() {}, hide() {}}, extend: {append() {}}, title() {}, icon() {}, init() {},
                footer(html) { this.footerElement.html(html); }
              };
              window.Setting = {auto_sortitem: false}; window.SCRIPT = {};
              window.SendCommand = () => {}; window.ReceiveMessage = () => {};
              window.checkScroll = () => {};
            }""")
            page.add_script_tag(content=(root / "sources/game-client/62-dialog-inventory.jsfrag").read_text())
            page.evaluate("""mode => {
              const items = Array.from({length:80}, (_,index) => ({
                id: 'item-' + index, name: '测试物品' + index, grade: 0, count: 1, unit: '个'
              }));
              Dialog.pack.items = items; Dialog.pack.max_count = 80; Dialog.pack.eqs = [];
              if (mode === 'pack') {
                Dialog.pack.show();
                Dialog.footer('<span cmd="eqgroup 0">配装1</span>');
              } else {
                Dialog.list.isstore = true;
                Dialog.list.items = items;
                Dialog.list.show();
                Dialog.list.create_items(items, Dialog.list.leftElement, 3, 80);
                Dialog.list.create_items(items, Dialog.list.rightElement, 1, 80);
                Dialog.list.show_footer(100);
              }
            }""", mode)
            columns = ".eq-list,.obj-list" if mode == "pack" else ".trade-list,.obj-list"
            selector = ".dialog-pack" if mode == "pack" else ".dialog-list"

            def metrics():
                return page.evaluate("""({selector, columns}) => {
                  const content = document.querySelector('.dialog-content');
                  const rect = content.getBoundingClientRect();
                  const panel = document.querySelector(selector);
                  return {gap: rect.bottom - panel.getBoundingClientRect().bottom,
                    columnGaps: [...panel.querySelectorAll(columns)].map(node => rect.bottom - node.getBoundingClientRect().bottom),
                    overflow: content.scrollHeight - content.clientHeight};
                }""", {"selector": selector, "columns": columns})

            if args.reproduce:
                before = metrics()
                assert before["gap"] > 100, before
                print("已复现固定高度留白：", mode, before)
            else:
                for height in [780, 360, 900]:
                    page.evaluate("height => $('.dialog').css('height', height + 'px')", height)
                    result = metrics()
                    assert abs(result["gap"]) <= 1 and result["overflow"] <= 1, result
                    assert all(abs(gap) <= 1 for gap in result["columnGaps"]), result
                page.locator(selector + " > .obj-list").evaluate("element => element.scrollTop = 10000")
                assert page.locator(selector + " > .obj-list").evaluate("element => element.scrollTop") > 0
                if mode == "list":
                    page.locator('.trade-list').evaluate("element => element.scrollTop = 10000")
                    assert page.locator('.trade-list').evaluate("element => element.scrollTop") > 0
                page.locator(selector + " > .obj-list .obj-item").last.click()
                assert page.locator(selector + ' .item-commands').is_visible()
                assert page.locator('.dialog-footer [cmd]').is_visible()
                page.evaluate("Dialog.pack.show_sub('长物品说明\\n'.repeat(100))")
                page.locator('.obj-desc').evaluate("element => element.scrollTop = 10000")
                assert page.locator('.obj-desc').evaluate("element => element.scrollTop") > 0
                gap = page.evaluate("document.querySelector('.dialog-content').getBoundingClientRect().bottom - document.querySelector('.obj-desc').getBoundingClientRect().bottom")
                assert abs(gap) <= 1, gap
                page.locator('.obj-desc').click()
                assert page.locator(selector + " > .obj-list").is_visible()
                page.evaluate("$('.dialog').removeClass('WG_floating_dialog')")
                expected = (25.625 if mode == 'pack' else 21.25) * 16
                assert abs(page.locator(selector + ' > .obj-list').bounding_box()['height'] - expected) <= 1
                assert not errors, errors
            page.close()
        if not args.reproduce:
            print("验证通过：背包/仓库填满悬浮窗、长列表与详情滚动、物品操作、详情返回、底部按钮、原生高度保留。")
    finally:
        browser.close()
