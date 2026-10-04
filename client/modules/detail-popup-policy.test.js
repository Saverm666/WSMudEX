import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const policy = require('./detail-popup-policy.js');

test('recognizes own and master skill detail commands', () => {
  assert.deepEqual(policy.describePopupDetailCommand('checkskill force'), {
    command: 'checkskill force',
    kind: 'skill',
    id: 'force',
    expectedDialog: 'skills',
  });
  assert.equal(
    policy.describePopupDetailCommand('checkskill force master_1').expectedDialog,
    'master',
  );
});

test('treats jianghu skill help and loot look3 as text details, not master skills', () => {
  const help = policy.describePopupDetailCommand('checkskill unarmed help');
  assert.equal(help.kind, 'text-detail');
  assert.equal(help.textType, 'skill-help');
  assert.equal(help.id, 'unarmed');
  assert.equal(help.expectedDialog, undefined);

  const loot = policy.describePopupDetailCommand('look3 3 of fb_12');
  assert.equal(loot.kind, 'text-detail');
  assert.equal(loot.textType, 'jianghu-loot');
  assert.equal(loot.id, 'fb_12#3');
});

test('does not treat ordinary look or player look3 as detail popups', () => {
  assert.equal(policy.describePopupDetailCommand('look npc_1'), null);
  assert.equal(policy.describePopupDetailCommand('look3 playerid'), null);
  assert.equal(policy.describePopupDetailCommand('look3 body of playerid'), null);
  assert.equal(policy.describePopupDetailCommand('use pill_1'), null);
});

test('skill structured matching requires id and description, ignoring level-up packets', () => {
  const pending = {
    kind: 'skill',
    id: 'force',
    expectedDialog: 'skills',
  };
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      id: 'force',
      desc: '内功详解',
    }),
    true,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      id: 'force',
      level: 120,
      exp: 40,
    }),
    false,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      id: 'unarmed',
      desc: '别的技能',
    }),
    false,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      desc: '没有技能 id 的详情',
    }),
    false,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'master',
      id: 'force',
      desc: '师父同名技能',
    }),
    false,
  );
});

test('master skill details match live checkskill packets that still use dialog=skills', () => {
  const pending = {
    kind: 'skill',
    id: 'force',
    expectedDialog: 'master',
    from: 'master_1',
  };
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      id: 'force',
      desc: '师父内功详解',
    }),
    true,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'master',
      id: 'force',
      desc: '师父内功详解',
    }),
    true,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      id: 'unarmed',
      desc: '别的技能',
    }),
    false,
  );
  assert.equal(policy.resolveSkillDetailOwnerKind(pending, { dialog: 'skills' }), 'master');
  assert.equal(
    policy.resolveSkillDetailOwnerKind(
      { kind: 'skill', expectedDialog: 'skills' },
      { dialog: 'skills' },
    ),
    'skills',
  );
});

test('skill help pending does not consume a different skill detail dialog', () => {
  const pending = policy.describePopupDetailCommand('checkskill unarmed help');
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'skills',
      id: 'force',
      desc: '正在升级的技能',
    }),
    false,
  );
  assert.equal(
    policy.matchesDetailPopupData(pending, {
      dialog: 'master',
      desc: '误判为师父技能的帮助文本',
    }),
    false,
  );
});

test('ignores breakthrough and skill-level text so they stay in the info bar', () => {
  assert.equal(
    policy.classifyDetailText('<hiy>你的基本拳脚等级提升了！</hiy>'),
    'ignore',
  );
  assert.equal(policy.classifyDetailText('你吞下一粒突破丹。'), 'ignore');
  assert.equal(policy.classifyDetailText('你的潜能不够，好像没什么效果。'), 'ignore');
  assert.equal(policy.classifyDetailText('没有这个技能。'), 'error');
  assert.equal(policy.classifyDetailText('没有这件装备。'), 'error');
});

test('ignores practice and study status text even when it has color tags', () => {
  assert.equal(
    policy.classifyDetailText('你对<wht>基本拳脚</wht>似乎有些心得。'),
    'ignore',
  );
  assert.equal(
    policy.classifyDetailText('<hic>你开始练习<wht>基本拳脚</wht>。</hic>'),
    'ignore',
  );
  assert.equal(
    policy.classifyDetailText(
      '你正在练习<wht>基本拳脚</wht>到200级，当前练习速度120\n<hic>预计耗时10分钟练习完成</hic>',
    ),
    'ignore',
  );
  assert.equal(
    policy.classifyDetailText('<hic>你开始认真研读<hiy>基本内功</hiy>。</hic>'),
    'ignore',
  );
  assert.equal(
    policy.classifyDetailText('你听了张三丰的指导，似乎有些心得。'),
    'ignore',
  );
});

test('accepts jianghu loot item and obtainable-skill descriptions', () => {
  const skillDesc =
    '<hic>基本拳脚</hic>\n公共初级技能\n拳脚入门功夫，可在江湖战利品中获得。\n';
  const itemDesc =
    '<wht>钢刀</wht>\n这是一把普通的钢刀。\n攻击：+10\n';
  assert.equal(policy.classifyDetailText(skillDesc), 'accept');
  assert.equal(policy.classifyDetailText(itemDesc), 'accept');
});

test('does not treat skill update packets from breakthrough pills as panels', () => {
  assert.equal(
    policy.isDialogPanelPayload({
      type: 'dialog',
      dialog: 'skills',
      id: 'force',
      level: 501,
    }),
    false,
  );
  assert.equal(
    policy.isDialogPanelPayload({
      type: 'dialog',
      dialog: 'skills',
      id: 'force',
      desc: '技能突破后的说明',
    }),
    false,
  );
  assert.equal(
    policy.isDialogPanelPayload({
      type: 'dialog',
      dialog: 'skills',
      items: [],
    }),
    true,
  );
});

test('only treats full pack and master lists as panel payloads', () => {
  assert.equal(
    policy.isDialogPanelPayload({ type: 'dialog', dialog: 'pack', item: {} }),
    false,
  );
  assert.equal(
    policy.isDialogPanelPayload({ type: 'dialog', dialog: 'pack', items: [] }),
    true,
  );
  assert.equal(
    policy.isDialogPanelPayload({
      type: 'dialog',
      dialog: 'master',
      id: 'force',
      desc: '师父技能更新',
    }),
    false,
  );
  assert.equal(
    policy.isDialogPanelPayload({
      type: 'dialog',
      dialog: 'master',
      master: 'master-id',
      items: [],
    }),
    true,
  );
  assert.equal(
    policy.isDialogPanelPayload({ type: 'dialog', dialog: 'tasks', items: [] }),
    true,
  );
});
