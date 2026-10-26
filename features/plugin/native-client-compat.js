/** Adapt overlay hosts that keep their own game client. */
(function registerNativeClientCompat(global) {
  'use strict';

  function isBinaryHandshake(text) {
    return typeof text === 'string' && text.indexOf('#binary') === 0;
  }

  function recoverCookieAfterHandshake(cookieBefore, sentText, cookieAfter) {
    if (!isBinaryHandshake(sentText)) return cookieAfter;
    if (cookieBefore === undefined && cookieAfter === sentText) return undefined;
    return cookieAfter;
  }

  function isBinaryPayload(data) {
    return (
      (typeof ArrayBuffer === 'function' && data instanceof ArrayBuffer) ||
      (typeof Uint8Array === 'function' && data instanceof Uint8Array)
    );
  }

  function materializeSocketMessage(msg, decodeBinary) {
    if (!msg || !isBinaryPayload(msg.data) || typeof decodeBinary !== 'function') {
      return msg;
    }
    const decoded = decodeBinary(msg.data);
    if (!decoded) return msg;
    return { data: JSON.stringify(decoded) };
  }

  function decodeBinary(data) {
    const protocol =
      global.WSMudBinaryProtocol ||
      (typeof window === 'object' && window && window.WSMudBinaryProtocol);
    if (!protocol || typeof protocol.decodeBinaryMessage !== 'function') {
      return null;
    }
    return protocol.decodeBinaryMessage(data);
  }

  let nativeForward = null;
  function forwardNativeSocketMessage(msg) {
    if (nativeForward) return nativeForward(msg);
  }

  function install(target) {
    const host = target || global;
    if (!host || host.WSMudNativeClientCompatInstalled) return false;
    const WG = host.WG;
    if (!WG || typeof WG.receive_message !== 'function') return false;
    if (WG && typeof WG.receive_message === 'function') {
      const originalReceive = WG.receive_message;
      WG.receive_message = function (msg) {
        if (msg && typeof host.Blob === 'function' && msg.data instanceof host.Blob) {
          return msg.data.arrayBuffer().then((bytes) => WG.receive_message.call(this, { data: bytes }));
        }
        const materialized = materializeSocketMessage(msg, decodeBinary);
        if (msg && isBinaryPayload(msg.data) && materialized === msg) {
          return typeof WG.forwardNativeSocketMessage === 'function'
            ? WG.forwardNativeSocketMessage.call(this, msg) : undefined;
        }
        return originalReceive.call(
          this,
          materialized,
        );
      };
    }
    const overlay = host.location && /(^|\.)wxmud1\.com$/i.test(host.location.hostname);
    const Socket = host.WebSocket;
    if (!overlay && Socket && Socket.prototype && typeof Socket.prototype.send === 'function') {
      const originalSend = Socket.prototype.send;
      Socket.prototype.send = function (text) {
        const cookieBefore = host.G ? host.G.cookie : undefined;
        const result = originalSend.call(this, text);
        if (host.G) {
          host.G.cookie = recoverCookieAfterHandshake(
            cookieBefore,
            text,
            host.G.cookie,
          );
        }
        return result;
      };
    }
    host.WSMudNativeClientCompatInstalled = true;
    if (overlay) {
      installOverlayUI(host, WG);
    }
    return true;
  }

  function installOverlayUI(host, WG) {
    const $ = host.jQuery;
    if (typeof $ !== 'function' || !host.Process || !host.Dialog) return;
    installFloatingDialogs(host, WG, $);
    installOverlayInventoryControls(host);
    installOverlayConfirm(host, $);
    installOverlayCommands(host, WG);
    installOverlayDungeonEntry(host, WG, $);
    installOverlayDetails(host, WG, $);
    const originalClear = host.Process.clear;
    if (typeof originalClear === 'function') host.Process.clear = function () {
      if (WG.resetMimicSkills) WG.resetMimicSkills();
      return originalClear.apply(this, arguments);
    };
    host.addEventListener('WSMudOverlayReady', function () {
      installOverlaySharedFeatures(host, WG, $);
    }, { once: true });
    const skills = host.Dialog.skills;
    const originalSkillsData = skills.onData;
    skills.onData = function (data) {
      // Native initializes categories only above ten items, leaving smaller
      // first lists in the unfiltered sentinel state (-1).
      if (Array.isArray(data.items) && this.selected_item < 0) this.selected_item = 0;
      const keepBooks = Array.isArray(data.items) && this.selected_item === 2 && this.element && this.element.hasClass('dialog-books');
      if (data.books && this.isShow && this.selected_item !== 2) {
        this.books = this.format_books(data.books);
        return;
      }
      const result = originalSkillsData.apply(this, arguments);
      if (keepBooks) {
        if (this.books) this.showBooks();
        else this.element.empty();
      }
      return result;
    };
    installOverlayCombat(host, WG);
    installOverlayJianghu(host, WG);
    // Native jQuery owns this handler; removing it through our jQuery would
    // leave the click-to-open behavior on the relocated chat history intact.
    if (host.Process.ChannelElement) {
      host.Process.ChannelElement.off('click').on('click.WG_overlay_channel', function () {
        if (WG.isPluginFeatureEnabled && !WG.isPluginFeatureEnabled('chatDrawer')) host.Dialog.channel.show();
      });
    }
    WG.getOverlayRoleName = function () {
      const current = $('.role-list [role' + 'id]').filter(function () {
        return String($(this).attr('role' + 'id')) === String(host.Process.player);
      }).first();
      let name = current.find('.role-name').text().trim();
      const realm = current.find('.role-realm').text().trim();
      const title = current.find('.role-title').text().trim();
      for (const prefix of [realm, title]) {
        if (prefix && name.startsWith(prefix)) name = name.slice(prefix.length).replace(/^[·\s]+/, '');
      }
      return name;
    };
    // The site's optional built-in WG bridge must not also feed our receiver.
    // This only gates this page's runtime; keep its stored preference intact.
    host.__wsmud2Plugin = host.__wsmud2Plugin || {
      version: '', enabled: false, loading: false, ready: false,
      loaded: [], excluded: [], error: '',
    };
    if (host.__wsmud2Plugin) {
      Object.defineProperty(host.__wsmud2Plugin, 'enabled', {
        configurable: true,
        get: function () { return false; },
        set: function () {},
      });
    }
    function deliver(payload, forward) {
      const previous = nativeForward;
      nativeForward = forward;
      try { return WG.receive_message({ data: payload }); }
      finally { nativeForward = previous; }
    }
    const types = 'regist emote deleterole cross roles loginerror login levelup setting_update itemremove itemadd items room story_screen exits item actions cmds map updatemap dialog sc perform disobj changepfm clearDistime pay dispfm perform_cast status combat state die warn msg addAction removeAction'.split(' ');
    types.forEach(function (type) {
      const original = host.Process[type];
      if (typeof original !== 'function') return;
      host.Process[type] = function (data) {
        // Native accepts one command object too; legacy WG appends buttons
        // with Array.push before dispatching hooks.
        if (type === 'cmds' && data.items && !Array.isArray(data.items)) data = Object.assign({}, data, { items: [data.items] });
        return deliver(JSON.stringify(data), (msg) => original.call(this, JSON.parse(msg.data)));
      };
    });
    if (host.Process.message && typeof host.Process.message.push === 'function') {
      const originalPush = host.Process.message.push;
      host.Process.message.push = function (message) {
        return deliver(String(message), (msg) => originalPush.call(this, msg.data));
      };
    }
    const setting = host.Dialog && host.Dialog.setting;
    if (setting && Array.isArray(setting.footer) && !setting.footer.some((item) => item[1] === 'script')) {
      setting.footer.push(['脚本', 'script']);
      const originalChanged = setting.footerChanged;
      const script = $('<div class="dialog-script"></div>');
      setting.footerChanged = function (tab) {
        if (tab !== 'script') return originalChanged.call(this, tab);
        if (this.selectitem) this.selectitem.detach();
        if (this.child && typeof this.child.hide === 'function') this.child.hide();
        this.selectitem = script;
        this.child = { hide: function () { script.detach(); } };
        script.appendTo(host.Dialog.contentElement);
        WG.setting(true);
      };
    }
    function mount() {
      if (!host.Process || !host.Process.player || !$('.content-message').length) return;
      if (!$('.WG_side_rail_left').length) WG.login();
    }
    WG.add_hook('login', function () {
      // Hooks run before the native client updates Process.player and its DOM.
      host.queueMicrotask(mount);
    });
    function syncExistingRole() {
      if (host.Process.player == null) return;
      const id = host.Process.player;
      const roleName = $('.role-list [role' + 'id="' + String(id).replace(/["\\]/g, '') + '"] .role-name').text() || String(id);
      WG.run_hook('roles', { type: 'roles', roles: [{ id: id, name: roleName, title: '' }] });
      WG.run_hook('login', { type: 'login', id: host.Process.player });
    }
    syncExistingRole();
    host.addEventListener('WSMudOverlayReady', syncExistingRole);
    mount();
    host.WSMudOverlayHandleClick = function (event) {
      const menu = event.target.closest && event.target.closest('[command="showtool"]');
      if (menu && (!WG.isPluginFeatureEnabled || WG.isPluginFeatureEnabled('horizontalMenu'))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const bar = $('.bottom-bar > .right-bar');
        const open = !bar.hasClass('WG_horizontal_menu_open');
        bar.toggleClass('WG_horizontal_menu_open', open).children('.tool-item').css({ display: open ? '' : 'none', opacity: open ? 1 : 0 });
        $(menu).toggleClass('hide-tool', !open).attr('aria-expanded', String(open)).attr('title', open ? '收起菜单' : '展开菜单');
        return;
      }
      const settings = event.target.closest && event.target.closest('[command="pluginsettings"], [data-wsmud-command="pluginsettings"], .wdww-manage, [command="wdww"]');
      if (settings) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if ((settings.getAttribute('command') || settings.getAttribute('data-wsmud-command')) === 'pluginsettings') WG.openPluginSettings();
        else WG.setting();
        return;
      }
      const target = event.target.closest && event.target.closest('[cmd], [ecmd]');
      if (!target) return;
      const command = target.getAttribute('cmd') || target.getAttribute('ecmd') || '';
      if (!event.defaultPrevented && target.matches('.room-commands > .act-item') &&
          !WG.actionBarLoadoutReplayActive && typeof WG.runActionBarCommandWithLoadout === 'function' &&
          WG.runActionBarCommandWithLoadout(command, function () { runOverlayClientCommand(host, $, command); })) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (!/(?:^|;)\s*(?:#?wg\s+|@|\$)/i.test(command)) return;
      // If SPA capture was installed first, its handler has already sent this
      // command (through SCRIPT or SendCommand). Do not send it a second time.
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      host.SendCommand(command);
    };
  }

  function runOverlayClientCommand(host, $, command) {
    const text = String(command).trim();
    const nativeScript = /(?:^|;)\s*#|\s@\w+(?:\(|\b)/.test(text);
    if ((!/^[#_]/.test(text) && !nativeScript) || /(?:^|;)\s*#?wg\s+/i.test(text)) return host.SendCommand(command);
    // SCRIPT is private in the SPA. Use its own dispatcher, independently of
    // the source button: a pack response may rebuild the original action bar.
    // The native click dispatcher invokes SCRIPT only for a leading #. Its
    // default action strips that marker before sending an ordinary command.
    const scriptCommand = /^[#_]/.test(text) ? text : '#' + text;
    const button = $('<span hidden></span>').attr('cmd', scriptCommand).appendTo('.container');
    try { button[0].click(); } finally { button.remove(); }
  }

  function installOverlaySharedFeatures(host, WG, $) {
    const registry = host.WSMudClient;
    if (!registry) return;
    const nativeTasks = host.Dialog.tasks;
    const sharedTasks = registry.createModule('dialog-tasks', {
      Dialog: host.Dialog, jquery: $, SendCommand: (command) => host.SendCommand(command),
      getAutomation: () => WG, getRoleId: () => host.Process.player,
    }).tasks;
    // Keep the SPA's task validation, rewards and rendering. Share only our
    // daily-status panel; it reads limits from info instead of assuming caps.
    for (const name of ['dailyStatusDay', 'getDailyStatus', 'parseDailyStatus', 'renderDailyStatus', 'cancelDailyStatus', 'requestDailyStatus']) nativeTasks[name] = sharedTasks[name];
    const createItems = nativeTasks.create_items;
    nativeTasks.create_items = function () {
      const panel = this.element && this.element.find('.task-daily-status').detach();
      const result = createItems.apply(this, arguments);
      if (panel && panel.length) panel.prependTo(this.element);
      this.renderDailyStatus();
      return result;
    };
    const showTasks = nativeTasks.show;
    nativeTasks.show = function () {
      const result = showTasks.apply(this, arguments);
      this.requestDailyStatus();
      return result;
    };
    const closeTasks = nativeTasks.close;
    nativeTasks.close = function () {
      this.cancelDailyStatus();
      if (this.dailyStatusObserver) this.dailyStatusObserver.disconnect();
      this.dailyStatusObserver = null;
      return closeTasks.apply(this, arguments);
    };
    WG.add_hook('login', function () {
      nativeTasks.cancelDailyStatus();
      nativeTasks.dailyStatus = null;
      nativeTasks.dailyStatusFailed = false;
    });
    if (nativeTasks.isShow) nativeTasks.requestDailyStatus();

    const setting = host.Setting;
    const sharedSetting = registry.createModule('settings', {
      jquery: $, documentRef: host.document, hostWindow: host,
      getProcess: () => host.Process, getDialog: () => host.Dialog, getCombat: () => ({}),
      sendCommand: (command) => host.SendCommand(command),
      getScript: () => ({ run: (command) => runOverlayClientCommand(host, $, command) }),
      isConnected: () => !!(WG.online && host.G.connected),
    }).Setting;
    // The native settings object owns the advanced page and all other options.
    setting.observeAutoWorkCommand = sharedSetting.observeAutoWorkCommand;
    setting.handleAutoWorkState = sharedSetting.handleAutoWorkState;
    setting.restoreAutoWork = sharedSetting.restoreAutoWork;
    const save = setting.save;
    setting.save = function (key, value) {
      if (key === 'auto_work') return sharedSetting.save.call(this, key, value);
      return save.apply(this, arguments);
    };
    const load = setting.load;
    function syncAutoWorkInput() {
      const panel = host.Dialog.setting.customElement;
      if (!panel) return;
      const enabled = !!setting.auto_work && setting.auto_work !== '0';
      const toggle = panel.find('.setting-item[for="auto_work"]>.switch');
      toggle.toggleClass('on', enabled).find('.switch-text').text(enabled ? '开' : '关');
      panel.find('#auto_work').val(enabled && setting.auto_work != 1 ? setting.auto_work : '')
        .css('display', enabled ? 'block' : 'none').attr('placeholder', '留空：自动挖矿；也可填写命令或 # 脚本');
    }
    const initSetting = host.Dialog.setting.init;
    host.Dialog.setting.init = function () {
      const previous = this.customElement;
      const result = initSetting.apply(this, arguments);
      if (this.customElement !== previous) syncAutoWorkInput();
      return result;
    };
    setting.load = function () {
      this.auto_work = 0;
      const result = load.apply(this, arguments);
      this.restoreAutoWork();
      syncAutoWorkInput();
      return result;
    };
    const updateSetting = host.Process.setting_update;
    host.Process.setting_update = function (data) {
      const previous = setting.auto_work;
      const result = updateSetting.apply(this, arguments);
      if (data.key === 'auto_work') {
        // Server acknowledgements carry the transport marker, not the local
        // script. Keep temporary suspensions (previous === 0) intact.
        if (typeof previous === 'string' && previous !== '0' && previous !== '1' &&
            (String(data.value) === '0' || String(data.value) === '1')) setting.auto_work = previous;
        syncAutoWorkInput();
      }
      return result;
    };
    const send = host.SendCommand;
    host.SendCommand = function (command) {
      setting.observeAutoWorkCommand(command);
      return send.apply(this, arguments);
    };
    WG.add_hook('state', (data) => setting.handleAutoWorkState(data));
    if (host.Process.player) {
      setting.restoreAutoWork();
      syncAutoWorkInput();
    }

    host.document.addEventListener('contextmenu', function (event) {
      const row = event.target.closest && event.target.closest('.room_items .room-item');
      if (!row) return;
      const id = row.getAttribute('itemid');
      const item = ((host.Process.cur_room && host.Process.cur_room.items) || []).find((item) => String(item.id) === id);
      if (!item || item.p || item.me || String(host.Process.player) === id || !(Number(item.hp != null ? item.hp : item.max_hp) > 0)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      host.SendCommand('kill ' + id);
    }, true);
  }

  function installOverlayInventoryControls(host) {
    const extend = host.Dialog.extend;
    const originalInit = extend.init;
    extend.init = function (element) {
      // Native show rebinds delegated handlers before checking its cached DOM.
      element.off('click', '[ecmd]', this.onButtonClick)
        .off('click', '.setting-item', this.onClickRow)
        .off('click', '.switch', this.switchClick)
        .off('change', 'select', this.selectChanged);
      if (this.element && this.element[0] !== element[0]) this.element = null;
      return originalInit.apply(this, arguments);
    };
    const originalShow = extend.show;
    extend.show = function () {
      const result = originalShow.apply(this, arguments);
      if (this.element && this.footer_buttons) {
        this.footer_buttons.addClass('WG_extend_toolbar').attr({ role: 'toolbar', 'aria-label': '拓展操作' });
        this.footer_buttons.children('[for]').each(function () {
          if (this.tagName === 'BUTTON') return;
          const button = host.document.createElement('button');
          button.type = 'button';
          button.className = 'WG_extend_command';
          button.textContent = this.textContent;
          button.setAttribute('for', this.getAttribute('for'));
          button.setAttribute('ecmd', this.getAttribute('for'));
          this.replaceWith(button);
        });
        // Keep native commands and editor state; only relocate their controls.
        this.footer_buttons.prependTo(this.element);
      }
      return result;
    };
    const originalCommand = extend.command;
    extend.command = function () {
      try { return originalCommand.apply(this, arguments); }
      finally {
        if (this.footer_buttons) this.footer_buttons.find('.footer-item').addBack('.footer-item').removeClass('select');
      }
    };
    const pack = host.Dialog.pack;
    const originalCleanup = pack.cleanup;
    pack.cleanup = function () {
      const wasCleanup = this.packElement && this.packElement.hasClass('cleanup');
      const result = originalCleanup.apply(this, arguments);
      if (wasCleanup && this.packElement && !this.packElement.hasClass('cleanup')) this.show_items();
      return result;
    };
    const originalCreate = pack.createItems;
    pack.createItems = function () {
      const selected = new Map();
      if (this.packElement && this.packElement.hasClass('cleanup')) {
        this.packElement.find('.obj-item').each(function () {
          const operation = this.querySelector('.obj-oper.selected');
          // Keep explicit deselection too, instead of reselecting every book.
          selected.set(this.getAttribute('oindex'), operation && operation.getAttribute('cmd'));
        });
      }
      const result = originalCreate.apply(this, arguments);
      if (this.packElement && this.packElement.hasClass('cleanup')) {
        this.packElement.find('.obj-item').each(function () {
          const id = this.getAttribute('oindex');
          if (!selected.has(id)) return;
          for (const operation of this.querySelectorAll('.obj-oper')) {
            operation.classList.toggle('selected', operation.getAttribute('cmd') === selected.get(id));
          }
        });
      }
      return result;
    };
  }

  function installOverlayDetails(host, WG, $) {
    const dialog = host.Dialog;
    let child = null;
    let equippedDetail = null;
    let pending = null;
    function close() {
      if (child) child.remove();
      child = null;
      equippedDetail = null;
    }
    function open(data, owner, request) {
      close();
      const rect = dialog.element[0].getBoundingClientRect();
      child = $('<section class="WG_item_popup_dialog WG_overlay_detail" role="dialog" aria-label="查看详情"></section>')
        .css({ left: rect.left + 24, top: rect.top + 24, transform: 'none', zIndex: 2147483607, color: host.getComputedStyle(dialog.element[0]).color, fontSize: host.getComputedStyle(dialog.element[0]).fontSize });
      const header = $('<header class="WG_item_popup_header"><span class="WG_item_popup_title"></span><button class="WG_item_popup_close WG_overlay_detail_close" type="button" aria-label="关闭详情">×</button></header>').appendTo(child);
      const skill = owner && owner.skills && owner.skills[String(data.id)];
      const title = data.name || (skill && skill.name) || String(data.desc || '').split(/\r?\n|<br\s*\/?\s*>/i)[0] || '详情';
      header.find('.WG_item_popup_title').html(title);
      const body = $('<div class="WG_item_popup_body"><div class="WG_item_popup_desc"></div><div class="WG_item_popup_actions"></div></div>').appendTo(child);
      body.find('.WG_item_popup_desc').html(host.WSMudDetailPopupPolicy.stripRepeatedDetailTitle(data.desc, title, (html) => $('<span>').html(html).text()));
      const footer = body.find('.WG_item_popup_actions');
      if (!owner) {
        const actions = Array.isArray(data.commands) ? data.commands.slice() : [];
        const from = data.from != null ? String(data.from) : request && request.from;
        if (from === 'eq' && data.id != null) {
          const prefix = request && /^dc\s+\S+\s+/.exec(request.command);
          const command = (prefix ? prefix[0] : '') + 'uneq ' + data.id;
          if (!actions.some((action) => action && action.cmd === command)) actions.push({ name: '取消装备', cmd: command });
          equippedDetail = { id: String(data.id), owner: request && request.owner };
        }
        const commands = $('<div class="item-commands"></div>').appendTo(footer);
        const pack = dialog[request && request.owner] || dialog.pack;
        if (from === 'item' && pack && pack.get_item && pack.get_item(data.id)) {
          // Let the native renderer set SCRIPT's private current-item context
          // and construct packitem/custom/local actions before relocating them.
          pack.updateitem({ ...data, from, commands: actions.map((action) =>
            action && /^[#_$@]/.test(action.cmd || '') ? { ...action, extend: true } : action) });
          if (pack.objelement) commands.html(pack.objelement.find('.item-commands').last().html() || '');
          pack.clear_obj_detail();
        } else {
          for (const action of actions) if (action && action.cmd) {
            const command = from === 'item' && !action.extend && !/\s|^[#_$@]/.test(action.cmd)
              ? 'packitem ' + action.cmd + ' ' + data.id : action.cmd;
            $('<span></span>').html(action.name || action.cmd).attr('cmd', command).appendTo(commands);
          }
        }
      }
      if (owner && data.id != null) {
        const commands = $('<div class="item-commands"></div>').appendTo(footer);
        if (owner === dialog.skills && WG.mimicDetailButton) commands.append(WG.mimicDetailButton(data.id));
        const id = String(data.id);
        const actions = owner.master ? [['学习', 'xue ' + id + ' from ' + owner.master]] : [['进阶', 'lingwu ' + id], ['融合', 'lingwu2 ' + id], ['遗忘', 'fangqi ' + id]];
        if (owner.master && owner.is_follower) actions.push(['进阶', 'dc ' + owner.master + ' lingwu ' + id], ['遗忘', 'dc ' + owner.master + ' fangqi ' + id]);
        if (!owner.master && data.is_custom) actions.unshift(['推演', 'zc ' + id]);
        for (const [label, command] of actions) $('<span></span>').text(label).attr('cmd', command).appendTo(commands);
      }
      child.appendTo(host.document.body);
      const box = child[0].getBoundingClientRect();
      child.css({ left: Math.max(12, Math.min(rect.left + 24, host.innerWidth - box.width - 12)), top: Math.max(12, Math.min(rect.top + 24, host.innerHeight - box.height - 12)) });
      child.on('click', '[cmd]', function (event) { event.preventDefault(); event.stopPropagation(); runOverlayClientCommand(host, $, $(this).attr('cmd')); });
      child.find('.WG_overlay_detail_close').on('click', function (event) { event.preventDefault(); event.stopPropagation(); close(); });
      let drag;
      header.on('pointerdown', function (event) {
        const pointer = event.originalEvent;
        if (pointer.button !== 0 || $(event.target).closest('.WG_item_popup_close').length) return;
        const box = child[0].getBoundingClientRect();
        drag = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, left: box.left, top: box.top };
        this.setPointerCapture(pointer.pointerId);
        event.preventDefault();
      }).on('pointermove', function (event) {
        const pointer = event.originalEvent;
        if (!drag || pointer.pointerId !== drag.id || !child) return;
        const box = child[0].getBoundingClientRect();
        child.css({ left: Math.max(10, Math.min(drag.left + pointer.clientX - drag.x, host.innerWidth - box.width - 10)), top: Math.max(10, Math.min(drag.top + pointer.clientY - drag.y, host.innerHeight - box.height - 10)) });
      }).on('pointerup pointercancel', function () { drag = null; });
    }
    function prepare(command) {
      if (WG.mimicOwnsDetailQuery && WG.mimicOwnsDetailQuery(command)) return;
      const policy = host.WSMudDetailPopupPolicy;
      if (!policy || !dialog.isShow || (WG.isPluginFeatureEnabled && !WG.isPluginFeatureEnabled('floatingPanels'))) return;
      let description = policy.describePopupDetailCommand(command);
      if (description && description.textType === 'skill-help' && dialog.curItem === 'master') {
        const match = /^checkskill\s+\S+\s+(\S+)$/.exec(String(command).trim());
        if (match && String(dialog.master.master) === match[1]) description = { ...description, kind: 'skill', expectedDialog: 'master', from: match[1] };
      }
      if (description && (description.kind === 'skill' || description.kind === 'text-detail' ||
          (description.kind === 'pack-item' && (!WG.isPluginFeatureEnabled || WG.isPluginFeatureEnabled('characterPopup'))))) pending = { ...description, owner: dialog.curItem, until: Date.now() + policy.textDetailTimeout };
    }
    function activePending() {
      if (pending && (Date.now() > pending.until || !dialog.isShow || pending.owner !== dialog.curItem || (WG.isPluginFeatureEnabled && !WG.isPluginFeatureEnabled('floatingPanels')))) pending = null;
      return pending;
    }
    const originalSend = host.SendCommand;
    host.SendCommand = function (command) {
      for (const part of (Array.isArray(command) ? command : String(command || '').split(';'))) prepare(part);
      return originalSend.apply(this, arguments);
    };
    host.addEventListener('click', function (event) {
      const target = event.target.closest && event.target.closest('[cmd]');
      if (target) prepare(target.getAttribute('cmd'));
    }, true);
    const originalDesc = dialog.skills.showdesc;
    dialog.skills.showdesc = function (data) {
      if (!this.isShow || data.desc == null || (WG.isPluginFeatureEnabled && !WG.isPluginFeatureEnabled('floatingPanels'))) return originalDesc.apply(this, arguments);
      pending = null;
      open(data, this);
    };
    for (const type of ['dialog', 'item']) {
      const original = host.Process[type];
      if (typeof original !== 'function') continue;
      host.Process[type] = function (data) {
        if (equippedDetail && data.dialog === 'pack' && data.uneq != null) {
          const pack = dialog[equippedDetail.owner];
          const item = pack && pack.eqs && pack.eqs[data.uneq];
          if ((item && String(item.id) === equippedDetail.id) ||
              (data.id != null && String(data.id) === equippedDetail.id)) close();
        }
        const request = activePending();
        const policy = host.WSMudDetailPopupPolicy;
        if (request && policy.matchesDetailPopupData(request, data)) {
          pending = null;
          open(data, request.kind === 'skill' ? dialog[policy.resolveSkillDetailOwnerKind(request, data)] : null, request);
          return;
        }
        return original.apply(this, arguments);
      };
    }
    const originalPush = host.Process.message.push;
    host.Process.message.push = function (message) {
      const request = activePending();
      if (request && request.kind === 'text-detail') {
        const classification = host.WSMudDetailPopupPolicy.classifyDetailText(message);
        if (classification !== 'ignore') pending = null;
        if (classification === 'accept') open({ desc: message }, null);
      }
      return originalPush.apply(this, arguments);
    };
    const originalClose = dialog.close;
    dialog.close = function () { pending = null; close(); return originalClose.apply(this, arguments); };
    host.document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && child && !(host.Confirm && host.Confirm.isShow)) {
        event.preventDefault(); event.stopImmediatePropagation(); close();
      }
    }, true);
    WG.add_hook(['login', 'room'], function () { pending = null; close(); });
  }

  function installOverlayConfirm(host, $) {
    const confirm = host.Confirm;
    if (!confirm || typeof confirm.Show !== 'function') return;
    const originalShow = confirm.Show;
    WGPositionConfirm();
    function WGPositionConfirm() {
      if (!confirm.isShow || !confirm.element) return;
      const floating = host.Dialog.isShow && host.Dialog.element && host.Dialog.element.hasClass('WG_floating_dialog');
      const anchor = floating ? host.Dialog.element : $('.container:visible,.login-content:visible').first();
      if (!anchor.length) return;
      const rect = anchor[0].getBoundingClientRect();
      const inset = floating ? 12 : 0;
      const width = Math.max(1, Math.min(rect.width - inset * 2, host.innerWidth - 20));
      const left = Math.max(10, Math.min(rect.left + inset, host.innerWidth - width - 10));
      confirm.element.addClass('WG_overlay_confirm').toggleClass('WG_skills_confirm', !!floating)
        .css({ '--WG-confirm-left': left + 'px', '--WG-confirm-width': width + 'px' });
      if (floating) {
        const height = confirm.element.outerHeight();
        confirm.element.css({ top: Math.max(10, Math.min(Math.max(rect.top + 54, rect.bottom - height - inset), host.innerHeight - height - 10)) + 'px', bottom: 'auto' });
      } else confirm.element.css({ top: '', bottom: '' });
    }
    host.Dialog.positionSkillsConfirm = WGPositionConfirm;
    confirm.Show = function () {
      const result = originalShow.apply(this, arguments);
      WGPositionConfirm();
      return result;
    };
    host.addEventListener('resize', WGPositionConfirm);
  }

  function installOverlayCommands(host, WG) {
    const original = host.SendCommand;
    function guardedDrop(command) {
      const role = host.Process.player;
      const locks = String(host.GM_getValue(role + '_zdy_item_lock', '') || '').split(',').filter(Boolean);
      if (!locks.length) return original.call(host, command);
      const id = command.trim().split(/\s+/).pop();
      const plain = (name) => host.jQuery('<span>').html(String(name || '')).text().trim().toLowerCase();
      function drop(item) {
        if (locks.some((name) => plain(name) === plain(item.name))) {
          host.ReceiveMessage('<hir>已锁物品' + item.name + '，无法丢弃，请解锁后重试。</hir>');
          return false;
        }
        return original.call(host, command);
      }
      // The picker accessor filters to equipable items; discard applies to all
      // inventory items, so use the complete current-role pack snapshot.
      const items = !WG.dashboardEquipmentAwaitingSnapshot && WG.equipmentPickerHasSnapshot ? WG.equipmentPickerItems : [];
      const cached = (items || []).find((item) => item && String(item.id) === id);
      if (cached) return drop(cached);
      return new Promise(function (resolve) {
        let finished = false, hook, timer, silent;
        function finish(item, cancelled) {
          if (finished) return;
          finished = true;
          WG.remove_hook(hook);
          host.clearTimeout(timer);
          if (silent) {
            host.clearTimeout(silent.timer);
            const index = WG.silentResponseMatchers.indexOf(silent);
            if (index >= 0) WG.silentResponseMatchers.splice(index, 1);
          }
          if (cancelled) return resolve(false);
          if (!item) {
            host.ReceiveMessage('<hir>未能确认物品锁状态，已取消丢弃，请重试。</hir>');
            return resolve(false);
          }
          resolve(drop(item));
        }
        hook = WG.add_hook(['dialog', 'login'], function (data) {
          if (data.type === 'login' || host.Process.player !== role) return finish(null, true);
          if (data.dialog === 'pack' && Array.isArray(data.items)) finish(data.items.find((item) => item && String(item.id) === id));
        });
        timer = host.setTimeout(() => finish(null), 5000);
        if (typeof WG.suppressNextResponse === 'function') silent = WG.suppressNextResponse((data) => data.dialog === 'pack' && Array.isArray(data.items), 5000);
        WG.Send('pack');
      });
    }
    function runRaid(command) {
      if (host.ToRaid && typeof host.ToRaid.perform === 'function') return host.ToRaid.perform(command);
      host.ReceiveMessage('<hir>副本流程尚未加载，请稍后重试。</hir>');
    }
    host.SendCommand = function (command) {
      const text = Array.isArray(command) ? command.join(';') : String(command || '');
      // Native SCRIPT strips # from unknown action names before calling us.
      // These explicit states must be synchronous so its next action cannot
      // race the switch, and must never reach the game server.
      const autoControl = /^#?(stoppfm|startpfm)\s*$/i.exec(text.trim());
      if (autoControl) {
        const enabled = autoControl[1].toLowerCase() === 'startpfm';
        if (Boolean(host.G.auto_preform) !== enabled) WG.auto_preform_switch();
        else {
          WG.auto_preform(enabled ? undefined : 'stop');
          WG.syncAutoAttackUiState();
        }
        return;
      }
      // A late bootstrap follows the SPA's window capture handler. Intercept
      // its synchronous send while the actual click is still being dispatched.
      const event = host.event;
      const button = event && event.type === 'click' && event.target.closest && event.target.closest('.room-commands > .act-item');
      if (button && !WG.actionBarLoadoutReplayActive && typeof WG.runActionBarCommandWithLoadout === 'function') {
        const raw = button.getAttribute('cmd') || '';
        const normalize = (value) => value.trim().replace(/^#wg\s+/i, 'wg ');
        if (normalize(raw) === normalize(text) && WG.runActionBarCommandWithLoadout(raw, function () { host.SendCommand(command); })) return;
      }
      // Original WG's socket bridge routes complete @ scripts to Raid locally.
      if (/^\s*@/.test(text)) return runRaid(text.trim());
      const value = text.trim();
      if (isBinaryHandshake(value)) return original.apply(this, arguments);
      if (/^[_#]/.test(value) && !isBinaryHandshake(value) && !/(?:^|;)\s*#?wg\s+/i.test(text))
        return runOverlayClientCommand(host, host.jQuery, value);
      // Pass the entire legacy sequence to its executor. In particular $wait
      // owns continuation; splitting it here would run the tail too soon.
      if (/(?:^|;)\s*\$/.test(text) && !/(?:^|;)\s*#?wg\s+/i.test(text)) return WG.SendCmd(value);
      if (value === 'sm') return WG.SendCmd('$sm');
      if (value === 'wk') return WG.zdwk();
      if (value === 'backup') return WG.make_config();
      if (value === 'load') return WG.load_config();
      // Native SCRIPT owns variables and continuation for ordinary-first
      // scripts too. Do not split away @npc(...) before its parser sees it.
      if (/(?:^|;)\s*#|\s@\w+(?:\(|\b)/.test(value) &&
          !/(?:^|;)\s*(?:#?wg\s+|@|\$|_)/i.test(value))
        return runOverlayClientCommand(host, host.jQuery, value);
      if (typeof WG.observeDashboardCommand === 'function') WG.observeDashboardCommand(command);
      if (/^drop\s+/.test(value) && !value.includes(';')) return guardedDrop(value);
      if (!/(?:^|;)\s*(?:#?wg\s+|@|[_#]|drop\s+|(?:sm|wk|backup|load)\s*(?:;|$))/.test(text)) return original.apply(this, arguments);
      return (async function () {
        for (const part of text.split(';')) {
          const value = part.trim();
          const action = /^#?wg\s+(\w+)\s*$/i.exec(value);
          const wait = /^#wait\s+(\d+)\s*$/i.exec(value);
          if (action) await WG.runNativeExtensionAction(action[1].toLowerCase());
          else if (/^@/.test(value)) await runRaid(value);
          else if (/^\$/.test(value)) await WG.SendCmd(value);
          else if (wait) await new Promise((resolve) => host.setTimeout(resolve, Number(wait[1])));
          else if (/^#?wg\s+/i.test(value)) host.ReceiveMessage('<hir>WG 命令格式应为：#wg 动作名称。</hir>');
          else if (value) host.SendCommand(value);
        }
      })();
    };
  }

  function installOverlayDungeonEntry(host, WG, $) {
    WG.enterOverlayDungeon = function (name, mode, owner) {
      const plain = (value) => $('<span>').html(value).text().replace(/\([^)]*\)$/, '').trim().replace(/^小树林$/, '树林');
      return new Promise(function (resolve) {
        let finished = false, phase = 'list', timer, removeStop;
        const hooks = [];
        function finish(error, actions = []) {
          if (finished) return;
          finished = true;
          host.clearTimeout(timer);
          hooks.forEach((hook) => WG.remove_hook(hook));
          if (removeStop) removeStop();
          if (error) {
            const buttons = actions.map((action) => $('<span></span>').text(action.name).attr('cmd', action.cmd)[0].outerHTML).join('');
            host.ReceiveMessage('<hir>' + $('<span>').text(error).html() + '</hir>' + (buttons ? '<span class="item-commands">' + buttons + '</span>' : ''));
            if (owner) owner.stop();
          }
          resolve(!error);
        }
        function armTimeout() {
          host.clearTimeout(timer);
          timer = host.setTimeout(function () {
            const reason = phase === 'list' ? '等待副本列表超时：' : phase === 'entry' ? '没有取得副本入场命令：' : '已发送副本入场命令，但未收到入场房间：';
            finish(reason + name + '，流程已停止。');
          }, 8000);
        }
        if (![0, 1, 2].includes(Number(mode))) return finish('副本模式无效：' + mode);
        hooks.push(WG.add_hook('dialog', function (data) {
          if (phase !== 'list' || data.dialog !== 'jh' || !Array.isArray(data.fbs)) return;
          const index = data.fbs.findIndex((item) => plain(typeof item === 'string' ? item : item.name) === plain(name));
          if (index < 0) return finish('当前服务器没有副本：' + name);
          phase = 'entry';
          armTimeout();
          // Let the list packet finish updating the native models first.
          host.queueMicrotask(function () { if (!finished) WG.Send('jh fb ' + index + ' start' + (Number(mode) + 1)); });
        }));
        hooks.push(WG.add_hook('cmds', function (data) {
          if (phase !== 'entry') return;
          const items = Array.isArray(data.items) ? data.items : data.items ? [data.items] : [];
          const entry = items.find(function (item) {
            const match = /^cr\s+(\S+)(?:\s+([012])\s+(\d+))?$/.exec(String(item.cmd || '').trim());
            return match && (match[2] == null ? Number(mode) === 0 : Number(match[2]) === Number(mode) && Number(match[3]) === 0);
          });
          if (!entry) return;
          phase = 'entering';
          armTimeout();
          WG.Send(entry.cmd);
        }));
        hooks.push(WG.add_hook('text', function (data) {
          if (phase !== 'entry' && phase !== 'entering') return;
          const text = $('<span>').html(String(data.msg || '')).text().trim();
          if (/^你正在队伍中[，,\s]*无法进入单人副本/.test(text)) {
            const actions = host.Process.player ? [{ name: '退出队伍', cmd: 'team out ' + host.Process.player }] : [];
            finish(name + '入场被拒绝：' + text + ' 请先退出队伍后重试。', actions);
          }
        }));
        hooks.push(WG.add_hook(['login', 'room'], function (data) {
          if (data.type === 'room' && phase === 'entering') return finish();
          finish('副本入场等待已取消，请重新启动流程。');
        }));
        armTimeout();
        if (owner && typeof owner.onStop === 'function') removeStop = owner.onStop(() => finish());
        if (!finished) WG.Send('jh none');
      });
    };
  }

  function installOverlayCombat(host, WG) {
    let castUntil = 0;
    let recoveryUntil = 0;
    let awaitingUntil = 0;
    function reset() { castUntil = recoveryUntil = awaitingUntil = 0; }
    WG.canSendOverlayPerform = function () {
      return Date.now() >= Math.max(castUntil, recoveryUntil, awaitingUntil);
    };
    const originalFree = WG.is_free;
    WG.is_free = function () { return WG.canSendOverlayPerform() && originalFree.apply(this, arguments); };
    const originalSend = WG.Send;
    WG.Send = function (command) {
      const parts = Array.isArray(command) ? command : String(command || '').split(';');
      for (const part of parts) {
        if (/^\s*perform\s+/i.test(part)) {
          if (!WG.canSendOverlayPerform()) continue;
          // Hold until a cast/cooldown acknowledgement arrives; release on timeout.
          awaitingUntil = Date.now() + 1000;
        }
        originalSend.call(this, part);
      }
    };
    const originalFirstRound = WG.processAutoFirstRound;
    if (originalFirstRound) WG.processAutoFirstRound = function () {
      if (!WG.canSendOverlayPerform()) return true;
      return originalFirstRound.apply(this, arguments);
    };
    WG.add_hook(['perform_cast', 'dispfm', 'clearDistime', 'combat', 'room', 'login', 'die'], function (data) {
      if (data.type === 'login' || data.type === 'room' || (data.type === 'die' && (data.id == null || String(data.id) === String(host.Process.player))) || (data.type === 'combat' && data.end)) return reset();
      if (data.type === 'perform_cast' && String(data.id) === String(host.Process.player)) {
        awaitingUntil = 0;
        castUntil = data.action === 'stop' ? 0 : Date.now() + Math.max(0, Number(data.remaining == null ? data.duration : data.remaining) || 0);
      } else if (data.type === 'dispfm') {
        awaitingUntil = 0;
        if (data.rtime != null) recoveryUntil = Math.max(recoveryUntil, Date.now() + Math.max(0, Number(data.rtime) || 0));
      } else if (data.type === 'clearDistime' && (!data.id || data.id === 'all')) {
        recoveryUntil = awaitingUntil = 0;
      }
    });
  }

  function installOverlayJianghu(host, WG) {
    const jh = host.Dialog.jh;
    const family = jh && jh.footers && jh.footers.find((item) => item.type === 'fam');
    if (!family) return;
    const nativeSelect = family.select;
    for (const model of jh.footers) {
      if (model.select !== nativeSelect) continue;
      model.select = function (index) {
        if (!this.listElement || !this.listElement.length) return;
        const item = this.listElement.find('div[index="' + Number(index) + '"]');
        if (!item.length || item.hasClass('selected')) return;
        let scroller = item[0].parentElement;
        const boundary = this.listElement[0];
        while (scroller && scroller !== boundary && !/^(auto|scroll)$/.test(host.getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
        scroller = scroller || boundary;
        const box = item[0].getBoundingClientRect();
        const top = scroller.getBoundingClientRect().top + scroller.clientTop;
        const bottom = top + scroller.clientHeight;
        if (scroller.clientHeight > 0) {
          if (box.top < top - 1) scroller.scrollTop += box.top - top;
          else if (box.bottom > bottom + 1) scroller.scrollTop += box.bottom - bottom;
        }
        if (this.selectedItem) this.selectedItem.removeClass('selected');
        this.selectedItem = item;
        item.addClass('selected');
        this.selected_index = Number(index);
      };
    }
    const cache = new Map();
    const originalShow = family.show;
    const originalDetail = family.onDetail;
    const originalLoading = family.showLoading;
    family.show = function () {
      for (const item of this.items || []) {
        const saved = cache.get(item.name);
        if (!item.desc && saved) {
          // Render the last result now, while ref=0 keeps the native refresh.
          Object.assign(item, saved, { name: item.name, ref: 0 });
        }
      }
      return originalShow.apply(this, arguments);
    };
    family.onDetail = function () {
      const result = originalDetail.apply(this, arguments);
      for (const item of this.items || []) if (item.desc) cache.set(item.name, { ...item });
      return result;
    };
    family.showLoading = function (item) {
      if (item && item.desc) return this.showDetail(item);
      return originalLoading && originalLoading.apply(this, arguments);
    };
    WG.add_hook('login', function () { cache.clear(); });
  }

  function installFloatingDialogs(host, WG, $) {
    const dialog = host.Dialog;
    if (typeof dialog.activateFloatingDialog === 'function') return;
    const originalLayout = dialog.syncLayout;
    const originalClose = dialog.close;
    let activeItem = null;
    let initialized = false;
    let dragging = null;
    let saveTimer;
    const enabled = () => !WG.isPluginFeatureEnabled || WG.isPluginFeatureEnabled('floatingPanels');
    const key = () => 'WG_floating_dialog_geometry_' + (activeItem || 'default');
    function save() {
      if (!dialog.element || !dialog.element.hasClass('WG_floating_dialog')) return;
      const rect = dialog.element[0].getBoundingClientRect();
      host.localStorage.setItem(key(), JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
    }
    function apply(geometry) {
      const maxWidth = Math.max(1, host.innerWidth - 20);
      const maxHeight = Math.max(1, host.innerHeight - 20);
      const width = Math.max(Math.min(520, maxWidth), Math.min(Number(geometry.width) || 960, maxWidth));
      const height = Math.max(Math.min(360, maxHeight), Math.min(Number(geometry.height) || 720, maxHeight));
      const left = Math.max(10, Math.min(Number(geometry.left) || 10, host.innerWidth - width - 10));
      const top = Math.max(10, Math.min(Number(geometry.top) || 10, host.innerHeight - height - 10));
      dialog.element.css({ left: left, top: top, width: width, height: height, right: 'auto', bottom: 'auto', transform: 'none' });
      if (dialog.positionSkillsConfirm) dialog.positionSkillsConfirm();
    }
    function clamp() {
      if (!dialog.element || !dialog.element.hasClass('WG_floating_dialog')) return;
      apply(dialog.element[0].getBoundingClientRect());
    }
    function init() {
      if (initialized) return;
      initialized = true;
      const header = dialog.element.children('.dialog-header');
      header.on('pointerdown.WG_native_float', function (event) {
        const pointer = event.originalEvent;
        // Capturing a command pointer here would retarget its click to the header.
        if (pointer.button !== 0 || $(event.target).closest('.dialog-close, [cmd], a, button, input, select, textarea, label, [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])').length || !dialog.element.hasClass('WG_floating_dialog')) return;
        const rect = dialog.element[0].getBoundingClientRect();
        dragging = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        this.setPointerCapture(pointer.pointerId);
        event.preventDefault();
      }).on('pointermove.WG_native_float', function (event) {
        const pointer = event.originalEvent;
        if (!dragging || dragging.id !== pointer.pointerId) return;
        apply({ left: dragging.left + pointer.clientX - dragging.x, top: dragging.top + pointer.clientY - dragging.y, width: dragging.width, height: dragging.height });
        event.preventDefault();
      }).on('pointerup.WG_native_float pointercancel.WG_native_float', function () {
        if (!dragging) return;
        dragging = null;
        save();
      });
      if (host.ResizeObserver) {
        new host.ResizeObserver(function () {
          if (!dialog.element.hasClass('WG_floating_dialog')) return;
          clamp();
          host.clearTimeout(saveTimer);
          saveTimer = host.setTimeout(save, 120);
        }).observe(dialog.element[0]);
      }
      host.addEventListener('resize', clamp);
    }
    dialog.activateFloatingDialog = function () {
      if (!this.isShow || !this.element) return;
      if (!enabled()) return this.deactivateFloatingDialog();
      init();
      if (activeItem !== this.curItem || !this.element.hasClass('WG_floating_dialog')) {
        save();
        activeItem = this.curItem;
        this.element.addClass('WG_floating_dialog');
        let geometry;
        try { geometry = JSON.parse(host.localStorage.getItem(key())); } catch (_) {}
        apply(geometry || { width: Math.min(960, host.innerWidth - 32), height: Math.min(720, host.innerHeight - 32), left: 16, top: 16 });
      }
      $('body').removeClass('dialog-side-docked wdww-bottom-docked');
      $('.content-room').removeClass('hide');
    };
    dialog.deactivateFloatingDialog = function () {
      if (!this.element || !this.element.hasClass('WG_floating_dialog')) return;
      save();
      if (host.Confirm && host.Confirm.isShow && host.Confirm.element && host.Confirm.element.hasClass('WG_skills_confirm')) host.Confirm.Close();
      host.clearTimeout(saveTimer);
      dragging = null;
      activeItem = null;
      this.element.removeClass('WG_floating_dialog').css({ left: '', top: '', width: '', height: '', right: '', bottom: '', transform: '' });
      if (this.isShow) originalLayout.call(this);
    };
    dialog.syncLayout = function () {
      if (!enabled()) {
        this.deactivateFloatingDialog();
        return originalLayout.apply(this, arguments);
      }
      return this.activateFloatingDialog();
    };
    dialog.close = function () {
      this.deactivateFloatingDialog();
      return originalClose.apply(this, arguments);
    };
    if (dialog.isShow) dialog.syncLayout();
  }

  const api = {
    isBinaryHandshake: isBinaryHandshake,
    recoverCookieAfterHandshake: recoverCookieAfterHandshake,
    materializeSocketMessage: materializeSocketMessage,
    forwardNativeSocketMessage: forwardNativeSocketMessage,
    install: install,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  global.WSMudNativeClientCompat = api;
  if (typeof window === 'object' && window && window !== global) {
    window.WSMudNativeClientCompat = api;
  }
  if (typeof window === 'object' && window) {
    install(window);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
