# 语义化源码片段

`client/game-client.js` 仍依赖单一脚本作用域及严格声明顺序；`features/automation-suite.js` 是插件模块化迁移期间保留的兼容主体。这里保存它们尚未迁移部分的语义化源码片段：

- `automation-suite/`：尚待迁移的基础设施、自动化任务、侧栏与装备、战斗、物品、工作流、UI 模板、状态和启动导出。
- `game-client/`：登录、命令、连接、消息、协议处理、战斗、地图、对话框、脚本引擎、设置、确认层、工具和 WebSocket。

片段使用 `.jsfrag` 后缀，因为单个片段可能从对象属性或闭包中间开始，不能独立执行；按文件名顺序拼接后才是完整 JavaScript。插件新增功能不得继续使用 `.jsfrag`，应放入 `features/plugin/` 并通过模块内核注册；迁移完成的旧片段会从本目录删除。

`features/plugin/` 中每个文件都是可独立解析的完整源码模块，由
`tools/plugin-module-layout.mjs` 维护顺序，并由 `extension/content-loader.js`
逐个直接注入。同步工具只生成 `features/automation-suite.js` 与
`client/game-client.js` 两个仍依赖单一词法作用域的兼容聚合入口。

## 修改流程

1. 在对应语义目录修改 `.jsfrag`。
2. 生成运行文件：

   ```bash
   node tools/sync-semantic-sources.mjs build
   ```

3. 完整验证：

   ```bash
   node tools/verify-extension.mjs
   ```

若运行文件临时发生了必须保留的修改，可反向刷新片段：

```bash
node tools/sync-semantic-sources.mjs extract
```

`verify-extension.mjs` 会检查所有片段拼接后与实际运行文件逐字一致，防止两份源码漂移。
