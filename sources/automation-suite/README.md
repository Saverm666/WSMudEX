# 自动化套件语义索引

这些片段是插件模块化迁移期间保留的兼容主体，按文件名顺序拼接为 `features/automation-suite.js`。新功能直接进入 `features/plugin/`，不再新增 `.jsfrag`。

| 片段 | 职责 |
|---|---|
| `00-foundation` | 原型兼容、格式化、滚动、全局变量、静态数据服务桥和基础配置 |
| `10-runtime-core` | `pack-data-codec` 创建桥、`WG` 生命周期、消息 hook、登录初始化和基础样式 |
| `80-workflows-and-settings` | 自定义流程 direct-eval/公开方法桥、状态监控设置 UI、配置页和登录脚本 |
| `94-protocol-and-config` | `automation-protocol-state` 创建桥、其余 `GI` 协议 hook 和配置加载 |
| `99-bootstrap-and-exports` | `automation-message-menu` 原位 direct-eval/监听桥、音频、启动和全局导出 |

远程配置、推送、语音、提示音和乐谱播放已迁入
`features/plugin/notification-services.js`，不再属于语义片段。
`G` 状态模型已迁入 `features/plugin/automation-state.js`。
角色、出口、房间人物、技能、战斗、状态和冷却的主协议 Hook 已整体迁入
`features/plugin/automation-protocol-state.js`；`94-protocol-and-config` 只在原 Hook
顺序位置调用 `ProtocolState.init()`，其余 GI Hook 暂留片段。
`needfind/place/mpz_path/sm_array` 的固定数据已迁入
`features/plugin/automation-static-data.js`；本目录仅保留同名词法别名及三处
direct `eval` 前后的双向同步。身份快照在旧 getter 或下次 eval 读取时还会
仲裁延迟闭包造成的词法重绑定，以兼容历史脚本读取、修改和整体替换。
自定义流程的执行、按角色存储、Vue 编辑/分享和快捷按钮已迁入
`features/plugin/custom-workflows.js`；`80-workflows-and-settings` 保留公开
`WG` 方法薄桥和同一 IIFE 内的 direct `eval` 适配器。模块按角色代际隔离
缺省流程与显示位置，避免无配置角色继承上一角色状态。
跨窗口消息命令、常用/门派传送和房间名右键菜单已迁入
`features/plugin/automation-message-menu.js`；`99-bootstrap-and-exports` 保留
`originWindow`、单次事件注册以及在原 IIFE 词法环境执行 `#js` 的 direct-eval 回调。
61 个自动化按键映射、对话/聊天分层处理、方向和场景动作已迁入
`features/plugin/automation-keyboard.js`；`00-foundation` 在原声明链创建服务并保留
同一词法 `KEY`。重复 `init()` 只安装一次 document 监听和映射，后续片段的
`getKeyApi()` 继续返回该对象。
NPC/商店数据维护、计算器、自动战斗和工具箱分别迁入
`data-maintenance.js`、`training-calculators.js`、`combat-automation.js` 与
`toolbox-scheduler.js`。原 `UI` 模板和 `T/ProConsole` 命令引擎分别迁入
`ui-templates.js` 与 `command-engine.js`，均由显式服务工厂创建。
自定义 Q/W/E/R/T/Y 快捷按钮及其角色配置已迁入
`features/plugin/custom-command-buttons.js`；语义片段仍保留设置页中对该配置的
保存表单，但不再定义 `WG.zdybtnfunc`、`WG.zdy_btnset`、`WG.zdy_btnListInit`
和 `WG.zdy_btnshow`。
购买、赠送、装备、询问、击杀/拾取场景对象和清包命令辅助已迁入
`features/plugin/item-command-helpers.js`。包裹存仓/分解/丢弃、仓库/背包颜色整理与衙门追捕分别迁入
`features/plugin/inventory-cleanup.js`、`features/plugin/warehouse-sorting.js` 和 `features/plugin/yamen-automation.js`；
通用 `WG.go/at/getIdByName` 导航基础能力迁入 `features/plugin/navigation-core.js`；
师门状态 0–5、唯一循环、仓库取物及其跨会话清理迁入
`features/plugin/master-task-automation.js`。
直连/原生回退发送、命令拆分、`%NPC%`/`*物品*` 替换、`$` 分派和通用等待迁入
`features/plugin/command-transport.js`。
角色物品清单设置迁入 `features/plugin/inventory-list-settings.js`；共享 timer、武道、学习和小树林循环迁入
`features/plugin/activity-automation.js`。原 `30-navigation-and-tasks` 片段已清空并删除。
一键日常、门派请安和追捕扫荡已迁入 `features/plugin/daily-workflows.js`；
该模块拥有 `daily_hook/sd_hook`、可取消等待及登录/断线生命周期，`$daily`
通过完成信号串接流程，不再轮询可能失真的 Hook 指针。
旧 `ztjk` 状态监控的协议匹配/命令运行时与妖塔房间监控分别迁入
`features/plugin/legacy-status-monitors.js`、`features/plugin/yaota-automation.js`；
设置 UI 仍保留在 `80-workflows-and-settings`，两套运行时均拥有唯一 Hook 和会话重置。
装备套装、技能套装、脱装备、套装菜单和套装 Vue 管理页已迁入
`features/plugin/equipment-loadouts.js`。婚宴流程和场景物品快照分别迁入
`features/plugin/wedding-automation.js` 与 `features/plugin/room-state-bridge.js`，
原 `70-items-bosses-and-medicine` 片段已删除。

搜索时优先从本目录开始；修改完成后在扩展根目录运行：

```bash
node tools/sync-semantic-sources.mjs build
node tools/verify-extension.mjs
```
