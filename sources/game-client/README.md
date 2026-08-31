# 游戏客户端语义索引

这些片段按文件名顺序拼接为 `client/game-client.js`。

| 片段 | 职责 |
|---|---|
| `00-dom-bootstrap` | DOM 事件绑定和页面启动 |
| `10-login-and-roles` | 登录、验证码、服务器与角色选择 |
| `20-command-dispatch` | 页面命令、底栏菜单、聊天和工具菜单 |
| `25-connection` | 连接建立、重连与会话令牌 |
| `40-protocol-process` | `Process` 协议分派、登录/会话桥和自由详情窗；房间渲染由 `client/modules/room-renderer.js` 挂回同一对象 |
| `50-combat` | `Warn` 与 `Combat` 模块兼容桥；战斗主体位于 `client/modules/combat.js` |
| `55-map` | 地图模块兼容桥；地图渲染、模态框和自动寻路位于 `client/modules/map.js` |
| `60-dialog-shell` | 通用对话框、悬浮层级和属性面板 |
| `61-dialog-skills` | `dialog-skills` 与 `skill-calculator` 创建桥；技能主体均位于普通模块 |
| `62-dialog-inventory` | 背包、他人背包、交易和通用列表 |
| `63-dialog-lists-and-settings` | `dialog-channel/dialog-tasks` 创建桥、客户端设置和排行榜桥 |
| `64-dialog-jianghu` | `dialog-jianghu` 模块创建及四个 `Dialog` 公开对象兼容桥 |
| `65-dialog-commerce-and-social` | `dialog-shop/dialog-social/dialog-events/dialog-pm` 创建桥和 `format_time_span` |
| `66-dialog-extensions` | `dialog-keys/dialog-extensions` 创建桥、好友和支付 |
| `70-script-engine` | `SCRIPT` 页面命令脚本引擎兼容桥；实际模块位于 `client/modules/script-engine.js` |
| `75-client-settings` | 方向映射、客户端偏好和名字生成 |
| `80-confirmation` | 确认模块兼容桥；实际确认输入和二次操作位于 `client/modules/confirmation.js` |
| `85-utilities` | 客户端 utilities 模块创建、历史 Util 公开别名和 Array/Date 兼容扩展桥接 |
| `90-websocket-and-api` | WebSocket 包装、协议解码和客户端 API |

房间/人物/出口渲染、消息队列、警告、触控手势和视图存储等已迁移职责位于 `client/modules/`，
对应旧语义片段已删除。
技能潜能/时间公式、角色速度推导和 `Dialog.skillcalc` 浮动计算器位于
`client/modules/skill-calculator.js`；`61-dialog-skills` 保留 skills/master 与
skill-calculator 的原位创建桥、三个顶层公式函数和公开对象名。
自身技能、师父技能、书架和技能详情交互位于 `client/modules/dialog-skills.js`；
同一片段在原声明位置挂回 `Dialog.skills` 与 `Dialog.master`，七个历史共享方法
继续保持严格函数身份，后置 `SCRIPT/Dialog.extend/Setting` 通过 getter 延迟访问。
门派、普通副本、禁地和江湖入口主体位于 `client/modules/dialog-jianghu.js`；
`64-dialog-jianghu` 只在原加载位置把四个同身份对象挂回 `Dialog`。
排行榜过滤器、缓存、渲染和交互主体位于 `client/modules/dialog-stats.js`；
`63-dialog-lists-and-settings` 只在原位置创建模块并挂回 `Dialog.stats`。
频道历史/过滤/右侧面板兼容和任务全量/增量渲染分别位于
`client/modules/dialog-channel.js`、`client/modules/dialog-tasks.js`；同一片段
在原声明位置挂回 `Dialog.channel` 与 `Dialog.tasks`。
快捷键分组、录入、存储和全局执行主体位于 `client/modules/dialog-keys.js`；
`66-dialog-extensions` 在原位置创建模块并挂回 `Dialog.keys`，片段仅另保留好友和支付占位对象。
自定义扩展按钮、消息/数据触发器、过滤器、录制和按角色启用主体位于
`client/modules/dialog-extensions.js`；同一片段在原声明位置挂回 `Dialog.extend`，
并通过 getter 延迟访问后置声明的 `SCRIPT`。
商城货币、商品协议、价格渲染和购买入口位于 `client/modules/dialog-shop.js`；
消息/关系/帮派/队伍、活动和拍卖分别位于 `client/modules/dialog-social.js`、
`client/modules/dialog-events.js`、`client/modules/dialog-pm.js`；
`65-dialog-commerce-and-social` 在原位置创建四个模块并挂回对应 `Dialog` 对象，
同时保留被社交模块动态读取的 `format_time_span`。

搜索时优先从本目录开始；修改完成后在扩展根目录运行：

```bash
node tools/sync-semantic-sources.mjs build
node tools/verify-extension.mjs
```
