# WSMudEX 代码索引

> 这是后续修改功能时的第一读取入口。插件模块优先定位到 `features/plugin/`；尚未迁移的兼容代码和游戏客户端再按本文件定位到 `sources/`。

## 1. 代码真源与使用原则

| 路径 | 定位 | 修改原则 |
|---|---|---|
| `WSMudEX/` | 当前实际加载、验证和部署的浏览器扩展 | 功能修改以这里为准 |
| `WSMudEX/sources/game-client/` | 尚未迁移客户端兼容代码的语义真源；已迁移职责进入 `client/modules/` | 迁移前只维护对应片段；迁移后修改普通模块并同步聚合入口 |
| `WSMudEX/features/upstream-automation.js` | 当前实际加载的主自动化核心 | 固化自 `knva/wsmud_plugins@c1112c0f`；上游业务逻辑保持原样，仅保留 MV3 增量安装桥和日志面板未挂载时的提示回退 |
| `WSMudEX/features/plugin/` | 插件模块内核、项目新增 UI/动作功能，以及已停用的旧重构源码 | 实际加载清单以 `tools/plugin-module-layout.mjs` 的 `activePluginModuleSources` 为准；未列入者只作可恢复源码，不得覆盖上游核心 |
| `WSMudEX/sources/automation-suite/` | 已停用的自动化模块化重构语义真源 | 不再由页面加载；保留用于回滚和差异审计，生成文件仍由同步工具校验 |
| `WSMudEX/client/game-client.js` | 由客户端兼容片段和模块桥接生成的交付入口 | 不直接维护；功能逐批迁入 `client/modules/` |
| `WSMudEX/client/modules/` | 已迁移的游戏前端功能模块 | 通过 `client/core.js` 注册，用显式上下文创建 |
| `WSMudEX/features/automation-suite.js` | 由语义片段逐字拼接的自动化套件运行文件 | 不直接维护，由同步工具生成 |
| `WSMudEX/features/*.js` | 角色切换、副本和触发器等独立扩展功能 | 各文件可直接修改 |
| `wsmud2/src/` | 模块化游戏源码参考，适合理解原始职责和 DOM | 不会自动同步到扩展，不可只改这里 |
| `wsmud2/world/cmd/` | 服务端命令实现参考 | 用来核对命令名称、参数和返回数据 |
| `WSMudEX/docs/original-file-map.md` | CRX 原文件与可读文件的映射 | 追溯原文件时使用 |

行号会随修改漂移，本索引以对象名、函数名、选择器和 `rg` 搜索词作为稳定锚点。文中行号只表示当前的大致位置。

后续 Codex/开发者应遵循：

1. 先读本索引。
2. 用“功能索引”中的锚点执行 `rg -n`。
3. 只读取命中点前后所需的代码片段。
4. 架构、协议、状态所有权或关键交互约束变化时，同步更新本索引。
5. 修改后运行最小语法检查和完整扩展验证。
6. 修改大型脚本片段后先运行 `node tools/sync-semantic-sources.mjs build`。

## 2. 页面脚本加载顺序

固定顺序定义在 `extension/content-loader.js` 的 `PAGE_SCRIPT_PATHS`：

1. `runtime/userscript-compat.js`：GM/Tampermonkey API 兼容和存储桥。
2. `runtime/page-settings-sync.js`：跨站点页面配置快照；不自动创建或补回用户删除的动作按钮。
3. `vendor/jquery-3.7.1.js`
4. `vendor/vue-2.6.11.js`
5. `vendor/layer-2.3.js`
6. `vendor/context-menu.js`
7. `vendor/store-2.0.12.js`
8. `features/plugin/core.js`，随后只加载角色切换、项目新增侧栏/设置/动作功能，以及 Raid/Trigger 所需服务模块。
9. `features/upstream-automation.js`：固化的上游主自动化核心；安装第 8 项中的六个项目增量后再执行上游 `KEY/WG/GI` 初始化。
10. `features/plugin/native-client-compat.js`：叠加站点把二进制协议帧转成 JSON，并忽略 `#binary v1` 握手 cookie。
11. `features/raid-flow-engine.js`
12. `features/trigger-system.js`
13. `client/core.js` 和 `client/modules/*.js`。
14. `client/game-client.js`：正在缩减的游戏前端遗留主体。`wxmud1.com` 不加载第 13–14 项。

`content-loader.js` 会拦截 `wsmud2.com` / `wsmud2.cn` 及其子域名的原始页面脚本，再逐个注入上述文件。已模块化源码直接作为页面脚本加载，不再生成 `plugin-modules.js`。`wxmud1.com` 是魔改客户端，不拦截、不替换原站脚本，只叠加插件；连接使用 `wss` 和 `#binary v1` 二进制协议。

旧 `features/automation-suite.js` 及其大量拆分模块不再进入页面，避免再次覆盖上游的自动施法、清包、导航、自动交易和衙门逻辑。它们仍留在源码树和独立备份中。第 13 项游戏客户端聚合文件继续由同步工具生成并校验。

## 3. 运行时数据流

```text
服务器 WebSocket
    ↓
WG.receive_message(event)                 automation-suite.js
    ├─ 解析/过滤/改写消息
    ├─ WG.captureEquipmentPickerResponse
    ├─ WG.run_hook(type, data)            自动化、触发器、仪表盘状态
    └─ ws_on_message(event)
            ↓
WSClient.OnReceived                       game-client.js
    ├─ 文本 → ReceiveMessage → MessageQueue（不作为详情弹窗响应源）
    └─ 对象 → ReceiveData → Process[data.type]
                              ├─ 场景/状态/战斗渲染
                              └─ type=dialog → Process.dialog
                                                ├─ 按命令、类型和 ID 关联结构化详情响应
                                                └─ Dialog.show(dialog, data)

用户点击 [cmd]
    ↓
ContainerCommand → SendCommand → GameClient.Send → WebSocket
```

定位这条链路：

```bash
rg -n "receive_message:|run_hook:|function ReceiveMessage|function ReceiveData|function WSClient|function ContainerCommand|function SendCommand" \
  WSMudEX/sources/automation-suite WSMudEX/sources/game-client
```

## 4. 文件速查

| 文件 | 主要职责 | 常用锚点 |
|---|---|---|
| `extension/content-loader.js` | 原脚本拦截、顺序注入、GM 导入导出桥；`wxmud1.com` 走叠加模式 | `PAGE_SCRIPT_PATHS`、`loadPageScriptsInOrder`、`shouldReplaceGameClient` |
| `extension/page-load-plan.js` | 按主机名决定替换客户端还是只叠加插件 | `shouldReplaceGameClient`、`selectPageScripts` |
| `features/plugin/binary-protocol.js` | 解码 `wxmud1.com` 的 `#binary v1` WebSocket 帧 | `decodeBinaryMessage` |
| `features/plugin/native-client-compat.js` | 叠加模式下把二进制帧转成 JSON，并避免把握手当成登录 cookie | `materializeSocketMessage`、`recoverCookieAfterHandshake` |
| `extension/service-worker.js` | Manifest V3 后台安装事件 | `chrome.runtime.onInstalled` |
| `popup/controller.js` | 扩展启停、配置导入导出 | DOM 事件和 `chrome.storage` |
| `runtime/userscript-compat.js` | `GM_getValue`、`GM_setValue`、`GM_addStyle` 等兼容 | 直接搜索 GM API 名称 |
| `runtime/page-settings-sync.js` | 跨 `wsmud2.com` / `wsmud2.cn` / `wxmud1.com` 按原值还原页面 `localStorage`，不生成或补齐动作栏按钮 | `hydrateMissingKeys`、`readPageStorage`、`wsmudSyncedPageSettings` |
| `features/plugin/core.js` | 插件功能注册、安装、销毁和重复安装保护 | `registerFeature`、`installFeatures` |
| `features/plugin/automation-static-data.js` | 自动化路线、门派路径和师门表 canonical state；配合词法快照兼容历史 direct eval 及延迟闭包重绑定 | `automation-static-data`、`getNeedFindRoutes`、`getPlaceRoutes`、`getMpzPath`、`getMasterTasks` |
| `features/plugin/custom-workflows.js` | 自定义流程执行、角色代际隔离、Vue 编辑/分享和快捷按钮 | `custom-workflows`、`workflowsRoleId`、`displaySettingRoleId`、`zmlfire`、`zml_showp` |
| `features/plugin/dashboard-equipment.js` | 左侧资源栏、装备/背包权威快照同步、装备选择、智能换装和原生动作桥 | `updateSideDashboard`、`scheduleDashboardStateRefresh`、`observeDashboardCommand`、`applyDashboardScoreSnapshot`、`prepareSmartEquipment` |
| `features/plugin/navigation-core.js` | 通用房间到达判断、路线发送和当前房间 ID 查询 | `go`、`at`、`roomMatchesTarget`、`getIdByName`、`G.ingo` |
| `features/plugin/wait-until-at.js` | `$to`/清包在发出后续命令前等待当前房间匹配 | `waitUntilAt`、`WG.waitUntilAt` |
| `features/plugin/master-task-automation.js` | 师门状态 0–5、取仓回调和跨会话生命周期 | `doSmTask`、`smTask`、`sm_button`、`qu`、`resetMasterTaskAutomation` |
| `features/plugin/activity-automation.js` | 武道塔、学习状态、小树林循环及共享工作 timer 生命周期 | `wudao_auto`、`wudao_autopfm`、`xue_auto`、`grove_auto`、`timer_close`、`resetActivityAutomation` |
| `features/plugin/yaota-automation.js` | 妖塔进出、妖元进度报告及可取消忙碌等待 | `ytjk_func`、`resetYaotaAutomation`、`G.yaotaFlag/yaotaCount/yaoyuan` |
| `features/plugin/legacy-status-monitors.js` | 旧 `ztjk` 配置的协议匹配与命令执行兼容层 | `ztjk_func`、`ztjk_hook`、`resetLegacyStatusMonitors` |
| `features/plugin/daily-workflows.js` | 一键日常、门派请安、追捕扫荡及可取消等待生命周期 | `oneKeyDaily`、`oneKeyQA`、`oneKeySD`、`waitDailyWorkflow`、`finishDailyWorkflow`、`resetDailyWorkflows` |
| `features/plugin/navigation-enhancements.js` | 智能回家/师父、组队共鸣、衙门确认后传送和潜能挂机 | `go_home`、`waitForYamenTaskResponse`、`requestBestPotentialWork` |
| `features/plugin/travel-equipment-option.js` | 回家/师父/挂机前智能换装开关 | `shouldPrepareTravelEquipment`、`runAfterOptionalTravelEquipment`、`smartEquipmentOnTravel` |
| `features/plugin/auto-first-round.js` | 首轮出招配置、拖动排序和每场战斗调度 | `openAutoFirstRoundDialog`、`processAutoFirstRound` |
| `features/plugin/auto-perform-filter.js` | 自动出招可用绝招开关、黑名单持久化与运行时屏蔽同步 | `listAutoPerformSkills`、`setAutoPerformSkillEnabled`、`unauto_pfm` |
| `features/plugin/layout-controls.js` | 右栏聊天、侧栏尺寸、横向菜单和悬浮面板 | `initSideDashboard`、`initChatDrawer`、`initSideRailResizers` |
| `features/plugin/ui-shell.js` | 侧栏、装备弹窗、首轮弹窗和悬浮面板 HTML | `wgui` |
| `features/plugin/plugin-settings.js` | 插件设置入口、功能开关、设置 UI 行为 | `registerPluginSettings`、`initPluginSettings` |
| `features/plugin/trigger-core.js` | 触发器领域模型、模板、持久化和 TriggerCenter 服务 | `trigger-core`、`TriggerCenter`、`TriggerTemplate` |
| `features/plugin/trigger-monitors.js` | 触发器历史模板、协议监控 Hook 和监控计时器生命周期 | `trigger-monitors`、`start`、`stop`、`resetForRole` |
| `features/plugin/trigger-ui.js` | 触发器 Vue 管理界面、分享和 GM 配置导入导出 | `trigger-ui`、`TriggerUI`、`TriggerConfig`、`destroy` |
| `features/plugin/raid-flow-storage.js` | Raid 角色流程、持久变量、旧命令组和工作流树存储服务 | `raid-flow-storage`、`FlowStore`、`PersistentVariables`、`WorkflowConfig`、`CodeTranslator` |
| `features/plugin/raid-flow-assert.js` | Raid 真值、比较、组合表达式及可扩展左值/断言 holder 服务 | `raid-flow-assert`、`AssertLeftMarkHandlerCenter`、`AssertWrapper`、`AssertHolderCenter` |
| `features/plugin/raid-flow-dungeons.js` | 38 个内置 Raid 副本流程及保持原数组身份的名称查询服务 | `raid-flow-dungeons`、`dungeons`、`getAll`、`findByName`、`getSource` |
| `features/plugin/raid-flow-shortcuts.js` | 11 个固定 Raid 快捷流程及桃花林/周伯通命令注册服务 | `raid-flow-shortcuts`、`DungeonsShortcuts`、`taohualin`、`zhoubotong` |
| `features/plugin/raid-flow-server.js` | Raid 配置、流程、触发器、公告与单项分享的云端同步服务 | `raid-flow-server`、`Server`、`_sync`、`_async`、`uploadSingle` |
| `features/plugin/raid-flow-observers.js` | Raid 系统/频道提示及对话、任务、襄阳协议的有界搜索缓存 | `raid-flow-observers`、`SystemTips`、`MsgTips`、`DialogList`、`TaskList`、`Xiangyang` |
| `features/plugin/raid-flow-room.js` | Raid 房间位置、场景对象、状态、死亡记录及动态词法 Room 桥 | `raid-flow-room`、`Room`、`getItemId`、`didKillItemsInRoom` |
| `features/plugin/raid-flow-th-island.js` | 桃花岛迷宫坐标解码、出阵和周伯通洞穴路径 | `raid-flow-th-island`、`THIsland`、`outMaze`、`zhoubotong` |
| `features/plugin/raid-flow-execution-runtime.js` | Raid 命令中心、Performer、托管流程中心、等待/系统执行器、技能状态机和 Ancient 执行生命周期 | `raid-flow-execution-runtime`、`CmdExecuteCenter`、`Performer`、`ManagedPerformerCenter`、`SkillStateMachine`、`AncientCmdExecuter` |
| `features/plugin/plugin-enhancements.css` | 已迁移插件增强模块的全部视觉样式 | `.WG_side_rail`、`.WG_equipment_picker`、`.WG_plugin_settings` |
| `sources/automation-suite/` | 主自动化的语义源码；保留静态数据词法别名、身份快照及三处 direct eval 双向同步桥 | `automationStaticDataSnapshot`、`reconcileAutomationStaticData`、`WG =`、`G =`、`GI =` |
| `features/upstream-automation.js` | 当前自动化运行入口、上游来源标记、项目增量安装桥 | `WSMudAutomationSource`、`sell_all`、`auto_preform`、`WGRunNativeExtensionAction` |
| `features/automation-suite.js` | 已停用的自动化重构聚合产物 | 不再加载；由 `sync-semantic-sources.mjs build` 保持与回滚片段一致 |
| `features/plugin/role-switcher.js` | 已保存角色、服务器和一键登录 | `class Myapi`、`auto-login-id`、`wsmud-login` |
| `features/plugin/notification-services.js` | 配置分享、推送、语音、提示音和乐谱 | `remoteConfig`、`speech`、`push`、`MusicBox` |
| `features/plugin/automation-state.js` | 自动化共享状态模型 | `automation-state`、`isGod`、`enable_skills` |
| `features/plugin/automation-protocol-state.js` | GI 主协议 Hook 的角色、房间、人物、技能、战斗和冷却状态镜像 | `automation-protocol-state`、`init`、`clearDistime`、`dispfm` |
| `features/plugin/automation-message-menu.js` | 外部窗口消息命令、传送菜单和房间名右键菜单运行时 | `automation-message-menu`、`receiveMessage`、`makeTp`、`createSomeMenu` |
| `features/plugin/automation-keyboard.js` | 自动化 61 键映射、对话/聊天按键分层、移动与场景动作 | `automation-keyboard`、`KEY.init`、`dialog_confirm`、`onRoomItemSelect` |
| `features/plugin/pack-data-codec.js` | 背包、装备、商店和仓库协议行的兼容解码服务；接受压缩数组和已解码对象 | `pack-data-codec`、`deserializePackData`、`decodeRows`、`itemKeys`、`storeKeys` |
| `features/plugin/protocol-compatibility.js` | 上游核心与现网压缩背包协议的边界适配、左侧仪表盘实时桥，以及后台快照响应与手动工具窗口隔离；不改上游清包业务 | `deserializePackData`、`suppressNextResponse`、`requestSilentPackSnapshot`、`updateDashboardFromEvent`、`dashboardHook` |
| `features/plugin/ui-templates.js` | 自动化设置、工具和快捷按钮 HTML 模板服务 | `automation-ui-templates`、`zdybtnui`、`fbui`、`itemui` |
| `features/plugin/command-engine.js` | `$` 命令别名、续接执行与交互命令控制台 | `command-engine`、`T.recmd`、`T.to`、`ProConsole` |
| `features/plugin/command-transport.js` | 直连/原生回退发送、命令拆分、占位符替换、左栏命令观察和 `$` 分派桥 | `Send`、`SendCmd`、`observeDashboardCommand`、`SendStep`、`sleep` |
| `features/plugin/custom-command-buttons.js` | Q/W/E/R/T/Y 自定义快捷按钮、角色配置和原生按钮切换 | `zdybtnfunc`、`zdy_btnset`、`zdy_btnListInit`、`zdy_btnshow` |
| `features/plugin/equipment-loadouts.js` | 装备/技能套装、脱装、套装菜单和 Vue 管理页 | `haspack`、`eqhelper`、`uneqall`、`eqloader`、`eqhelperui` |
| `features/plugin/wedding-automation.js` | 婚宴寻路、贺礼、礼桌拾取与跨会话 Hook/计时器生命周期 | `xiyan`、`marryhy`、`cancelXiyan` |
| `features/plugin/yamen-automation.js` | 衙门追捕接取、告示解析、目标巡查与角色生命周期 | `go_yamen_task`、`check_yamen_task`、`check_zb_npc`、`yamen_lister` |
| `features/plugin/room-state-bridge.js` | `items` 协议场景快照和旧公开入口同步 | `saveRoomstate`、`setRoomData` |
| `features/plugin/item-command-helpers.js` | NPC/装备和当前场景物品的兼容命令辅助 | `buy`、`Give`、`eq`、`ask`、`kill_all`、`get_all`、`clean_all` |
| `features/plugin/inventory-cleanup.js` | 包裹存仓、分解、出售和丢弃流程及唯一 Hook 生命周期 | `sell_all`、`packup_listener`、`packup_ready`、`cancelInventoryCleanup` |
| `features/plugin/inventory-list-settings.js` | 角色物品清单 CSV、实时数组、GM 存储和设置输入框同步 | `getItemNameByid`、`addstore`、`addlock`、`dellock`、`addfenjieid`、`adddrop` |
| `features/plugin/auto-trading.js` | 当铺清单自动购买和书院秘籍自动售卖；到达后请求并按角色配置过滤 | `tnBuy`、`zxBuy`、`cancelAutoTrading` |
| `features/plugin/data-maintenance.js` | NPC、商店、仓库与战斗统计数据维护 | `clean_id_all`、`update_store`、`clean_dps` |
| `features/plugin/warehouse-sorting.js` | 仓库/背包按颜色分组整理、到达钱庄后请求数据及排序 Hook 生命周期 | `sort_all`、`sort_all_bag`、`sort_hook`、`cancelSorting` |
| `features/plugin/training-calculators.js` | 潜能、练习、开花和自创计算 | `formatCurrencyTenThou`、`lx`、`dian` |
| `features/plugin/combat-automation.js` | 自动施法调度、上游冷却优先选择和兼容小数/标签的零秒释放判断 | `auto_preform`、`auto_preform_switch`、`is_zero_releasetime`、`requestAutomationScore2` |
| `features/plugin/toolbox-scheduler.js` | 计算器工具箱和定时命令 | `calc`、`dsj`、`qnjs`、`zcjs` |
| `client/core.js` | 客户端模块注册和显式创建 | `registerModule`、`createModule` |
| `client/modules/map.js` | 小地图、大地图模态框、地图缓存和自动寻路生命周期 | `map`、`MAP`、`CreateHeadPanel`、`StartAutoRoute`、`destroy` |
| `client/modules/utilities.js` | 历史客户端工具、请求兼容层和 Array/Date 原型兼容扩展 | `utilities`、`Util`、`installLegacyExtensions` |
| `client/modules/combat.js` | 战斗面板、动作、绝招冷却、血蓝条和状态效果 | `combat`、`Combat`、`On_Perform`、`UpdaeBar`、`destroy` |
| `client/modules/room-renderer.js` | 房间、人物、血蓝、隐藏命令和出口渲染；会话房间状态重置 | `room-renderer`、`itemadd/items/itemremove`、`create_roomitem`、`room/exits`、`resetRoomRendererSession` |
| `client/modules/tool-action.js` | 横向工具栏显隐、关闭增强时的游戏原生竖排动画、无障碍状态和未读标记 | `tool-action`、`ToolAction`、`SetHorizontalEnabled`、`ShowToolsNative`、`showFlag` |
| `client/modules/warnings.js` | 底部警告栈 | `warnings`、`Warn.Elemes` |
| `client/modules/touch.js` | 滑动和双指缩放手势 | `touch`、`Slide`、`Zoom` |
| `client/modules/view-storage.js` | 登录视图切换、iOS 显示和本地存储 | `view-storage`、`storageUtil` |
| `client/modules/detail-popup-policy.js` | 详情弹窗命令分类、技能响应 ID 约束和江湖战利品/技能帮助文本过滤 | `detail-popup-policy`、`describePopupDetailCommand`、`matchesDetailPopupData`、`classifyDetailText` |
| `client/modules/message-queue.js` | 分页消息队列、文本/结构化消息分发和聊天输入 | `message-queue`、`ReceiveMessage`、`ReceiveData`、`consumeDetailPopupMessage` |
| `client/modules/skill-calculator.js` | 技能潜能/时间公式、角色速度推导与计算器浮动 Dialog | `skill-calculator`、`CalculateSkillTrainingCost`、`ParseSkillTrainingEfficiency`、`Dialog.skillcalc` |
| `client/modules/dialog-skills.js` | 自身/师父技能、书架、技能详情与学习/装备命令 | `dialog-skills`、`Dialog.skills`、`Dialog.master`、`showBooks`、`showdesc` |
| `client/modules/dialog-channel.js` | 频道历史、协议 HTML、过滤回放与右侧聊天面板兼容 | `dialog-channel`、`channel`、`footerChanged`、`createElement` |
| `client/modules/dialog-tasks.js` | 任务列表全量/增量协议、状态渲染与领取命令 | `dialog-tasks`、`tasks`、`update_item`、`create_items` |
| `client/modules/dialog-jianghu.js` | 门派、普通副本、禁地和江湖入口对话框模型 | `dialog-jianghu`、`jh_fam`、`jh_fb`、`jh_ar`、`jh` |
| `client/modules/dialog-stats.js` | 六类排行榜、门派/装备过滤、分钟缓存和排名交互 | `dialog-stats`、`stats`、`STATS_SILDER1`、`STATS_SILDER2` |
| `client/modules/dialog-keys.js` | 快捷键分组、设置页录入、持久化与全局按键执行 | `dialog-keys`、`keys`、`init_key`、`record_press`、`keypress` |
| `client/modules/dialog-shop.js` | 商城三类货币、商品协议、折扣/限购渲染和购买入口 | `dialog-shop`、`shop`、`format_items`、`create_items`、`get_item` |
| `client/modules/dialog-social.js` | 消息、关系、帮派和队伍对话框及相互切换 | `dialog-social`、`message`、`relation`、`party`、`team` |
| `client/modules/dialog-events.js` | 活动列表、未读标记、截止时间和活动命令 | `dialog-events`、`events`、`showUnread`、`format_time` |
| `client/modules/dialog-pm.js` | 拍卖列表、出价入口和绝对截止时间倒计时 | `dialog-pm`、`pm`、`countdownDeadlines`、`start_countdown` |
| `client/modules/dialog-extensions.js` | 自定义扩展按钮、触发器、过滤器、录制和按角色开关 | `dialog-extensions`、`extend`、`init_extend_group`、`trigger`、`process` |
| `client/modules/connection.js` | WebSocket 会话连接、重连状态和登录加载提示 | `connection`、`connectServer`、`isConnecting` |
| `client/modules/network-api.js` | WebSocket 原生封装和账户 API | `network-api`、`WSClient`、`API.UserAPI` |
| `client/modules/confirmation.js` | 确认输入、数量调节和二次操作命令 | `confirmation`、`Confirm`、`Show_*`、`get_countelement` |
| `client/modules/script-engine.js` | 页面脚本解析、动作、变量展开和兼容状态 | `script-engine`、`SCRIPT`、`run`、`actions`、`vars` |
| `features/plugin/raid-flow-compiler.js` | Raid 流程源码切分、预编译规则和控制流编译服务 | `raid-flow-compiler`、`PrecompileRuleCenter`、`compile`、`precompile` |
| `features/raid-flow-engine.js` | Raid UI、业务命令注册与模块兼容桥；执行运行时、断言、目录、快捷流程、云端同步、房间/桃花岛及协议观察由服务提供 | `raidFlowExecutionRuntime`、`GetDungeonFlow`、`raidFlowTHIsland`、`raidFlowRoom`、`raidFlowObservers` |
| `features/trigger-system.js` | 触发器服务创建、兼容全局发布、初始化重试和角色生命周期薄入口 | `TriggerUI`、`TriggerConfig`、`TriggerCenter`、`onLogin` |
| `sources/game-client/` | 尚未迁移游戏客户端的语义源码与已迁移模块兼容桥；目录 README 列出各片段职责 | `Process`、`Dialog`、`MAP` 兼容桥 |
| `client/game-client.js` | 游戏客户端运行时聚合产物 | 由 `sync-semantic-sources.mjs build` 生成 |
| `tools/verify-extension.mjs` | 加载顺序、语法、静态契约和动态烟测 | 修改核心 UI/协议后必须运行 |

## 5. `game-client.js` 主对象索引

| 锚点 | 约当前行 | 职责 |
|---|---:|---|
| `function ContainerCommand` | 650 | 委托处理页面内带 `[cmd]` 的点击 |
| `function SendCommand` | 801 | 统一发送游戏命令；详情命令识别发生在调用它之前的 `ContainerCommand` |
| `function HandlerMenuCommand` | 861 | 底栏/菜单动作分派 |
| `MessageQueue` | 由 `client/modules/message-queue.js` 创建 | 主消息区和频道消息队列 |
| `function ReceiveMessage` | 976 | 文本消息入口；公共文本始终进入原消息队列，不作为详情响应源 |
| `function ReceiveData` | 979 | 按 `data.type` 分派到 `Process` |
| `Process` | 991 | 游戏协议消息到 DOM 的主要适配层 |
| `Warn` | 由 `client/modules/warnings.js` 创建，桥约 2283 行 | 提示层 |
| `Combat` | 由 `client/modules/combat.js` 创建，兼容桥位于 `50-combat.jsfrag` | 战斗状态、动作、血条和状态效果 |
| `MAP` | 由 `client/modules/map.js` 创建，兼容桥位于 `55-map.jsfrag` | 地图、出口、模态框和自动寻路 |
| `ToolAction` | 由 `client/modules/tool-action.js` 创建，兼容桥位于 `20-command-dispatch.jsfrag` | 横向工具栏和未读标记 |
| `Touch` | 由 `client/modules/touch.js` 创建，桥约 2308 行 | 触摸交互 |
| `Dialog` | 2311 | 原生页面级对话区域控制器 |
| `SCRIPT` | 由 `client/modules/script-engine.js` 创建，兼容桥位于 `70-script-engine.jsfrag` | 页面脚本/命令脚本支持 |
| `Setting` | 由 `client/modules/settings.js` 创建，桥约 5700 行 | 原生客户端设置读取和应用 |
| `Confirm` | 由 `client/modules/confirmation.js` 创建，兼容桥位于 `80-confirmation.jsfrag` | 确认类遮罩交互 |
| `Util` | 由 `client/modules/utilities.js` 创建，兼容桥位于 `85-utilities.jsfrag` | 通用工具、请求兼容层和历史原型扩展 |
| `WSClient` | 由 `client/modules/network-api.js` 创建，桥约 5744 行 | WebSocket 封装及数据解析 |
| `API` | 由 `client/modules/network-api.js` 创建，桥约 5745 行 | 客户端 API 占位/导出 |
| `storageUtil` | 由 `client/modules/view-storage.js` 创建，桥约 22 行 | 客户端存储辅助 |

### `Process` 高频锚点

| 函数/字段 | 作用 |
|---|---|
| `Process.init` | 缓存 `.room_items`、`.content-message`、`.channel` |
| `Process.login` | 登录成功后的角色和界面初始化 |
| `Process.selectItem` | 点击场景人物/物品 |
| `Process.formatStatusNumber` | 血蓝数值的三位半角逗号格式化 |
| `Process.itemadd/items/itemremove` | 由 `client/modules/room-renderer.js` 挂回；当前场景人物列表增量/全量维护 |
| `Process.create_roomitem` | 由 `client/modules/room-renderer.js` 挂回；场景人物行、血蓝条和血蓝数值 HTML |
| `Process.room/exits` | 由 `client/modules/room-renderer.js` 挂回；房间信息和出口渲染 |
| `Process.resetRoomRendererSession` | 清理跨房间状态动画、详情弹窗和房间逻辑快照；断线、跨服和角色变化调用 |
| `Process.prepareDetailPopup/queueDetailPopupRequest` | 记录技能、背包物品、排行榜详情的命令、来源层与请求顺序；队列有界 |
| `Process.matchesDetailPopupData/takeDetailPopupRequest/consumeDetailPopupData` | 只按结构化协议类型、对象 ID 和请求顺序关联响应；同来源快速点击时旧请求降级 |
| `Process.ensureItemPopup/showItemPopup/closeItemPopup` | 自由详情窗生命周期 |
| `Process.applyItemPopupPosition/initItemPopupDrag` | 自由窗定位、拖动和位置持久化 |
| `Process.dialog` | 详情自由窗优先消费，否则交给 `Dialog.show` |
| `Process.sc` | 将状态变化交给 `Combat.StatusChanged` |

## 6. 原生对话框索引

`Dialog.show(name)` 打开对话区域；收到服务端数据时 `Dialog.show(name, data)` 会调用对应对象的 `onData(data)`。原生对话框共用 `.dialog > .dialog-header/.dialog-content/.dialog-footer`，打开时隐藏 `.content-room`。

| 对象 | 约当前行 | 内容/常见命令 |
|---|---:|---|
| `Dialog.skills/master` | 由 `client/modules/dialog-skills.js` 创建，兼容桥约第 2,958 行 | 当前/师父技能、书架、`cha`、`checkskill`、学习与装备 |
| `Dialog.skillcalc` | 由 `client/modules/skill-calculator.js` 创建，兼容桥位于 `61-dialog-skills.jsfrag` | 个人/师傅技能潜能、速度与时间计算；保留 `_skillcalc` 命令和浮动父层回退 |
| `Dialog.pack` | 2991 | 自己的背包和装备，`pack`、`checkobj` |
| `Dialog.pack2` | 3694 | 查看他人的装备/背包 |
| `Dialog.trade` | 3829 | 交易 |
| `Dialog.list` | 4026 | 通用列表 |
| `Dialog.channel` | 由 `client/modules/dialog-channel.js` 创建，兼容桥约第 4,419 行 | 聊天频道历史 |
| `Dialog.setting` | 4429 | 游戏客户端设置 |
| `Dialog.tasks/stats/jh_*` | 由对应 `client/modules/dialog-*.js` 创建，兼容桥约第 4,758–4,785 行 | 任务、排行榜、门派/副本/区域/江湖入口 |
| `Dialog.shop` | 由 `client/modules/dialog-shop.js` 创建，兼容桥位于 `65-dialog-commerce-and-social.jsfrag` | 商城 |
| `Dialog.message/relation/party/team/events/pm` | 由对应社交模块创建，兼容桥约第 4,794–4,833 行 | 消息、关系、帮派、队伍、活动和拍卖 |
| `Dialog.keys/extend` | 由对应模块创建，兼容桥约第 4,850–4,871 行 | 快捷键、扩展功能和记录 |
| `Dialog.friend/pay` | 4872/4880 | 好友和支付占位对象 |

模块化参考位于 `wsmud2/src/dialog/*.js`。理解单个对话框时可以先读对应参考文件；已迁移对象修改 `client/modules/dialog-*.js`，对应语义片段只维护原位创建桥，尚未迁移对象才继续修改片段并生成运行文件。

## 7. 主页面 DOM 地图

原始模板可读参考：`wsmud2/src/game/main.js`。运行时还会由自动化套件插入两侧栏、装备弹窗、详情自由窗和聊天右栏开关。

```text
.container
├─ .dialog                                  原生页面级对话区域
│  ├─ .dialog-header
│  ├─ .dialog-content
│  └─ .dialog-footer
├─ .content-room
│  ├─ .room-title > .room-name
│  ├─ .room_desc
│  ├─ .room_exits
│  └─ .room_items > .room-item
│     ├─ .item-status                      血条、蓝条纵向排列
│     ├─ .item-vital-values                血/蓝数值横向排列并贴条左侧
│     ├─ .item-status-bar                  buff/debuff
│     └─ .item-name
├─ .WG_side_rail_left                      角色资源和可点击装备栏
├─ .channel                                聊天流；关闭右栏聊天时存放于隐藏容器
├─ .content-message                        主游戏日志
├─ .bottom-bar/.right-bar                  原生工具栏
├─ .content-bottom
│  └─ .combat-panel
│     ├─ .room-commands
│     └─ .combat-commands
├─ .chat-panel                             原生聊天输入面板；由扩展隐藏并改用右栏输入组件
├─ .WG_side_rail_right                     常驻黑色信息栏；原生聊天入口可切换为聊天面板
├─ .WG_equipment_picker                    遮罩类装备选择弹窗
├─ .WG_auto_first_round                    自动攻击首轮顺序配置遮罩弹窗
├─ .WG_map_modal > .WG_map_modal_dialog    大尺寸地图遮罩弹窗
│  └─ .WG_map_modal_viewport > .map-panel  原地图 SVG 与滚动容器
└─ .WG_item_popup                          非模态、可拖动详情自由窗
```

原生样式参考在 `wsmud2/src/styles/{global,main,dialog}.css`；当前新增/覆盖样式主要集中在 `automation-suite.js` 的 `GM_addStyle(...)` 大块中。

## 8. 高频功能定位

| 要改的功能 | 首要文件和锚点 | 相关选择器/状态 | 注意事项 |
|---|---|---|---|
| 当前场景人物排序 | `client/modules/room-renderer.js`：`itemadd`、`items` | `Process.player`、`.room_items` | 玩家始终固定最上方；不再提供“自己优先”设置项 |
| 人物血蓝与玩家标记 | `client/modules/room-renderer.js`：`formatStatusNumber`、`formatRoomItemName`、`create_roomitem`；`automation-suite.js`：`.item-vital-values`、`.player-name-marker` 样式 | `.item-status`、`.progress.hp/.mp`、`.item-name` | 两个条仍纵排；两个数值横排、整体右对齐并贴在条左边；数字使用半角千分位逗号；当前玩家姓名后、`〈挖矿〉` 等状态前插入醒目黄色精炼星标 `★` |
| 点击场景人物或物品 | `game-client.js`：`selectItem`、`isCharacterItem`、`prepareCharacterTextView`、`item`、`cmds` | `type=item`、`popupKind=character/scene-item`、`look <id>` 纯文本 | 首次点击使用结构化 `select <id>` 打开人物或物品操作窗；人物窗内“查看”发送真正的 `look <id>`，完整结果仍由主信息栏显示，操作窗保持打开并提示结果位置。绝不截取公共文本流冒充弹窗响应；人物后续 `cmds` 追加到同一操作窗 |
| 技能详情自由窗 | `game-client.js`：`isPopupDetailCommand` 至 `consumeDetailPopupData`；`client/modules/detail-popup-policy.js` | `checkskill`、`dialog=skills/master` | 必须带技能 ID 和 `desc`；不使用原生 `.dialog` 覆盖场景；`checkskill ... help` 不按师父技能等待 |
| 江湖战利品/门派武功详情 | 同上；`consumeDetailPopupMessage` | `look3 <n> of fb_<id>`、`checkskill <id> help` | 只消费描述类文本；技能升级、练习/学习状态、心得和突破丹提示留在信息栏 |
| 背包/装备详情自由窗 | 同上；`Dialog.pack/pack2` | `checkobj ... from item/eq` | 保留可执行的装备、使用等命令 |
| 排行榜人物详情自由窗 | `queueDetailPopupRequest/consumeDetailPopupData`、`createRankingPopupContent`、`Dialog.stats` | `stats ...`、`type=item` 或 `dialog=score` | 只有可关联的结构化人物描述或属性数据进入自由详情窗；离线/错误等纯文本仍进入主消息区，兵器谱物品不按人物处理 |
| 自由详情窗行为 | `ensureItemPopup`、`initItemPopupDrag`、`closeItemPopup`；对应 CSS | `.WG_item_popup*`、`WG_item_popup_position` | 非模态；可拖动；点窗外不关闭且可继续操作页面；Esc 只关闭视觉上最顶层，随后逐层返回并恢复焦点 |
| 遮罩类弹窗行为 | `automation-suite.js`：装备选择器、其他明确 modal 的弹窗 | `.WG_equipment_picker` | 只有遮罩类弹窗允许点击遮罩关闭；不要把自由窗改成同样逻辑 |
| 左侧资源栏 | `features/plugin/dashboard-equipment.js`：`updateSideDashboard`、`scheduleDashboardStateRefresh`、`applyDashboardScoreSnapshot`、`handleEquipmentPickerEvent`、`updateQuickLoadoutState`、`getQuickLoadoutNames`、`applyQuickLoadoutNames`；`ui-shell.js`；`layout-controls.js`；`plugin-settings.js` | `.WG_resource_*`、`.WG_quick_loadouts`、`.WG_plugin_settings_loadouts`、`data-equipment-group`、`eq_group`、`<角色>_WG_quick_loadout_names_v1`、`G.score`、`G.items`、`G.eqs`、`Dialog.pack` | 登录、换装、原生配装组切换及副本耗精命令后合并发送静默 `pack`/`score`；同一权威响应同步左栏、人物缓存和原生背包缓存。资源区与装备列表之间固定提供配装 1/2/3 快捷键，分别发送原生 `eqgroup 0/1/2`，并按背包响应的 `eq_group` 标记当前组；插件设置可按角色自定义三个按钮名称，空名称回退为数字。精力条区分常驻与限时精力，技能进度仍会静默校准潜能 |
| 智能挂机 | `features/plugin/navigation-enhancements.js`：`requestBestPotentialWork`、`rankPotentialWorks`、`startPotentialWork`、`schedulePotentialWorkAutoCheck`；`dashboard-equipment.js`：`preparePotentialWorkEquipment` | `dialog=events`、`state`、`G.potentialWorkCurrentId`、挖矿/钓鱼/采药活动描述 | 通过原生扩展动作 `#wg work` 进入时先静默计算当前潜能收益最高活动，再为采药换上最高品级《药王神篇》/《神农百草经》，为挖矿换上最高品级铁镐/移山镐，为钓鱼保留或换上最高品级钓鱼竿，然后开始挂机。开启游戏内自动操作并处于这三类状态时，前台在线期间每 5 秒复核收益，只在出现严格更高的正收益项时切换；并列最高保持当前地点。断线、换角色、停挂机或进入其他状态会清理定时器和 Hook；活动请求超时时保留当前地点。钓鱼缺少鱼竿或鱼饵时降级到下一项，无加成时默认挖矿 |
| 左侧装备栏 | `automation-suite.js`：`dashboardEquipmentSlots`、`openEquipmentPicker`、`renderEquipmentPicker`；`ui-shell.js`、`layout-controls.js` | `.WG_quick_loadout`、`.WG_equipment_item` | 顶部三个按钮与原生背包配装 1/2/3 一一对应；点击装备栏位显示背包内对应位置物品，快速装备优先，再按稀有度排序 |
| 装备位置缓存 | `loadEquipmentSlotCache`、`saveEquipmentSlotCache`、`rememberEquipmentSlot` | `<角色>_WG_equipment_slot_cache_v1` | GM 本地持久化，最多 500 条；减少重复 `checkobj` 请求 |
| 动作前智能换装 | `prepareSmartEquipment`、`chooseSmartEquipment`、`parseSmartEquipmentDetail`、`requestSmartEquipmentDetails`、`runAfterOptionalTravelEquipment` | `<角色>_WG_smart_equipment_details_v1`、`checkobj`、`eq`、`smartEquipmentOnTravel` | 去师父前按“总悟性 ×（100 + 总学习效率）”搜索各栏位的最优组合；回住宅/客栈前按总悟性最高组合换装。插件设置可关闭该换装，关闭后回家、去师父和潜能挂机直接传送。同一角色下按物品 ID、原始名称和品阶缓存详情 10 分钟，装备未变时复用详情但仍重算组合；新增、改名、品阶变化或过期的装备才重新查询。正式套装的件数加成行暂不参与计算，以免无法可靠识别套装归属 |
| 装备选择弹窗排版 | `syncEquipmentPickerTypography`、`renderEquipmentPicker` | `.WG_equipment_picker_*` | 标题区直接显示当前装备；字号继承左侧栏；不显示排序规则说明 |
| 原生扩展动作桥接 | `game-client.js`： `SCRIPT.actions.wg`；`features/plugin/dashboard-equipment.js`：`runNativeExtensionAction`；`navigation-enhancements.js`：智能动作实现 | `#wg home`、`#wg master`、`#wg wumiao`、`#wg cleanup`、`#wg work`、`#wg yamen`、`#wg auto` | 桥接智能回家、智能师父换装、武庙、清包、智能挂机、衙门追捕传送和自动攻击切换；所有动作项都由用户在“设置 → 扩展”中手动添加、启用或删除，初始化不自动补齐 |
| 自动攻击状态、出招过滤与首轮顺序 | `updateNativeAutoAttackActionState`、`auto_preform_switch`、`setAutoPerformSkillEnabled`、`openAutoFirstRoundDialog`、`processAutoFirstRound`、`renderPluginSettings`；`Combat.create_actions` | `#wg auto`、`.WG_native_auto_active`、`.WG_plugin_auto_toggle`、`.WG_plugin_settings_auto_skills`、`.WG_plugin_settings_auto_first_round`、`G.auto_preform`、`roleid_unauto_pfm` | 原生扩展栏中命令严格等于 `#wg auto` 的按钮会随状态同步：开启时直接复用游戏原生按钮按下样式（`gray/#808080` 背景、黑色文字），并设置 `aria-pressed=true` 与“已开启”提示；关闭时恢复。插件设置里可为每门绝招单独开关，关闭项写入原有自动施法黑名单，自动出招只使用仍开启的招式。首轮顺序仍在插件总设置配置；每场战斗按配置各尝试一次，之后恢复冷却完成即出招 |
| 智能回家、师父传送与仓库 | `go_home`、`go_master`、`prepareSmartEquipment`、`cancelSmartHomeWatch`、`runAfterOptionalTravelEquipment`；游戏“设置 → 扩展”手动添加 | `#wg home`、`#wg master`、`store`、`smartEquipmentOnTravel` | 开启“传送前智能换装”时，智能回家先换最高悟性组合再执行原生 `goto home`；关闭则直接传送。进入 `home/...` 时保留住宅落点；确认落到 `yz/home` 住宅大门时再导航到“扬州城-有间客栈”。监听最长 10 秒，重复点击会先清理旧 Hook。师父处同样可按开关决定是否先换学习套装，再发送 `goto fam1`；仓库仍直接使用游戏原生命令 |
| 右栏聊天、记录与输入面板 | `initChatDrawer`、`toggleSideChatPanel`、`initSideChatPanel`、`setSideChatPanelOpen`；`game-client.js`：`Dialog.channel.show`、`ShowChat` | 原生 `[command='showchat']`、`.WG_side_chat_view`、`.WG_side_chat_history_host`、`.WG_side_chat_composer` | 聊天视图首次创建时默认开启；同一页面内用户手动关闭后，后续仪表盘重新初始化会保留关闭状态，不强行重开。中间自定义聊天按钮已移除，原生聊天按钮负责切换。关闭后右栏保持原宽度、黑色占位和宽度拖动能力，只隐藏聊天内容。右栏上方 7 个历史筛选和下方 6 个发送频道均固定单行紧凑显示 |
| 两侧栏尺寸 | `sideRailSizeKey` 和相邻 resize 逻辑 | `WG_side_rail_widths` | 宽度保存在 `localStorage` |
| 地图遮罩弹窗 | `game-client.js`：`MAP.EnsureModal/OpenModal/CloseModal/LoadMap/ShowMap`；`automation-suite.js`：`.WG_map_modal*` | `.map-panel`、`.map`、`MAP.Buffer` | 地图移出房间文档流，以大尺寸模态遮罩显示；点击遮罩、关闭按钮或 Esc 关闭 |
| 开局提示与静默取数 | `automation-suite.js`：`suppressNextResponse/consumeSilentResponse`；`raid-flow-engine.js`：`Role.init` | `cha`、`dialog=skills`、`Server.getNotice` | 登录不自动弹版本号或远程节日公告；技能数据静默获取；版本按钮仍可手动查看公告 |
| 上线自动门派请安 | `automation-suite.js`：`GI.init` 的 `login` hook、`shouldGreetChief` | 官方命令 `sx greet`、`G.connected`、`G.id` | 每次新登录会话或切换角色时请求一次；服务端判断当日是否已请安、门派/等级资格、本人是否首席及首席在线状态；重复登录消息不重复发送 |
| 战斗动作和状态 | `Combat`、`Process.sc/perform/disobj` | `.combat-panel`、`.combat-commands` | 协议状态更新先到 `Process` 再交给 `Combat` |
| 原生设置 | `Dialog.setting`、`Setting` | `.dialog-setting` 等 | 新功能若已固定，不要无必要地增加设置开关 |
| 拍卖行实时倒计时 | `game-client.js`：`Dialog.pm.get_countdown_deadline/start_countdown/update_countdowns/format_countdown` | `.pm-mem[data-end-time]`、`Dialog.pm.countdownDeadlines`、`dialog=pm` | 首次服务端剩余毫秒数转换为按拍品保存的本地截止时间；缓存完整列表重复渲染只复用已有截止时间，绝不重新起算，只有明确的拍品增量更新可强制校准（含竞价延时）；单一定时器按秒重算并随弹窗生命周期启停 |

快速定位示例：

```bash
rg -n "create_roomitem|item-vital-values|formatStatusNumber" \
  WSMudEX/client/modules/room-renderer.js WSMudEX/features/automation-suite.js

rg -n "openEquipmentPicker|renderEquipmentPicker|equipmentSlotCache" \
  WSMudEX/features/automation-suite.js

rg -n "prepareDetailPopup|consumeDetailPopupData|consumeDetailPopupMessage|WG_item_popup" \
  WSMudEX/client/game-client.js WSMudEX/client/modules/detail-popup-policy.js WSMudEX/client/modules/message-queue.js
```

## 9. 协议和命令速查

协议对象通常含 `type`；`ReceiveData` 会执行 `Process[data.type](data)`。`type: "dialog"` 再按 `data.dialog` 分发。

| 命令/消息 | 常见响应 | 客户端入口 | 用途 |
|---|---|---|---|
| `select <id>` | `type: item`，含 `id/desc/commands` | `Process.item` | 选中场景人物/物品并提供操作摘要；不等同于完整人物 `look` |
| `look <id>` | 无请求 ID 的纯文本 | `ReceiveMessage`；人物窗内由 `prepareCharacterTextView` 保持弹窗上下文 | 显示年龄、容貌、武学评价、伤势状态、装备等完整人物描述；不进入详情弹窗，避免与挖矿等并发文本误关联 |
| `actions` | `type: actions` | `Process.actions` | 当前可用动作 |
| `items` | `type: items` | `Process.items` | 全量场景人物 |
| — | `type: itemadd/itemremove` | 同名 `Process` 方法 | 场景人物增删 |
| — | `type: room/exits` | 同名 `Process` 方法 | 当前房间和出口 |
| — | `type: sc` | `Process.sc → Combat.StatusChanged` | 血蓝、状态等变化 |
| `cha` / `cha none` | `dialog: skills` | `Dialog.skills` | 自己的技能列表 |
| `checkskill <id> [来源]` | 通常为 `dialog: skills/master`，含 `id/desc`；`help` 在参考版本可能返回纯文本 | 详情自由窗或对应 Dialog | 仅带 ID 的结构化响应进入技能窗；`help` 走文本详情窗 |
| `look3 <n> of fb_<id>` | 参考版本为物品或可获得技能的纯文本 | 江湖战利品详情自由窗 | 不把挖矿/升级等公共文本当作战利品响应 |
| `pack` / `pack none` | `dialog: pack`，含 `items/eqs` | `Dialog.pack`、装备选择器 hook | 背包和当前装备 |
| `checkobj <id> from item` | `dialog: pack`，含 `desc` | 物品详情自由窗 | 背包物品详情 |
| `checkobj <id> from eq` | `dialog: pack`，含 `desc` | 装备详情自由窗 | 已装备物品详情 |
| `eq <id>` / `uneq <id>` | 背包/动作后续更新 | `Dialog.pack`、装备选择器 | 装备或卸下 |
| `stats <分类> ... <页>` | `dialog: stats` | `Dialog.stats` | 排行榜列表 |
| 排行榜条目里的 `stats ...` | 现网可能为 `type: item` 或 `dialog: score`；参考版本也可能返回人物描述/离线纯文本 | 结构化响应进入排行详情自由窗，纯文本进入主消息区 | 不通过公共文本流猜测响应归属 |
| `score` / `score2` | `dialog: score/score2` | `Dialog.score` 相关逻辑、自动化 hook | 自己的属性/详细属性 |
| — | `type: levelup` | `automation-suite.js` 的全局状态 hook | 立即更新左栏境界，并静默校准完整属性 |
| `jh` | `dialog: jh/jh_fam/jh_fb/jh_ar` | 对应 Dialog | 江湖、门派、区域、副本入口 |
| `go/goto/look/wakuang/wk/...` | 文本或状态消息 | `Process`/`ReceiveMessage`/WG hook | 行动命令 |

如果客户端里只看到命令字符串、不清楚服务端语义，先在 `wsmud2/world/cmd/` 搜索文件名或命令：

```bash
rg -n "命令或字段名" wsmud2/world/cmd WSMudEX/client/game-client.js
```

常用命令目录：

- `world/cmd/action/`：移动、查看、打坐、疗伤、挖矿等。
- `world/cmd/dialog/`：技能、属性、排行、江湖、任务、商店等面板数据。
- `world/cmd/obj/`：查看、装备、卸下、使用、丢弃、分解等物品动作。
- `world/cmd/skill/`：查看技能、启用、练习、修炼、学习等。
- `world/cmd/battle/`：战斗、技能释放、逃跑、复活。
- `world/cmd/channel/`：世界、队伍、门派、房间、私聊等频道。

## 10. 状态与缓存所有权

| 状态 | 所有者 | 说明 |
|---|---|---|
| `Process.player` | `game-client.js` | 当前登录角色 ID；角色变化时先触发房间渲染会话重置 |
| `Process.cur_room/room_path/room_exits/room_name` | `client/modules/room-renderer.js` | 当前房间协议对象与地图/出口快照；断线、跨服、切换角色或返回服务器页时清空逻辑引用 |
| `Process.detailPopupRequests` | `game-client.js` | 有界结构化详情请求队列；保存命令、对象 ID、来源层、顺序和过时标记 |
| `Dialog.pendingLayerRequests` | `game-client.js` | 有界完整页面层请求队列；同一来源快速点击时旧请求降级 |
| `Dialog.*.items/skills/eqs` | `game-client.js` | 原生对话框最近一次服务端数据 |
| `Combat` 内部状态 | `client/modules/combat.js` | 战斗目标、动作冷却、状态条；`ClearRoomStatus()` 只清跨房间状态动画，`destroy()` 清理模块全部追踪计时器 |
| `MAP.Buffer/AutoRoute` | `client/modules/map.js` | 地图缓存、当前路线和移动/延迟推进计时器；取消路线或销毁时统一清理 |
| `Setting` | `game-client.js` | 原生客户端偏好 |
| `G` | `features/plugin/automation-state.js` | 自动化的角色、房间、装备、技能、战斗和资源镜像 |
| `G.ingo` | `features/plugin/navigation-core.js` | 路线命令执行期间置为 `true`，`WG.SendCmd` 完成后恢复 `false`；保持原异常时序，不额外吞掉命令错误 |
| `WG.hooks` | `automation-suite.js` | 按协议 `type` 订阅的扩展消息总线 |
| `WG.sm_state/sm_item/sm_store/smbuyNum/lastBuy` | `features/plugin/master-task-automation.js` | 师门公开兼容状态映射；唯一循环和取仓请求使用代际隔离，手停、登录、断线或销毁时取消 Hook/计时器，角色重置时清空临时物品和计数 |
| `timer` / `WG.wudao_hook/fbnum/needGrove` | `features/plugin/activity-automation.js` + 遗留 accessor | 武道、学习、小树林与挖矿共用的历史 interval 句柄及活动公开状态；模块自身回调用代际隔离，登录/断线/销毁清理 timer、Hook 和计数 |
| `G.yaotaFlag/yaotaCount/yaoyuan` | `features/plugin/yaota-automation.js` + `automation-state.js` | 妖塔当前轮次、累计次数和妖元；房间 Hook 唯一，离塔忙碌等待可取消，登录/断线/销毁会清理当前进度但保留页面会话累计次数 |
| `WG.ztjk_hook` | `features/plugin/legacy-status-monitors.js` | 旧 `<角色>_ztjk` 配置的唯一兼容 Hook；保留历史多关键词、字段判断与命令替换，登录/断线/重注入/销毁精确清理；与新 Trigger 配置体系相互独立 |
| `WG.daily_hook/sd_hook` | `features/plugin/daily-workflows.js` | 日常签到和追捕扫荡的公开兼容 Hook；模块精确拥有 Hook、串行处理协议事件，并在重复启动、登录、断线或销毁时解除等待和阻止旧回调继续发命令 |
| `store_list/lock_list/drop_list/fenjie_list` | `features/plugin/inventory-list-settings.js` + 遗留 accessor | 清包、师门与设置页共用的实时数组；模块写入时同步角色 GM 键和对应输入框，调用时动态读取当前角色/背包与 CSV 状态 |
| `WG.marryhy` | `features/plugin/wedding-automation.js` | 当前婚宴 Hook；完成、超时、关闭、重复启动、登录变化和销毁时清空 |
| `WG.yamen_lister/yamen_err_no/zb_next` | `features/plugin/yamen-automation.js` | 衙门文本 Hook、解析失败次数和巡查步数；模块拥有任务/目标计时器，登录变化或销毁统一递增代际并清理；无逃犯时保留历史 `check_yamen_task = "over"` 语义 |
| `WG.sort_hook` | `features/plugin/warehouse-sorting.js` | 仓库或背包排序期间唯一 Hook；重复启动、登录变化、完成或销毁时清理 |
| `WG.packup_listener/packup_ready` | `features/plugin/inventory-cleanup.js` | 包裹整理唯一协议 Hook 和本轮命令已生成标记；存仓/丢弃/锁定/分解清单通过动态 accessor 读取，重复启动、登录变化、完成或销毁时清理 |
| `flow_store@<角色>` / `global_params@<角色>` | `features/plugin/raid-flow-storage.js` | Raid 流程源码和持久变量；当前角色缺键时回退 `@null` 历史数据，所有读写都在调用时动态获取角色 ID，切换角色不缓存旧键 |
| `WorkflowConfig_<角色>` / `workflow@<角色><id>` / `@cmdgroup<id>` | `features/plugin/raid-flow-storage.js` | 新流程目录树、旧工作流和旧命令组兼容数据；保留 `__WorkflowRootFinderSortWay` 排序键和 `FlowStore.corver` 历史拼写 |
| `roomData` / `unsafeWindow.roomData` | `features/plugin/room-state-bridge.js` + 遗留 accessor | 最近一次 `items` 场景快照，保持内部和公开引用同步 |
| `<角色>_WG_dashboard_snapshot_v1` | `automation-suite.js` | 境界和内力上限的角色本地快照；无短期过期限制，登录时立即显示，服务端 `score` 仍为真源 |
| `<角色>_WG_auto_first_round_v1` | `automation-suite.js` | 自动攻击首轮招式 ID 顺序，按角色持久化；当前不可用的已存招式保留配置但实战跳过 |
| `GM_getValue/GM_setValue` | `runtime/userscript-compat.js` | 扩展持久化；大量键以 `roleid + "_"` 隔离角色 |
| `wsmudSyncedPageSettings` | `runtime/page-settings-sync.js` + `extension/content-loader.js` | 扩展 `chrome.storage.local` 中的整页 `localStorage` 快照；新开 `wsmud2.com` / `wsmud2.cn` / `wxmud1.com` 页面只回填缺失键 |
| `localStorage` | 页面/兼容层 | 自由窗位置、聊天收起、侧栏宽度、原生 `extends`/`keys` 和插件 GM 键；按站点源隔离，需经快照跨站还原 |

新增缓存时优先遵守：

- 角色数据使用角色 ID 前缀，避免不同角色串数据。
- 数据结构带版本号；失配时丢弃旧结构，不猜测迁移。
- 设置合理上限，避免长期无限增长。
- 服务端返回仍是真源；缓存用于降低请求和首开延迟。
- 写入可以短防抖，读取应在对应角色身份确定后进行。

## 11. 弹窗类型约束

| 类型 | 当前实现 | 外部点击 | 典型用途 |
|---|---|---|---|
| 原生页面级 Dialog | `.dialog`，会隐藏 `.content-room` | 按原客户端逻辑 | 技能、背包、任务、江湖等完整页面 |
| 遮罩模态弹窗 | `.WG_equipment_picker` | 点击遮罩可关闭 | 必须立即选择或阻断背景交互的流程 |
| 地图模态弹窗 | `.WG_map_modal` | 点击遮罩可关闭 | 大尺寸查看地图，不参与房间区域排版 |
| 自由详情窗 | `.WG_item_popup`，`aria-modal="false"` | 不关闭，并让背景继续可操作；Esc 仅关闭当前最高 z-index 层 | 场景人物/物品、技能、装备和可结构化关联的排行榜人物详情 |
| 右栏聊天 | 原生 `[command='showchat']` + `.WG_side_chat_view` | 不适用 | 首次进入页面默认开启；原生聊天按钮可切换。关闭时右栏仍保持黑色占位和可调宽度，中间聊天流保持隐藏 |

不要把所有“弹窗”统一成遮罩。是否允许点击外部关闭取决于交互类型：遮罩类允许；可放在旁边稍后继续看的自由窗保持不变。

## 12. 修改与验证清单

### 修改前

- 确认修改目标是 `WSMudEX/`，不是仅供参考的 `wsmud2/src/`。
- 从本索引找到对象、选择器、命令和状态所有者。
- 检查同一选择器是否同时由 `game-client.js` 生成、`automation-suite.js` 覆盖样式。
- 涉及消息响应时检查 `WG.receive_message` 是否可能过滤、改写或提前消费。

### 修改后

最小语法检查：

```bash
node --check WSMudEX/client/game-client.js
node --check WSMudEX/features/automation-suite.js
```

完整验证：

```bash
node WSMudEX/tools/verify-extension.mjs
```

若改了加载顺序、协议拦截、DOM 契约、详情命令、资源解析、装备缓存或排序，应同步扩充 `verify-extension.mjs` 的静态契约或动态烟测。

## 13. 索引维护规则

只有以下变化需要更新本文件，普通函数内部重构不必更新：

- 文件职责或加载顺序变化。
- 新增/删除顶层对象、主要 Dialog 或核心 DOM 区域。
- 协议命令、响应类型或消息消费链变化。
- 状态/缓存所有者、持久化键或版本变化。
- 高频功能的首要锚点变化。
- 弹窗、排序、显示格式等已经确认的产品约束变化。

更新时优先修正锚点名称和职责；大致行号可用下列命令一次刷新：

```bash
rg -n "function (ContainerCommand|SendCommand|ReceiveMessage|ReceiveData|WSClient)|^(var|const) (Process|Combat|Dialog|SCRIPT|Setting|Confirm|Util)" \
  WSMudEX/client/game-client.js
rg -n "WG =|G =|GI =|receive_message:|initSideDashboard:|initChatDrawer:" \
  WSMudEX/features/automation-suite.js
```
