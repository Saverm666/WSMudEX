import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { semanticSourceBundles } from "./semantic-source-layout.mjs";
import {
  activePluginModuleSources,
  pluginModuleSources,
} from "./plugin-module-layout.mjs";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const expectedScriptOrder = [
  "runtime/userscript-compat.js",
  "runtime/page-settings-sync.js",
  "vendor/jquery-3.7.1.js",
  "vendor/vue-2.6.11.js",
  "vendor/layer-2.3.js",
  "vendor/context-menu.js",
  "vendor/store-2.0.12.js",
  ...activePluginModuleSources,
  "features/upstream-automation.js",
  "features/plugin/native-client-compat.js",
  "features/raid-flow-engine.js",
  "features/trigger-system.js",
  "client/core.js",
  "client/modules/map.js",
  "client/modules/utilities.js",
  "client/modules/combat.js",
  "client/modules/tool-action.js",
  "client/modules/warnings.js",
  "client/modules/touch.js",
  "client/modules/view-storage.js",
  "client/modules/connection.js",
  "client/modules/network-api.js",
  "client/modules/settings.js",
  "client/modules/dialog-skills.js",
  "client/modules/skill-calculator.js",
  "client/modules/dialog-channel.js",
  "client/modules/dialog-tasks.js",
  "client/modules/dialog-jianghu.js",
  "client/modules/dialog-stats.js",
 "client/modules/dialog-keys.js",
  "client/modules/dialog-shop.js",
  "client/modules/dialog-social.js",
  "client/modules/dialog-events.js",
  "client/modules/dialog-pm.js",
  "client/modules/dialog-extensions.js",
  "client/modules/detail-popup-policy.js",
 "client/modules/message-queue.js",
  "client/modules/script-engine.js",
  "client/modules/confirmation.js",
  "client/modules/room-renderer.js",
  "client/game-client.js",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(action, message) {
  let threw = false;
  try {
    action();
  } catch (_error) {
    threw = true;
  }
  assert(threw, message);
}

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entryName) => {
    const entryPath = join(directory, entryName);
    return statSync(entryPath).isDirectory()
      ? collectFiles(entryPath)
      : entryPath;
  });
}

const manifestPath = join(extensionRoot, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert(manifest.manifest_version === 3, "Manifest 必须保持为版本 3");
const manifestMatchLists = [
  manifest.host_permissions,
  ...manifest.content_scripts.map((entry) => entry.matches),
  ...manifest.web_accessible_resources.map((entry) => entry.matches),
];
for (const domain of ["wsmud2.com", "wsmud2.cn", "wxmud1.com"]) {
  for (const patterns of manifestMatchLists) {
    assert(
      patterns.some((pattern) => pattern.includes(`*.${domain}/*`)),
      `Manifest 未匹配 ${domain} 子域名`,
    );
  }
}
assert(
  manifest.content_scripts[0].matches.includes("https://wsmud2.cn/*") &&
    manifest.host_permissions.includes("https://wsmud2.cn/*"),
  "Manifest 未匹配 wsmud2.cn 根域名",
);
assert(
  manifest.content_scripts[0].matches.includes("https://wxmud1.com/*") &&
    manifest.host_permissions.includes("https://wxmud1.com/*"),
  "Manifest 未匹配 wxmud1.com 根域名",
);
assert(
  manifest.web_accessible_resources.some((entry) =>
    entry.resources.includes("features/plugin/plugin-enhancements.css"),
  ),
  "插件模块样式未声明为页面可访问资源",
);

const manifestFiles = [
  manifest.action.default_popup,
  manifest.icons["128"],
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap((entry) => entry.js),
];
for (const resourcePath of manifestFiles) {
  assert(
    existsSync(join(extensionRoot, resourcePath)),
    `缺少资源: ${resourcePath}`,
  );
}

const loaderPath = join(extensionRoot, "extension/content-loader.js");
const loaderSource = readFileSync(loaderPath, "utf8");
assert(
  loaderSource.includes('host.endsWith(".wsmud2.cn")'),
  "内容脚本未拦截 wsmud2.cn 原站脚本",
);
assert(
  loaderSource.includes("shouldReplaceGameClient") &&
    loaderSource.includes("selectPageScripts"),
  "内容脚本未按站点选择替换客户端或叠加插件",
);
assert(
  readFileSync(join(extensionRoot, "extension/page-load-plan.js"), "utf8").includes(
    "wxmud1.com",
  ),
  "加载计划未识别 wxmud1.com 叠加站点",
);
const arraySource = loaderSource.match(
  /const PAGE_SCRIPT_PATHS = \[([\s\S]*?)\];/,
)?.[1];
assert(arraySource, "无法读取 PAGE_SCRIPT_PATHS");
const actualScriptOrder = [...arraySource.matchAll(/"([^"]+\.js)"/g)].map(
  (match) => match[1],
);
assert(
  JSON.stringify(actualScriptOrder) === JSON.stringify(expectedScriptOrder),
  "页面脚本注入顺序发生变化",
);
for (const scriptPath of actualScriptOrder) {
  assert(
    existsSync(join(extensionRoot, scriptPath)),
    `缺少注入脚本: ${scriptPath}`,
  );
}

let semanticFragmentCount = 0;
for (const sourceBundle of semanticSourceBundles) {
  const fragmentNames = sourceBundle.fragments.map(([fragmentName]) => fragmentName);
  assert(
    JSON.stringify(fragmentNames) === JSON.stringify([...fragmentNames].sort()),
    `${sourceBundle.bundle} 的语义片段文件名未按加载顺序排列`,
  );
  const generatedSource = sourceBundle.fragments
    .map(([fragmentName]) => {
      const fragmentPath = join(
        extensionRoot,
        sourceBundle.sourceDir,
        fragmentName,
      );
      assert(existsSync(fragmentPath), `缺少语义源码片段: ${fragmentPath}`);
      semanticFragmentCount += 1;
      return readFileSync(fragmentPath, "utf8");
    })
    .join("");
  const bundleSource = readFileSync(
    join(extensionRoot, sourceBundle.bundle),
    "utf8",
  );
  for (const [fragmentName, marker] of sourceBundle.fragments.slice(1)) {
    const markerIndex = bundleSource.indexOf(marker);
    assert(
      markerIndex >= 0 && bundleSource.indexOf(marker, markerIndex + 1) < 0,
      `${sourceBundle.bundle} 的 ${fragmentName} 反向抽取边界缺失或不唯一`,
    );
  }
  assert(
    generatedSource === bundleSource,
    `${sourceBundle.bundle} 与语义源码片段不一致，请运行 sync-semantic-sources.mjs build`,
  );
}

const requiredProtocolNames = [
  "extensionEnabled",
  "updateExtensionStatus",
  "GM_export",
  "GM_import",
  "GM_listKeys",
  "GM_deleteKey",
];
for (const protocolName of requiredProtocolNames) {
  assert(
    loaderSource.includes(protocolName),
    `缺少协议或存储键: ${protocolName}`,
  );
}

const obsoleteRandomNames = [
  "OQnmUCFh",
  "PtFcg2HA",
  "Cfe70iMO",
  "I0SfHxpU",
  "j5VNih8g",
  "G8aNi4ta",
  "tJJN8u0D",
  "dU7VGSnh",
  "iP5HSXO4",
  "L2KwCGwH",
  "w5I3dxzp",
];
const entrySources = [
  readFileSync(manifestPath, "utf8"),
  loaderSource,
  readFileSync(join(extensionRoot, "popup/index.html"), "utf8"),
  readFileSync(join(extensionRoot, "popup/controller.js"), "utf8"),
].join("\n");
for (const obsoleteName of obsoleteRandomNames) {
  assert(
    !entrySources.includes(obsoleteName),
    `入口仍引用随机名称: ${obsoleteName}`,
  );
}

const javascriptFiles = collectFiles(extensionRoot).filter((filePath) =>
  filePath.endsWith(".js") || filePath.endsWith(".mjs"),
);
for (const javascriptFile of javascriptFiles) {
  execFileSync(process.execPath, ["--check", javascriptFile], {
    stdio: "pipe",
  });
}

assert(
  statSync(join(extensionRoot, "client/game-client.js")).size > 150_000,
  "游戏客户端文件大小异常",
);

const gameClientSource = readFileSync(
  join(extensionRoot, "client/game-client.js"),
  "utf8",
);
const confirmationSource = readFileSync(
  join(extensionRoot, "client/modules/confirmation.js"),
  "utf8",
);
const utilityModuleSource = readFileSync(
  join(extensionRoot, "client/modules/utilities.js"),
  "utf8",
);
const utilityBridgeSource = readFileSync(
  join(extensionRoot, "sources/game-client/85-utilities.jsfrag"),
  "utf8",
);
const scriptEngineSource = readFileSync(
  join(extensionRoot, "client/modules/script-engine.js"),
  "utf8",
);
const dialogSkillsModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-skills.js"),
  "utf8",
);
const dialogSkillsBridgeSource = readFileSync(
  join(extensionRoot, "sources/game-client/61-dialog-skills.jsfrag"),
  "utf8",
);
const combatModuleSource = readFileSync(
  join(extensionRoot, "client/modules/combat.js"),
  "utf8",
);
const roomRendererModuleSource = readFileSync(
  join(extensionRoot, "client/modules/room-renderer.js"),
  "utf8",
);
const roomRendererBridgeSource = readFileSync(
  join(extensionRoot, "sources/game-client/40-protocol-process.jsfrag"),
  "utf8",
);
const clientProcessRuntimeSource =
  gameClientSource + "\n" + roomRendererModuleSource;
const mapModuleSource = readFileSync(
  join(extensionRoot, "client/modules/map.js"),
  "utf8",
);
const mapBridgeSource = readFileSync(
  join(extensionRoot, "sources/game-client/55-map.jsfrag"),
  "utf8",
);
const mapRuntimeSource = gameClientSource + "\n" + mapModuleSource;
const combatBridgeSource = readFileSync(
  join(extensionRoot, "sources/game-client/50-combat.jsfrag"),
  "utf8",
);
const toolActionModuleSource = readFileSync(
  join(extensionRoot, "client/modules/tool-action.js"),
  "utf8",
);
const commandDispatchSource = readFileSync(
  join(extensionRoot, "sources/game-client/20-command-dispatch.jsfrag"),
  "utf8",
);
const detailPopupPolicySource = readFileSync(
  join(extensionRoot, "client/modules/detail-popup-policy.js"),
  "utf8",
);
const detailPopupPolicySandbox = {
  module: { exports: {} },
  WSMudClient: { registerModule() {} },
};
runInNewContext(detailPopupPolicySource, detailPopupPolicySandbox);
const detailPopupPolicy = detailPopupPolicySandbox.module.exports;
assert(
  detailPopupPolicySource.includes('registerModule("detail-popup-policy"') &&
    gameClientSource.includes('createModule(\n  "detail-popup-policy"') &&
    typeof detailPopupPolicy.isPopupDetailCommand === "function",
  "详情弹窗策略模块未注册或未接入客户端",
);
assert(
  utilityModuleSource.includes('registerModule("utilities"') &&
    utilityModuleSource.includes("installLegacyExtensions") &&
    utilityBridgeSource.includes(
      'createModule("utilities", {',
    ) &&
    utilityBridgeSource.includes("ClientUtilities.installLegacyExtensions();") &&
    utilityBridgeSource.includes("var Util = ClientUtilities;") &&
    !utilityBridgeSource.includes("Json2Str: function"),
  "客户端 utilities 模块或 85 兼容桥边界异常",
);
assert(
  combatModuleSource.includes('registerModule("combat"') &&
    combatBridgeSource.includes('var Combat = unsafeWindow.WSMudClient.createModule("combat"') &&
    !combatBridgeSource.includes("var Combat = {") &&
    combatModuleSource.includes("UpdaeBar: function") &&
    combatModuleSource.includes("PFM_INTERVAL: 300"),
  "客户端 Combat 模块、兼容桥或历史公开契约异常",
);
assert(
  mapModuleSource.includes('registerModule("map"') &&
    mapBridgeSource.includes(
      'var mapRuntime = unsafeWindow.WSMudClient.createModule("map"',
    ) &&
    mapBridgeSource.includes("var MAP = mapRuntime.MAP;") &&
    mapBridgeSource.includes(
      "var CreateHeadPanel = mapRuntime.CreateHeadPanel;",
    ) &&
    !mapBridgeSource.includes("var MAP = {") &&
    mapModuleSource.includes("CreateExitsMap: function") &&
    mapModuleSource.includes("StartAutoRoute: function"),
  "客户端 MAP 模块、兼容桥或历史公开 API 异常",
);
assert(
  toolActionModuleSource.includes('registerModule("tool-action"') &&
    commandDispatchSource.includes(
      'var ToolAction = unsafeWindow.WSMudClient.createModule("tool-action"',
    ) &&
    !commandDispatchSource.includes("var ToolAction = {") &&
    toolActionModuleSource.includes("HasUserToggled: false") &&
    toolActionModuleSource.includes("SetToolsOpen: function"),
  "客户端 ToolAction 模块、兼容桥或公开状态异常",
);
assert(
  roomRendererModuleSource.includes('registerModule("room-renderer"') &&
    roomRendererBridgeSource.includes(
      'createModule(\n  "room-renderer"',
    ) &&
    roomRendererBridgeSource.includes("Object.assign(Process, ClientRoomRenderer)") &&
    !roomRendererBridgeSource.includes("countwidth: function") &&
    roomRendererModuleSource.includes("resetRoomRendererSession") &&
    roomRendererModuleSource.includes("currentCombat.ClearRoomStatus()") &&
    combatModuleSource.includes("ClearStatusTarget: function") &&
    combatModuleSource.includes("ClearRoomStatus: function") &&
    roomRendererBridgeSource.includes(
      "if (this.resetRoomRendererSession) this.resetRoomRendererSession();",
    ) &&
    roomRendererBridgeSource.includes(
      "if (Process.resetRoomRendererSession) Process.resetRoomRendererSession();",
    ) &&
    gameClientSource.includes(
      'case "toserver":\n        Process.clear();\n        Process.player = null;',
    ),
  "客户端 room-renderer 模块、Process 对象桥或会话重置边界异常",
);
assert(
  /registerModule\(\s*["']dialog-skills["']/.test(dialogSkillsModuleSource) &&
    dialogSkillsBridgeSource.includes(
      'WSMudClient.createModule("dialog-skills"',
    ) &&
    dialogSkillsBridgeSource.includes(
      "Dialog.skills = ClientDialogSkills.skills",
    ) &&
    dialogSkillsBridgeSource.includes(
      "Dialog.master = ClientDialogSkills.master",
    ) &&
    !dialogSkillsBridgeSource.includes("Dialog.skills = {") &&
    !dialogSkillsBridgeSource.includes("Dialog.master = {") &&
    dialogSkillsModuleSource.includes("currentScript().LAST_OBJ") &&
    dialogSkillsModuleSource.includes('currentExtend().query("skill"') &&
    dialogSkillsModuleSource.includes('currentExtend().query("mskill"'),
  "技能/师父技能模块注册、原位薄桥或后置扩展依赖异常",
);
assert(
  (gameClientSource.match(/\.container"\)\.on\("click", ContainerCommand\)/g) || [])
    .length === 1 &&
    (gameClientSource.match(/Process\.init\(\);/g) || []).length === 1 &&
    (gameClientSource.match(/CheckLogin\(\);/g) || []).length === 1,
  "客户端 DOM 启动事件或初始化被重复注册",
);
const warningElements = [];
const warningTimers = [];
const warningSandbox = { window: {} };
warningSandbox.window.window = warningSandbox.window;
runInNewContext(
  readFileSync(join(extensionRoot, "client/core.js"), "utf8"),
  warningSandbox,
  { filename: "client/core.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/map.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/map.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/utilities.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/utilities.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/combat.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/combat.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/tool-action.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/tool-action.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/warnings.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/warnings.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/touch.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/touch.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/view-storage.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/view-storage.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/connection.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/connection.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/network-api.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/network-api.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/settings.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/settings.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/message-queue.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/message-queue.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/confirmation.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/confirmation.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/script-engine.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/script-engine.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "client/modules/room-renderer.js"), "utf8"),
  warningSandbox,
  { filename: "client/modules/room-renderer.js" },
);
const utilityAjaxCalls = [];
const utilityJquery = function () {
  return {
    find: () => ({ length: 0 }),
  };
};
Object.assign(utilityJquery, {
  isPlainObject: (value) =>
    value != null && Object.getPrototypeOf(value) === Object.prototype,
  isFunction: (value) => typeof value === "function",
  isArray: Array.isArray,
  ajax: (url, options) => {
    utilityAjaxCalls.push({ url, options });
    if (options.success) options.success({ code: 1 });
  },
});
const utilityDocument = { cookie: "token=value" };
const utilityModule = warningSandbox.window.WSMudClient.createModule(
  "utilities",
  {
    jquery: utilityJquery,
    hostWindow: {
      navigator: { userAgent: "Desktop" },
      setTimeout: (callback, delay) => {
        utilityModuleTimers.push({ callback, delay });
      },
    },
    documentRef: utilityDocument,
    navigator: { userAgent: "Desktop" },
    timers: {
      setTimeout: (callback, delay) => {
        utilityModuleTimers.push({ callback, delay });
      },
    },
  },
);
const utilityModuleTimers = [];
utilityModule.installLegacyExtensions();
for (const utilityName of [
  "ProxyHost",
  "isMobile",
  "Json2Str",
  "Json2Str2",
  "Date2Str",
  "Clone",
  "Sleep",
  "Wait",
  "Str2Json",
  "Str2Json2",
  "Str2XML",
  "Settings",
  "encode",
  "CookieHelper",
  "C_STR",
  "C_STR2",
  "C_STR3",
  "to_c",
  "Get",
  "Post",
  "Request",
  "RequestOver",
  "ToDate",
  "CheckInputs",
]) {
  assert(utilityName in utilityModule, `utilities 历史 API 缺失: ${utilityName}`);
}
assert(
  utilityModule.Json2Str({ enabled: true }) === '{"enabled":true}' &&
    utilityModule.Json2Str(null) === "" &&
    utilityModule.Clone({ enabled: true }).enabled === true &&
    utilityModule.to_c(1001) === "一千零一" &&
    utilityModule.CookieHelper.getCookie("token") === "value" &&
    !Object.prototype.hasOwnProperty.call(warningSandbox, "begin") &&
    !Object.prototype.hasOwnProperty.call(warningSandbox, "end"),
  "客户端 utilities 模块未保持历史数据、中文数字或 Cookie 行为",
);
let utilityCallbackValue = null;
utilityModule.Get("UserAPI/GetRoles", ["alice"], (value) => {
  utilityCallbackValue = value;
});
assert(
  utilityAjaxCalls[0]?.url === "/UserAPI/GetRoles/alice" &&
    utilityAjaxCalls[0].options.type === "get" &&
    utilityAjaxCalls[0].options.async === true &&
    utilityAjaxCalls[0].options.xhrFields.withCredentials === true &&
    utilityCallbackValue?.code === 1,
  "客户端 utilities 模块未保持 GET 请求和回调契约",
);
assert(
  runInNewContext(
    'var values = [1, 2, 2]; values.Remove(2); values.join(",")',
    warningSandbox,
  ) === "1,2" &&
    runInNewContext(
      'var values = [1, 2, 3]; values.RemoveAt(function (value) { return value > 1; }); values.join(",")',
      warningSandbox,
    ) === "1" &&
    runInNewContext(
      'new Date(2026, 0, 2).AddDays(1).ToDateString()',
      warningSandbox,
    ) === "2026-01-03",
  "客户端 utilities 模块未安装历史 Array/Date 原型扩展",
);
const warningJquery = (target) => {
  if (target === ".bottom-bar") return { height: () => 20 };
  const element = {
    bottom: null,
    removed: false,
    appendTo: () => element,
    on: () => element,
    remove: () => {
      element.removed = true;
    },
    css: (_name, value) => {
      element.bottom = value;
      return element;
    },
    height: () => 10,
  };
  warningElements.push(element);
  return element;
};
const warningModule = warningSandbox.window.WSMudClient.createModule(
  "warnings",
  {
    jquery: warningJquery,
    hostWindow: { setTimeout: (callback, delay) => warningTimers.push({ callback, delay }) },
  },
);
warningModule.Show({
  content: "测试警告",
  cmds: [{ cmd: "look", name: "查看" }],
  time: 1500,
});
assert(
  warningModule.Elemes.length === 1 &&
    warningElements[0].bottom === 28 &&
    warningTimers[0].delay === 1500,
  "客户端警告模块未保持堆叠或定时关闭行为",
);
warningModule.Close(warningElements[0]);
assert(
  warningModule.Elemes.length === 0 && warningElements[0].removed,
  "客户端警告模块未正确清理警告元素",
);
const combatCommands = [];
const combatTimers = new Map();
const combatClearedTimers = [];
let combatTimerId = 0;
const combatElement = {
  is: () => false,
  attr: (name) => (name === "pid" ? "verify/skill" : null),
  css: () => combatElement,
};
const combatModule = warningSandbox.window.WSMudClient.createModule("combat", {
  jquery: (target) => (target === combatElement ? combatElement : { length: 0 }),
  hostWindow: {},
  timers: {
    setTimeout: (callback, delay) => {
      const id = ++combatTimerId;
      combatTimers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id) => {
      combatClearedTimers.push(id);
      combatTimers.delete(id);
    },
  },
  getSendCommand: () => (command) => combatCommands.push(command),
  getSetting: () => ({ off_hp: false, show_hpnum: false, show_damage: false }),
  getProcess: () => ({ player: "verify-role", message: { scroll2end: () => {} } }),
  getDialog: () => ({ extend: { append: () => {} } }),
});
combatModule.Perform.call(combatElement);
combatModule.Skills = [{ id: "verify.skill", elem: { css: () => {} } }];
const combatPerformPayload = { id: "verify/skill", rtime: 300, distime: 900 };
combatModule.On_Perform(combatPerformPayload);
assert(
  combatModule.CountWidth(50, 100) === 50 &&
    combatModule.CountWidth(-1, 100) === 0 &&
    combatCommands[0] === "perform verify/skill" &&
    combatPerformPayload.id === "verify.skill" &&
    combatModule.dis_pfms[0].id === "verify.skill" &&
    combatTimers.size === 1,
  "客户端 Combat 模块未保持动作发送、冷却字段或宽度计算行为",
);
const combatStatusItem = { handler: 999 };
combatModule.STATUS.verifyTarget = {
  items: { verifyStatus: combatStatusItem },
};
combatTimers.set(999, { callback: () => {}, delay: 1000 });
combatModule.ClearRoomStatus();
assert(
  combatModule.STATUS &&
    Object.keys(combatModule.STATUS).length === 0 &&
    combatStatusItem.handler === 0 &&
    !combatTimers.has(999) &&
    combatClearedTimers.includes(999),
  "客户端 Combat 未清理跨房间状态动画计时器",
);
combatModule.destroy();
assert(
  combatTimers.size === 0 && combatClearedTimers.length === 2,
  "客户端 Combat 模块未清理自身计时器",
);
const roomRenderLog = [];
const roomHtml = new Map();
function roomRendererJquery(target) {
  if (typeof target === "string" && target.startsWith("<div class='room-item'")) {
    return {
      prependTo: () => {
        roomRenderLog.push("prepend-row");
        return { find: () => ({}) };
      },
      appendTo: () => {
        roomRenderLog.push("append-row");
        return { find: () => ({}) };
      },
    };
  }
  if (target && typeof target === "object" && target.kind) {
    const wrapper = {
      attr: (name, value) => {
        if (value !== undefined) {
          target.attrs[name] = value;
          return wrapper;
        }
        return target.attrs[name];
      },
      is: (name) => name === target.kind,
      prev: () => roomRendererJquery(target.previous),
    };
    return wrapper;
  }
  const wrapper = {
    html: (value) => {
      if (value === undefined) return roomHtml.get(target);
      roomHtml.set(target, value);
      roomRenderLog.push("html:" + target);
      return wrapper;
    },
    width: () => 640,
  };
  return wrapper;
}
const roomProcess = {
  player: "self",
  itemsElement: {
    empty: () => roomRenderLog.push("empty-items"),
  },
  closeItemPopup: () => roomRenderLog.push("close-popup"),
  message: { clear: () => roomRenderLog.push("clear-message") },
  cur_room: { items: [] },
  room_path: null,
  room_exits: null,
  room_name: null,
};
const roomSetting = {
  off_plist: true,
  off_hp: false,
  show_hpnum: true,
  keep_msg: false,
  show_roomitem: true,
  exits_dir: 1,
};
const roomCombat = {
  IsShow: true,
  STATUS: { stale: { items: {} } },
  ClearRoomStatus() {
    roomRenderLog.push("clear-status");
    this.STATUS = {};
  },
  AppendStatusItem: (id) => roomRenderLog.push("status:" + id),
  ShowRoomCommands: () => roomRenderLog.push("room-commands"),
};
const roomMap = {
  DIRS: ["north", "south", "east", "west"],
  SetRoom: () => roomRenderLog.push("map-set-room"),
  OnRoomChanged: () => roomRenderLog.push("map-room-changed"),
  OnExitsChanged: () => roomRenderLog.push("map-exits-changed"),
  CreateExitsMap: (items) => {
    roomRenderLog.push("create-exits-map");
    if (items.north && items.up) {
      items.north_2 = items.up;
      delete items.up;
    }
    return "<svg>map</svg>";
  },
};
const roomCommands = [];
const roomRenderer = warningSandbox.window.WSMudClient.createModule(
  "room-renderer",
  {
    jquery: roomRendererJquery,
    documentRef: {},
    getProcess: () => roomProcess,
    getSetting: () => roomSetting,
    getCombat: () => roomCombat,
    getMap: () => roomMap,
    receiveMessage: (message) => roomRenderLog.push("message:" + message),
    sendCommand: (command) => roomCommands.push(command),
    nodeFilterShowText: () => 4,
  },
);
Object.assign(roomProcess, roomRenderer);
assert(
  roomRenderer.countwidth(50, 100) === 50 &&
    roomRenderer.countwidth(-1, 100) === 0 &&
    roomRenderer.countwidth(200, 100) === 100 &&
    Number.isNaN(roomRenderer.countwidth(0, 0)) &&
    roomRenderer.formatStatusNumber(1234567) === "1,234,567" &&
    roomRenderer.formatStatusNumber(null) === "0" &&
    roomRenderer.formatStatusNumber(undefined) === "",
  "room-renderer 未保持宽度边界或状态数值格式化契约",
);
roomProcess.countwidth = () => 42;
roomProcess.formatStatusNumber = (value) => "#" + value;
roomProcess.formatRoomItemName = (name, isPlayer) =>
  name + (isPlayer ? "★" : "");
const playerMarkup = roomRenderer.create_roomitem({
  id: "self",
  name: "玩家",
  hp: 1234,
  max_hp: 2000,
  mp: 500,
  max_mp: 800,
});
assert(
  playerMarkup.includes("width:42%") &&
    playerMarkup.includes("[#1234/#2000]") &&
    playerMarkup.includes("[#500/#800]") &&
    playerMarkup.includes("玩家★") &&
    playerMarkup.indexOf('class="progress hp"') <
      playerMarkup.indexOf('class="progress mp"') &&
    playerMarkup.indexOf("item-vital-values") <
      playerMarkup.indexOf("item-status-bar"),
  "room-renderer 未通过 Process 公开方法生成兼容的人物血蓝/名称结构",
);
const roomItemsPayload = {
  items: [
    { id: "other", name: "路人" },
    { id: "self", name: "玩家" },
    { id: "hidden", name: "隐藏玩家", p: true },
  ],
};
roomRenderLog.length = 0;
roomRenderer.items(roomItemsPayload);
assert(
  roomRenderLog.join("|") ===
    "empty-items|clear-status|append-row|status:other|prepend-row|status:self" &&
    roomProcess.cur_room === roomItemsPayload &&
    roomProcess.cur_room.items.length === 3,
  "room-renderer 全量人物刷新未保持清空顺序、玩家置顶、过滤或协议对象引用",
);
const roomPayload = {
  name: "测试房间",
  path: "test/room",
  desc: "房间里有<hig cmd='look box'>箱子</hig>",
  commands: [],
};
roomRenderLog.length = 0;
roomRenderer.room(roomPayload);
assert(
  roomPayload.commands[0]?.cmd === "look box" &&
    roomPayload.commands[0]?.name === "箱子" &&
    roomProcess.room_path === "test/room" &&
    roomRenderLog.join("|") ===
      "close-popup|html:.room_items|html:.room-name|html:.room_desc|" +
        "clear-message|room-commands|map-set-room|map-room-changed",
  "room-renderer 未保持房间 DOM、隐藏命令、消息和地图更新顺序",
);
roomRenderLog.length = 0;
roomRenderer.room({ ...roomPayload, commands: [] });
assert(
  roomRenderLog.join("|") ===
    "close-popup|html:.room_items|html:.room-name|html:.room_desc|clear-message" &&
    !roomRenderLog.includes("map-room-changed"),
  "同 path 房间消息未在地图/命令更新前保持历史短路位置",
);
const textExits = { items: { west: "西侧", north: "北侧" } };
roomRenderLog.length = 0;
roomRenderer.exits(textExits);
assert(
  roomProcess.room_exits === textExits.items &&
    roomRenderLog[0] === "map-exits-changed" &&
    roomHtml.get(".room_exits").includes("north") &&
    roomHtml.get(".room_exits").includes(" 和 "),
  "room-renderer 文本出口未保持对象身份、地图通知或固定方向顺序",
);
roomSetting.exits_dir = 0;
const mapExitsPayload = { items: { north: "北侧", up: "上方" } };
roomRenderLog.length = 0;
roomRenderer.exits(mapExitsPayload);
assert(
  roomProcess.room_exits === mapExitsPayload.items &&
    roomRenderLog.indexOf("map-exits-changed") <
      roomRenderLog.indexOf("create-exits-map") &&
    mapExitsPayload.items.up === undefined &&
    mapExitsPayload.items.north_2 === "上方",
  "room-renderer 地图出口未保持通知时序或协议对象原地变换",
);
const exitRect = { kind: "rect", attrs: { dir: "east" } };
roomRenderer.before_click_exits({ target: exitRect });
roomRenderer.click_exits({ target: exitRect });
assert(
  exitRect.attrs.fill === "#232323" && roomCommands.at(-1) === "go east",
  "room-renderer 出口按下/抬起颜色或 go 命令异常",
);
roomProcess.cur_room = {
  items: [{ id: 7, name: "数字 ID" }, { id: "8", name: "字符串 ID" }],
};
assert(
  roomRenderer.queryRoomItem("7").name === "数字 ID" &&
    roomRenderer.queryRoomItem(8).name === "字符串 ID" &&
    roomRenderer.queryRoomItem(9) === null,
  "room-renderer 未按字符串兼容规则查询当前房间人物",
);
roomRenderer.roomHiddenItemsReg.lastIndex = 5;
roomRenderLog.length = 0;
roomRenderer.resetRoomRendererSession();
assert(
  roomProcess.cur_room === null &&
    roomProcess.room_path === null &&
    roomProcess.room_exits === null &&
    roomProcess.room_name === null &&
    roomRenderer.roomHiddenItemsReg.lastIndex === 0 &&
    roomRenderLog.join("|") === "clear-status|close-popup",
  "room-renderer 会话重置未清理房间引用、状态计时器或详情弹窗",
);
let toolMenuOpen = false;
let toolMenuExpanded = "false";
let toolBadgeHidden = true;
let horizontalToolMenuOff = false;
const nativeToolTimers = [];
const toolDocumentRoot = {};
const toolItems = [{ style: {} }, { style: {} }];
const toolBadge = {
  removeClass: () => {
    toolBadgeHidden = false;
    return toolBadge;
  },
  addClass: () => {
    toolBadgeHidden = true;
    return toolBadge;
  },
};
const toolMatch = {
  length: 1,
  find: () => toolBadge,
};
const toolCollection = Object.assign(toolItems, {
  filter: () => toolMatch,
  attr: () => toolCollection,
  removeAttr: () => toolCollection,
});
const emptyToolCollection = {
  length: 0,
  filter: () => emptyToolCollection,
  find: () => toolBadge,
  attr: () => emptyToolCollection,
  removeAttr: () => emptyToolCollection,
};
const hideToolCollection = {
  length: 1,
  toggleClass: () => hideToolCollection,
  removeClass: () => hideToolCollection,
  addClass: () => hideToolCollection,
  removeAttr: () => hideToolCollection,
  attr: (name, value) => {
    if (name === "aria-expanded") toolMenuExpanded = value;
    return hideToolCollection;
  },
};
const rightBarCollection = {
  hasClass: () => toolMenuOpen,
  toggleClass: (_name, value) => {
    toolMenuOpen = value;
    return rightBarCollection;
  },
  attr: () => rightBarCollection,
  removeClass: () => {
    toolMenuOpen = false;
    return rightBarCollection;
  },
  removeAttr: () => rightBarCollection,
};
const toolDocumentCollection = {
  hasClass: () => horizontalToolMenuOff,
  toggleClass: (_name, value) => {
    horizontalToolMenuOff = value;
    return toolDocumentCollection;
  },
};
const toolActionJquery = (target) => {
  if (target === toolDocumentRoot) return toolDocumentCollection;
  if (target === ".right-bar>.tool-item") return toolCollection;
  if (target === ".bottom-bar>.tool-item") return emptyToolCollection;
  if (target === ".br-tool") return hideToolCollection;
  if (target === ".right-bar") return rightBarCollection;
  if (target === toolCollection) return toolCollection;
  if (target === hideToolCollection) return hideToolCollection;
  return emptyToolCollection;
};
const toolActionModule = warningSandbox.window.WSMudClient.createModule(
  "tool-action",
  {
    jquery: toolActionJquery,
    documentRef: { documentElement: toolDocumentRoot },
    timers: {
      setTimeout: (callback, delay) => nativeToolTimers.push({ callback, delay }),
    },
  },
);
toolActionModule.SetToolsOpen(true);
toolActionModule.showFlag("message", 1);
assert(
  toolMenuOpen === true &&
    toolMenuExpanded === "true" &&
    toolItems.every((item) => item.style.display === "" && item.style.opacity === 1) &&
    toolBadgeHidden === false &&
    toolActionModule.ToolState === 2 &&
    toolActionModule.ToolOpacity === 100,
  "客户端 ToolAction 未保持菜单展开、可访问属性或未读标记行为",
);
toolActionModule.ShowTools();
toolActionModule.showFlag("message", 0);
assert(
  toolMenuOpen === false &&
    toolActionModule.HasUserToggled === true &&
    toolActionModule.ToolState === 0 &&
    toolBadgeHidden === true,
  "客户端 ToolAction 未保持用户切换或标记清除行为",
);
toolActionModule.SetHorizontalEnabled(false);
toolActionModule.ShowTools();
while (nativeToolTimers.length) nativeToolTimers.shift().callback();
assert(
  horizontalToolMenuOff === true &&
    toolMenuOpen === false &&
    toolActionModule.ToolState === 2 &&
    toolItems.every((item) => item.style.display === "" && item.style.opacity === 1),
  "关闭横向三点菜单后未恢复游戏原生竖排动画和显示状态",
);
const mapCommands = [];
const mapTimers = new Map();
const mapClearedTimers = [];
let mapTimerId = 0;
const mapStatusElement = {
  length: 0,
  text: () => mapStatusElement,
  attr: () => mapStatusElement,
  off: () => mapStatusElement,
};
const mapRuntime = warningSandbox.window.WSMudClient.createModule("map", {
  jquery: () => mapStatusElement,
  documentRef: {},
  timers: {
    setTimeout: (callback, delay) => {
      const id = ++mapTimerId;
      mapTimers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id) => {
      mapClearedTimers.push(id);
      mapTimers.delete(id);
    },
  },
  getSendCommand: () => (command) => mapCommands.push(command),
  getProcess: () => ({
    room_path: "room-a",
    room_exits: { east: "<hig>终点</hig>" },
  }),
  isFeatureEnabled: () => true,
  isTopPopupLayer: () => true,
});
const mapRooms = [
  { id: "room-a", n: "起点", p: [0, 0], exits: ["e"] },
  { id: "room-b", n: "终点", p: [1, 0], exits: ["w"] },
];
const mapGraph = mapRuntime.MAP.BuildRouteGraph(mapRooms);
const mapRoute = mapRuntime.MAP.FindRoute(mapGraph, "room-a", "room-b");
const mapExits = { north: "北面", up: "上方" };
const mapExitMarkup = mapRuntime.MAP.CreateExitsMap(
  mapExits,
  240,
  "区域-当前房间",
);
mapRuntime.MAP.Buffer.verify = mapRooms;
mapRuntime.MAP.CurMapID = "verify";
mapRuntime.MAP.StartAutoRoute("room-b");
assert(
  mapRoute?.length === 1 &&
    mapRoute[0].heading === "east" &&
    mapExits.up === undefined &&
    mapExits.north_2 === "上方" &&
    mapExitMarkup.includes('dir="up"') &&
    mapRuntime.CreateHeadPanel({
      name: "测试角色",
      hp: 50,
      max_hp: 100,
      mp: 30,
      max_mp: 60,
    }).includes("测试角色") &&
    mapCommands[0] === "go east" &&
    [...mapTimers.values()][0]?.delay === 5000,
  "客户端 MAP 未保持路线图、出口副作用、角色头部或移动命令行为",
);
mapRuntime.MAP.CancelAutoRoute();
assert(
  mapRuntime.MAP.AutoRoute === null &&
    mapTimers.size === 0 &&
    mapClearedTimers.length === 1,
  "客户端 MAP 未清理自动寻路超时计时器",
);
mapRuntime.MAP.AutoRoute = {
  awaitingPath: null,
  timer: null,
  edgeIndex: 0,
  edges: [],
  targetId: "room-b",
};
mapRuntime.MAP.OnExitsChanged();
assert(
  [...mapTimers.values()][0]?.delay === 80,
  "客户端 MAP 未保持出口响应后的延迟推进时序",
);
mapRuntime.MAP.CancelAutoRoute();
assert(
  mapTimers.size === 0 && mapClearedTimers.length === 2,
  "客户端 MAP 取消路线后仍残留延迟推进计时器",
);
mapRuntime.destroy();
const touchModule = warningSandbox.window.WSMudClient.createModule("touch", {
  documentRef: { querySelector: () => ({ addEventListener: () => {} }) },
});
let slidePayload = null;
let zoomPayload = null;
touchModule.List.slide = [(payload) => (slidePayload = payload)];
touchModule.List.zoom = [(payload) => (zoomPayload = payload)];
touchModule.Slide([10, 100], [12, 20]);
touchModule.Zoom(
  [
    [0, 0],
    [0, 10],
  ],
  [
    [0, 0],
    [0, 20],
  ],
);
assert(
  slidePayload?.offY === 80 &&
    slidePayload.isTop === true &&
    zoomPayload?.zoom === 2,
  "客户端触摸模块未保持滑动或缩放计算行为",
);
const viewStorageValues = new Map();
const viewStorageModule = warningSandbox.window.WSMudClient.createModule(
  "view-storage",
  {
    jquery: () => ({}),
    hostWindow: {},
    storage: {
      setItem: (key, value) => viewStorageValues.set(key, value),
      getItem: (key) => viewStorageValues.get(key) ?? null,
      removeItem: (key) => viewStorageValues.delete(key),
      clear: () => viewStorageValues.clear(),
    },
    logger: { error: () => {} },
  },
);
assert(
  viewStorageModule.storageUtil.setItem("object", { enabled: true }) &&
    viewStorageModule.storageUtil.getItem("object").enabled === true &&
    viewStorageModule.storageUtil.removeItem("object") &&
    viewStorageModule.storageUtil.getItem("object", "fallback") === "fallback",
  "客户端视图存储模块未保持序列化或默认值行为",
);
const connectionCommands = [];
const connectionClient = {
  Connect: function () {
    this.connectCalled = true;
  },
};
const connectionElement = {
  children: () => [],
  css: () => connectionElement,
  show: () => connectionElement,
  find: () => connectionElement,
  html: () => connectionElement,
};
let activeConnectionClient = null;
const connectionModule = warningSandbox.window.WSMudClient.createModule(
  "connection",
  {
    jquery: () => connectionElement,
    getClient: () => activeConnectionClient,
    setClient: (client) => {
      activeConnectionClient = client;
    },
    setSelectedServer: () => {},
    closeServer: () => {},
    createClient: () => connectionClient,
    getUserCookie: (key) => (key === "u" ? "user" : "token"),
    sendCommand: (command) => connectionCommands.push(command),
    getProcess: () => ({ player: null, clear: () => {} }),
    getReceiveData: () => () => {},
    getReceiveMessage: () => () => {},
    hideAndShow: () => {},
  },
);
connectionModule.connectServer({ ip: "127.0.0.1", port: 8080, ID: 1 });
connectionClient.OnConnect();
assert(
  connectionClient.connectCalled === true &&
    connectionCommands[0] === "user token" &&
    connectionModule.isConnecting() === false,
  "客户端连接模块未保持连接启动、凭据发送或状态复位行为",
);
const networkEvents = [];
function TestSocket(url) {
  this.url = url;
  this.readyState = 1;
  this.send = (command) => networkEvents.push("send:" + command);
  this.close = () => networkEvents.push("close");
}
const networkApi = warningSandbox.window.WSMudClient.createModule(
  "network-api",
  {
    Socket: TestSocket,
    getReceiveMessage: () => (message) => networkEvents.push("error:" + message),
    getUtil: () => ({
      Post: (path, data) => networkEvents.push("post:" + path + ":" + data.code),
      Get: (path) => networkEvents.push("get:" + path),
    }),
  },
);
const testWsClient = new networkApi.WSClient("game.example", 8080);
testWsClient.OnConnect = () => {};
testWsClient.OnClose = () => {};
testWsClient.OnError = () => {};
testWsClient.OnData = (data) => networkEvents.push("data:" + data.type);
testWsClient.OnMessage = (message) => networkEvents.push("text:" + message);
testWsClient.Connect();
testWsClient.ws.onmessage({ data: '{"type":"room"}' });
testWsClient.ws.onmessage({ data: "hello" });
networkApi.API.UserAPI.Login("user", "secret", () => {});
assert(
  testWsClient.ws.url === "ws://game.example:8080" &&
    networkEvents.join("|") ===
      "data:room|text:hello|post:api/user/login:user",
  "客户端网络模块未保持 WebSocket 地址、消息解析或用户 API 契约",
);
const receivedMessages = [];
const receivedData = [];
const messageDialog = {
  extend: {
    message_filter: () => false,
    data_filter: () => false,
    trigger: (value) => receivedMessages.push("trigger:" + value),
    process: (value) => receivedData.push("process:" + value.type),
  },
};
const messageProcess = {
  message: {
    push: (value) => receivedMessages.push(value),
    scroll2end: () => receivedMessages.push("scroll"),
  },
  room: (value) => receivedData.push(value.path),
};
const clientMessaging = warningSandbox.window.WSMudClient.createModule(
  "message-queue",
  {
    jquery: () => ({}),
    isMobile: () => false,
    hostWindow: { screenTop: 0 },
    getDialog: () => messageDialog,
    getProcess: () => messageProcess,
    sendCommand: () => {},
    createName: () => "",
    createId: () => "",
    createProp: () => ({}),
  },
);
clientMessaging.ReceiveMessage("hello");
clientMessaging.ReceiveData({ type: "room", path: "yz/start" });
assert(
  receivedMessages.join("|") === "hello|scroll|trigger:hello" &&
    receivedData.join("|") === "yz/start|process:room",
  "客户端消息模块未保持文本或结构化消息分发顺序",
);
messageProcess.consumeDetailPopupMessage = (message) => message === "loot-desc";
clientMessaging.ReceiveMessage("loot-desc");
clientMessaging.ReceiveMessage("keep-me");
assert(
  receivedMessages.join("|") === "hello|scroll|trigger:hello|keep-me|scroll|trigger:keep-me",
  "江湖战利品文本被消费后仍写入信息栏，或未消费时被丢弃",
);
const confirmationModule = warningSandbox.window.WSMudClient.createModule(
  "confirmation",
  {
    jquery: () => ({}),
    documentRef: {},
    hostWindow: { navigator: { userAgent: "" } },
    getDialog: () => ({}),
    getProcess: () => ({}),
    getUtil: () => ({}),
    sendCommand: (command) => confirmationCommands.push(command),
    isTopPopupLayer: () => false,
  },
);
const confirmationCommands = [];
confirmationModule.get_countelement = () => ({});
confirmationModule.Show = (options) => options.onOK(2);
confirmationModule.Process(["_confirm", "greet"]);
confirmationModule.Process(["_confirm", "buy", "5", "item", "unused", "bag"]);
assert(
  typeof confirmationModule.Show === "function" &&
    typeof confirmationModule.Close === "function" &&
    typeof confirmationModule.Process === "function" &&
    typeof confirmationModule.get_countelement === "function" &&
    typeof confirmationModule.Show_trade_add === "function" &&
    confirmationCommands.join("|") === "greet 2|buy 2 item from bag" &&
    gameClientSource.includes(
      'var Confirm = unsafeWindow.WSMudClient.createModule("confirmation", {',
    ) &&
    !gameClientSource.includes("var Confirm = {"),
  "客户端确认模块未保持公开入口或兼容桥接",
);
const scriptCommands = [];
const scriptMessages = [];
const scriptMenuCalls = [];
const scriptNativeActions = [];
const scriptSleeps = [];
const scriptConfirmCalls = [];
const scriptProcess = {
  player: "player-id",
  room_exits: { west: true },
  cur_room: {
    items: [
      { id: "npc-1", name: "小二", hp: 100, p: false },
      { id: "npc-2", name: "掌柜", hp: 100, p: false },
      { id: "dead", name: "小二", hp: 0, p: false },
      { id: "player", name: "玩家", hp: 100, p: true },
    ],
  },
};
const scriptDialog = {
  pack: { isShow: true, items: [{ id: "pack-1", name: "大药" }] },
  pack2: {
    isShow: false,
    command_before: "dc target-id ",
    items: [{ id: "pack-2", name: "小药" }],
  },
  list: {
    selllist: [{ id: "goods-1", name: "铁剑" }],
  },
  master: { master: "master-id", isShow: false },
};
const scriptJquery = (selector) => {
  const attributes =
    selector === ".room-commands"
      ? [{ cmd: "look npc-1" }]
      : selector === ".combat-commands"
        ? [{ pid: "skill.wu" }]
        : [];
  return {
    children: () => ({
      eq: (index) => ({
        attr: (name) => attributes[index]?.[name],
      }),
    }),
  };
};
const scriptHostWindow = {
  WGRunNativeExtensionAction: (action) => scriptNativeActions.push(action),
};
const scriptConfirmation = {
  get_countelement: (min, max) => ({ min, max }),
  Show: (options) => scriptConfirmCalls.push(options),
};
const scriptModule = warningSandbox.window.WSMudClient.createModule(
  "script-engine",
  {
    jquery: scriptJquery,
    hostWindow: scriptHostWindow,
    PromiseConstructor: Promise,
    getSendCommand: () => (command) => scriptCommands.push(command),
    getReceiveMessage: () => (message) => scriptMessages.push(message),
    getHandlerMenuCommand: () => (command) => scriptMenuCalls.push(command),
    getUtilities: () => ({
      Sleep: (delay) => {
        scriptSleeps.push(delay);
        return Promise.resolve();
      },
    }),
    getProcess: () => scriptProcess,
    getDialog: () => scriptDialog,
    getMapDirExits: () => ({ left: ["west"] }),
    getConfirmation: () => scriptConfirmation,
  },
);
await scriptModule.run("say hi;#msg 你好 世界");
await scriptModule.run("#say @npc(小二)");
await scriptModule.run("#wait 7");
await scriptModule.run("#action 0");
await scriptModule.run("#pfm 0");
await scriptModule.run("#pfm bad");
await scriptModule.run("#menu score");
await scriptModule.run("#wg home");
delete scriptHostWindow.WGRunNativeExtensionAction;
await scriptModule.run("#wg home");
assert(
  scriptCommands.slice(0, 5).join("|") ===
    "say hi|say npc-1|look npc-1|perform skill.wu|perform bad" &&
    scriptMessages.join("|") === "你好世界|<hir>插件动作尚未准备完成，请稍后重试。</hir>",
  "SCRIPT 默认、参数展开、动作递归、绝招回退或消息动作行为发生变化",
);
assert(
  scriptSleeps[0] === 7 &&
    scriptMenuCalls[0] === "score" &&
    scriptNativeActions[0] === "home" &&
    JSON.stringify(scriptModule.vars.npc("小二")) === '["npc-1"]' &&
    JSON.stringify(scriptModule.vars.item("小二")) ===
      '["npc-1","dead"]' &&
    scriptModule.vars.dir("left") === "west" &&
    scriptModule.vars.me() === "player-id" &&
    scriptModule.vars.dc() === "dc target-id " &&
    scriptModule.vars.pack("药")[0] === "pack-1" &&
    scriptModule.vars.goods("剑")[0] === "goods-1" &&
    scriptModule.helper.actions[0] === "#wait 100：等待100毫秒执行",
  "SCRIPT 变量、动作栏、帮助文本或显式 getter 行为发生变化",
);
scriptDialog.master.isShow = true;
assert(
  scriptModule.vars.dc() === "dc master-id",
  "SCRIPT.vars.dc 未保持师父界面命令前缀",
);
scriptModule.LAST_OBJ = { id: "obj-1", name: "测试", value: 8 };
scriptModule.LAST_DATA = { value: 9 };
scriptModule.lAST_MATCHES = ["whole", "capture"];
assert(
  scriptModule.vars.id() === "obj-1" &&
    scriptModule.vars.obj("value") === 8 &&
    scriptModule.vars.data("value") === 9 &&
    scriptModule.vars.mat(1) === "capture" &&
    scriptModule.is_running === false,
  "SCRIPT 跨片段状态字段或运行标志未保持兼容",
);
const scriptInputPromise = scriptModule.vars.input("发送", 5, 2);
assert(
  scriptConfirmCalls[0]?.btn_text === "发送" &&
    scriptConfirmCalls[0]?.content.min === 2 &&
    scriptConfirmCalls[0]?.content.max === 5 &&
    typeof scriptConfirmCalls[0]?.onCancle === "function",
  "SCRIPT.vars.input 未保持 confirmation 依赖、范围或 onCancle 契约",
);
scriptConfirmCalls[0].onOK(3);
assert(
  (await scriptInputPromise) === 3,
  "SCRIPT.vars.input 确认 Promise 未正确 resolve",
);
assert(
  scriptEngineSource.includes('registerModule("script-engine"') &&
    gameClientSource.includes(
      'const SCRIPT = unsafeWindow.WSMudClient.createModule("script-engine", {',
    ) &&
    !gameClientSource.includes("const SCRIPT = {"),
  "SCRIPT 模块或 const SCRIPT 兼容桥边界异常",
);
for (const statusDisplayContract of [
  'class="progress-num hp-progress-num" style="color:red;-webkit-text-fill-color:red;background:none"',
  'class="progress-num mp-progress-num" style="color:blue;-webkit-text-fill-color:blue;background:none"',
  'style="background-color:red;width:',
  'style="background-color:blue;width:',
  "item.id == currentProcess.player && item.max_mp",
]) {
  assert(
    roomRendererModuleSource.includes(statusDisplayContract),
    `角色气血/内力显示规则缺失: ${statusDisplayContract}`,
  );
}
assert(
  combatModuleSource.includes(
    'if (type == "mp" && payload.id != getProcess().player) return;',
  ) &&
    combatModuleSource.includes("getProcess().formatStatusNumber(value)") &&
    !gameClientSource.includes("get_hpnum") &&
    !combatModuleSource.includes("get_hpnum"),
  "气血数值仍保留按比例切换颜色的旧逻辑",
);
const auctionCountdownSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-pm.js"),
  "utf8",
);
for (const auctionCountdownContract of [
  "countdownTimer: null",
  "this.stop_countdown();",
  "this.start_countdown();",
  "data-end-time",
  "countdownDeadlines: Object.create(null)",
  "this.get_countdown_deadline(item, forceReset)",
  "if (forceReset || !deadline)",
  "this.create_item(item, true)",
  "Math.ceil(milliseconds / 1000)",
  "dialog.update_countdowns();",
]) {
  assert(
    auctionCountdownSource.includes(auctionCountdownContract),
    `拍卖行实时倒计时规则缺失: ${auctionCountdownContract}`,
  );
}
const automationSuiteSource = readFileSync(
  join(extensionRoot, "features/automation-suite.js"),
  "utf8",
);
const automationProtocolContractSource = readFileSync(
  join(extensionRoot, "features/plugin/automation-protocol-state.js"),
  "utf8",
);
for (const chiefGreetingContract of [
  'var shouldGreetChief = !G.connected || G.id != o.id',
  'socket.send("sx greet")',
]) {
  assert(
    automationProtocolContractSource.includes(chiefGreetingContract),
    "上线自动门派请安规则缺失: " + chiefGreetingContract,
  );
}
for (const obsoleteChatGreetingContract of [
  'ws.send("chat " + greeting)',
  'id="autogreet"',
  'id="autogreettext"',
  'roleid + "_auto_greet"',
]) {
  assert(
    !automationSuiteSource.includes(obsoleteChatGreetingContract),
    "仍残留误加的聊天请安实现: " + obsoleteChatGreetingContract,
  );
}
for (const itemPopupContract of [
  "ensureItemPopup",
  "showItemPopup",
  "showPendingDetailPopup",
  "createItemPopupElement",
  "closeItemPopupChildren",
  "closeItemPopupLayer",
  "closeItemPopup",
  "WG_item_popup_close",
  "initItemPopupDrag",
  "applyItemPopupPosition",
  "restoreItemPopupPosition",
  "queryRoomItem",
  "isCharacterItem",
  "item.p ||",
  "item.me ||",
  "(?:fight|kill|team add)",
  "item-vital-values",
  "formatStatusNumber",
  'toLocaleString("en-US")',
  "isPopupDetailCommand",
  "prepareDetailPopup",
  "consumeDetailPopupData",
  "consumeDetailPopupMessage",
  "queueDetailPopupRequest",
  "takeDetailPopupRequest",
  "matchesDetailPopupData",
  "cancelPendingDetailPopups",
  "detailPopupRequests",
  "createItemCommandHtml",
  "createPackItemPopupCommands",
  "createRankingPopupContent",
  'popupKind: "skill-detail"',
  'popupKind: "pack-item-detail"',
  'popupKind: "ranking-character"',
  'data.dialog == "score"',
  'data.dialog == "pack"',
  "DetailPopupPolicy.matchesDetailPopupData",
  "appendCharacterPopupCommands",
  'isCharacter ? "character" : "scene-item"',
  'data.type == "item" && data.desc != null',
  "Process.consumeDetailPopupData(_0x20d2ed)",
  "Process.isCharacterItem(_0x20d2ed)",
  'Process.itemsElement.find(".item-commands").remove()',
  '["character", "ranking-character"].includes(',
  "sourceSurfaceElement",
  "cancelDetailPopupRequestsForSurface",
  "!$.contains(document, request.sourceSurfaceElement)",
  "Process.cancelPendingDetailPopups && Process.cancelPendingDetailPopups()",
  "request.superseded = true",
  "pending.superseded",
  "prepareCharacterTextView",
  "WG_character_look_notice",
  "WG_item_popup_position",
  'mainRect.left + (mainRect.width - dialog.outerWidth()) / 2',
  "pointerdown.WG_item_popup_drag",
  'aria-modal="false"',
  "isItemPopupCommand",
  "keepItemPopupOpen",
  'closest(".WG_item_popup")',
  "!keepItemPopupOpen &&",
  "prepareItemPopupSecondary",
  "consumeItemPopupSecondary",
  "activateItemPopupSecondary",
  "releaseItemPopupSecondary",
  "pendingItemPopupSecondary",
  "WG_item_popup_child",
  "WG_item_popup_parent",
  "WG_item_popup_return_focus",
  "itemPopupSecondaryElement",
  "!Process.itemPopupSecondaryElement",
  'prop("inert", true)',
  'prop("inert", false)',
  "Process.consumeDetailPopupData(_0x4ce96c)",
  '"checkobj " + _0x279b5b.id + " from eq"',
  'event.key === "Escape"',
  "IsTopWGPopupLayer",
  "stopImmediatePropagation",
  "itemPopupSecondary &&",
  "opensPanel &&",
]) {
  assert(
    (clientProcessRuntimeSource + "\n" + detailPopupPolicySource).includes(
      itemPopupContract,
    ),
    `详情弹窗缺少结构或交互逻辑: ${itemPopupContract}`,
  );
}
assert(
  !gameClientSource.includes("!roomItem.p"),
  "玩家仍被排除在人物详情弹窗之外",
);
assert(
  gameClientSource.includes("consumeDetailPopupMessage") &&
    !gameClientSource.includes("consumeJianghuInfoPopup") &&
    !gameClientSource.includes("prepareJianghuInfoPopup"),
  "江湖战利品/技能帮助未走受约束的文本详情入口，或仍使用已废弃的信息流截取名称",
);
const containerCommandSource = gameClientSource.match(
  /function ContainerCommand\([\s\S]*?\n}\nfunction IsTopWGPopupLayer/,
)?.[0];
assert(containerCommandSource, "无法读取容器命令分发逻辑");
const topPopupLayerMatch = gameClientSource.match(
  /function IsTopWGPopupLayer\(element\) \{[\s\S]*?\n\}/,
);
assert(topPopupLayerMatch, "无法读取最顶层弹窗判定逻辑");
const layerElements = [
  { name: "root", visible: true, zIndex: "2147483600", depth: "0" },
  { name: "map", visible: true, zIndex: "2147483601", depth: "0" },
  { name: "child", visible: true, zIndex: "2147483606", depth: "2" },
  { name: "confirm", visible: true, zIndex: "2147483640", depth: "3" },
];
function createLayerWrapper(elements) {
  const wrapper = {
    length: elements.length,
    first: () => createLayerWrapper(elements.slice(0, 1)),
    is: (selector) => selector === ":visible" && Boolean(elements[0]?.visible),
    each: (callback) => {
      elements.forEach((element, index) => callback.call(element, index));
      return wrapper;
    },
    css: (property) =>
      property === "z-index" ? elements[0]?.zIndex : undefined,
    attr: (name) =>
      name === "data-popup-depth" || name === "data-dialog-depth"
        ? elements[0]?.depth
        : undefined,
  };
  elements.forEach((element, index) => (wrapper[index] = element));
  return wrapper;
}
const layerSandbox = {
  Number,
  $: (input) =>
    typeof input === "string"
      ? createLayerWrapper(layerElements.filter((element) => element.visible))
      : createLayerWrapper(input ? [input] : []),
};
runInNewContext(topPopupLayerMatch[0], layerSandbox);
assert(
  layerSandbox.IsTopWGPopupLayer(layerElements[3]) &&
    !layerSandbox.IsTopWGPopupLayer(layerElements[2]),
  "确认框存在时未被识别为最顶层弹窗",
);
layerElements[3].visible = false;
assert(
  layerSandbox.IsTopWGPopupLayer(layerElements[2]) &&
    !layerSandbox.IsTopWGPopupLayer(layerElements[1]),
  "关闭确认框后未正确回退到详情子窗层",
);
layerElements[2].visible = false;
assert(
  layerSandbox.IsTopWGPopupLayer(layerElements[1]) &&
    !layerSandbox.IsTopWGPopupLayer(layerElements[0]),
  "关闭详情子窗后未正确回退到地图层",
);
assert(
  !containerCommandSource.includes("Process.closeItemPopup();") &&
    containerCommandSource.indexOf("Process.prepareItemPopupSecondary(") <
      containerCommandSource.indexOf("SendCommand(_0x21830e);"),
  "人物悬浮窗打开次级页面时仍会被关闭或未建立层级关系",
);
const showItemPopupSource = gameClientSource.match(
  /showItemPopup: function \([\s\S]*?\n  },\n  appendCharacterPopupCommands:/,
)?.[0];
assert(
  showItemPopupSource &&
    showItemPopupSource.includes("Process.ensureItemPopup()") &&
    showItemPopupSource.includes(
      'popup.find(".WG_item_popup_desc").html(item.desc || "")',
    ) &&
    !showItemPopupSource.includes("appendTo("),
  "同级人物或物品详情未复用并替换现有悬浮窗",
);
const consumeDetailPopupSource = gameClientSource.match(
  /consumeDetailPopupData: function \([\s\S]*?\n  },\n  prepareItemPopupSecondary:/,
)?.[0];
assert(
  consumeDetailPopupSource &&
    consumeDetailPopupSource.includes("Process.showPendingDetailPopup(") &&
    !consumeDetailPopupSource.includes("Process.showItemPopup("),
  "悬浮窗内打开的详情仍会复用并覆盖父悬浮窗",
);
const characterTextViewSource = gameClientSource.match(
  /prepareCharacterTextView: function \([\s\S]*?\n  },\n  prepareDetailPopup:/,
)?.[0];
assert(
  characterTextViewSource?.includes("normalized.match(/^look") &&
    characterTextViewSource.includes("characterId = match[1]") &&
    characterTextViewSource.includes(
      "sourcePopup.attr(\"data-popup-kind\") != \"character\"",
    ) &&
    characterTextViewSource.includes("WG_character_look_notice") &&
    characterTextViewSource.includes("完整人物信息已显示在信息栏。") &&
    containerCommandSource.includes(
      "Process.prepareCharacterTextView(_0x21830e, _0x3c348a)",
    ) &&
    containerCommandSource.includes("SendCommand(_0x21830e);") &&
    !gameClientSource.includes("prepareStructuredCharacterView") &&
    !gameClientSource.includes("pending.kind == \"character-detail\""),
  "人物完整查看未保留真实 look 命令、弹窗上下文提示，或仍伪用 select",
);
const pendingDetailSource = gameClientSource.match(
  /prepareDetailPopup: function \([\s\S]*?\n  },\n  createPackItemPopupCommands:/,
)?.[0];
assert(
  pendingDetailSource?.includes(
    "sourceElement: commandElement[0] || sourceElement[0] || null",
  ) &&
    pendingDetailSource.includes("sourcePopupElement: sourcePopup[0] || null") &&
    pendingDetailSource.includes(
      "sourceSecondaryElement: sourceSecondary[0] || null",
    ) &&
    pendingDetailSource.includes(
      "sourceSurfaceElement: sourceSurface[0] || null",
    ) &&
    pendingDetailSource.includes("Process.queueDetailPopupRequest(pending)") &&
    pendingDetailSource.includes(
      '".WG_item_popup_secondary, .dialog.WG_floating_dialog"',
    ),
  "详情请求未保存来源悬浮层，无法创建独立次级悬浮窗",
);
const detailProcessDialogSource = gameClientSource.match(
  /dialog: function \(_0x4ce96c\) \{[\s\S]*?\n  },\n  isDialogPanelPayload:/,
)?.[0];
assert(
  detailProcessDialogSource &&
    detailProcessDialogSource.includes("Dialog.processingPayload = true") &&
    detailProcessDialogSource.includes("finally") &&
    detailProcessDialogSource.indexOf("Dialog.show(_0x4ce96c.dialog, _0x4ce96c)") <
      detailProcessDialogSource.lastIndexOf("itemPopupSecondary &&"),
  "次级完整页面未先消费响应再按需补初始化，或缺少数据阶段保护",
);
const dialogShowSource = gameClientSource.match(
  /show: function \(_0x5ecb78, _0xb973d1\) \{[\s\S]*?\n  },\n  select:/,
)?.[0];
assert(
  dialogShowSource?.includes("if (this.processingPayload) return;"),
  "页面 onData 内部的 show 调用仍可能被误判为用户切换并关闭当前层",
);
const showPendingDetailPopupSource = gameClientSource.match(
  /showPendingDetailPopup: function \([\s\S]*?\n  },\n  closeItemPopupChildren:/,
)?.[0];
assert(
  showPendingDetailPopupSource?.includes(
    'parentNative.hasClass("WG_floating_dialog")',
  ) &&
    showPendingDetailPopupSource.includes('attr("data-dialog-depth")') &&
    showPendingDetailPopupSource.includes("var depth = parentDepth + 1"),
  "通用悬浮面板打开详情时未提升子窗层级",
);
for (const mapModalContract of [
  "EnsureModal",
  "OpenModal",
  "CloseModal",
  "UpdateModalTitle",
  "BuildRouteGraph",
  "FindRoute",
  "StartAutoRoute",
  "AdvanceAutoRoute",
  "ResolveRouteDirection",
  "OnRoomChanged",
  "OnExitsChanged",
  "WG_map_modal",
  "WG_map_modal_dialog",
  "WG_map_route_status",
  "map-room-label",
  'role="dialog" aria-modal="true"',
  "event.target === this",
  "MAP.IsShow &&",
  'isTopPopupLayer($(".WG_map_modal"))',
  '"aria-haspopup": "dialog"',
  '.attr("aria-expanded", "true")',
  '.attr("aria-expanded", "false")',
  'this.MapContent = _0x8fde77.children("svg.map")',
  "_0x1b0390 == this.CurMapID && this.IsShow",
  'sendCommand("go " + direction)',
  "出口与地图不一致，当前场景无法自动寻路",
]) {
  assert(
    mapRuntimeSource.includes(mapModalContract),
    `地图遮罩弹窗缺少结构或交互逻辑: ${mapModalContract}`,
  );
}
for (const floatingWindowContract of [
  "WG_floating_dialog_geometry_",
  "initSkillsWindow",
  "applySkillsWindowGeometry",
  "restoreSkillsWindowGeometry",
  "saveSkillsWindowGeometry",
  "clampSkillsWindowGeometry",
  "activateSkillsWindow",
  "deactivateSkillsWindow",
  "positionSkillsConfirm",
  "prepareLayerRequest",
  "consumeLayerRequest",
  "pendingLayerRequests",
  "clearLayerRequests",
  "pushLayer",
  "popLayer",
  "clearLayerStack",
  "WG_dialog_snapshot",
  'var mainRect = $(".container")[0].getBoundingClientRect()',
  "width = Math.min(mainRect.width, window.innerWidth - 32)",
  "ResizeObserver",
  'this.content.find("input").first().trigger("focus")',
]) {
  assert(
    gameClientSource.includes(floatingWindowContract) ||
      confirmationSource.includes(floatingWindowContract),
    `通用悬浮窗口缺少布局或层级逻辑: ${floatingWindowContract}`,
  );
}
const layerQueueStart = gameClientSource.indexOf(
  "  prepareLayerRequest: function",
);
const layerQueueEnd = gameClientSource.indexOf(
  "  pushLayer: function",
  layerQueueStart,
);
assert(
  layerQueueStart > -1 && layerQueueEnd > layerQueueStart,
  "无法读取完整页面层请求队列逻辑",
);
const layerQueueSandbox = {
  Date,
  IsWGPluginFeatureEnabled: () => true,
};
runInNewContext(
  `Dialog = { pendingLayerRequests: [], element: [{}], curItem: "skills", ${gameClientSource.slice(layerQueueStart, layerQueueEnd)} }`,
  layerQueueSandbox,
);
const layerQueueDialog = layerQueueSandbox.Dialog;
const layerSourceElement = {
  0: { id: "source" },
  closest: () => ({ 0: { id: "command" } }),
};
layerQueueDialog.prepareLayerRequest("pack", layerSourceElement);
const firstLayerRequest = layerQueueDialog.pendingLayerRequests[0];
layerQueueDialog.prepareLayerRequest("tasks", layerSourceElement);
const secondLayerRequest = layerQueueDialog.pendingLayerRequests[1];
assert(
  firstLayerRequest.superseded === true &&
    layerQueueDialog.consumeLayerRequest("pack") === firstLayerRequest &&
    layerQueueDialog.peekLayerRequest() === secondLayerRequest &&
    layerQueueDialog.consumeLayerRequest("tasks") === secondLayerRequest,
  "快速连续打开完整页面时，旧请求未降级或未按命令消费",
);
for (let index = 0; index < 15; index++) {
  layerQueueDialog.element = [{}];
  layerQueueDialog.curItem = "dialog-" + index;
  layerQueueDialog.prepareLayerRequest("command-" + index, layerSourceElement);
}
assert(
  layerQueueDialog.pendingLayerRequests.length === 12,
  "完整页面层请求队列未保持有界",
);
layerQueueDialog.clearLayerRequests();
assert(
  layerQueueDialog.pendingLayerRequests.length === 0,
  "关闭完整页面后仍残留层请求",
);
assert(
  dialogSkillsModuleSource.match(/currentDialog\(\)\.activateSkillsWindow\(\);/g)
    ?.length >= 2,
  "个人技能与师父技能未共同启用独立窗口",
);
const skillCalculatorModuleSource = readFileSync(
  join(extensionRoot, "client/modules/skill-calculator.js"),
  "utf8",
);
const dialogChannelModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-channel.js"),
  "utf8",
);
const dialogTasksModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-tasks.js"),
  "utf8",
);
const dialogJianghuModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-jianghu.js"),
  "utf8",
);
const dialogStatsModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-stats.js"),
  "utf8",
);
const dialogKeysModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-keys.js"),
  "utf8",
);
const dialogShopModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-shop.js"),
  "utf8",
);
const dialogSocialModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-social.js"),
  "utf8",
);
const dialogEventsModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-events.js"),
  "utf8",
);
const dialogPmModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-pm.js"),
  "utf8",
);
const dialogExtensionsModuleSource = readFileSync(
  join(extensionRoot, "client/modules/dialog-extensions.js"),
  "utf8",
);
assert(
  /registerModule\(\s*["']dialog-channel["']/.test(
    dialogChannelModuleSource,
  ) &&
    gameClientSource.includes(
      'WSMudClient.createModule(\n  "dialog-channel"',
    ) &&
    gameClientSource.includes(
      "Dialog.channel = ClientDialogChannel.channel",
    ) &&
    !gameClientSource.includes("Dialog.channel = {") &&
    /registerModule\(\s*["']dialog-tasks["']/.test(dialogTasksModuleSource) &&
    gameClientSource.includes(
      'WSMudClient.createModule(\n  "dialog-tasks"',
    ) &&
    gameClientSource.includes("Dialog.tasks = ClientDialogTasks.tasks") &&
    !gameClientSource.includes("Dialog.tasks = {"),
  "频道或任务对话框模块注册、聚合薄桥或公开对象身份异常",
);
assert(
  /registerModule\(\s*["']dialog-social["']/.test(dialogSocialModuleSource) &&
    /registerModule\(\s*["']dialog-events["']/.test(dialogEventsModuleSource) &&
    /registerModule\(\s*["']dialog-pm["']/.test(dialogPmModuleSource) &&
    gameClientSource.includes('WSMudClient.createModule(\n  "dialog-social"') &&
    gameClientSource.includes('WSMudClient.createModule(\n  "dialog-events"') &&
    gameClientSource.includes('WSMudClient.createModule("dialog-pm"') &&
    gameClientSource.includes("Dialog.message = ClientDialogSocial.message") &&
    gameClientSource.includes("Dialog.relation = ClientDialogSocial.relation") &&
    gameClientSource.includes("Dialog.party = ClientDialogSocial.party") &&
    gameClientSource.includes("Dialog.team = ClientDialogSocial.team") &&
    gameClientSource.includes("Dialog.events = ClientDialogEvents.events") &&
    gameClientSource.includes("Dialog.pm = ClientDialogPm.pm") &&
    !gameClientSource.includes("Dialog.message = {") &&
    !gameClientSource.includes("Dialog.events = {") &&
    !gameClientSource.includes("Dialog.pm = {") &&
    dialogSocialModuleSource.includes('SendCommand("party load")') &&
    dialogSocialModuleSource.includes('cmd="_party cancle"') &&
    dialogSocialModuleSource.includes('cmd="party dissmiss"') &&
    dialogPmModuleSource.includes("context.timers.setInterval") &&
    dialogPmModuleSource.includes("context.timers.clearInterval") &&
    dialogPmModuleSource.includes("now()"),
  "社交、活动或拍卖对话框模块注册、薄桥、旧命令拼写或计时器依赖异常",
);
assert(
  /registerModule\(\s*["']dialog-extensions["']/.test(
    dialogExtensionsModuleSource,
  ) &&
    gameClientSource.includes(
      'WSMudClient.createModule("dialog-extensions"',
    ) &&
    gameClientSource.includes(
      "Dialog.extend = ClientDialogExtensions.extend",
    ) &&
    !gameClientSource.includes("Dialog.extend = {") &&
    dialogExtensionsModuleSource.includes('getItem("extends")') &&
    dialogExtensionsModuleSource.includes('setItem("extends"') &&
    !dialogExtensionsModuleSource.includes("mergeRecommendedNativeActions") &&
    dialogExtensionsModuleSource.includes("currentScript().lAST_MATCHES") &&
    dialogExtensionsModuleSource.includes("currentScript().LAST_DATA"),
  "扩展命令模块注册、薄桥、存储键或 SCRIPT 兼容字段异常",
);
assert(
  /registerModule\(\s*["']dialog-jianghu["']/.test(dialogJianghuModuleSource) &&
    gameClientSource.includes(
      'WSMudClient.createModule(\n  "dialog-jianghu"',
    ) &&
    !gameClientSource.includes("Dialog.jh_fam = {") &&
    !gameClientSource.includes("Dialog.jh_fb = {") &&
    !gameClientSource.includes("Dialog.jh_ar = {") &&
    !gameClientSource.includes("Dialog.jh = {") &&
    gameClientSource.includes(
      "Dialog.jh_fam = ClientDialogJianghu.jh_fam",
    ),
  "江湖/副本对话框模块注册或聚合兼容桥异常",
);
assert(
  /registerModule\(\s*["']dialog-stats["']/.test(dialogStatsModuleSource) &&
    gameClientSource.includes(
      'WSMudClient.createModule("dialog-stats"',
    ) &&
    gameClientSource.includes("Dialog.stats = ClientDialogStats.stats") &&
    !gameClientSource.includes("const STATS_SILDER1 = [") &&
    !gameClientSource.includes("Dialog.stats = {") &&
    dialogStatsModuleSource.includes("Dialog.stats.selectedItem") &&
    dialogStatsModuleSource.includes("Dialog.stats.load_stats()"),
  "排行榜对话框模块注册、聚合薄桥或公开 Dialog.stats 分派异常",
);
assert(
  /registerModule\(\s*["']dialog-keys["']/.test(dialogKeysModuleSource) &&
    gameClientSource.includes('WSMudClient.createModule("dialog-keys"') &&
    gameClientSource.includes("Dialog.keys = ClientDialogKeys.keys") &&
    !gameClientSource.includes("Dialog.keys = {") &&
    dialogKeysModuleSource.includes("Dialog.keys.select_item") &&
    dialogKeysModuleSource.includes("getUtilities().isMobile") &&
    dialogKeysModuleSource.includes("getScript().run"),
  "客户端快捷键模块注册、聚合薄桥或延迟依赖分派异常",
);
assert(
  /registerModule\(\s*["']dialog-shop["']/.test(dialogShopModuleSource) &&
    gameClientSource.includes('WSMudClient.createModule("dialog-shop"') &&
    gameClientSource.includes("Dialog.shop = ClientDialogShop.shop") &&
    !gameClientSource.includes("Dialog.shop = {") &&
    gameClientSource.includes("getMoneyToStr: () => moneyToStr"),
  "商城对话框模块注册、聚合薄桥或 moneyToStr 延迟依赖异常",
);
const skillCalculatorContractSource =
  gameClientSource +
  "\n" +
  dialogSkillsModuleSource +
  "\n" +
  skillCalculatorModuleSource;
for (const skillCalculatorContract of [
  "CalculateSkillTrainingCost",
  "ParseSkillTrainingEfficiency",
  "FormatSkillTrainingDuration",
  "Dialog.skillcalc",
  'cmd="_skillcalc ',
  'practice">计算</span>',
  'study">计算</span>',
  "WG_skill_training_calc",
  'pushLayer("skillcalc", pending)',
  'show("skillcalc")',
  "SKILL_TRAINING_FORMULA_PARAMS",
]) {
  assert(
    skillCalculatorContractSource.includes(skillCalculatorContract),
    `技能计算器缺少结构、公式或层级逻辑: ${skillCalculatorContract}`,
  );
}
const skillCalculatorSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
skillCalculatorSandbox.window.window = skillCalculatorSandbox.window;
for (const sourcePath of ["client/core.js", "client/modules/skill-calculator.js"])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    skillCalculatorSandbox,
    { filename: sourcePath },
  );
let skillCalculatorState = {
  score: { int: 20, int_add: 80 },
  score2: { lianxi_per: "50%+10%", study_per: "50%+20%" },
};
let pendingSkillLayer = { sourceItem: "skills", focus: "skill-row" };
const pushedSkillLayers = [];
const shownSkillDialogs = [];
const skillCalculatorDialog = {
  skills: { skills: { own: { id: "own", name: "太极拳", level: 10, grade: 0 } } },
  master: { skills: { taught: { id: "taught", name: "太极剑", level: 20, grade: 6 } } },
  isShow: true,
  curItem: "skills",
  consumeLayerRequest: () => {
    const value = pendingSkillLayer;
    pendingSkillLayer = null;
    return value;
  },
  pushLayer: (name, pending) => pushedSkillLayers.push([name, pending]),
  show: (name) => shownSkillDialogs.push(name),
};
const skillCalculatorModule = skillCalculatorSandbox.window.WSMudClient.createModule(
  "skill-calculator",
  {
    jquery: () => ({}),
    getDialog: () => skillCalculatorDialog,
    getGameState: () => skillCalculatorState,
    getWrapName: () => (skill) => skill.name,
  },
);
const skillCalculator = skillCalculatorModule.skillcalc;
const calculateSkillCost = skillCalculatorModule.CalculateSkillTrainingCost;
const whiteResult = calculateSkillCost({
  currentLevel: 10,
  targetLevel: 20,
  grade: 0,
  practiceSpeed: 100,
});
const redResult = calculateSkillCost({
  currentLevel: 10,
  targetLevel: 20,
  grade: 6,
  practiceSpeed: 100,
});
const derivedSpeedResult = calculateSkillCost({
  mode: "practice",
  currentLevel: 10,
  targetLevel: 20,
  grade: 0,
  innateIntelligence: 20,
  acquiredIntelligence: 80,
  efficiency: 60,
});
const studySpeedResult = calculateSkillCost({
  mode: "study",
  currentLevel: 10,
  targetLevel: 20,
  grade: 0,
  innateIntelligence: 20,
  acquiredIntelligence: 80,
  efficiency: 70,
});
assert(
  whiteResult.potential === 745 &&
    Math.abs(whiteResult.minutes - 745 / 100 / 12) < 1e-12,
  "白色技能潜能或时间公式与参考网页版不一致",
);
assert(
  redResult.potential === 5275,
  "红色技能潜能公式与参考网页版不一致",
);
assert(
  derivedSpeedResult.practiceSpeed === 140,
  "角色悟性与练习效率未正确换算为练习速度",
);
assert(
  studySpeedResult.practiceSpeed === 510,
  "角色悟性与学习效率未按服务端公式换算为学习速度",
);
assert(
  skillCalculatorModule.ParseSkillTrainingEfficiency("50%+20%+10%") === 80 &&
    skillCalculatorModule.ParseSkillTrainingEfficiency("-5.5%+2.25%") === -3.25 &&
    skillCalculatorModule.ParseSkillTrainingEfficiency("1e2") === 3 &&
    skillCalculatorModule.ParseSkillTrainingEfficiency("无加成") === "",
  "学习/练习效率中的临时与门派加成未被完整合计",
);
assert(
  skillCalculatorModule.FormatSkillTrainingDuration(59.999) === "60.00 分钟" &&
    skillCalculatorModule.FormatSkillTrainingDuration(60.001) === "1 小时 1 分钟" &&
    skillCalculatorModule.FormatSkillTrainingDuration(1439.1) === "1 天" &&
    skillCalculatorModule.FormatSkillTrainingDuration("5") === "—",
  "技能计算时间的分钟、小时、天进位或非法输入语义发生变化",
);
assert(
  calculateSkillCost({ currentLevel: 10, targetLevel: 10, grade: 0, practiceSpeed: 1 }).error ===
      "目标等级必须是大于当前等级的整数" &&
    calculateSkillCost({ currentLevel: 1, targetLevel: 2, grade: 7, practiceSpeed: 1 }).error ===
      "请选择技能颜色" &&
    calculateSkillCost({ currentLevel: 1, targetLevel: 2, grade: 0, practiceSpeed: Infinity }).error ===
      "练习速度必须大于 0",
  "技能计算等级、颜色或速度错误文案发生变化",
);
skillCalculator.open("own", "practice");
assert(
  skillCalculator.skill.id === "own" &&
    skillCalculator.mode === "practice" &&
    pushedSkillLayers.at(-1)?.[0] === "skillcalc" &&
    shownSkillDialogs.at(-1) === "skillcalc",
  "个人技能计算入口未保持父层请求、模式或 Dialog 名称",
);
skillCalculatorDialog.curItem = "master";
skillCalculatorDialog.isShow = false;
pendingSkillLayer = { sourceItem: "skills" };
skillCalculator.open("taught", "study");
assert(
  skillCalculator.skill.id === "taught" &&
    skillCalculator.mode === "study" &&
    pushedSkillLayers.length === 1 &&
    skillCalculator.getProfile().studyEfficiency === 70,
  "师父技能计算入口、过期层请求丢弃或动态角色属性读取发生变化",
);
const skillCalculatorFields = new Map();
const skillCalculatorTexts = new Map();
const skillCalculatorClasses = new Set();
const skillCalculatorEvents = [];
let skillCalculatorHtml = "";
let skillCalculatorDetached = 0;
let skillCalculatorFocused = 0;
function skillCalculatorSelection(selector) {
  return {
    val(value) {
      const field = selector.match(/data-field="([^"]+)"/)?.[1];
      if (arguments.length === 0) return skillCalculatorFields.get(field) ?? "";
      skillCalculatorFields.set(field, value);
      return this;
    },
    text(value) {
      if (selector.includes(",")) {
        for (const result of selector.matchAll(/data-result="([^"]+)"/g))
          skillCalculatorTexts.set(result[1], value);
      } else {
        const result = selector.match(/data-result="([^"]+)"/)?.[1];
        skillCalculatorTexts.set(result || selector, value);
      }
      return this;
    },
    empty() {
      skillCalculatorTexts.set(selector, "");
      return this;
    },
    addClass(name) {
      skillCalculatorClasses.add(name);
      return this;
    },
    removeClass(name) {
      skillCalculatorClasses.delete(name);
      return this;
    },
    trigger(name) {
      if (name === "focus") skillCalculatorFocused += 1;
      return this;
    },
    select() {
      return this;
    },
  };
}
const skillCalculatorElement = {
  on(type, selector) {
    skillCalculatorEvents.push([type, selector]);
    return this;
  },
  html(value) {
    skillCalculatorHtml = value;
    for (const match of value.matchAll(/data-field="([^"]+)"[^>]*value="([^"]*)"/g))
      skillCalculatorFields.set(match[1], match[2]);
    skillCalculatorFields.set(
      "mode",
      value.includes('<option value="study" selected>') ? "study" : "practice",
    );
    const selectedGrade = value.match(
      /<option value="(\d+)"[^>]* selected[^>]*>/,
    );
    skillCalculatorFields.set("grade", selectedGrade ? selectedGrade[1] : "0");
    return this;
  },
  appendTo() {
    return this;
  },
  find: skillCalculatorSelection,
  detach() {
    skillCalculatorDetached += 1;
    return this;
  },
};
const skillCalculatorTitles = [];
const skillCalculatorIcons = [];
const skillCalculatorFooters = [];
let skillCalculatorFloatingActivations = 0;
const skillCalculatorUiDialog = {
  contentElement: { empty: () => ({}) },
  title: (value) => skillCalculatorTitles.push(value),
  icon: (value) => skillCalculatorIcons.push(value),
  footer: (value) => skillCalculatorFooters.push(value),
  activateFloatingDialog: () => {
    skillCalculatorFloatingActivations += 1;
  },
};
const skillCalculatorUiModule =
  skillCalculatorSandbox.window.WSMudClient.createModule("skill-calculator", {
    jquery: () => skillCalculatorElement,
    getDialog: () => skillCalculatorUiDialog,
    getGameState: () => skillCalculatorState,
    getWrapName: () => (skill) => "<hig>" + skill.name + "</hig>",
  });
const skillCalculatorUi = skillCalculatorUiModule.skillcalc;
skillCalculatorUi.skill = { name: "太极拳", level: 10, grade: 0 };
skillCalculatorUi.show();
assert(
  skillCalculatorUi.isShow === true &&
    skillCalculatorEvents.length === 4 &&
    skillCalculatorHtml.includes("WG_skill_calc_result") &&
    skillCalculatorFields.get("practiceSpeed") === "140.00" &&
    skillCalculatorTitles.at(-1) === "<hig>太极拳</hig> · 计算" &&
    skillCalculatorIcons.at(-1) === "time" &&
    skillCalculatorFooters.at(-1) === "" &&
    skillCalculatorFloatingActivations === 1 &&
    skillCalculatorFocused === 1,
  "技能计算器渲染、事件唯一绑定、自动速度、标题或焦点发生变化",
);
skillCalculatorFields.set("mode", "study");
skillCalculatorUi.changeMode();
assert(
  skillCalculatorUi.mode === "study" &&
    skillCalculatorFields.get("efficiency") === 70 &&
    skillCalculatorFields.get("practiceSpeed") === "510.00" &&
    skillCalculatorTexts.get(".WG_skill_calc_efficiency_label") === "学习效率" &&
    skillCalculatorTexts.get(".WG_skill_calc_speed_label") === "学习速度",
  "技能计算器学习模式、效率或速度标签发生变化",
);
skillCalculatorFields.set("currentLevel", "10");
skillCalculatorFields.set("targetLevel", "20");
skillCalculatorFields.set("grade", "0");
skillCalculatorUi.calculate();
assert(
  skillCalculatorTexts.get("potential") === "745" &&
    skillCalculatorTexts.get("speed") === "510" &&
    !skillCalculatorClasses.has("show"),
  "技能计算器成功结果或中文数字格式发生变化",
);
skillCalculatorFields.set("targetLevel", "10");
skillCalculatorUi.calculate();
assert(
  skillCalculatorTexts.get(".WG_skill_calc_error") ===
      "目标等级必须是大于当前等级的整数" &&
    skillCalculatorClasses.has("show") &&
    skillCalculatorTexts.get("potential") === "—",
  "技能计算器错误文案、错误状态或结果清理发生变化",
);
skillCalculatorUi.show();
assert(skillCalculatorEvents.length === 4, "技能计算器重复显示时重复绑定了 DOM 事件");
skillCalculatorUi.close();
assert(
  skillCalculatorUi.isShow === false &&
    skillCalculatorUi.skill.name === "太极拳" &&
    skillCalculatorDetached === 1,
  "技能计算器关闭时未保持 detach、isShow 或旧技能对象语义",
);
const dialogJianghuSandbox = { window: {} };
dialogJianghuSandbox.window.window = dialogJianghuSandbox.window;
for (const sourcePath of ["client/core.js", "client/modules/dialog-jianghu.js"])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogJianghuSandbox,
    { filename: sourcePath },
  );
function createDialogJianghuNode(initialHtml = "") {
  let html = initialHtml;
  const node = {
    0: { offsetTop: 0, scrollTop: 0 },
    length: 1,
    find: () => node,
    on: () => node,
    append: () => node,
    appendTo: () => node,
    remove: () => node,
    empty: () => {
      html = "";
      return node;
    },
    html: (value) => {
      if (value === undefined) return html;
      html = value;
      return node;
    },
    prev: () => createDialogJianghuNode("上一条消息"),
    height: () => 100,
    is: () => false,
    attr: () => undefined,
    addClass: () => node,
    removeClass: () => node,
  };
  return node;
}
const dialogSkillsSandbox = { window: {} };
dialogSkillsSandbox.window.window = dialogSkillsSandbox.window;
for (const sourcePath of ["client/core.js", "client/modules/dialog-skills.js"])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogSkillsSandbox,
    { filename: sourcePath },
  );
let dialogSkillsLateReads = 0;
const dialogSkillsCommands = [];
const dialogSkillsDialogCalls = [];
const dialogSkillsInsertedHtml = [];
const dialogSkillsScrollTargets = [];
const dialogSkillsExtendCalls = [];
const dialogSkillsScript = {};
const dialogSkillsExtend = {
  query: (type, item) => {
    dialogSkillsExtendCalls.push([type, item]);
    return [{ cmd: "custom command", name: "扩展动作" }];
  },
};
function dialogSkillsJquery(value) {
  if (value && typeof value === "object") return value;
  const node = createDialogJianghuNode(typeof value === "string" ? value : "");
  node.insertAfter = () => {
    dialogSkillsInsertedHtml.push(value);
    return node;
  };
  return node;
}
const dialogSkillsDialog = {
  contentElement: createDialogJianghuNode(),
  title: (value) => dialogSkillsDialogCalls.push(["title", value]),
  icon: (value) => dialogSkillsDialogCalls.push(["icon", value]),
  footer: (value) => dialogSkillsDialogCalls.push(["footer", value]),
  activateSkillsWindow: () => dialogSkillsDialogCalls.push(["activate"]),
};
const lateDialogSkillsDependency = (value) => () => {
  dialogSkillsLateReads += 1;
  return value;
};
let dialogSkillsAutoSort = false;
const dialogSkillsService =
  dialogSkillsSandbox.window.WSMudClient.createModule("dialog-skills", {
    getDialog: lateDialogSkillsDependency(dialogSkillsDialog),
    getProcess: lateDialogSkillsDependency({}),
    getSendCommand: lateDialogSkillsDependency((command) =>
      dialogSkillsCommands.push(command),
    ),
    getJQuery: lateDialogSkillsDependency(dialogSkillsJquery),
    getCheckScroll: lateDialogSkillsDependency((target) =>
      dialogSkillsScrollTargets.push(target),
    ),
    getWrapName: lateDialogSkillsDependency((item) => item.name),
    getExtend: lateDialogSkillsDependency(dialogSkillsExtend),
    getScript: lateDialogSkillsDependency(dialogSkillsScript),
    getSetting: lateDialogSkillsDependency({
      get auto_sortitem() {
        return dialogSkillsAutoSort;
      },
    }),
  });
assert(
  dialogSkillsLateReads === 0,
  "技能模块工厂阶段提前读取了后置客户端依赖",
);
dialogSkillsDialog.skills = dialogSkillsService.skills;
dialogSkillsDialog.master = dialogSkillsService.master;
dialogSkillsDialog.show = (name) => dialogSkillsService[name].show();
const sharedSkillMethods = [
  "close",
  "createSkillItems",
  "createSkillItem",
  "updateSkill",
  "updateSkillItem",
  "showdesc",
  "isEnable",
];
assert(
  sharedSkillMethods.every(
    (methodName) =>
      dialogSkillsService.master[methodName] ===
      dialogSkillsService.skills[methodName],
  ),
  "师父技能未保持七个历史共享方法的严格函数身份",
);
dialogSkillsService.skills.show();
dialogSkillsService.skills.onData({
  title: "我的技能",
  items: [
    { id: "low", name: "低阶", grade: 1, level: 10, exp: 20 },
    { id: "high", name: "高阶", grade: 3, level: 20, exp: 30 },
  ],
});
dialogSkillsAutoSort = true;
const sortedDialogSkills = dialogSkillsService.skills.sort_items(
  dialogSkillsService.skills.items,
);
dialogSkillsService.skills.close();
dialogSkillsService.skills.show();
assert(
  dialogSkillsCommands.join("|") === "cha|cha none" &&
    dialogSkillsService.skills.isShow === true &&
    sortedDialogSkills[0].id === "high" &&
    dialogSkillsDialogCalls.some(
      (entry) => entry[0] === "title" && entry[1] === "我的技能",
    ),
  "技能首次/缓存打开命令、协议渲染或动态自动排序设置发生变化",
);
const dialogSkillsTarget = createDialogJianghuNode();
dialogSkillsTarget.attr = (name) => (name === "skid" ? "low" : undefined);
dialogSkillsTarget.next = () => dialogSkillsTarget;
dialogSkillsService.skills.item_click.call(dialogSkillsTarget);
assert(
  dialogSkillsScript.LAST_OBJ === dialogSkillsService.skills.skills.low &&
    dialogSkillsExtendCalls.at(-1)[0] === "skill" &&
    dialogSkillsInsertedHtml.at(-1).includes('cmd="checkskill low"') &&
    dialogSkillsInsertedHtml.at(-1).includes('cmd="_skillcalc low practice"') &&
    dialogSkillsInsertedHtml.at(-1).includes('cmd="custom command"') &&
    dialogSkillsScrollTargets.at(-1) === dialogSkillsTarget,
  "自身技能点击、LAST_OBJ、扩展命令、计算入口或滚动检查发生变化",
);
dialogSkillsService.master.onData({
  follower: "teacher-id",
  title: "弟子技能",
  target: "弟子",
  limit: 200,
  items: [
    {
      id: "master-skill",
      name: "师门绝学",
      grade: 2,
      level: 30,
      exp: 40,
    },
  ],
});
const dialogMasterTarget = createDialogJianghuNode();
dialogMasterTarget.attr = (name) =>
  name === "skid" ? "master-skill" : undefined;
dialogSkillsService.master.item_click.call(dialogMasterTarget);
assert(
  dialogSkillsService.master.isShow === true &&
    dialogSkillsService.master.master === "teacher-id" &&
    dialogSkillsService.master.is_follower === true &&
    dialogSkillsExtendCalls.at(-1)[0] === "mskill" &&
    dialogSkillsScript.LAST_OBJ ===
      dialogSkillsService.master.skills["master-skill"] &&
    dialogSkillsInsertedHtml.at(-1).includes(
      'cmd="checkskill master-skill teacher-id"',
    ) &&
    dialogSkillsInsertedHtml.at(-1).includes(
      'cmd="xue master-skill from teacher-id"',
    ) &&
    dialogSkillsInsertedHtml.at(-1).includes(
      'cmd="_skillcalc master-skill study"',
    ),
  "师父技能 follower 协议、点击命令、LAST_OBJ 或扩展查询发生变化",
);
const dialogListsSandbox = { window: {} };
dialogListsSandbox.window.window = dialogListsSandbox.window;
for (const sourcePath of [
  "client/core.js",
  "client/modules/dialog-channel.js",
  "client/modules/dialog-tasks.js",
])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogListsSandbox,
    { filename: sourcePath },
  );
const channelDialogCalls = [];
const channelQueueCalls = [];
let channelDrawerPresent = false;
let channelRestoredToDrawer = 0;
let channelRestoredBeforeMessages = 0;
const channelElement = createDialogJianghuNode();
channelElement.appendTo = () => {
  channelRestoredToDrawer += 1;
  return channelElement;
};
channelElement.insertBefore = () => {
  channelRestoredBeforeMessages += 1;
  return channelElement;
};
const channelProcess = {
  ChannelElement: channelElement,
  channel: {
    clear: () => channelQueueCalls.push(["clear"]),
    push: (value) => channelQueueCalls.push(["push", value]),
    scroll2end: () => channelQueueCalls.push(["scroll"]),
  },
};
const channelDialog = {
  footerElement: createDialogJianghuNode(),
  contentElement: createDialogJianghuNode(),
  select: (value) => channelDialogCalls.push(["select", value]),
  icon: (value) => channelDialogCalls.push(["icon", value]),
  title: (value) => channelDialogCalls.push(["title", value]),
  footer: (value) => channelDialogCalls.push(["footer", value]),
};
const channelWindow = {};
function channelJquery(value) {
  if (value === ".container > .bottom-bar > .WG_chat_drawer_shell") {
    return {
      first: () => ({ length: channelDrawerPresent ? 1 : 0 }),
    };
  }
  const node = createDialogJianghuNode(String(value ?? ""));
  node.first = () => node;
  return node;
}
const channel = dialogListsSandbox.window.WSMudClient.createModule(
  "dialog-channel",
  {
    Dialog: channelDialog,
    Process: channelProcess,
    jquery: channelJquery,
    window: channelWindow,
  },
).channel;
channelDialog.channel = channel;
let sideChatOpenCount = 0;
channelWindow.WGOpenSideChatPanel = () => {
  sideChatOpenCount += 1;
  return false;
};
channel.show();
assert(
  sideChatOpenCount === 1 && channelDialogCalls.length === 0,
  "频道入口未优先转交右侧聊天面板",
);
delete channelWindow.WGOpenSideChatPanel;
let sideChatInitCount = 0;
channelWindow.WG = {
  initSideChatPanel: () => {
    sideChatInitCount += 1;
  },
};
channel.last_click = Date.now();
channel.show();
assert(
  sideChatInitCount === 1 &&
    channel.isShow === true &&
    channelDialogCalls.some(([name, value]) => name === "select" && value === "channel"),
  "频道原生 Dialog 打开、侧栏初始化或双击时序发生变化",
);
channel.datas = [
  ["chat", "世界消息"],
  ["tm", "队伍消息"],
];
channelQueueCalls.length = 0;
channel.footerChanged("tm");
assert(
  JSON.stringify(channelQueueCalls) ===
    JSON.stringify([["clear"], ["push", "队伍消息"], ["scroll"]]),
  "频道筛选未保持清空、回放和滚动顺序",
);
const rumorMessage = { ch: "rumor", name: "原名", uid: "uid", content: "传闻" };
channel.select_item = "";
const rumorHtml = channel.createElement(rumorMessage);
const serverMessage = { ch: "es", server: "一区", name: "玩家", uid: "uid", content: "跨服" };
channel.select_item = "";
const serverHtml = channel.createElement(serverMessage);
assert(
  rumorMessage.ch === "sys" &&
    rumorMessage.name === "某人" &&
    rumorHtml.includes("<him>【谣言】") &&
    serverMessage.uid === null &&
    serverHtml.includes("<hio>【一区】") &&
    !serverHtml.includes("look3 uid"),
  "频道谣言归类、跨服身份清理或 HTML 协议发生变化",
);
channel.datas = Array.from({ length: 801 }, () => ["chat", "旧消息"]);
channel.createElement({ ch: "chat", lv: 0, content: "新消息" });
assert(
  channel.datas.length === 1,
  "频道超过 800 条后的历史清空怪异行为被意外修正",
);
channelDrawerPresent = true;
channel.hide();
channelDrawerPresent = false;
channel.hide();
assert(
  channelRestoredToDrawer === 1 &&
    channelRestoredBeforeMessages === 1 &&
    channel.isShow === false,
  "频道关闭后未按聊天抽屉存在性恢复原节点",
);
const taskCommands = [];
const taskTitles = [];
const taskIcons = [];
const taskFooters = [];
let taskAppends = 0;
let taskRemoves = 0;
const taskElement = createDialogJianghuNode();
taskElement.appendTo = () => {
  taskAppends += 1;
  return taskElement;
};
taskElement.remove = () => {
  taskRemoves += 1;
  return taskElement;
};
const taskDialog = {
  contentElement: createDialogJianghuNode(),
  title: (value) => taskTitles.push(value),
  icon: (value) => taskIcons.push(value),
  footer: (value) => taskFooters.push(value),
};
const tasks = dialogListsSandbox.window.WSMudClient.createModule(
  "dialog-tasks",
  {
    Dialog: taskDialog,
    jquery: () => taskElement,
    SendCommand: (command) => taskCommands.push(command),
  },
).tasks;
taskDialog.tasks = tasks;
tasks.show();
tasks.show();
assert(
  taskCommands.join("|") === "tasks|tasks" &&
    taskAppends === 1 &&
    tasks.isShow === true,
  "任务弹窗重复打开时未保持先发命令、单次挂载语义",
);
const taskFullItems = [
    { id: "a", state: 1, title: "进行", desc: "描述一" },
    { id: "b", state: 2, title: "领取", desc: "描述二" },
    { id: "c", state: 3, title: "完成", desc: "描述三" },
];
tasks.onData({ items: taskFullItems });
assert(
  tasks.items === taskFullItems &&
  taskTitles.at(-1) === "任务列表" &&
    taskIcons.at(-1) === "exclamation-sign" &&
    taskElement.html().includes("task b fin") &&
    taskElement.html().includes("进行中") &&
    taskElement.html().includes("已完成") &&
    taskFooters.at(-1) === "",
  "任务全量协议、状态类或领取命令发生变化",
);
tasks.onData({ id: "a", state: 2, title: "更新", desc: "新描述" });
tasks.onData({ id: "b", state: 0 });
assert(
  tasks.items.length === 2 &&
    tasks.items[0].title === "更新" &&
    !taskElement.html().includes("task b fin"),
  "任务增量更新或 state=0 原地删除语义发生变化",
);
const duplicateTaskItems = [
  { id: "same", state: 1, title: "首个", desc: "一" },
  { id: "same", state: 1, title: "第二个", desc: "二" },
];
tasks.onData({ items: duplicateTaskItems });
tasks.onData({ id: "same", state: 3, title: "只更新首个", desc: "新" });
assert(
  duplicateTaskItems[0].title === "只更新首个" &&
    duplicateTaskItems[1].title === "第二个",
  "任务重复 ID 不再只更新首个宽松匹配项",
);
tasks.close();
assert(
  taskRemoves === 1 && tasks.isShow === false,
  "任务弹窗关闭未移除节点或复位状态",
);
const dialogJianghuCommands = [];
const dialogJianghuMessages = [];
const dialogJianghuTitles = [];
const dialogJianghuIcons = [];
const dialogJianghuDialog = {
  contentElement: createDialogJianghuNode(),
  footerElement: createDialogJianghuNode(),
  extend: { append: () => {} },
  title: (value) => dialogJianghuTitles.push(value),
  icon: (value) => dialogJianghuIcons.push(value),
  hide: () => {},
};
const dialogJianghuService =
  dialogJianghuSandbox.window.WSMudClient.createModule("dialog-jianghu", {
    Dialog: dialogJianghuDialog,
    jquery: (value) =>
      value && typeof value === "object"
        ? value
        : createDialogJianghuNode(String(value ?? "")),
    SendCommand: (command) => dialogJianghuCommands.push(command),
    ReceiveMessage: (message) => dialogJianghuMessages.push(message),
  });
const { jh_fam, jh_fb, jh_ar, jh } = dialogJianghuService;
dialogJianghuDialog.jh_fam = jh_fam;
dialogJianghuDialog.jh_fb = jh_fb;
dialogJianghuDialog.jh_ar = jh_ar;
dialogJianghuDialog.jh = jh;
assert(
  jh_fb.select === jh_fam.select &&
    jh_fb.onClickItem === jh_fam.onClickItem &&
    jh_ar.append_status === jh_fb.append_status &&
    jh_ar.append_actions === jh_fam.append_actions &&
    jh.footers[0] === jh_fam &&
    jh.footers[1] === jh_fb &&
    jh.footers[2] === jh_ar,
  "江湖、普通副本和禁地对话框未保持共享方法或 footer 对象身份",
);
jh.show();
jh.onData({
  families: ["武当派"],
  fbs: ["树林"],
  areas: ["古禁地"],
});
assert(
  dialogJianghuCommands.join("|") === "jh|jh fam 0" &&
    dialogJianghuTitles.at(-1) === "江湖" &&
    dialogJianghuIcons.at(-1) === "home" &&
    jh_fam.items[0].name === "武当派" &&
    jh_fb.items[0].name === "树林" &&
    jh_ar.items[0].name === "古禁地" &&
    jh.selected_item === jh_fam,
  "江湖首页初始化、列表映射或首个门派详情请求发生变化",
);
jh.update_lock({ unlock: 0, unlock2: 1 });
assert(
  jh_fb.items[0].unlock === true && jh_ar.items[0].unlock === true,
  "江湖副本或禁地解锁状态更新发生变化",
);
jh_fb.show_first(createDialogJianghuNode());
assert(
  dialogJianghuMessages.at(-1) === "上一条消息",
  "副本首条历史消息未继续交给 ReceiveMessage",
);
jh.close();
jh.show();
assert(
  dialogJianghuCommands.at(-1) === "jh fb lock" && jh.isShow === true,
  "江湖对话框重复打开时未保持锁状态刷新语义",
);
const dialogStatsSandbox = { window: {} };
dialogStatsSandbox.window.window = dialogStatsSandbox.window;
for (const sourcePath of ["client/core.js", "client/modules/dialog-stats.js"])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogStatsSandbox,
    { filename: sourcePath },
  );
const dialogStatsCommands = [];
const dialogStatsTitles = [];
const dialogStatsIcons = [];
const dialogStatsFooters = [];
let dialogStatsInsertedHtml = "";
function dialogStatsJquery(value) {
  if (value && typeof value === "object") return value;
  const node = createDialogJianghuNode(String(value ?? ""));
  node.insertAfter = () => {
    dialogStatsInsertedHtml = String(value ?? "");
    return node;
  };
  return node;
}
const dialogStatsDialog = {
  contentElement: createDialogJianghuNode(),
  footerElement: createDialogJianghuNode(),
  hide: () => {},
  icon: (value) => dialogStatsIcons.push(value),
  title: (value) => dialogStatsTitles.push(value),
  footer: (value) => dialogStatsFooters.push(value),
};
const dialogStatsService =
  dialogStatsSandbox.window.WSMudClient.createModule("dialog-stats", {
    Dialog: dialogStatsDialog,
    jquery: dialogStatsJquery,
    SendCommand: (command) => dialogStatsCommands.push(command),
  });
const dialogStats = dialogStatsService.stats;
dialogStatsDialog.stats = dialogStats;
assert(
  dialogStats.selectedItem === 0 &&
    dialogStats.footers.length === 6 &&
    dialogStats.footers[0].silder === dialogStats.footers[1].silder &&
    dialogStats.footers[0].silder === dialogStats.footers[3].silder &&
    dialogStats.footers[0].silder === dialogStats.footers[4].silder &&
    dialogStats.footers[0].silder === dialogStats.footers[5].silder &&
    dialogStats.footers[2].silder === dialogStatsService.STATS_SILDER2 &&
    dialogStats.footers[2].silder !== dialogStats.footers[0].silder,
  "排行榜 footer 顺序、初始选择或 SILDER 共享数组身份发生变化",
);
dialogStats.show();
assert(
  dialogStatsCommands.join("|") === "stats score" &&
    dialogStats.selectedItem === dialogStats.footers[0] &&
    dialogStatsTitles.at(-1) === "综合榜" &&
    dialogStatsIcons.at(-1) === "stats" &&
    dialogStatsFooters.at(-1).includes("stats-span"),
  "排行榜首次打开、默认榜单命令、标题或 footer 发生变化",
);
const dialogStatsItems = [["甲", 100]];
const dialogStatsTime = Date.now();
dialogStats.onData({
  items: dialogStatsItems,
  st: "score",
  fam: "wudang",
  time: dialogStatsTime,
  score: 88,
});
assert(
  dialogStats.last_scorewudang.items === dialogStatsItems &&
    dialogStats.last_scorewudang.time === dialogStatsTime + 60000 &&
    dialogStats.last_scorewudang.score === 88 &&
    dialogStats.container.html().includes("甲"),
  "排行榜一分钟缓存、服务端数组身份或通用排行渲染发生变化",
);
dialogStats.selectedItem.selected_silder = "wudang";
dialogStats.load_stats();
assert(
  dialogStatsCommands.length === 1,
  "排行榜有效缓存仍重复发送 stats 请求",
);
dialogStats.selectedItem = dialogStats.footers[1];
dialogStats.selectedItem.selected_silder = "wudang";
dialogStats.onData({ tops: [["乙", 99]], top: 5, sc: 77, fam: "wudang" });
assert(
  dialogStats.top === 5 &&
    dialogStats.container.html().includes("武当第") &&
    dialogStats.container.html().includes("乙"),
  "高手榜名次、门派标题或排行渲染发生变化",
);
dialogStats.onData({ weapons: [["屠龙刀", 12]] });
assert(
  dialogStats.container.html().includes("屠龙刀"),
  "兵器谱渲染发生变化",
);
dialogStats.onData({ scores: [["丙", 66]], score: 66 });
assert(
  dialogStats.container.html().includes("丙"),
  "综合评分榜渲染发生变化",
);
const dialogStatsTopItem = createDialogJianghuNode();
dialogStatsTopItem.attr = (name) => (name === "top" ? "3" : undefined);
dialogStats.itemClick.call(dialogStatsTopItem);
assert(
  dialogStatsInsertedHtml.includes('cmd="stats top wudang 3"') &&
    dialogStatsInsertedHtml.includes('cmd="biwu wudang 3"') &&
    dialogStatsInsertedHtml.includes('cmd="reward top 3"'),
  "高手榜查看、挑战或奖励命令发生变化",
);
dialogStats.close();
assert(
  dialogStats.isShow === false &&
    dialogStats.last_scorewudang.items === dialogStatsItems,
  "排行榜关闭时未保持 isShow 或历史缓存语义",
);
const dialogKeysSandbox = { window: {} };
dialogKeysSandbox.window.window = dialogKeysSandbox.window;
for (const sourcePath of ["client/core.js", "client/modules/dialog-keys.js"])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogKeysSandbox,
    { filename: sourcePath },
  );
const dialogKeysBodyListeners = new Set();
const dialogKeysWindowListeners = new Set();
const dialogKeysDocument = {
  body: {
    addEventListener: (_type, listener) => dialogKeysBodyListeners.add(listener),
    removeEventListener: (_type, listener) =>
      dialogKeysBodyListeners.delete(listener),
  },
};
const dialogKeysWindow = {
  addEventListener: (_type, listener) => dialogKeysWindowListeners.add(listener),
};
const dialogKeysStored = {
  "Ctrl+KeyK": "1_0",
  KeyX: "2_0",
};
let dialogKeysStorageReads = 0;
const dialogKeysStorageWrites = [];
const dialogKeysScriptRuns = [];
const dialogKeysDialog = {};
const dialogKeysService =
  dialogKeysSandbox.window.WSMudClient.createModule("dialog-keys", {
    Dialog: dialogKeysDialog,
    jquery: (value) => value,
    documentRef: dialogKeysDocument,
    windowRef: dialogKeysWindow,
    storageUtil: {
      getItem: (key) => {
        dialogKeysStorageReads += 1;
        assert(key === "keys", "快捷键读取了未知存储键");
        return dialogKeysStored;
      },
      setItem: (key, value) => dialogKeysStorageWrites.push([key, value]),
    },
    getUtilities: () => ({ isMobile: false }),
    getScript: () => ({ run: (command) => dialogKeysScriptRuns.push(command) }),
  });
const dialogKeys = dialogKeysService.keys;
dialogKeysDialog.keys = dialogKeys;
assert(
  dialogKeys.groups.length === 2 &&
    dialogKeys.groups.reduce((total, group) => total + group.items.length, 0) ===
      21,
  "快捷键初始分组或项目数量发生变化",
);
dialogKeys.init_key();
dialogKeys.init_key();
assert(
  dialogKeysStorageReads === 1 &&
    dialogKeysWindowListeners.size === 1 &&
    dialogKeys.setting === dialogKeysStored &&
    dialogKeys.id2keys["1_0"] === "Ctrl+KeyK",
  "快捷键存储重复读取、全局监听重复注册或反向索引异常",
);
dialogKeys.init();
assert(
  dialogKeys.groups.length === 4 &&
    dialogKeys.groups.reduce((total, group) => total + group.items.length, 0) ===
      39 &&
    dialogKeys.groups[2].items[0].cmd === "#action 0" &&
    dialogKeys.groups[3].items[8].cmd === "#pfm 8",
  "快捷键动作栏/技能栏扩展或命令字符串发生变化",
);
let dialogKeysDelegatedBindings = 0;
const dialogKeysElement = createDialogJianghuNode();
dialogKeysElement.on = () => {
  dialogKeysDelegatedBindings += 1;
  return dialogKeysElement;
};
dialogKeys.show(dialogKeysElement);
dialogKeys.show(dialogKeysElement);
assert(
  dialogKeysDelegatedBindings === 2 && dialogKeysBodyListeners.size === 1,
  "快捷键重复 show 未保持 jQuery 委托历史行为或原生监听身份",
);
dialogKeys.hide();
assert(dialogKeysBodyListeners.size === 0, "快捷键 hide 后仍保留录入监听");
dialogKeys.show(dialogKeysElement);
dialogKeys.close();
assert(dialogKeysBodyListeners.size === 0, "快捷键 close 后仍保留录入监听");
let dialogKeysPrevented = 0;
const globalKeyListener = [...dialogKeysWindowListeners][0];
globalKeyListener({
  target: dialogKeysDocument.body,
  code: "KeyK",
  key: "k",
  ctrlKey: true,
  altKey: false,
  shiftKey: false,
  preventDefault: () => {
    dialogKeysPrevented += 1;
  },
});
globalKeyListener({
  target: {},
  code: "KeyK",
  key: "k",
  ctrlKey: true,
  preventDefault: () => {
    dialogKeysPrevented += 10;
  },
});
assert(
  dialogKeysScriptRuns.join("|") === "#menu score" &&
    dialogKeysPrevented === 1 &&
    dialogKeys.get_key_code({
      code: "KeyP",
      key: "p",
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    }) === "Shift+Alt+Ctrl+KeyP",
  "快捷键 body 目标过滤、SCRIPT 命令或修饰键编码发生变化",
);
const dialogKeysSelected = createDialogJianghuNode();
dialogKeysSelected.attr = (name) => (name === "sid" ? "0_0" : undefined);
dialogKeys.select_item = dialogKeysSelected;
const firstShortcutItem = dialogKeys.groups[0].items[0];
dialogKeys.record_press({
  code: "KeyZ",
  key: "z",
  keyCode: 90,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  preventDefault: () => {},
  stopPropagation: () => {},
});
assert(
  firstShortcutItem.key === "KeyZ" &&
    dialogKeys.setting.KeyZ === "0_0" &&
    dialogKeysStorageWrites.at(-1)[0] === "keys",
  "快捷键录入、设置映射或存储键发生变化",
);
dialogKeys.record_press({ keyCode: 8 });
assert(
  firstShortcutItem.key === null && dialogKeys.setting.KeyZ === "0_0",
  "快捷键清除不再保留旧 id2keys 未同步的历史副作用",
);
let mobileShortcutStorageReads = 0;
const mobileDialog = {};
const mobileDialogKeys =
  dialogKeysSandbox.window.WSMudClient.createModule("dialog-keys", {
    Dialog: mobileDialog,
    jquery: (value) => value,
    documentRef: dialogKeysDocument,
    windowRef: dialogKeysWindow,
    storageUtil: {
      getItem: () => {
        mobileShortcutStorageReads += 1;
      },
      setItem: () => {},
    },
    getUtilities: () => ({ isMobile: true }),
    getScript: () => ({ run: () => {} }),
  }).keys;
mobileDialog.keys = mobileDialogKeys;
mobileDialogKeys.init_key();
assert(
  mobileShortcutStorageReads === 0 && mobileDialogKeys.load_storage !== true,
  "移动端快捷键初始化不再保持直接跳过语义",
);
const dialogShopSandbox = { window: {} };
dialogShopSandbox.window.window = dialogShopSandbox.window;
for (const sourcePath of ["client/core.js", "client/modules/dialog-shop.js"])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogShopSandbox,
    { filename: sourcePath },
  );
const dialogShopCommands = [];
const dialogShopTitles = [];
const dialogShopIcons = [];
const dialogShopFooters = [];
let dialogShopAppends = 0;
let dialogShopMoneyPrefix = "金额:";
const dialogShopElement = createDialogJianghuNode();
dialogShopElement.appendTo = () => {
  dialogShopAppends += 1;
  return dialogShopElement;
};
const dialogShopDialog = {
  contentElement: createDialogJianghuNode(),
  title: (value) => dialogShopTitles.push(value),
  icon: (value) => dialogShopIcons.push(value),
  footer: (value) => dialogShopFooters.push(value),
};
const dialogShopService =
  dialogShopSandbox.window.WSMudClient.createModule("dialog-shop", {
    Dialog: dialogShopDialog,
    jquery: () => dialogShopElement,
    SendCommand: (command) => dialogShopCommands.push(command),
    getMoneyToStr: () => (value) => dialogShopMoneyPrefix + value,
  });
const dialogShop = dialogShopService.shop;
dialogShopDialog.shop = dialogShop;
dialogShop.show();
assert(
  dialogShopCommands.join("|") === "shop" &&
    dialogShopTitles.at(-1) === "商品列表" &&
    dialogShopIcons.at(-1) === "shopping-cart" &&
    dialogShopAppends === 1 &&
    dialogShop.isShow === true,
  "商城首次打开、标题、图标、容器或 shop 命令发生变化",
);
dialogShop.onData({ money: [100, 20, 7], mtype: "<hio>活动币</hio>" });
assert(
  dialogShop.footers.join("|") === "黄金|元宝|活动" &&
    dialogShop.money === 100 &&
    dialogShop.cash_money === 20 &&
    dialogShop.act_money === 7 &&
    dialogShopFooters.at(-1).includes("金额:100"),
  "商城三货币状态、活动名称或黄金格式化发生变化",
);
dialogShopMoneyPrefix = "动态:";
dialogShop.create_footer();
assert(
  dialogShopFooters.at(-1).includes("动态:100"),
  "商城未通过 getter 动态读取 moneyToStr",
);
dialogShop.onData({
  idx: 3,
  selllist: [
    [["gold-item", "金货", "描述", 10, 2, 0.5, 5, 2], null],
    [["cash-item", "元宝货", "描述2", 8, 1, 1]],
    [["act-item", "活动货", "描述3", 4, 3, 1]],
  ],
});
assert(
  dialogShop.idx === 3 &&
    dialogShop.list0.length === 1 &&
    dialogShop.list0[0].value === 5 &&
    dialogShop.list0[0].price0 === "<del>10两黄金</del>" &&
    dialogShop.list0[0].price === "<hiy>5两黄金</hiy>" &&
    dialogShop.list1[0].price === "<hij>8元宝</hij>" &&
    dialogShop.list2[0].price === "4<hio>活动币</hio>" &&
    dialogShopElement.html().includes('_confirm shop gold-item 3') &&
    dialogShopElement.html().includes("&nbsp;<del>10两黄金</del>&nbsp;"),
  "商城协议映射、折扣、限购、三类价格或购买命令发生变化",
);
assert(
  dialogShop.get_item("gold-item") === dialogShop.list0[0] &&
    dialogShop.get_item(3) === undefined,
  "商城商品查找顺序或严格 ID 比较发生变化",
);
dialogShop.onData({ item: ["gold-item", 4], idx: 99 });
assert(
  dialogShop.list0[0].count === 4 && dialogShop.idx === 3,
  "商城单商品数量更新未在 idx 分支前返回",
);
dialogShop.onData({ remove: "gold-item", item: ["cash-item", 99] });
assert(
  dialogShop.list0.length === 0 && dialogShop.list1[0].count === undefined,
  "商城移除分支未优先于单商品更新，或未原地 splice",
);
dialogShop.selected_item = 2;
dialogShop.onData({ money: [1, 2] });
assert(
  dialogShop.footers.join("|") === "黄金|元宝" &&
    dialogShop.selected_item === 0 &&
    dialogShop.act_money === 0,
  "商城恢复双货币时未重置活动页选择或余额",
);
dialogShop.show();
assert(
  dialogShopCommands.at(-1) === "shop 3" && dialogShopAppends === 2,
  "商城重复打开时未保持 shop <idx> 命令或 append 行为",
);
dialogShop.close();
assert(dialogShop.isShow === false, "商城关闭后未重置 isShow");
const dialogSocialSandbox = { window: {} };
dialogSocialSandbox.window.window = dialogSocialSandbox.window;
for (const sourcePath of [
  "client/core.js",
  "client/modules/dialog-social.js",
  "client/modules/dialog-events.js",
  "client/modules/dialog-pm.js",
])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogSocialSandbox,
    { filename: sourcePath },
  );
const socialCommands = [];
const socialFlags = [];
const socialDialogCalls = [];
const socialDialog = {
  contentElement: createDialogJianghuNode(),
  footerElement: createDialogJianghuNode(),
  title: (value) => socialDialogCalls.push(["title", value]),
  icon: (value) => socialDialogCalls.push(["icon", value]),
  footer: (value) => socialDialogCalls.push(["footer", value]),
};
let socialTimeFormatter = (value) => "时长:" + value;
const social = dialogSocialSandbox.window.WSMudClient.createModule(
  "dialog-social",
  {
    Dialog: socialDialog,
    jquery: () => createDialogJianghuNode(),
    SendCommand: (command) => socialCommands.push(command),
    ToolAction: { showFlag: (...args) => socialFlags.push(args) },
    ReceiveMessage: () => {},
    Process: { player: "captain" },
    getFormatTimeSpan: () => socialTimeFormatter,
  },
);
socialDialog.message = social.message;
socialDialog.relation = social.relation;
socialDialog.party = social.party;
socialDialog.team = social.team;
social.relation.element = createDialogJianghuNode();
social.party.element = createDialogJianghuNode();
social.team.element = createDialogJianghuNode();
social.message.show();
social.relation.inner_show();
social.party.inner_show();
social.team.inner_show();
social.relation.onData({ fls: [["家人", "family-id", "采药", 123]] });
assert(
  socialCommands.join("|") === "message|relation|party load|team" &&
    social.relation.element.html().includes("时长:123") &&
    social.message !== social.relation &&
    social.party !== social.team,
  "社交四对象身份、关系时长 getter 或 relation/party/team 命令发生变化",
);
social.team.onData({
  items: [
    { id: "captain", name: "队长" },
    { id: "member", name: "队员" },
  ],
});
social.team.onData({ remove: "member" });
assert(
  social.team.items.length === 1 && social.team.isCap === true,
  "队伍列表原地更新、队长识别或成员移除发生变化",
);
const eventsCommands = [];
const eventFlags = [];
const eventsDialog = {
  contentElement: createDialogJianghuNode(),
  title: () => {},
  icon: () => {},
  footer: () => {},
};
const events = dialogSocialSandbox.window.WSMudClient.createModule(
  "dialog-events",
  {
    Dialog: eventsDialog,
    jquery: () => createDialogJianghuNode(),
    SendCommand: (command) => eventsCommands.push(command),
    ToolAction: { showFlag: (...args) => eventFlags.push(args) },
  },
).events;
events.show();
events.onData({ notice: true });
events.onData({ finish: true });
events.onData({
  items: [["event-1", "活动标题", "活动描述", 2, Date.now() + 60000, "领取"]],
});
assert(
  eventsCommands.join("|") === "events" &&
    events.unRead === 0 &&
    eventFlags.at(-1)[0] === "events" &&
    events.element.html().includes("cmd='events event-1'") &&
    events.element.html().includes("活动标题"),
  "活动命令或未读增减语义发生变化",
);
let pmNow = 1000;
const pmIntervals = [];
const pmClears = [];
const pmDialog = { pm: null };
const pm = dialogSocialSandbox.window.WSMudClient.createModule("dialog-pm", {
  Dialog: pmDialog,
  jquery: () => createDialogJianghuNode(),
  SendCommand: () => {},
  getMoneyToStr: () => (value) => "金:" + value,
  now: () => pmNow,
  timers: {
    setInterval: (callback, delay) => {
      pmIntervals.push([callback, delay]);
      return pmIntervals.length;
    },
    clearInterval: (timer) => pmClears.push(timer),
  },
}).pm;
pmDialog.pm = pm;
const firstPmHtml = pm.create_item(["auction", "宝物", 9, 5000]);
pmNow = 2000;
const secondPmHtml = pm.create_item(["auction", "宝物", 9, 5000]);
pmNow = 3000;
const resetPmDeadline = pm.get_countdown_deadline(
  ["auction", "宝物", 9, 5000],
  true,
);
pm.start_countdown();
pm.start_countdown();
assert(
  firstPmHtml.includes("金:9") &&
    firstPmHtml.includes("data-end-time='6000'") &&
    secondPmHtml.includes("data-end-time='6000'") &&
    resetPmDeadline === 8000 &&
    pmIntervals.length === 2 &&
    pmIntervals.every((entry) => entry[1] === 1000) &&
    pmClears[0] === 1,
  "拍卖绝对截止时间、动态金额格式或倒计时器替换发生变化",
);
pm.element = createDialogJianghuNode();
pm.isShow = true;
pm.close();
assert(
  pmClears.join("|") === "1|2" &&
    pm.countdownTimer === null &&
    pm.element === null &&
    pm.isShow === false,
  "拍卖关闭时未清理倒计时、元素或显示状态",
);
const dialogExtensionsSandbox = { window: {}, unsafeWindow: null };
dialogExtensionsSandbox.window.window = dialogExtensionsSandbox.window;
dialogExtensionsSandbox.unsafeWindow = dialogExtensionsSandbox.window;
for (const sourcePath of [
  "runtime/page-settings-sync.js",
  "client/core.js",
  "client/modules/dialog-extensions.js",
])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    dialogExtensionsSandbox,
    { filename: sourcePath },
  );
let extensionScriptReads = 0;
const extensionScriptRuns = [];
const extensionScript = {
  run: (command) => extensionScriptRuns.push(command),
  helper: {},
};
const extensionStorageWrites = [];
const extensionProcess = { player: "role-a", state: () => {} };
let extensionCombatRefreshes = 0;
const extensionDialog = {};
const dialogExtensions =
  dialogExtensionsSandbox.window.WSMudClient.createModule(
    "dialog-extensions",
    {
      getDialog: () => extensionDialog,
      getJQuery: () => () => createDialogJianghuNode(),
      getProcess: () => extensionProcess,
      getReceiveMessage: () => () => {},
      getCombat: () => ({
        refActions: () => {
          extensionCombatRefreshes += 1;
        },
      }),
      getScript: () => {
        extensionScriptReads += 1;
        return extensionScript;
      },
      getStorageUtil: () => ({
        getItem: () => undefined,
        setItem: (...args) => extensionStorageWrites.push(args),
      }),
      now: () => 1000,
      timers: { setTimeout: () => 1 },
    },
  ).extend;
extensionDialog.extend = dialogExtensions;
assert(
  extensionScriptReads === 0,
  "Dialog.extend 模块创建阶段提前读取了后置 SCRIPT",
);
dialogExtensions.setting = [
  {
    name: "动作扩展",
    type: "button",
    for: "action",
    content: "perform force.x",
    on: true,
  },
  {
    name: "消息触发",
    type: "trigger",
    for: "message",
    paras: "获得了(\\d+)",
    content: "msg-command",
    on: { "role-a": 1 },
  },
  {
    name: "数据触发",
    type: "trigger",
    for: "data",
    paras: "type(dialog)",
    content: "data-command",
    on: { "role-a": 1 },
  },
];
dialogExtensions.init_extend_group();
assert(
  dialogExtensions.setting[0].on["role-a"] === 1 &&
    dialogExtensions.groups.action[0].cmd === "#perform force.x" &&
    extensionScriptReads === 0,
  "Dialog.extend 旧 on:true 角色转换、命令 # 前缀或 SCRIPT 延迟读取异常",
);
dialogExtensions.save_extend(dialogExtensions.setting[0]);
dialogExtensions.trigger("你获得了12点潜能");
const extensionData = { type: "dialog" };
dialogExtensions.process(extensionData);
assert(
  extensionStorageWrites.at(-1)[0] === "extends" &&
    extensionCombatRefreshes === 1 &&
    extensionScriptRuns.join("|") === "#msg-command|#data-command" &&
    extensionScript.lAST_MATCHES[1] === "12" &&
    extensionScript.LAST_DATA === extensionData,
  "Dialog.extend 存储、动作刷新、消息/数据脚本或 LAST_* 兼容状态异常",
);
const extensionWritesBeforeInit = extensionStorageWrites.length;
dialogExtensions.setting = null;
dialogExtensions.init_extend();
assert(
  !dialogExtensions.setting.some((item) =>
    String(item.content).toLowerCase().startsWith("#wg "),
  ) && extensionStorageWrites.length === extensionWritesBeforeInit,
  "扩展命令初始化仍会自动添加或写回插件动作按钮",
);
assert(
  dialogSkillsModuleSource.includes("this.isShow = false;") &&
    dialogSkillsModuleSource.match(
      /currentDialog\(\)\.activateSkillsWindow\(\);/g,
    )?.length >= 2,
  "玩家技能页关闭后状态未复位，或重新打开时未恢复悬浮窗",
);
const dialogCloseSource = gameClientSource.match(
  /  close: function \(\) \{[\s\S]*?Process\.releaseItemPopupSecondary\(Dialog\.element\);\n  },/,
)?.[0];
assert(
  dialogCloseSource?.includes("Dialog.deactivateFloatingDialog();") &&
    dialogCloseSource.includes("Dialog.popLayer()"),
  "关闭通用悬浮窗时未清理窗口状态或返回父层",
);
const processDialogSource = gameClientSource.match(
  /  dialog: function \(_0x4ce96c\) \{[\s\S]*?\n  },\n  isDialogPanelPayload:/,
)?.[0];
assert(
  processDialogSource?.includes("floatingLayer.sourceItem == Dialog.curItem") &&
    processDialogSource.includes(
      "openedFloatingLayer && Dialog.show(_0x4ce96c.dialog);",
    ) &&
    processDialogSource.includes(
      "opensPanel = Process.isDialogPanelPayload(_0x4ce96c)",
    ) &&
    processDialogSource.includes("!opensPanel && floatingLayer") &&
    processDialogSource.includes("if (floatingLayer.superseded) return;") &&
    processDialogSource.includes("itemPopupSecondary &&\n      opensPanel"),
  "服务器返回的次级面板未校验来源层，或未创建新悬浮层",
);
assert(
  detailPopupPolicySource.includes(
    "/^(?:dc\\s+\\S+\\s+)?checkobj\\s+(\\S+)\\s+from\\s+(\\S+)$/",
  ) &&
    gameClientSource.includes(
      "Dialog.list.find_item(\n          Number(sourceObject.attr(\"otype\"))",
    ) &&
    gameClientSource.includes("Dialog.consumeLayerRequest();"),
  "商店、仓库等容器中的物品查看未统一进入详情悬浮层",
);
const dialogPanelClassifierSource = gameClientSource.match(
  /  isDialogPanelPayload: function \(data\) \{[\s\S]*?\n  },/,
)?.[0];
assert(dialogPanelClassifierSource, "无法读取对话协议载荷分类逻辑");
const detailPopupPolicyModule = { exports: {} };
runInNewContext(detailPopupPolicySource, {
  module: detailPopupPolicyModule,
  exports: detailPopupPolicyModule.exports,
});
const dialogPanelClassifierSandbox = {
  DetailPopupPolicy: detailPopupPolicyModule.exports,
};
runInNewContext(
  "classifier = " +
    dialogPanelClassifierSource
      .replace(/^  isDialogPanelPayload: /, "")
      .replace(/,$/, "") +
    `; fullPack = classifier({ dialog: "pack", items: [] });` +
    `; packMutation = classifier({ dialog: "pack", id: "x", name: "物品", count: 1 });` +
    `; packDetail = classifier({ dialog: "pack", id: "x", desc: "详情" });` +
    `; fullSkills = classifier({ dialog: "skills", items: [] });` +
    `; skillMutation = classifier({ dialog: "skills", id: "force", level: 501 });` +
    `; skillDetail = classifier({ dialog: "skills", id: "force", desc: "详情" });` +
    `; taskPanel = classifier({ dialog: "tasks", items: [] });`,
  dialogPanelClassifierSandbox,
);
assert(
  dialogPanelClassifierSandbox.fullPack === true &&
    dialogPanelClassifierSandbox.packMutation === false &&
    dialogPanelClassifierSandbox.packDetail === false &&
    dialogPanelClassifierSandbox.fullSkills === true &&
    dialogPanelClassifierSandbox.skillMutation === false &&
    dialogPanelClassifierSandbox.skillDetail === false &&
    dialogPanelClassifierSandbox.taskPanel === true,
  "背包或技能的完整面板、详情和增量更新未按协议语义正确分类",
);
const routeMethodsSource = mapModuleSource.match(
  /  BuildRouteGraph: function [\s\S]*?\n  },\n  FindRoute: function [\s\S]*?\n  },(?=\n  SetRouteStatus:)/,
)?.[0];
assert(routeMethodsSource, "无法读取大地图寻路算法");
const routeSandbox = {};
runInNewContext(`routeApi = ({${routeMethodsSource}});`, routeSandbox);
const routeRooms = [
  { id: "area/a", n: "甲地", p: [0, 0], exits: ["e", "s"] },
  { id: "area/b", n: "乙地", p: [1, 0], exits: ["e1d"] },
  { id: "area/c", n: "丙地", p: [2, 0], exits: [] },
  { id: "area/d", n: "丁地", p: [0, 1], exits: [] },
];
const routeGraph = routeSandbox.routeApi.BuildRouteGraph(routeRooms);
const forwardRoute = routeSandbox.routeApi.FindRoute(
  routeGraph,
  "area/a",
  "area/c",
);
assert(
  forwardRoute?.length === 2 &&
    forwardRoute[0].heading === "east" &&
    forwardRoute[1].elevated === true,
  "大地图未按几何连线生成最短路径或未保留高低通道信息",
);
const reverseRoute = routeSandbox.routeApi.FindRoute(
  routeGraph,
  "area/c",
  "area/a",
);
assert(
  reverseRoute?.length === 2 && reverseRoute[0].heading === "west",
  "大地图未为可逆道路生成返程路径",
);
const specialGraph = routeSandbox.routeApi.BuildRouteGraph([
  { id: "special/a", n: "入口", p: [0, 0], exits: ["u"] },
  { id: "special/b", n: "出口", p: [0, -1], exits: [] },
]);
assert(
  specialGraph.hasSpecial &&
    routeSandbox.routeApi.FindRoute(specialGraph, "special/a", "special/b") ===
      null,
  "特殊通道被错误纳入自动寻路",
);
const ambiguousGraph = routeSandbox.routeApi.BuildRouteGraph([
  { id: "copy/a", n: "甲", p: [0, 0], exits: [] },
  { id: "copy/b", n: "乙", p: [0, 0], exits: [] },
]);
assert(ambiguousGraph.invalid, "重叠或动态地图未被判定为不可自动寻路");
assert(
  !mapRuntimeSource.includes('$(".map-panel").slideDown("fast")') &&
    !mapRuntimeSource.includes('$(".map-panel").slideUp("fast")'),
  "地图仍通过文档流展开或收起",
);
assert(
  !gameClientSource.includes("Setting.item_firstme &&"),
  "当前玩家仍受可选设置影响，不能保证始终置顶",
);
assert(
  !gameClientSource.includes("item_firstme: 0") &&
    !gameClientSource.includes('case "item_firstme"') &&
    readFileSync(join(extensionRoot, "client/modules/settings.js"), "utf8").includes(
      "delete values.item_firstme",
    ),
  "已废弃的玩家置顶设置仍有入口或执行逻辑",
);
assert(
  roomRendererModuleSource.includes('<span class="item-vital-values">') &&
    roomRendererModuleSource.indexOf('class="progress hp"') <
      roomRendererModuleSource.indexOf('class="progress mp"') &&
    roomRendererModuleSource.indexOf('class="item-vital-values"') <
      roomRendererModuleSource.indexOf("<span class='item-status-bar'>"),
  "气血/内力数值或上下堆叠的进度条结构异常",
);
const statusNumberMethodMatch = roomRendererModuleSource.match(
  /function formatStatusNumber\(value\) \{([\s\S]*?)\n    \}/,
);
assert(statusNumberMethodMatch, "无法读取状态数值格式化逻辑");
const formatStatusNumber = runInNewContext(
  `(function formatStatusNumber(value) {${statusNumberMethodMatch[1]}\n    })`,
);
assert(
  formatStatusNumber(1234567) === "1,234,567",
  "状态数值未使用半角逗号千分位",
);
const isPopupDetailCommand = detailPopupPolicy.isPopupDetailCommand;
for (const detailCommand of [
  "checkskill force",
  "checkskill force master_1",
  "checkskill force help",
  "look3 1 of fb_0",
  "checkobj sword_1 from item",
  "dc npc_1 checkobj sword_1 from eq",
  "stats top wudang 1",
  "stats score 2",
  "stats exp 7",
  "stats mp shaolin 9",
  "stats money none 12",
]) {
  assert(isPopupDetailCommand(detailCommand), `未识别详情命令: ${detailCommand}`);
}
assert(
  !isPopupDetailCommand("look npc_1") &&
    !isPopupDetailCommand("look3 playerid") &&
    !isPopupDetailCommand("use pill_1"),
  "纯文本 look、玩家 look3 或使用物品仍被当作结构化详情响应等待",
);
assert(
  detailPopupPolicy.describePopupDetailCommand("checkskill force help").kind ===
    "text-detail" &&
    detailPopupPolicy.describePopupDetailCommand("checkskill force").expectedDialog ===
      "skills",
  "江湖技能帮助仍被误判为师父技能详情请求",
);
const detailQueueStart = gameClientSource.indexOf(
  "detailPopupRequestTimeout: 8000,",
);
const detailQueueEnd = gameClientSource.indexOf(
  "  createPackItemPopupCommands:",
  detailQueueStart,
);
assert(
  detailQueueStart > -1 && detailQueueEnd > detailQueueStart,
  "无法读取详情请求队列逻辑",
);
const detailQueueSandbox = {
  Date,
  String,
  DetailPopupPolicy: detailPopupPolicy,
};
runInNewContext(
  `Process = {${gameClientSource.slice(detailQueueStart, detailQueueEnd)}}`,
  detailQueueSandbox,
);
const detailQueue = detailQueueSandbox.Process;
const detailSurface = {};
const firstItemRequest = {
  kind: "pack-item",
  id: "item-a",
  sourceSurfaceElement: detailSurface,
  createdAt: Date.now(),
};
const secondItemRequest = {
  kind: "pack-item",
  id: "item-b",
  sourceSurfaceElement: detailSurface,
  createdAt: Date.now(),
};
detailQueue.queueDetailPopupRequest(firstItemRequest);
detailQueue.queueDetailPopupRequest(secondItemRequest);
assert(
  firstItemRequest.superseded === true &&
    detailQueue.takeDetailPopupRequest({
      dialog: "pack",
      id: "item-a",
      desc: "旧物品",
    }) === firstItemRequest &&
    detailQueue.takeDetailPopupRequest({
      dialog: "pack",
      id: "unrelated",
      desc: "无关物品",
    }) === null &&
    detailQueue.takeDetailPopupRequest({
      dialog: "pack",
      id: "item-b",
      desc: "新物品",
    }) === secondItemRequest &&
    !secondItemRequest.superseded,
  "快速连续点击时，详情响应未按 ID 关联或旧请求未被降级",
);
const firstRankingRequest = {
  kind: "ranking-character",
  sourceSurfaceElement: detailSurface,
  createdAt: Date.now(),
};
const secondRankingRequest = {
  kind: "ranking-character",
  sourceSurfaceElement: detailSurface,
  createdAt: Date.now(),
};
detailQueue.queueDetailPopupRequest(firstRankingRequest);
detailQueue.queueDetailPopupRequest(secondRankingRequest);
assert(
  detailQueue.takeDetailPopupRequest({ type: "item", desc: "旧排行" }) ===
    firstRankingRequest &&
    firstRankingRequest.superseded === true &&
    detailQueue.takeDetailPopupRequest({ type: "item", desc: "新排行" }) ===
      secondRankingRequest &&
    !secondRankingRequest.superseded,
  "无响应 ID 的排行榜详情未按 WebSocket 响应顺序关联",
);
for (let index = 0; index < 15; index++)
  detailQueue.queueDetailPopupRequest({
    kind: "skill",
    id: "skill-" + index,
    sourceSurfaceElement: {},
    createdAt: Date.now(),
  });
assert(
  detailQueue.detailPopupRequests.length === 12,
  "详情请求队列未保持有界",
);
detailQueue.cancelPendingDetailPopups();
assert(
  detailQueue.detailPopupRequests.length === 0,
  "关闭弹窗或切换场景对象后仍残留详情请求",
);
const ownSkillRequest = {
  kind: "skill",
  id: "force",
  expectedDialog: "skills",
  sourceSurfaceElement: {},
  createdAt: Date.now(),
};
const masterSkillRequest = {
  kind: "skill",
  id: "force",
  expectedDialog: "master",
  sourceSurfaceElement: {},
  createdAt: Date.now(),
};
assert(
  detailQueue.matchesDetailPopupData(ownSkillRequest, {
    dialog: "skills",
    id: "force",
    desc: "自己的技能",
  }) &&
    !detailQueue.matchesDetailPopupData(ownSkillRequest, {
      dialog: "master",
      id: "force",
      desc: "师父技能",
    }) &&
    detailQueue.matchesDetailPopupData(masterSkillRequest, {
      dialog: "master",
      id: "force",
      desc: "师父技能",
    }),
  "技能详情响应未按自己的技能/师父技能来源隔离",
);
assert(
  gameClientSource.includes("cancelDetailPopupRequestsForSurface") &&
    detailPopupPolicySource.includes("data.dialog == pending.expectedDialog"),
  "非详情操作未取消当前界面的详情等待，或技能详情缺少来源对话框约束",
);
assert(
  !detailQueue.matchesDetailPopupData(ownSkillRequest, {
    dialog: "skills",
    id: "force",
    level: 120,
    exp: 40,
  }) &&
    !detailQueue.matchesDetailPopupData(ownSkillRequest, {
      dialog: "skills",
      desc: "没有技能 id 的详情",
    }),
  "技能升级或无 ID 的技能协议仍能打开技能悬浮窗",
);
assert(
  gameClientSource.includes(
    "if (!keepItemPopupOpen && Process.cancelPendingDetailPopups)",
  ) &&
    commandDispatchSource.includes("Process.cancelPendingDetailPopups();"),
  "使用物品等非详情命令未全局清理历史详情请求",
);
assert(
  gameClientSource.includes(
    "if (!isDetailCommand && Process.cancelPendingDetailPopups)",
  ),
  "确认、使用物品等前缀命令未在分派入口清理历史详情请求",
);
assert(
  commandDispatchSource.includes(
    "} else {\n    if (Process.cancelPendingDetailPopups) Process.cancelPendingDetailPopups();",
  ),
  "无命令点击未清理历史详情请求",
);
const characterItemMethodMatch = gameClientSource.match(
  /isCharacterItem: (function[\s\S]*?\n  \}),\n  isPopupDetailCommand:/,
);
assert(characterItemMethodMatch, "无法读取人物弹窗识别逻辑");
const isCharacterItem = runInNewContext(`(${characterItemMethodMatch[1]})`);
assert(
  isCharacterItem({ id: "player", p: true, hp: 100, max_hp: 100 }),
  "其他玩家未被识别为人物弹窗目标",
);
assert(
  isCharacterItem({ id: "self", p: true, hp: 0, max_hp: 100 }),
  "自己或倒地人物未被识别为人物弹窗目标",
);
assert(
  isCharacterItem({ id: "npc", max_hp: 100 }),
  "NPC 未被识别为人物弹窗目标",
);
assert(
  !isCharacterItem({ id: "stone", name: "石头" }),
  "普通场景物品被错误识别为人物",
);
assert(
  !isPopupDetailCommand("stats weapon 1") &&
    !isPopupDetailCommand("stats top wudang"),
  "非人物详情的排行榜请求被错误识别为弹窗请求",
);

const automationLegacySource = readFileSync(
  join(extensionRoot, "features/automation-suite.js"),
  "utf8",
);
assert(
  automationLegacySource.includes(
    "WG.resetMasterTaskAutomation &&\n                    WG.resetMasterTaskAutomation()",
  ) &&
    automationLegacySource.includes(
      "WG.resetActivityAutomation &&\n                    WG.resetActivityAutomation()",
    ) &&
    automationLegacySource.includes(
      "WG.resetDailyWorkflows && WG.resetDailyWorkflows()",
    ) &&
    automationLegacySource.includes(
      "WG.resetYaotaAutomation && WG.resetYaotaAutomation()",
    ) &&
    automationLegacySource.includes(
      "WG.resetLegacyStatusMonitors &&\n                    WG.resetLegacyStatusMonitors()",
    ),
  "WebSocket 断线入口未同步重置师门、活动、日常、妖塔或旧状态监控",
);
assert(
  !automationLegacySource.includes("oneKeyDaily: async function") &&
    !automationLegacySource.includes("oneKeyQA: async function") &&
    !automationLegacySource.includes("oneKeySD: function"),
  "一键日常、请安或扫荡实现仍残留在聚合兼容源码",
);
assert(
  !automationLegacySource.includes("ytjk_func: function") &&
    !automationLegacySource.includes("ztjk_hook: void 0") &&
    !automationLegacySource.includes("ztjk_func: function"),
  "妖塔或旧状态监控运行时仍残留在聚合兼容源码",
);
const triggerSystemSource = readFileSync(
  join(extensionRoot, "features/trigger-system.js"),
  "utf8",
);
const triggerUiSource = readFileSync(
  join(extensionRoot, "features/plugin/trigger-ui.js"),
  "utf8",
);
const automationStaticDataSource = readFileSync(
  join(extensionRoot, "features/plugin/automation-static-data.js"),
  "utf8",
);
const customWorkflowsSource = readFileSync(
  join(extensionRoot, "features/plugin/custom-workflows.js"),
  "utf8",
);
const packDataCodecSource = readFileSync(
  join(extensionRoot, "features/plugin/pack-data-codec.js"),
  "utf8",
);
const raidCompilerSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-compiler.js"),
  "utf8",
);
const raidStorageSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-storage.js"),
  "utf8",
);
const raidAssertSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-assert.js"),
  "utf8",
);
const raidDungeonsSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-dungeons.js"),
  "utf8",
);
const raidShortcutsSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-shortcuts.js"),
  "utf8",
);
const raidServerSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-server.js"),
  "utf8",
);
const raidObserversSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-observers.js"),
  "utf8",
);
const raidRoomSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-room.js"),
  "utf8",
);
const raidExecutionRuntimeSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-execution-runtime.js"),
  "utf8",
);
const automationProtocolStateSource = readFileSync(
  join(extensionRoot, "features/plugin/automation-protocol-state.js"),
  "utf8",
);
const automationMessageMenuSource = readFileSync(
  join(extensionRoot, "features/plugin/automation-message-menu.js"),
  "utf8",
);
const automationKeyboardSource = readFileSync(
  join(extensionRoot, "features/plugin/automation-keyboard.js"),
  "utf8",
);
const raidTHIslandSource = readFileSync(
  join(extensionRoot, "features/plugin/raid-flow-th-island.js"),
  "utf8",
);
assert(
  (triggerSystemSource.match(/add_hook\("login", onLogin\)/g) || []).length ===
    1 &&
    triggerSystemSource.includes("null == initRetryTimer") &&
    triggerSystemSource.includes("triggerCenter.reload()") &&
    triggerSystemSource.includes("monitorLifecycle.resetForRole()") &&
    triggerUiSource.includes('registerService("trigger-ui"') &&
    /registerService\(\s*["']automation-static-data["']/.test(
      automationStaticDataSource,
    ) &&
    /registerFeature\(\s*["']custom-workflows["']/.test(
      customWorkflowsSource,
    ) &&
    /registerService\(\s*["']pack-data-codec["']/.test(packDataCodecSource) &&
    /registerService\(\s*["']raid-flow-compiler["']/.test(
      raidCompilerSource,
    ) &&
    /registerService\(\s*["']raid-flow-storage["']/.test(raidStorageSource) &&
    /registerService\(\s*["']raid-flow-assert["']/.test(raidAssertSource) &&
    /registerService\(\s*["']raid-flow-dungeons["']/.test(
      raidDungeonsSource,
    ) &&
    /registerService\(\s*["']raid-flow-shortcuts["']/.test(
      raidShortcutsSource,
    ) &&
    /registerService\(\s*["']raid-flow-server["']/.test(raidServerSource) &&
    /registerService\(\s*["']raid-flow-observers["']/.test(
      raidObserversSource,
    ) &&
    /registerService\(\s*["']raid-flow-room["']/.test(raidRoomSource) &&
    /registerService\(\s*["']raid-flow-execution-runtime["']/.test(
      raidExecutionRuntimeSource,
    ) &&
    /registerService\(\s*["']automation-protocol-state["']/.test(
      automationProtocolStateSource,
    ) &&
    /registerFeature\(\s*["']automation-message-menu["']/.test(
      automationMessageMenuSource,
    ) &&
    /registerService\(\s*["']automation-keyboard["']/.test(
      automationKeyboardSource,
    ) &&
    /registerService\(\s*["']raid-flow-th-island["']/.test(
      raidTHIslandSource,
    ) &&
    !triggerSystemSource.includes("breakText"),
  "Trigger 初始化未保持单一登录 Hook、单一重试计时器或角色重置流程",
);
assert(
  automationLegacySource.includes(
    'createService(\n      "automation-static-data"',
  ) &&
    !automationLegacySource.includes("var needfind = {") &&
    !automationLegacySource.includes("var sm_array = {") &&
    (automationLegacySource.match(
      /syncAutomationStaticDataFromService\(\);/g,
    ) || []).length === 3 &&
    (automationLegacySource.match(
      /syncAutomationStaticDataToService\(\);/g,
    ) || []).length === 3 &&
    (automationLegacySource.match(/finally \{/g) || []).length >= 3 &&
    automationLegacySource.includes("function reconcileAutomationStaticData(") &&
    automationLegacySource.includes("automationStaticDataSnapshot"),
  "自动化静态数据桥未保持四个词法别名或三个 direct eval 的双向同步",
);
assert(
  automationLegacySource.includes("executeLegacyScript: function (source)") &&
    automationLegacySource.includes("return eval(source)") &&
    automationLegacySource.includes("WG.customWorkflows.zmlfire") &&
    automationLegacySource.includes("WG.customWorkflows.zmlztjk") &&
    automationLegacySource.includes("WG.customWorkflows.zml_edit") &&
    automationLegacySource.includes("WG.customWorkflows.zml_showp") &&
    !automationLegacySource.includes('messageAppend("运行" + zml.name, 2)') &&
    !automationLegacySource.includes("new Vue({\n            el: \"#zmldialog\"") &&
    automationLegacySource.includes('"custom-workflows"'),
  "自定义流程模块、direct eval 兼容桥或启动 feature 清单异常",
);
assert(
  automationLegacySource.includes(
    'createService(\n      "automation-protocol-state"',
  ) &&
    automationLegacySource.includes("ProtocolState.init()") &&
    !automationLegacySource.includes('case "clearDistime":') &&
    automationProtocolStateSource.includes('case "login":') &&
    automationProtocolStateSource.includes('case "clearDistime":') &&
    automationProtocolStateSource.indexOf('case "clearDistime":') <
      automationProtocolStateSource.indexOf('case "dispfm":') &&
    automationProtocolStateSource.includes("timers.setTimeout") &&
    automationProtocolStateSource.includes("timers.clearTimeout"),
  "自动化协议状态服务、原位薄桥、clearDistime 落入语义或显式计时器异常",
);
assert(
  automationLegacySource.includes('"automation-message-menu"') &&
    automationLegacySource.includes(
      "automationMessageMenu.receiveMessage(event)",
    ) &&
    automationLegacySource.includes(
      "automationMessageMenu.createSomeMenu()",
    ) &&
    automationLegacySource.includes("function executeLegacyScript(source)") &&
    automationLegacySource.includes("return eval(source)") &&
    automationLegacySource.includes("syncAutomationStaticDataToService()") &&
    !automationLegacySource.includes('if ("挖矿" === data') &&
    automationMessageMenuSource.includes('WG.SendCmd("$daily")') &&
    automationMessageMenuSource.includes('WG.SendCmd("stopstate")') &&
    automationMessageMenuSource.includes("executeLegacyScript(jscode.join"),
  "外部消息/右键菜单模块、原位 direct eval 薄桥或旧命令异常",
);
assert(
  automationLegacySource.includes(
    'KEY = unsafeWindow.WSMudPlugin.createService("automation-keyboard"',
  ) &&
    !automationLegacySource.includes("KEY = {\n") &&
    automationLegacySource.includes("getKeyApi: function ()") &&
    automationLegacySource.includes("return KEY;") &&
    automationKeyboardSource.includes("let initialized = false") &&
    automationKeyboardSource.includes("new Proxy(keyTarget") &&
    automationKeyboardSource.includes("getKeyApi()") &&
    automationKeyboardSource.includes("setExitState(exit1, exit2, exit3)") &&
    automationKeyboardSource.includes('$(documentRef).on("keydown", this.e)') &&
    automationKeyboardSource.includes("}, 500)") &&
    automationKeyboardSource.includes("getButtonMode()") &&
    automationKeyboardSource.includes("getG()") &&
    automationKeyboardSource.includes("getWG()"),
  "自动化键盘服务、词法 KEY 薄桥、单次初始化或动态依赖异常",
);
const automationMessageEvalFunction = automationLegacySource.match(
  /function executeLegacyScript\(source\) \{[\s\S]*?\n    \}/,
)?.[0];
assert(
  automationMessageEvalFunction,
  "未找到外部消息 #js 的原位 direct-eval 函数",
);
const automationMessageEvalSandbox = {};
runInNewContext(
  `
    let lexicalValue = 1;
    let syncBefore = 0;
    let syncAfter = 0;
    function syncAutomationStaticDataFromService() { syncBefore += 1; }
    function syncAutomationStaticDataToService() { syncAfter += 1; }
    ${automationMessageEvalFunction}
    this.successValue = executeLegacyScript("lexicalValue = 7; lexicalValue");
    try {
      executeLegacyScript('lexicalValue = 9; throw new Error("expected")');
    } catch (error) {
      this.thrownMessage = error.message;
    }
    this.lexicalValue = lexicalValue;
    this.syncBefore = syncBefore;
    this.syncAfter = syncAfter;
  `,
  automationMessageEvalSandbox,
);
assert(
  automationMessageEvalSandbox.successValue === 7 &&
    automationMessageEvalSandbox.lexicalValue === 9 &&
    automationMessageEvalSandbox.thrownMessage === "expected" &&
    automationMessageEvalSandbox.syncBefore === 2 &&
    automationMessageEvalSandbox.syncAfter === 2,
  "99 原位 #js 未保持词法 direct eval、异常传播或 finally 双向同步",
);
assert(
  automationLegacySource.includes(
    'PackDataCodec = unsafeWindow.WSMudPlugin.createService("pack-data-codec"',
  ) &&
    automationLegacySource.includes(
      "deserializePackData: PackDataCodec.deserializePackData",
    ) &&
    !automationLegacySource.includes("deserializePackData(e) {") &&
    automationLegacySource.includes("getItemKeys: () => itemKeys") &&
    automationLegacySource.includes("getStoreKeys: () => storeKeys"),
  "背包协议解码服务桥或动态字段表兼容 getter 异常",
);
const pluginIncrementPaths = pluginModuleSources.slice(1);
const pluginIncrementSource = pluginIncrementPaths
  .map((resourcePath) => readFileSync(join(extensionRoot, resourcePath), "utf8"))
  .join("\n");
const pluginLogicSource = pluginIncrementPaths
  .filter((resourcePath) => resourcePath !== "features/plugin/ui-templates.js")
  .map((resourcePath) => readFileSync(join(extensionRoot, resourcePath), "utf8"))
  .join("\n");
const pluginEnhancementStyles = readFileSync(
  join(extensionRoot, "features/plugin/plugin-enhancements.css"),
  "utf8",
);
const automationSource =
  pluginIncrementSource +
  "\n" +
  pluginEnhancementStyles +
  "\n" +
  automationLegacySource;
const pluginCoreSource = readFileSync(
  join(extensionRoot, "features/plugin/core.js"),
  "utf8",
);
for (const leakedLegacyBinding of [
  "roleid",
  "zdyskilllist",
  "unauto_pfm",
  "blackpfm",
  "packData",
  "pgoods",
  "equip",
  "inzdy_btn",
  "CanUse",
]) {
  assert(
    !new RegExp(`\\b${leakedLegacyBinding}\\b`).test(pluginLogicSource),
    `迁移模块仍直接引用旧闭包变量: ${leakedLegacyBinding}`,
  );
}
const uiTemplatesSource = readFileSync(
  join(extensionRoot, "features/plugin/ui-templates.js"),
  "utf8",
);
for (const directTemplateLegacyAccess of [
  "for (t of zdy_btnlist)",
  "lock_list.indexOf",
  "ToRaid.existAutoDungeon",
]) {
  assert(
    !uiTemplatesSource.includes(directTemplateLegacyAccess),
    `UI 模板服务仍直接读取旧闭包: ${directTemplateLegacyAccess}`,
  );
}
const commandEngineSource = readFileSync(
  join(extensionRoot, "features/plugin/command-engine.js"),
  "utf8",
);
for (const directCommandLegacyAccess of [
  "for (let e = 0; e < roomData.length",
  "for (o of packData)",
  'GM_getValue(roleid + "_zml"',
  "ToRaid.perform",
  "FakerTTS.playtts",
  "new MusicBox(",
]) {
  assert(
    !commandEngineSource.includes(directCommandLegacyAccess),
    `命令引擎仍直接读取旧闭包: ${directCommandLegacyAccess}`,
  );
}
assert(
  !pluginIncrementSource.includes("0 == timer") &&
    !pluginIncrementSource.includes("timer = setInterval(WG.zdwk"),
  "智能挂机模块仍直接读写旧闭包计时器",
);
assert(
  pluginCoreSource.includes('"plugin-enhancements.css"') &&
    existsSync(join(extensionRoot, "features/plugin/plugin-enhancements.css")),
  "插件增量样式缺少模块化加载入口或资源文件",
);
const pluginSettingsSource =
  automationSource;
for (const pluginModuleContract of [
  "registerFeature",
  "installFeatures",
  'registerFeature("plugin-settings"',
  "Object.assign(WG",
]) {
  assert(
    (pluginCoreSource + pluginSettingsSource).includes(pluginModuleContract),
    `插件模块契约缺失: ${pluginModuleContract}`,
  );
}
let pluginPackData = [];
const pluginModuleSandbox = {
  window: {},
  document: {
    currentScript: null,
    querySelector: () => null,
    cookie: "",
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  GM_addStyle: () => {},
  GM_getValue: (_key, fallback) => fallback,
  GM_setValue: () => {},
  setTimeout,
  clearTimeout,
};
pluginModuleSandbox.$ = () => ({ after: () => {} });
pluginModuleSandbox.Vue = function Vue() {};
pluginModuleSandbox.Vue.observable = (value) => value;
pluginModuleSandbox.window.window = pluginModuleSandbox.window;
runInNewContext(
  "Array.prototype.baoremove = function (index) { this.splice(index, 1); };",
  pluginModuleSandbox,
);
for (const sourcePath of pluginModuleSources) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    pluginModuleSandbox,
    { filename: sourcePath },
  );
}
const keyboardDocument = {};
let keyboardDocumentBindings = 0;
let keyboardDocumentHandler = null;
let keyboardButtonMode = false;
let keyboardWG = null;
let keyboardG = null;
let activeAutomationKeyboard = null;
let keyboardExitState = null;
const keyboardClicks = [];
const keyboardTimers = [];
function keyboardJquery(selector) {
  const node = {
    length: selector === ".room_items div.room-item" ? 1 : 0,
    html: () => node,
    on: (eventName, handler) => {
      if (selector === keyboardDocument && eventName === "keydown") {
        keyboardDocumentBindings += 1;
        keyboardDocumentHandler = handler;
      }
      return node;
    },
    is: () => false,
    not: () => node,
    filter: () => node,
    attr: (name) => (name === "style" ? "display: block" : undefined),
    val: () => "",
    css: () => node,
    click: () => {
      keyboardClicks.push(selector);
      return node;
    },
  };
  return node;
}
const keyboardCommands = [];
const keyboardDefaultCalls = [];
const keyboardCustomCalls = [];
keyboardWG = {
  Send: (command) => keyboardCommands.push(command),
  zdybtnfunc: (index) => keyboardCustomCalls.push(index),
  go_home: () => keyboardDefaultCalls.push("home"),
  go_wumiao: () => keyboardDefaultCalls.push("wumiao"),
  kill_all: () => keyboardDefaultCalls.push("kill"),
  get_all: () => keyboardDefaultCalls.push("get"),
  sell_all: () => keyboardDefaultCalls.push("sell"),
  zdwk: () => keyboardDefaultCalls.push("work"),
};
keyboardG = { exits: new Map([["eastup", true]]) };
const automationKeyboard =
  pluginModuleSandbox.window.WSMudPlugin.createService("automation-keyboard", {
    getWG: () => keyboardWG,
    getG: () => keyboardG,
    getButtonMode: () => keyboardButtonMode,
    getJquery: () => keyboardJquery,
    getDocument: () => keyboardDocument,
    getWindow: () => ({}),
    getKeyApi: () => activeAutomationKeyboard,
    setExitState: (...values) => {
      keyboardExitState = values;
    },
    getTimers: () => ({
      setTimeout: (callback, delay) => {
        keyboardTimers.push([callback, delay]);
        return keyboardTimers.length;
      },
    }),
  });
activeAutomationKeyboard = automationKeyboard;
automationKeyboard.init();
automationKeyboard.init();
const findAutomationKey = (keyCode) =>
  automationKeyboard.keys.find((entry) => entry.key === keyCode).callback;
findAutomationKey(81)();
keyboardButtonMode = true;
findAutomationKey(81)();
findAutomationKey(39)();
automationKeyboard.dialog_confirm();
assert(
  automationKeyboard.keys.length === 61 &&
    automationKeyboard.keys.map((entry) => entry.key).join("|") ===
      [
        27, 192, 32, 83, 13, 65, 67, 66, 76, 79, 74, 75, 73, 85, 80, 188,
        81, 87, 69, 82, 84, 89, 9, 102, 39, 100, 37, 98, 40, 101, 613, 104,
        38, 99, 97, 105, 103, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 45,
        61, 561, 562, 563, 564, 565, 566, 1073, 1074, 1075, 1076, 1077,
        1078,
      ].join("|") &&
    keyboardDocumentBindings === 1 &&
    keyboardDefaultCalls.join("|") === "home" &&
    keyboardCustomCalls.join("|") === "0" &&
    keyboardCommands.join("|") === "go eastup" &&
    keyboardExitState.join("|") === "|true|" &&
    keyboardTimers.length === 1 &&
    keyboardTimers[0][1] === 500 &&
    keyboardClicks.includes(".dialog-btn.btn-ok"),
  "自动化快捷键数量、重复初始化、动态按钮/出口或确认延时发生变化",
);
keyboardTimers[0][0]();
assert(automationKeyboard.isallow === true, "快捷键确认节流未在 500ms 后恢复");
let reboundAutomationKeyCalls = 0;
activeAutomationKeyboard = {
  keys: [
    {
      key: 83,
      callback: () => {
        reboundAutomationKeyCalls += 1;
      },
    },
  ],
  chatModeKeyEvent: () => {},
};
keyboardDocumentHandler({
  keyCode: 83,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
});
assert(
  reboundAutomationKeyCalls === 1,
  "历史 direct eval 整体重绑词法 KEY 后，旧 document 监听未转发到新对象",
);
activeAutomationKeyboard = automationKeyboard;
const raidCompilerForExecution =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-compiler", {
    getFlowStore: () => null,
    appendMessage: () => {},
  });
const raidPrehandlerPriority = { ordinary: 50 };
const raidExecutorPriority = {
  compiler: 90,
  high: 30,
  ordinary: 20,
  low: 10,
};
let raidExecutionRuntime;
let raidExecutionRole = { isFree: () => true };
const raidExecutionCommands = [];
const raidExecutionRemovedHooks = [];
const raidWorkflowRunningStates = [];
let raidExecutionWG = {
  SendCmd: (command) => raidExecutionCommands.push(command),
  remove_hook: (hookIndex) => raidExecutionRemovedHooks.push(hookIndex),
};
raidExecutionRuntime =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "raid-flow-execution-runtime",
    {
      getMessage: () => ({ append: () => {}, cmdLog: () => {} }),
      getCompiler: () => raidCompilerForExecution,
      getSortInsert: () => raidCompilerForExecution.SortInsert,
      getCmdPrehandlerPriority: () => raidPrehandlerPriority,
      getCmdExecutorPriority: () => raidExecutorPriority,
      getCmdPrehandleCenter: () => raidExecutionRuntime.CmdPrehandleCenter,
      getCmdExecutor: () => raidExecutionRuntime.CmdExecutor,
      getCmdExecuteCenter: () => raidExecutionRuntime.CmdExecuteCenter,
      getPerformer: () => raidExecutionRuntime.Performer,
      getRole: () => raidExecutionRole,
      getWG: () => raidExecutionWG,
      getSystemTips: () => ({ rejectTimestamp: 0 }),
      getSystemCmdDelay: () => 1500,
      getSkillStateMachine: () => raidExecutionRuntime.SkillStateMachine,
      getUnpackSystemCmd: () => raidExecutionRuntime.UnpackSystemCmd,
      getAtCmdExecutor: () => raidExecutionRuntime.AtCmdExecutor,
      getUntilRoleFreePerformerPromise: () =>
        raidExecutionRuntime.UntilRoleFreePerformerPromise,
      getDungeonCatalog: () => ({ getSource: (name) => "flow:" + name }),
      getAncientCmdExecuter: () => raidExecutionRuntime.AncientCmdExecuter,
      updateVariable: () => {},
      setWorkflowRunning: (running) =>
        raidWorkflowRunningStates.push(running),
    },
  );
assert(
  raidExecutionRuntime.CmdPrehandlerPriority === raidPrehandlerPriority &&
    raidExecutionRuntime.CmdExecutorPriority === raidExecutorPriority,
  "Raid 执行运行时未保持两个优先级对象的词法身份",
);
const OriginalRaidPerformer = raidExecutionRuntime.Performer;
class ManagedPerformerProbe {
  constructor(name, source) {
    this._name = name;
    this.source = source;
  }
  name() {
    return this._name;
  }
  log(value) {
    this.logged = value;
  }
  start(callback) {
    this.callback = callback;
  }
  stop() {
    this.callback();
  }
}
raidExecutionRuntime.Performer = ManagedPerformerProbe;
const managedPerformer = raidExecutionRuntime.ManagedPerformerCenter.start(
  "自动副本-烟测",
  "flow-source",
);
assert(
  managedPerformer.name() === "自动副本-烟测" &&
    managedPerformer.logged === true &&
    raidExecutionRuntime.ManagedPerformerCenter.getAll()[0] ===
      managedPerformer &&
    raidWorkflowRunningStates.join("|") === "true",
  "Raid 托管执行器未登记自动副本或更新运行状态",
);
managedPerformer.stop();
assert(
  raidExecutionRuntime.ManagedPerformerCenter.getAll().length === 0 &&
    raidWorkflowRunningStates.join("|") === "true|false",
  "Raid 托管执行器完成后未注销流程或恢复运行状态",
);
raidExecutionRuntime.Performer = OriginalRaidPerformer;
const raidPrehandleCenter = raidExecutionRuntime.CmdPrehandleCenter.shared();
raidPrehandleCenter.addHandler(
  new raidExecutionRuntime.CmdPrehandler((_performer, command) => command + "L", 10),
);
raidPrehandleCenter.addHandler(
  new raidExecutionRuntime.CmdPrehandler((_performer, command) => command + "H", 100),
);
assert(
  raidExecutionRuntime.CmdPrehandleCenter.shared() === raidPrehandleCenter &&
    raidPrehandleCenter.handle({}, "") === "HL",
  "Raid 预处理中心单例身份或优先级顺序发生变化",
);
const raidExecutionOrder = [];
for (const [name, priority] of [
  ["low", 10],
  ["high", 30],
  ["ordinary", 20],
]) {
  raidExecutionRuntime.CmdExecuteCenter.addExecutor(
    new raidExecutionRuntime.CmdExecutor(
      (command) => command === name,
      () => raidExecutionOrder.push(name),
      priority,
    ),
  );
}
raidExecutionRuntime.CmdExecuteCenter.execute({}, "high");
assert(
  raidExecutionRuntime.CmdExecuteCenter._executors
    .map((executor) => executor.priority)
    .join("|") === "30|20|10" &&
    raidExecutionOrder.join("|") === "high" &&
    raidExecutionRuntime.UnpackSystemCmd("go east[3]") ===
      "go east;go east;go east",
  "Raid 执行器优先级、命令选择或系统命令展开发生变化",
);
raidExecutionRuntime.CmdExecuteCenter._executors.length = 0;
raidPrehandleCenter._handlers.length = 0;
const raidGetDungeonFlow =
  raidExecutionRuntime.registerSystemCommandExecutors();
const raidSystemPerformer = { _cmdDelay: null };
const raidPerformedSkills = [];
raidExecutionRuntime.SkillStateMachine.perform = (skill, force) =>
  raidPerformedSkills.push([skill, force]);
const raidTriggerCalls = [];
pluginModuleSandbox.window.TriggerCenter = {
  activate: (name) => raidTriggerCalls.push(["on", name]),
  deactivate: (name) => raidTriggerCalls.push(["off", name]),
};
raidExecutionRuntime.CmdExecuteCenter._executors[0].execute(
  raidSystemPerformer,
  "@cmdDelay 250",
);
raidExecutionRuntime.CmdExecuteCenter._executors[2].execute(
  raidSystemPerformer,
  "@perform skill-a,skill-b",
);
raidExecutionRuntime.CmdExecuteCenter._executors[3].execute(
  raidSystemPerformer,
  "@on trigger-a",
);
raidExecutionRuntime.CmdExecuteCenter._executors[4].execute(
  raidSystemPerformer,
  "@off trigger-a",
);
assert(
  raidExecutionRuntime.CmdExecuteCenter._executors.length === 6 &&
    ["@cmdDelay 1", "@force go east", "@perform skill", "@on a", "@off a"]
      .every((command, index) =>
        raidExecutionRuntime.CmdExecuteCenter._executors[index].appropriate(
          command,
        ),
      ) &&
    raidExecutionRuntime.CmdExecuteCenter._executors[5].priority ===
      raidExecutorPriority.low &&
    raidExecutionRuntime.CmdExecuteCenter._executors[5].appropriate("go east") &&
    raidGetDungeonFlow("测试") === "flow:测试" &&
    raidSystemPerformer._cmdDelay === 250 &&
    raidPerformedSkills.map((entry) => entry.join(":")).join("|") ===
      "skill-a:false|skill-b:false" &&
    raidTriggerCalls.map((entry) => entry.join(":")).join("|") ===
      "on:trigger-a|off:trigger-a",
  "Raid 系统执行器注册数量、相对顺序或副本查询包装发生变化",
);
const raidAncientTimers = [];
pluginModuleSandbox.window.setTimeout = (callback, delay) => {
  raidAncientTimers.push([callback, delay]);
  return raidAncientTimers.length;
};
raidExecutionRuntime.AncientCmdExecuter._hookIndex = 77;
const raidAncient = new raidExecutionRuntime.AncientCmdExecuter(
  ["go east"],
  null,
  null,
  null,
  null,
  321,
);
raidAncient.execute();
assert(
  raidExecutionCommands.join("|") === "go east" &&
    raidAncientTimers.length === 1 &&
    raidAncientTimers[0][1] === 321,
  "Raid Ancient 执行器发送、自由状态或延迟间隔发生变化",
);
raidExecutionWG = {
  SendCmd: () => {},
  remove_hook: (hookIndex) => raidExecutionRemovedHooks.push("rebound:" + hookIndex),
};
raidAncientTimers[0][0]();
assert(
  raidExecutionRemovedHooks.join("|") === "rebound:77" &&
    raidAncient.isWorking === false,
  "Raid Ancient 执行器未动态读取 WG 或完成时未清理 Hook",
);
const automationStaticData =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "automation-static-data",
  );
const automationStaticDataPeer =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "automation-static-data",
  );
const originalAutomationStaticData = {
  needfind: automationStaticData.getNeedFindRoutes(),
  place: automationStaticData.getPlaceRoutes(),
  mpzPath: automationStaticData.getMpzPath(),
  masterTasks: automationStaticData.getMasterTasks(),
};
assert(
  automationStaticDataPeer.getNeedFindRoutes() ===
    originalAutomationStaticData.needfind &&
    automationStaticDataPeer.getPlaceRoutes() ===
      originalAutomationStaticData.place &&
    automationStaticDataPeer.getMpzPath() ===
      originalAutomationStaticData.mpzPath &&
    automationStaticDataPeer.getMasterTasks() ===
      originalAutomationStaticData.masterTasks,
  "自动化静态数据服务多次创建后产生了不同 canonical state",
);
const automationStaticDataHashes = [
  [
    originalAutomationStaticData.needfind,
    7,
    "c534f3c6d017953a4f3d4fbe8cca32be83938f4214669f7da4dec8676a09e872",
  ],
  [
    originalAutomationStaticData.place,
    128,
    "3df8b16451991f9430e0b13277c771325c28e66f0c983d698ab5651ce741b3ed",
  ],
  [
    originalAutomationStaticData.mpzPath,
    6,
    "a46a118bad3ac9e044f9a0f4e7fbf90a2aec58296603aefc5987a49f6c1152ae",
  ],
  [
    originalAutomationStaticData.masterTasks,
    8,
    "46942ca669bf51f082fae893295a6f951721b4fd260a7cd4f40d3a20a7581a89",
  ],
];
for (const [value, keyCount, expectedHash] of automationStaticDataHashes) {
  assert(
    Object.keys(value).length === keyCount &&
      createHash("sha256")
        .update(JSON.stringify(value))
        .digest("hex") === expectedHash,
    "自动化静态数据的键顺序或完整内容发生变化",
  );
}
function runLegacyStaticDataEval(service, source, replacement) {
  let needfind = service.getNeedFindRoutes();
  let place = service.getPlaceRoutes();
  let mpz_path = service.getMpzPath();
  let sm_array = service.getMasterTasks();
  try {
    return eval(source);
  } finally {
    service.setNeedFindRoutes(needfind);
    service.setPlaceRoutes(place);
    service.setMpzPath(mpz_path);
    service.setMasterTasks(sm_array);
  }
}
const reboundNeedFind = { rebound: ["go test"] };
assert(
  runLegacyStaticDataEval(
    automationStaticData,
    "needfind = replacement; needfind",
    reboundNeedFind,
  ) === reboundNeedFind &&
    automationStaticDataPeer.getNeedFindRoutes() === reboundNeedFind,
  "direct eval 的词法整体重绑定未同步回 canonical state",
);
const thrownPlace = { thrown: "jh fam 0 start" };
assertThrows(
  () =>
    runLegacyStaticDataEval(
      automationStaticData,
      'place = replacement; throw new Error("verify")',
      thrownPlace,
    ),
  "direct eval 异常不再向上传播",
);
assert(
  automationStaticDataPeer.getPlaceRoutes() === thrownPlace,
  "direct eval 抛出异常后未在 finally 中同步词法重绑定",
);
function createDeferredStaticDataEvalHarness(service) {
  let mpz_path = service.getMpzPath();
  let previousMpzPath = mpz_path;
  function reconcileMpzPath() {
    const serviceValue = service.getMpzPath();
    if (mpz_path !== previousMpzPath) {
      service.setMpzPath(mpz_path);
      previousMpzPath = mpz_path;
      return mpz_path;
    }
    if (serviceValue !== previousMpzPath) {
      mpz_path = serviceValue;
      previousMpzPath = serviceValue;
    }
    return mpz_path;
  }
  return {
    evaluate(source, replacement) {
      reconcileMpzPath();
      try {
        return eval(source);
      } finally {
        service.setMpzPath(mpz_path);
        previousMpzPath = mpz_path;
      }
    },
  };
}
automationStaticData.setMpzPath(originalAutomationStaticData.mpzPath);
const deferredStaticDataHarness =
  createDeferredStaticDataEvalHarness(automationStaticData);
const deferredMpzPath = { deferred: "jh fam 9 start" };
const deferredMpzRebind = deferredStaticDataHarness.evaluate(
  "() => { mpz_path = replacement; }",
  deferredMpzPath,
);
deferredMpzRebind();
assert(
  deferredStaticDataHarness.evaluate("mpz_path") === deferredMpzPath &&
    automationStaticDataPeer.getMpzPath() === deferredMpzPath,
  "direct eval 返回的异步闭包重绑定未在下次读取时仲裁回服务",
);
const externalMpzPath = { external: "jh fam 8 start" };
automationStaticDataPeer.setMpzPath(externalMpzPath);
assert(
  deferredStaticDataHarness.evaluate("mpz_path") === externalMpzPath,
  "服务侧整体重绑定未同步回 direct eval 词法别名",
);
automationStaticData.setNeedFindRoutes(originalAutomationStaticData.needfind);
automationStaticData.setPlaceRoutes(originalAutomationStaticData.place);
automationStaticData.setMpzPath(originalAutomationStaticData.mpzPath);
automationStaticData.setMasterTasks(originalAutomationStaticData.masterTasks);
const raidObserverHooks = [];
let raidObserverNow = 1000;
let raidObserverDecodedKind = null;
let raidObserverFindArgs = null;
let raidObserverSystemTipFactory = (text) => ({
  timestamp: raidObserverNow,
  text,
  factory: "first",
});
let raidObserverMsgTipFactory = (content, ch, name, uid) => ({
  timestamp: raidObserverNow,
  content,
  ch,
  name,
  uid,
  factory: "first",
});
const raidObservers =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "raid-flow-observers",
    {
      addHook: (type, handler) => {
        raidObserverHooks.push([type, handler]);
        return raidObserverHooks.length - 1;
      },
      now: () => raidObserverNow,
      clone: (value) => structuredClone(value),
      deserializePackData: (value) => {
        raidObserverDecodedKind = value.selllist ? "selllist" : "stores";
        if (value.selllist) value.selllist = [{ id: "decoded-sell" }];
        if (value.stores) value.stores = [{ id: "decoded-store" }];
        return value;
      },
      findItem: (...args) => {
        raidObserverFindArgs = args;
        return "found-item";
      },
      createSystemTip: (text) => raidObserverSystemTipFactory(text),
      createMsgTip: (...args) => raidObserverMsgTipFactory(...args),
    },
  );
const {
  SystemTip: RaidSystemTip,
  MsgTip: RaidMsgTip,
  SystemTips: RaidSystemTips,
  MsgTips: RaidMsgTips,
  DialogList: RaidDialogList,
  TaskList: RaidTaskList,
  Xiangyang: RaidXiangyang,
} = raidObservers;
RaidSystemTips.init();
RaidMsgTips.init();
RaidDialogList.init();
RaidTaskList.init();
RaidXiangyang.init();
assert(
  raidObserverHooks.map(([type]) => type).join("|") ===
    "text|item|msg|dialog|dialog|dialog",
  "Raid 观察服务 Hook 类型或注册顺序发生变化",
);
const hooksByType = (type) =>
  raidObserverHooks
    .filter(([hookType]) => hookType === type)
    .map(([, handler]) => handler);
raidObserverNow = 1010;
hooksByType("text")[0]({ msg: "不要急，慢慢来。" });
raidObserverSystemTipFactory = (text) => ({
  timestamp: raidObserverNow,
  text,
  factory: "rebound",
});
raidObserverNow = 1020;
hooksByType("item")[0]({ desc: "物品提示" });
assert(
  RaidSystemTips.rejectTimestamp === 1010 &&
    RaidSystemTips._tips[0].factory === "first" &&
    RaidSystemTips._tips[1].factory === "rebound" &&
    RaidSystemTips.search("物品(提示)", 1010)?.[1] === "提示",
  "Raid 系统提示拒绝时间、动态构造器或正则捕获发生变化",
);
RaidSystemTips.clean(1010);
assert(
  RaidSystemTips._tips.length === 1 &&
    RaidSystemTips._tips[0].text === "物品提示",
  "Raid 系统提示 clean 未保持删除小于等于边界的语义",
);
for (let index = 0; index < 101; index++) {
  RaidSystemTips._push({ timestamp: 2000 + index, text: "tip-" + index });
}
assert(
  RaidSystemTips._tips.length === 100 &&
    RaidSystemTips._tips[0].text === "tip-1" &&
    RaidSystemTips._tips.at(-1).text === "tip-100",
  "Raid 系统提示缓存未保持 100 条 FIFO 容量",
);
raidObserverNow = 3000;
hooksByType("msg")[0]({
  content: "频道内容",
  ch: "tm",
  name: "队友",
  uid: "uid-1",
});
raidObserverMsgTipFactory = (content, ch, name, uid) => ({
  timestamp: raidObserverNow,
  content,
  ch,
  name,
  uid,
  factory: "rebound",
});
raidObserverNow = 3010;
hooksByType("msg")[0]({
  content: "新的内容",
  ch: "fam",
  name: "同门",
  uid: "uid-2",
});
assert(
  RaidMsgTips._tips[0].ch === "tm" &&
    RaidMsgTips._tips[1].factory === "rebound" &&
    RaidMsgTips.search("新的(内容)", 3000)?.[1] === "内容",
  "Raid 频道提示字段、动态构造器或搜索语义发生变化",
);
const dialogHooks = hooksByType("dialog");
const originalSellDialog = { selllist: [["compact"]] };
raidObserverNow = 4000;
dialogHooks[0](originalSellDialog);
assert(
  raidObserverDecodedKind === "selllist" &&
    RaidDialogList.timestamp === 4000 &&
    RaidDialogList._list[0].id === "decoded-sell" &&
    originalSellDialog.selllist[0][0] === "compact",
  "Raid 对话列表未保持克隆后解码或时间戳语义",
);
assert(
  RaidDialogList.findItem("name", true, 3, "{filter}") === "found-item" &&
    raidObserverFindArgs[0] === RaidDialogList._list &&
    raidObserverFindArgs.slice(1).join("|") === "name|true|3|{filter}",
  "Raid 对话列表 FindItem 动态转发参数发生变化",
);
const pack2Items = [{ id: "raw-pack2" }];
raidObserverNow = 4010;
dialogHooks[0]({ dialog: "pack2", items: pack2Items });
assert(
  RaidDialogList._list === pack2Items && RaidDialogList.timestamp === 4010,
  "Raid pack2 对话列表未保持原数组引用",
);
raidObserverNow = 5000;
dialogHooks[1]({
  dialog: "tasks",
  items: [{ desc: "第一项" }, { desc: "第二项" }],
});
assert(
  RaidTaskList._list.join("|") === "第一项|第二项" &&
    RaidTaskList.search("第二(项)", 5000)?.[1] === "项" &&
    RaidTaskList.search("第一", 5001) === null,
  "Raid 任务描述缓存、正则捕获或时间边界发生变化",
);
raidObserverNow = 6000;
dialogHooks[2]({ dialog: "fam", t: "fam", index: 7, desc: "错误" });
dialogHooks[2]({ dialog: "fam", t: "fam", index: 8, desc: "襄阳战况" });
assert(
  RaidXiangyang._desc === "襄阳战况" &&
    RaidXiangyang.search("襄阳(战况)", 6000)?.[1] === "战况" &&
    RaidXiangyang.search("襄阳", 6001) === null,
  "Raid 襄阳对话筛选或时间边界发生变化",
);
const standaloneSystemTip = new RaidSystemTip("原生构造");
const standaloneMsgTip = new RaidMsgTip("内容", "chat", "名字", "uid");
assert(
  standaloneSystemTip.timestamp === 6000 &&
    standaloneSystemTip.text === "原生构造" &&
    standaloneMsgTip.content === "内容" &&
    standaloneMsgTip.uid === "uid",
  "Raid 导出的提示构造器字段发生变化",
);
const isolatedRaidObservers =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "raid-flow-observers",
    { addHook: () => {}, now: () => 1 },
  );
assert(
  isolatedRaidObservers.SystemTips !== RaidSystemTips &&
    isolatedRaidObservers.SystemTips._tips !== RaidSystemTips._tips &&
    isolatedRaidObservers.DialogList._list !== RaidDialogList._list,
  "Raid 观察服务重复创建后未保持实例状态隔离",
);
RaidSystemTips.init();
RaidMsgTips.init();
RaidDialogList.init();
RaidTaskList.init();
RaidXiangyang.init();
assert(
  raidObserverHooks.length === 12,
  "Raid 观察缓存重复 init 不再保持历史重复注册六个 Hook 的行为",
);
const raidRoomHooks = [];
let activeRaidRoom;
let rejectedRaidItem = null;
const raidRoomService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-room", {
    addHook: (types, handler) => {
      raidRoomHooks.push([types, handler]);
    },
    now: () => 9876,
    filter: (_expression, item) => item === rejectedRaidItem,
    getRoom: () => activeRaidRoom,
  });
activeRaidRoom = raidRoomService.Room;
activeRaidRoom.init();
activeRaidRoom.init();
assert(
  raidRoomHooks.length === 6 &&
    JSON.stringify(raidRoomHooks[1][0]) ===
      JSON.stringify(["items", "itemadd", "itemremove", "sc", "status"]),
  "Raid Room 未保持三组 Hook 或组合事件顺序",
);
const raidRoomLocationHook = raidRoomHooks[0][1];
const raidRoomItemsHook = raidRoomHooks[1][1];
const raidRoomDeathHook = raidRoomHooks[2][1];
raidRoomLocationHook({ name: "旧房间", path: "old/path" });
const firstRaidItem = { id: "npc-1", name: "甲", hp: 10 };
raidRoomItemsHook({ type: "items", items: [firstRaidItem] });
raidRoomItemsHook({ type: "sc", id: "npc-1", hp: 0 });
raidRoomDeathHook({ id: "npc-1", hp: 0 });
assert(
  activeRaidRoom.name === "旧房间" &&
    activeRaidRoom.updateTimestamp === 9876 &&
    activeRaidRoom.getItem("npc-1") === firstRaidItem &&
    activeRaidRoom._deadItemsInRoom[0] === firstRaidItem &&
    activeRaidRoom.didKillItemsInRoom([{ name: "甲" }]) &&
    activeRaidRoom._deadItemsInRoom.length === 1,
  "Raid Room 房间快照、对象身份、死亡引用或非消费查询发生变化",
);
const reboundRaidRoom = pluginModuleSandbox.window.WSMudPlugin.createService(
  "raid-flow-room",
  { addHook: () => {} },
).Room;
activeRaidRoom = reboundRaidRoom;
raidRoomLocationHook({ name: "新房间", path: "new/path" });
const filteredRaidItem = { id: "npc-2", name: "乙" };
raidRoomItemsHook({ type: "itemadd", ...filteredRaidItem });
rejectedRaidItem = reboundRaidRoom.getItem("npc-2");
assert(
  reboundRaidRoom.name === "新房间" &&
    raidRoomService.Room.name === "旧房间" &&
    raidRoomService.Room.getItemId.call(
      reboundRaidRoom,
      "乙",
      0,
      0,
      "filter",
    ) === null,
  "Raid Room Hook 或过滤器未动态解析当前词法对象",
);
const thIslandHooks = [];
const thIslandRemovedHooks = [];
const thIslandExecutors = [];
const thIslandMessages = [];
let thIslandPath = "invalid/path";
let activeTHIsland;
class FakeAncientCmdExecuter {
  constructor(
    commands,
    willStartExecute,
    didFinishExecute,
    willPerformCmd,
    didPerformCmd,
    interval,
  ) {
    Object.assign(this, {
      commands,
      willStartExecute,
      didFinishExecute,
      willPerformCmd,
      didPerformCmd,
      interval,
    });
    thIslandExecutors.push(this);
  }
  execute() {
    this.executed = true;
  }
}
const thIslandWG = {
  add_hook: (types, handler) => {
    thIslandHooks.push([types, handler]);
    return thIslandHooks.length + 100;
  },
  remove_hook: (hookId) => thIslandRemovedHooks.push(hookId),
};
let activeTHIslandWG = thIslandWG;
let activeAncientCmdExecuter = FakeAncientCmdExecuter;
const thIslandService =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "raid-flow-th-island",
    {
      getRole: () => ({ atPath: (path) => path === thIslandPath }),
      getWG: () => activeTHIslandWG,
      appendMessage: (message) => thIslandMessages.push(message),
      getTHIsland: () => activeTHIsland,
      getAncientCmdExecuter: () => activeAncientCmdExecuter,
    },
  );
activeTHIsland = thIslandService.THIsland;
activeTHIsland.outMaze();
activeTHIsland.zhoubotong();
assert(
  thIslandMessages.join("|") ===
    "只有在 桃花岛的海滩 才能使用此虫洞。|只有在 蓉儿的卧室 才能使用此虫洞。",
  "桃花岛两个入口的路径守卫或提示发生变化",
);
let thIslandOutFinished = 0;
thIslandPath = "taohua/haitan";
activeTHIsland.outMaze(() => {
  thIslandOutFinished += 1;
});
const outMazeExecutor = thIslandExecutors.at(-1);
assert(
  outMazeExecutor.executed &&
    outMazeExecutor.commands.join("|") === "go south|@look 1|@look 5" &&
    outMazeExecutor.interval === 1000,
  "出桃花阵命令数组、执行或间隔发生变化",
);
outMazeExecutor.willStartExecute();
assert(
  thIslandHooks.length === 2 &&
    JSON.stringify(thIslandHooks[0][0]) === JSON.stringify(["room", "exits"]) &&
    thIslandHooks[1][0] === "room",
  "桃花阵监控 Hook 数量或顺序发生变化",
);
const originalTHIsland = activeTHIsland;
activeTHIsland = {
  ...originalTHIsland,
  _mazeCoords: originalTHIsland._mazeCoords.map((coord) => coord.slice()),
};
thIslandHooks[0][1]({
  type: "room",
  desc: "四周栽了大概有一棵桃树",
});
thIslandHooks[0][1]({
  type: "exits",
  items: { north: "桃花林", south: "桃花林", west: "桃花林" },
});
thIslandHooks[1][1]({
  type: "room",
  desc: "能看到东南方向大概有二棵桃树",
});
assert(
  activeTHIsland._goCenterCmd === "go west" &&
    originalTHIsland._goCenterCmd === undefined &&
    activeTHIsland._mazeCoords[1][0] === 1 &&
    activeTHIsland._decodedMaze === true &&
    outMazeExecutor.willPerformCmd(null, "@look 1") === "go west" &&
    outMazeExecutor.willPerformCmd(null, "@look 5").includes("go south"),
  "桃花阵中心方向、坐标解码或出阵命令发生变化",
);
activeTHIslandWG = {
  ...thIslandWG,
  remove_hook: (hookId) => thIslandRemovedHooks.push("rebound:" + hookId),
};
outMazeExecutor.didFinishExecute();
assert(
  thIslandOutFinished === 1 &&
    thIslandRemovedHooks.slice(-2).join("|") ===
      "rebound:102|rebound:101",
  "桃花阵动态 Island/WG、完成回调或逆序 Hook 清理发生变化",
);
activeTHIslandWG = thIslandWG;
let thIslandZhouFinished = 0;
thIslandPath = "taohua/wofang";
class ReboundAncientCmdExecuter extends FakeAncientCmdExecuter {
  constructor() {
    super(...arguments);
    this.rebound = true;
  }
}
activeAncientCmdExecuter = ReboundAncientCmdExecuter;
activeTHIsland.zhoubotong(() => {
  thIslandZhouFinished += 1;
});
const zhouExecutor = thIslandExecutors.at(-1);
zhouExecutor.willStartExecute();
activeTHIsland._lastCoord = [0, 1];
thIslandHooks.at(-1)[1]({
  items: {
    north: "桃花林",
    west: "桃花林",
    east: "桃花林",
    south: "桃花林",
  },
});
assert(
  zhouExecutor.rebound === true &&
    zhouExecutor.commands.length === 12 &&
    zhouExecutor.willPerformCmd(null, "@go 2") ===
      "go north;go west;[exit]",
  "周伯通入口命令或桃花洞绕行命令发生变化",
);
zhouExecutor.didFinishExecute();
assert(
  thIslandZhouFinished === 1 &&
    thIslandRemovedHooks.slice(-3).join("|") === "104|103|105" &&
    thIslandRemovedHooks.at(-1) === activeTHIsland._exitsHookIndex,
  "周伯通动态执行器、完成回调或三组 Hook 清理发生变化",
);
const protocolStateHooks = [];
const protocolStateTimers = [];
const protocolStateClears = [];
const protocolStateSocketCommands = [];
const protocolStateReceived = [];
const protocolDashboardRefreshes = [];
const protocolStateG = {
  connected: false,
  id: "old-role",
  cds: new Map([["old-skill", true]]),
  gcd: false,
  items: new Map(),
  status: new Map(),
  selfStatus: [],
  in_fight: false,
};
const protocolStateGI = { gcdThread: null };
const protocolStateWG = {
  add_hook: (types, handler) => protocolStateHooks.push([types, handler]),
  applyDashboardLevel: () => {},
  requestDashboardSnapshot: () => {},
  requestAutomationScore2: () => {},
  scheduleDashboardStateRefresh: (options) =>
    protocolDashboardRefreshes.push(options),
  renderAutoFirstRoundDialog: () => {},
  resetAutoFirstRoundCombat: () => {},
  auto_preform: () => {},
  clean_dps: () => {},
  receive_message: (event) => protocolStateReceived.push(event),
  online: false,
};
const protocolState =
  pluginModuleSandbox.window.WSMudPlugin.createService(
    "automation-protocol-state",
    {
      getWG: () => protocolStateWG,
      getG: () => protocolStateG,
      getGI: () => protocolStateGI,
      getJquery: () => () => ({ text: () => "" }),
      getWs: () => ({
        readyState: 1,
        send: (command) => protocolStateSocketCommands.push(command),
      }),
      getMessageAppend: () => () => {},
      getZdyskilllist: () => "configured",
      timers: {
        setTimeout: (callback, delay) => {
          protocolStateTimers.push([callback, delay]);
          return protocolStateTimers.length;
        },
        clearTimeout: (timer) => protocolStateClears.push(timer),
      },
    },
  );
protocolState.init();
protocolState.init();
assert(
  protocolStateHooks.length === 2 &&
    JSON.stringify(protocolStateHooks[0][0]).includes('"clearDistime"'),
  "自动化协议状态重复 init 不再保持历史重复 Hook 行为",
);
const protocolStateHandler = protocolStateHooks[0][1];
protocolStateHandler({ type: "login", id: "new-role", level: 3 });
assert(
  protocolStateG.id === "new-role" &&
    protocolStateG.connected &&
    protocolStateWG.online &&
    protocolStateSocketCommands.join("|") === "sx greet" &&
    protocolDashboardRefreshes.length === 1 &&
    protocolDashboardRefreshes[0].pack === true &&
    protocolDashboardRefreshes[0].delay === 200,
  "自动化协议状态登录顺序或首次请安行为发生变化",
);
protocolStateHandler({ type: "exits", items: { north: "北门", out: "出口" } });
assert(
  protocolStateG.exits.get("north").exits === "北门" &&
    protocolStateG.exits.get("out").exits === "出口" &&
    protocolStateG.exits.size === 2,
  "自动化协议状态出口 Map 映射发生变化",
);
protocolStateG.gcd = true;
protocolStateGI.gcdThread = 77;
protocolStateHandler({
  type: "clearDistime",
  id: "new-skill",
  distime: 250,
  rtime: 500,
});
assert(
  protocolStateG.cds.get("old-skill") === false &&
    protocolStateG.cds.get("new-skill") === true &&
    protocolStateG.gcd === true &&
    protocolStateClears[0] === 77 &&
    protocolStateTimers.map((entry) => entry[1]).join("|") === "250|500",
  "clearDistime 落入 dispfm、技能冷却或 GCD 定时器语义发生变化",
);
protocolStateTimers[0][0]();
protocolStateTimers[1][0]();
assert(
  protocolStateG.cds.get("new-skill") === false &&
    protocolStateG.gcd === false &&
    JSON.parse(protocolStateReceived[0].data).id === "new-skill",
  "自动化协议状态冷却回调未恢复状态或发送 enapfm",
);
const automationMenuSandbox = {
  window: {},
  console,
  document: { currentScript: null },
};
automationMenuSandbox.window.window = automationMenuSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/automation-message-menu.js",
])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    automationMenuSandbox,
    { filename: sourcePath },
  );
runInNewContext(
  "Array.prototype.baoremove = function (index) { this.splice(index, 1); };",
  automationMenuSandbox,
);
const automationMenuCommands = [];
const automationMenuRoutes = [];
const automationMenuTimers = [];
const automationMenuLegacyScripts = [];
const automationMenuRaidCalls = [];
let automationMenuHour = 16;
let automationMenuTimerState = 0;
let automationMenuWG = {
  fight_listener: null,
  zdwk: () => automationMenuCommands.push("zdwk"),
  SendCmd: (command) => automationMenuCommands.push(command),
  Send: (command) => automationMenuCommands.push(command),
  go: (route) => automationMenuRoutes.push(route),
  eqloader: () => ({ sword: { name: "剑" } }),
  timer_close: () => automationMenuCommands.push("timer_close:first"),
};
let automationDeferredResult;
const automationMenuServices = {};
automationMenuSandbox.window.WSMudPlugin.installFeatures({
  services: automationMenuServices,
  logger: { log: () => {} },
  jquery: () => ({
    addClass: () => {},
    removeClass: () => {},
    click: () => {},
    is: () => false,
    css: () => "none",
  }),
  timers: {
    setTimeout: (callback, delay) => {
      automationMenuTimers.push([callback, delay]);
      return automationMenuTimers.length;
    },
  },
  getWG: () => automationMenuWG,
  getRoleName: () => "角色",
  getRaid: () => ({
    perform: (source) => automationMenuRaidCalls.push(["perform", source]),
    menu: () => automationMenuRaidCalls.push(["menu"]),
  }),
  getTimer: () => automationMenuTimerState,
  getButtonMode: () => false,
  getStopAuto: () => false,
  getNow: () => ({ getHours: () => automationMenuHour }),
  messageAppend: () => {},
  executeLegacyScript: (source) => automationMenuLegacyScripts.push(source),
  deferred: () => ({
    resolve: (value) => {
      automationDeferredResult = value;
    },
    promise: () => ({ value: () => automationDeferredResult }),
  }),
});
const automationMessageMenu = automationMenuServices.automationMessageMenu;
automationMessageMenu.receiveMessage({ data: "日常", origin: "test" });
automationMessageMenu.receiveMessage({ data: "挂机", origin: "test" });
automationMessageMenu.receiveMessage({ data: "//流程", origin: "test" });
automationMessageMenu.receiveMessage({ data: "#js\nlegacy = 1", origin: "test" });
automationMessageMenu.receiveMessage({ data: '{"type":"dialog"}', origin: "test" });
assert(
  automationMenuCommands.join("|") === "$daily|stopstate" &&
    automationMenuRaidCalls[0][1] === "//流程" &&
    automationMenuLegacyScripts.join("|") === "legacy = 1",
  "外部消息命令、Raid 分派、JSON 忽略或 direct-eval 薄桥发生变化",
);
const schoolRoutesPromise = automationMessageMenu.makeTp(1);
assert(
  automationMenuTimers.at(-1)[1] === 20 &&
    schoolRoutesPromise.value() === undefined,
  "门派传送未保持 Deferred 或 20ms 延迟",
);
automationMenuTimers.at(-1)[0]();
schoolRoutesPromise.value().武当.callback();
assert(
  automationMenuRoutes.at(-1) === "武当派-广场",
  "17 点前门派传送路线发生变化",
);
automationMenuHour = 17;
const lateRoutesPromise = automationMessageMenu.makeTp(1);
automationMenuTimers.at(-1)[0]();
lateRoutesPromise.value().武当.callback();
assert(
  automationMenuRoutes.at(-1) === "武当派-后山小院",
  "17 点后门派传送路线发生变化",
);
const firstAutomationMenu = automationMessageMenu.createSomeMenu();
automationMenuTimerState = 1;
assert(
  firstAutomationMenu.items.关闭自动.visible() === true &&
    firstAutomationMenu.items.自动.visible() === false,
  "右键菜单未动态读取自动 timer 状态",
);
automationMenuWG = {
  ...automationMenuWG,
  eqloader: () => ({}),
  timer_close: () => automationMenuCommands.push("timer_close:second"),
};
firstAutomationMenu.items.关闭自动.callback();
assert(
  automationMenuCommands.at(-1) === "timer_close:second",
  "旧右键菜单回调缓存了已替换的 WG 对象",
);
const packDataCodec =
  pluginModuleSandbox.window.WSMudPlugin.createService("pack-data-codec");
const compactPackItems = [
  ["长剑", "sword", 2, 3, "把", 100, 1, 0, 0, 0, 0, 1],
];
const compactPackEqs = [["布衣", "cloth", 1, 1, 0], null];
const compactSelllist = [["药草", "herb", 4, 0, "株", 8], null];
const compactStores = [
  ["木箱", "box", 1, 2, "个", 9, 0, 1, 0, 1, 0],
  null,
];
const compactPack = {
  items: compactPackItems,
  eqs: compactPackEqs,
  selllist: compactSelllist,
  stores: compactStores,
};
const decodedPack = packDataCodec.deserializePackData(compactPack);
assert(
  decodedPack === compactPack &&
    decodedPack.items !== compactPackItems &&
    decodedPack.items[0] !== compactPackItems[0] &&
    decodedPack.items[0].name === "长剑" &&
    decodedPack.items[0].locked === 1 &&
    decodedPack.eqs[0].id === "cloth" &&
    decodedPack.eqs[1] === null &&
    decodedPack.selllist[0].count === 4 &&
    decodedPack.selllist[1] === null &&
    decodedPack.stores[0].can_open === 1 &&
    decodedPack.stores[1] === null,
  "背包协议解码未保持顶层身份、数组替换、字段映射或空行语义",
);
const untouchedPackFields = {
  items: null,
  eqs: false,
  selllist: 0,
  stores: "",
};
packDataCodec.deserializePackData(untouchedPackFields);
assert(
  untouchedPackFields.items === null &&
    untouchedPackFields.eqs === false &&
    untouchedPackFields.selllist === 0 &&
    untouchedPackFields.stores === "",
  "背包协议解码修改了 falsy 字段",
);
const sparseItems = [];
sparseItems.length = 2;
sparseItems[1] = ["稀疏物品"];
const sparsePack = packDataCodec.deserializePackData({ items: sparseItems });
assert(
  !(0 in sparsePack.items) &&
    sparsePack.items[1].name === "稀疏物品" &&
    Object.prototype.hasOwnProperty.call(sparsePack.items[1], "locked") &&
    sparsePack.items[1].locked === undefined,
  "背包协议解码未保持稀疏数组或缺失字段属性",
);
assertThrows(
  () => packDataCodec.deserializePackData(null),
  "背包协议解码不再对 null 输入抛出原生异常",
);
const packWithNullItem = packDataCodec.deserializePackData({ items: [null] });
assert(
  packWithNullItem.items[0] === null,
  "背包协议解码未兼容空物品行",
);
assertThrows(
  () => packDataCodec.deserializePackData({ stores: {} }),
  "背包协议 truthy 非数组字段不再抛出原生异常",
);
const twiceDecodedPack = packDataCodec.deserializePackData({
  items: [["一次解码"]],
});
packDataCodec.deserializePackData(twiceDecodedPack);
assert(
  twiceDecodedPack.items[0].name === "一次解码",
  "背包协议解码器未兼容已经解码的对象行",
);
let dynamicItemKeys = ["first"];
const dynamicPackDataCodec =
  pluginModuleSandbox.window.WSMudPlugin.createService("pack-data-codec", {
    getItemKeys: () => dynamicItemKeys,
  });
assert(
  dynamicPackDataCodec.deserializePackData({ items: [[1]] }).items[0].first ===
    1,
  "背包协议解码服务未使用显式字段表 getter",
);
dynamicItemKeys = ["second"];
assert(
  dynamicPackDataCodec.deserializePackData({ items: [[2]] }).items[0].second ===
    2,
  "背包协议解码服务未保留闭包字段表重新绑定兼容性",
);
const triggerBus = pluginModuleSandbox.window.WSMudPlugin.createService(
  "trigger-event-bus",
);
const triggerStorage = new Map();
const triggerPerformCalls = [];
const triggerCore = pluginModuleSandbox.window.WSMudPlugin.createService(
  "trigger-core",
  {
    eventBus: triggerBus,
    getRoleId: () => "verify-role",
    perform: (...args) => triggerPerformCalls.push(args),
    storage: {
      get: (key, fallback) => triggerStorage.get(key) ?? fallback,
      set: (key, value) => triggerStorage.set(key, value),
    },
    logger: { log: () => {} },
  },
);
const triggerUiMessages = [];
let triggerUiClears = 0;
let triggerUiReloads = 0;
let triggerUiDestroyed = 0;
const triggerUiValues = new Map([
  ["roles", { ignored: true }],
  ["verify-setting", 1],
]);
const triggerUiVue = function Vue(options) {
  this.options = options;
  this.$destroy = () => {
    triggerUiDestroyed += 1;
  };
};
const triggerUiService =
  pluginModuleSandbox.window.WSMudPlugin.createService("trigger-ui", {
    triggerCenter: {
      getAll: () => [],
      reload: () => {
        triggerUiReloads += 1;
      },
    },
    templates: { getAll: () => [] },
    hostWindow: {
      Vue: triggerUiVue,
      alert: () => {},
      confirm: () => true,
    },
    getVue: () => triggerUiVue,
    getToRaid: () => ({ shareTrigger: () => {} }),
    messageAppend: () => (html) => triggerUiMessages.push(html),
    messageClear: () => () => {
      triggerUiClears += 1;
    },
    storage: {
      listValues: () => [...triggerUiValues.keys()],
      get: (key) => triggerUiValues.get(key),
      set: (key, value) => triggerUiValues.set(key, value),
    },
  });
triggerUiService.TriggerUI._appendHtml("验证标题", "验证正文", null, null);
triggerUiService.TriggerUI.triggerHome();
triggerUiService.TriggerUI.triggerHome();
assert(
  triggerUiClears === 3 &&
    triggerUiMessages.length === 3 &&
    triggerUiMessages[0].includes('id="app"') &&
    triggerUiMessages[0].includes("验证正文") &&
    triggerUiDestroyed === 1 &&
    triggerUiService.TriggerConfig.get()["verify-setting"] === 1 &&
    !Object.prototype.hasOwnProperty.call(
      triggerUiService.TriggerConfig.get(),
      "roles",
    ),
  "Trigger UI 服务未保持消息容器、Vue 外壳或配置读取契约",
);
triggerUiService.TriggerConfig.set({ "verify-setting": 2 });
assert(
  triggerUiValues.get("verify-setting") === 2 && triggerUiReloads === 1,
  "Trigger UI 服务未保持 GM 配置写入或重载契约",
);
triggerUiService.destroy();
assert(triggerUiDestroyed === 2, "Trigger UI 服务销毁后仍残留 Vue 实例");
const raidDungeonService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-dungeons");
const raidDungeons = raidDungeonService.getAll();
const secondRaidDungeonService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-dungeons");
assert(
  raidDungeons === raidDungeonService.dungeons &&
    raidDungeons === secondRaidDungeonService.getAll() &&
    raidDungeons.length === 38 &&
    raidDungeons[0].name === "华山论剑" &&
    raidDungeons.at(-1).name === "树林" &&
    raidDungeons.filter((dungeon) => dungeon.desc != null).length === 1 &&
    raidDungeonService.findByName("温府").desc === "温府(2k+闪避)" &&
    raidDungeons.every(
      (dungeon) =>
        dungeon.source.startsWith("\n") &&
        !dungeon.source.endsWith("\n") &&
        !dungeon.source.includes("\r"),
    ) &&
    createHash("sha256")
      .update(JSON.stringify(raidDungeons))
      .digest("hex") ===
      "a5c1dcfe2ba351fc0ded94bcaca81cf120c1adbf3fe7b4c899b255eb7df3850e",
  "Raid 内置副本目录的数量、顺序、描述、源码或对象身份发生变化",
);
assert(
  raidDungeonService.findByName({ toString: () => "树林" }) ===
    raidDungeons.at(-1) &&
    raidDungeonService.getSource("不存在的副本") === null,
  "Raid 副本目录未保留宽松名称匹配或缺失流程返回值",
);
const temporaryDungeon = { name: "验证临时副本", source: "verify" };
raidDungeons.push(temporaryDungeon);
assert(
  raidDungeonService.findByName("验证临时副本") === temporaryDungeon &&
    secondRaidDungeonService.getAll().at(-1) === temporaryDungeon,
  "Raid 副本目录未保持共享数组及对象可变性",
);
raidDungeons.pop();
const raidAssertService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-assert");
const secondRaidAssertService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-assert");
const raidAssertCenter = raidAssertService.AssertHolderCenter;
assert(
  raidAssertCenter._assertHolders.length === 3 &&
    raidAssertService.AssertLeftMarkHandlerCenter._leftMarkHandlers.length ===
      0 &&
    secondRaidAssertService.AssertHolderCenter !== raidAssertCenter &&
    secondRaidAssertService.AssertHolderCenter._assertHolders.length === 3,
  "Raid 断言服务默认 holder 顺序或实例隔离异常",
);
assert(
  raidAssertCenter.get("true")() === true &&
    raidAssertCenter.get("false")() === false &&
    raidAssertCenter.get("1 == 1.0005")() === true &&
    raidAssertCenter.get("1 != 1.0005")() === false &&
    raidAssertCenter.get("1 < 2")() === true &&
    raidAssertCenter.get("2 >= 1")() === true &&
    raidAssertCenter.get("true && false")() === false &&
    raidAssertCenter.get("false || true")() === true &&
    raidAssertCenter.get("!false")() === true &&
    raidAssertCenter.get("false && true || true")() === false &&
    raidAssertCenter.get("unknown") === null,
  "Raid 断言真值、比较容差、组合解析或未知表达式语义发生变化",
);
const firstTrueAssert = raidAssertCenter.get("true");
const secondTrueAssert = raidAssertCenter.get("true");
assert(
  firstTrueAssert !== secondTrueAssert &&
    firstTrueAssert() === true &&
    secondTrueAssert() === true,
  "Raid 断言 wrapper 未保持逐次创建语义",
);
const raidLeftHandlers = raidAssertService.AssertLeftMarkHandlerCenter;
const raidLeftHandlerCalls = [];
raidLeftHandlers.addHandler({
  handle: (value) => {
    raidLeftHandlerCalls.push("first:" + value);
    return { handle: true, value: 42 };
  },
});
raidLeftHandlers.addHandler({
  handle: (value) => {
    raidLeftHandlerCalls.push("second:" + value);
    return { handle: true, value: 0 };
  },
});
assert(
  raidAssertCenter.get("left >= 40")() === true &&
    raidLeftHandlerCalls.join("|") === "first:left",
  "Raid 断言左值处理器未保持首个匹配优先级",
);
const customAssertHolder = new raidAssertService.AssertHolder(
  (value) => value === "custom",
  () => new raidAssertService.AssertWrapper(() => "custom-result"),
);
raidAssertCenter.addAssertHolder(customAssertHolder);
assert(
  raidAssertCenter.get("custom")() === "custom-result" &&
    raidAssertCenter._assertHolders.at(-1) === customAssertHolder,
  "Raid 自定义断言 holder 未保持追加顺序或扩展 API",
);
const raidShortcutRegistrations = [];
const raidShortcutPerformers = [];
const raidShortcutIslandCalls = [];
class RaidShortcutPerformer {
  constructor(name, source) {
    this.name = name;
    this.source = source;
    raidShortcutPerformers.push(this);
  }
  log(value) {
    this.logValue = value;
  }
  start() {
    this.started = true;
  }
}
const raidShortcutIsland = {
  outMaze: (done) => {
    raidShortcutIslandCalls.push("taohualin");
    done();
  },
  zhoubotong: (done) => {
    raidShortcutIslandCalls.push("zhoubotong");
    done();
  },
};
const registerRaidShortcut = (name, handler) =>
  raidShortcutRegistrations.push({ name, handler });
const raidShortcutService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-shortcuts", {
    Performer: RaidShortcutPerformer,
    THIsland: raidShortcutIsland,
    registerAtCommand: registerRaidShortcut,
  });
const secondRaidShortcutService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-shortcuts", {
    Performer: RaidShortcutPerformer,
    THIsland: raidShortcutIsland,
    registerAtCommand: registerRaidShortcut,
  });
assert(
  raidShortcutRegistrations.map(({ name }) => name).join("|") ===
      "taohualin|zhoubotong" &&
    secondRaidShortcutService.DungeonsShortcuts !==
      raidShortcutService.DungeonsShortcuts,
  "Raid 快捷流程重复创建时重复注册命令，或意外缓存了上下文对象",
);
await Promise.all(
  raidShortcutRegistrations.map(({ handler }) => handler(null, null)),
);
assert(
  raidShortcutIslandCalls.join("|") === "taohualin|zhoubotong",
  "Raid 桃花林/周伯通命令未等待对应 THIsland 完成回调",
);
const raidShortcutMethods = [
  "xianyu_xyjq",
  "xianyu_xybm",
  "xianyu_ksyb",
  "xianyu_sdyt",
  "xianyu_mghyj",
  "xianyu_ltbm",
  "xianyu_setting",
  "cangbaotu",
  "cihang",
  "zhanshendian",
  "guzongmen",
];
assert(
  Object.keys(raidShortcutService.DungeonsShortcuts).join("|") ===
    raidShortcutMethods.join("|"),
  "Raid 固定快捷流程方法数量或顺序发生变化",
);
for (const method of raidShortcutMethods) {
  raidShortcutService.DungeonsShortcuts[method]();
}
const raidShortcutRows = raidShortcutMethods.map((method, index) => ({
  method,
  name: raidShortcutPerformers[index].name,
  source: raidShortcutPerformers[index].source,
}));
assert(
  raidShortcutPerformers.length === 11 &&
    raidShortcutPerformers.every(
      (performer) => performer.logValue === false && performer.started === true,
    ) &&
    createHash("sha256")
      .update(JSON.stringify(raidShortcutRows))
      .digest("hex") ===
      "914b5c196c15846146c741c5d58d53f672b7adcb288642684259218e853a54fe",
  "Raid 快捷流程名称、源码或 Performer log(false)/start 调用发生变化",
);
assertThrows(
  () =>
    pluginModuleSandbox.window.WSMudPlugin.createService(
      "raid-flow-shortcuts",
      {},
    ),
  "Raid 快捷流程缺少显式上下文时未拒绝创建",
);
const raidServerAjaxRequests = [];
const raidServerGmValues = new Map([
  ["roles", { ignored: true }],
  ["configA", "valueA"],
]);
const raidServerGmWrites = [];
const raidServerClipboards = [];
const raidServerAlerts = [];
const raidServerMessages = [];
const raidServerNotices = [];
const raidServerLayerOptions = [];
const raidServerTriggerConfigWrites = [];
const raidServerTriggerConfig = {
  get: () => ({ enabled: true }),
  set: (value) => raidServerTriggerConfigWrites.push(value),
};
const raidServerFlowWrites = [];
const raidServerWorkflowWrites = [];
const raidServerCreatedFlows = [];
const raidServerFlowStore = {
  getAll: () => ({ flowA: "say flow" }),
  corver: (value) => raidServerFlowWrites.push(value),
};
const raidServerWorkflowConfig = {
  _rootList: (...args) => {
    if (args.length) raidServerWorkflowWrites.push(args[0]);
    return [{ id: "root" }];
  },
  createWorkflow: (...args) => {
    raidServerCreatedFlows.push(args);
    return 1;
  },
};
const raidServerTriggerWrites = [];
const raidServerCreatedTriggers = [];
const raidServerTriggerCenter = {
  getAllData: () => [{ name: "triggerA" }],
  corver: (value) => raidServerTriggerWrites.push(value),
  create: (...args) => {
    raidServerCreatedTriggers.push(args);
    return 1;
  },
};
let raidServerRoleId = "role-A";
const raidServerService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-server", {
    gm: {
      listValues: () => [...raidServerGmValues.keys()],
      getValue: (key, fallback) =>
        raidServerGmValues.has(key) ? raidServerGmValues.get(key) : fallback,
      setValue: (key, value) => {
        raidServerGmValues.set(key, value);
        raidServerGmWrites.push([key, value]);
      },
      setClipboard: (value) => raidServerClipboards.push(value),
    },
    getRoleId: () => raidServerRoleId,
    getFlowStore: () => raidServerFlowStore,
    getWorkflowConfig: () => raidServerWorkflowConfig,
    getTriggerConfig: () => raidServerTriggerConfig,
    getTriggerCenter: () => raidServerTriggerCenter,
    messageAppend: (html) => raidServerMessages.push(html),
    noticeMessage: (html) => raidServerNotices.push(html),
    getScriptVersion: () => "9.9.9",
    jquery: { ajax: (options) => raidServerAjaxRequests.push(options) },
    layer: {
      open: (options) => raidServerLayerOptions.push(options),
      close: () => {},
    },
    alert: (message) => raidServerAlerts.push(message),
  }).Server;
assert(
  raidServerService._address === "wsmud.ii74.com/S" &&
    Object.keys(raidServerService).join("|") ===
      "uploadConfig|downloadConfig|uploadFlows|downloadFlows|uploadTriggers|downloadTriggers|getNotice|shareFlowTrigger|importFlow|importTrigger|_address|_async|_sync|_get|_getPhone",
  "Raid Server 成员顺序或远端地址发生变化",
);
let raidServerSuccessValue;
let raidServerErrorValue;
raidServerService._sync(
  "verifySync",
  { value: 1 },
  (value) => {
    raidServerSuccessValue = value;
  },
  (value) => {
    raidServerErrorValue = value;
  },
);
let raidServerRequest = raidServerAjaxRequests.at(-1);
assert(
  raidServerRequest.type === "post" &&
    raidServerRequest.url ===
      "https://wsmud.ii74.com/S/verifySync" &&
    raidServerRequest.async === false &&
    raidServerRequest.dataType === "json" &&
    raidServerRequest.data.value === 1,
  "Raid Server 同步 POST 请求契约发生变化",
);
raidServerRequest.success({ code: 200, data: "ok" });
assert(raidServerSuccessValue === "ok", "Raid Server 200 响应未调用成功回调");
raidServerService._async("verifyAsync", {}, null, (value) => {
  raidServerErrorValue = value;
});
raidServerRequest = raidServerAjaxRequests.at(-1);
raidServerRequest.success({ code: 500, data: "detail" });
assert(
  raidServerRequest.async === true && raidServerErrorValue === "detail",
  "Raid Server 异步标记或非 200 data 优先错误分派发生变化",
);
raidServerService.uploadConfig();
raidServerRequest = raidServerAjaxRequests.at(-1);
const uploadedConfig = JSON.parse(raidServerRequest.data.value);
assert(
  raidServerRequest.data.id === "role-A" &&
    uploadedConfig.configA === "valueA" &&
    uploadedConfig["@@@trigger"].enabled === true &&
    !Object.prototype.hasOwnProperty.call(uploadedConfig, "roles"),
  "Raid 配置上传未过滤 roles、携带触发器配置或动态角色 ID",
);
raidServerRequest.success({ code: 200, data: "config-token" });
assert(
  raidServerClipboards.at(-1) === "config-token" &&
    raidServerMessages.at(-2).includes("config-token") &&
    raidServerAlerts.at(-1).includes("上传成功"),
  "Raid 配置上传成功后的复制、消息或提示发生变化",
);
raidServerService.downloadConfig("download-token");
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: JSON.stringify({
    roles: "ignored",
    configB: "valueB",
    "@@@trigger": { imported: true },
  }),
});
assert(
  raidServerGmValues.get("configB") === "valueB" &&
    raidServerTriggerConfigWrites.at(-1).imported === true &&
    !raidServerGmWrites.some(([key]) => key === "roles"),
  "Raid 配置下载未跳过 roles 或恢复 TriggerConfig",
);
raidServerRoleId = "role-B";
raidServerService.uploadFlows();
raidServerRequest = raidServerAjaxRequests.at(-1);
assert(
  raidServerRequest.data.id === "role-B" &&
    JSON.parse(raidServerRequest.data.value).flows.flowA === "say flow",
  "Raid 流程上传未动态读取角色、流程或工作流树",
);
raidServerService.downloadFlows("flow-token");
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: JSON.stringify({ flows: { imported: "flow" }, map: [{ id: 2 }] }),
});
assert(
  raidServerFlowWrites.at(-1).imported === "flow" &&
    raidServerWorkflowWrites.at(-1)[0].id === 2,
  "Raid 流程下载未保持 corver 或根目录树写入",
);
raidServerService.uploadTriggers();
assert(
  JSON.parse(raidServerAjaxRequests.at(-1).data.value)[0].name === "triggerA",
  "Raid 触发器上传 payload 发生变化",
);
raidServerService.downloadTriggers("trigger-token");
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: JSON.stringify([{ imported: "trigger" }]),
});
assert(
  raidServerTriggerWrites.at(-1)[0].imported === "trigger",
  "Raid 触发器下载未保持 corver 写入",
);
raidServerService.getNotice();
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: { version: "1.0.0", type: "0", value: "普通公告" },
});
assert(
  raidServerGmValues.get("NoticeDataKey").version === "1.0.0" &&
    raidServerNotices.at(-1).includes("普通公告") &&
    raidServerNotices.at(-1).includes("9.9.9"),
  "Raid 普通公告版本存储或消息渲染发生变化",
);
raidServerService.getNotice();
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: { version: "2.0.0", type: "1", value: "重要公告" },
});
assert(
  raidServerLayerOptions.at(-1).content === "重要公告",
  "Raid 重要公告未使用原 layer 弹窗",
);
raidServerLayerOptions.at(-1).btn2();
assert(
  raidServerGmValues.get("HideVersionNoticeKey") === "2.0.0",
  "Raid 重要公告不再显示版本键发生变化",
);
const sharedFlow = { name: "共享流程", source: "say share" };
raidServerService.shareFlowTrigger("作者", "密码", "流程", sharedFlow);
raidServerRequest = raidServerAjaxRequests.at(-1);
assert(
  sharedFlow.author === "作者" &&
    raidServerRequest.data.username === "作者" &&
    JSON.parse(raidServerRequest.data.value).author === "作者",
  "Raid 分享未保持 data.author 原地修改或请求字段",
);
const raidServerRequestCount = raidServerAjaxRequests.length;
raidServerService.importFlow("非法码", "root");
raidServerService.importTrigger("非法码");
assert(
  raidServerAjaxRequests.length === raidServerRequestCount &&
    raidServerAlerts.at(-2) === "错误的流程分享码！" &&
    raidServerAlerts.at(-1) === "错误的触发器分享码！",
  "Raid 非法分享码仍发请求或错误文案发生变化",
);
raidServerService.importFlow("token·流程", "target");
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: JSON.stringify({ name: "导入流程", source: "say imported" }),
});
raidServerService.importTrigger("token·触发");
raidServerAjaxRequests.at(-1).success({
  code: 200,
  data: JSON.stringify({
    name: "导入触发",
    event: "room",
    conditions: [],
    source: "say trigger",
    active: true,
  }),
});
assert(
  raidServerCreatedFlows.at(-1).join("|") ===
      "导入流程|say imported|target" &&
    raidServerCreatedTriggers.at(-1)[0] === "导入触发",
  "Raid 单流程或触发器导入参数发生变化",
);
let raidServerPhone;
raidServerService._getPhone((value) => {
  raidServerPhone = value;
});
raidServerRequest = raidServerAjaxRequests.at(-1);
raidServerRequest.success('"13800000000"');
assert(
  raidServerRequest.url === "/UserAPI/GetPhone" &&
    raidServerRequest.async === true &&
    raidServerRequest.xhrFields.withCredentials === true &&
    raidServerPhone === "13800000000",
  "Raid 手机接口路径、凭据或引号清理发生变化",
);
const raidCompilerMessages = [];
const raidCompilerService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-compiler", {
    getFlowStore: () => ({
      get: (name) => (name === "child" ? "say child-($arg0)" : null),
    }),
    appendMessage: (message) => raidCompilerMessages.push(message),
  });
const raidPrecompiled = raidCompilerService.precompile(
  "\n// comment\n@call child target\n@exit\n",
);
const raidCompiled = raidCompilerService.compile(
  "[if] true\n  say yes\n[else]\n  say no",
);
assert(
  raidCompilerService.SourceCodeHelper.split("\nalpha\nbeta\n").join("|") ===
    "alpha|beta" &&
    raidCompilerService.SourceCodeHelper.appendHeader("  ", "a\nb").includes(
      "  b",
    ) &&
    raidPrecompiled.some((command) => command.includes("say child")) &&
    raidPrecompiled.some((command) => command.includes("[break]")) &&
    !raidPrecompiled.some((command) => command.includes("comment")) &&
    raidCompiled.includes("say yes") &&
    raidCompiled.includes("say no") &&
    raidCompiled.at(-1) === "%exit",
  "Raid 编译服务未保持源码切分、@call、兼容规则或条件编译行为",
);
raidCompilerService.precompile("@call missing");
assert(
  raidCompilerMessages.includes("<ord>未找到调用的流程 missing</ord>"),
  "Raid 编译服务未保留缺失子流程提示",
);
let raidStorageRoleId = "A";
const raidStorageAlerts = [];
const raidStorageValues = new Map([
  ["flow_store@null", { fallback: "say fallback" }],
  ["global_params@null", { FallbackValue: 7 }],
  ["@cmdgroup7", JSON.stringify({ name: "旧命令组", cmdsStr: "look\ngo north" })],
  ["workflow@A9", JSON.stringify({ name: "旧工作流", infos: [{ id: 7, repeat: 2 }] })],
]);
const raidStorageService =
  pluginModuleSandbox.window.WSMudPlugin.createService("raid-flow-storage", {
    getRoleId: () => raidStorageRoleId,
    storage: {
      get: (key, fallback) =>
        raidStorageValues.has(key) ? raidStorageValues.get(key) : fallback,
      set: (key, value) => raidStorageValues.set(key, value),
      remove: (key) => raidStorageValues.delete(key),
      list: () => [...raidStorageValues.keys()],
    },
    alert: (message) => raidStorageAlerts.push(message),
  });
assert(
  raidStorageService.FlowStore.get("fallback") === "say fallback" &&
    raidStorageService.PersistentVariables.get("FallbackValue") === 7,
  "Raid 存储服务未保持角色数据缺失时的 @null 回退",
);
raidStorageService.FlowStore.save("alpha", "say alpha");
raidStorageService.PersistentVariables.save("Power", 12);
assert(
  raidStorageValues.get("flow_store@A").alpha === "say alpha" &&
    raidStorageValues.get("global_params@A").Power === 12,
  "Raid 流程或全局变量未按当前角色键写入",
);
raidStorageService.FlowStore.corver({ overwritten: "say overwritten" });
assert(
  raidStorageService.FlowStore.get("overwritten") === "say overwritten" &&
    raidStorageService.FlowStore.get("alpha") === undefined,
  "Raid FlowStore.corver 历史覆盖入口未保持",
);
const raidWorkflowConfig = raidStorageService.WorkflowConfig;
assert(
  raidWorkflowConfig.createFinder("验证目录") === true &&
    raidWorkflowConfig.createWorkflow(
      "验证流程",
      "say workflow",
      "验证目录",
    ) === true &&
    raidWorkflowConfig.finderList("验证目录")[0].finder === "验证目录" &&
    raidStorageService.FlowStore.get("验证流程") === "say workflow" &&
    raidWorkflowConfig.getFinderNames().includes("验证目录"),
  "Raid 工作流目录、源码存储或 finder 兼容字段异常",
);
const translatedGroups = [
  { id: 1, name: "同名!" },
  { id: 2, name: "同名!" },
];
const translatedFlows = [{ id: 3, name: "同名" }];
const translatedNames = raidStorageService.CodeTranslator._newSingleName(
  translatedGroups,
  translatedFlows,
);
assert(
  translatedNames.group[0].name === "芫同名" &&
    translatedNames.group[1].name === "同名_1" &&
    translatedGroups[0].name === "芫同名",
  "Raid 旧配置转换未保持清洗、去重或输入对象原地修改",
);
assert(
  raidStorageService.CmdGroupManager.getName(7) === "旧命令组" &&
    raidStorageService.CmdGroupManager.getCmds(7).join("|") ===
      "look|go north" &&
    raidStorageService.WorkflowConfigManager.getAll().some(
      (workflow) => workflow.id === 9 && workflow.name === "旧工作流",
    ),
  "Raid 旧命令组或角色工作流键读取不兼容",
);
assert(
  raidStorageService.CmdGroupManager.updateCmdGroup(8, "", "look") === false &&
    raidStorageAlerts.includes("命令组想要一个名字..."),
  "Raid 旧命令组校验提示未保持",
);
raidStorageRoleId = "B";
assert(
  raidStorageService.FlowStore.get("fallback") === "say fallback" &&
    raidStorageService.FlowStore.get("验证流程") === undefined &&
    raidStorageService.WorkflowConfigManager.getAll().length === 0,
  "Raid 角色切换后仍读取上一角色的流程或旧工作流",
);
raidStorageService.FlowStore.save("beta", "say beta");
assert(
  raidStorageValues.get("flow_store@B").beta === "say beta" &&
    raidStorageValues.get("flow_store@A").beta === undefined,
  "Raid 角色 B 写入污染角色 A 流程存储",
);
const triggerTemplate = new triggerCore.TriggerTemplate(
  "测试触发事件",
  [
    new triggerCore.InputFilter(
      "关键字",
      triggerCore.inputFormats.text,
      "",
      triggerCore.containsFilter,
    ),
  ],
  "// 测试触发器",
);
triggerCore.templates.add(triggerTemplate);
assert(
  triggerCore.is_match("测试*", "测试触发") &&
    triggerCore.is_match("?试触发", "测试触发") &&
    !triggerCore.is_match("其他", "测试触发") &&
    triggerTemplate.getFilter("关键字").description() === "关键字" &&
    triggerTemplate.introdution.includes("如需更多信息"),
  "Trigger 核心服务未保持通配、模板或过滤器契约",
);
const triggerCenter = triggerCore.TriggerCenter;
assert(
  triggerCenter.create(
    "验证触发器",
    "测试触发事件",
    { 关键字: "hello" },
    "say test",
    true,
  ) === true &&
    triggerStorage.has("verify-role@triggers") &&
    triggerCenter.getAll().length === 1,
  "Trigger 核心服务未保持创建、角色存储键或加载契约",
);
triggerBus.post(
  new triggerBus.Notification("测试触发事件", {
    关键字: "hello world",
    value: 1,
  }),
);
assert(
  triggerPerformCalls.length === 1 &&
    triggerPerformCalls[0][1] === "验证触发器" &&
    triggerPerformCalls[0][2] === false &&
    triggerPerformCalls[0][0].includes("($value) = 1") &&
    triggerPerformCalls[0][0].includes("@print"),
  "Trigger 核心服务未保持条件过滤、变量注入或执行参数契约",
);
triggerCenter.deactivate("验证*");
triggerBus.post(
  new triggerBus.Notification("测试触发事件", { 关键字: "hello again" }),
);
assert(
  triggerPerformCalls.length === 1 &&
    triggerCenter.getAllData()["验证触发器"].active === false,
  "Trigger 核心服务未正确停用观察者或持久化状态",
);
triggerCenter.activate("验证触发器");
triggerBus.post(
  new triggerBus.Notification("测试触发事件", { 关键字: "hello again" }),
);
assert(
  triggerPerformCalls.length === 2 &&
    triggerCenter.getAllData()["验证触发器"].active === true,
  "Trigger 核心服务未正确激活观察者或持久化状态",
);
assert(
  triggerCenter.create("", "测试触发事件", {}, "say") ===
      "触发器的名称不能为空。" &&
    triggerCenter.create("bad-name", "测试触发事件", {}, "say") ===
      "触发器的名称只能使用中文、英文和数字字符。" &&
    triggerCenter.create("验证触发器", "测试触发事件", {}, "say") ===
      "无法修改名称，已经存在同名触发器！",
  "Trigger 核心服务未保持名称校验和中文错误信息",
);
triggerCenter.corver({
  imported: {
    name: "导入触发器",
    event: "测试触发事件",
    conditions: { 关键字: "import" },
    source: "say imported",
    active: false,
  },
});
assert(
  triggerCenter.getAll().length === 1 &&
    triggerCenter.getAll()[0].name === "导入触发器",
  "Trigger 核心服务未保持 corver 导入行为",
);
triggerCenter.remove("导入触发器");
assert(triggerCenter.getAll().length === 0, "Trigger 核心服务未移除触发器");
let triggerPayload = null;
const triggerObserver = triggerBus.observe("测试事件", (payload) => {
  triggerPayload = payload;
});
triggerBus.post(new triggerBus.Notification("测试事件", { value: 1 }));
assert(triggerPayload?.value === 1, "Trigger 事件总线未发布通知");
triggerBus.removeOberver(triggerObserver);
triggerPayload = null;
triggerBus.post(new triggerBus.Notification("测试事件", { value: 2 }));
assert(triggerPayload === null, "Trigger 事件总线未移除观察者");
const pluginMonitorHooks = [];
const pluginMonitorRemovedHooks = [];
const pluginMonitorTimers = new Map();
const pluginMonitorClearedTimers = [];
let pluginMonitorTimerId = 0;
const pluginMonitorWG = {
  add_hook: (type, handler) => {
    const id = ++pluginMonitorTimerId;
    pluginMonitorHooks.push({ id, type, handler });
    return id;
  },
  remove_hook: (id) => {
    pluginMonitorRemovedHooks.push(id);
  },
};
const pluginMonitorRole = { id: "verify-role" };
const pluginMonitorService =
  pluginModuleSandbox.window.WSMudPlugin.createService("trigger-monitors", {
    triggerCore,
    eventBus: triggerBus,
    getWG: () => pluginMonitorWG,
    getRole: () => pluginMonitorRole,
    timers: {
      setTimeout: (callback, delay) => {
        const id = ++pluginMonitorTimerId;
        pluginMonitorTimers.set(id, { callback, delay });
        return id;
      },
      clearTimeout: (id) => {
        pluginMonitorClearedTimers.push(id);
        pluginMonitorTimers.delete(id);
      },
    },
    Date,
  });
assert(
  triggerCore.templates.get("Buff状态改变") != null &&
    triggerCore.templates.get("伤害已满") != null,
  "Trigger 监控服务未注册历史模板",
);
let monitorBuffPayload = null;
const monitorBuffObserver = triggerBus.observe("Buff状态改变", (payload) => {
  monitorBuffPayload = payload;
});
assert(
  pluginMonitorService.start() === true &&
    pluginMonitorService.start() === false &&
    pluginMonitorHooks.length >= 13,
  "Trigger 监控服务未保持首次启动和幂等 Hook 注册",
);
pluginMonitorHooks.find((hook) => hook.type === "status").handler({
  action: "add",
  id: "verify-role",
  sid: "weapon",
  count: 1,
  duration: 10,
});
assert(
  monitorBuffPayload != null &&
    monitorBuffPayload.改变类型 === "新增" &&
    monitorBuffPayload.触发对象 === "自己",
  "Trigger 监控服务未保持 Buff 通知字段",
);
pluginMonitorHooks.find((hook) => hook.type === "dispfm").handler({
  id: "verify-skill",
  rtime: 1,
  distime: 100,
});
assert(
  pluginMonitorTimers.size >= 2,
  "Trigger 监控服务未保存时辰和技能冷却计时器",
);
const monitorObserver = triggerBus.observe("监控生命周期验证", () => {});
assert(pluginMonitorService.stop() === true, "Trigger 监控服务停止失败");
assert(
  pluginMonitorRemovedHooks.length === pluginMonitorHooks.length &&
    pluginMonitorClearedTimers.length >= 2 &&
    pluginMonitorTimers.size === 0,
  "Trigger 监控服务未清理自身 Hook 和计时器",
);
assert(
  pluginMonitorService.start() === true,
  "Trigger 监控服务停止后无法重新启动",
);
const pluginMonitorHooksBeforeReset = pluginMonitorHooks.length;
assert(
  pluginMonitorService.resetForRole() === true &&
    pluginMonitorRemovedHooks.length === pluginMonitorHooksBeforeReset &&
    pluginMonitorHooks.length > pluginMonitorHooksBeforeReset &&
    pluginMonitorTimers.size === 1,
  "Trigger 监控服务未提供可复用的角色重置 API",
);
pluginMonitorService.stop();
assert(pluginMonitorTimers.size === 0, "Trigger 角色重置后的计时器未能清理");
triggerBus.post(new triggerBus.Notification("监控生命周期验证", {}));
triggerBus.removeOberver(monitorObserver);
triggerBus.removeOberver(monitorBuffObserver);
const pluginHelperCommands = [];
const pluginHelperGoTargets = [];
let pluginHelperNpcRefreshes = 0;
const pluginHelperRoomItems = [
  { html: "<span>敌人</span>", itemid: "npc-1" },
  { html: "<span>尸体</span>", itemid: "corpse-1" },
];
const pluginHelperJquery = (target) => {
  if (target === ".room_items .room-item") return pluginHelperRoomItems;
  if (target === ".room-name") return { html: () => "测试房间" };
  return {
    html: () => target.html,
    attr: (name) => (name === "itemid" ? target.itemid : undefined),
  };
};
const pluginModuleWG = {
  add_hook: () => ({}),
  Send: (command) => pluginHelperCommands.push(command),
  go: (target) => pluginHelperGoTargets.push(target),
  SendCmd: (route) => pluginHelperGoTargets.push(route),
  update_npc_id: () => {
    pluginHelperNpcRefreshes += 1;
  },
};
const pluginModuleG = { selfStatus: [] };
let pluginCustomButtonList = [{ name: "测试按钮", send: "score" }];
let pluginCustomButtonMode = false;
let pluginEquipmentLoadouts = {};
let pluginSkillLoadouts = {};
const pluginModuleUI = pluginModuleSandbox.window.WSMudPlugin.createService(
  "automation-ui-templates",
  {
    legacy: {
      getCustomButtonList: () => [{ name: "测试按钮", send: "score" }],
      getLockedItems: () => ["测试物品"],
      getRaid: () => ({ existAutoDungeon: () => true }),
    },
  },
);
const pluginModuleServices = {};
let dataMaintenanceResetCount = 0;
const automationState = pluginModuleSandbox.window.WSMudPlugin.createService(
  "automation-state",
);
assert(
  typeof automationState.items.set === "function",
  "自动化状态服务未创建物品状态表",
);
automationState.level = "<hio>武帝</hio>";
assert(
  automationState.isGod() === true && automationState.connected === false,
  "自动化状态服务未保持等级判定或默认连接状态",
);
const commandRuntime = pluginModuleSandbox.window.WSMudPlugin.createService(
  "command-engine",
  {
    WG: {},
    G: {},
    L: {},
    services: {
      speech: { playtts: () => {} },
      beep: () => {},
      MusicBox: function MusicBox() {},
    },
    messageAppend: () => {},
    messageClear: () => {},
    legacy: {},
  },
);
assert(
  commandRuntime.T.recmd(0, "first;second") === "second" &&
    typeof commandRuntime.T.wait === "function" &&
    typeof commandRuntime.ProConsole.init === "function",
  "命令引擎服务未保持续接命令解析或控制台入口",
);
{
  const toEvents = [];
  let atShop = false;
  const toWG = {
    go: async (target) => {
      toEvents.push("go:" + target);
      await new Promise((resolve) => setTimeout(resolve, 40));
      atShop = true;
    },
    at: (target) => target === "扬州城-杂货铺" && atShop,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    waitUntilAt: async (target) => {
      toEvents.push("wait:" + target);
      while (!toWG.at(target)) await toWG.sleep(10);
      await toWG.sleep(10);
    },
    SendCmd: (command) => {
      toEvents.push("send:" + command);
    },
  };
  const toRuntime = pluginModuleSandbox.window.WSMudPlugin.createService(
    "command-engine",
    {
      WG: toWG,
      G: {},
      L: {},
      services: {
        speech: { playtts: () => {} },
        beep: () => {},
        MusicBox: function MusicBox() {},
      },
      messageAppend: () => {},
      messageClear: () => {},
      legacy: {},
    },
  );
  await toRuntime.T.to(0, "扬州城-杂货铺", "$to 扬州城-杂货铺;sell all");
  assert(
    toEvents.join(">") ===
      "go:扬州城-杂货铺>wait:扬州城-杂货铺>send:sell all" && atShop,
    "$to 未等待到达杂货铺就发出后续售卖命令",
  );
}
assert(
  pluginModuleUI.zdybtnui().includes("测试按钮(Q)") &&
    pluginModuleUI.itemui("测试物品").includes("移除物品锁") &&
    pluginModuleUI.fbui("测试副本", true, true).includes("自动副本-测试副本"),
  "UI 模板服务未通过显式接口读取按钮、物品锁或副本能力",
);
const customWorkflowSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
customWorkflowSandbox.window.window = customWorkflowSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/custom-workflows.js",
])
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    customWorkflowSandbox,
    { filename: sourcePath },
  );
const customWorkflowStorage = new Map([
  ["role-a_zml", [{ name: "甲流程", zmlType: "0", zmlRun: "score", zmlShow: 1 }]],
  ["role-a_zmlshowsetting", 0],
  ["role-b_zml", [{ name: "乙流程", zmlType: "0", zmlRun: "tasks", zmlShow: 1 }]],
  ["role-b_zmlshowsetting", 1],
]);
const customWorkflowAppends = [];
const customWorkflowBindings = [];
const customWorkflowRemovals = [];
const customWorkflowNodes = new Map();
function customWorkflowNode(selector) {
  if (customWorkflowNodes.has(selector)) return customWorkflowNodes.get(selector);
  const children = [];
  let bottom = "10px";
  const node = {
    children: () => children,
    empty: () => {
      children.length = 0;
      return node;
    },
    remove: () => {
      customWorkflowRemovals.push(selector);
      return node;
    },
    append: (html) => {
      customWorkflowAppends.push([selector, html]);
      const text = />([^<]*)<\/span>/.exec(html)?.[1] || "";
      const child = {
        textContent: text,
        remove: () => {
          const index = children.indexOf(child);
          if (index >= 0) children.splice(index, 1);
        },
      };
      children.push(child);
      return node;
    },
    off: (event) => {
      customWorkflowBindings.push([selector, "off", event]);
      return node;
    },
    on: (event, handler) => {
      customWorkflowBindings.push([selector, "on", event, handler]);
      return node;
    },
    css: (_name, value) => {
      if (value === undefined) return bottom;
      bottom = value;
      return node;
    },
  };
  customWorkflowNodes.set(selector, node);
  return node;
}
const customWorkflowCommands = [];
const customWorkflowRaidSources = [];
const customWorkflowLegacyScripts = [];
const customWorkflowMessages = [];
const customWorkflowVueOptions = [];
const customWorkflowPanelRuns = [];
const previousCustomWorkflowService = { previous: true };
const customWorkflowWG = {
  customWorkflows: previousCustomWorkflowService,
  isseted: false,
  SendCmd: async (command) => customWorkflowCommands.push(command),
  zmlfire: (entry) => customWorkflowPanelRuns.push(entry),
  ztjk_func: () => customWorkflowPanelRuns.push("start-status-monitor"),
  remove_hook: () => {},
};
let customWorkflowRoleId = "role-a";
let customWorkflowRoleName = "角色甲";
let customWorkflowLexicalList = [];
let customWorkflowDisplaySetting = 0;
let customWorkflowRaid = {
  perform: (source) => customWorkflowRaidSources.push(source),
};
function CustomWorkflowVue(options) {
  customWorkflowVueOptions.push(options);
}
customWorkflowSandbox.window.WSMudPlugin.installFeatures({
  WG: customWorkflowWG,
  G: { id: "player-id" },
  UI: { zmlandztjkui: "监控页面", zmlsetting: "流程页面" },
  T: { usezml: () => {} },
  L: { msg: (message) => customWorkflowMessages.push(message) },
  Vue: CustomWorkflowVue,
  services: {},
  jquery: customWorkflowNode,
  storage: {
    get: (key, fallback) =>
      customWorkflowStorage.has(key) ? customWorkflowStorage.get(key) : fallback,
    set: (key, value) => customWorkflowStorage.set(key, value),
  },
  messageAppend: (...args) => customWorkflowMessages.push(args),
  messageClear: () => customWorkflowMessages.push("clear"),
  executeLegacyScript: (source) => {
    customWorkflowLegacyScripts.push(source);
    return "legacy-result";
  },
  getRaid: () => customWorkflowRaid,
  legacy: {
    getRoleId: () => customWorkflowRoleId,
    getRoleName: () => customWorkflowRoleName,
    getWorkflows: () => customWorkflowLexicalList,
    setWorkflows: (value) => {
      customWorkflowLexicalList = value;
    },
    getWorkflowDisplaySetting: () => customWorkflowDisplaySetting,
    setWorkflowDisplaySetting: (value) => {
      customWorkflowDisplaySetting = value;
    },
  },
});
const customWorkflows = customWorkflowWG.customWorkflows;
await customWorkflows.zmlfire({ name: "普通", zmlType: "0", zmlRun: "score" });
await customWorkflows.zmlfire({ name: "旧普通", zmlType: "", zmlRun: "tasks" });
await customWorkflows.zmlfire({ name: "Raid", zmlType: "1", zmlRun: "@fb" });
const legacyWorkflowResult = await customWorkflows.zmlfire({
  name: "页面脚本",
  zmlType: "2",
  zmlRun: "needfind = replacement",
});
assert(
  customWorkflowCommands.join("|") === "score|tasks" &&
    customWorkflowRaidSources.join("|") === "@fb" &&
    customWorkflowLegacyScripts.join("|") === "needfind = replacement" &&
    legacyWorkflowResult === undefined &&
    customWorkflowMessages.some(
      (entry) => Array.isArray(entry) && entry[0] === "运行页面脚本" && entry[1] === 2,
    ),
  "自定义流程三种执行类型、历史空类型或运行提示发生变化",
);
customWorkflows.zml_showp();
assert(
  customWorkflowLexicalList === customWorkflowStorage.get("role-a_zml") &&
    customWorkflowAppends.some(
      ([selector, html]) => selector === ".room-commands" && html.includes("甲流程"),
    ),
  "自定义流程未按角色读取列表、同步词法别名或渲染房间快捷按钮",
);
customWorkflows.zmlztjk();
const roleAMonitorOptions = customWorkflowVueOptions.at(-1);
roleAMonitorOptions.methods.run(customWorkflowLexicalList[0]);
assert(
  customWorkflowPanelRuns[0] === customWorkflowLexicalList[0],
  "当前角色流程/监控面板不再转发运行入口",
);
customWorkflowPanelRuns.length = 0;
customWorkflowRoleId = "role-b";
customWorkflowRoleName = "角色乙";
customWorkflowDisplaySetting = 1;
customWorkflows.zml_showp();
assert(
  customWorkflowLexicalList === customWorkflowStorage.get("role-b_zml") &&
    customWorkflowDisplaySetting === 1 &&
    customWorkflowAppends.some(
      ([selector, html]) => selector === ".zdy-commands" && html.includes("乙流程"),
    ) &&
    customWorkflowWG.isseted === true &&
    customWorkflowNode(".tool-bar.right-bar").css("bottom") === "34px",
  "自定义流程角色切换、显示位置 fallback 或工具栏偏移发生变化",
);
roleAMonitorOptions.methods.run({ name: "过期流程" });
roleAMonitorOptions.methods.startjk();
assert(
  customWorkflowPanelRuns.length === 0,
  "旧角色流程/监控面板在切换后仍可执行新角色动作",
);
customWorkflows.zml_edit();
const editWorkflowOptions = customWorkflowVueOptions.at(-1);
const editWorkflowState = {
  singnalzml: { name: "新增", zmlType: "0", zmlRun: "look" },
  zmldata: customWorkflowLexicalList,
};
editWorkflowOptions.methods.add.call(editWorkflowState);
assert(
  customWorkflowStorage.get("role-b_zml").at(-1).name === "新增" &&
    customWorkflowLexicalList === customWorkflowStorage.get("role-b_zml") &&
    customWorkflowMessages.includes("保存成功"),
  "自定义流程 Vue 新增、角色存储键或词法列表同步发生变化",
);
customWorkflowRaid = {
  perform: (source) => customWorkflowRaidSources.push("new:" + source),
};
await customWorkflows.zmlfire({ name: "动态Raid", zmlType: "1", zmlRun: "@xy" });
assert(
  customWorkflowRaidSources.at(-1) === "new:@xy",
  "自定义流程缓存了旧 Raid 对象",
);
const appendsBeforeEmptyRole = customWorkflowAppends.length;
customWorkflowRoleId = "role-c";
customWorkflowRoleName = "角色丙";
customWorkflows.zml_showp();
assert(
  customWorkflowLexicalList.length === 0 &&
    customWorkflowDisplaySetting === 0 &&
    customWorkflowAppends.length === appendsBeforeEmptyRole,
  "无配置的新角色继承了上一角色的流程或快捷按钮位置",
);
const staleEditorState = {
  singnalzml: { name: "旧编辑器保存", zmlType: "0", zmlRun: "score" },
  zmldata: customWorkflowStorage.get("role-b_zml"),
};
const appendsBeforeStaleEditor = customWorkflowAppends.length;
editWorkflowOptions.methods.add.call(staleEditorState);
editWorkflowOptions.methods.showp.call(
  staleEditorState,
  staleEditorState.zmldata[0],
);
assert(
  customWorkflowStorage.get("role-b_zml").at(-1).name === "旧编辑器保存" &&
    !customWorkflowStorage.has("role-c_zml") &&
    customWorkflowLexicalList.length === 0 &&
    customWorkflowAppends.length === appendsBeforeStaleEditor,
  "旧角色 Vue 编辑器在切换后污染了新角色存储、词法列表或快捷按钮",
);
customWorkflowRoleId = "role-a";
customWorkflows.zml_showp();
assert(
  customWorkflowLexicalList === customWorkflowStorage.get("role-a_zml") &&
    customWorkflowDisplaySetting === 0,
  "切回已有角色后未恢复该角色的流程和显示位置",
);
customWorkflowSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  customWorkflowWG.customWorkflows === previousCustomWorkflowService &&
    customWorkflowRemovals.includes(".act-item-zdy"),
  "自定义流程销毁未恢复旧服务或移除快捷按钮",
);
pluginModuleSandbox.window.WSMudPlugin.installFeatures({
  WG: pluginModuleWG,
  G: pluginModuleG,
  UI: pluginModuleUI,
  T: { goyt: () => {} },
  L: { msg: () => {} },
  Vue: pluginModuleSandbox.Vue,
  services: pluginModuleServices,
  jquery: pluginHelperJquery,
  clone: (value) => ({ ...value }),
  timers: { setTimeout, clearTimeout },
  storage: { get: (_key, fallback) => fallback, set: () => {} },
  messageAppend: () => {},
  messageClear: () => {},
  executeLegacyScript: () => {},
  legacy: {
    getRoleId: () => undefined,
    getRoleName: () => undefined,
    getCustomButtonList: () => pluginCustomButtonList,
    setCustomButtonList: (value) => {
      pluginCustomButtonList = value;
    },
    getCustomButtonMode: () => pluginCustomButtonMode,
    setCustomButtonMode: (value) => {
      pluginCustomButtonMode = value;
    },
    getEquipmentLoadouts: () => pluginEquipmentLoadouts,
    setEquipmentLoadouts: (value) => {
      pluginEquipmentLoadouts = value;
    },
    getSkillLoadouts: () => pluginSkillLoadouts,
    setSkillLoadouts: (value) => {
      pluginSkillLoadouts = value;
    },
    copyToClipboard: () => {},
    getCustomSkillList: () => undefined,
    getDisabledPerforms: () => "",
    setDisabledPerforms: () => {},
    getBlockedPerforms: () => [],
    getPackGoods: () => ({}),
    getGoods: () => ({}),
    resetPackGoods: () => {
      dataMaintenanceResetCount += 1;
    },
    getNpcs: () => ({ 商人: "seller-1", 店小二: "waiter-1" }),
    getBossSettings: () => ({
      blacklist: [],
      pfmDelay: 1,
      waitSeconds: 1,
      autoEquipment: "",
    }),
    getBossRoutes: () => ({}),
    getAutoCommand: () => "",
    getCustomStoreList2: () => "",
    setCustomStoreList2: () => {},
    getCustomItemLock: () => "",
    setCustomItemLock: () => {},
    getCustomItemDrop: () => "",
    setCustomItemDrop: () => {},
    getCustomItemDisassemble: () => "",
    setCustomItemDisassemble: () => {},
    getLockList: () => [],
    replaceStoreList: () => {},
    replaceLockList: () => {},
    replaceDropList: () => {},
    replaceDisassembleList: () => {},
    setCustomStoreList: () => {},
    getEquipment: () => ({ 铁剑: "sword-1" }),
    getPackData: () => pluginPackData,
    getRoomData: () => pluginHelperRoomItems,
    loadStatusMonitors: () => [],
    getPlaceRoutes: () => ({ "扬州城-打铁铺": "扬州城-打铁铺" }),
    getNeedFindRoutes: () => ({}),
    getSaveAddress: () => "关",
    getWorkTimer: () => 0,
    setWorkTimer: () => {},
    isTransportAvailable: () => true,
    getSendCommand: () => (command) =>
      command === "扬州城-打铁铺"
        ? pluginHelperGoTargets.push(command)
        : pluginHelperCommands.push(command),
    setStopAuto: () => {},
    getProConsole: () => ({ init: () => {} }),
    getPushSettings: () => ({ enabled: "关", type: null, token: null }),
    getRaid: () => null,
    getTimeQuestions: () => [],
    setTimeQuestions: () => {},
    getDpsState: () => ({ lock: 0, battleTime: 0 }),
    resetDpsState: () => {},
    formatChineseUnit: String,
    renderActionButtons: () => "",
  },
});
pluginModuleWG.clean_id_all(false);
assert(
  pluginModuleWG.buy({ sales: "商人", id: "item-1" }) === true &&
    pluginModuleWG.Give("gift-1") === true,
  "物品命令辅助未保持购买或赠送返回契约",
);
pluginModuleWG.eq("铁剑");
pluginModuleWG.ask("商人", "2");
pluginModuleWG.kill_all();
pluginModuleWG.get_all();
await pluginModuleWG.clean_all();
assert(
  pluginHelperCommands.join("|") ===
    "list seller-1|buy 1 item-1 from seller-1|give waiter-1 gift-1|" +
      "eq sword-1|ask2 seller-1|kill npc-1|get all from npc-1|" +
      "get all from corpse-1|sell all" &&
    pluginHelperGoTargets[0] === "扬州城-打铁铺" &&
    pluginHelperNpcRefreshes === 0,
  "物品命令辅助未保持装备、询问、清场或清包命令",
);
clearTimeout(pluginModuleWG.dashboardStateRefreshTimer);
pluginModuleWG.dashboardStateRefreshTimer = null;
pluginModuleWG.dashboardStateRefreshNeedsPack = false;
assert(
  typeof pluginModuleWG.zdybtnfunc === "function" &&
    typeof pluginModuleWG.zdy_btnset === "function" &&
    typeof pluginModuleWG.zdy_btnListInit === "function" &&
    typeof pluginModuleWG.zdy_btnshow === "function" &&
    typeof pluginModuleWG.haspack === "function" &&
    typeof pluginModuleWG.eqhelper === "function" &&
    typeof pluginModuleWG.eqhelperdel === "function" &&
    typeof pluginModuleWG.uneqall === "function" &&
    typeof pluginModuleWG.eqloader === "function" &&
    typeof pluginModuleWG.eqhelperui === "function",
  "自定义快捷按钮或装备套装模块未保持 WG 公开入口",
);
pluginModuleSandbox.jQuery = {
  Deferred() {
    let value;
    const promise = {
      then(callback) {
        return Promise.resolve(value).then(callback);
      },
    };
    return {
      resolve(nextValue) {
        value = nextValue;
      },
      promise() {
        return promise;
      },
    };
  },
};
const equipmentMenuPromise = pluginModuleWG.eqloader();
assert(
  equipmentMenuPromise && typeof equipmentMenuPromise.then === "function",
  "装备套装菜单未保持 jQuery Deferred promise 接口",
);
const weddingTimers = new Map();
const weddingHooks = [];
const weddingRemovedHooks = [];
const weddingMessages = [];
const weddingCommands = [];
const weddingSent = [];
const weddingGoTargets = [];
let weddingTimerId = 0;
let weddingHookId = 0;
let weddingRoomData;
const weddingCloseButton = {
  handler: null,
  off(eventName) {
    if (eventName === "click.wsmudWedding") this.handler = null;
    return this;
  },
  on(eventName, handler) {
    if (eventName === "click.wsmudWedding") this.handler = handler;
    return this;
  },
};
const weddingSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null, cookie: "" },
  setTimeout: (callback, delay) => {
    const id = ++weddingTimerId;
    weddingTimers.set(id, { callback, delay });
    return id;
  },
  clearTimeout: (id) => weddingTimers.delete(id),
};
weddingSandbox.window.window = weddingSandbox.window;
weddingSandbox.$ = (selector) =>
  selector === "#closeauto" ? weddingCloseButton : { off: () => {}, on: () => {} };
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/wedding-automation.js",
  "features/plugin/room-state-bridge.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    weddingSandbox,
    { filename: sourcePath },
  );
}
const weddingWG = {
  add_hook: (types, fn) => {
    const hook = ++weddingHookId;
    weddingHooks.push({ hook, types, fn });
    return hook;
  },
  remove_hook: (hook) => weddingRemovedHooks.push(hook),
  Send: (command) => weddingSent.push(command),
  SendCmd: (command) => weddingCommands.push(command),
  go: (target) => weddingGoTargets.push(target),
  zdwk: () => weddingCommands.push("zdwk"),
};
weddingSandbox.console = { log: () => {} };
weddingSandbox.weddingTimers = weddingTimers;
weddingSandbox.window.WSMudPlugin.installFeatures({
  WG: weddingWG,
  jquery: weddingSandbox.$,
  timers: {
    setTimeout: weddingSandbox.setTimeout,
    clearTimeout: weddingSandbox.clearTimeout,
  },
  logger: weddingSandbox.console,
  legacy: {
    getAutoCommand: () => "say after-wedding",
    setRoomData: (value) => {
      weddingRoomData = value;
    },
  },
  messageAppend: (message) => weddingMessages.push(message),
});
const weddingRoomHook = weddingHooks.find(
  (entry) => entry.types === "items",
);
assert(
  typeof weddingWG.saveRoomstate === "function" && weddingRoomHook,
  "房间状态桥未注册公开保存入口或 items Hook",
);
weddingRoomHook.fn({ type: "items", items: [{ id: "room-item" }] });
assert(
  weddingRoomData?.[0]?.id === "room-item",
  "房间状态桥未通过 legacy accessor 保存 items 快照",
);
const firstWeddingPromise = weddingWG.xiyan();
assert(
  firstWeddingPromise && typeof firstWeddingPromise.then === "function" &&
    weddingSent.includes("stopstate") &&
    weddingGoTargets.includes("扬州城-喜宴") &&
    weddingWG.marryhy != null,
  "婚宴入口未保持 Promise、停状态、目的地或公开 Hook 行为",
);
const firstWeddingHook = weddingWG.marryhy;
weddingWG.xiyan();
assert(
  weddingWG.marryhy !== firstWeddingHook &&
    weddingRemovedHooks.includes(firstWeddingHook),
  "重复启动婚宴时旧 Hook 未被清理",
);
const weddingLoginHook = weddingHooks.find((entry) => entry.types === "login");
assert(weddingLoginHook, "婚宴模块未注册可清理的 login Hook");
weddingLoginHook.fn({ type: "login", id: "next-role" });
assert(
  weddingWG.marryhy === null &&
    [...weddingTimers.values()].length === 0,
  "角色切换/重连时婚宴 login Hook 未清理状态",
);
// Re-start after the login cleanup so timeout and close use a fresh generation.
weddingWG.xiyan();
let activeWeddingHook = weddingHooks.find(
  (entry) => entry.hook === weddingWG.marryhy,
);
activeWeddingHook.fn({
  type: "cmds",
  items: [{ name: "1金贺礼", cmd: "give gold" }],
});
activeWeddingHook.fn({
  type: "text",
  msg: "店小二拦住你说道：怎么又是你，每次都跑这么快，等下再进去。",
});
assert(
  weddingCommands.includes("give gold;go up;$wait 2000;go down;go up") &&
    weddingMessages.includes("<hiy>你太勤快了, 1秒后回去挖矿</hiy>"),
  "婚宴贺礼命令或限流提示未保持",
);
activeWeddingHook.fn({
  type: "items",
  items: [{ id: "table-1", name: ">婚宴礼桌<" }],
});
assert(
  weddingSent.includes("get all from table-1") &&
    weddingWG.marryhy === null,
  "婚宴礼桌响应未拾取或清空公开 Hook 状态",
);
weddingWG.xiyan();
const timeoutWeddingHook = weddingWG.marryhy;
const timeoutWeddingTimer = [...weddingTimers.entries()].at(-1)?.[0];
assert(timeoutWeddingHook != null && timeoutWeddingTimer != null, "婚宴超时资源未创建");
const timeoutWeddingCallback = weddingTimers.get(timeoutWeddingTimer).callback;
weddingTimers.delete(timeoutWeddingTimer);
timeoutWeddingCallback();
assert(
  weddingWG.marryhy === null &&
    weddingCommands.includes("say after-wedding") &&
    weddingRemovedHooks.includes(timeoutWeddingHook),
  "婚宴超时未清理 Hook 或执行后续命令",
);
weddingWG.xiyan();
const closeWeddingHook = weddingWG.marryhy;
const closeWeddingTimer = [...weddingTimers.entries()].at(-1)?.[0];
assert(weddingCloseButton.handler, "婚宴关闭按钮未绑定命名空间事件");
weddingCloseButton.handler();
assert(
  weddingWG.marryhy === null &&
    !weddingTimers.has(closeWeddingTimer) &&
    weddingRemovedHooks.includes(closeWeddingHook) &&
    weddingMessages.includes("已停止后命令"),
  "婚宴关闭入口未清理独立计时器、Hook 或提示",
);
weddingSandbox.window.WSMudPlugin.destroyFeatures();
assert(
    weddingWG.marryhy === null &&
    weddingWG.saveRoomstate === undefined &&
    weddingRemovedHooks.includes(weddingRoomHook.hook) &&
    weddingRemovedHooks.includes(weddingLoginHook.hook) &&
    weddingCloseButton.handler === null,
  "婚宴/房间状态模块销毁后仍残留公开状态或 Hook",
);
const transportNativeCalls = [];
const transportFallbackCalls = [];
const transportMessages = [];
const transportTimers = new Map();
const transportDispatches = [];
let transportTimerId = 0;
let transportAvailable = true;
let transportStopAuto = false;
let transportConsoleInitializations = 0;
let transportNpcs = { 商人: "npc-shop" };
let transportRoomData = [{ id: "npc-room", name: "路人甲" }];
let transportPackGoods = { 药丸: { id: "pill-1" } };
const transportSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
transportSandbox.window.window = transportSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/command-transport.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    transportSandbox,
    { filename: sourcePath },
  );
}
const transportG = { cmd_echo: false };
const transportWG = {};
const transportT = {
  wait: (...args) => transportDispatches.push(["wait", ...args]),
  pname: (...args) => transportDispatches.push(["pname", ...args]),
};
const transportJquery = () => {
  let command;
  return {
    attr(name, value) {
      if (name === "cmd") command = value;
      return this;
    },
    click() {
      transportFallbackCalls.push(command);
      return this;
    },
  };
};
transportSandbox.window.WSMudPlugin.installFeatures({
  WG: transportWG,
  G: transportG,
  T: transportT,
  jquery: transportJquery,
  timers: {
    setTimeout: (fn, delay) => {
      const id = ++transportTimerId;
      transportTimers.set(id, { fn, delay });
      return id;
    },
  },
  messageAppend: (message) => transportMessages.push(message),
  legacy: {
    isTransportAvailable: () => transportAvailable,
    getSendCommand: () => (command, immediate) =>
      transportNativeCalls.push([command, immediate]),
    setStopAuto: (value) => {
      transportStopAuto = value;
    },
    getNpcs: () => transportNpcs,
    getRoomData: () => transportRoomData,
    getPackGoods: () => transportPackGoods,
    getProConsole: () => ({
      init: () => {
        transportConsoleInitializations += 1;
      },
    }),
  },
});
await transportWG.Send("score;score2");
assert(
  JSON.stringify(transportNativeCalls) ===
    JSON.stringify([["score;score2", true]]),
  "命令传输直连路径未保持整串 immediate 发送",
);
transportAvailable = false;
await transportWG.Send("look;cha");
assert(
  transportFallbackCalls.join("|") === "look|cha",
  "命令传输回退路径未逐项触发原生 cmd 点击",
);
transportFallbackCalls.length = 0;
await transportWG.SendCmd("kill %商人%;look %路人%;get *药丸*");
assert(
  transportFallbackCalls.join("|") ===
    "kill npc-shop|look npc-room|get pill-1",
  "SendCmd 未保持 NPC、房间人物或背包物品替换顺序",
);
transportNpcs = { 商人: "npc-new" };
transportRoomData = [{ id: "room-new", name: "后来路人" }];
transportPackGoods = { 药丸: { id: "pill-new" } };
transportFallbackCalls.length = 0;
await transportWG.SendCmd("kill %商人%,look %后来%,get *药丸*");
assert(
  transportFallbackCalls.join("|") ===
    "kill npc-new|look room-new|get pill-new",
  "SendCmd 缓存了旧 NPC、房间或物品表，或改变了逗号拆分",
);
await transportWG.SendCmd("look;$wait 200;score");
assert(
  transportDispatches[0]?.[0] === "wait" &&
    transportDispatches[0]?.[1] === 1 &&
    transportDispatches[0]?.[2] === "200" &&
    transportDispatches[0]?.[3] === "look;$wait 200;score",
  "SendCmd 未保持行首 $ 命令的索引、参数或完整续接串",
);
await transportWG.SendCmd('ask $pname("程药发");score');
await transportWG.SendCmd('ask $pname("第二人") later;score');
assert(
  transportDispatches[1]?.[0] === "pname" &&
    transportDispatches[1]?.[2] === "程药发" &&
    transportDispatches[2]?.[2] === "第二人",
  "SendCmd 未保持末 token 或第二 token 的 $ 函数分派",
);
let transportSleepFinished = false;
const transportSleep = transportWG.sleep(321).then(() => {
  transportSleepFinished = true;
});
const transportSleepTimer = [...transportTimers.entries()].find(
  ([, timer]) => timer.delay === 321,
);
assert(transportSleepTimer && !transportSleepFinished, "WG.sleep 未使用显式计时器");
transportTimers.delete(transportSleepTimer[0]);
transportSleepTimer[1].fn();
await transportSleep;
transportFallbackCalls.length = 0;
const transportStep = transportWG.SendStep("step one;step two");
await Promise.resolve();
let transportStepTimer = [...transportTimers.entries()].find(
  ([, timer]) => timer.delay === 12e3,
);
assert(
  transportFallbackCalls.join("|") === "step one" && transportStepTimer,
  "SendStep 未在第一条命令后等待 12 秒",
);
transportTimers.delete(transportStepTimer[0]);
transportStepTimer[1].fn();
await Promise.resolve();
await Promise.resolve();
transportStepTimer = [...transportTimers.entries()].find(
  ([, timer]) => timer.delay === 12e3,
);
assert(
  transportFallbackCalls.join("|") === "step one|step two" &&
    transportStepTimer,
  "SendStep 未按顺序执行第二条命令或末项等待",
);
transportTimers.delete(transportStepTimer[0]);
transportStepTimer[1].fn();
await transportStep;
transportWG.stopAllAuto();
assert(transportStopAuto === true, "stopAllAuto 未写入共享停止标记");
transportWG.reSetAllAuto();
assert(transportStopAuto === false, "reSetAllAuto 未恢复共享停止标记");
transportWG.cmd_echo_button();
transportWG.cmd_echo_button();
assert(
  transportG.cmd_echo === false &&
    transportConsoleInitializations === 1 &&
    transportMessages.join("|") ===
      "<hio>命令代码显示</hio>|<hio>命令代码关闭</hio>",
  "命令回显开关未保持控制台初始化或提示顺序",
);
transportSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  transportWG.Send === undefined &&
    transportWG.SendCmd === undefined &&
    transportWG.sleep === undefined,
  "命令传输模块销毁后仍残留公开入口",
);
const inventoryListValues = new Map();
const inventoryListInputs = new Map();
const inventoryListMessages = [];
let inventoryListRole = "role-a";
let inventoryListPack = [0, { id: 7, name: "七号" }, { id: "7", name: "七号副本" }];
let customStoreList2 = "";
let customItemLock = "";
let customItemDrop = "";
let customItemDisassemble = "";
let currentStoreList = ["基础仓库物品"];
let currentLockList = [];
let currentDropList = [];
let currentDisassembleList = [];
const inventoryListSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
inventoryListSandbox.window.window = inventoryListSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/inventory-list-settings.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    inventoryListSandbox,
    { filename: sourcePath },
  );
}
const inventoryListWG = {};
inventoryListSandbox.window.WSMudPlugin.installFeatures({
  WG: inventoryListWG,
  jquery: (selector) => ({
    val(value) {
      inventoryListInputs.set(selector, value);
      return this;
    },
  }),
  storage: {
    get: (key, fallback) => inventoryListValues.get(key) ?? fallback,
    set: (key, value) => inventoryListValues.set(key, value),
  },
  messageAppend: (message) => inventoryListMessages.push(message),
  legacy: {
    getRoleId: () => inventoryListRole,
    getPackData: () => inventoryListPack,
    getCustomStoreList2: () => customStoreList2,
    setCustomStoreList2: (value) => { customStoreList2 = value; },
    getCustomItemLock: () => customItemLock,
    setCustomItemLock: (value) => { customItemLock = value; },
    getCustomItemDrop: () => customItemDrop,
    setCustomItemDrop: (value) => { customItemDrop = value; },
    getCustomItemDisassemble: () => customItemDisassemble,
    setCustomItemDisassemble: (value) => { customItemDisassemble = value; },
    getLockList: () => currentLockList,
    replaceStoreList: (value) => { currentStoreList = value; },
    replaceLockList: (value) => { currentLockList = value; },
    replaceDropList: (value) => { currentDropList = value; },
    replaceDisassembleList: (value) => { currentDisassembleList = value; },
  },
});
const inventoryNames = [];
inventoryListWG.getItemNameByid("7", (name) => inventoryNames.push(name));
assert(
  inventoryNames.join("|") === "七号|七号副本",
  "物品名称查询未保持跳过占位项、宽松 ID 比较或多次回调",
);
inventoryListWG.addstore("丹药");
inventoryListWG.addstore("矿石");
assert(
  inventoryListValues.get("role-a_zdy_item_store2") === "丹药,矿石" &&
    currentStoreList.join("|") === "丹药|矿石" &&
    inventoryListInputs.get("#store_info2") === "丹药,矿石",
  "自定义存仓未同步角色键、实时列表或输入框",
);
inventoryListWG.addlock("宝剑");
inventoryListWG.addlock("宝剑");
inventoryListWG.dellock("宝剑");
assert(
  customItemLock === "宝剑" &&
    currentLockList.join("|") === "宝剑" &&
    inventoryListValues.get("role-a_zdy_item_lock") === "宝剑",
  "物品锁未保留重复项或只删除首个匹配项",
);
inventoryListWG.addfenjieid("旧甲");
inventoryListWG.adddrop("<hio>神兵</hio>");
inventoryListWG.adddrop("布鞋");
assert(
    currentDisassembleList.join("|") === "旧甲" &&
    currentDropList.join("|") === "布鞋" &&
    inventoryListValues.get("role-a_zdy_item_drop") === "布鞋" &&
    inventoryListMessages.includes("高级物品,不添加整理时丢弃<hio>神兵</hio>") &&
    inventoryListInputs.get("#store_fenjie_info") === "旧甲" &&
    inventoryListInputs.get("#store_drop_info") === "布鞋",
  "分解/丢弃清单未保持高级物品过滤、存储或 DOM 同步",
);
inventoryListRole = "role-b";
customItemDrop = "";
inventoryListWG.adddrop("草鞋");
assert(
  inventoryListValues.get("role-b_zdy_item_drop") === "草鞋" &&
    inventoryListValues.get("role-a_zdy_item_drop") === "布鞋",
  "物品清单模块缓存了旧角色存储键",
);
inventoryListPack = [{ id: "next", name: "新物品" }];
let dynamicInventoryName;
inventoryListWG.getItemNameByid("next", (name) => { dynamicInventoryName = name; });
assert(dynamicInventoryName === "新物品", "物品名称查询缓存了旧背包快照");
inventoryListSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  inventoryListWG.addstore === undefined &&
    inventoryListWG.adddrop === undefined &&
    inventoryListWG.getItemNameByid === undefined,
  "物品清单模块销毁后仍残留公开入口",
);
const legacyMonitorHooks = new Map();
const legacyMonitorRemoved = [];
const legacyMonitorCommands = [];
const legacyMonitorMessages = [];
const legacyMonitorItems = [];
let legacyMonitorRoomData = [];
const legacyMonitorSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
legacyMonitorSandbox.window.window = legacyMonitorSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/legacy-status-monitors.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    legacyMonitorSandbox,
    { filename: sourcePath },
  );
}
const legacyMonitorG = {
  id: "self",
  items: new Map([
    ["self", { hp: 20, max_hp: 100, mp: 10, max_mp: 100 }],
    ["target", { hp: 5, max_hp: 100, mp: 90, max_mp: 100 }],
  ]),
};
const legacyMonitorWG = {
  ztjk_hook: 77,
  add_hook: (types, fn) => {
    const id = types === "login" ? 99 : 0;
    legacyMonitorHooks.set(id, { types, fn });
    return id;
  },
  remove_hook: (id) => {
    legacyMonitorRemoved.push(id);
    legacyMonitorHooks.delete(id);
  },
  SendCmd: (command) => legacyMonitorCommands.push(command),
  deserializePackData: () => ({ name: "灵药", id: "medicine-1" }),
  find_item: () => "target",
};
legacyMonitorSandbox.window.WSMudPlugin.installFeatures({
  WG: legacyMonitorWG,
  G: legacyMonitorG,
  clone: (value) => ({ ...value }),
  messageAppend: (message) => legacyMonitorMessages.push(message),
  legacy: {
    loadStatusMonitors: () => legacyMonitorItems,
    getRoomData: () => legacyMonitorRoomData,
  },
});
legacyMonitorItems.push({
  name: "层数监控",
  type: "status",
  action: "add",
  keyword: "burn",
  ishave: "1",
  maxcount: "3",
  istip: "0",
  send: "cure {id}",
  isactive: 1,
});
assert(
  legacyMonitorWG.ztjk_func() === undefined &&
    legacyMonitorWG.ztjk_func() === undefined,
  "旧状态监控公开入口返回值发生变化",
);
assert(
  legacyMonitorWG.ztjk_hook === 0 &&
    legacyMonitorRemoved.includes(0) &&
    legacyMonitorHooks.size === 2,
  "旧状态监控重复注入未精确复用唯一 Hook，或 Hook ID 0 被误判",
);
let legacyMonitorHandler = legacyMonitorHooks.get(0).fn;
legacyMonitorHandler({
  type: "status",
  action: "add",
  sid: "effect_burn",
  name: "灼烧",
  id: "self",
  count: 2,
});
assert(
  legacyMonitorCommands.at(-1) === "cure self" &&
    legacyMonitorMessages.at(-1) === "当前层数2,已触发层数监控",
  "旧 status 层数、本人判断或 {id} 替换语义发生变化",
);
legacyMonitorItems.splice(0, legacyMonitorItems.length, {
  name: "文本监控",
  type: "text",
  keyword: "甲|乙",
  istip: "1",
  send: "tm {content}",
  isactive: 1,
});
legacyMonitorHandler({ type: "text", msg: "甲,;\n乙" });
assert(
  legacyMonitorCommands.slice(-2).join("|") === "tm 甲乙|tm 甲乙",
  "旧 text 多关键词重复触发或 {content} 清洗发生变化",
);
legacyMonitorItems.splice(0, legacyMonitorItems.length, {
  name: "背包监控",
  type: "dialog",
  keyword: "灵药",
  istip: "1",
  send: "use {id}",
  isactive: 1,
});
legacyMonitorHandler({ type: "dialog", dialog: "pack", items: [] });
assert(
  legacyMonitorCommands.at(-1) === "use medicine-1",
  "旧 pack 解码或物品 {id} 替换发生变化",
);
legacyMonitorItems.splice(0, legacyMonitorItems.length, {
  name: "血蓝监控",
  type: "sc",
  keyword: "30|20",
  ishave: "1",
  istip: "0",
  send: "recover",
  isactive: 1,
});
legacyMonitorHandler({ type: "sc", id: "self" });
assert(
  legacyMonitorCommands.slice(-2).join("|") === "recover|recover",
  "旧 sc 气血与内力两个独立阈值触发语义发生变化",
);
legacyMonitorItems.splice(0, legacyMonitorItems.length, {
  name: "房间监控",
  type: "room",
  keyword: "店小二",
  istip: "1",
  send: "say {name}",
  isactive: 1,
});
legacyMonitorRoomData = [{ id: "npc-1", name: "店小二" }];
legacyMonitorHandler({ type: "room", name: "扬州城-客栈" });
assert(
  legacyMonitorCommands.at(-1) === "say 扬州城-客栈",
  "旧 room 场景人物匹配或 {name} 替换发生变化",
);
legacyMonitorItems.splice(
  0,
  legacyMonitorItems.length,
  {
    name: "频道监控",
    type: "msg",
    keyword: "公告",
    senduser: "系统",
    istip: "0",
    send: "tm {content}",
    isactive: 1,
  },
  {
    name: "死亡监控",
    type: "die",
    keyword: "任意",
    istip: "0",
    send: "relive",
    isactive: 1,
  },
  {
    name: "拾取监控",
    type: "itemadd",
    keyword: "宝箱",
    ishave: "2",
    istip: "0",
    send: "get {id}",
    isactive: 1,
  },
  {
    name: "战斗监控",
    type: "combat",
    keyword: "start|end",
    istip: "0",
    send: "prepare",
    isactive: 1,
  },
  {
    name: "技能启用",
    type: "enapfm",
    keyword: "force.x",
    istip: "0",
    send: "say enabled",
    isactive: 1,
  },
  {
    name: "技能释放",
    type: "dispfm",
    keyword: "sword.y",
    istip: "0",
    send: "say performed",
    isactive: 1,
  },
);
legacyMonitorHandler({ type: "msg", ch: "sys", name: "", content: "系统公告" });
legacyMonitorHandler({ type: "die", commands: [] });
legacyMonitorHandler({ type: "itemadd", name: "神秘宝箱", id: "box-1" });
legacyMonitorHandler({ type: "combat", start: 1 });
legacyMonitorHandler({ type: "enapfm", id: "force.x" });
legacyMonitorHandler({ type: "dispfm", id: "sword.y" });
assert(
  legacyMonitorCommands.slice(-6).join("|") ===
    "tm 系统公告|relive|get box-1|prepare|say enabled|say performed",
  "旧 msg/die/itemadd/combat/enapfm/dispfm 分支发生变化",
);
legacyMonitorWG.resetLegacyStatusMonitors();
assert(
  legacyMonitorWG.ztjk_hook === undefined && !legacyMonitorHooks.has(0),
  "旧状态监控重置未清理当前 Hook",
);
legacyMonitorWG.ztjk_func();
legacyMonitorHooks.get(99).fn({ type: "login" });
assert(
  legacyMonitorWG.ztjk_hook === undefined && !legacyMonitorHooks.has(0),
  "登录变化未清理旧状态监控 Hook",
);
legacyMonitorSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  legacyMonitorWG.ztjk_func === undefined &&
    legacyMonitorWG.resetLegacyStatusMonitors === undefined &&
    legacyMonitorWG.ztjk_hook === 77,
  "旧状态监控模块销毁后仍残留公开入口或未恢复原公开字段",
);
const yaotaHooks = new Map();
const yaotaTimers = new Map();
const yaotaAppends = [];
const yaotaBefore = [];
const yaotaRemovedSelectors = [];
const yaotaCommands = [];
let yaotaHookId = 0;
let yaotaTimerId = 0;
let yaotaFree = false;
const yaotaSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
yaotaSandbox.window.window = yaotaSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/yaota-automation.js",
]) {
  runInNewContext(readFileSync(join(extensionRoot, sourcePath), "utf8"), yaotaSandbox, {
    filename: sourcePath,
  });
}
const yaotaWG = {
  add_hook: (type, fn) => {
    const id = yaotaHookId++;
    yaotaHooks.set(id, { type, fn });
    return id;
  },
  remove_hook: (id) => yaotaHooks.delete(id),
  is_free: () => yaotaFree,
  SendCmd: (command) => yaotaCommands.push(command),
};
const yaotaG = { yaotaFlag: false, yaotaCount: 0, yaoyuan: 0 };
yaotaSandbox.window.WSMudPlugin.installFeatures({
  WG: yaotaWG,
  G: yaotaG,
  jquery: (selector) => ({
    append: (html) => yaotaAppends.push([selector, html]),
    before: (html) => yaotaBefore.push([selector, html]),
    remove: () => yaotaRemovedSelectors.push(selector),
  }),
  timers: {
    setTimeout: (fn, delay) => {
      const id = ++yaotaTimerId;
      yaotaTimers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: (id) => yaotaTimers.delete(id),
  },
  legacy: { formatDate: () => "2026-08-21 12:00" },
});
assert(yaotaWG.ytjk_func() === undefined, "妖塔监控公开入口返回值发生变化");
const yaotaRoomHookId = [...yaotaHooks.entries()].find(
  ([, entry]) => entry.type === "room",
)[0];
assert(
  yaotaWG.ytjk_func() === undefined &&
    [...yaotaHooks.values()].filter((entry) => entry.type === "room").length === 1,
  "妖塔重复初始化创建了重复房间 Hook",
);
const yaotaRoomHandler = yaotaHooks.get(yaotaRoomHookId).fn;
yaotaRoomHandler({ path: "zc/mu/shishenta" });
assert(
  yaotaG.yaotaFlag === true &&
    yaotaG.yaotaCount === 1 &&
    yaotaBefore.at(-1)?.[1] === "<div id=yt_prog>开始攻略妖塔</div>" &&
    yaotaAppends.filter(([selector]) => selector === ".channel pre").length === 1,
  "进入妖塔未保持计数、进度 DOM 或频道报告",
);
yaotaG.yaoyuan = 261;
yaotaRoomHandler({ path: "yz/guangchang" });
yaotaRoomHandler({ path: "yz/guangchang" });
assert(
  yaotaTimers.size === 1 &&
    yaotaAppends.filter(([, html]) => html.includes("结束时间")).length === 2,
  "离开妖塔重复事件创建了重复完成等待或结束报告",
);
const yaotaDeferredTimer = [...yaotaTimers.values()][0];
yaotaTimers.clear();
yaotaDeferredTimer.fn();
assert(yaotaTimers.size === 1, "妖塔忙碌状态未进入每秒可取消等待");
const staleYaotaWait = [...yaotaTimers.values()][0];
yaotaRoomHandler({ path: "zc/mu/shishenta" });
assert(yaotaTimers.size === 0, "妖塔重新进入时未立即清理旧离场等待");
staleYaotaWait.fn();
await Promise.resolve();
await Promise.resolve();
assert(
  yaotaCommands.length === 0 &&
    yaotaG.yaotaFlag === true &&
    yaotaG.yaotaCount === 2,
  "妖塔离场等待在重新进入后错误结束了新轮次",
);
yaotaWG.resetYaotaAutomation();
for (const timer of [...yaotaTimers.values()]) timer.fn();
await Promise.resolve();
await Promise.resolve();
assert(
  yaotaCommands.length === 0 &&
    yaotaG.yaotaFlag === false &&
    yaotaG.yaoyuan === 0 &&
    !yaotaHooks.has(yaotaRoomHookId),
  "妖塔重置后旧等待仍发送命令或残留房间状态",
);
yaotaWG.ytjk_func();
const nextYaotaHook = [...yaotaHooks.entries()].find(
  ([, entry]) => entry.type === "room",
)[0];
const nextYaotaHandler = yaotaHooks.get(nextYaotaHook).fn;
nextYaotaHandler({ path: "zc/mu/shishenta" });
yaotaG.yaoyuan = 261;
yaotaFree = true;
nextYaotaHandler({ path: "yz/guangchang" });
const yaotaCompletionTimer = [...yaotaTimers.values()][0];
yaotaTimers.clear();
yaotaCompletionTimer.fn();
assert(
  yaotaCommands.at(-1) === "tm 第 3 次妖塔圆满完成，撒花~~~~~" &&
    yaotaG.yaotaFlag === false &&
    yaotaRemovedSelectors.includes("#yt_prog"),
  "妖塔完成聊天、计数或进度清理发生变化",
);
yaotaWG.ytjk_func();
const loginResetYaotaHook = [...yaotaHooks.entries()].find(
  ([, entry]) => entry.type === "room",
)?.[0];
yaotaHooks.get(0).fn({ type: "login" });
assert(
  !yaotaHooks.has(loginResetYaotaHook) &&
    yaotaG.yaotaFlag === false &&
    yaotaTimers.size === 0,
  "妖塔登录 Hook 未清理房间 Hook、状态或等待",
);
yaotaSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  yaotaWG.ytjk_func === undefined &&
    yaotaWG.resetYaotaAutomation === undefined &&
    yaotaTimers.size === 0,
  "妖塔模块销毁后仍残留公开入口或定时器",
);
const dailyHooks = new Map();
const dailyRemovedHooks = [];
const dailyTimers = new Map();
const dailySent = [];
const dailyCommands = [];
const dailyRoutes = [];
const dailyMessages = [];
let dailyNow = 0;
let dailyTimerId = 0;
let dailyHookId = 0;
let dailyMasterRuns = 0;
let dailyNpcAvailable = false;
const dailySandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
dailySandbox.window.window = dailySandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/daily-workflows.js",
]) {
  runInNewContext(readFileSync(join(extensionRoot, sourcePath), "utf8"), dailySandbox, {
    filename: sourcePath,
  });
}
const dailyWG = {
  sm_state: -1,
  add_hook: (type, fn) => {
    const id = dailyHookId++;
    dailyHooks.set(id, { type, fn });
    return id;
  },
  remove_hook: (id) => {
    dailyRemovedHooks.push(id);
    dailyHooks.delete(id);
  },
  Send: (command) => dailySent.push(command),
  SendCmd: (command) => dailyCommands.push(command),
  go: (target) => dailyRoutes.push(target),
  getIdByName: () => (dailyNpcAvailable ? "npc-cheng" : null),
  smTask: () => {
    dailyMasterRuns += 1;
    dailyWG.sm_state = -1;
  },
  timer_close: () => dailySent.push("timer_close"),
  grove_auto: (count) => dailySent.push("grove:" + count),
};
const dailyTimersApi = {
  setTimeout: (fn, delay) => {
    const id = ++dailyTimerId;
    dailyTimers.set(id, { fn, at: dailyNow + delay });
    return id;
  },
  clearTimeout: (id) => dailyTimers.delete(id),
};
async function advanceDailyTimers(duration) {
  const target = dailyNow + duration;
  for (;;) {
    const due = [...dailyTimers.entries()]
      .filter(([, timer]) => timer.at <= target)
      .sort((left, right) => left[1].at - right[1].at)[0];
    if (!due) break;
    dailyNow = due[1].at;
    dailyTimers.delete(due[0]);
    due[1].fn();
    await Promise.resolve();
    await Promise.resolve();
  }
  dailyNow = target;
  await Promise.resolve();
  await Promise.resolve();
}
dailySandbox.window.WSMudPlugin.installFeatures({
  WG: dailyWG,
  jquery: () => ({ text: () => undefined }),
  timers: dailyTimersApi,
  messageAppend: (message) => dailyMessages.push(message),
  logger: { log: () => undefined, error: () => undefined },
  legacy: {
    getFamily: () => "武当",
    getMasterTasks: () => ({ 武当: { sxplace: "武当派-太子岩", sx: "首席弟子" } }),
  },
});
const cancelledQa = dailyWG.oneKeyQA();
assert(
  dailyWG.oneKeyQA() === cancelledQa &&
    dailySent.join("|") === "stopstate" &&
    dailyRoutes.join("|") === "武当派-太子岩",
  "请安重复启动未复用当前流程，或停止/寻路顺序变化",
);
dailyWG.resetDailyWorkflows();
await advanceDailyTimers(3e3);
assert(
  (await cancelledQa) === false && dailyCommands.length === 0,
  "请安重置后等待未解除，或旧回调仍发送请安命令",
);
const completedQa = dailyWG.oneKeyQA();
await advanceDailyTimers(3e3);
assert(
  (await completedQa) === true &&
    dailyCommands.at(-1) ===
      'select $findPlayerByName("首席弟子");$wait 200;ask2 $findPlayerByName("首席弟子")',
  "请安地点、固定等待或历史命令文本发生变化",
);
const dailyExecution = dailyWG.oneKeyDaily();
const dailyExecutionAgain = dailyWG.oneKeyDaily();
const dailyDialogHookId = dailyWG.daily_hook;
const dailyDialogHook = dailyHooks.get(dailyDialogHookId);
assert(
  dailyExecution === dailyExecutionAgain &&
    [...dailyHooks.values()].filter((entry) => entry.type === "dialog").length === 1 &&
    dailyCommands.at(-1) === "tasks",
  "一键日常重复启动创建了重复 Hook 或重复 tasks 命令",
);
dailyDialogHook.fn({
  dialog: "tasks",
  items: [{ id: "signin", state: 1, desc: "师门：19/20精力消耗：100/200" }],
});
await Promise.resolve();
await Promise.resolve();
await advanceDailyTimers(199);
assert(dailyMasterRuns === 0, "师门任务未保持 200ms 延迟启动");
await advanceDailyTimers(1);
assert(dailyMasterRuns === 1 && dailyWG.sm_state === -1, "师门延迟任务未执行");
await advanceDailyTimers(1800);
assert(
  (await dailyExecution) === true && dailySent.at(-1) === "grove:10",
  "日常描述解析或小树林次数计算发生变化",
);
const dailyCompletion = dailyWG.waitDailyWorkflow();
assert(
  dailyWG.finishDailyWorkflow(dailyDialogHookId + 100) === false &&
    dailyWG.daily_hook === dailyDialogHookId,
  "非当前 Hook 能错误结束日常流程",
);
assert(
  dailyWG.finishDailyWorkflow(dailyDialogHookId) === true &&
    (await dailyCompletion) === true &&
    dailyWG.daily_hook === undefined,
  "当前小树林完成信号未精确清理日常 Hook",
);
const cancelledDaily = dailyWG.oneKeyDaily();
const cancelledDailyWait = dailyWG.waitDailyWorkflow();
dailyHooks.get(dailyWG.daily_hook).fn({
  dialog: "tasks",
  items: [{ id: "signin", state: 1, desc: "师门：10/20精力消耗：100/200" }],
});
await Promise.resolve();
await Promise.resolve();
dailyWG.resetDailyWorkflows();
await advanceDailyTimers(3e3);
assert(
  (await cancelledDaily) === false &&
    (await cancelledDailyWait) === false &&
    dailyMasterRuns === 1 &&
    dailyWG.daily_hook === undefined,
  "日常重置未取消 200ms 回调、解除等待或清理 Hook",
);
dailyWG.oneKeySD();
const sweepHookId = dailyWG.sd_hook;
const sweepHook = dailyHooks.get(sweepHookId);
dailyWG.oneKeySD();
assert(
  dailyWG.sd_hook === sweepHookId &&
    [...dailyHooks.values()].filter((entry) => Array.isArray(entry.type)).length === 1,
  "一键扫荡重复启动创建了重复 Hook",
);
sweepHook.fn({ type: "text", msg: "无法快速完" });
await Promise.resolve();
await Promise.resolve();
assert(dailySent.at(-1) === "select null", "扫荡起始 select 命令发生变化");
const sweepWait = dailyWG.waitSweepWorkflow();
dailyWG.resetDailyWorkflows();
await advanceDailyTimers(5e3);
assert(
  (await sweepWait) === false &&
    !dailySent.some((command) => command === "ask1 null") &&
    dailyWG.sd_hook === undefined,
  "扫荡重置后旧异步回调仍继续发命令",
);
dailyWG.oneKeySD();
const completedSweepWait = dailyWG.waitSweepWorkflow();
dailyHooks.get(dailyWG.sd_hook).fn({
  dialog: "tasks",
  items: [{ id: "yamen", desc: "今日完成20/20" }],
});
await Promise.resolve();
await Promise.resolve();
assert(
  (await completedSweepWait) === true &&
    dailyWG.sd_hook === undefined &&
    dailyMessages.includes("追捕已完成"),
  "追捕完成对话未清理 Hook 或发出完成信号",
);
dailySandbox.window.WSMudPlugin.destroyFeatures();
assert(
  dailyWG.oneKeyDaily === undefined &&
    dailyWG.oneKeyQA === undefined &&
    dailyWG.oneKeySD === undefined &&
    dailyTimers.size === 0,
  "日常流程模块销毁后仍残留公开入口或定时器",
);
const activityHooks = new Map();
const activityRemovedHooks = [];
const activityIntervals = new Map();
const activitySent = [];
const activityMessages = [];
const activityRoutes = [];
const activityAsks = [];
const activityPerformClicks = [];
let activityIntervalId = 0;
let activityWorkTimer = 0;
let activityInTower = false;
let activityTransportAvailable = true;
let activityRoomText = "路人";
let activityStudyText = "";
let activityPromptValue = "3";
let activityWorkRestarts = 0;
const activitySandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
activitySandbox.window.window = activitySandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/activity-automation.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    activitySandbox,
    { filename: sourcePath },
  );
}
const activityWG = {
  daily_hook: 77,
  add_hook: (type, fn) => {
    const id = type === "dialog" ? 0 : 100;
    activityHooks.set(id, { type, fn });
    return id;
  },
  remove_hook: (id) => {
    activityRemovedHooks.push(id);
    activityHooks.delete(id);
  },
  at: () => activityInTower,
  Send: (command) => activitySent.push(command),
  go: (target) => activityRoutes.push(target),
  ask: (name, option) => activityAsks.push([name, option]),
  zdwk: () => { activityWorkRestarts += 1; },
};
const activityJquery = (selector) => {
  if (selector === ".room_items .room-item:last") {
    return { text: () => activityRoomText, attr: () => "guardian-1" };
  }
  if (selector === ".room_items .room-item:first .item-name") {
    return { text: () => activityStudyText };
  }
  const performMatch = selector.match(/pfm-item:eq\(([^)]+)\)/);
  if (performMatch) {
    return {
      css: () => (performMatch[1] === "1" ? "0px" : "10px"),
      click: () => activityPerformClicks.push(performMatch[1]),
    };
  }
  throw new Error("未覆盖的活动自动化选择器: " + selector);
};
activitySandbox.window.WSMudPlugin.installFeatures({
  WG: activityWG,
  jquery: activityJquery,
  timers: {
    setInterval: (fn, delay) => {
      const id = ++activityIntervalId;
      activityIntervals.set(id, { fn, delay });
      return id;
    },
    clearInterval: (id) => activityIntervals.delete(id),
  },
  prompt: (message, fallback) => {
    assert(
      message === "请输入需要秒进秒退的副本次数" && fallback === "",
      "小树林提示文本或默认值发生变化",
    );
    return activityPromptValue;
  },
  messageAppend: (message) => activityMessages.push(message),
  legacy: {
    getWorkTimer: () => activityWorkTimer,
    setWorkTimer: (value) => { activityWorkTimer = value; },
    isTransportAvailable: () => activityTransportAvailable,
    getWudaoPerforms: () => "1,2",
  },
});
activityWG.wudao_auto();
activityWG.wudao_auto();
assert(
  activityIntervals.size === 1 &&
    activityWG.wudao_hook === 0 &&
    [...activityHooks.values()].filter((entry) => entry.type === "dialog").length === 1 &&
    activitySent.join("|") === "tasks|tasks",
  "武道重复启动创建了重复 interval/Hook，或 Hook ID 0 被误判",
);
const activityDialogHook = activityHooks.get(0);
activityDialogHook.fn({
  items: [{ id: "signin", desc: "进度1/2<hig>，<任务>" }],
});
assert(
  activityWG.wudao_hook === undefined &&
    activityRemovedHooks.includes(0) &&
    activityRoutes.at(-1) === "武道塔" &&
    activitySent.at(-1) === "go enter" &&
    activityMessages.includes("爬塔未完成!"),
  "武道任务对话未保持历史进度解析、进入命令或 Hook 清理",
);
activityInTower = true;
activityRoomText = "武道塔守护者";
activityWG.wudao_auto();
assert(
  activitySent.at(-1) === "kill guardian-1" &&
    activityPerformClicks.join("|") === "1",
  "武道塔守护者击杀或旧 left=0px 自动施法选择器发生变化",
);
activityWG.timer_close();
assert(
  activityWorkTimer === 0 && activityIntervals.size === 0,
  "共享 timer_close 未清理并归零历史工作计时器",
);
activityStudyText = "普通状态";
activityWG.xue_auto();
assert(
  activityMessages.at(-1) === "当前不在打坐或学技能" &&
    activityWorkTimer === 0,
  "学习检测在无状态时仍启动或提示变化",
);
activityStudyText = "<学习 太极拳>";
activityWG.xue_auto();
assert(
  activityWorkTimer !== 0 &&
    activityMessages.at(-1) === "自动打坐学技能",
  "学习状态未启动共享 interval 或输出历史提示",
);
activityStudyText = "已结束";
activityWG.xue_auto();
assert(
  activityWorkTimer === 0 && activityWorkRestarts === 1,
  "学习结束后未停止 interval 或恢复挖矿",
);
activityWG.grove_auto("abc");
assert(
  activityWorkTimer === 0 &&
    activityWG.needGrove === "abc" &&
    activityMessages.at(-1) === "请输入数字",
  "小树林非法输入的历史保留值或提示发生变化",
);
activityWG.grove_auto(2);
const activityGroveTimer = activityIntervals.get(activityWorkTimer);
assert(
  activityGroveTimer?.delay === 1000 && activityWG.needGrove === 2,
  "小树林未建立每秒共享 interval",
);
activityGroveTimer.fn();
activityGroveTimer.fn();
assert(
  activitySent.slice(-3).join("|") ===
    "cr yz/lw/shangu;cr over|cr yz/lw/shangu;cr over|taskover signin",
  "小树林进入/退出或完成命令顺序发生变化",
);
assert(
  activityWG.fbnum === 0 &&
    activityWG.needGrove === 0 &&
    activityWorkTimer === 0 &&
    activityWG.daily_hook === undefined &&
    activityRemovedHooks.includes(77),
  "小树林完成后未清理计数、共享 timer 或日常 Hook",
);
activityPromptValue = "1";
activityWG.grove_auto();
assert(activityWG.needGrove === "1", "小树林未通过显式 prompt 读取次数");
const staleActivityCallback = activityIntervals.get(activityWorkTimer)?.fn;
activityWG.fbnum = 9;
activityWG.needGrove = 9;
activityWG.resetActivityAutomation();
assert(
  activityWG.fbnum === 0 &&
    activityWG.needGrove === 0 &&
    activityWorkTimer === 0,
  "活动会话重置未清理共享 timer 或跨角色计数",
);
if (staleActivityCallback) {
  const sentBeforeStaleActivity = activitySent.length;
  staleActivityCallback();
  assert(
    activitySent.length === sentBeforeStaleActivity,
    "活动会话重置后旧 interval 回调仍发送命令",
  );
}
activitySandbox.window.WSMudPlugin.destroyFeatures();
assert(
  activityWG.wudao_auto === undefined &&
    activityWG.grove_auto === undefined &&
    activityWG.resetActivityAutomation === undefined,
  "活动自动化模块销毁后仍残留公开入口",
);
let navigationRoomHtml = "扬州城-广场";
let navigationRoomData = [{ id: "npc-1", name: "测试人物" }];
let navigationRoutes = {
  "住房-卧室": "home-route",
  "扬州城-测试地": "test-route",
};
let navigationSearchRoutes = {};
let navigationSaveAddress = "开";
const navigationCalls = [];
const navigationG = { ingo: false };
const navigationSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
navigationSandbox.window.window = navigationSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/navigation-core.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    navigationSandbox,
    { filename: sourcePath },
  );
}
const navigationWG = {
  SendCmd: async (route) => {
    navigationCalls.push({ route, ingo: navigationG.ingo });
  },
};
navigationSandbox.window.WSMudPlugin.installFeatures({
  WG: navigationWG,
  G: navigationG,
  jquery: (selector) => ({
    html: () => (selector === ".room-name" ? navigationRoomHtml : ""),
  }),
  legacy: {
    getRoomData: () => navigationRoomData,
    getPlaceRoutes: () => navigationRoutes,
    getNeedFindRoutes: () => navigationSearchRoutes,
    getSaveAddress: () => navigationSaveAddress,
  },
});
await navigationWG.go("扬州城-钱庄");
assert(
  navigationCalls[0]?.route === "home-route" &&
    navigationCalls[0]?.ingo === true &&
    navigationG.ingo === false &&
    navigationWG.at("扬州城-钱庄") === false,
  "导航核心未保持住宅钱庄映射或寻路期间的 ingo 状态",
);
navigationRoomHtml = "住房-卧室";
assert(
  navigationWG.at("扬州城-钱庄") === true,
  "导航核心未在住宅模式下映射钱庄到卧室",
);
navigationSaveAddress = "关";
navigationRoomHtml = "扬州城-测试地";
await navigationWG.go("扬州城-测试地");
assert(
  navigationCalls.length === 1,
  "导航核心已在当前房间时仍重复发送普通路线",
);
navigationRoomHtml = "扬州城-<wht>杂货铺</wht>";
assert(
  navigationWG.at("扬州城-杂货铺") === true,
  "带颜色标签的房间名未识别为杂货铺",
);
navigationRoomHtml = "杂货铺";
assert(
  navigationWG.at("扬州城-杂货铺") === true,
  "短房间名未识别为扬州城-杂货铺",
);
navigationSearchRoutes = { "扬州城-测试地": ["go east"] };
await navigationWG.go("扬州城-测试地");
assert(
  navigationCalls.at(-1)?.route === "test-route",
  "需要巡查的目标房间被当前房间短路",
);
assert(
  navigationWG.getIdByName("人物") === "npc-1" &&
    navigationWG.getIdByName("不存在") === null,
  "导航核心未从实时房间快照返回首个匹配 ID",
);
navigationRoomData = [{ id: "npc-2", name: "后来人物" }];
assert(
  navigationWG.getIdByName("后来") === "npc-2",
  "导航核心缓存了旧 roomData，未使用动态 accessor",
);
navigationSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  navigationWG.go === undefined &&
    navigationWG.at === undefined &&
    navigationWG.getIdByName === undefined,
  "导航核心销毁后仍残留公开入口",
);
const masterHooks = new Map();
const masterRemovedHooks = [];
const masterTimers = new Map();
const masterSent = [];
const masterCommands = [];
const masterRoutes = [];
let masterHookId = -1;
let masterTimerId = 0;
let masterButtonText = "师门(Q)";
let masterRoomItems = [];
const masterSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
masterSandbox.window.window = masterSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/master-task-automation.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    masterSandbox,
    { filename: sourcePath },
  );
}
const emptyMasterNode = {
  length: 0,
  parent() { return this; },
  prev() { return this; },
  children() { return this; },
  html() { return undefined; },
  click() {},
};
const masterJquery = (selector) => {
  if (selector === ".sm_button") {
    return {
      text(value) {
        if (value !== undefined) masterButtonText = value;
        return masterButtonText;
      },
    };
  }
  if (selector === ".room_items .room-item") return masterRoomItems;
  if (selector && typeof selector === "object") {
    return { attr: (name) => (name === "itemid" ? selector.itemid : undefined) };
  }
  return emptyMasterNode;
};
const masterWG = {
  online: true,
  sm_state: -1,
  sm_item: null,
  sm_store: null,
  add_hook: (type, fn) => {
    const id = ++masterHookId;
    masterHooks.set(id, { type, fn });
    return id;
  },
  remove_hook: (id) => {
    masterRemovedHooks.push(id);
    masterHooks.delete(id);
  },
  Send: (command) => masterSent.push(command),
  SendCmd: (command) => masterCommands.push(command),
  go: (target) => masterRoutes.push(target),
  buy: () => true,
  clean_id_all: () => {},
  update_npc_id: () => {},
  inArray: (needle, values) => values.some((value) => needle.indexOf(value) >= 0),
  deserializePackData: (event) => event,
};
masterSandbox.window.WSMudPlugin.installFeatures({
  WG: masterWG,
  G: { connected: true },
  jquery: masterJquery,
  clone: (value) => ({ ...value, stores: [...(value.stores || [])] }),
  timers: {
    setTimeout: (fn, delay) => {
      const id = ++masterTimerId;
      masterTimers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: (id) => masterTimers.delete(id),
  },
  confirm: () => true,
  logger: { error: () => {} },
  messageAppend: () => {},
  legacy: {
    getRoleId: () => "master-role",
    getFamily: () => "测试门派",
    getMasterTasks: () => ({ 测试门派: { place: "师门地点", npc: "师父" } }),
    getSmLoser: () => "关",
    getSmGetStore: () => "开",
    getSmAny: () => "关",
    getSmPrice: () => "关",
    getStoreList: () => [],
    getPackGoods: () => ({}),
    getProcess: () => ({ leve: false }),
  },
});
await masterWG.doSmTask(0);
assert(
  masterRoutes.at(-1) === "师门地点" && masterWG.sm_state === 1,
  "师门状态 0 未保持非等待寻路或立即推进状态",
);
const masterNpc = {
  itemid: "master-npc",
  lastElementChild: { innerText: "师父", lastElementChild: null },
};
masterRoomItems = [masterNpc];
await masterWG.doSmTask(1);
assert(
  masterSent.slice(-2).join("|") ===
    "task sm master-npc|task sm master-npc" && masterWG.sm_state === 2,
  "师门状态 1 未保持接任务命令发送两次的历史契约",
);
const masterItem = { place: "商店", type: "hic" };
masterWG.sm_item = masterItem;
masterWG.smbuyNum = "0";
await masterWG.doSmTask(3);
assert(
  masterWG.sm_state === 0 &&
    masterWG.lastBuy === masterItem &&
    masterWG.smbuyNum === "01",
  "师门状态 3 未保持宽松比较、赋值顺序或历史计数行为",
);
masterWG.sm_store = "<hic>测试药</hic>";
masterWG.sm_item = null;
masterWG.sm_state = 4;
let masterStoreFinished = false;
const masterStorePromise = masterWG.doSmTask(4).then(() => {
  masterStoreFinished = true;
});
await Promise.resolve();
await Promise.resolve();
assert(!masterStoreFinished, "师门状态 4 在仓库响应前提前完成");
const masterDialogHook = [...masterHooks.values()].find(
  (entry) => entry.type === "dialog",
);
assert(
  masterCommands.at(-1) === "store" && masterDialogHook,
  "师门取仓未发送 store 或注册 dialog Hook",
);
masterDialogHook.fn({
  dialog: "stores",
  stores: [{ id: "store-item", name: "<hic>测试药</hic>" }],
});
await Promise.resolve();
assert(
  masterSent.at(-1) === "qu 1 store-item" && !masterStoreFinished,
  "师门取仓在 300ms 回调前提前完成或未发送取物命令",
);
const masterQuTimer = [...masterTimers.entries()].find(
  ([, timer]) => timer.delay === 300,
);
assert(masterQuTimer, "师门取仓未保存 300ms 回调计时器");
masterTimers.delete(masterQuTimer[0]);
masterQuTimer[1].fn();
await masterStorePromise;
assert(
  masterStoreFinished && masterWG.sm_state === 0,
  "师门取仓未在 300ms 回调后推进状态",
);
masterWG.sm_state = 0;
const firstMasterLoop = masterWG.smTask();
masterWG.smTask();
await Promise.resolve();
await Promise.resolve();
assert(
  [...masterHooks.values()].filter((entry) => entry.type === "text").length === 1 &&
    [...masterTimers.values()].filter((timer) => timer.delay === 1000).length === 1,
  "重复启动师门任务创建了重复循环、Hook 或计时器",
);
await masterWG.sm_button();
await firstMasterLoop;
assert(
  ![...masterHooks.values()].some((entry) => entry.type === "text") &&
    ![...masterTimers.values()].some((timer) => timer.delay === 1000) &&
    masterButtonText === "师门(Q)",
  "手动停止师门任务后仍残留 Hook/计时器或按钮状态",
);
masterWG.sm_state = 0;
const terminalMasterLoop = masterWG.smTask();
const terminalMasterHook = [...masterHooks.values()].find(
  (entry) => entry.type === "text",
);
terminalMasterHook.fn({ msg: "辛苦了， 你先去休息" });
terminalMasterHook.fn({ msg: "辛苦了， 你先去休息" });
await terminalMasterLoop;
assert(
  masterSent.filter((command) => command === "taskover signin").length === 1 &&
    masterWG.sm_state === -1,
  "师门终止文本未幂等发送 taskover signin 或停止状态机",
);
masterWG.qu("旧物品", () => {
  throw new Error("被取消的师门取仓回调仍被执行");
});
const cancelledMasterHookId = masterWG.qu_hook;
masterWG.sm_state = -1;
assert(
  masterWG.qu_hook == null && masterRemovedHooks.includes(cancelledMasterHookId),
  "停止师门任务未取消待处理取仓 Hook",
);
masterWG.sm_item = masterItem;
masterWG.resetMasterTaskAutomation();
assert(
  masterWG.sm_state === -1 &&
    masterWG.sm_item === null &&
    masterWG.kala_count === 0,
  "师门会话重置未清空跨角色状态",
);
masterSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  masterWG.smTask === undefined &&
    masterWG.qu === undefined &&
    masterWG.resetMasterTaskAutomation === undefined,
  "师门模块销毁后仍残留公开运行入口",
);
const warehouseHooks = [];
const warehouseRemovedHooks = [];
const warehouseCommands = [];
const warehouseSent = [];
const warehouseMessages = [];
let warehouseHookId = 0;
let warehouseCloneCalls = 0;
let warehouseDialogCloses = 0;
let warehouseAtBank = true;
const warehouseGoTargets = [];
const warehouseSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
warehouseSandbox.window.window = warehouseSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/warehouse-sorting.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    warehouseSandbox,
    { filename: sourcePath },
  );
}
const warehouseWG = {
  add_hook: (types, fn) => {
    const id = ++warehouseHookId;
    warehouseHooks.push({ id, types, fn });
    return id;
  },
  remove_hook: (id) => warehouseRemovedHooks.push(id),
  deserializePackData: (value) => value,
  SendCmd: (command) => warehouseCommands.push(command),
  Send: (command) => warehouseSent.push(command),
  at: () => warehouseAtBank,
  go: async (target) => warehouseGoTargets.push(target),
  waitUntilAt: async () => {
    warehouseAtBank = true;
    return true;
  },
};
warehouseSandbox.window.WSMudPlugin.installFeatures({
  WG: warehouseWG,
  messageAppend: (message) => warehouseMessages.push(message),
  clone: (value) => {
    warehouseCloneCalls += 1;
    return JSON.parse(JSON.stringify(value));
  },
  legacy: {
    getKeyApi: () => ({
      dialog_close: () => {
        warehouseDialogCloses += 1;
      },
    }),
  },
});
warehouseWG.sort_all();
const warehouseSortHook = warehouseHooks.find(
  (entry) => Array.isArray(entry.types),
);
assert(
  warehouseSortHook && warehouseWG.sort_hook === warehouseSortHook.id,
  "仓库排序未注册公开流程 Hook",
);
warehouseSortHook.fn({
  type: "dialog",
  dialog: "list",
  stores: [
    { id: "long", name: "<hig>长长剑</hig>", count: 2 },
    { id: "short", name: "<hig>剑</hig>", count: 1 },
  ],
});
assert(
  warehouseCloneCalls === 1 &&
    warehouseSent[0] === "store" &&
    warehouseCommands[0] ===
      "qu 2 long;$wait 350;qu 1 short;$wait 350;" +
        "store 1 short;$wait 350;store 2 long;$wait 350;look3 1",
  "仓库排序未保持颜色分组、取出顺序或按名称长度存回命令",
);
warehouseSortHook.fn({ type: "text", msg: "没有这个玩家，或者不在线。" });
assert(
  warehouseWG.sort_hook === undefined &&
    warehouseRemovedHooks.includes(warehouseSortHook.id) &&
    warehouseMessages.includes("<hio>仓库排序</hio>完成"),
  "仓库排序完成后未清理 Hook 或保留完成提示",
);
warehouseWG.sort_all_bag();
const bagSortHookId = warehouseWG.sort_hook;
assert(
  warehouseSent.includes("pack") && warehouseDialogCloses === 1,
  "背包排序未保持 pack 请求或关闭对话框行为",
);
warehouseWG.sort_all_bag();
assert(
  warehouseWG.sort_hook === undefined &&
    warehouseRemovedHooks.includes(bagSortHookId) &&
    warehouseMessages.includes("<hio>背包排序</hio>手动结束"),
  "背包排序重复启动未保持手动结束语义",
);
warehouseAtBank = false;
const warehouseSentBeforeRoute = warehouseSent.length;
await warehouseWG.sort_all();
assert(
  warehouseGoTargets.at(-1) === "扬州城-钱庄" &&
    warehouseSent.length === warehouseSentBeforeRoute + 1 &&
    warehouseSent.at(-1) === "store",
  "仓库排序从外地启动后未等待到达钱庄再请求仓库数据",
);
const warehouseLoginHook = warehouseHooks.find(
  (entry) => entry.types === "login",
);
warehouseSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  warehouseRemovedHooks.includes(warehouseLoginHook.id),
  "仓库排序销毁后仍残留 login Hook",
);
const yamenHooks = [];
const yamenRemovedHooks = [];
const yamenTimers = new Map();
const yamenCommands = [];
const yamenSent = [];
const yamenGoTargets = [];
const yamenAskCalls = [];
const yamenMessages = [];
let yamenHookId = 0;
let yamenTimerId = 0;
let yamenTaskText = "";
let yamenRoomItems = [];
let yamenNpc;
let yamenPlace;
let yamenNpcRefreshes = 0;
const yamenSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
yamenSandbox.window.window = yamenSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/yamen-automation.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    yamenSandbox,
    { filename: sourcePath },
  );
}
const yamenJquery = (selector) => {
  if (typeof selector === "object") {
    return { attr: (name) => (name === "itemid" ? selector.itemid : undefined) };
  }
  if (selector === ".room_items .room-item") return yamenRoomItems;
  if (String(selector).startsWith(".task-desc:eq(")) {
    return { text: () => yamenTaskText };
  }
  return { text: () => "" };
};
const yamenWG = {
  add_hook: (types, fn) => {
    const id = ++yamenHookId;
    yamenHooks.push({ id, types, fn });
    return id;
  },
  remove_hook: (id) => yamenRemovedHooks.push(id),
  update_npc_id: () => {
    yamenNpcRefreshes += 1;
  },
  go: (target) => yamenGoTargets.push(target),
  ask: (...args) => yamenAskCalls.push(args),
  sleep: async () => {},
  Send: (command) => yamenSent.push(command),
};
yamenSandbox.window.WSMudPlugin.installFeatures({
  WG: yamenWG,
  jquery: yamenJquery,
  messageAppend: (message) => yamenMessages.push(message),
  timers: {
    setTimeout: (callback, delay) => {
      const id = ++yamenTimerId;
      yamenTimers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id) => yamenTimers.delete(id),
  },
  legacy: {
    getKeyApi: () => ({
      do_command: (command) => yamenCommands.push(command),
    }),
    getBossRoutes: () => ({ 测试地点: ["go east"] }),
    getYamenNpc: () => yamenNpc,
    setYamenNpc: (value) => {
      yamenNpc = value;
    },
    getYamenPlace: () => yamenPlace,
    setYamenPlace: (value) => {
      yamenPlace = value;
    },
  },
});
await yamenWG.go_yamen_task();
const yamenTextHook = yamenHooks.find((entry) => entry.types === "text");
const yamenLoginHook = yamenHooks.find((entry) => entry.types === "login");
assert(
  yamenTextHook &&
    yamenLoginHook &&
    yamenWG.yamen_lister === yamenTextHook.id &&
    yamenGoTargets[0] === "扬州城-衙门正厅" &&
    yamenAskCalls[0]?.[0] === "扬州知府 程药发" &&
    [...yamenTimers.values()].some((timer) => timer.delay === 1000) &&
    ["yamen_lister", "yamen_err_no", "check_yamen_task", "zb_next"].every(
      (name) => Object.keys(yamenWG).includes(name),
    ),
  "衙门追捕未保持公开字段、文本/login Hook、衙门问询或任务计时器",
);
const refreshesAfterStart = yamenNpcRefreshes;
yamenTextHook.fn({ type: "text", msg: "没有这个人" });
assert(
  yamenNpcRefreshes === refreshesAfterStart + 1,
  "衙门追捕未在 NPC 标识失效时刷新房间人物",
);
yamenTextHook.fn({
  type: "text",
  msg: "最近没有在逃的逃犯了，你先休息下吧。",
});
assert(
  yamenWG.check_yamen_task === "over" &&
    yamenWG.yamen_lister === undefined &&
    yamenTimers.size === 0 &&
    yamenRemovedHooks.includes(yamenTextHook.id),
  "衙门任务结束后未保留 over 兼容状态或清理 Hook/计时器",
);
yamenLoginHook.fn({ type: "login", id: "next-role" });
assert(
  typeof yamenWG.check_yamen_task === "function" &&
    yamenWG.yamen_err_no === 0 &&
    yamenWG.zb_next === 0 &&
    yamenNpc === undefined &&
    yamenPlace === undefined,
  "角色切换后衙门追捕未恢复函数入口或清空角色状态",
);
yamenTaskText = "扬州知府告示：犯：测试逃犯，据说在测试地点出没";
await yamenWG.go_yamen_task();
const taskTimerEntry = [...yamenTimers.entries()].find(
  ([, timer]) => timer.delay === 1000,
);
assert(taskTimerEntry, "衙门追捕重启后未创建任务检查计时器");
yamenTimers.delete(taskTimerEntry[0]);
taskTimerEntry[1].callback();
assert(
  yamenNpc === "测试逃犯" &&
    yamenPlace === "测试地点" &&
    yamenCommands.includes("score") &&
    yamenGoTargets.includes("测试地点") &&
    yamenMessages.includes("追捕任务：测试逃犯   地点：测试地点"),
  "衙门告示未正确解析逃犯/地点或保持 score、寻路和提示行为",
);
yamenRoomItems = [{
  innerText: "测试逃犯",
  itemid: "fugitive-1",
}];
const targetTimerEntry = [...yamenTimers.entries()].find(
  ([, timer]) => timer.delay === 1000,
);
assert(targetTimerEntry, "衙门追捕解析告示后未创建目标检查计时器");
yamenTimers.delete(targetTimerEntry[0]);
targetTimerEntry[1].callback();
assert(
  yamenSent.includes("kill fugitive-1") &&
    yamenWG.zb_next === 0 &&
    yamenTimers.size === 0,
  "衙门追捕发现目标后未攻击或停止目标轮询",
);
yamenSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  yamenRemovedHooks.includes(yamenLoginHook.id) &&
    yamenTimers.size === 0 &&
    yamenWG.go_yamen_task === undefined &&
    yamenWG.check_zb_npc === undefined,
  "衙门追捕销毁后仍残留 login Hook、计时器或公开入口",
);
const cleanupHooks = [];
const cleanupRemovedHooks = [];
const cleanupCommands = [];
const cleanupSent = [];
const cleanupGoTargets = [];
const cleanupMessages = [];
let cleanupHookId = 0;
let cleanupCloneCalls = 0;
const cleanupSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
cleanupSandbox.window.window = cleanupSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/pack-data-codec.js",
  "features/plugin/inventory-cleanup.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    cleanupSandbox,
    { filename: sourcePath },
  );
}
const cleanupPackDataCodec =
  cleanupSandbox.window.WSMudPlugin.createService("pack-data-codec");
const cleanupWG = {
  add_hook: (types, fn) => {
    const id = ++cleanupHookId;
    cleanupHooks.push({ id, types, fn });
    return id;
  },
  remove_hook: (id) => cleanupRemovedHooks.push(id),
  deserializePackData: cleanupPackDataCodec.deserializePackData,
  inArray: (value, list) => list.includes(value),
  SendCmd: (commands) => cleanupCommands.push(commands),
  Send: (command) => cleanupSent.push(command),
  go: (target) => cleanupGoTargets.push(target),
};
cleanupSandbox.window.WSMudPlugin.installFeatures({
  WG: cleanupWG,
  messageAppend: (message) => cleanupMessages.push(message),
  timers: {
    setTimeout: () => 1,
    clearTimeout: () => {},
  },
  clone: (value) => {
    cleanupCloneCalls += 1;
    return JSON.parse(JSON.stringify(value));
  },
  legacy: {
    getStoreList: () => ["<hig>keep</hig>"],
    getDropList: () => ["<wht>trash</wht>", "<hic>locked</hic>"],
    getLockList: () => ["<hic>locked</hic>"],
    getDisassembleList: () => ["<hiy>scrap</hiy>"],
  },
});
await cleanupWG.sell_all();
const cleanupDialogHook = cleanupHooks.find((entry) =>
  Array.isArray(entry.types),
);
const cleanupLoginHook = cleanupHooks.find((entry) => entry.types === "login");
assert(
  cleanupDialogHook &&
    cleanupLoginHook &&
    cleanupWG.packup_listener === cleanupDialogHook.id &&
    cleanupGoTargets[0] === "扬州城-钱庄" &&
    cleanupSent[0] === "store;pack",
  "包裹整理未保持公开 Hook、钱庄寻路或仓库请求",
);
cleanupDialogHook.fn({
  type: "dialog",
  dialog: "pack",
  items: [["过早响应", "early-pack", 1]],
});
assert(
  cleanupCommands.length === 0 && cleanupWG.packup_ready === false,
  "包裹整理错误消费了左栏刷新等并发流程的背包响应",
);
cleanupDialogHook.fn({
  type: "dialog",
  dialog: "list",
  stores: [["<hig>keep</hig>", "stored-keep", 3, 1, "件", 1, 1]],
});
assert(
  cleanupSent[1] === "pack" &&
    cleanupMessages.includes(
      "<hio>包裹整理</hio>已取得仓库数据，正在读取背包",
    ),
  "包裹整理取得仓库快照后未请求自己的背包快照",
);
cleanupDialogHook.fn({
  type: "dialog",
  dialog: "pack",
  items: [
    ["<hig>keep</hig>", "keep-id", 1, 1, "件", 1, 1],
    ["<wht>trash</wht>", "trash-id", 1],
    ["<hic>locked</hic>", "locked-id", 1],
    ["<hiy>scrap</hiy>", "scrap-id", 1],
  ],
});
const cleanupCommandList = cleanupCommands[0];
assert(
  cleanupCloneCalls === 2 &&
    cleanupWG.packup_ready === true &&
    cleanupCommandList.join(";") ===
      "store 1 keep-id;$wait 350;fenjie scrap-id;$wait 350;" +
        "$wait 1000;$to 扬州城-杂货铺;sell all;$wait 1000;" +
        "drop trash-id;$wait 350;look3 1" &&
    !cleanupCommandList.some((command) => command.includes("locked-id")),
  "包裹整理未保持存仓上限、分解/出售/丢弃顺序或物品锁行为",
);
const firstCleanupHook = cleanupWG.packup_listener;
cleanupWG.sell_all();
assert(
  cleanupWG.packup_listener === undefined &&
    cleanupWG.packup_ready === false &&
    cleanupRemovedHooks.includes(firstCleanupHook) &&
    cleanupMessages.includes("<hio>包裹整理</hio>手动结束"),
  "包裹整理重复启动未保持手动结束语义或清理状态",
);
cleanupWG.sell_all();
const completionCleanupHook = cleanupHooks.at(-1);
completionCleanupHook.fn({ type: "text", msg: "没有这个玩家。" });
assert(
  cleanupWG.packup_listener === undefined &&
    cleanupMessages.includes("<hio>包裹整理</hio>完成"),
  "包裹整理完成后未清理 Hook 或保留完成提示",
);
cleanupWG.sell_all();
const loginCleanupHook = cleanupWG.packup_listener;
cleanupLoginHook.fn({ type: "login", id: "next-role" });
assert(
  cleanupWG.packup_listener === undefined &&
    cleanupRemovedHooks.includes(loginCleanupHook),
  "角色切换后包裹整理仍残留流程 Hook",
);
cleanupSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  cleanupRemovedHooks.includes(cleanupLoginHook.id) &&
    cleanupWG.sell_all === undefined &&
    cleanupWG.cancelInventoryCleanup === undefined,
  "包裹整理销毁后仍残留 login Hook 或公开入口",
);
const tradingHooks = [];
const tradingRemovedHooks = [];
const tradingGoTargets = [];
const tradingSent = [];
const tradingCommandBatches = [];
const tradingMessages = [];
let tradingHookId = 0;
const tradingSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
};
tradingSandbox.window.window = tradingSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/auto-trading.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    tradingSandbox,
    { filename: sourcePath },
  );
}
const tradingWG = {
  add_hook: (types, fn) => {
    const id = ++tradingHookId;
    tradingHooks.push({ id, types, fn });
    return id;
  },
  remove_hook: (id) => tradingRemovedHooks.push(id),
  deserializePackData: (value) => value,
  go: async (target) => tradingGoTargets.push(target),
  waitUntilAt: async () => true,
  at: () => true,
  getIdByName: (name) =>
    name === "唐楠" ? "npc-tang" : name === "朱熹" ? "npc-zhu" : undefined,
  Send: (command) => tradingSent.push(command),
  SendCmd: (commands) => tradingCommandBatches.push(commands),
};
tradingSandbox.window.WSMudPlugin.installFeatures({
  WG: tradingWG,
  jquery: () => ({ click: () => {} }),
  messageAppend: (message) => tradingMessages.push(message),
  clone: (value) => JSON.parse(JSON.stringify(value)),
  legacy: {
    getAutoBuyList: () => "养精丹,<hig>疗伤药</hig>",
    getAutoSkillPaperSellList: () => "基本剑法,<hio>基本刀法</hio>",
  },
});
await tradingWG.tnBuy();
const pawnshopTradingHook = tradingHooks.find((entry) =>
  Array.isArray(entry.types),
);
pawnshopTradingHook.fn({
  type: "dialog",
  title: "唐楠正在贩卖以下商品",
  seller: "npc-tang",
  selllist: [
    { id: "pill-a", name: "<hig>养精丹</hig>", count: 2 },
    { id: "pill-b", name: "疗伤药", count: 1 },
    { id: "pill-c", name: "不购买", count: 9 },
  ],
});
assert(
  tradingGoTargets[0] === "扬州城-当铺" &&
    tradingSent[0] === "list npc-tang" &&
    tradingCommandBatches[0].join(";") ===
      "buy 2 pill-a from npc-tang;$wait 500;buy 1 pill-b from npc-tang;$wait 500;look3 1",
  "自动购买未等待到达当铺、解析带颜色物品名或生成购买命令",
);
pawnshopTradingHook.fn({ type: "text", msg: "没有这个玩家，或者不在线。" });
await tradingWG.zxBuy();
const bookTradingHook = tradingHooks
  .filter((entry) => Array.isArray(entry.types))
  .at(-1);
bookTradingHook.fn({
  type: "dialog",
  dialog: "pack",
  items: [
    { id: "book-a", name: "<hio>基本剑法</hio>", count: 3 },
    { id: "book-b", name: "基本刀法", count: 1 },
    { id: "book-c", name: "保留秘籍", count: 1 },
  ],
});
assert(
  tradingGoTargets[1] === "扬州城-书院" &&
    tradingSent[1] === "pack" &&
    tradingCommandBatches[1].join(";") ===
      "sell 3 book-a to npc-zhu;$wait 500;sell 1 book-b to npc-zhu;$wait 500;look3 1" &&
    tradingRemovedHooks.includes(pawnshopTradingHook.id),
  "自动售卖未等待到达书院、解析带颜色秘籍名或清理上一交易 Hook",
);
bookTradingHook.fn({ type: "text", msg: "没有这个玩家。" });
tradingSandbox.window.WSMudPlugin.destroyFeatures();
assert(
  tradingRemovedHooks.includes(bookTradingHook.id) &&
    tradingWG.tnBuy === undefined &&
    tradingWG.zxBuy === undefined &&
    tradingMessages.filter((message) => message === "执行结束").length === 2,
  "自动交易完成或销毁后仍残留 Hook、公开入口或结束状态",
);
let combatIntervalCallback;
let combatIntervalId = 0;
const combatAutomationSent = [];
const combatAutomationSandbox = {
  window: {},
  document: { currentScript: null, querySelector: () => null },
  GM_getValue: (_key, fallback) => fallback,
  setInterval: (callback) => {
    combatIntervalCallback = callback;
    combatIntervalId += 1;
    return combatIntervalId;
  },
  clearInterval: () => {},
  setTimeout,
  clearTimeout,
  $: () => ({ css: () => {} }),
};
combatAutomationSandbox.window.window = combatAutomationSandbox.window;
for (const sourcePath of [
  "features/plugin/core.js",
  "features/plugin/combat-automation.js",
]) {
  runInNewContext(
    readFileSync(join(extensionRoot, sourcePath), "utf8"),
    combatAutomationSandbox,
    { filename: sourcePath },
  );
}
const combatAutomationG = {
  auto_preform: true,
  auto_pfm_mode: false,
  in_fight: true,
  preform_timer: undefined,
  gcd: false,
  cds: new Map(),
  skills: [{ id: "perform-a" }, { id: "perform-b" }, { id: "perform-c" }],
  selfStatus: [],
  score2: { releasetime: "0秒" },
};
const combatAutomationWG = {
  hasStr: (value, list) =>
    list && list.length == null
      ? Object.values(list).some((items) => items.includes(value))
      : (list || []).includes(value),
  inArray: (value, list) => list.includes(value),
  Send: (command) => combatAutomationSent.push(command),
  sleep: async () => {},
  prepareAutoFirstRound: () => {},
  processAutoFirstRound: () => false,
  resetAutoFirstRoundCombat: () => {},
  updateNativeAutoAttackActionState: () => {},
};
combatAutomationSandbox.window.WSMudPlugin.installFeatures({
  WG: combatAutomationWG,
  G: combatAutomationG,
  messageAppend: () => {},
  legacy: {
    getBlockedPerforms: () => [],
    getRoleId: () => "role-a",
    getDisabledPerforms: () => "",
    setDisabledPerforms: () => {},
  },
});
combatAutomationWG.auto_preform();
combatIntervalCallback();
combatAutomationG.cds.set("perform-a", true);
combatIntervalCallback();
combatAutomationG.cds.set("perform-b", true);
combatIntervalCallback();
assert(
  combatAutomationSent.join("|") ===
    "perform perform-a|perform perform-b|perform perform-c" &&
    combatAutomationWG.is_zero_releasetime() === true,
  "非智能自动施法未按上游冷却优先逻辑继续选择下一招",
);
combatAutomationG.score2.releasetime = "0秒";
assert(
  combatAutomationWG.is_zero_releasetime() === true &&
    combatAutomationWG.autoPerformCursor === undefined,
  "自动施法未恢复上游释放时间判断或仍残留轮转游标",
);
combatAutomationG.score2.releasetime = "<hig>0.0 秒</hig>";
assert(
  combatAutomationWG.is_zero_releasetime() === true,
  "自动施法未识别现网带小数、空格或颜色标签的零秒释放时间",
);
combatAutomationG.score2.releasetime = "1.2秒";
assert(
  combatAutomationWG.is_zero_releasetime() === false,
  "自动施法把非零释放时间误判为零秒",
);
combatAutomationWG.auto_preform("stop");
combatAutomationSent.length = 0;
combatAutomationG.auto_pfm_mode = true;
combatAutomationG.in_fight = true;
combatAutomationG.score2.releasetime = "0.0秒";
combatAutomationG.cds.clear();
combatAutomationWG.auto_preform();
combatIntervalCallback();
await new Promise((resolve) => setTimeout(resolve, 40));
assert(
  combatAutomationSent.join("|") ===
    "perform perform-a|perform perform-b|perform perform-c",
  "智能自动施法未保留上游 0.0 秒释放时间下继续扫描全部无招的组合语义: " +
    combatAutomationSent.join("|"),
);
combatAutomationWG.auto_preform("stop");
assert(
  dataMaintenanceResetCount === 1 &&
    typeof pluginModuleWG.update_store === "function" &&
    typeof pluginModuleWG.clean_dps === "function",
  "数据维护模块未保持商品重置、仓库或战斗统计入口",
);
assert(
  pluginModuleWG.make_med_cmd([["herb-a", "herb-b"]], 3, 1) ===
    "lianyao2 start 3;lianyao2 add herb-a;" +
      "lianyao2 start 3;lianyao2 add herb-b;lianyao2 stop;$syso 炼制完成;" &&
    typeof pluginModuleWG.auto_start_dev_med === "function" &&
    typeof pluginModuleWG.auto_Development_medicine === "function",
  "炼药模块未保持配方命令或自动炼制入口",
);
assert(
  typeof pluginModuleWG.auto_useitem === "function" &&
    pluginModuleWG.useitem_hook === undefined,
  "批量物品使用模块未保持入口或初始 Hook 状态",
);
const trainingEstimate = pluginModuleWG.lx(10, 20, 30, 1, 3, 2);
assert(
  pluginModuleWG.formatCurrencyTenThou(1234567) === "1,234,567" &&
    trainingEstimate.qianneng === 40 &&
    typeof trainingEstimate.time === "string",
  "修炼计算模块未保持数值格式化或潜能估算行为",
);
pluginModuleWG.hasStr = (value, values) => values.includes(value);
pluginModuleG.selfStatus = ["busy"];
assert(
  pluginModuleWG.is_free() === false &&
    typeof pluginModuleWG.auto_preform === "function" &&
    typeof pluginModuleWG.auto_preform_switch === "function",
  "自动战斗模块未保持忙碌状态判定或施法入口",
);
assert(
  typeof pluginModuleWG.calc === "function" &&
    typeof pluginModuleWG.dsj === "function" &&
    typeof pluginModuleWG.qnjs === "function" &&
    typeof pluginModuleWG.zcjs === "function",
  "工具箱与定时任务模块未完整安装历史入口",
);
assert(
  typeof pluginModuleWG.initPluginSettings === "function" &&
    typeof pluginModuleWG.applyPluginFeatureFlags === "function" &&
    typeof pluginModuleWG.updateSideDashboard === "function" &&
    typeof pluginModuleWG.initSideDashboard === "function" &&
    typeof pluginModuleWG.processAutoFirstRound === "function" &&
    typeof pluginModuleWG.requestBestPotentialWork === "function",
  "插件增量模块未能通过显式上下文安装",
);
assert(
  typeof pluginModuleUI.wgui === "function" &&
    typeof pluginModuleWG.wgui === "undefined",
  "UI 外壳必须安装到登录流程实际调用的 UI.wgui",
);
assert(
  typeof pluginModuleServices.remoteConfig?.shareJson === "function" &&
    typeof pluginModuleServices.speech?.playtts === "function" &&
    typeof pluginModuleServices.beep === "function" &&
    typeof pluginModuleServices.push === "function" &&
    typeof pluginModuleServices.MusicBox === "function",
  "通知与远程服务模块未能通过显式上下文安装",
);
const pluginShellMarkup = pluginModuleUI.wgui();
assert(
  pluginShellMarkup.includes("WG_side_rail_left") &&
    pluginShellMarkup.includes("WG_side_rail_right") &&
    pluginShellMarkup.includes('data-equipment-group="0"') &&
    pluginShellMarkup.includes('data-equipment-group="1"') &&
    pluginShellMarkup.includes('data-equipment-group="2"') &&
    pluginShellMarkup.includes("WG_equipment_picker") &&
    pluginShellMarkup.includes("WG_auto_first_round"),
  "插件运行包安装后未生成完整的两侧面板 UI",
);
pluginModuleWG.equipmentPickerItems = [];
pluginPackData = [{ id: "fallback-sword", name: "测试剑", can_eq: 1 }];
assert(
  pluginModuleWG.getEquipmentPickerItems()[0].id === "fallback-sword",
  "装备选择模块未通过显式 accessor 读取旧背包快照",
);
for (const playerMarkerContract of [
  "formatRoomItemName",
  'marker.className = "player-name-marker"',
  'marker.textContent = "★"',
  "stateMatch",
  "item.id == currentProcess.player",
]) {
  assert(
    roomRendererModuleSource.includes(playerMarkerContract),
    `当前玩家名字缺少精炼星标或状态前定位逻辑: ${playerMarkerContract}`,
  );
}
for (const playerMarkerStyleContract of [
  ".room-item .player-name-marker",
  "color: #ffd43b !important",
  "-webkit-text-fill-color: #ffd43b !important",
  ".WG_item_popup.WG_has_secondary .WG_item_popup_dialog",
  ".dialog.WG_item_popup_secondary",
  ".dialog-confirm.WG_item_popup_secondary",
  "z-index: 2147483601 !important",
  "z-index: 2147483602 !important",
]) {
  assert(
    automationSource.includes(playerMarkerStyleContract),
    `当前玩家星标缺少醒目黄色样式: ${playerMarkerStyleContract}`,
  );
}
for (const obsoletePlayerGradientContract of [
  "supernova-text",
  "rainbowplayer",
  "rainbow_name",
  'UI.html_switch("rainbowname"',
]) {
  assert(
    !automationSource.includes(obsoletePlayerGradientContract),
    `仍保留玩家渐变名字逻辑: ${obsoletePlayerGradientContract}`,
  );
}
for (const sideDashboardContract of [
  "width: 100vw !important",
  "--WG-left-rail-width: 15vw",
  "--WG-right-rail-width: 15vw",
  "width: calc(100vw - var(--WG-left-rail-width) - var(--WG-right-rail-width)) !important",
  "margin-left: var(--WG-left-rail-width) !important",
  "margin-right: 0 !important",
  "font-size: inherit",
  ".WG_side_rail_left > .WG_rail_role",
  "realmColorMatch",
  'realmTag = realmColorMatch ? realmColorMatch[1].toLowerCase() : "nor"',
  '.append($("<" + realmTag + ">").text(roleText))',
  "WG_side_rail_left",
  "WG_side_rail_right",
  "WG_side_dashboard_actions",
  "WG_side_chat_view",
  "WG_side_chat_filters",
  "WG_side_chat_history_host",
  "WG_chat_history_origin",
  "renderSideChatFilters",
  "restoreSideChatHistory",
  "WGOpenSideChatPanel",
  'channel.addClass("channel-dialog").appendTo(historyHost)',
  "WG_side_chat_panel_host",
  "WG_side_chat_composer",
  "WG_side_chat_channels",
  "WG_side_chat_input",
  "WG_side_chat_send",
  "WG_legacy_chat_panel",
  "ensureSideChatComposer",
  "sendSideChatMessage",
  "sideChatEntryCaptureHandler",
  'document.addEventListener(',
  "WG_side_chat_open",
  "isSideChatPanelOpen",
  "setSideChatPanelOpen",
  "toggleSideChatPanel",
  "initSideChatPanel",
  "sideChatViewWasCreated",
  "wasSideChatOpen",
  "sideChatViewWasCreated || wasSideChatOpen",
  "WGToggleSideChatPanel",
  "WGCloseSideChatPanel",
  "WGIsSideChatPanelOpen",
  "var layeredPopup",
  'actions.attr("aria-hidden", "true").hide()',
  '"aria-controls": "WG_side_chat_view"',
  "WG_chat_drawer_bar",
  "WG_chat_drawer_shell",
  "WG_chat_drawer_resizer",
  "WG_info_panel_controls",
  "WG_message_boundary_resizer",
  "WG_chat_drawer_collapsed",
  "chatDrawerStorageKey",
  "setChatDrawerCollapsed",
  "initChatDrawer",
  "position: absolute",
  "bottom: 100%",
  "height: var(--WG-chat-drawer-height, 32vh)",
  "left: 0",
  "justify-content: flex-start",
  ".container.WG_chat_drawer_collapsed .WG_chat_drawer_shell",
  ".container.WG_chat_drawer_collapsed .WG_chat_drawer_shell > .channel",
  "display: none",
  '.attr("aria-label", collapsed ? "展开聊天栏" : "收起聊天栏")',
  'bottomBar.children(".WG_chat_drawer_shell")',
  'children(".WG_info_panel_controls")',
  'shell.children(".WG_chat_drawer_resizer").remove()',
  'shell.attr("aria-hidden", "true").hide()',
  'WG.toggleSideChatPanel()',
  '"aria-controls": "WG_side_chat_view"',
  "chatDrawerHeightKey",
  "applyChatDrawerHeight",
  "restoreChatDrawerHeight",
  "initChatDrawerResizer",
  "pointerdown.WG_chat_drawer_resize",
  "keydown.WG_chat_drawer_resize",
  'role="separator" aria-label="调整聊天区域高度"',
  "WG_middle_split_managed",
  "WG_middle_split",
  "middleSplitRatioKey",
  "applyMiddleSplitRatio",
  "resetMiddleSplitRatio",
  "restoreMiddleSplitRatio",
  "initRoomInfoBoundaryResizer",
  "flex-grow: var(--WG-room-panel-share, 45)",
  "flex-grow: var(--WG-message-panel-share, 55)",
  "flex: 1 1 0",
  "> .room_items",
  "max-height: none !important",
  "overflow-y: auto !important",
  "flex-basis: 0 !important",
  '"--WG-room-panel-share"',
  '"--WG-message-panel-share"',
  '"--WG-middle-split-position"',
  "top: var(--WG-middle-split-position, 45%)",
  "splitHeight: messageRect.bottom - roomRect.top",
  "pointerdown.WG_message_boundary_resize",
  "keydown.WG_message_boundary_resize",
  'role="separator" aria-label="调整人物列表与信息栏边界"',
  "WG_quick_loadouts",
  "WG_quick_loadout",
  'data-equipment-group="0"',
  '.off("click.WG_quick_loadout")',
  'WG.Send("eqgroup " + equipmentGroup)',
  "updateQuickLoadoutState",
  "event.eq_group != null",
  '.attr("aria-pressed", String(selected))',
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  "WG_equipment_list",
  "WG_equipment_picker",
  "WG_equipment_picker_choice",
  "WG_equipment_picker_quick",
  'role="dialog" aria-modal="true"',
  'role: "button"',
  '"aria-haspopup": "dialog"',
  "openEquipmentPicker",
  "closeEquipmentPicker",
  "captureEquipmentPickerResponse",
  "parseEquipmentSlot",
  "sortEquipmentPickerItems",
  "appendEquipmentPickerItem",
  "calculateEquipmentPickerPosition",
  "positionEquipmentPicker",
  'data-placement="right"',
  'data-placement="left"',
  'data-placement="sheet"',
  "WG_equipment_picker_current_badge",
  "syncEquipmentPickerTypography",
  '"font-size": typography.fontSize',
  "equipmentSlotCacheVersion: 1",
  "equipmentSlotCacheLimit: 500",
  "getEquipmentSlotCacheKey",
  "loadEquipmentSlotCache",
  "saveEquipmentSlotCache",
  "rememberEquipmentSlot",
  "GM_getValue(cacheKey, null)",
  "GM_setValue(cacheKey, payload)",
  'requests.push("checkobj " + item.id + " from item")',
  'WG.Send("eq " + itemId)',
  'text: "快速"',
  'text: pendingCount',
  '" grade" + Number(item.grade)',
  "equipmentName.html(item.name)",
  "color: var(--border-color, #c0c0c0)",
  "initSideDashboard",
  "updateSideDashboard",
  "setDashboardResource",
  "dashboardSnapshotVersion: 1",
  "getDashboardSnapshotKey",
  "formatDashboardLevel",
  "saveDashboardSnapshot",
  "loadDashboardSnapshot",
  "requestDashboardSnapshot",
  "requestAutomationScore2",
  "scheduleDashboardStateRefresh",
  "observeDashboardCommand",
  "applyDashboardScoreSnapshot",
  "syncDashboardAfterSkillProgress",
  "limitMpMatch",
  "/内力上限增加了\\s*(\\d+)/",
  '"_WG_dashboard_snapshot_v1"',
  'WG.Send("score")',
  'WG.Send("score2")',
  'case "levelup"',
  "parseDashboardEnergy",
  "mergeDashboardEnergyTotal",
  "mergeDashboardEnergyDelta",
  "WG_energy_value",
  "WG_energy_timed_value",
  "WG_energy_permanent_value",
  '"(+" + WG.dashboardNumber(energy.timed) + ")"',
  'mpValue.text() + " (" + WG.dashboardNumber(score.limit_mp) + ")"',
  'role="img" aria-label="暂无常驻精力数据"',
  '"常驻精力 "',
  "energyPermanentPercent",
  "(energy.permanent * 100) / energy.maximum",
  "G.maxHp != null ? G.maxHp : player.max_hp",
  "G.maxMp != null ? G.maxMp : player.max_mp",
  "r.max_hp = o.max_hp",
  "r.max_mp = o.max_mp",
  "parsePotentialWorkBonuses",
  "rankPotentialWorks",
  "requestBestPotentialWork",
  "startPotentialWork",
  "startPreparedPotentialWork",
  "preparePotentialWorkEquipment",
  "potentialWorkEquipmentPreparationToken",
  "/铁镐|移山镐/",
  "/药王神篇|神农百草经/",
  "startFishingPotentialWork",
  'Promise.resolve(WG.go("扬州城-江边"))',
  "stopPotentialWorkAutoCheck",
  "schedulePotentialWorkAutoCheck",
  "handlePotentialWorkState",
  "potentialWorkAutoCheckTimer",
  "currentWork.bonus == ranked[0].bonus",
  "finish([], true)",
  "ensureNativeControlsVisible",
  "WG_rail_resizer_left",
  "WG_rail_resizer_right",
  "initSideRailResizers",
  "applySideRailWidths",
  "WG_side_rail_widths",
  "pointerdown.WG_rail_resize",
  "dblclick.WG_rail_resize",
  "WG_auto_first_round_dialog",
  "autoFirstRoundVersion: 1",
  "getAutoFirstRoundStorageKey",
  "normalizeAutoFirstRoundOrder",
  "loadAutoFirstRoundConfig",
  "saveAutoFirstRoundConfig",
  "renderAutoFirstRoundDialog",
  "beginAutoFirstRoundDrag",
  "moveAutoFirstRoundDrag",
  "endAutoFirstRoundDrag",
  "syncAutoFirstRoundDragOrder",
  "keyAutoFirstRoundDrag",
  "pointerdown.WG_auto_first_round_drag",
  "pointercancel.WG_auto_first_round_drag",
  "WG_auto_first_round_drag_handle",
  'WG.Send("combat")',
  "prepareAutoFirstRound",
  "processAutoFirstRound",
  'WG.Send("perform " + skillId)',
  '"_WG_auto_first_round_v1"',
  "首轮结束后，恢复冷却完成即出招",
  'data-resource="experience"',
  'controls.children(".WG_chat_drawer_toggle").remove()',
  "runNativeExtensionAction",
  "WGRunNativeExtensionAction",
  "prepareSmartEquipment",
  "chooseSmartEquipment",
  "parseSmartEquipmentDetail",
  "requestSmartEquipmentSnapshot",
  "smartEquipmentPreparationToken",
  "smartEquipmentDetailRequestConcurrency: 6",
  "smartEquipmentDetailRequestTimeout: 1800",
  "smartEquipmentDetailBatchDeadline: 5000",
  "smartEquipmentDetailCacheSaveTimers: {}",
  "_WG_smart_equipment_details_v1",
  "getCachedSmartEquipmentDetail",
  "pruneSmartEquipmentDetailCache",
  "smartEquipmentSelectionCacheVersion: 1",
  "buildSmartEquipmentSelectionFingerprint",
  "restoreSmartEquipmentSelection",
  "rememberSmartEquipmentSelection",
  'WG.prepareSmartEquipment("study"',
  'WG.prepareSmartEquipment("intelligence"',
  "runAfterOptionalTravelEquipment",
  "smartEquipmentOnTravel",
  'case "home"',
  'case "master"',
  'case "wumiao"',
  'case "cleanup"',
  'case "work"',
  'case "yamen"',
  "WG.go_yamen_task()",
  'case "auto"',
  "smartHomeHook",
  "smartHomeTimer",
  "cancelSmartHomeWatch",
  'WG.add_hook("room"',
  '"yz/home" != path',
  'path.indexOf("home/")',
  'WG.go("扬州城-有间客栈")',
  "WG.auto_preform_switch()",
  "WG_plugin_auto_toggle",
  "updateNativeAutoAttackActionState",
  "WG_native_auto_active",
  "color: black !important",
  "background-color: gray !important",
  "background-image: none !important",
  '"aria-pressed": String(enabled)',
  'title: "自动攻击："',
]) {
  assert(
    automationSource.includes(sideDashboardContract),
    `左右常驻信息栏缺少布局、数据或动作契约: ${sideDashboardContract}`,
  );
}
assert(
  combatModuleSource.includes(
    "hostWindow.WGUpdateNativeAutoAttackActionState()",
  ),
  "原生动作栏重建后未同步自动攻击按钮状态",
);
assert(
  !automationSource.includes('data-wg-action=') &&
    !automationSource.includes('<button class="WG_chat_drawer_toggle"'),
  "右侧动作按钮或额外聊天按钮仍被模板创建",
);
for (const nativeExtensionBridgeContract of [
  "wg: function",
  "WGRunNativeExtensionAction",
  "WGUpdateNativeAutoAttackActionState",
]) {
  assert(
    gameClientSource.includes(nativeExtensionBridgeContract) ||
      scriptEngineSource.includes(nativeExtensionBridgeContract) ||
      combatModuleSource.includes(nativeExtensionBridgeContract),
    `原生扩展脚本缺少插件动作转接: ${nativeExtensionBridgeContract}`,
  );
}
const channelContractSource = gameClientSource + "\n" + dialogChannelModuleSource;
for (const channelSidePanelContract of [
  'registerModule(\n    "dialog-channel"',
  "window.WGOpenSideChatPanel",
  "WGOpenSideChatPanel()",
  "isSidePanelMenuCommand",
  '/^#menu\\s+showchat(?:\\s|$)/',
  "!isSidePanelMenuCommand",
  "Dialog.clearLayerRequests()",
  'typeof window.WG.initSideChatPanel == "function"',
  "window.WG.initSideChatPanel()",
]) {
  assert(
    channelContractSource.includes(channelSidePanelContract),
    `聊天记录点击仍未优先打开右侧聊天面板: ${channelSidePanelContract}`,
  );
}
assert(
  !gameClientSource.includes(
    'if (isFloatingDialogCommand && Dialog.isShow) Dialog.hide()',
  ),
  "聊天侧栏入口不应关闭或接管通用悬浮弹窗",
);
assert(
  !gameClientSource.includes(
    '$(".chat-panel").toggleClass("hide")',
  ),
  "聊天入口不应回退为原生悬浮聊天面板",
);
assert(
  !automationSource.includes('panel.appendTo(host)'),
  "右侧聊天不应继续搬用原生悬浮聊天面板",
);
assert(
  automationSource.includes('.chat-panel.WG_legacy_chat_panel') &&
    automationSource.includes('display: none !important'),
  "旧原生聊天悬浮窗必须被永久禁用",
);
assert(
  automationSource.includes('.WG_chat_drawer_shell {') &&
    automationSource.includes('display: none !important'),
  "中间聊天记录容器必须永久隐藏，聊天入口由原生按钮提供",
);
assert(
  !automationSource.includes('chatDrawerChannel.insertBefore(".content-message")'),
  "聊天记录不应再恢复到中间信息区显示",
);
for (const compactSideChatContract of [
  "grid-template-columns: repeat(7, minmax(0, 1fr))",
  "grid-template-columns: repeat(6, minmax(0, 1fr))",
  "height: 2.15em",
  "font-size: 0.72em",
  "padding-top: 0.3em",
]) {
  assert(
    automationSource.includes(compactSideChatContract),
    `右栏聊天上下按钮栏缺少单行紧凑布局契约: ${compactSideChatContract}`,
  );
}

for (const pluginSettingsContract of [
  "WG_plugin_settings",
  "WG_plugin_settings_dialog",
  "WG_plugin_settings_features",
  "WG_plugin_settings_loadouts",
  "WG_plugin_loadout_name",
  "getQuickLoadoutNames",
  "setQuickLoadoutName",
  "quickLoadoutNamesVersion: 1",
  "WG.resetQuickLoadoutNames()",
  '"change.WG_plugin_settings"',
  "WG_plugin_switch",
  "WG_plugin_feature_flags_v1",
  "pluginFeatureDefinitions",
  "applyPluginFeatureFlags",
  "renderPluginSettings",
  "openPluginSettings",
  "initPluginSettings",
  'command="pluginsettings"',
  ">更多插件功能</button>",
  "horizontalMenu",
  "chatDrawer",
  "equipmentPicker",
  "smartEquipmentOnTravel",
  "floatingPanels",
  "characterPopup",
  "mapAutoRoute",
  "WG_plugin_settings_auto",
  "WG_plugin_auto_toggle",
  "WG_plugin_settings_auto_first_round",
  'kind: "auto"',
  "WG.auto_preform_switch()",
  "WG.openAutoFirstRoundDialog(this)",
]) {
  assert(
    pluginSettingsSource.includes(pluginSettingsContract),
    `插件设置入口缺少自动攻击管理或功能开关: ${pluginSettingsContract}`,
  );
}
for (const runtimeFeatureContract of [
  "IsWGPluginFeatureEnabled",
  'IsWGPluginFeatureEnabled("characterPopup")',
  'IsWGPluginFeatureEnabled("floatingPanels")',
  'case "pluginsettings"',
  "window.WGOpenPluginSettings",
]) {
  assert(
    gameClientSource.includes(runtimeFeatureContract),
    `插件功能开关未接入游戏运行逻辑: ${runtimeFeatureContract}`,
  );
}
assert(
  mapModuleSource.includes('isFeatureEnabled("mapAutoRoute")'),
  "地图自动寻路功能开关未通过显式依赖接入",
);
const renderFirstRoundSource = automationSource.match(
  /      renderAutoFirstRoundDialog: function \(\) \{[\s\S]*?\n      },\n      openAutoFirstRoundDialog:/,
)?.[0];
assert(renderFirstRoundSource, "无法读取首轮出招列表渲染逻辑");
assert(
  renderFirstRoundSource.includes('"data-first-round-command": "remove"') &&
    !renderFirstRoundSource.includes('["up"') &&
    !renderFirstRoundSource.includes('["down"'),
  "首轮出招仍在使用上下按钮排序，或删除操作缺失",
);

function readDashboardMethod(
  methodName,
  nextMethodName,
  sandbox = dashboardSandbox,
) {
  const methodEnd = nextMethodName
    ? `\\n      \\}),\\n      ${nextMethodName}:`
    : "\\n      \\}),\\n    \\}\\);";
  const match = automationSource.match(
    new RegExp(`${methodName}: (function[\\s\\S]*?${methodEnd}`),
  );
  assert(match, `无法读取侧栏方法: ${methodName}`);
  return runInNewContext(`(${match[1]})`, sandbox);
}

const calculateEquipmentPickerPosition = readDashboardMethod(
  "calculateEquipmentPickerPosition",
  "scheduleEquipmentPickerPosition",
  {},
);
const rightAnchoredPicker = calculateEquipmentPickerPosition(
  { left: 20, right: 210, top: 280 },
  480,
  420,
  1440,
  900,
);
assert(
  rightAnchoredPicker.placement === "right" &&
    rightAnchoredPicker.left === 220 &&
    rightAnchoredPicker.top === 236,
  "装备弹窗未贴近左侧装备槽展开",
);
const leftAnchoredPicker = calculateEquipmentPickerPosition(
  { left: 1210, right: 1400, top: 840 },
  480,
  420,
  1440,
  900,
);
assert(
  leftAnchoredPicker.placement === "left" &&
    leftAnchoredPicker.left === 720 &&
    leftAnchoredPicker.top === 470,
  "装备弹窗未在空间不足时翻转或避让底部",
);
const compactPicker = calculateEquipmentPickerPosition(
  { left: 10, right: 100, top: 200 },
  590,
  500,
  600,
  800,
);
assert(
  compactPicker.placement === "sheet" &&
    compactPicker.left === 5 &&
    compactPicker.top === 295,
  "窄屏装备弹窗未回退为底部面板",
);

const dashboardSandbox = {
  WG: {
    dashboardPlainText(value) {
      return String(value).replace(/<[^>]+>/g, "").trim() || "—";
    },
    dashboardNumber(value) {
      return Number(value).toLocaleString("zh-CN");
    },
  },
};
dashboardSandbox.legacy = {
  getRoleId: () => dashboardSandbox.roleid,
  getRoleName: () => dashboardSandbox.role,
};
const nativeAutoElements = [
  { attrs: { cmd: "#wg auto" }, classes: new Set() },
  { attrs: { cmd: "#wg work" }, classes: new Set() },
];
const nativeAutoDollar = (target) => {
  const elements =
    typeof target === "string"
      ? target === ".room-commands > .act-item"
        ? nativeAutoElements
        : []
      : [target];
  return {
    filter(callback) {
      return nativeAutoDollarCollection(
        elements.filter((element, index) => callback.call(element, index)),
      );
    },
    attr(name, value) {
      if (typeof name === "string" && value === undefined) {
        return elements[0]?.attrs[name];
      }
      const attributes = typeof name === "object" ? name : { [name]: value };
      for (const element of elements) Object.assign(element.attrs, attributes);
      return this;
    },
    toggleClass(name, enabled) {
      for (const element of elements) {
        if (enabled) element.classes.add(name);
        else element.classes.delete(name);
      }
      return this;
    },
  };
};
const nativeAutoDollarCollection = (elements) => {
  const collection = nativeAutoDollar(null);
  collection.filter = (callback) =>
    nativeAutoDollarCollection(
      elements.filter((element, index) => callback.call(element, index)),
    );
  collection.attr = (attributes) => {
    for (const element of elements) Object.assign(element.attrs, attributes);
    return collection;
  };
  collection.toggleClass = (name, enabled) => {
    for (const element of elements) {
      if (enabled) element.classes.add(name);
      else element.classes.delete(name);
    }
    return collection;
  };
  return collection;
};
const nativeAutoSandbox = { G: { auto_preform: true }, $: nativeAutoDollar, WG: {} };
nativeAutoSandbox.WG.updateNativeAutoAttackActionState = readDashboardMethod(
  "updateNativeAutoAttackActionState",
  "smartEquipmentDetailPending",
  nativeAutoSandbox,
);
nativeAutoSandbox.WG.updateNativeAutoAttackActionState();
assert(
  nativeAutoElements[0].classes.has("WG_native_auto_active") &&
    nativeAutoElements[0].attrs["aria-pressed"] === "true" &&
    nativeAutoElements[0].attrs.title === "自动攻击：已开启" &&
    !nativeAutoElements[1].classes.has("WG_native_auto_active"),
  "原生自动攻击按钮开启状态未正确高亮或误影响其他动作",
);
nativeAutoSandbox.G.auto_preform = false;
nativeAutoSandbox.WG.updateNativeAutoAttackActionState();
assert(
  !nativeAutoElements[0].classes.has("WG_native_auto_active") &&
    nativeAutoElements[0].attrs["aria-pressed"] === "false" &&
    nativeAutoElements[0].attrs.title === "自动攻击：已关闭",
  "原生自动攻击按钮关闭后未恢复普通状态",
);
dashboardSandbox.roleid = "role-test";
dashboardSandbox.role = "测试角色";
dashboardSandbox.G = { id: "player-test", score: {} };
dashboardSandbox.WG.dashboardSnapshotVersion = 1;
dashboardSandbox.WG.getDashboardSnapshotKey = readDashboardMethod(
  "getDashboardSnapshotKey",
  "formatDashboardLevel",
);
dashboardSandbox.WG.formatDashboardLevel = readDashboardMethod(
  "formatDashboardLevel",
  "saveDashboardSnapshot",
);
dashboardSandbox.WG.saveDashboardSnapshot = readDashboardMethod(
  "saveDashboardSnapshot",
  "loadDashboardSnapshot",
);
dashboardSandbox.WG.loadDashboardSnapshot = readDashboardMethod(
  "loadDashboardSnapshot",
  "applyDashboardLevel",
);
const potentialWorkSandbox = { WG: {} };
potentialWorkSandbox.WG.parsePotentialWorkBonuses = readDashboardMethod(
  "parsePotentialWorkBonuses",
  "rankPotentialWorks",
  potentialWorkSandbox,
);
potentialWorkSandbox.WG.rankPotentialWorks = readDashboardMethod(
  "rankPotentialWorks",
  "requestBestPotentialWork",
  potentialWorkSandbox,
);
const potentialWorkRanking = potentialWorkSandbox.WG.rankPotentialWorks([
  ["battle", "门派战争", "所有弟子练习效率+20%。"],
  ["herb", "药王新篇", "采药获得的经验+40。"],
  ["mine", "挖矿指南", "所有人的挖矿效率提高，获得经验+20。"],
]);
assert(
  potentialWorkRanking[0].id === "herbalism" &&
    potentialWorkRanking[0].bonus === 40 &&
    potentialWorkRanking[1].id === "mining" &&
    potentialWorkRanking[1].bonus === 20 &&
    potentialWorkRanking[2].bonus === 0,
  "智能挂机没有按当前活动的潜能收益正确排序",
);

const smartEquipmentSandbox = { WG: {} };
smartEquipmentSandbox.WG.parseSmartPercentTotal = readDashboardMethod(
  "parseSmartPercentTotal",
  "requestSmartEquipmentSnapshot",
  smartEquipmentSandbox,
);
smartEquipmentSandbox.WG.chooseSmartEquipment = readDashboardMethod(
  "chooseSmartEquipment",
  "applySmartEquipment",
  smartEquipmentSandbox,
);
const smartStudySelection = smartEquipmentSandbox.WG.chooseSmartEquipment(
  "study",
  {
    score: { int: 100, int_add: 0 },
    score2: { study_per: "100%" },
  },
  [
    { id: "int-item", slot: 0, intelligence: 100, study: 0 },
    { id: "study-item", slot: 0, intelligence: 0, study: 150 },
  ],
);
assert(
  smartStudySelection.picks[0].id === "study-item",
  "智能学习换装把 score2 已包含的先天悟性重复计入学习效率",
);

let nativeYamenRuns = 0;
const yamenTeleportWG = {
  go_yamen_task: async () => {
    nativeYamenRuns += 1;
  },
};
const yamenTeleportSandbox = {
  window: {},
  Promise,
  setTimeout,
  clearTimeout,
  structuredClone,
  console,
};
yamenTeleportSandbox.window.WSMudPlugin = {
  registerFeature(_name, installer) {
    installer({
      WG: yamenTeleportWG,
      G: {},
      UI: {},
      legacy: {},
      messageAppend: () => {},
    });
  },
};
runInNewContext(
  readFileSync(
    join(extensionRoot, "features/plugin/navigation-enhancements.js"),
    "utf8",
  ),
  yamenTeleportSandbox,
  { filename: "features/plugin/navigation-enhancements.js" },
);
await yamenTeleportWG.go_yamen_teleport_task();
assert(
  nativeYamenRuns === 1,
  "衙门快捷入口未委托原仓库的完整追捕流程",
);

const potentialWorkTimers = [];
const potentialWorkRequests = [];
const potentialWorkAutoSandbox = {
  G: {
    connected: true,
    potentialWorkSelectionPending: false,
  },
  Setting: { auto_work: true },
  WG: {
    online: true,
    requestBestPotentialWork(currentWorkId, quietWhenUnchanged) {
      potentialWorkRequests.push({ currentWorkId, quietWhenUnchanged });
    },
  },
  setTimeout(callback, delay) {
    const timer = { callback, delay, cleared: false };
    potentialWorkTimers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    if (timer) timer.cleared = true;
  },
};
potentialWorkAutoSandbox.WG.stopPotentialWorkAutoCheck = readDashboardMethod(
  "stopPotentialWorkAutoCheck",
  "schedulePotentialWorkAutoCheck",
  potentialWorkAutoSandbox,
);
potentialWorkAutoSandbox.WG.schedulePotentialWorkAutoCheck =
  readDashboardMethod(
    "schedulePotentialWorkAutoCheck",
    "handlePotentialWorkState",
    potentialWorkAutoSandbox,
  );
potentialWorkAutoSandbox.WG.handlePotentialWorkState = readDashboardMethod(
  "handlePotentialWorkState",
  "zdwk",
  potentialWorkAutoSandbox,
);
potentialWorkAutoSandbox.WG.handlePotentialWorkState({
  state: "<hig>正在挖矿中</hig>",
});
assert(
  potentialWorkRequests.length === 1 &&
    potentialWorkRequests[0].currentWorkId === "mining" &&
    potentialWorkTimers.length === 1 &&
    potentialWorkTimers[0].delay === 5000,
  "进入潜能挂机状态后没有立即检查并启动 5 秒周期复查",
);
potentialWorkAutoSandbox.WG.handlePotentialWorkState({ state: "正在挖矿中" });
assert(
  potentialWorkRequests.length === 1 && potentialWorkTimers.length === 1,
  "重复挂机状态消息启动了重复请求或定时器",
);
potentialWorkTimers[0].callback();
assert(
  potentialWorkRequests.length === 2 &&
    potentialWorkRequests[1].currentWorkId === "mining" &&
    potentialWorkRequests[1].quietWhenUnchanged === true &&
    potentialWorkTimers.length === 2,
  "潜能挂机周期复查没有静默查询当前最高收益项",
);
potentialWorkAutoSandbox.G.connected = false;
potentialWorkTimers[1].callback();
assert(
  potentialWorkRequests.length === 2 &&
    potentialWorkAutoSandbox.G.potentialWorkCurrentId === undefined &&
    potentialWorkAutoSandbox.G.potentialWorkAutoCheckTimer === undefined,
  "断线后潜能挂机周期复查没有停止",
);

let skillProgressSyncCount = 0;
const skillProgressSandbox = {
  WG: {
    requestDashboardSnapshot() {
      skillProgressSyncCount += 1;
    },
  },
};
skillProgressSandbox.WG.syncDashboardAfterSkillProgress = readDashboardMethod(
  "syncDashboardAfterSkillProgress",
  "parseDashboardEnergy",
  skillProgressSandbox,
);
skillProgressSandbox.WG.syncDashboardAfterSkillProgress({
  type: "dialog",
  dialog: "skills",
  id: "force",
  exp: 36,
});
skillProgressSandbox.WG.syncDashboardAfterSkillProgress({
  type: "dialog",
  dialog: "skills",
  items: [],
});
skillProgressSandbox.WG.syncDashboardAfterSkillProgress({
  type: "dialog",
  dialog: "pack",
  id: "force",
  exp: 36,
});
assert(
  skillProgressSyncCount === 1,
  "技能学习/练习进度没有触发潜能属性的静默校准",
);
const dashboardRefreshTimers = [];
const dashboardRefreshCommands = [];
let dashboardRefreshRequests = 0;
const dashboardRefreshSandbox = {
  WG: {
    equipmentPickerPackRequest: false,
    Send(command) {
      dashboardRefreshCommands.push(command);
    },
    requestDashboardSnapshot() {
      dashboardRefreshRequests += 1;
    },
    requestSilentPackSnapshot() {
      this.equipmentPickerPackRequest = true;
      this.Send("pack");
    },
  },
  setTimeout(callback, delay) {
    const timer = { callback, delay, cleared: false };
    dashboardRefreshTimers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    if (timer) timer.cleared = true;
  },
};
dashboardRefreshSandbox.WG.scheduleDashboardStateRefresh = readDashboardMethod(
  "scheduleDashboardStateRefresh",
  "observeDashboardCommand",
  dashboardRefreshSandbox,
);
dashboardRefreshSandbox.WG.observeDashboardCommand = readDashboardMethod(
  "observeDashboardCommand",
  "applyDashboardScoreSnapshot",
  dashboardRefreshSandbox,
);
dashboardRefreshSandbox.WG.observeDashboardCommand("eq sword-a");
dashboardRefreshSandbox.WG.observeDashboardCommand(
  "stopstate;cr yz/lw/shangu",
);
assert(
  dashboardRefreshTimers.length === 2 &&
    dashboardRefreshTimers[0].cleared === true &&
    dashboardRefreshTimers[1].delay === 700,
  "连续换装与耗精命令未合并为一次延迟快照刷新",
);
dashboardRefreshTimers[1].callback();
assert(
  dashboardRefreshCommands.join("|") === "pack" &&
    dashboardRefreshSandbox.WG.equipmentPickerPackRequest === true &&
    dashboardRefreshRequests === 1 &&
    dashboardRefreshTimers[2].delay === 900,
  "换装后的权威背包与属性快照未同时静默刷新",
);
dashboardRefreshTimers[2].callback();
assert(
  dashboardRefreshCommands.join("|") === "pack|pack" &&
    dashboardRefreshRequests === 2,
  "换装后的装备与属性延迟复核未执行",
);
dashboardRefreshSandbox.WG.observeDashboardCommand("cr over");
assert(
  dashboardRefreshTimers.length === 3,
  "副本结束标记被错误识别为新的精力消耗",
);
assert(
  gameClientSource.includes(
    "window.WG.observeDashboardCommand(_0x557412)",
  ),
  "游戏原生命令未接入左栏属性与精力快照刷新",
);
const scorePlayer = { hp: 10, max_hp: 20, mp: 30, max_mp: 40 };
const dashboardScoreSandbox = {
  G: {
    id: "player-test",
    hp: 10,
    maxHp: 20,
    mp: 30,
    maxMp: 40,
    score: {},
    items: new Map([["player-test", scorePlayer]]),
  },
  WG: {},
};
dashboardScoreSandbox.WG.applyDashboardScoreSnapshot = readDashboardMethod(
  "applyDashboardScoreSnapshot",
  "syncDashboardAfterSkillProgress",
  dashboardScoreSandbox,
);
assert(
  dashboardScoreSandbox.WG.applyDashboardScoreSnapshot({
    type: "dialog",
    dialog: "score",
    hp: 90,
    max_hp: 120,
    mp: 70,
    max_mp: 150,
    jingli: "80/1000<hig>(+160)</hig>",
  }) === true &&
    dashboardScoreSandbox.G.hp === 90 &&
    dashboardScoreSandbox.G.maxHp === 120 &&
    dashboardScoreSandbox.G.mp === 70 &&
    dashboardScoreSandbox.G.maxMp === 150 &&
    scorePlayer.hp === 90 &&
    scorePlayer.max_hp === 120 &&
    dashboardScoreSandbox.G.dashboardJingli ===
      "80/1000<hig>(+160)</hig>",
  "属性快照未回写人物缓存、气血内力上限或精力",
);
assert(
  dashboardSandbox.WG.formatDashboardLevel(5) === "<hio>武帝</hio>",
  "升级协议中的数字境界未正确转换为显示文本",
);
assert(
  dashboardSandbox.WG.formatDashboardLevel(6, "<ord>剑神</ord>") ===
    "<ord>剑神</ord>",
  "六境专属称号未被本地快照保留",
);
dashboardSandbox.GM_getValue = () => ({
  version: 1,
  level: "<hiz>武圣</hiz>",
  limit_mp: 1615,
});
dashboardSandbox.WG.loadDashboardSnapshot();
assert(
  dashboardSandbox.WG.getDashboardSnapshotKey() ===
    "role-test_WG_dashboard_snapshot_v1" &&
    dashboardSandbox.G.level === "<hiz>武圣</hiz>" &&
    dashboardSandbox.G.score.limit_mp === 1615,
  "侧栏角色快照未正确隔离或恢复",
);
dashboardSandbox.WG.parseDashboardEnergy = readDashboardMethod(
  "parseDashboardEnergy",
  "mergeDashboardEnergyTotal",
);
dashboardSandbox.WG.mergeDashboardEnergyTotal = readDashboardMethod(
  "mergeDashboardEnergyTotal",
  "mergeDashboardEnergyDelta",
);
dashboardSandbox.WG.mergeDashboardEnergyDelta = readDashboardMethod(
  "mergeDashboardEnergyDelta",
  "equipmentGradeNames",
);
const parsedEnergy = dashboardSandbox.WG.parseDashboardEnergy(
  "150/1000<hig>(+180)</hig>",
);
assert(parsedEnergy.permanent === 150, "未正确解析常驻精力");
assert(parsedEnergy.maximum === 1000, "未正确解析常驻精力上限");
assert(parsedEnergy.timed === 180, "未正确解析限时精力");
assert(parsedEnergy.permanentText === "150 / 1,000", "常驻精力格式异常");
assert(
  dashboardSandbox.WG.mergeDashboardEnergyTotal(
    "150/1000<hig>(+180)</hig>",
    300,
  ) === "150/1000(+150)",
  "消耗精力时未优先扣减限时部分",
);
assert(
  dashboardSandbox.WG.mergeDashboardEnergyTotal("150/1000(+180)", 120) ===
    "120/1000(+0)",
  "限时精力耗尽后未正确扣减常驻部分",
);
assert(
  dashboardSandbox.WG.mergeDashboardEnergyTotal("150/1000(+180)", 430) ===
    "250/1000(+180)",
  "新增常驻精力后未保留限时部分",
);
assert(
  dashboardSandbox.WG.mergeDashboardEnergyDelta("150/1000(+180)", -200) ===
    "130/1000(+0)",
  "精力增量消耗时未优先扣减每日精力",
);
assert(
  dashboardSandbox.WG.mergeDashboardEnergyDelta("150/1000(+180)", 30) ===
    "180/1000(+180)",
  "新增精力未即时合并到常驻精力",
);
assert(
  dashboardSandbox.WG.mergeDashboardEnergyDelta("—", 30) === null,
  "缺少精力快照时不应猜测精力构成",
);
dashboardSandbox.WG.dashboardEquipmentSlots = [
  "武器",
  "衣服",
  "鞋",
  "头部",
  "披风",
  "戒指",
  "项链",
  "饰品",
  "护腕",
  "腰带",
  "暗器",
];
dashboardSandbox.G = { id: "player-test" };
dashboardSandbox.WG.equipmentSlotCacheVersion = 1;
dashboardSandbox.WG.equipmentSlotCacheLimit = 500;
dashboardSandbox.WG.equipmentSlotCacheLoadedKey = null;
dashboardSandbox.WG.equipmentPickerPending = { stale_request: true };
dashboardSandbox.WG.getEquipmentSlotCacheKey = readDashboardMethod(
  "getEquipmentSlotCacheKey",
  "loadEquipmentSlotCache",
);
dashboardSandbox.WG.loadEquipmentSlotCache = readDashboardMethod(
  "loadEquipmentSlotCache",
  "saveEquipmentSlotCache",
);
dashboardSandbox.WG.saveEquipmentSlotCache = readDashboardMethod(
  "saveEquipmentSlotCache",
  "rememberEquipmentSlot",
);
dashboardSandbox.WG.rememberEquipmentSlot = readDashboardMethod(
  "rememberEquipmentSlot",
  "parseEquipmentSlot",
);
dashboardSandbox.GM_getValue = () => ({
  version: 1,
  entries: [
    ["cached_sword", 0],
    ["unknown_item", -1],
    ["invalid_item", 99],
  ],
});
dashboardSandbox.WG.loadEquipmentSlotCache();
assert(
  dashboardSandbox.WG.getEquipmentSlotCacheKey() ===
    "role-test_WG_equipment_slot_cache_v1",
  "装备栏位本地缓存未按角色隔离",
);
assert(
  dashboardSandbox.WG.equipmentSlotCache.cached_sword === 0 &&
    dashboardSandbox.WG.equipmentSlotCache.unknown_item === -1 &&
    !("invalid_item" in dashboardSandbox.WG.equipmentSlotCache),
  "装备栏位本地缓存未正确读取或校验",
);
assert(
  Object.keys(dashboardSandbox.WG.equipmentPickerPending).length === 0,
  "切换角色缓存时未清理旧的待查询状态",
);
const equipmentCacheTimers = [];
let persistedEquipmentCache = null;
dashboardSandbox.WG.equipmentSlotCacheSaveTimers = {};
dashboardSandbox.setTimeout = (callback) => {
  equipmentCacheTimers.push(callback);
  return equipmentCacheTimers.length;
};
dashboardSandbox.clearTimeout = () => {};
dashboardSandbox.GM_setValue = (key, value) => {
  persistedEquipmentCache = { key, value };
};
dashboardSandbox.WG.saveEquipmentSlotCache();
equipmentCacheTimers.shift()();
assert(
  persistedEquipmentCache?.key ===
    "role-test_WG_equipment_slot_cache_v1" &&
    persistedEquipmentCache.value.version === 1 &&
    persistedEquipmentCache.value.entries.length === 2,
  "装备栏位缓存未正确持久化到角色本地存储",
);
let equipmentCacheSaveCount = 0;
dashboardSandbox.WG.saveEquipmentSlotCache = () => {
  equipmentCacheSaveCount += 1;
};
dashboardSandbox.WG.parseEquipmentSlot = readDashboardMethod(
  "parseEquipmentSlot",
  "captureEquipmentPickerResponse",
);
dashboardSandbox.WG.captureSmartEquipmentDetailResponse = () => false;
dashboardSandbox.WG.captureEquipmentPickerResponse = readDashboardMethod(
  "captureEquipmentPickerResponse",
  "updateEquipmentQuickIds",
);
dashboardSandbox.WG.sortEquipmentPickerItems = readDashboardMethod(
  "sortEquipmentPickerItems",
  "appendEquipmentPickerItem",
);
assert(
  dashboardSandbox.WG.parseEquipmentSlot(
    "<hiy>倚天剑</hiy>\n武器\n攻击增加",
  ) === 0,
  "未从装备描述中识别武器栏位",
);
assert(
  dashboardSandbox.WG.parseEquipmentSlot("<hic>玉带</hic>\n腰带\n气血增加") ===
    9,
  "未从装备描述中识别腰带栏位",
);
dashboardSandbox.WG.equipmentPickerPending = { sword_1: true };
dashboardSandbox.WG.equipmentSlotCache = {};
dashboardSandbox.WG.renderEquipmentPicker = () => {};
assert(
  dashboardSandbox.WG.captureEquipmentPickerResponse({
    type: "dialog",
    dialog: "pack",
    id: "sword_1",
    desc: "<hiy>倚天剑</hiy>\n武器\n攻击增加",
  }) === true,
  "装备栏位内部查询结果未被截获",
);
assert(
  dashboardSandbox.WG.equipmentSlotCache.sword_1 === 0 &&
    !dashboardSandbox.WG.equipmentPickerPending.sword_1 &&
    equipmentCacheSaveCount === 1,
  "装备栏位查询结果未写入缓存",
);
let silentPackHookEvent = null;
dashboardSandbox.WG.equipmentPickerPackRequest = true;
dashboardSandbox.WG.run_hook = (_type, event) => {
  silentPackHookEvent = event;
};
const silentPackEvent = {
  type: "dialog",
  dialog: "pack",
  items: [["<hig>备用剑</hig>", "sword-b", 1, 1]],
  eqs: [["<hiy>当前剑</hiy>", "sword-a", 3]],
};
assert(
  dashboardSandbox.WG.captureEquipmentPickerResponse(silentPackEvent) === true &&
    silentPackHookEvent === silentPackEvent &&
    silentPackEvent.WG_dashboard_silent_pack === true,
  "左栏静默背包响应未标记或未转发给状态 Hook",
);
const equipmentSyncSandbox = {
  structuredClone,
  Dialog: {
    isShow: false,
    curItem: null,
    pack: { items: [{ id: "stale-item" }], eqs: [{ id: "stale-eq" }] },
  },
  legacy: { getPackData: () => [] },
  G: { eqs: [] },
  WG: {
    equipmentPickerItems: [],
    equipmentPickerEquipment: [],
    equipmentPickerSlot: null,
    deserializePackData(event) {
      event.items = (event.items || []).map((item) => ({
        name: item[0],
        id: item[1],
        count: item[2],
        grade: item[3],
      }));
      event.eqs = (event.eqs || []).map((item) =>
        item ? { name: item[0], id: item[1], grade: item[2] } : null,
      );
      return event;
    },
    rememberEquipmentSlot() {},
    scanEquipmentPickerItems() {},
    updateDashboardEquipment() {},
    scheduleDashboardStateRefresh() {},
  },
};
equipmentSyncSandbox.WG.handleEquipmentPickerEvent = readDashboardMethod(
  "handleEquipmentPickerEvent",
  "sortEquipmentPickerItems",
  equipmentSyncSandbox,
);
equipmentSyncSandbox.WG.handleEquipmentPickerEvent(silentPackEvent);
assert(
  equipmentSyncSandbox.WG.equipmentPickerItems[0].id === "sword-b" &&
    equipmentSyncSandbox.G.eqs[0].id === "sword-a" &&
    equipmentSyncSandbox.Dialog.pack.items === null &&
    equipmentSyncSandbox.Dialog.pack.eqs === null,
  "静默背包快照未同步左栏物品和装备缓存",
);
assert(
  !automationSource.includes("Dialog.pack.onData(structuredClone(event))"),
  "静默背包把解码后的插件对象写入原生紧凑数组缓存",
);
const sortedEquipment = dashboardSandbox.WG.sortEquipmentPickerItems(
  [
    { id: "legendary", name: "传说剑", grade: 6 },
    { id: "quick", name: "快捷剑", grade: 1 },
    { id: "rare", name: "稀有剑", grade: 5 },
  ],
  { quick: true },
);
assert(sortedEquipment[0].id === "quick", "快速装备未排在普通装备之前");
assert(
  sortedEquipment[1].id === "legendary" &&
    sortedEquipment[2].id === "rare",
  "同类装备未按稀有度从高到低排序",
);
assert(
  !automationSource.includes("快速装备优先，其次按稀有度从高到低") &&
    !automationSource.includes("WG_equipment_picker_status"),
  "装备弹窗仍显示排序规则说明",
);
const firstRoundSandbox = {
  roleid: "role-test",
  role: "测试角色",
  G: {
    id: "player-test",
    in_fight: true,
    gcd: false,
    cds: new Map(),
  },
  WG: {
    autoFirstRoundVersion: 1,
    is_free: () => true,
  },
};
firstRoundSandbox.legacy = {
  getRoleId: () => firstRoundSandbox.roleid,
  getRoleName: () => firstRoundSandbox.role,
};
firstRoundSandbox.WG.getAutoFirstRoundStorageKey = readDashboardMethod(
  "getAutoFirstRoundStorageKey",
  "normalizeAutoFirstRoundOrder",
  firstRoundSandbox,
);
firstRoundSandbox.WG.normalizeAutoFirstRoundOrder = readDashboardMethod(
  "normalizeAutoFirstRoundOrder",
  "loadAutoFirstRoundConfig",
  firstRoundSandbox,
);
firstRoundSandbox.WG.loadAutoFirstRoundConfig = readDashboardMethod(
  "loadAutoFirstRoundConfig",
  "saveAutoFirstRoundConfig",
  firstRoundSandbox,
);
firstRoundSandbox.WG.saveAutoFirstRoundConfig = readDashboardMethod(
  "saveAutoFirstRoundConfig",
  "getAutoFirstRoundSkills",
  firstRoundSandbox,
);
firstRoundSandbox.WG.processAutoFirstRound = readDashboardMethod(
  "processAutoFirstRound",
  null,
  firstRoundSandbox,
);
assert(
  firstRoundSandbox.WG.getAutoFirstRoundStorageKey() ===
    "role-test_WG_auto_first_round_v1",
  "首轮出招配置未按角色隔离",
);
assert(
  JSON.stringify(
    firstRoundSandbox.WG.normalizeAutoFirstRoundOrder([
      "force.power",
      "sword.wu",
      "force.power",
      "",
    ]),
  ) === JSON.stringify(["force.power", "sword.wu"]),
  "首轮出招顺序未正确去空或去重",
);
let persistedFirstRound = null;
firstRoundSandbox.GM_getValue = () => ({
  version: 1,
  order: ["force.power", "sword.wu"],
});
firstRoundSandbox.GM_setValue = (key, value) => {
  persistedFirstRound = { key, value };
};
assert(
  JSON.stringify(firstRoundSandbox.WG.loadAutoFirstRoundConfig()) ===
    JSON.stringify(["force.power", "sword.wu"]),
  "首轮出招配置未正确读取",
);
firstRoundSandbox.WG.saveAutoFirstRoundConfig(["sword.wu", "sword.wu"]);
assert(
  persistedFirstRound?.key === "role-test_WG_auto_first_round_v1" &&
    JSON.stringify(persistedFirstRound.value.order) ===
      JSON.stringify(["sword.wu"]),
  "首轮出招配置未正确持久化",
);
const firstRoundCommands = [];
firstRoundSandbox.WG.autoFirstRoundActive = true;
firstRoundSandbox.WG.autoFirstRoundQueue = ["force.power", "sword.wu"];
firstRoundSandbox.WG.autoFirstRoundIndex = 0;
firstRoundSandbox.WG.getAutoFirstRoundSkills = () => [
  { id: "sword.wu" },
  { id: "force.power" },
];
firstRoundSandbox.WG.Send = (command) => firstRoundCommands.push(command);
assert(firstRoundSandbox.WG.processAutoFirstRound(), "首轮第一招未被消费");
assert(firstRoundSandbox.WG.processAutoFirstRound(), "首轮第二招未被消费");
assert(
  !firstRoundSandbox.WG.processAutoFirstRound() &&
    JSON.stringify(firstRoundCommands) ===
      JSON.stringify(["perform force.power", "perform sword.wu"]),
  "首轮未按配置顺序出招或结束后未让回普通调度",
);
for (const firstRoundDragStyleContract of [
  ".WG_auto_first_round_drag_handle",
  ".WG_auto_first_round_row.is-dragging",
  ".WG_auto_first_round_selected.is-sorting",
  "cursor: grab",
  "cursor: grabbing",
  "touch-action: none",
]) {
  assert(
    automationSource.includes(firstRoundDragStyleContract),
    `首轮拖动排序缺少交互样式: ${firstRoundDragStyleContract}`,
  );
}
for (const itemPopupStyleContract of [
  ".WG_item_popup_dialog",
  ".WG_item_popup_child .WG_item_popup_dialog",
  ".WG_item_popup_parent_dimmed",
  ".WG_item_popup_close",
  ".WG_item_popup_actions",
  "pointer-events: none",
  "pointer-events: auto",
  ".item-vital-values",
  ".WG_item_popup_score .dialog-score",
  "touch-action: none",
  ".dialog.WG_item_popup_secondary > .dialog-content",
  "background: #080808 !important",
  "background: #111 !important",
]) {
  assert(
    automationSource.includes(itemPopupStyleContract),
    `点击对象弹窗缺少样式: ${itemPopupStyleContract}`,
  );
}
assert(
  !automationSource.includes(
    '.WG_item_popup[data-popup-kind="character"] .WG_item_popup_dialog',
  ),
  "点击人物的主操作窗仍被错误扩展为主区宽度",
);
for (const mapModalStyleContract of [
  ".WG_map_modal[hidden]",
  ".WG_map_modal_dialog",
  ".WG_map_modal_header",
  ".WG_map_modal_close",
  ".WG_map_modal_viewport",
  ".WG_map_modal .map-panel",
  ".WG_map_route_status",
  ".WG_map_modal .map-room.WG_map_route_step",
  ".WG_map_modal .map-room.WG_map_route_target",
  "place-items: center",
  "backdrop-filter: blur(2px)",
  "height: min(48rem, calc(100vh - 3rem))",
  "max-height: none",
]) {
  assert(
    automationSource.includes(mapModalStyleContract),
    `地图遮罩弹窗缺少大尺寸布局或样式: ${mapModalStyleContract}`,
  );
}
for (const floatingWindowStyleContract of [
  ".dialog.WG_floating_dialog",
  ".dialog.WG_floating_dialog.WG_item_popup_secondary",
  ".dialog.WG_floating_dialog > .dialog-content",
  ".dialog.WG_floating_dialog > .dialog-footer",
  ".dialog.WG_floating_dialog .dialog-skills",
  ".WG_dialog_snapshot",
  "var(--WG-dialog-z, 2147483601)",
  ".dialog-confirm.WG_skills_confirm",
  "resize: both",
  "scrollbar-gutter: stable",
  "z-index: 2147483640 !important",
  "flex: 0 0 6rem",
]) {
  assert(
    automationSource.includes(floatingWindowStyleContract),
    `通用悬浮窗口缺少浮动、层级或等级输入样式: ${floatingWindowStyleContract}`,
  );
}
for (const silentStartupContract of [
  "silentResponseMatchers",
  "suppressNextResponse",
  "consumeSilentResponse",
  "WG.run_hook(s.type, s)",
]) {
  assert(
    automationSource.includes(silentStartupContract),
    `开局静默数据请求缺少契约: ${silentStartupContract}`,
  );
}
assert(
  !automationSource.includes("L.msg(`欢迎使用 ${welcome} 版本号"),
  "登录时仍会自动弹出插件版本欢迎提示",
);
const suppressNextResponseMatch = automationSource.match(
  /suppressNextResponse: (function[\s\S]*?\n      \}),\n      consumeSilentResponse:/,
);
const consumeSilentResponseMatch = automationSource.match(
  /consumeSilentResponse: (function[\s\S]*?\n      \}),\n      hooks:/,
);
assert(
  suppressNextResponseMatch && consumeSilentResponseMatch,
  "无法读取开局静默响应逻辑",
);
const silentResponseSandbox = {
  WG: { silentResponseMatchers: [] },
  console: { error() {} },
};
silentResponseSandbox.WG.suppressNextResponse = runInNewContext(
  `(${suppressNextResponseMatch[1]})`,
  silentResponseSandbox,
);
silentResponseSandbox.WG.consumeSilentResponse = runInNewContext(
  `(${consumeSilentResponseMatch[1]})`,
  silentResponseSandbox,
);
silentResponseSandbox.WG.suppressNextResponse(
  (event) => event?.dialog === "skills" && Array.isArray(event.items),
  5000,
);
assert(
  !silentResponseSandbox.WG.consumeSilentResponse({ dialog: "pack" }),
  "静默技能请求错误吞掉了其他对话响应",
);
assert(
  silentResponseSandbox.WG.consumeSilentResponse({
    dialog: "skills",
    items: [],
  }),
  "静默技能请求未消费目标响应",
);
assert(
  !silentResponseSandbox.WG.consumeSilentResponse({
    dialog: "skills",
    items: [],
  }),
  "静默技能请求未保持一次性语义",
);
for (const horizontalToolMenuContract of [
  ".container > .bottom-bar > .right-bar",
  ".right-bar.WG_horizontal_menu_open",
  "flex-direction: row-reverse",
  "flex-wrap: wrap-reverse",
  "bottom: calc(100% + 0.4em)",
  "WG_horizontal_tool_menu",
  "HasUserToggled",
  "SetToolsOpen",
  "WG_plugin_tool_icon",
  '"aria-expanded": String(isOpen)',
]) {
  assert(
    automationSource.includes(horizontalToolMenuContract) ||
      gameClientSource.includes(horizontalToolMenuContract) ||
      toolActionModuleSource.includes(horizontalToolMenuContract),
    `三点菜单缺少横向展开行为: ${horizontalToolMenuContract}`,
  );
}
assert(
  !gameClientSource.includes("ShowToolsAnimate") &&
    automationSource.includes("if (!ToolAction.HasUserToggled)") &&
    toolActionModuleSource.includes("ShowToolsNative") &&
    toolActionModuleSource.includes("ShowToolsNativeAnimate"),
  "三点菜单仍存在首次点击状态竞争",
);
const horizontalToolMenuStyle = automationSource.match(
  /html:not\(\.WG_feature_horizontalMenu_off\) \.container > \.bottom-bar > \.right-bar \{[\s\S]*?\n\}/,
)?.[0];
assert(
  horizontalToolMenuStyle?.includes("background: transparent") &&
    horizontalToolMenuStyle.includes("box-shadow: none") &&
    horizontalToolMenuStyle.includes("border: 0") &&
    horizontalToolMenuStyle.includes("padding: 0"),
  "横向三点菜单仍带有悬浮面板式外框",
);
assert(
  automationSource.includes(
    "html:not(.WG_feature_horizontalMenu_off) .bottom-bar > .right-bar > .tool-item",
  ) &&
    !automationSource.includes(
      "html.WG_feature_horizontalMenu_off .bottom-bar > .right-bar > .tool-item",
    ),
  "关闭横向三点菜单后仍覆盖游戏原生竖排间距",
);
assert(
  automationSource.includes(
    ".bottom-bar > .right-bar > .WG_plugin_tool > .WG_plugin_tool_icon",
  ) &&
    automationSource.includes("width: 1.25em") &&
    automationSource.includes("height: 1.25em") &&
    automationSource.includes(
      ".bottom-bar > .right-bar > .WG_plugin_tool > .tool-text",
    ) &&
    automationSource.includes("line-height: 1.5em") &&
    !automationSource.includes(
      "html:not(.WG_feature_horizontalMenu_off) .bottom-bar > .right-bar .WG_plugin_tool_icon",
    ),
  "插件工具按钮未在横排与竖排模式共用原生尺寸和文字行高",
);
assert(
  !automationSource.includes(">挖矿/修炼</button>"),
  "传送动作仍使用含混的挖矿/修炼标签",
);
assert(
  !automationSource.includes(">整理修炼</div>"),
  "整理分组仍混入修炼语义",
);
for (const removedSideTitle of ["角色状态", "当前装备", "常用动作"]) {
  assert(
    !automationSource.includes(`>${removedSideTitle}<`),
    `侧栏仍保留大标题: ${removedSideTitle}`,
  );
}
for (const floatingPanelContract of [
  "WG_floating_toggle",
  "WG_floating_panel",
  "WG_floating_close",
  "setFloatingPanelOpen",
  "initFloatingToggleDrag",
  "applyFloatingTogglePosition",
  "WG_floating_toggle_position",
  "pointerdown.WG_floating_drag",
  "suppressFloatingToggleClick",
]) {
  assert(
    automationSource.includes(floatingPanelContract),
    `悬浮面板缺少结构或控制逻辑: ${floatingPanelContract}`,
  );
}
assert(
  !automationSource.includes("wsmud.ii74.com/hello/"),
  "登录流程仍会请求远程祝福/公告",
);

const raidFlowSource = readFileSync(
  join(extensionRoot, "features/raid-flow-engine.js"),
  "utf8",
);
assert(
  raidFlowSource.includes(
    'unsafeWindow.WSMudPlugin.createService(\n    "raid-flow-compiler"',
  ) &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n    "raid-flow-storage"',
    ) &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n      "raid-flow-dungeons"',
    ) &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n      "raid-flow-shortcuts"',
    ) &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n      "raid-flow-server"',
    ) &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n    "raid-flow-assert"',
    ) &&
    raidFlowSource.indexOf('"raid-flow-storage"') <
      raidFlowSource.indexOf('"raid-flow-compiler"') &&
    raidFlowSource.includes("Dungeons = DungeonCatalog.getAll()") &&
    raidFlowSource.includes(
      "DungeonsShortcuts = raidFlowShortcuts.DungeonsShortcuts",
    ) &&
    raidFlowSource.includes("Server = RaidFlowServer.Server") &&
    !raidFlowSource.includes("Server = {\n      uploadConfig") &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n    "raid-flow-observers"',
    ) &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n    "raid-flow-room"',
    ) &&
    raidFlowSource.includes("Room = raidFlowRoom.Room") &&
    raidFlowSource.includes("return FilterCenter.filter.apply") &&
    raidFlowSource.includes("return Room;") &&
    !raidFlowSource.includes("var Room = {") &&
    raidFlowSource.includes(
      'unsafeWindow.WSMudPlugin.createService(\n    "raid-flow-th-island"',
    ) &&
    raidFlowSource.includes("THIsland = raidFlowTHIsland.THIsland") &&
    !raidFlowSource.includes("let THIsland = {") &&
    raidFlowSource.includes("SystemTips = raidFlowObservers.SystemTips") &&
    raidFlowSource.includes("DialogList = raidFlowObservers.DialogList") &&
    !raidFlowSource.includes("class SystemTip {") &&
    !raidFlowSource.includes("var SystemTips = {") &&
    raidFlowSource.includes(
      "registerAtCommand: registerRaidShortcutAtCommand",
    ) &&
    raidFlowSource.includes('"raid-flow-execution-runtime"') &&
    raidFlowSource.includes(
      "raidFlowExecutionRuntime.registerSystemCommandExecutors()",
    ) &&
    !raidFlowSource.includes("class CmdPrehandler") &&
    !raidFlowSource.includes("class Performer") &&
    !raidFlowSource.includes("var SkillStateMachine = {") &&
    !raidFlowSource.includes("class AncientCmdExecuter") &&
    raidExecutionRuntimeSource.includes("class CmdPrehandler") &&
    raidExecutionRuntimeSource.includes("class Performer") &&
    raidExecutionRuntimeSource.includes("const ManagedPerformerCenter") &&
    raidFlowSource.includes(
      "raidFlowExecutionRuntime.ManagedPerformerCenter",
    ) &&
    raidExecutionRuntimeSource.includes("var SkillStateMachine = {") &&
    raidExecutionRuntimeSource.includes("class AncientCmdExecuter") &&
    !raidFlowSource.includes("xianyu_xyjq: function") &&
    !raidFlowSource.includes('new AtCmdExecutor("taohualin"') &&
    raidExecutionRuntimeSource.includes(
      "return getDungeonCatalog().getSource(e)",
    ) &&
    !raidFlowSource.includes("let Dungeons = [") &&
    raidExecutionRuntimeSource.includes(
      "getCompiler().compile(this._source)",
    ) &&
    raidFlowSource.includes(
      "VariableStore.register((e) => PersistentVariables.getAll())",
    ) &&
    !raidFlowSource.includes("class PersistentCache") &&
    !raidFlowSource.includes("var WorkflowConfig = {") &&
    !raidFlowSource.includes("class Compiler") &&
    !raidFlowSource.includes("function CompatibleOperator") &&
    !raidFlowSource.includes("class AssertWrapper") &&
    !raidFlowSource.includes("var AssertHolderCenter = {") &&
    raidFlowSource.includes(
      "AssertLeftMarkHandlerCenter =\n      raidFlowAssert.AssertLeftMarkHandlerCenter",
    ) &&
    raidFlowSource.includes("AssertHolderCenter = raidFlowAssert.AssertHolderCenter") &&
    raidFlowSource.includes("AssertWrapper = raidFlowAssert.AssertWrapper") &&
    raidFlowSource.includes("AssertHolder = raidFlowAssert.AssertHolder") &&
    raidFlowSource.includes("WG.suppressNextResponse(") &&
    raidFlowSource.includes('WG.Send("cha")'),
  "Raid 编译桥或开局技能静默请求异常",
);
assert(
  (raidFlowSource.match(/Server\.getNotice\(\)/g) || []).length === 1,
  "Raid 远程公告仍在登录时自动弹出",
);
for (const groveDungeonContract of [
  '"小树林" == t && (t = "树林")',
  "_DungeonMpThreshold",
  "InjectRoomTransitionRecovery",
]) {
  assert(
    raidFlowSource.includes(groveDungeonContract),
    `小树林自动副本缺少运行时节点: ${groveDungeonContract}`,
  );
}
for (const groveDungeonSourceContract of [
  'name: "树林"',
  "jh fb 0 start1;cr yz/lw/shangu",
  "@kill 毒蛇,毒蛇",
  "@kill 狼,狼",
  "@kill 狼王",
  "search`",
]) {
  assert(
    raidDungeonsSource.includes(groveDungeonSourceContract),
    `小树林自动副本缺少流程节点: ${groveDungeonSourceContract}`,
  );
}

const injectedUrls = [];
const messageListeners = [];
const localEntries = new Map([
  ["jsonValue", '{"enabled":true}'],
  ["plainValue", "plain text"],
]);
const localStorageMock = {
  get length() {
    return localEntries.size;
  },
  key(index) {
    return [...localEntries.keys()][index] ?? null;
  },
  getItem(key) {
    return localEntries.has(key) ? localEntries.get(key) : null;
  },
  setItem(key, value) {
    localEntries.set(String(key), String(value));
  },
  removeItem(key) {
    localEntries.delete(String(key));
  },
};
const loaderSandbox = {
  URL,
  Node: { ELEMENT_NODE: 1 },
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  window: { addEventListener() {} },
  document: {
    baseURI: "https://game.wsmud2.com/",
    readyState: "complete",
    documentElement: {},
    head: {
      appendChild(scriptElement) {
        injectedUrls.push(scriptElement.src);
        queueMicrotask(() => scriptElement.onload());
      },
    },
    createElement() {
      return { src: "", onload: null, onerror: null };
    },
    addEventListener() {},
  },
  location: { hostname: "game.wsmud2.com", protocol: "https:" },
  chrome: {
    runtime: {
      getURL: (scriptPath) => `chrome-extension://test/${scriptPath}`,
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        },
      },
    },
    storage: {
      local: {
        get(_keys, callback) {
          callback({
            extensionEnabled: true,
            wsmudSyncedPageSettings: {
              version: 1,
              values: {
                WG_plugin_feature_flags_v1: '{"chatDrawer":false}',
              },
            },
          });
        },
        set() {},
      },
    },
  },
  localStorage: localStorageMock,
  console: { log() {}, error() {} },
};
runInNewContext(
  readFileSync(join(extensionRoot, "runtime/page-settings-sync.js"), "utf8"),
  loaderSandbox,
  { filename: "runtime/page-settings-sync.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "extension/page-load-plan.js"), "utf8"),
  loaderSandbox,
  { filename: "extension/page-load-plan.js" },
);
runInNewContext(loaderSource, loaderSandbox, {
  filename: "extension/content-loader.js",
});
assert(
  localEntries.get("WG_plugin_feature_flags_v1") === '{"chatDrawer":false}',
  "新页面未从扩展存储回填缺失的插件设置",
);
for (let turn = 0; turn < expectedScriptOrder.length + 2; turn += 1) {
  await new Promise((resolve) => setImmediate(resolve));
}
assert(
  JSON.stringify(injectedUrls) ===
    JSON.stringify(
      expectedScriptOrder.map(
        (scriptPath) => `chrome-extension://test/${scriptPath}`,
      ),
    ),
  "内容脚本的实际异步注入顺序不正确",
);

const overlayInjectedUrls = [];
let overlayObserverStarted = false;
const overlaySandbox = {
  URL,
  Node: { ELEMENT_NODE: 1 },
  MutationObserver: class {
    observe() {
      overlayObserverStarted = true;
    }
    disconnect() {}
  },
  window: { addEventListener() {} },
  document: {
    baseURI: "https://www.wxmud1.com/",
    readyState: "complete",
    documentElement: {},
    head: {
      appendChild(scriptElement) {
        overlayInjectedUrls.push(scriptElement.src);
        queueMicrotask(() => scriptElement.onload());
      },
    },
    createElement() {
      return { src: "", onload: null, onerror: null };
    },
    addEventListener() {},
  },
  location: { hostname: "www.wxmud1.com", protocol: "https:" },
  chrome: {
    runtime: {
      getURL: (scriptPath) => `chrome-extension://test/${scriptPath}`,
      onMessage: { addListener() {} },
    },
    storage: {
      local: {
        get(_keys, callback) {
          callback({ extensionEnabled: true });
        },
        set() {},
      },
    },
  },
  localStorage: localStorageMock,
  console: { log() {}, error() {} },
};
runInNewContext(
  readFileSync(join(extensionRoot, "runtime/page-settings-sync.js"), "utf8"),
  overlaySandbox,
  { filename: "runtime/page-settings-sync.js" },
);
runInNewContext(
  readFileSync(join(extensionRoot, "extension/page-load-plan.js"), "utf8"),
  overlaySandbox,
  { filename: "extension/page-load-plan.js" },
);
runInNewContext(loaderSource, overlaySandbox, {
  filename: "extension/content-loader.js",
});
for (let turn = 0; turn < expectedScriptOrder.length + 2; turn += 1) {
  await new Promise((resolve) => setImmediate(resolve));
}
assert(!overlayObserverStarted, "wxmud1.com 不应拦截原站游戏脚本");
assert(
  overlayInjectedUrls.every((url) => !url.includes("/client/")),
  "wxmud1.com 不应注入替换用游戏客户端",
);
assert(
  overlayInjectedUrls.includes(
    "chrome-extension://test/features/upstream-automation.js",
  ) &&
    overlayInjectedUrls.includes(
      "chrome-extension://test/features/plugin/native-client-compat.js",
    ),
  "wxmud1.com 未叠加插件脚本",
);

function dispatchMessage(message) {
  let response;
  for (const listener of messageListeners) {
    listener(message, {}, (payload) => {
      response = payload;
    });
  }
  return response;
}

const exportResponse = dispatchMessage({ action: "GM_export" });
assert(exportResponse?.success, "GM_export 消息执行失败");
const exportedValues = JSON.parse(exportResponse.data);
assert(exportedValues.jsonValue.enabled === true, "GM_export 未解析 JSON 值");
assert(exportedValues.plainValue === "plain text", "GM_export 未保留文本值");

const importResponse = dispatchMessage({
  action: "GM_import",
  data: JSON.stringify({ importedNumber: 7 }),
});
assert(importResponse?.success, "GM_import 消息执行失败");
assert(
  localEntries.get("importedNumber") === "7",
  "GM_import 存储行为发生变化",
);
assert(
  dispatchMessage({ action: "GM_listKeys" })?.data.includes("importedNumber"),
  "GM_listKeys 未返回导入的键",
);
assert(
  dispatchMessage({ action: "GM_deleteKey", key: "importedNumber" })?.success,
  "GM_deleteKey 消息执行失败",
);
assert(!localEntries.has("importedNumber"), "GM_deleteKey 未删除目标键");

console.log(`验证通过：${javascriptFiles.length} 个 JavaScript 文件语法有效。`);
console.log(
  `验证通过：${actualScriptOrder.length} 个页面脚本的路径和顺序正确。`,
);
console.log("验证通过：Manifest、消息协议、存储键和资源引用完整。");
console.log("验证通过：内容脚本注入和配置数据消息桥动态冒烟测试。");
console.log(`验证通过：${semanticFragmentCount} 个语义源码片段与运行文件逐字一致。`);
console.log(`扩展目录：${relative(process.cwd(), extensionRoot) || "."}`);
