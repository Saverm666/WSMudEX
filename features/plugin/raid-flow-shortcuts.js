/** Fixed raid shortcut flows and their @ command registrations. */
(function registerRaidFlowShortcuts(global) {
  "use strict";

  const installedRegistrars = new WeakSet();

  global.WSMudPlugin.registerService(
    "raid-flow-shortcuts",
    function createRaidFlowShortcuts(context) {
      const Performer = context.Performer;
      const THIsland = context.THIsland;
      const registerAtCommand = context.registerAtCommand;
      let escortOwner;
      const escortChoices = {
        payment: ["免费", "元宝"], mode: ["安全", "高危"],
        car: ["普通民镖", "商行商标", "珍宝玉镖", "皇家贡镖", "九霄仙贡镖"],
        end: ["修炼", "挖矿"],
      };
      const escortKeys = { payment: "free", mode: "type", car: "car", end: "end", weapon: "weapon", count: "count" };
      const roleName = () => context.getWG().getOverlayRoleName() || context.getRole().name;
      const itemName = (item) => String(item.name || "").replace(/<[^>]*>/g, "").trim();

      async function escortOperation(owner, execute) {
        const WG = context.getWG();
        let active = true, timer, wake;
        const hooks = [];
        const cleanup = () => {
          active = false;
          clearTimeout(timer);
          if (wake) wake(false);
          for (const hook of hooks) WG.remove_hook(hook);
        };
        const removeStop = owner.onStop(cleanup);
        const wait = (delay) => new Promise((resolve) => {
          if (!active || !owner.runing()) { resolve(false); return; }
          wake = resolve;
          timer = setTimeout(() => { wake = null; resolve(active && owner.runing()); }, delay);
        });
        const until = async (predicate, timeout, error) => {
          let deadline = Date.now() + timeout;
          while (active && owner.runing()) {
            const before = Date.now();
            if (!owner.pausing() && predicate()) return true;
            if (owner.pausing()) deadline += 150;
            else if (before >= deadline) throw new Error(error);
            if (!(await wait(150))) return false;
          }
          return false;
        };
        try {
          return await execute({ wait, until, hook(types, callback) { hooks.push(WG.add_hook(types, callback)); } });
        } finally {
          removeStop();
          cleanup();
        }
      }

      async function suspendEscortWork(owner) {
        const setting = context.getSetting && context.getSetting();
        if (!setting || !setting.auto_work || setting.auto_work === "0") return;
        const saved = setting.auto_work;
        const roleId = context.getSessionRoleId();
        let acknowledged = false;
        setting.auto_work = 0;
        owner.onStop(() => {
          if (context.getSessionRoleId() === roleId && (!setting.auto_work || setting.auto_work === "0"))
            context.restoreAutoWork(saved);
        });
        await escortOperation(owner, async ({ hook, until }) => {
          hook("setting_update", (event) => {
            if (event.key === "auto_work" && Number(event.value) === 0) acknowledged = true;
          });
          context.getWG().SendCmd("setting auto_work 0");
          await until(() => acknowledged, 8000, "未确认暂停自动工作，取消运镖；请检查高级设置。");
        });
      }

      function readyEscort(owner) {
        return escortOperation(owner, ({ until }) => until(() => {
          const room = context.getRoom();
          return /镖局正厅/.test(String(room.name || "")) && Object.values(room._itemsInRoom).some((item) =>
            itemName(item).includes("林震南") && !item.p && Number(item.hp) !== 0 && !itemName(item).includes("的尸体"));
        }, 8000, "传送后未找到镖局和林震南，运镖已停止。"));
      }

      async function finishEscort(owner) {
        const end = owner.tempParams.escort_end;
        if (!escortChoices.end.includes(end)) throw new Error("运镖结束动作无效。");
        await escortOperation(owner, async ({ wait }) => {
          const WG = context.getWG();
          if (end === "修炼") {
            WG.SendCmd("goto home");
            if (!(await wait(500))) return;
            WG.SendCmd("go west");
            if (!(await wait(500))) return;
          }
          if (!owner.runing()) return;
          const label = typeof owner.name === "function" ? owner.name() : "自动运镖";
          context.appendMessage(label + "结束，开始" + end + "。");
          WG.SendCmd(end === "挖矿" ? "goto kuang" : "xiulian");
          owner.stop();
        });
      }

      async function quickEscort(owner) {
        await escortOperation(owner, async ({ hook, until, wait }) => {
          const WG = context.getWG();
          const npc = Object.values(context.getRoom()._itemsInRoom).find((item) => itemName(item).includes("林震南") && !item.p && Number(item.hp) !== 0);
          if (!npc) throw new Error("未找到林震南，快速运镖已停止。");
          let reply, action, reason, requested = false, completed = false, carMenu = false;
          const actionsFrom = (event) => {
            const value = event.commands || event.items;
            const actions = Array.isArray(value) ? value.slice() : value ? [value] : [];
            if ((event.msg || event.desc) && context.jquery) {
              const $ = context.jquery;
              const root = $('<div>').append($.parseHTML(String(event.msg || event.desc), undefined, false));
              root.find('[cmd]').each(function () { actions.push({ name: $(this).text(), cmd: $(this).attr('cmd') }); });
            }
            for (const item of actions) {
              if (!item || typeof item !== "object") continue;
              const command = String(item.cmd || "").trim();
              const label = String(item.name || "");
              if (/^task\s+yunbiao\s+/.test(command) && !/元宝/.test(label) &&
                  (/\bqkstart\b/.test(command) || /快速运镖|雇佣镖师/.test(label) ||
                   (reply === "fee" && /确认|确定|开始/.test(label))) &&
                  !/\b(?:choose_high|confirm_high|choose|continue)\b/.test(command))
                action = { command, terminal: /\bqkstart\b/.test(command) || reply === "fee" };
              if (/^task\s+yunbiao\s+(?:choose|choose_high)\s+/.test(command)) carMenu = true;
            }
          };
          hook(["text", "cmds", "item", "dialog"], (event) => {
            const text = String(event.msg || event.desc || "").replace(/<[^>]*>/g, "");
            if (/你需要支付.*黄金.*雇佣费用/.test(text)) reply = "fee";
            else if (/最近暂时.*委托|只有总镖头|你不是.*运镖|如果你不能把镖银|没有这个|^什么[？?]$|黄金.*不够|无法.*快速运镖/.test(text)) reason = text;
            if (requested && !/未完成|没有完成|尚未|雇佣费用|确认/.test(text) && /(?:完成|结束).*运镖|运镖.*(?:完成|结束)|镖师.*(?:出发|上路|启程)/.test(text)) completed = true;
            actionsFrom(event);
          });
          context.appendMessage("正在查询快速运镖入口。");
          WG.SendCmd("ksyb " + npc.id);
          if (!(await until(() => reply || action || reason || carMenu, 8000, "快速运镖没有返回可用入口，流程已停止。"))) return;
          if (reason) throw new Error(reason);
          if (!action && !reply) throw new Error("服务器返回了普通/高危选车菜单，没有快速运镖入口；请使用自动运镖。");
          const selected = action;
          action = null;
          requested = true;
          WG.SendCmd(selected ? selected.command : "task yunbiao " + npc.id + " qkstart");
          if (selected && !selected.terminal) {
            if (!(await until(() => reply || action || reason || completed, 8000, "快速运镖未返回雇佣确认，流程已停止。"))) return;
            if (reason) throw new Error(reason);
            if (!completed) {
              if (action && !action.terminal) throw new Error("服务器未返回快速运镖确认命令，流程已停止。");
              WG.SendCmd(action ? action.command : "task yunbiao " + npc.id + " qkstart");
            }
          }
          context.appendMessage("已发送快速运镖命令，等待游戏处理。");
          if (!(await wait(11000))) return;
          if (reason) throw new Error(reason);
        });
      }

      function loadEscort(owner) {
        if (!context.isOverlay()) throw new Error("自动运镖仅用于改版站点。");
        if (escortOwner && escortOwner.runing() && escortOwner !== owner) throw new Error("已有自动运镖流程正在运行。");
        escortOwner = owner;
        const WG = context.getWG();
        const loginHook = WG.add_hook("login", () => owner.stop());
        owner.onStop(() => {
          WG.remove_hook(loginHook);
          if (escortOwner === owner) escortOwner = null;
        });
        for (const [key, suffix] of Object.entries(escortKeys)) {
          const stored = context.getStore().get(roleName() + "yunbiao_" + suffix);
          const value = key === "count" ? (Number.isSafeInteger(Number(stored)) && Number(stored) > 0 ? Number(stored) : 1)
            : key === "weapon" ? stored || "龙纹剑" : escortChoices[key].includes(stored) ? stored : escortChoices[key][0];
          context.updateVariable(owner, "escort_" + key, value);
        }
      }

      function saveEscort(owner) {
        const params = owner.tempParams;
        for (const [key, choices] of Object.entries(escortChoices)) {
          if (!choices.includes(params["escort_" + key])) throw new Error("运镖配置无效，请重新选择。");
        }
        if (!String(params.escort_weapon || "").trim()) throw new Error("运镖武器不能为空。");
        const count = Number(params.escort_count);
        if (!Number.isSafeInteger(count) || count < 1) throw new Error("运镖次数必须为正整数。");
        context.updateVariable(owner, "escort_count", count);
        for (const [key, suffix] of Object.entries(escortKeys))
          context.getStore().set(roleName() + "yunbiao_" + suffix, params["escort_" + key]);
      }

      function equipEscort(owner) {
        const WG = context.getWG();
        const role = context.getRole();
        const name = String(owner.tempParams.escort_weapon).trim();
        const matches = (item) => item && itemName(item).includes(name);
        if (Object.values(role.equipments).some(matches)) return;
        return new Promise((resolve, reject) => {
          let timer, hook, removeStop, target;
          const finish = (error) => {
            clearTimeout(timer);
            WG.remove_hook(hook);
            if (removeStop) removeStop();
            if (error) reject(new Error(error));
            else resolve();
          };
          hook = WG.add_hook("dialog", (event) => {
            if (event.dialog !== "pack" || owner.pausing()) return;
            if (target) {
              if (event.eq != null && String(event.id) === String(target.id)) finish();
              return;
            }
            if (!event.items && !event.eqs) return;
            if (Object.values(role.equipments).some(matches)) { finish(); return; }
            target = Object.values(role.items).find(matches);
            if (!target) { finish("未找到运镖武器，流程停止。"); return; }
            WG.SendCmd("eq " + target.id);
          });
          timer = setTimeout(() => finish("运镖武器确认超时，流程停止。"), 8000);
          removeStop = owner.onStop(() => finish());
          WG.SendCmd("pack");
        });
      }

      async function escortTrip(owner) {
        if (!context.isOverlay()) throw new Error("自动运镖仅用于改版站点。");
        const { escort_payment: payment, escort_mode: mode, escort_car: car } = owner.tempParams;
        const cars = { 普通民镖: "normal", 商行商标: "merchant", 珍宝玉镖: "treasure", 皇家贡镖: "royal", 九霄仙贡镖: "xian" };
        if (!escortChoices.payment.includes(payment) || !escortChoices.mode.includes(mode) || !escortChoices.car.includes(car))
          throw new Error("运镖配置无效，请重新选择。");
        if (escortOwner && escortOwner !== owner) throw new Error("已有自动运镖流程正在运行。");
        const WG = context.getWG();
        const room = context.getRoom();
        const role = context.getRole();
        const npc = Object.values(room._itemsInRoom).find((item) => itemName(item).includes("林震南") && !item.p && Number(item.hp) !== 0 && !itemName(item).includes("的尸体"));
        if (!npc) throw new Error("未找到林震南，取消接镖。");
        escortOwner = owner;
        context.updateVariable(owner, "escort_done", "否");
        let phase = "quote", quote, seen = false, removedAt = 0, lastAttack = 0;
        let timer, wake, closed = false;
        const hooks = [];
        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearTimeout(timer);
          if (wake) wake(false);
          for (const hook of hooks) WG.remove_hook(hook);
          WG.SendCmd("$stoppfm");
        };
        const removeStop = owner.onStop(cleanup);
        const wait = (delay) => new Promise((resolve) => {
          wake = resolve;
          timer = setTimeout(() => { wake = null; resolve(!closed && owner.runing()); }, delay);
        });
        const send = (command) => {
          if (!closed && owner.runing() && !owner.pausing()) WG.SendCmd(command);
        };
        const carName = roleName() + "的镖车";
        hooks.push(WG.add_hook("login", () => owner.stop()));
        hooks.push(WG.add_hook(["room", "itemremove"], (event) => {
          if (event.type === "room") removedAt = 0;
          else if (seen && String(event.id) === String(seen)) removedAt = Date.now();
        }));
        hooks.push(WG.add_hook("text", (event) => {
          if (phase !== "quote") return;
          const text = String(event.msg || event.text || "").replace(/<[^>]*>/g, "");
          if (/本趟使用免费次数/.test(text)) quote = { free: true };
          else {
            const cost = text.match(/本趟将额外消耗\s*(\d+)\s*元宝购买次数/);
            if (cost) quote = { cost: Number(cost[1]) };
            else if (/再一起来找我|及以上境界接取|上限|次数不足|没有.*次数|休息下|未完成.*运镖|正在.*运镖/.test(text)) quote = { reason: text };
          }
        }));
        try {
          send(`task yunbiao ${mode === "高危" ? "choose_high" : "choose"} ${cars[car]} ${npc.id}`);
          const quoteDeadline = Date.now() + 8000;
          while (!quote && !closed) {
            if (Date.now() > quoteDeadline) throw new Error("接镖提示超时，未确认接镖。");
            if (!(await wait(200))) return;
          }
          if (closed) return;
          if (quote.reason || (!quote.free && payment === "免费")) {
            context.appendMessage(quote.reason || "免费次数已用完，自动运镖结束。");
            context.updateVariable(owner, "escort_done", "是");
            return;
          }
          while (owner.pausing()) if (!(await wait(200))) return;
          phase = "escort";
          send(`task yunbiao ${mode === "高危" ? "confirm_high" : "confirm"} ${cars[car]} ${npc.id}`);
          send("$startpfm");
          const start = Date.now();
          while (await wait(500)) {
            if (owner.pausing()) continue;
            const items = Object.values(room._itemsInRoom);
            const cart = items.find((item) => itemName(item) === carName && !item.p && Number(item.hp) !== 0);
            if (cart) { seen = cart.id; removedAt = 0; }
            if (!seen && Date.now() - start > 15000) throw new Error("接镖后未找到自己的镖车，流程停止。");
            if (Date.now() - start > 600000) throw new Error("本趟运镖超过十分钟，流程停止。");
            const bandit = items.find((item) => !item.p && !item.me && Number(item.hp) !== 0 && itemName(item) === "拦路大盗 江洋大盗");
            if (bandit) {
              if (!role.combating && Date.now() - lastAttack > 2000) {
                send("state stop");
                send("kill " + bandit.id);
                lastAttack = Date.now();
              }
              continue;
            }
            if (role.combating) continue;
            if (cart) {
              send("select " + cart.id);
              if (!(await wait(500))) return;
              // A room transition or manual stop can invalidate the selected ID.
              if (room._itemsInRoom[cart.id] && !role.combating) send("task yunbiao continue " + cart.id);
              if (!(await wait(1000))) return;
            } else if (removedAt && Date.now() - removedAt >= 3000) {
              const completed = Number(owner.tempParams.escort_completed || 0) + 1;
              context.updateVariable(owner, "escort_completed", completed);
              context.appendMessage("已完成运镖 " + completed + "/" + owner.tempParams.escort_count + " 趟。");
              return;
            }
          }
        } finally {
          removeStop();
          cleanup();
        }
      }

      if (
        typeof Performer !== "function" ||
        !THIsland ||
        typeof registerAtCommand !== "function"
      ) {
        throw new TypeError(
          "Raid 快捷流程需要显式 Performer、THIsland 和命令注册上下文",
        );
      }

      if (!installedRegistrars.has(registerAtCommand)) {
        installedRegistrars.add(registerAtCommand);
        registerAtCommand("taohualin", function (e, t) {
          return new Promise((e) => {
            THIsland.outMaze(e);
          });
        });
        registerAtCommand("zhoubotong", function (e, t) {
          return new Promise((e) => {
            THIsland.zhoubotong(e);
          });
        });
        registerAtCommand("escortLoad", loadEscort);
        registerAtCommand("escortSave", saveEscort);
        registerAtCommand("escortEquip", equipEscort);
        registerAtCommand("escortTrip", escortTrip);
        registerAtCommand("escortSuspend", suspendEscortWork);
        registerAtCommand("escortReady", readyEscort);
        registerAtCommand("escortFinish", finishEscort);
        registerAtCommand("quickEscortLoad", loadEscort);
        registerAtCommand("quickEscortRun", quickEscort);
      }

      const DungeonsShortcuts = {
        auto_yunbiao: function () {
          if (!context.isOverlay()) return;
          if (escortOwner && escortOwner.runing()) {
            context.appendMessage("已有自动运镖流程正在运行。");
            return;
          }
          context.startManaged("自动运镖", `
@escortLoad
#input ($escort_weapon) = 运镖武器,(escort_weapon)
#input ($escort_count) = 运镖次数,(escort_count)
#select ($escort_payment) = 次数购买,免费|元宝,(escort_payment)
#select ($escort_mode) = 运镖类型（高危需师徒组队）,安全|高危,(escort_mode)
#select ($escort_car) = 镖车（九霄需武仙以上）,普通民镖|商行商标|珍宝玉镖|皇家贡镖|九霄仙贡镖,(escort_car)
#select ($escort_end) = 结束后动作,修炼|挖矿,(escort_end)
#config
[if] (escort_weapon) == null || (escort_payment) == null || (escort_mode) == null || (escort_car) == null || (escort_end) == null
  @print 运镖选项不能为空。
  [exit]
@escortSave
@escortSuspend
@cmdDelay 300
($escort_done) = 否
($escort_completed) = 0
[while] (escort_done) == 否 && (escort_completed) < (escort_count)
  @force state stop
  $to 扬州城-镖局正厅
  @escortReady
  @escortEquip
  @escortTrip
@escortFinish
`);
        },
        xianyu_xyjq: function () {
          var e = new Performer(
            "襄阳捐钱",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
  @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
  [exit]
@print 🐟 一键咸鱼 => <hic>襄阳捐钱</hic>
@cmdDelay 500
stopstate;jh fam 8 start
@await 500
[if] (:room)==襄阳城-广场
  juanxian {r郭靖}?;juanxian2 {r郭靖}?
@print 已完成：襄阳捐钱
$zdwk
            `,
          );
          (e.log(!1), e.start());
        },
        xianyu_xybm: function () {
          var e = new Performer(
            "襄阳报名",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
  @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
  [exit]
@print 🐟 一键咸鱼 => <hic>襄阳报名</hic>
@cmdDelay 500
stopstate;jh fam 8 start
@await 500
[if] (:room)==襄阳城-广场
  baoming {r郭靖}?
  @tip 你可以去($xyBM)附近查看敌情|这位($xyBM)已经报名了。|才可以再次($xyOver)襄阳守城|最近没($xyNone)战事
  [if] (xyBM) != null
    @print 襄阳已报名，请选择守门位置：
    @js Message.append('<div class="item-commands"><span cmd="$wait 350;jh fam 8 start;go north;go north;go north;go north;go north;">⬆️ 守北门</span><span cmd="$wait 350;jh fam 8 start;go south;go south;go south;go south;go south;">⬇️ 守南门</span><span cmd="$wait 350;jh fam 8 start;go east;go east;go east;go east;go east;">➡️ 守东门</span><span cmd="$wait 350;jh fam 8 start;go west;go west;go west;go west;go west;">⬅️ 守西门</span></div>')
  [else if] (xyNone) != null
    @print 襄阳尚未开启。
    $zdwk
  [else if] (xyOver) != null
    @print 襄阳已经完成。
    $zdwk
  [else]
    $zdwk
            `,
          );
          (e.log(!1), e.start());
        },
        xianyu_ksyb: function () {
          if (context.isOverlay && context.isOverlay()) {
            if (escortOwner && escortOwner.runing()) { context.appendMessage("已有运镖流程正在运行。"); return; }
            context.startManaged("快速运镖", `
@quickEscortLoad
@escortSuspend
@force state stop
$to 扬州城-镖局正厅
@escortReady
@quickEscortRun
@escortFinish
`);
            return;
          }
          var e = new Performer(
            "快速运镖",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
  @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
  [exit]
@print 🐟 一键咸鱼 => <hic>快速运镖</hic>
@cmdDelay 500
stopstate
$to 扬州城-镖局正厅
ksyb {r林震南}
@tip 最近暂时($done)委托，你先休息下吧|你需要支付($charges)黄金的雇佣费用|只有总镖头才($can)雇佣镖师|如果你不能把镖银($escort)送到|你不是($escort)运镖吗
[if] (charges)!=null
  <-recordGains
  task yunbiao {r林震南} qkstart
  @await 11000
  @tidyBag
  recordGains->nopopup
[else if] (can)!=null
  tm 运镖环数不到200环，无法快速运镖。
[else if] (escort)!=null
  tm 当前有未完成的运镖任务，无法快速运镖。
$zdwk 
            `,
          );
          (e.log(!1), e.start());
        },
        xianyu_sdyt: function () {
          var e = new Performer(
            "扫荡妖塔",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
  @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
  [exit]
@print 🐟 一键咸鱼 => <hic>扫荡妖塔</hic>
@print <hic>如果想自己静默式调用扫荡妖塔功能，请先设定变量扫荡次数 <hiy>SDYTnum</hiy> 和 单次消耗精力上限 <hiy>SDYTjlsx</hiy> 的值。</hic>
[if] (SDYTjlsx) == 0 || (SDYTjlsx) == null || (SDYTjlsx) == undefined
  @js ($SDYTjlsx) = prompt("请输入单次消耗精力上限，超过后将自动停止：", "85");
[if] (SDYTnum) == 0 || (SDYTnum) == null || (SDYTnum) == undefined
  @js ($SDYTnum) = prompt("请输入本轮扫荡次数，注意：单次消耗精力达到上限后将自动停止。","5")
($sdyt_num) = (SDYTnum)
//($SDYTnum) = null
[if] (sdyt_num) == 0 || (sdyt_num) == null || (sdyt_num) == undefined
  @print <ord>扫荡次数为0，取消扫荡。</ord>
  [exit]
@print <hiy>计划扫荡(sdyt_num)次妖塔。</hiy>
stopstate
[if] (:room) != 古大陆-墓园
  $goyt
  @await 1500
[if] (:room) != 古大陆-墓园
  @print <ord>无法前往古大陆，请重试或确定当前角色是否已解锁古大陆。</ord>
  $zdwk
  [exit]
[if] {b扫荡符#}? < (sdyt_num) || {b扫荡符}? == null
  shop 0 (sdyt_num)
($num) = 0
@cmdDelay 500
($ytWeek) = null
[while] (num) < (sdyt_num)
  ss muyuan
  @tip 你即将消耗一个扫荡符，($jl_yt)精力快速完成一次弑妖塔|你即将消耗($jl_yt)精力快速完成一次弑妖塔|你尚未($ytJS)弑妖塔|你已达到($ytWeek)上限
  [if] (ytJS) != null
    @print <hiy>妖塔未解锁，无法扫荡。</hiy>
    [break]
  [if] (ytWeek) != null
    @print <hiy>妖塔扫荡已达到本周上限。</hiy>
    [break]
  [if] (jl_yt) > (SDYTjlsx) && (jl_yt) != null
    @print <ord>单次扫荡精力超过(SDYTjlsx)，自动停止。</ord>
    [break]
  [else]
    saodang muyuan
    @tip 你消耗一个扫荡符|精力快速完成弑妖塔|你的($lack)不够|你已达到($ytWeek)上限
    [if] (ytWeek) != null
      @print <hiy>妖塔扫荡已达到本周上限。</hiy>
      [break]
    [if] (lack) != null
      @print <ord>(lack)不足，自动停止扫荡妖塔。</ord>
      [break]
  ($num) = (num) + 1
@await 1000
$zdwk
            `,
          );
          (e.log(!1), e.start());
        },
        xianyu_mghyj: function () {
          var e = new Performer(
            "门贡换元晶",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
  @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
  [exit]
@print 🐟 一键咸鱼 => <hic>门贡换元晶</hic>
@cmdDelay 500
stopstate
($hqName) = 门派后勤管理员
[if] (:family) == 武当派
  ($hqMap) = 武当派-石阶
[else if] (:family) == 少林派
  ($hqMap) = 少林派-山门殿
[else if] (:family) == 华山派
  ($hqMap) = 华山派-练武场
[else if] (:family) == 峨眉派
  ($hqMap) = 峨眉派-走廊
[else if] (:family) == 逍遥派
  ($hqMap) = 逍遥派-林间小道
[else if] (:family) == 丐帮
  ($hqMap) = 丐帮-暗道
[else if] (:family) == 杀手楼
  ($hqMap) = 杀手楼-休息室
[else]
  ($hqMap) = 扬州城-扬州武馆
  ($hqName) = 武馆后勤
[while] (:room) != (hqMap)
  $to (hqMap)
  [if] (:family) == 丐帮
    @await 300
    go east
  @await 500
[if] {r(hqName)}? == null
  @print 后勤失踪，请稍后再试。
[else]
  ask1 {r(hqName)}?
  @dialog
  buy 1 {d元晶o}? from {r(hqName)}?
  @tip 你从门派后勤管理员购买了|这里没有($mgYJ)多的|你没有那么多的($mgGJ)功绩
  [if] (mgGJ) != null
    @print 门贡不足，无法购买。
  [else if] (mgYJ) != null
    @print 元晶已售空，无法购买。
  [else]
    @print 已购买一个<hio>元晶</hio>。
$zdwk
            `,
          );
          (e.log(!1), e.start());
        },
        xianyu_ltbm: function () {
          var e = new Performer(
            "擂台报名",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
  @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
  [exit]
@print 🐟 一键咸鱼 => <hic>擂台报名</hic>
@cmdDelay 500
stopstate;$to 扬州城-擂台
@await 500
select {r擂台比武报名}?
askbiwu {r擂台比武报名}?
@tip 你使用当前装备和技能($ltBM)参加比武|你已经报名参加比武，($ltGX)更新你的技能和装备|你已报名或更新状态，请勿连续报名。
[if] (ltGX) != null
  biwu record ok
$zdwk
            `,
          );
          (e.log(!1), e.start());
        },
        xianyu_setting: function () {
          var e = new Performer(
            "参数设置",
            `
[(SDYTjlsx)==null]($SDYTjlsx)=85
[(SDYTnum)==null]($SDYTnum)=5
@print 🐟 一键咸鱼 => <hic>参数设置</hic>
#input ($SDYTjlsx)=<hiz>一键设置各种常用流程（陆续更新添加）参数</hiz><br/>&nbsp*&nbsp<ord>🐉 扫荡妖塔</ord> 参数<br/>&nbsp*&nbsp妖塔单次消耗精力上限,(SDYTjlsx)
#input ($SDYTnum)=每轮妖塔扫荡次数,(SDYTnum)
#config
@print 已完成参数设置
            `,
          );
          (e.log(!1), e.start());
        },
        cangbaotu: function () {
          var e = new Performer(
            "藏宝图寻宝",
            `
[if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
    @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
    [exit]
@print 🐟 一键咸鱼 => <hic>藏宝图</hic>
[if] {b藏宝图}? == null
    tm 背包中无藏宝图，取消本次寻宝。
    [exit]
@cmdDelay 500
stopstate
@toolbar jh
@toolbar pack
($money1) = (:money)
($ebony1) = {b玄晶#}?
($number)=1
($cbt_n) = 0
@stopSSAuto
<-recordGains
[while] {b藏宝图}? != null
    <---
    ($pos)=null
    use {b藏宝图}?
    @tip 发现上面的图案所绘的方位似乎($pos)。|你找到了
    [if] (pos) == 就在你这里
        use {b藏宝图}?
        ($cbt_n) = (cbt_n) + 1
        [continue]
    [else if] (pos) == null
        [continue]
    --->
    jh fam (number) start
    [if] (pos) != 离你所在的位置挺远的
        // 武当
        [if] (number)=1
            [if] (pos) == 在你的北方
                go north
                go south;go west;go northup;go north;go east
            [else if] (pos) == 在你的西方
                go west
                go west
            [else]
                go west;go northup
                go north
                go west
                go northup
                go northup
                go northup
                [while] (pos) == 在你的北方
                    go north
        // 少林
        [else if] (number)=2
            [if] (pos) == 在你的北方
                go north
                go north
                go northup
                go southdown;go northwest;go northeast
                [while] (pos) == 在你的北方
                    go north
            [else if] (pos) == 在你的西北方向
                go north;go west
                go east;go north;go northwest
                go northeast;go north;go west
                go east;go north;go west
                go east;go north;go west
            [else]
                go north;go east
                go west;go north;go northeast
                go northwest;go north;go east
                go west;go north;go east
        // 华山
        [else if] (number)=3
            [if] (pos) == 在你的北方
                go westup;go north;go east
                go west;go north;go east
            [else if] (pos) == 在你的西北方向
                go westup;go north
                go north
                go north
            [else if] (pos) == 在你的西方
                go westup
                go west
            [else if] (pos) == 在你东方
                go eastup
            [else if] (pos) == 在你的东南方向
                go eastup;go southup
                jumpdown
                go southup
                go south
                go east
            [else]
                go westup
                go south
                go southup
                go southup
                break bi;go enter
                go westup
                go westup
                jumpup
        // 峨眉
        [else if] (number)=4
            go west;go south;go west
            [if] (pos) == 在你东方
                go east
                go east
                go east
            [else if] (pos) == 在你的西方
                go west
            [else if] (pos) == 在你的南方
                go south
                go south
            [else if] (pos) == 在你的北方
                go north
                go north
            [else if] (pos) == 在你的东北方向
                go east;go north
                go east
                go northup
                go east
            [else]
                go east;go south
                go north;go east;go south
        // 逍遥
        [else if] (number)=5
            [if] (pos) == 在你东方
                go east
            [else if] (pos) == 在你的西方
                go west
            [else if] (pos) == 在你的南方
                go south
                go south
            [else if] (pos) == 在你的北方
                go north
                go north
            [else if] (pos) == 在你的东北方向
                go east;go north
            [else if] (pos) == 在你的东南方向
                go east;go south
                go south
            [else if] (pos) == 在你的西南方向
                go west;go south
            [else]
                go down
                go down
        // 丐帮
        [else]
            [if] (pos) == 在你东方
                go down;go east;go east;go east;go up
                go down;go east;go east;go up
            [else if] (pos) == 在你的南方
                go down
            [else]
                go down;go east
                go east
                go east
                go east
                go east
    [else if] (number)<6
        ($number) = (number) + 1
    [else]
        ($number)=1
//结束后自动挖矿或者闭关
@await 1000
@tidyBag
@wait 2000
$zdwk
recordGains->nopopup
@recoverSSAuto
@toolbar pack
($money2) = (:money)
@js ($income_m) = parseInt(((money2) - (money1))/10000)
($ebony2) = {b玄晶#}?
[if] (ebony1) != null
    ($income_e) = (ebony2) - (ebony1)
[else]
    ($income_e) = (ebony2)
tm 挖宝 (cbt_n) 次，收益 (income_e)个玄晶，(income_m) 两黄金
@print 挖宝 (cbt_n) 次，收益 <hiy>(income_e)</hiy> 个玄晶，<hiy>(income_m)</hiy> 两黄金
            `,
          );
          (e.log(!1), e.start());
        },
        cihang: function () {
          var e = new Performer(
            "慈航七重门",
            `
[if] (:room 慈航静斋) == false
    @print <hiy>请先进入慈航副本再运行。</hiy>
    [exit]
[else]
    [if] (:room) != 慈航静斋-山门(副本区域) && (:room) != 慈航静斋-帝踏峰(副本区域)
        @print <hiy>请在山门或帝踏峰运行。</hiy>
        [exit]
($go) = 'east','west','south','north'
($qiku) = '老','病','死','爱别离','怨憎会','求不得'
($num1) = 0
[if] (:room) == 慈航静斋-山门(副本区域)
    go south
[else if] (:room) == 慈航静斋-帝踏峰(副本区域)
    go south[2]
@print <hiy>开始自动寻路，寻路期间请勿点击地图……</hiy>
@cmdDelay 500
[while] (num1) < 6
    @js ($ku) = [(qiku)][(num1)]
    ($num2) = 0
    [while] true
        [if] (map) != null && (retry) == true
            (map)
            @await 500
        @js ($fx) = [(go)][(num2)]
        [if] (fx) == null
            @print <hiy>自动寻路失败，请回到山门重新运行！</hiy>
            [exit]
        go (fx)
        [if] (:room) == 慈航静斋-七重门(副本区域)
            @js ($ku_now) = $(".room_desc").text().match("，是名([^%]+)苦。")[1]
            [if] (ku) != (ku_now)
                [while] true
                    go west
                    [if] (:room) == 慈航静斋-七重门(副本区域)
                        @js ($dir_gc) = $("text:contains('广场')").attr("dir")
                    [if] (dir_gc) == south
                        go south
                    @await 200
                    [if] (:room) == 慈航静斋-山门(副本区域)
                        [break]
                    [else if] (:room) == 慈航静斋-广场(副本区域)
                        @print <hiy>已走出七重门！</hiy>
                        [exit]
                go south
                ($num2) = (num2) + 1
                ($retry) = true
            [else]
                [if] (map) == null
                    ($map) = go (fx)
                [else]
                    ($map) = (map);go (fx)
                ($retry) = false
                [break]
        [else if] (:room) == 慈航静斋-广场(副本区域)
            @print <hiy>已走出七重门！</hiy>
            [exit]
    ($num1) = (num1) + 1
go south
[if] (:room) == 慈航静斋-广场(副本区域)
    @print <hiy>已走出七重门！</hiy>
            `,
          );
          (e.log(!1), e.start());
        },
        zhanshendian: function () {
          var e = new Performer(
            "战神殿解谜",
            `
[if] (:room 战神殿) == false
    @print <hiy>请先进入战神殿副本再运行。</hiy>
    [exit]
[if] (:room) != 战神殿-左雁翼(副本区域)
    @print <hiy>请先手动向左走到左雁翼。</hiy>
@until (:room) == 战神殿-左雁翼(副本区域)
look shi
@tip 和外面星空星宿位置一一对应，($star_0)，($star_1)，($star_2)，($star_3)，($star_4)，($star_5)，($star_6)，($star_7)这些星宿依次闪烁
($stars) = "(star_0)","(star_1)","(star_2)","(star_3)","(star_4)","(star_5)","(star_6)","(star_7)"
($dirs) = {"star":"角亢室","dir":1,"eswn":"东北↗︎","go":"northeast"},{"star":"氏房心","dir":0,"eswn":"东→","go":"east"},{"star":"尾箕轸","dir":2,"eswn":"东南↘︎","go":"southeast"},{"star":"井鬼参","dir":4,"eswn":"西南↙︎","go":"southwest"},{"star":"柳星张翼","dir":3,"eswn":"南↓","go":"south"},{"star":"奎娄斗牛","dir":6,"eswn":"西北↖︎","go":"northwest"},{"star":"胃昴毕觜","dir":5,"eswn":"西←","go":"west"},{"star":"女虚危壁","dir":7,"eswn":"北↑","go":"north"}
@cmdDelay 100
($num_1) = 0
[while] (num_1) < 8
    @js ($star) = [(stars)][(num_1)]
    ($num_2) = 0
    [while] (num_2) < 28
        ($dir) = null
        @js ($dir) = var d=[(dirs)];var s=d[(num_2)]["star"].indexOf("(star)");if(s>=0){d[(num_2)]["dir"]}
        [if] (dir) != null
            [break]
        ($num_2) = (num_2) + 1
    push (dir)
    ($num_1) = (num_1) + 1
look shi
@tip 殿顶的星图依旧，却仅剩一颗($last)宿星孤零零的闪烁着
($num_3) = 0
[while] (num_3) < 28
    ($dir_l) = null
    ($go_l) = null
    @js ($dir_l) = var d=[(dirs)];var s=d[(num_3)]["star"].indexOf("(last)");if(s>=0){d[(num_3)]["eswn"]}
    @js ($go_l) = var d=[(dirs)];var s=d[(num_3)]["star"].indexOf("(last)");if(s>=0){d[(num_3)]["go"]}
    [if] (dir_l) != null && (go_l) != null
        [break]
    ($num_3) = (num_3) + 1
@print <hiy>(last)宿，最后一个方位是【(dir_l)】</hiy>
tm (last)宿，最后一个方位是【(dir_l)】60秒倒计时已开始，请抓紧开打。
@print <ord>打完右雁翼最后一波守卫后会自动进秘道【(go_l)】</ord>
@until (:room) == 战神殿-右雁翼(副本区域) || (:room 副本区域) == false
@until (:combating) == true || (:room 副本区域) == false
@until (:combating) == false || (:room 副本区域) == false
[if] (:room 副本区域) == false
    [exit]
[while] (:room) == 战神殿-右雁翼(副本区域) && (:living) == true
    go (go_l);$wait 100
            `,
          );
          (e.log(!1), e.start());
        },
        guzongmen: function () {
          var e = new Performer(
            "古宗门寻路",
            `
@print <hiy>如果寻路一直失败，请检查设置中<ord>【切换房间时不清空上房间信息】</ord>是否开启。</hiy>
[if] (:room 副本区域,忧愁谷) == true
    @print <ord>当前处于副本中，无法寻路！</ord>
    [exit]
@cmdDelay 500
stopstate
jh fam 9 start
go enter
go up
@tip 打败我，你就($pass)上去|聚魂成功|踏过长生门|你已堪破生死|古老的大陆寻找真相|你连($pass)都没聚合|你想($pass)为神吗
[if] (pass) != null
    @print <ord>不符合前往古大陆要求，流程终止。</ord>
    [exit]
ggdl {r疯癫的老头}
go north[3]
go north[3]
look shi
tiao1 shi;tiao1 shi;tiao2 shi
@until (:room) == 古大陆-断山
@js ($ylfx) = $(".room_desc").text().match(/[东南西北]，/g)
@js ($ylfx) = var f="(ylfx)";f.replace(/，/g,"")
@js ($ylfx) = var f="(ylfx)";f.replace(/东/g,"west")
@js ($ylfx) = var f="(ylfx)";f.replace(/西/g,"east")
@js ($ylfx) = var f="(ylfx)";f.replace(/南/g,"north")
@js ($ylfx) = var f="(ylfx)";f.replace(/北/g,"south")
@js ($ylfx) = var f="(ylfx)";f.replace(/,/g,"','")
@js ($ylfx) = var f=['(ylfx)'];f.reverse()
@js ($ylfx) = var f="(ylfx)";f.replace(/,/g,"','")
@js ($ylfx) = "'"+"(ylfx)"+"'"
@js ($fl) = [(ylfx)].length
go down
go south[3]
go south[2]
go west
($go) = 'east','west','south','north'
($num) = 0
[while] (num) < 4
    @await 500
    @js $(".content-message pre").html("");
    @await 500
    @js ($fx1) = [(go)][(num)]
    go (fx1)
    @js ($lost) = $(".content-message").text().match("你似乎迷路了")
    [if] (lost) != null
        go south[3]
        go south[3]
        go west
        ($num) = (num) + 1
    [else]
        [break]
[if] (fl) == 5
    ($num) = 0
    [while] (num) < 5
        @js ($fx) = [(ylfx)][(num)]
        go (fx)
        ($num) = (num) + 1
[else if] (fl) == 4
    @js ($fx2) = [(ylfx)][0]
    @js ($fx3) = [(ylfx)][1]
    @js ($fx4) = [(ylfx)][2]
    @js ($fx5) = [(ylfx)][3]
    ($lxjh) = {"lx":"go (fx2);go (fx3);go (fx4);go (fx5);go (fx5)"},{"lx":"go (fx2);go (fx3);go (fx4);go (fx4);go (fx5)"},{"lx":"go (fx2);go (fx3);go (fx3);go (fx4);go (fx5)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx4);go (fx5)"}
[else if] (fl) == 3
    @js ($fx2) = [(ylfx)][0]
    @js ($fx3) = [(ylfx)][1]
    @js ($fx4) = [(ylfx)][2]
    ($lxjh) = {"lx":"go (fx2);go (fx3);go (fx4);go (fx4);go (fx4)"},{"lx":"go (fx2);go (fx3);go (fx3);go (fx3);go (fx4)"},{"lx":"go (fx2);go (fx2);go (fx2);go (fx3);go (fx4)"},{"lx":"go (fx2);go (fx3);go (fx3);go (fx4);go (fx4)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx4);go (fx4)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx3);go (fx4)"}
[else if] (fl) == 2
    @js ($fx2) = [(ylfx)][0]
    @js ($fx3) = [(ylfx)][1]
    ($lxjh) = {"lx":"go (fx2);go (fx3);go (fx3);go (fx3);go (fx3)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx3);go (fx3)"},{"lx":"go (fx2);go (fx2);go (fx2);go (fx3);go (fx3)"},{"lx":"go (fx2);go (fx2);go (fx2);go (fx2);go (fx3)"}
[else if] (fl) == 1
    @js ($fx2) = [(ylfx)][0]
    ($lxjh) = {"lx":"go (fx2);go (fx2);go (fx2);go (fx2);go (fx2)"}
[if] (fl) < 5
    @js ($fxlen) = [(lxjh)].length
    ($num) = 0
    [while] (num) < (fxlen)
        @js ($map) = var f=[(lxjh)];f[(num)]["lx"]
        (map)
        [if] (:room) != 古大陆-药林
            [while] (:room) != 古大陆-平原
                go south
                @await 350
            go north;go west
            go (fx1)
            ($num) = (num) + 1
        [else]
            [break]
tiao bush
[if] (:room) == 古大陆-山脚
    @print <ord>古宗门自动寻路已完成！</ord>
[else]
    @print <ord>寻路失败，请重新运行或换个时间。</ord>
            `,
          );
          (e.log(!1), e.start());
        },
      };

      return { DungeonsShortcuts };
    },
  );
})(window);
