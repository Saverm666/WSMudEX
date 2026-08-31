from playwright.sync_api import sync_playwright


HTML = """
<!doctype html>
<style>
  html, body { width: 100%; height: 100%; margin: 0; }
  .container { width: 100%; height: 100%; display: flex; flex-direction: column; }
  .WG_middle_split { position: relative; display: flex; flex: 1 1 0; flex-direction: column; min-height: 0; overflow: hidden; }
  .WG_info_panel_controls { position: absolute; top: var(--WG-middle-split-position, 45%); right: 0; left: 0; height: 0; }
  .container.WG_middle_split_managed > .WG_middle_split > .content-room {
    display: flex; flex-grow: var(--WG-room-panel-share, 45); flex-shrink: 1;
    flex-basis: 0; flex-direction: column; min-height: 0; max-height: none; overflow: hidden;
  }
  .content-room > .room-title, .content-room > .room_desc, .content-room > .room_exits { flex: 0 0 auto; }
  .content-room > .room_items { flex: 1 1 auto; min-height: 0; max-height: none !important; overflow-y: auto !important; }
  .container.WG_middle_split_managed > .WG_middle_split > .content-message {
    flex-grow: var(--WG-message-panel-share, 55); flex-shrink: 1;
    flex-basis: 0; min-height: 0; overflow-y: auto;
  }
  .content-bottom { flex: 0 0 60px; }
  pre { height: 900px; margin: 0; }
  .room-title, .room_desc, .room_exits { height: 20px; }
</style>
<div class="container WG_middle_split_managed">
  <div class="WG_middle_split">
    <div class="content-room">
      <div class="room-title">地点</div>
      <div class="room_desc">描述</div>
      <div class="room_exits">出口</div>
      <div class="room_items" style="max-height: 8rem; overflow-y: auto"><pre>人物列表</pre></div>
    </div>
    <div class="content-message"><pre>信息内容</pre></div>
    <div class="WG_info_panel_controls"></div>
  </div>
  <div class="content-bottom"></div>
</div>
"""


def measure(page):
    return page.evaluate(
        """() => {
          const split = document.querySelector('.WG_middle_split').getBoundingClientRect();
          const room = document.querySelector('.content-room');
          const message = document.querySelector('.content-message');
          const roomItems = document.querySelector('.room_items');
          const controls = document.querySelector('.WG_info_panel_controls');
          const roomRect = room.getBoundingClientRect();
          const messageRect = message.getBoundingClientRect();
          return {
            splitHeight: split.height,
            roomHeight: roomRect.height,
            roomItemsHeight: roomItems.getBoundingClientRect().height,
            messageHeight: messageRect.height,
            seamGap: messageRect.top - roomRect.bottom,
            controlGap: controls.getBoundingClientRect().top - messageRect.top,
            roomItemsScrolls: roomItems.scrollHeight > roomItems.clientHeight,
            messageScrolls: message.scrollHeight > message.clientHeight,
          };
        }"""
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1200, "height": 800})
    page.set_content(HTML, wait_until="load")

    before = measure(page)
    page.evaluate(
        """() => {
          document.documentElement.style.setProperty('--WG-room-panel-share', '25');
          document.documentElement.style.setProperty('--WG-message-panel-share', '75');
          document.documentElement.style.setProperty('--WG-middle-split-position', '25%');
        }"""
    )
    after = measure(page)

    assert abs(before["seamGap"]) < 0.5
    assert abs(after["seamGap"]) < 0.5
    assert abs(before["controlGap"]) < 0.5
    assert abs(after["controlGap"]) < 0.5
    assert abs(before["roomHeight"] + before["messageHeight"] - before["splitHeight"]) < 0.5
    assert abs(after["roomHeight"] + after["messageHeight"] - after["splitHeight"]) < 0.5
    assert after["roomHeight"] < before["roomHeight"]
    assert after["roomItemsHeight"] < before["roomItemsHeight"]
    assert after["messageHeight"] > before["messageHeight"]
    assert before["roomItemsScrolls"] and before["messageScrolls"]
    assert after["roomItemsScrolls"] and after["messageScrolls"]

    print({"before": before, "after": after})
    browser.close()
