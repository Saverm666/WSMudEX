/** Decode wxmud1 binary WebSocket frames into the original JSON protocol. */
(function registerBinaryProtocol(global) {
  'use strict';

  const MAGIC = 17;
  const VALUE_NULL = 0;
  const VALUE_FALSE = 1;
  const VALUE_TRUE = 2;
  const VALUE_INT = 3;
  const VALUE_FLOAT = 4;
  const VALUE_STRING = 5;
  const VALUE_ARRAY = 6;
  const VALUE_OBJECT = 7;
  const decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;

  const packFields =
    'id.remove.money.name.count.grade.unit.can_eq.can_use.can_study.can_open.can_combine.is_lock.is_locked.locked.xianbing.otype.value.items.eqs.max_item_count.eq_group.eq.uneq.jldesc.xqdesc.stones.desc.from.commands.time'.split(
      '.',
    );
  const skillFields =
    'id.remove.item.items.books.book.grade.level.exp.enable.can_enables.enable_skill.from.limit.pot.title.sk_group.desc.master.follower.target.is_custom.custom_attachable.custom_attached.custom_attach_options.custom_attach_all_available'.split(
      '.',
    );
  const scoreFields =
    'id.name.age.family.master.gender.level.hp_label.mp_label.limit_mp_label.law_visible.hp.mp.max_hp.max_mp.str.con.dex.int.kar.gj.fy.mz.zj.exp.pot.ds.per.str_add.str1_add.con_add.con1_add.dex_add.dex1_add.int_add.int1_add.limit_mp.add_sh.diff_fy.add_bj.diff_sh.diff_bj.releasetime.busy.diff_busy.distime.expend_mp.dazuo_per.study_per.lianxi_per.study_speed.lianxi_speed.husband.wife.shitu.fls.law_panel.law_state.law_route.law_stage.law_core.law_style.law_progress.law_remaining.law_duration.law_desc.law_effect.law_commands.avatar_frames.avatar_frame_id.avatar_frame_name.avatar_frame_style.titles.idx.footers.mtype.mtypes.top.sc.score.st.fam.notice.online_count.xianlian.xianmeng_joined.xianmeng_name.xianmeng_max_members.xianmeng_role.xianmeng_title.xianmeng_build'.split(
      '.',
    );

  const messageTypes = [
    { id: 1, type: 'sc', dialog: '', fields: ['id', 'hp', 'max_hp', 'mp', 'max_mp', 'damage'] },
    {
      id: 2,
      type: 'status',
      dialog: '',
      fields: ['action', 'id', 'sid', 'name', 'duration', 'overtime', 'count', 'downside', 'color', 'items'],
    },
    { id: 3, type: 'dialog', dialog: 'pack', fields: packFields },
    { id: 4, type: 'perform', dialog: '', fields: ['skills'] },
    { id: 5, type: 'dispfm', dialog: '', fields: ['id', 'rtime', 'distime'] },
    { id: 6, type: 'changepfm', dialog: '', fields: ['id', 'time'] },
    { id: 7, type: 'clearDistime', dialog: '', fields: ['id'] },
    { id: 8, type: 'actions', dialog: '', fields: ['actions', 'skills'] },
    { id: 9, type: 'room', dialog: '', fields: ['path', 'name', 'desc', 'is_fb', 'commands'] },
    { id: 10, type: 'items', dialog: '', fields: ['items'] },
    {
      id: 11,
      type: 'itemadd',
      dialog: '',
      fields: [
        'id',
        'name',
        'p',
        'title',
        'level',
        'count',
        'hp',
        'max_hp',
        'mp',
        'max_mp',
        'commands',
        'desc',
        'me',
        'm',
        'f',
        'l',
        'o',
        'status',
        'name_frame',
        'nameFrame',
        'frame',
        'name_frame_allowed',
        'nameFrameAllowed',
      ],
    },
    { id: 12, type: 'itemremove', dialog: '', fields: ['id'] },
    {
      id: 13,
      type: 'exits',
      dialog: '',
      fields: [
        'items',
        'west',
        'north',
        'south',
        'east',
        'northwest',
        'southwest',
        'northeast',
        'southeast',
        'down',
        'up',
        'westdown',
        'northdown',
        'southdown',
        'eastdown',
        'westup',
        'northup',
        'southup',
        'eastup',
        'enter',
        'out',
      ],
    },
    { id: 14, type: 'item', dialog: '', fields: ['id', 'name', 'desc', 'commands', 'me'] },
    { id: 15, type: 'cmds', dialog: '', fields: ['items'] },
    { id: 16, type: 'map', dialog: '', fields: ['path', 'map', 'maps', 'focus', 'open'] },
    { id: 17, type: 'updatemap', dialog: '', fields: ['map', 'id', 'n', 'pos'] },
    { id: 18, type: 'disobj', dialog: '', fields: ['id', 'act', 'remove', 'time', 'count'] },
    { id: 19, type: 'combat', dialog: '', fields: ['start', 'end'] },
    { id: 20, type: 'state', dialog: '', fields: ['state', 'no_stop', 'desc', 'commands', 'interval'] },
    { id: 21, type: 'die', dialog: '', fields: ['commands', 'relive'] },
    { id: 22, type: 'warn', dialog: '', fields: ['content', 'cmds', 'time'] },
    {
      id: 23,
      type: 'msg',
      dialog: '',
      fields: ['ch', 'content', 'fam', 'name', 'uid', 'server', 'lv', 'lv6', 'channel_color', 'channel_name'],
    },
    { id: 24, type: 'levelup', dialog: '', fields: ['level'] },
    { id: 25, type: 'addAction', dialog: '', fields: ['id', 'name'] },
    { id: 26, type: 'removeAction', dialog: '', fields: ['id'] },
    { id: 27, type: 'setting', dialog: '', fields: ['items'] },
    { id: 28, type: 'dialog', dialog: 'pack2', fields: packFields },
    { id: 29, type: 'dialog', dialog: 'skills', fields: skillFields },
    { id: 30, type: 'dialog', dialog: 'master', fields: skillFields },
    {
      id: 31,
      type: 'dialog',
      dialog: 'list',
      fields: [
        'id',
        'sell',
        'store',
        'stores',
        'selllist',
        'storeid',
        'money',
        'gongji',
        'max_store_count',
        'store_count',
        'remove',
      ],
    },
    {
      id: 32,
      type: 'dialog',
      dialog: 'jh',
      fields: [
        'close',
        'unlock',
        'unlock2',
        't',
        'refresh',
        'index',
        'id',
        'desc',
        'sp',
        'actions',
        'skills',
        'records',
        'families',
        'activities',
        'areas',
        'fbs',
        'mijings',
        'lingshou_open',
        'lingshou',
      ],
    },
    { id: 33, type: 'dialog', dialog: 'shop', fields: ['money', 'item', 'remove', 'selllist'] },
    { id: 34, type: 'dialog', dialog: 'team', fields: ['items', 'remove', 'dismiss'] },
    {
      id: 35,
      type: 'dialog',
      dialog: 'stats',
      fields: ['items', 'scores', 'tops', 'weapons', 'time', 'st', 'fam', 'close'],
    },
    { id: 36, type: 'dialog', dialog: 'events', fields: ['items', 'close'] },
    {
      id: 37,
      type: 'dialog',
      dialog: 'message',
      fields: ['clear', 'items', 'from', 'content', 'receive', 'index', 'message', 'messages', 'unRead', 'msg'],
    },
    { id: 38, type: 'dialog', dialog: 'score', fields: scoreFields },
    {
      id: 39,
      type: 'dialog',
      dialog: 'party',
      fields: [
        'list',
        'items',
        'item',
        'notice',
        'online_count',
        'pid',
        'result',
        'message',
        'close',
        'clear',
        'money',
        'score',
        'sc',
        'idx',
        'top',
        'roles',
        'shitu',
        'husband',
        'wife',
      ],
    },
    { id: 40, type: 'dialog', dialog: 'trade', fields: ['target', 'name'] },
    { id: 41, type: 'login', dialog: '', fields: ['id', 'level', 'setting'] },
    { id: 42, type: 'roles', dialog: '', fields: ['roles'] },
    { id: 43, type: 'loginerror', dialog: '', fields: ['msg'] },
    { id: 44, type: 'regist', dialog: '', fields: ['result'] },
    { id: 45, type: 'emote', dialog: '', fields: ['items'] },
    { id: 46, type: 'deleterole', dialog: '', fields: ['id', 'result', 'message'] },
    { id: 47, type: 'cross', dialog: '', fields: ['sid', 'pid', 'cross_type'] },
    { id: 48, type: 'pay', dialog: '', fields: ['pay', 'url'] },
    { id: 49, type: 'dialog', dialog: 'tasks', fields: ['items', 'id', 'state', 'title', 'desc'] },
    { id: 50, type: 'dialog', dialog: 'relation', fields: ['shitu', 'husband', 'wife', 'fls'] },
    { id: 51, type: 'dialog', dialog: 'pm', fields: ['list', 'item'] },
  ];

  function fail() {
    return { ok: false, value: null };
  }

  function ok(value) {
    return { ok: true, value: value };
  }

  function BinaryReader(bytes) {
    this.bytes = bytes;
    this.index = 0;
  }

  BinaryReader.prototype.readByte = function () {
    if (this.index >= this.bytes.length) return null;
    const value = this.bytes[this.index];
    this.index += 1;
    return value === undefined ? null : value;
  };

  BinaryReader.prototype.readBytes = function (count) {
    if (count < 0 || this.index + count > this.bytes.length) return null;
    const slice = this.bytes.slice(this.index, this.index + count);
    this.index += count;
    return slice;
  };

  BinaryReader.prototype.readVarUint = function () {
    let value = 0;
    let shift = 1;
    for (let index = 0; index < 5; index += 1) {
      const byte = this.readByte();
      if (byte === null) return null;
      value += (byte & 127) * shift;
      if (!(byte & 128)) return value;
      shift *= 128;
    }
    return null;
  };

  BinaryReader.prototype.readInt = function () {
    const value = this.readVarUint();
    if (value === null) return null;
    return value % 2 === 0 ? value / 2 : -((value + 1) / 2);
  };

  BinaryReader.prototype.readFloat = function () {
    const bytes = this.readBytes(8);
    if (!bytes) return null;
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat64(0, true);
  };

  BinaryReader.prototype.readString = function () {
    const length = this.readVarUint();
    if (length === null) return null;
    const bytes = this.readBytes(length);
    if (!bytes || !decoder) return null;
    return decoder.decode(bytes);
  };

  BinaryReader.prototype.done = function () {
    return this.index === this.bytes.length;
  };

  function findType(id) {
    for (let index = 0; index < messageTypes.length; index += 1) {
      const entry = messageTypes[index];
      if (entry && entry.id === id) return entry;
    }
    return null;
  }

  function isSkillListField(type, field) {
    return (type.type === 'perform' || type.type === 'actions') && field === 'skills';
  }

  function isCommandListField(type, field) {
    return (
      (type.type === 'actions' && field === 'actions') ||
      ((type.type === 'room' ||
        type.type === 'itemadd' ||
        type.type === 'item' ||
        type.type === 'state' ||
        type.type === 'die') &&
        field === 'commands') ||
      (type.type === 'cmds' && field === 'items') ||
      (type.type === 'warn' && field === 'cmds')
    );
  }

  function readSkillList(reader) {
    const count = reader.readVarUint();
    if (count === null) return fail();
    const items = [];
    for (let index = 0; index < count; index += 1) {
      const id = reader.readString();
      const name = reader.readString();
      const flags = reader.readByte();
      if (id === null || name === null || flags === null || flags & -2) return fail();
      const item = { id: id, name: name };
      if (flags & 1) {
        const distime = readValue(reader);
        if (!distime.ok || typeof distime.value !== 'number') return fail();
        item.distime = distime.value;
      }
      items.push(item);
    }
    return ok(items);
  }

  function readCommandList(reader) {
    const count = reader.readVarUint();
    if (count === null) return fail();
    const items = [];
    for (let index = 0; index < count; index += 1) {
      const cmd = reader.readString();
      const name = reader.readString();
      const flags = reader.readByte();
      if (cmd === null || name === null || flags === null || flags & -8) return fail();
      const item = { cmd: cmd, name: name };
      if (flags & 1) {
        const distime = readValue(reader);
        if (!distime.ok || typeof distime.value !== 'number') return fail();
        item.distime = distime.value;
      }
      if (flags & 2) {
        const disper = readValue(reader);
        if (!disper.ok || typeof disper.value !== 'number') return fail();
        item.disper = disper.value;
      }
      if (flags & 4) {
        const extend = reader.readByte();
        if (extend !== 0 && extend !== 1) return fail();
        item.extend = extend === 1;
      }
      items.push(item);
    }
    return ok(items);
  }

  function readArray(reader) {
    const count = reader.readVarUint();
    if (count === null) return fail();
    const items = [];
    for (let index = 0; index < count; index += 1) {
      const item = readValue(reader);
      if (!item.ok) return fail();
      items.push(item.value);
    }
    return ok(items);
  }

  function readObject(reader) {
    const count = reader.readVarUint();
    if (count === null) return fail();
    const object = {};
    for (let index = 0; index < count; index += 1) {
      const key = reader.readString();
      if (key === null) return fail();
      const item = readValue(reader);
      if (!item.ok) return fail();
      object[key] = item.value;
    }
    return ok(object);
  }

  function readValue(reader) {
    const tag = reader.readByte();
    if (tag === null) return fail();
    switch (tag) {
      case VALUE_NULL:
        return ok(null);
      case VALUE_FALSE:
        return ok(false);
      case VALUE_TRUE:
        return ok(true);
      case VALUE_INT: {
        const value = reader.readInt();
        return value === null ? fail() : ok(value);
      }
      case VALUE_FLOAT: {
        const value = reader.readFloat();
        return value === null ? fail() : ok(value);
      }
      case VALUE_STRING: {
        const value = reader.readString();
        return value === null ? fail() : ok(value);
      }
      case VALUE_ARRAY:
        return readArray(reader);
      case VALUE_OBJECT:
        return readObject(reader);
      default:
        return fail();
    }
  }

  function readField(reader, type, field) {
    if (isSkillListField(type, field)) return readSkillList(reader);
    if (isCommandListField(type, field)) return readCommandList(reader);
    return readValue(reader);
  }

  function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return null;
  }

  function decodeBinaryMessage(input) {
    const bytes = toBytes(input);
    if (!bytes) return null;
    const reader = new BinaryReader(bytes);
    if (reader.readByte() !== MAGIC) return null;
    const typeId = reader.readVarUint();
    if (typeId === null) return null;
    const type = findType(typeId);
    if (!type) return null;
    const fieldCount = reader.readVarUint();
    if (fieldCount === null) return null;
    const message = { type: type.type };
    if (type.dialog) message.dialog = type.dialog;
    const seen = [];
    for (let index = 0; index < fieldCount; index += 1) {
      const encodedIndex = reader.readVarUint();
      if (encodedIndex === null || encodedIndex < 1) return null;
      const fieldIndex = encodedIndex - 1;
      const field = type.fields[fieldIndex];
      if (!field || seen[fieldIndex]) return null;
      const value = readField(reader, type, field);
      if (!value.ok) return null;
      message[field] = value.value;
      seen[fieldIndex] = true;
    }
    return reader.done() ? message : null;
  }

  const api = {
    decodeBinaryMessage: decodeBinaryMessage,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  global.WSMudBinaryProtocol = api;
  if (typeof window === 'object' && window && window !== global) {
    window.WSMudBinaryProtocol = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
