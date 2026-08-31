import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const loaderSource = readFileSync(
  join(extensionRoot, "extension/content-loader.js"),
  "utf8",
);
const arraySource = loaderSource.match(
  /const PAGE_SCRIPT_PATHS = \[([\s\S]*?)\];/,
)?.[1];
if (!arraySource) throw new Error("无法读取 PAGE_SCRIPT_PATHS");
const scriptPaths = [...arraySource.matchAll(/"([^"]+\.js)"/g)].map(
  (match) => match[1],
);

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.WSMUD_PLAYWRIGHT_EXECUTABLE || chromium.executablePath(),
});
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error.stack || error)));
await page.route("**/*", async (route) => {
  const url = route.request().url();
  if (/\/dist\/ws\.js(?:\?|$)/.test(url)) return route.abort();
  if (["font", "image", "media"].includes(route.request().resourceType()))
    return route.abort();
  return route.continue();
});
await page.addInitScript(() => {
  window.__nativeSocketSends = [];
  window.__nativeSockets = [];
  class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.protocol = "";
      this.readyState = FakeWebSocket.OPEN;
      this.bufferedAmount = 0;
      this.extensions = "";
      this.binaryType = "blob";
      window.__nativeSockets.push(this);
      setTimeout(() => this.onopen && this.onopen({ type: "open" }), 0);
    }
    send(command) {
      const text = String(command);
      window.__nativeSocketSends.push(text);
      if (typeof window.__onNativeSocketSend === "function")
        window.__onNativeSocketSend(text);
    }
    close() {
      this.readyState = FakeWebSocket.CLOSED;
      if (this.onclose) this.onclose({ type: "close" });
    }
  }
  window.WebSocket = FakeWebSocket;
});

try {
  await page.goto("http://wsmud2.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.evaluate(() => {
    let roleList = document.querySelector(".role-list");
    if (!roleList) {
      roleList = document.createElement("ul");
      roleList.className = "role-list";
      document.body.appendChild(roleList);
    }
    const role = document.createElement("li");
    role.className = "role-item select";
    role.setAttribute("roleid", "browser-smoke-role");
    role.textContent = "浏览器烟测角色";
    roleList.appendChild(role);
  });
  await page.addStyleTag({
    path: join(extensionRoot, "features/plugin/plugin-enhancements.css"),
  });

  for (const scriptPath of scriptPaths) {
    await page.addScriptTag({ path: join(extensionRoot, scriptPath) });
  }
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const socket = new mysocket("ws://browser-smoke.invalid:1");
    socket.onmessage = function (event) {
      if (event && typeof event.data === "string" && /^[\[{]/.test(event.data))
        ReceiveData(JSON.parse(event.data));
      else if (event && event.data != null) ReceiveMessage(String(event.data));
    };
    window.__automationSmokeSocket = socket;
    GameClient = {
      Connected: function () {
        return true;
      },
      Send: function (command) {
        window.WG.Send(command);
      },
    };
    GM_setValue(
      "browser-smoke-role_zdy_item_store2",
      "<wht>测试存仓物品</wht>",
    );
    document.querySelector(".right-bar")?.insertAdjacentHTML(
      "afterbegin",
      '<span command="pluginsettings" class="tool-item"><svg class="tool-icon WG_plugin_tool_icon" viewBox="0 0 24 24"></svg></span>',
    );
    window.WG.login();
  });
  await page.waitForTimeout(250);

  const layoutState = await page.evaluate(() => {
    const left = document.querySelectorAll(".WG_side_rail_left");
    const right = document.querySelectorAll(".WG_side_rail_right");
    window.WG.setFloatingPanelOpen(true);
    document.querySelector(".WG_floating_close")?.click();
    const panel = document.querySelector(".WG_floating_panel");
    return {
      leftCount: left.length,
      rightCount: right.length,
      leftDisplay: left[0] && getComputedStyle(left[0]).display,
      rightDisplay: right[0] && getComputedStyle(right[0]).display,
      floatingDisplay: panel && getComputedStyle(panel).display,
    };
  });
  if (
    layoutState.leftCount !== 1 ||
    layoutState.rightCount !== 1 ||
    layoutState.leftDisplay === "none" ||
    layoutState.rightDisplay === "none"
  )
    throw new Error("登录后左右双栏没有正确挂载: " + JSON.stringify(layoutState));
  if (layoutState.floatingDisplay !== "none")
    throw new Error("悬浮窗关闭按钮没有收起面板: " + JSON.stringify(layoutState));

  const pluginToolState = await page.evaluate(() => {
    ToolAction.SetToolsOpen(true);
    const button = document.querySelector('.right-bar > [command="pluginsettings"]');
    const label = button?.querySelector(".tool-text");
    const buttonRect = button?.getBoundingClientRect();
    const labelRect = label?.getBoundingClientRect();
    return {
      count: document.querySelectorAll(
        '.right-bar > [command="pluginsettings"]',
      ).length,
      text: label?.textContent,
      labelDisplay: label && getComputedStyle(label).display,
      labelVisibility: label && getComputedStyle(label).visibility,
      labelColor: label && getComputedStyle(label).color,
      ariaLabel: button?.getAttribute("aria-label"),
      buttonHeight: buttonRect?.height,
      labelTop: labelRect?.top,
      labelBottom: labelRect?.bottom,
      buttonTop: buttonRect?.top,
      buttonBottom: buttonRect?.bottom,
    };
  });
  if (
    pluginToolState.count !== 1 ||
    pluginToolState.text?.trim() !== "插件" ||
    pluginToolState.ariaLabel !== "插件设置" ||
    pluginToolState.labelDisplay === "none" ||
    pluginToolState.labelVisibility === "hidden" ||
    pluginToolState.labelBottom > pluginToolState.buttonBottom + 0.5
  )
    throw new Error(
      "三点菜单插件入口文字不可见: " + JSON.stringify(pluginToolState),
    );

  await page.evaluate(() => {
    window.G.id = "browser-smoke-role";
    Dialog.pack.items = [
      {
        name: "<wht>换装前旧缓存</wht>",
        id: "stale-pack-item",
        count: 1,
        grade: 0,
      },
    ];
    Dialog.pack.eqs = [];
    window.WG.equipmentPickerPackRequest = true;
    const receive = window.__nativeSockets[0].onmessage;
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "score",
        id: "browser-smoke-role",
        level: "<hiy>武圣</hiy>",
        hp: 321,
        max_hp: 654,
        mp: 111,
        max_mp: 222,
        jingli: "45/100(+6)",
        pot: 789,
        exp: 987,
        limit_mp: 333,
      }),
    });
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "pack",
        items: [],
        eqs: [["<hiy>烟测长剑</hiy>", "smoke-sword", 3, 0, 0]],
      }),
    });
  });
  await page.waitForTimeout(80);
  const dashboardState = await page.evaluate(() => ({
    hp: document.querySelector('[data-resource="hp"] .WG_resource_value')
      ?.textContent,
    mp: document.querySelector('[data-resource="mp"] .WG_resource_value')
      ?.textContent,
    energy: document.querySelector('[data-resource="energy"]')?.textContent,
    potential: document.querySelector(
      '[data-resource="potential"] .WG_resource_value',
    )?.textContent,
    experience: document.querySelector(
      '[data-resource="experience"] .WG_resource_value',
    )?.textContent,
    equipment: document.querySelector(".WG_equipment_name")?.textContent,
  }));
  for (const [key, expected] of Object.entries({
    hp: "321 / 654",
    mp: "111 / 222 (333)",
    potential: "789",
    experience: "987",
    equipment: "烟测长剑",
  })) {
    if (!String(dashboardState[key] || "").includes(expected))
      throw new Error(
        "左侧信息未实时同步 " + key + ": " + JSON.stringify(dashboardState),
      );
  }
  if (!String(dashboardState.energy || "").includes("45 / 100"))
    throw new Error("左侧精力未实时同步: " + JSON.stringify(dashboardState));

  await page.evaluate(() => {
    window.__nativeSockets[0].onmessage({
      data: JSON.stringify({
        type: "login",
        id: "browser-smoke-role",
      }),
    });
  });
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    Dialog.footer("黄金 商城 充值");
    HandlerMenuCommand("tasks");
    const receive = window.__nativeSockets[0].onmessage;
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "pack",
        items: [],
        eqs: [],
      }),
    });
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "score",
        id: "browser-smoke-role",
        hp: 321,
        max_hp: 654,
        mp: 111,
        max_mp: 222,
        jingli: "45/100(+6)",
        pot: 789,
        exp: 987,
        limit_mp: 333,
      }),
    });
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "score",
        id: "browser-smoke-role",
        study_per: "100%",
        releasetime: "0秒",
      }),
    });
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "party",
        name: "烟测门派",
      }),
    });
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "tasks",
        items: [
          {
            id: "sm",
            title: "烟测任务",
            desc: "现网任务描述格式已经变化",
            state: 1,
          },
        ],
      }),
    });
  });
  await page.waitForTimeout(80);
  const taskDialogState = await page.evaluate(() => ({
    current: Dialog.curItem,
    title: document.querySelector(".dialog-title")?.textContent,
    taskText: document.querySelector(".dialog-tasks")?.textContent,
    footerText: document.querySelector(".dialog-footer")?.textContent,
  }));
  if (
    taskDialogState.current !== "tasks" ||
    !String(taskDialogState.taskText || "").includes("烟测任务")
  )
    throw new Error(
      "任务描述变化或后台快照阻断了用户任务窗口: " +
        JSON.stringify(taskDialogState),
    );
  if (/黄金|商城|充值/.test(String(taskDialogState.footerText || "")))
    throw new Error(
      "任务窗口仍残留商城页脚: " + JSON.stringify(taskDialogState),
    );

  await page.evaluate(() => {
    window.__nativeSocketSends.length = 0;
    window.WG.equipmentPickerPackRequest = true;
    window.WG.suppressNextResponse(
      (event) =>
        event.type === "dialog" &&
        event.dialog === "pack" &&
        Array.isArray(event.items),
      3000,
    );
    HandlerMenuCommand("pack");
    window.__nativeSockets[0].onmessage({
      data: JSON.stringify({
        type: "dialog",
        dialog: "pack",
        items: [
          ["<wht>烟测背包物品</wht>", "manual-pack-item", 1, 0, "个", 0],
        ],
        eqs: [],
      }),
    });
  });
  await page.waitForTimeout(50);
  const manualPackState = await page.evaluate(() => ({
    current: Dialog.curItem,
    itemCount: Dialog.pack.items && Dialog.pack.items.length,
    itemName: Dialog.pack.items && Dialog.pack.items[0]?.name,
    commands: window.__nativeSocketSends.slice(),
  }));
  if (
    manualPackState.current !== "pack" ||
    manualPackState.itemCount !== 1 ||
    !String(manualPackState.itemName || "").includes("烟测背包物品")
  )
    throw new Error(
      "用户手动背包响应被静默快照吞掉: " + JSON.stringify(manualPackState),
    );
  if (!manualPackState.commands.includes("pack"))
    throw new Error(
      "后台快照污染了原生背包缓存，手动打开未请求完整 pack: " +
        JSON.stringify(manualPackState),
    );

  const startup = await page.evaluate(() => ({
    source: window.WSMudAutomationSource,
    hasWG: typeof window.WG === "object",
    hasNativeBridge: typeof window.WGRunNativeExtensionAction === "function",
    cleanupSource: String(window.WG && window.WG.sell_all),
    autoSource: String(window.WG && window.WG.auto_preform),
  }));
  if (!startup.hasWG || !startup.hasNativeBridge)
    throw new Error("上游核心或 #wg 原生动作桥未完成初始化");
  if (startup.source?.commit !== "c1112c0f5b8b2957de20a0f11a66e77f22321f32")
    throw new Error("实际运行的不是固化上游核心");
  if (!startup.cleanupSource.includes('WG.go("扬州城-钱庄")'))
    throw new Error("清包函数已被非上游模块覆盖");
  if (!startup.autoSource.includes("for (var skill of G.skills)"))
    throw new Error("自动攻击函数已被非上游模块覆盖");

  await page.evaluate(() => {
    if (!window.ToRaid || typeof window.ToRaid.perform !== "function")
      throw new Error("自动副本入口未初始化");
    window.ToRaid.perform("[exit]", "自动副本-浏览器烟测", false);
  });
  await page.waitForTimeout(30);

  await page.evaluate(() => {
    window.__nativeSocketSends.length = 0;
    window.__wgSendCalls = [];
    const originalSend = window.WG.Send;
    window.WG.Send = function (command) {
      window.__wgSendCalls.push(String(command));
      return originalSend.call(window.WG, command);
    };
    window.WG.Send("browser-smoke-probe");
    const button = document.createElement("span");
    button.className = "act-item";
    button.setAttribute("cmd", "#wg cleanup");
    document.querySelector(".room-commands").appendChild(button);
    button.click();
  });
  await page.waitForTimeout(250);
  const cleanupSends = await page.evaluate(() => [...window.__nativeSocketSends]);
  const cleanupPromptVisible = await page.evaluate(() =>
    document.body.textContent.includes("包裹整理开始"),
  );
  if (!cleanupSends.includes("browser-smoke-probe"))
    throw new Error("上游命令传输没有连接到页面 WebSocket");
  if (!cleanupPromptVisible)
    throw new Error("点击 #wg cleanup 后看不到清包启动提示");
  if (!cleanupSends.some((command) => command.includes("store"))) {
    const cleanupDebug = await page.evaluate(() => ({
      containerCommand: typeof ContainerCommand,
      scriptEngine: typeof SCRIPT,
      bridge: typeof window.WGRunNativeExtensionAction,
      socketCount: window.__nativeSockets.length,
      wrapperReadyState: window.__automationSmokeSocket?.readyState,
      packupListener: window.WG?.packup_listener,
      wgSendCalls: window.__wgSendCalls,
    }));
    throw new Error(
      "点击 #wg cleanup 后没有发出仓库/背包命令\n" +
        JSON.stringify({ cleanupSends, cleanupDebug, pageErrors }, null, 2),
    );
  }

  await page.evaluate(() => {
    const receive = window.__nativeSockets[0].onmessage;
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "list",
        stores: [],
      }),
    });
    receive({
      data: JSON.stringify({
        type: "dialog",
        dialog: "pack",
        items: [
          [
            "<wht>测试存仓物品</wht>",
            "smoke-store-item",
            2,
            0,
            "个",
            0,
            0,
            0,
            0,
            0,
            0,
            0,
          ],
        ],
        eqs: [],
      }),
    });
  });
  await page.waitForTimeout(2400);
  const cleanupCompletionSends = await page.evaluate(() => [
    ...window.__nativeSocketSends,
  ]);
  if (!cleanupCompletionSends.includes("sell all"))
    throw new Error("清包收到仓库/背包协议后没有继续前往杂货铺售卖");
  if (!cleanupCompletionSends.includes("store 2 smoke-store-item"))
    throw new Error("清包没有解码压缩背包条目并执行存仓");

  await page.evaluate(() => {
    window.WG.cancelInventoryCleanup && window.WG.cancelInventoryCleanup();
    if (window.WG.packup_listener != null) {
      window.WG.remove_hook(window.WG.packup_listener);
      window.WG.packup_listener = undefined;
      window.WG.packup_ready = false;
    }
    window.__nativeSocketSends.length = 0;
    window.G.auto_preform = false;
    window.G.auto_pfm_mode = false;
    window.G.in_fight = true;
    window.G.gcd = false;
    window.G.skills = [{ id: "smoke.first" }, { id: "smoke.second" }];
    window.G.cds = new Map();
    window.__onNativeSocketSend = function (command) {
      if (command === "perform smoke.first")
        window.G.cds.set("smoke.first", true);
      if (command === "perform smoke.second")
        window.G.cds.set("smoke.second", true);
    };
    window.WGRunNativeExtensionAction("auto");
  });
  await page.waitForTimeout(1100);
  const combatSends = await page.evaluate(() => {
    window.G.in_fight = false;
    window.WG.auto_preform("stop");
    return [...window.__nativeSocketSends];
  });
  for (const command of ["perform smoke.first", "perform smoke.second"]) {
    if (!combatSends.includes(command))
      throw new Error("自动攻击未连续选择可用技能: " + command);
  }

  const relevantErrors = pageErrors.filter(
    (error) =>
      !/ERR_FAILED|ERR_ABORTED|Failed to load resource|AudioContext/i.test(error) &&
      !/Cannot read properties of undefined \(reading 'ip'\)/i.test(error),
  );
  if (relevantErrors.length)
    throw new Error("页面运行错误:\n" + relevantErrors.join("\n\n"));
  console.log(
    JSON.stringify(
      {
        startup: startup.source,
        layoutState,
        pluginToolState,
        dashboardState,
        taskDialogState,
        manualPackState,
        cleanupSends: cleanupCompletionSends,
        combatSends: combatSends.filter((command) => command.startsWith("perform ")),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
