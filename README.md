# WSMudEX

WSMudEX 是适用于“武神传说（WSMUD）”网页游戏的 Chrome Manifest V3 扩展，支持：

- `wsmud2.com` 及其子域名
- `wsmud2.cn` 及其子域名
- `wxmud1.com` 及其子域名

项目由原扩展解包、去压缩和语义化整理而来，并在此基础上持续拆分模块、修复兼容问题和补充自动化功能。它不是游戏官方扩展。

## 安装方式

目前通过浏览器的“加载已解压的扩展程序”安装。

1. 点击 GitHub 页面右上角的 **Code → Download ZIP**，下载后完整解压；也可以使用 Git 克隆仓库。
2. Chrome 打开 `chrome://extensions/`；Edge 打开 `edge://extensions/`。
3. 开启页面上的“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择包含 `manifest.json` 的 WSMudEX 仓库目录。
6. 打开受支持的游戏站点并刷新页面。

安装后可把 WSMudEX 固定到浏览器工具栏。点击扩展图标可以启用或停用插件，也可以导入、导出配置。

> 如果浏览器提示无法读取清单，通常是选中了仓库目录的上一层。请确认所选目录中可以直接看到 `manifest.json`。

## 更新方式

使用 Git 安装时，在仓库目录拉取最新代码；使用 ZIP 安装时，重新下载并覆盖旧目录。完成后回到扩展管理页面，点击 WSMudEX 卡片上的“重新加载”，再刷新游戏页面。

为避免配置丢失，更新或重新安装前建议先在扩展弹窗中点击“导出配置”。

## 基本使用

1. 进入任一受支持的 WSMUD 站点并正常登录角色。
2. 点击浏览器工具栏中的 WSMudEX，确认“插件状态”为“运行中”。
3. 插件功能会加载到游戏页面；具体功能可在游戏内的插件设置、快捷按钮、工具栏、触发器和流程界面中配置。
4. 需要迁移浏览器或备份设置时，在扩展弹窗中使用“导出配置”；恢复时使用“导入配置”。

角色切换、断线重连和跨站点配置同步涉及页面状态。修改配置后如果界面没有立即更新，请先刷新游戏页面。

## 权限与网络说明

扩展仅声明 `scripting`、`storage` 以及受支持游戏域名的访问权限。部分历史功能仍保留外部网络请求、推送服务和第三方资源入口；只有在使用对应功能时才应填写自己的 Token 或 Key。请勿在 Issue、截图或提交记录中公开这些凭据。

详细行为见 [`docs/behavior-equivalence.md`](docs/behavior-equivalence.md)。使用本项目表示你愿意自行承担账号安全、游戏规则兼容性及第三方服务可用性风险。

## 开发与验证

修改前请先阅读 [`docs/code-index.md`](docs/code-index.md)。插件模块优先维护在 `features/plugin/`，不要直接编辑生成文件。

修改普通扩展代码后运行：

```bash
node tools/verify-extension.mjs
```

涉及 `sources/automation-suite/*.jsfrag` 或 `sources/game-client/*.jsfrag` 时，先重新生成聚合文件，再验证：

```bash
node tools/sync-semantic-sources.mjs build
node tools/verify-extension.mjs
```

主要目录：

- `extension/`：Manifest V3 内容脚本和后台 Service Worker
- `popup/`：扩展弹窗及配置导入导出
- `runtime/`：Userscript API 兼容和页面配置同步
- `features/plugin/`：独立插件功能模块
- `features/`：自动化、Raid 和 Trigger 运行入口
- `client/modules/`：已迁移的游戏客户端模块
- `sources/`：尚未迁移代码的语义真源
- `docs/`：架构索引、行为说明和变更记录
- `tools/`：源码同步与静态验证工具

## 参与贡献

欢迎提交 Issue 和 Pull Request。提交前请确保修改集中于问题本身，并运行完整验证。涉及现网协议、DOM、命令或加载时机的修复，请在说明中记录现象、差异、根因和验证结果。

## 许可证与上游代码

本项目原创代码和修改部分使用 [MIT License](LICENSE)。仓库中包含的第三方库、上游自动化代码及由原扩展整理的代码仍归各自权利人所有，并遵循各自许可证或使用条款；MIT License 不会覆盖这些独立作品。上游自动化许可见 [`features/upstream-automation.LICENSE`](features/upstream-automation.LICENSE)。

