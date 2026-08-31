# 原文件映射

| CRX 原路径 | 可读版路径 | 职责 |
|---|---|---|
| `manifest.json` | `manifest.json` | 扩展清单 |
| `background.js` | `extension/service-worker.js` | 安装事件 |
| `content.js` | `extension/content-loader.js` | 原脚本拦截、顺序注入、数据消息桥 |
| `popup.html` | `popup/index.html` | 扩展控制弹窗 |
| `popup.js` | `popup/controller.js` | 启停和配置导入导出 |
| `icon128.png` | `assets/icon-128.png` | 扩展图标 |
| `qrcode.png` | `assets/support-qr.png` | 支持二维码 |
| `ws-js/OQnmUCFh.js` | `runtime/userscript-compat.js` | GM API 兼容层 |
| `ws-js/PtFcg2HA.js` | `vendor/jquery-3.7.1.js` | jQuery 3.7.1 |
| `ws-js/Cfe70iMO.js` | `vendor/vue-2.6.11.js` | Vue 2.6.11 |
| `ws-js/I0SfHxpU.js` | `vendor/layer-2.3.js` | layer 2.3 |
| `ws-js/j5VNih8g.js` | `vendor/context-menu.js` | 右键菜单库 |
| `ws-js/G8aNi4ta.js` | `vendor/store-2.0.12.js` | store.js 2.0.12 |
| `ws-js/tJJN8u0D.js` | `features/automation-suite.js`（语义源码见 `sources/automation-suite/`） | 主自动化套件 |
| `ws-js/dU7VGSnh.js` | `features/plugin/role-switcher.js` | 角色/账号切换，已迁为功能模块 |
| `ws-js/iP5HSXO4.js` | `features/raid-flow-engine.js` | 副本流程编译与执行 |
| `ws-js/L2KwCGwH.js` | `features/trigger-system.js` | 监控和触发系统 |
| `ws-js/w5I3dxzp.js` | `client/game-client.js`（语义源码见 `sources/game-client/`） | 完整游戏客户端 |

原始文件的 SHA-256 保存于 `original-sha256.txt`，可用于确认输入基线没有变化。
