export const semanticSourceBundles = [
  {
    bundle: "features/automation-suite.js",
    sourceDir: "sources/automation-suite",
    fragments: [
      ["00-foundation.jsfrag", null],
      [
        "10-runtime-core.jsfrag",
        '    PackDataCodec = unsafeWindow.WSMudPlugin.createService("pack-data-codec", {',
      ],
      [
        "80-workflows-and-settings.jsfrag",
        "      executeLegacyScript: function (source) {",
      ],
      [
        "94-protocol-and-config.jsfrag",
        '    UI = unsafeWindow.WSMudPlugin.createService("automation-ui-templates", {',
      ],
      ["99-bootstrap-and-exports.jsfrag", "  var originWindow = {};"]
    ],
  },
  {
    bundle: "client/game-client.js",
    sourceDir: "sources/game-client",
    fragments: [
      ["00-dom-bootstrap.jsfrag", null],
      ["10-login-and-roles.jsfrag", "var GameClient;\n"],
      ["20-command-dispatch.jsfrag", "function ContainerCommand("],
      [
        "25-connection.jsfrag",
        'const ClientConnection = unsafeWindow.WSMudClient.createModule("connection", {',
      ],
      [
        "40-protocol-process.jsfrag",
        'const ClientMessaging = unsafeWindow.WSMudClient.createModule("message-queue", {',
      ],
      [
        "50-combat.jsfrag",
        'var Warn = unsafeWindow.WSMudClient.createModule("warnings", {',
      ],
      [
        "55-map.jsfrag",
        'var mapRuntime = unsafeWindow.WSMudClient.createModule("map", {',
      ],
      [
        "60-dialog-shell.jsfrag",
        'var Touch = unsafeWindow.WSMudClient.createModule("touch", {',
      ],
      [
        "61-dialog-skills.jsfrag",
        'const ClientDialogSkills = unsafeWindow.WSMudClient.createModule("dialog-skills", {',
      ],
      ["62-dialog-inventory.jsfrag", "Dialog.pack = {"],
      [
        "63-dialog-lists-and-settings.jsfrag",
        "const ClientDialogChannel = unsafeWindow.WSMudClient.createModule(\n",
      ],
      [
        "64-dialog-jianghu.jsfrag",
        "const ClientDialogJianghu = unsafeWindow.WSMudClient.createModule(\n",
      ],
      [
        "65-dialog-commerce-and-social.jsfrag",
        'const ClientDialogShop = unsafeWindow.WSMudClient.createModule("dialog-shop", {',
      ],
      [
        "66-dialog-extensions.jsfrag",
        'const ClientDialogKeys = unsafeWindow.WSMudClient.createModule("dialog-keys", {',
      ],
      [
        "70-script-engine.jsfrag",
        'const SCRIPT = unsafeWindow.WSMudClient.createModule("script-engine", {',
      ],
      ["75-client-settings.jsfrag", "const ClientSettings = unsafeWindow.WSMudClient.createModule("],
      [
        "80-confirmation.jsfrag",
        'var Confirm = unsafeWindow.WSMudClient.createModule("confirmation", {',
      ],
      [
        "85-utilities.jsfrag",
        'const ClientUtilities = unsafeWindow.WSMudClient.createModule("utilities", {',
      ],
      ["90-websocket-and-api.jsfrag", "var mysocket = WebSocket;"],
    ],
  },
];
