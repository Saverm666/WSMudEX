/** Session-local Xiao Wuxiang copies and server-backed effect descriptions. */
(function (global) {
  'use strict';
  const isXiao = id => /^xiaowuxianggong\d*$/.test(String(id || ''));
  const plain = value => String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
  function effectRatio(description) {
    const section = plain(description).split(/【无我[^】]*】/)[1];
    if (!section) return null;
    const match = section.split(/【/)[0].match(/效果是你小无相功等级的\s*(\d+(?:\.\d+)?)%/);
    const value = match && Number(match[1]);
    return value > 0 && value <= 100 ? value : null;
  }
  function createState(catalog, now = Date.now) {
    const state = { records: {}, history: {}, playerId: null, skills: {}, performs: [], pending: null, use: null, epoch: 0 };
    state.reset = function () {
      this.records = {}; this.history = {}; this.playerId = null; this.skills = {}; this.performs = []; this.pending = this.use = null; this.epoch++;
    };
    state.restoreHistory = function (saved) {
      this.history = {};
      if (!Array.isArray(saved)) return;
      for (const item of saved.slice(0, 20)) {
        if (!item || !/^[a-z]+$/.test(item.base || '') || typeof item.moveName !== 'string' ||
            !item.moveName.trim() || item.moveName.length > 200 || !Number.isFinite(item.savedAt)) continue;
        const skillId = typeof item.skillId === 'string' && /^[a-z0-9_]+$/i.test(item.skillId) ? item.skillId : null;
        const moveName = plain(item.moveName);
        if (!moveName) continue;
        this.history[item.base] = { base: item.base, moveName, skillId, savedAt: item.savedAt,
          candidates: (catalog || []).filter(skill => (!skillId || skill.id === skillId) &&
            skill.moves.includes(moveName) && (!skill.bases.length || skill.bases.includes(item.base))) };
      }
    };
    state.savedHistory = function () {
      return Object.values(this.history).map(({ base, moveName, skillId, savedAt }) => ({ base, moveName, skillId, savedAt }));
    };
    state.displayRecords = function () {
      return Object.values({ ...this.history, ...this.records }).map(record => ({ ...record, historical: !this.records[record.base] }));
    };
    state.performLabel = function (id, original) {
      const match = /^([a-z]+)[./]wuwo$/.exec(String(id));
      const record = match && this.records[match[1]];
      return record && /^无我/.test(plain(original)) ? '无我(' + record.moveName + ')' : original;
    };
    state.observe = function (command) {
      for (const part of String(command || '').split(/[;\n]/)) {
        if (/^(?:perform|eq|uneq|eq_group|enable|sk_group)\s/.test(part.trim()) && this.use &&
            part.trim().replace('/', '.') !== 'perform ' + this.use.base + '.wuwo') this.use = null;
        const match = /^perform\s+([a-z]+)[./](duo|wuwo)\s*$/.exec(part.trim());
        if (!match) continue;
        const base = match[1], enabled = this.skills[base] && this.skills[base].enable_skill;
        const perform = this.performs.find(item => item && String(item.id).replace('/', '.') === base + '.' + match[2]);
        if (!isXiao(enabled) && !/^(?:无相|无我)(?:[（(]|$)/.test(plain(perform && perform.name))) continue;
        if (match[2] === 'duo') { this.pending = { base, until: now() + 30000 }; this.use = null; }
        // Only correlate an explicit "no saved copy" failure, never infer a move.
        else { this.pending = null; this.use = { base, until: now() + 5000 }; }
      }
    };
    state.confirm = function (copy) {
      if (!copy || !/^[a-z]+$/.test(copy.base || '') || !plain(copy.moveName)) return false;
      const candidates = (catalog || []).filter(skill => (!copy.skillId || skill.id === copy.skillId) &&
        skill.moves.includes(plain(copy.moveName)) && (!skill.bases.length || skill.bases.includes(copy.base)));
      this.records[copy.base] = { base: copy.base, moveName: plain(copy.moveName), candidates, skillId: copy.skillId || null };
      this.history[copy.base] = { ...this.records[copy.base], savedAt: now() };
      return true;
    };
    state.accept = function (data) {
      if (data.type === 'login') { this.reset(); this.playerId = data.id; return; }
      if (data.type === 'room' || (data.type === 'combat' && data.end) ||
          (data.type === 'die' && (data.id == null || String(data.id) === String(this.playerId)))) this.pending = this.use = null;
      if (data.type === 'dialog' && ((data.dialog === 'pack' && (data.eq != null || data.uneq != null || data.eq_group != null)) ||
          (data.dialog === 'skills' && (data.enable != null || data.sk_group != null)))) this.use = null;
      if (data.type === 'perform' && Array.isArray(data.skills)) this.performs = data.skills;
      if (data.type === 'dialog' && data.dialog === 'skills' && !data.from && !data.master && !data.follower) {
        if (Array.isArray(data.items)) this.skills = Object.fromEntries(data.items.filter(item => item && item.id).map(item => [item.id, { ...item }]));
        if (data.id && this.skills[data.id]) {
          for (const key of ['level', 'enable', 'desc']) if (data[key] != null) {
            this.skills[data.id][key === 'enable' ? 'enable_skill' : key] = data[key];
          }
        }
        if (data.remove) delete this.skills[data.remove];
      }
      if (data.type !== 'text') return;
      const text = plain(data.msg);
      const success = /你学会了绝招【([^】]+)】[，,]\s*可以使用【无我】释放/.exec(text);
      if (success && this.pending && now() <= this.pending.until) {
        this.confirm({ base: this.pending.base, moveName: success[1] }); this.pending = null;
      } else if (/无法模仿|不能模仿|没有这个绝招|最近没有使用绝招/.test(text)) this.pending = null;
      if (/你最近没有模仿并学会任何绝招/.test(text) && this.use && now() <= this.use.until) {
        delete this.records[this.use.base]; delete this.history[this.use.base]; this.use = null;
      } else if (this.use && /^(?:无我还没准备好|【无我】只能|战斗中无法使用【无我】|这里不允许战斗|没有这个技能|你(?:现在(?:正)?手忙脚乱|正在昏迷|的内力不够|使用的武器不对|装备的武器不对|要用绝招对付谁|上个技能还没释放完成))/.test(text)) {
        this.use = null;
      }
    };
    return state;
  }
  const api = { isXiao, plain, effectRatio, createState };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.WSMudMimicSkills = api;
  if (!global.WSMudPlugin) return;
  global.WSMudPlugin.registerFeature('mimic-skills', function ({ WG, G, legacy, jquery: $ }) {
    if (typeof global.MutationObserver !== 'function') return {};
    const state = createState(global.WSMudMimicCatalog || []);
    const kinds = { unarmed: '拳脚', sword: '剑法', blade: '刀法', staff: '杖法', club: '棍法', whip: '鞭法', throwing: '暗器', force: '内功', dodge: '轻功', parry: '招架' };
    let popup = null, request = null, token = 0, queued = false, sendingQuery = false, destroyed = false, returnFocus = null;
    let abandoned = [];
    const ownSnapshots = new WeakSet();
    const originals = new WeakMap();
    let historyRole = null, historyKey = null, historySaved = '';
    function bindHistory(login) {
      const role = login && login.id != null ? String(login.id) : String(G.id || (legacy && legacy.getRoleId()) || '');
      if (!role || role === historyRole && !login) return;
      if (historyRole && role !== historyRole) { state.reset(); close(); }
      historyRole = role;
      state.playerId = role;
      historyKey = 'WG_mimic_history_v1:' + global.location.origin + ':' + role;
      try { state.restoreHistory(GM_getValue(historyKey, [])); } catch (_) { state.restoreHistory([]); }
      historySaved = JSON.stringify(state.savedHistory());
    }
    function saveHistory() {
      if (!historyKey) return;
      const saved = state.savedHistory(), serialized = JSON.stringify(saved);
      if (serialized === historySaved) return;
      try { GM_setValue(historyKey, saved); historySaved = serialized; } catch (_) { /* Storage failure must not break combat handling. */ }
    }
    bindHistory();
    WG.mimicState = state;
    WG.confirmMimicSkill = function (copy) { if (destroyed) return false; bindHistory(); const result = state.confirm(copy); saveHistory(); scheduleRender(); return result; };
    WG.mimicDetailButton = function (id) {
      return !destroyed && isXiao(id) ? '<button type="button" class="WG_mimic_open" data-mimic-skill="' + id + '">模仿详情</button>' : '';
    };
    const previousObserve = WG.observeDashboardCommand;
    function observeCommand(command) {
      if (destroyed) return;
      bindHistory();
      const text = Array.isArray(command) ? command.join(';') : String(command || '');
      if (!sendingQuery && /(?:^|;)\s*checkskill\s/.test(text) && (request || abandoned.length)) {
        token++; cancelRequest(); abandoned = [];
        if (popup) popup.find('.WG_mimic_status').text('已暂停模仿查询，正在查看其他技能');
      }
      state.observe(text);
    }
    const observe = WG.observeDashboardCommand = function (command) {
      observeCommand(command);
      return previousObserve && previousObserve.apply(this, arguments);
    };
    WG.observeMimicCommand = observeCommand;
    WG.mimicOwnsDetailQuery = command => sendingQuery && !!request && request.command === String(command).trim();
    function cancelRequest(message) {
      if (!request) return;
      const current = request; request = null; clearTimeout(current.timer);
      if (current.command.startsWith('checkskill ')) abandoned.push({ matches: current.matches, until: Date.now() + 6000 });
      current.reject(new Error(message || '查询已取消'));
    }
    function close() {
      token++; cancelRequest(); if (popup) popup.remove(); popup = null;
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
    WG.resetMimicSkills = function () { state.reset(); historyRole = historyKey = null; close(); scheduleRender(); };
    function query(command, matches) {
      cancelRequest();
      return new Promise((resolve, reject) => {
        abandoned = abandoned.filter(item => item.until > Date.now());
        if (command.startsWith('checkskill ') && abandoned.length) return reject(new Error('上一查询尚未结束，请稍后刷新'));
        const current = { command, matches, resolve, reject };
        request = current;
        current.timer = setTimeout(() => { if (request === current) cancelRequest('查询超时，请重试'); }, 6000);
        if (command === 'cha' && WG.suppressNextResponse) WG.suppressNextResponse(data => data.dialog === 'skills' && Array.isArray(data.items) && !data.from, 6000);
        try {
          sendingQuery = true;
          if (typeof global.send_cmd === 'function') global.send_cmd(command, true);
          else WG.Send(command);
        } catch (error) { cancelRequest(error.message); }
        finally { sendingQuery = false; }
      });
    }
    const capture = WG.captureMimicResponse = function (data) {
      abandoned = abandoned.filter(item => item.until > Date.now());
      const stale = abandoned.findIndex(item => item.matches(data));
      if (stale >= 0) { abandoned.splice(stale, 1); return true; }
      if (data && request) {
        const current = request;
        if (data.type === 'login') cancelRequest('会话已变化');
        else if (current.matches(data)) {
          request = null; clearTimeout(current.timer); current.resolve(data);
          if (current.command === 'cha') ownSnapshots.add(data);
          if (current.command !== 'cha') return true;
        } else if (data.type === 'text' && /^(没有这个技能|你只能查看|等级.*(?:无效|超出)|技能.*不存在)/.test(plain(data.msg))) {
          cancelRequest('服务器不支持此次技能查询');
        }
      }
      return false;
    };
    function scheduleRender() {
      if (queued || destroyed) return;
      queued = true;
      Promise.resolve().then(() => { queued = false; render(); });
    }
    function render() {
      for (const element of global.document.querySelectorAll('.pfm-item[pid]')) {
        const match = /^([a-z]+)[./]wuwo$/.exec(element.getAttribute('pid'));
        if (!match) continue;
        if (!originals.has(element)) originals.set(element, Array.from(element.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join(''));
        const original = originals.get(element), record = state.records[match[1]];
        if (!/^无我/.test(plain(original))) continue;
        const label = state.performLabel(element.getAttribute('pid'), original);
        let caption = element.querySelector('.WG_mimic_caption');
        if (!caption) {
          for (const node of Array.from(element.childNodes)) if (node.nodeType === 3) node.remove();
          caption = global.document.createElement('span'); caption.className = 'WG_mimic_caption'; element.prepend(caption);
        }
        if (caption.textContent !== label) caption.textContent = label;
        const title = record ? (kinds[match[1]] || match[1]) + ' · ' + record.moveName : plain(original);
        if (element.title !== title) element.title = title;
      }
      for (const row of global.document.querySelectorAll('.WG_plugin_auto_order_item[data-skill-id], .WG_auto_first_round_row[data-skill-id], .WG_auto_first_round_add[data-skill-id]')) {
        const id = row.getAttribute('data-skill-id');
        if (!/^[a-z]+[./]wuwo$/.test(id)) continue;
        const name = row.querySelector('.WG_plugin_auto_order_name,.WG_auto_first_round_name') || row;
        if (!originals.has(name)) originals.set(name, name.textContent);
        const original = originals.get(name), prefix = name === row ? /^\+\s*/.exec(original)?.[0] || '' : '';
        const label = state.performLabel(id, original.slice(prefix.length));
        if (name.textContent !== prefix + label) name.textContent = prefix + label;
        if (row.classList.contains('WG_plugin_auto_order_item')) {
          const description = '拖动调整' + label + '的顺序';
          if (row.getAttribute('aria-label') !== description) row.setAttribute('aria-label', description);
        }
        const handle = row.querySelector('.WG_auto_first_round_drag_handle'), remove = row.querySelector('.WG_auto_first_round_remove');
        if (handle) {
          const description = '拖动调整' + label + '的顺序；键盘可使用上下方向键';
          if (handle.getAttribute('aria-label') !== description) handle.setAttribute('aria-label', description);
        }
        if (remove && remove.getAttribute('aria-label') !== '移除' + label) remove.setAttribute('aria-label', '移除' + label);
      }
      for (const toggle of global.document.querySelectorAll('[data-plugin-setting-kind="nativeAutoSkill"],[data-plugin-setting-kind="autoSkill"]')) {
        const id = toggle.getAttribute('data-plugin-setting-id');
        if (!/^[a-z]+[./]wuwo$/.test(id)) continue;
        const name = toggle.closest('.WG_plugin_settings_row')?.querySelector('.WG_plugin_settings_name');
        if (!name) continue;
        if (!originals.has(name)) originals.set(name, name.textContent);
        const label = state.performLabel(id, originals.get(name));
        if (name.textContent !== label) name.textContent = label;
        if (toggle.getAttribute('aria-label') !== label) toggle.setAttribute('aria-label', label);
      }
      const dialog = typeof Dialog !== 'undefined' ? Dialog : global.Dialog;
      const owner = dialog && dialog.skills;
      if (!destroyed && owner && owner.element && owner.isShow) {
        owner.element.find('.skill-item[skid]').each(function () {
          if (!isXiao(this.getAttribute('skid'))) return;
          const actions = this.nextElementSibling;
          if (actions && actions.classList.contains('item-commands') && !actions.querySelector('.WG_mimic_open')) $(actions).append(WG.mimicDetailButton(this.getAttribute('skid')));
        });
      }
    }
    const observer = new global.MutationObserver(scheduleRender);
    observer.observe(global.document.body, { childList: true, subtree: true });
    const hook = WG.add_hook(['login', 'dialog', 'perform', 'text', 'room', 'combat', 'die'], data => {
      if (data.type !== 'login') bindHistory();
      const fullSkillChange = data.dialog === 'skills' && Array.isArray(data.items) && !ownSnapshots.has(data) &&
        data.items.some(item => item && (isXiao(item.id) || state.records[item.id]) && state.skills[item.id] &&
          (Number(state.skills[item.id].level) !== Number(item.level) || state.skills[item.id].enable_skill !== item.enable_skill));
      state.accept(data);
      if (data.type === 'login') { bindHistory(data); close(); }
      else if (popup && data.type === 'dialog' &&
        ((data.dialog === 'pack' && (data.eq != null || data.uneq != null || data.eq_group != null)) ||
         (data.dialog === 'skills' && ((data.remove && isXiao(data.remove)) || fullSkillChange ||
           (!data.items && (data.enable != null || data.level != null || data.sk_group != null)))))) {
        token++; cancelRequest('等级数据已变化，请刷新确认');
        popup.find('.WG_mimic_status').text('等级数据已变化，请刷新确认');
        popup.find('.WG_mimic_results').empty();
      }
      saveHistory();
      scheduleRender();
    });
    function descriptionMatch(id, name) {
      return data => (data.dialog === 'skills' && String(data.id) === id && typeof data.desc === 'string') ||
        (data.type === 'text' && plain(data.msg).split(/\r?\n/)[0] === plain(name));
    }
    function recordHeading(body, record) {
      const section = $('<section class="WG_mimic_result"></section>').appendTo(body);
      $('<h3></h3>').text((kinds[record.base] || record.base) + ' · ' + record.moveName).appendTo(section);
      if (record.historical) $('<p class="WG_mimic_history"></p>').text('历史记录，当前服务器状态未确认。记录时间：' + new Date(record.savedAt).toLocaleString() + '。以下仅为该招式按当前等级计算的参考效果。').appendTo(section);
      else $('<p></p>').text('本次会话已确认').appendTo(section);
      return section;
    }
    async function loadDetails(skillId) {
      const version = ++token, surface = popup;
      const status = surface.find('.WG_mimic_status').text('正在读取技能信息…');
      const body = surface.find('.WG_mimic_results').empty();
      for (const record of state.displayRecords()) $('<p></p>').text('生效等级待确认：正在读取当前等级').appendTo(recordHeading(body, record));
      const active = () => popup === surface && token === version;
      try {
        const snapshot = await query('cha', data => data.dialog === 'skills' && Array.isArray(data.items) && !data.from && !data.master && !data.follower);
        if (!active()) return;
        const own = snapshot.items.find(item => item.id === skillId);
        if (!own || !Number.isSafeInteger(Number(own.level)) || !(Number(own.level) > 0)) throw new Error('生效等级待确认：未读取到当前小无相功等级');
        const ownDesc = await query('checkskill ' + skillId, descriptionMatch(skillId, plain(own.name)));
        if (!active()) return;
        const ratio = effectRatio(ownDesc.desc || ownDesc.msg);
        if (ratio == null) throw new Error('生效等级待确认：当前服务器未提供可识别的无我效果比例');
        const level = Math.floor(Number(own.level) * ratio / 100);
        status.text('所选小无相功 ' + own.level + ' 级；无我按当前各栏位装备计算');
        const effects = new Map([[skillId, { level, sourceLevel: own.level, ratio, description: ownDesc.desc || ownDesc.msg }]]);
        const records = state.displayRecords();
        body.empty();
        if (!records.length) { $('<p></p>').text('暂无已确认的模仿记录').appendTo(body); return; }
        for (const record of records) {
          if (!active()) return;
          const section = recordHeading(body, record);
          const enabled = snapshot.items.find(item => item.id === record.base)?.enable_skill;
          if (!isXiao(enabled)) {
            $('<p></p>').text('该栏位当前未装备小无相功，生效等级待确认').appendTo(section);
            continue;
          }
          if (!effects.has(enabled)) {
            const current = snapshot.items.find(item => item.id === enabled);
            if (!current || !Number.isSafeInteger(Number(current.level)) || !(Number(current.level) > 0)) {
              $('<p></p>').text('生效等级待确认：缺少当前装备的小无相功等级').appendTo(section); continue;
            }
            const response = await query('checkskill ' + enabled, descriptionMatch(enabled, plain(current.name)));
            if (!active()) return;
            const currentRatio = effectRatio(response.desc || response.msg);
            if (currentRatio == null) { $('<p></p>').text('生效等级待确认：当前版本效果比例未知').appendTo(section); continue; }
            effects.set(enabled, { level: Math.floor(Number(current.level) * currentRatio / 100), sourceLevel: current.level, ratio: currentRatio, description: response.desc || response.msg });
          }
          const effect = effects.get(enabled);
          const effectLevel = effect.level;
          $('<p class="WG_mimic_level"></p>').text('小无相功 ' + effect.sourceLevel + ' 级 × ' + effect.ratio + '%，' + (record.historical ? '若该记录仍有效，无我生效等级：' : '无我生效等级：') + effectLevel + ' 级').appendTo(section);
          const ownSection = plain(effect.description).split(/(?=【)/).find(part => /^【无我[^】]*】/.test(part));
          if (ownSection) $('<details><summary>无我自身说明</summary><pre></pre></details>').find('pre').text(ownSection).end().appendTo(section);
          if (record.candidates.length !== 1) {
            $('<p></p>').text(record.candidates.length ? '同名招式，所属武功尚未唯一确认' : '尚未找到可确认的所属武功').appendTo(section);
          }
          const choices = record.candidates.slice();
          if (record.skillId && !choices.length) choices.push({ id: record.skillId, name: record.skillId });
          if (!choices.length) continue;
          for (const candidate of choices) {
            const label = $('<p></p>').text(candidate.name + (choices.length > 1 ? '（候选）' : '')).appendTo(section);
            if (!(effectLevel > 0 && effectLevel < 3000)) { $('<p></p>').text('当前协议未确认支持该等级的精确查询，不显示默认等级详情').appendTo(section); continue; }
            let result;
            try { result = await query('checkskill ' + candidate.id + ' ' + effectLevel, descriptionMatch(candidate.id, candidate.name)); }
            catch (error) {
              if (!active()) return;
              $('<p></p>').text(error.message).appendTo(section);
              continue;
            }
            if (!active()) return;
            const description = plain(result.desc || result.msg);
            const fragments = description.split(/(?=【)/);
            const move = fragments.find(part => part.startsWith('【' + record.moveName + '】'));
            if (!move) { $('<p></p>').text('服务器详情未找到对应招式，暂不展示推测效果').appendTo(section); continue; }
            $('<pre class="WG_mimic_effect"></pre>').text(move).insertAfter(label);
          }
        }
        if (active()) $('<p class="WG_mimic_notice"></p>').text('以上为模仿招式在该等级的效果；原招耗内、前摇、冷却不代表无我实际施放参数。').appendTo(body);
      } catch (error) { if (active()) status.text(error.message); }
    }
    WG.openMimicDetails = function (id) {
      if (destroyed || !isXiao(id)) return;
      bindHistory();
      const focus = popup ? returnFocus : global.document.activeElement;
      close();
      returnFocus = focus;
      const dialog = typeof Dialog !== 'undefined' ? Dialog : global.Dialog;
      const anchor = focus && focus.isConnected && focus.closest('.WG_item_popup_dialog,.dialog') || dialog && dialog.element && dialog.element[0] || global.document.body;
      const appearance = global.getComputedStyle(anchor);
      popup = $('<section class="WG_item_popup_dialog WG_mimic_dialog" role="dialog" aria-label="模仿详情"></section>')
        .css({ fontSize: appearance.fontSize, fontFamily: appearance.fontFamily, color: appearance.color }).appendTo(global.document.body);
      const header = $('<header class="WG_item_popup_header"><span class="WG_item_popup_title">模仿详情</span><button class="WG_item_popup_close" type="button" aria-label="关闭">×</button></header>').appendTo(popup);
      header.find('button').on('click', close);
      header.find('button')[0].focus({ preventScroll: true });
      $('<div class="WG_item_popup_body"><p class="WG_mimic_status" role="status"></p><div class="WG_mimic_results"></div></div>').appendTo(popup);
      if (!Object.keys(state.records).length) popup.find('.WG_mimic_results').text('尚未确认本次登录后的模仿结果');
      const footer = $('<footer class="WG_mimic_footer"></footer>').appendTo(popup);
      $('<button type="button" class="WG_mimic_retry" title="刷新" aria-label="刷新">&#8635;</button>').on('click', () => loadDetails(id)).appendTo(footer);
      let drag = null;
      header.on('pointerdown', function (event) {
        const pointer = event.originalEvent;
        if (pointer.button !== 0 || event.target.closest('button')) return;
        const rect = popup[0].getBoundingClientRect();
        drag = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, left: rect.left, top: rect.top };
        this.setPointerCapture(pointer.pointerId);
        header.addClass('WG_dragging'); event.preventDefault();
      }).on('pointermove', function (event) {
        const pointer = event.originalEvent;
        if (!drag || pointer.pointerId !== drag.id || !popup) return;
        const rect = popup[0].getBoundingClientRect();
        popup.css({ transform: 'none', left: Math.max(10, Math.min(drag.left + pointer.clientX - drag.x, global.innerWidth - rect.width - 10)),
          top: Math.max(10, Math.min(drag.top + pointer.clientY - drag.y, global.innerHeight - rect.height - 10)) });
      }).on('pointerup pointercancel', function () { drag = null; header.removeClass('WG_dragging'); });
      loadDetails(id);
    };
    function click(event) {
      const button = event.target.closest && event.target.closest('.WG_mimic_open');
      if (button) { event.preventDefault(); event.stopImmediatePropagation(); WG.openMimicDetails(button.getAttribute('data-mimic-skill')); }
      else {
        const perform = event.target.closest && event.target.closest('.pfm-item[pid], [cmd]');
        if (perform) {
          const command = perform.hasAttribute('pid') ? 'perform ' + perform.getAttribute('pid') : perform.getAttribute('cmd');
          if (/^checkskill\s/.test(command) && (request || abandoned.length)) {
            // Ordinary skill views keep ownership of their own replies.
            token++; cancelRequest(); abandoned = [];
            if (popup) popup.find('.WG_mimic_status').text('已暂停模仿查询，正在查看其他技能');
          }
          state.observe(command);
        }
      }
    }
    function key(event) { if (event.key === 'Escape' && popup && !(global.Confirm && global.Confirm.isShow)) { event.preventDefault(); event.stopImmediatePropagation(); close(); } }
    function fitPopup() {
      if (!popup) return;
      const rect = popup[0].getBoundingClientRect();
      popup.css({ transform: 'none', left: Math.max(10, Math.min(rect.left, global.innerWidth - rect.width - 10)),
        top: Math.max(10, Math.min(rect.top, global.innerHeight - rect.height - 10)) });
    }
    global.addEventListener('click', click, true);
    global.addEventListener('keydown', key, true);
    global.addEventListener('resize', fitPopup);
    return { destroy() {
      destroyed = true;
      close(); observer.disconnect(); WG.remove_hook(hook);
      if (WG.captureMimicResponse === capture) delete WG.captureMimicResponse;
      if (WG.observeDashboardCommand === observe) WG.observeDashboardCommand = previousObserve;
      state.reset(); render();
      global.document.querySelectorAll('.WG_mimic_open').forEach(element => element.remove());
      global.removeEventListener('click', click, true); global.removeEventListener('keydown', key, true);
      global.removeEventListener('resize', fitPopup);
    } };
  });
})(typeof window === 'object' ? window : globalThis);
