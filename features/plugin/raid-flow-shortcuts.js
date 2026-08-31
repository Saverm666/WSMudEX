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
      }

      const DungeonsShortcuts = {
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
