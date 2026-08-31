/** HTML templates used by the automation suite and plugin UI features. */
(function registerAutomationUiTemplates(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "automation-ui-templates",
    function create(context) {
      const { legacy } = context;
      const UI = {
      codeInput: `<div class="runtest layui-layer-wrap" style="display: none;">
                         <textarea class="site-demo-text" id="testmain" data-enpassusermodified="yes">
                         //<-第一行输入双斜杠即可运行流程命令 ,第一行输入#js 即可运行JS

                        </textarea>
                        <a class="layui-btn layui-btn-normal runtesta" style="position:absolute;right:20px;bottom:20px"  >立即运行</a>
                     </div>`,
      zdybtnui: function () {
        let e = "<div class='WG_button'>";
        var t,
          s = ["Q", "W", "E", "R", "T", "Y"];
        let o = 0;
        for (t of legacy.getCustomButtonList())
          ((e += ` <span class='zdy-item' id = 'keyin${s[o]}'>${t.name}(${s[o]})</span>`),
            (o += 1));
        return (
          e +
          `<span class="zdy-item auto_perform" style="float:right;"> 自动攻击 </span>
                <span class="zdy-item cmd_echo" style="float:right;">代码</span> </div>`
        );
      },
      btnui: function () {
        return `<div class='WG_button'><span class='zdy-item go_home'>回家(Q)</span>
            <span class='zdy-item go_wumiao'>武庙(W)</span>
            <span class='zdy-item kill_all'>击杀(E)</span>
            <span class='zdy-item get_all'>拾取(R)</span>
            <span class='zdy-item sell_all'>清包(T)</span>
            <span class='zdy-item zdwk'>挂机(Y)</span>
                 <span class="zdy-item auto_perform" style="float:right;"> 自动攻击 </span>
                <span class="zdy-item cmd_echo" style="float:right;">代码</span> </div>`;
      },
      zdyBtnsetui: function () {
        let e = "";
        var t;
        for (t of ["Q", "W", "E", "R", "T", "Y"])
          e += `<div class="setting-item setting-item2 ">
                 <div style='width:10%'>${t}:</div><span>名称:<input style='width:20%' id='name${t}' /></span> <span style='margin-left:5px'>命令:<input id='send${t}'/></span>
                </div>`;
        return (e += `
                         <div class="setting-item" >
                <div class="item-commands"><span class="savebtn">保存自定义按钮设置</span></div>
                        </div>
            `);
      },
      html_lninput: function (e, t) {
        return `
              <div class="setting-item" >
                <span><label for="${e}">${t}</label><input id="${e}" name="${e}" type="text" style="width:80px" value>
                </span>        </div> `;
      },
      html_input: function (e, t) {
        return `
                 <div class="setting-item" >
                <span><label for="${e}"> ${t}</label> </span>
              </div>
              <textarea class="settingbox hide zdy-box" id="${e}" name="${e}" style="display: inline-block;">  </textarea>
            `;
      },
      html_switch: function (e, t, s) {
        return `<div class="setting-item setting-item2 " for="${s}" style='display: inline-block;'>
                <span class="title"> ${t}</span>
                <span class="switch2" id="${e}" >
                <span class="switch-button"></span>
                <span class="switch-text">关</span>
                </span>
                </div>
                `;
      },
      switchClick: function (e) {
        var t = $(this);
        t.parent().attr("for");
        t.is(".on")
          ? (t.removeClass("on"), t.find(".switch-text").html("关"))
          : (t.addClass("on"), t.find(".switch-text").html("开"));
      },
      syssetting: function () {
        return (
          `<h3>插件</h3>
                    <div class="setting-item zdy_dialog" >
                有空的话请点个star,您的支持是我最大的动力<a href="https://github.com/knva/wsmud_plugins" target="_blank">https://github.com/knva/wsmud_plugins</a>
                </div> ` +
          UI.html_lninput("welcome", "欢迎语句： ") +
          `
                <div class="setting-item">
                <span> <label for="color_select"> 界面配色： </label><select id="color_select" style="width:80px">
                    <option value="normal"> 原版 </option>
                    <option value="flat"> flat模式 </option>
                    <option value="access"> 色若模式</option>
                </select> *此功能刷新后生效
                </span></div>  
                <div class="setting-item" >
                <span><label for="family">门派选择：</label><select id="family" style="width:80px">
                        <option value="武当">武当</option>
                        <option value="华山">华山</option>
                        <option value="少林">少林</option>
                        <option value="峨眉">峨眉</option>
                        <option value="逍遥">逍遥</option>
                        <option value="丐帮">丐帮</option>
                        <option value="武馆">武馆</option>
                        <option value="杀手楼">杀手楼</option>
                    </select>
                </span>
                </div>` +
          UI.html_switch("autorelogin", "自动重连: ", "auto_relogin") +
          UI.html_switch("shieldswitch", "聊天频道屏蔽开关: ", "shieldswitch") +
          UI.html_switch("silence", "安静模式:", "silence") +
          UI.html_switch("dpssakada", "战斗统计:", "dpssakada") +
          UI.html_switch("funnycalc", "funny计算:", "funnycalc") +
          "<h3>屏蔽选项</h3>" +
          UI.html_lninput("shield", "屏蔽人物名(用半角逗号分隔)：") +
          UI.html_lninput("shieldkey", "屏蔽关键字(用半角逗号分隔)：") +
          "<h3>师门任务配置</h3>" +
          UI.html_switch("sm_loser", "师门自动放弃：", "sm_loser") +
          UI.html_switch("sm_any", "师门任务提交稀有：", "sm_any") +
          UI.html_switch("sm_price", "师门自动牌子：", "sm_price") +
          UI.html_switch("sm_getstore", "师门自动仓库取：", "sm_getstore") +
          `<h3>自命令配置</h3>
                <div class="setting-item" >
                <span> <label for="zmlshowsetting"> 自命令显示位置： </label><select id="zmlshowsetting" style="width:80px">
                    <option value="0"> 物品栏 </option>
                    <option value="1"> 技能栏下方 </option>
                </select>
                </span></div> ` +
          "<h3>武道塔配置</h3>" +
          UI.html_lninput("wudao_pfm", "武道释放技能(用半角逗号分隔)：") +
          "<h3>杂项配置</h3>" +
          UI.html_switch(
            "autorewardgoto",
            "开启转发路径：",
            "auto_rewardgoto",
          ) +
          UI.html_switch("busyinfo", "显示昏迷信息：", "busy_info") +
          UI.html_switch("saveAddr", "使用豪宅仓库：", "saveAddr") +
          UI.html_switch("getitemShow", "显示获得物品：", "getitemShow") +
          UI.html_input(
            "statehml",
            "当你各种状态中断后，自动以下操作(部分地点不执行)：",
          ) +
          UI.html_input(
            "backimageurl",
            "背景图片url(建议使用1920*1080分辨率图片)：",
          ) +
          UI.html_input("loginhml", "登录后执行命令：") +
          `
                <div class="setting-item">
                <span> <label for="bagFull"> 背包已满提示： </label><select id="bagFull" style="width:80px">
                    <option value="0"> 文字提醒 </option>
                    <option value="1"> 提示音 </option>
                    <option value="2"> 语音提醒 </option>
                </select>
                </span></div>` +
          "<h3>推送配置</h3>" +
          UI.html_switch(
            "pushSwitch",
            "远程通知推送开关(使用@push推送通知，语法参考@print)：",
            "pushSwitch",
          ) +
          `
                <div class="setting-item">
                <span> <label for="pushType"> 通知推送方式(使用方法加群看)： </label><select id="pushType" style="width:80px">
                    <option value="0"> Server酱(限32字符) </option>
                    <option value="1"> Bark iOS </option>
                    <option value="2"> PushPlus.plus(支持html标签) </option>
                    <option value="3"> 飞书机器人 </option>
                    <option value="4"> Qmsg私聊 </option>
                    <option value="5"> Qmsg群聊 </option>
                </select>
                </span></div> ` +
          UI.html_lninput(
            "pushToken",
            "推送方式对应的Token或Key(只要Key不要填整个网址)：",
          ) +
          "<h3>自动BOSS配置</h3>" +
          UI.html_switch("marry_kiss", "自动喜宴：", "automarry") +
          UI.html_switch("ks_Boss", "自动传到boss：", "autoKsBoss") +
          UI.html_lninput("auto_eq", "BOSS击杀时自动换装：") +
          UI.html_lninput("ks_pfm", "BOSS叫杀延时(ms)： ") +
          UI.html_lninput("ks_wait", "BOSS击杀等待延迟(s)： ") +
          UI.html_input(
            "auto_command",
            "输入喜宴及boss后命令(留空为自动挖矿或修炼)：",
          ) +
          UI.html_input(
            "blacklist",
            "输入黑名单boss名称(黑名单boss不会去打,中文,用半角逗号分隔)：",
          ) +
          "<h3>自动施法配置</h3>" +
          UI.html_input(
            "unauto_pfm",
            "自动施法黑名单(填技能代码，使用半角逗号分隔)：",
          ) +
          UI.html_switch("autopfmswitch", "自动施法开关：", "auto_pfmswitch") +
          UI.html_switch("autopfmmode", "AI施法模式：", "auto_pfm_mode") +
          "<h3>仓库存储配置</h3>" +
          UI.html_switch(
            "autoupdateStore",
            "自动更新仓库数据：",
            "auto_updateStore",
          ) +
          UI.html_input(
            "store_info",
            "自动存储的物品名称（自动获得的物品信息,随仓库内容更新）：",
          ) +
          UI.html_input(
            "store_info2",
            "手动添加的自动存仓物品信息（不会随仓库内容更新，使用半角逗号分隔）：",
          ) +
          UI.html_input(
            "lock_info",
            "已锁物品名称(锁定物品不会自动丢弃,使用半角逗号分隔)：",
          ) +
          UI.html_input(
            "store_drop_info",
            "输入自动丢弃的物品名称(使用半角逗号分隔)：",
          ) +
          UI.html_input(
            "store_fenjie_info",
            "输入自动分解的物品名称(使用半角逗号分隔)：",
          ) +
          UI.html_input("autobuy", "自动当铺购买清单：(用半角逗号分隔)") +
          UI.html_input(
            "autoSkillPaperSell",
            "自动售卖秘籍清单：(用半角逗号分隔)",
          ) +
          "<h3>技能自定义</h3>" +
          UI.html_switch(
            "zdyskillsswitch",
            "自定义技能顺序开关：",
            "zdyskills",
          ) +
          UI.html_input("zdyskilllist", "自定义技能顺序json数组：") +
          ' <div class="setting-item" ><div class="item-commands"><span class="clear_skillJson">清空技能json数组</span></div></div>' +
          `

                <div class="setting-item" >
                <div class="item-commands"><span class="update_id_all">初始化ID</span>
                                            <span class="clean_id_all">清空商品ID配置</span></div>
                        </div>
                <div class="setting-item" >
                <div class="item-commands"><span class="update_store">更新存仓数据(覆盖)</span><span class="clean_dps">重置伤害统计</span></div>
                    </div>
                <div class="setting-item" >
                <div class="item-commands"><span class="backup_btn">备份到云</span><span class="load_btn">加载云配置</span></div>
            </div>

            <h3>自定义按钮</h3>` +
          UI.zdyBtnsetui() +
          " <h3>系统</h3> "
        );
      },
      skillsPanel: `<div class="item-commands" style="text-align:center" id='skillsPanelUI'>
                <div style="margin-top:0.5em">
                    <div style="width:8em;float:left;text-align:left;padding:0px 0px 0px 2em;height:1.23em" id="wsmud_raid_left" @click='show'><wht>{{role}}</wht></div>
                    <div style="width:calc(100% - 16em);float:left;height:1.23em"><hig>套装列表</hig></div>
                    <div style="width:8em;float:right;text-align:right;padding:0px 2em 0px 0px;height:1.23em" id="wsmud_raid_right">
                    <select style="width:80px" id="eqskills-opts" @change="eqskills_opts_change(eqskills_id)" v-model="eqskills_id">
                        <option value="none">选择操作</option>
                        <option value="save">新建套装</option>
                        <option value="covereq">覆盖套装</option>
                        <option value="copyeq">复制命令</option>
                        <option value="delete">删除套装</option>
                        <option value="uneqall">脱光装备</option>
                    </select></div>
                </div>
                <br><br>
				<div class="item-commands">
                <span class="zdy-item"  v-for="(item, index) in eqlistdel" @click='deleq(index)'
                        style="width: 120px;">
                        <div class="eqsname" style="width: 100%;">删除{{index}}</div>
                </span>
				</div>
				<div class="item-commands">
                <span class="zdy-item"  v-for="(item, index) in eqlist" @click='eq(index)'
                        style="width: 120px;">
                        <div class="eqsname" style="width:100%;">装备套装:{{index}}</div>
                </span>

				</div>
                <div class="item-commands">
                <span class="zdy-item"  v-for="(item, index) in covereqlist" @click='covereq(index)'
                        style="width: 120px;">
                        <div class="eqsname" style="width:100%;">覆盖套装:{{index}}</div>
                </span>

				</div>
                <br>
				<div class="item-commands">
                    <span class="zdy-item"  v-for="(item, index) in eqlist" @click='eqs(index)'
                        style="width: 120px;">
                        <div class="eqsname" style="width: 100%;">装备技能:{{index}}</div>
                </span>
				</div>
                <div class="item-commands">
                <span class="zdy-item"  v-for="(item, index) in cpeqlist" @click='copyeq(index)'
                        style="width: 120px;">
                        <div class="eqsname" style="width:100%;">复制装备套装:{{index}}</div>
                </span>

				</div>
                <br>
				<div class="item-commands">
                    <span class="zdy-item"  v-for="(item, index) in cpeqlist" @click='copyeqs(index)'
                        style="width: 120px;">
                        <div class="eqsname" style="width: 100%;">复制装备技能:{{index}}</div>
                </span>
				</div>
                 <br>

                </div>
        `,
      zmlsetting: `<div class='zdy_dialog' style='text-align:right;width:280px' id="zmldialog">
    <div class="setting-item"><span><label for="zml_name"> 输入自定义命令名称:</label></span><span><input id="zml_name"
                style='width:80px' type="text" name="zml_name" value="" v-model="singnalzml.name"></span></div>
    <div class="setting-item"> <label for="zml_type"> 自命令类型： </label><select id="zml_type" style="width:80px"
            v-model="singnalzml.zmlType">
            <option value="0"> 插件原生 </option>
            <option value="1"> Raidjs流程 </option>
            <option value="2"> JS原生 </option>
        </select> </div>
    <div class="setting-item"> <label for="zml_info"> 输入自定义命令(用半角分号(;)分隔):</label></div>
    <div class="setting-item"><textarea class="settingbox hide zdy-box" style="display: inline-block;" id='zml_info'
            v-model="singnalzml.zmlRun"></textarea></div>
    <div class="item-commands"><span class="getSharezml" @click="getShare"> 查询分享 </span> <span class="editadd"
            @click="add"> 保存 </span> <span class="editdel" @click="del"> 删除 </span> </div>
    <div class="item-commands" id="zml_show">
        <span v-for="(item, index) in zmldata" @click="edit(item)">
            编辑{{item.name}}
        </span>
        <br />
        <span v-for="(item, index) in zmldata" @click="showp(item)">
             <label v-if="item.zmlShow == '1'">取消快速使用</label><label v-else>快速使用</label>{{item.name}}
        </span>
        <br />
        <span v-for="(item, index) in zmldata" @click="share(item)">
            分享{{item.name}}
        </span>
        <br />
    </div>
</div> `,
      zmlandztjkui: `<div class='zdy_dialog' style='text-align:right;width:280px' id="zmlandztjk">
     <div class="item-commands"> <span class="editzml" @click="zml"> 编辑自命令 </span> </div>
     <div class="item-commands"> <span class="editztjk" @click="ztjk"> 编辑自定义监控 </span>
         <div class="item-commands"> <span class="startzdjk" @click="startjk"> 注入所有监控 </span> <span class="stopzdjk"
                 @click="stopjk"> 暂停所有监控
             </span>
         </div>
     </div>
     <div class="item-commands" id="zml_show">
                 <span v-for="(item, index) in zmldata" @click="run(item)">
                     {{item.name}}
                 </span>
     </div>
 </div>`,
      ztjksetting: `<div class='zdy_dialog' style='text-align:right;width:280px'>
    <div class="setting-item"> <label> 请打开插件首页,查看文档及例子,本人血量状态监控 请按如下规则输入关键字 90|90 这样监控的是hp 90% mp 90% 以下触发</label></div>
    <div class="setting-item"> <label for="ztjk_name"> 名称:</label><input id="ztjk_name" style='width:80px' type="text"
            name="ztjk_name" value=""></div>
    <div class="setting-item"><label for="ztjk_type"> 类型(type):</label><select style='width:80px' id="ztjk_type">
            <option value="status"> 状态(status) </option>
            <option value="text"> 文本(text) </option>
            <option value="msg"> 聊天(msg) </option>
            <option value="die"> 死亡(die) </option>
            <option value="itemadd"> 人物刷新(itemadd) </option>
            <option value="room"> 地图名与房间人物(room) </option>
            <option value="dialog"> 背包监控(dialog) </option>
            <option value="combat"> 战斗状态(combat) </option>
            <option value="sc"> 血量状态(sc) </option>
            <option value="enapfm"> 技能监控(enapfm) </option>
            <option value="dispfm"> 技能监控(dispfm) </option>
        </select></div>
    <div class="setting-item"><span id='actionp' style='display:block'><label for="ztjk_action">
                动作(action):</label><input id="ztjk_action" style='width:80px' type="text" name="ztjk_action"
                value=""></span></div>
    <div class="setting-item"><span><label for="ztjk_keyword"> 关键字(使用半角 | 分割):</label><input id="ztjk_keyword"
                style='width:80px' type="text" name="ztjk_keyword" value=""></span></div>
    <div class="setting-item"><span><label for="ztjk_ishave"> 触发对象: </label><select style='width:80px' id="ztjk_ishave">
                <option value="0"> 其他人 </option>
                <option value="1"> 本人 </option>
                <option value="2"> 仅NPC </option>
            </select></span></div>
    <div class="setting-item"> <span id='senduserp' style='display:block'><label for="ztjk_senduser"> MSG/其他人名称(使用半角 |
                分割):</label><input id="ztjk_senduser" style="width:80px;" type="text" name="ztjk_senduser"
                value=""></span></div>
    <div class="setting-item"> <span style='display:block'><label> Buff层数:</label><input id="ztjk_maxcount"
                style="width:80px;" type="text" name="ztjk_maxcount" value=""></span></div>
    <div class="setting-item"> <span style='display:block'><label> 状态监控提示:</label><select style='width:80px'
                id="ztjk_istip">
                <option value="1"> 提示 </option>
                <option value="0"> 不提示 </option>
            </select></span></div>
    <div class="setting-item"><span><label for="ztjk_send"> 输入自定义命令(用半角分号(;)分隔):</label></span></div>
    <div class="setting-item"> <textarea class="settingbox hide zdy-box" style="display: inline-block;"
            id='ztjk_send'></textarea></div>
    <div class="item-commands"><span class="ztjk_sharedfind"> 查询分享 </span> <span class="ztjk_editadd"> 保存 </span> <span
            class="ztjk_editdel"> 删除 </span></div>
    <div class="item-commands" id="ztjk_show"></div>
    <div class="item-commands" id="ztjk_set"></div>
</div> `,
      jsquivue: `
                    <div class="JsqVueUI">
                    <div class="item-commands">
                <span @click='qnjs_btn'>潜能计算</span>
                <span @click='lxjs_btn'>练习时间及潜能计算</span>
                <span @click='khjs_btn'>开花计算</span>
                <span @click='zcjs_btn'>自创等级计算</span>
                <span  @click='getskilljson'>提取技能属性(可用于苏轻模拟器)</span>
                <span  @click='autoAddLianxi'>自动将最低等级技能添加到离线练习</span>
            </div>
            <div class="item-commands">
                <span  @click='onekeydaily'>一键日常</span>
                <span  @click='onekeypk'>自动比试</span>
                <span  @click='onekeysansan'>导入白三三懒人包（依赖raid.js）</span>
                <span  @click='onelddh'>来点动画（依赖raid.js）</span>
            </div>
            <div class="item-commands">
                <span  @click="onekeystore">存仓及贩卖</span>
                <span  @click='onekeysell'>丢弃及贩卖</span>
                <span  @click='onekeyfenjie'>分解及贩卖</span>
            </div>
            <div class="item-commands">
                <span @click='updatestore'>更新仓库数据(覆盖)</span>
                <span @click='sortstore'>排序仓库</span>
                <span @click='sortbag'>排序背包</span>
                <span @click='dsrw'>定时任务</span>
                <span @click='cleandps'>清空伤害</span>
                <span @click='cleankksboss'>不再提示婚宴及boss传送信息</span>
            </div>
            <div class="item-commands">
                <span @click='onekeyyaota'>一键妖塔</span>
                <span @click='onekeydelaytest'>延迟测试</span>
                <span @click='yuanshen'>原神</span>
            </div>
            </div>`,
      lxjsui: `
                       <div style="width:50%;float:left" class='StudyTimeCalc'>
     <div class="setting-item"> <span>练习时间计算器</span></div>
     <div class="setting-item">先天悟性:<input type="number"  placeholder="先天悟性" style="width:50%"
             class="mui-input-speech" v-model=jsqsx.xtwx></div>
     <div class="setting-item">后天悟性:<input type="number"  placeholder="后天悟性" style="width:50%"
             class="mui-input-speech" v-model=jsqsx.htwx></div>
     <div class="setting-item">练习效率:<input type="number"  placeholder="练习效率" style="width:50%"
             class="mui-input-speech" v-model=jsqsx.lxxl></div>
     <div class="setting-item">初始等级:<input type="number" placeholder="初始等级" style="width:50%"
             class="mui-input-speech" v-model=jsqsx.clevel></div>
     <div class="setting-item"> 目标等级:<input type="number" placeholder="目标等级" style="width:50%"
             v-model=jsqsx.mlevel></div>
     <div class="setting-item">技能颜色: <select style="width:50%" v-model=jsqsx.color>
             <option value='0'>选择技能颜色</option>
             <option value='1' style="color: #c0c0c0;">白色</option>
             <option value='2' style="color:#00ff00;">绿色</option>
             <option value='3' style="color:#00ffff;">蓝色</option>
             <option value='4' style="color:#ffff00;">黄色</option>
             <option value='5' style="color:#912cee;">紫色</option>
             <option value='6' style="color: #ffa600;">橙色</option>
             <option value='7' style="color: #CC0000;">红色</option>
         </select></div>
                <div class="setting-item">
        <div class="item-commands"><span @click="lxjscalc">计算</span></div>
             </div>
    </div>`,
      qnjsui: ` <div style="width:50%;float:left" class="QianNengCalc">
    <div class="setting-item"> <span>潜能计算器</span></div>
    <div class="setting-item">初始等级:<input type="number" placeholder="初始等级" style="width:50%"
            class="mui-input-speech" v-model='qnsx.c'>
    </div>
    <div class="setting-item"> 目标等级:<input type="number" v-model='qnsx.m' placeholder="目标等级" style="width:50%">
    </div>
    <div class="setting-item"> 技能颜色:<select id="se" style="width:50%" v-model='qnsx.color'>
            <option value='0'>选择技能颜色</option>
            <option value='1' style="color: #c0c0c0;">白色</option>
            <option value='2' style="color:#00ff00;">绿色</option>
            <option value='3' style="color:#00ffff;">蓝色</option>
            <option value='4' style="color:#ffff00;">黄色</option>
            <option value='5' style="color:#912cee;">紫色</option>
            <option value='6' style="color: #ffa600;">橙色</option>
        </select>
        </div>
        <div class="setting-item">
        <div class="item-commands"><span @click="qnjscalc">计算</span></div>
             </div>

</div>`,
      khjsui: `<div style="width:50%;float:left" class="KaihuaCalc">
    <div class="setting-item"><span>开花计算器</span></div>
    <div class="setting-item"> 当前内力:<input type="number" placeholder="当前内力" style="width:50%"
            class="mui-input-speech" v-model="khsx.nl"></div>
    <div class="setting-item"> 先天根骨:<input type="number" placeholder="先天根骨" style="width:50%"
        v-model="khsx.xg"></div>
    <div class="setting-item"> 后天根骨:<input type="number" placeholder="后天根骨" style="width:50%"
        v-model="khsx.hg"></div>
    <div class="setting-item">      <div class="item-commands"><span @click="khjscalc" >计算</span></div></div>
    <div class="setting-item"> <label>人花分值：5000 地花分值：6500 天花分值：8000</label></div>
</div>`,
      zcjsui: `<div style="width:50%;float:left" class="ZiChuangCalc">
    <div class="setting-item"><span>自创等级计算器</span></div>
    <div class="setting-item"> 自创等级:<input type="number" placeholder="自创等级" style="width:50%"
            class="mui-input-speech" v-model="zcsx.level"></div>
    <div class="setting-item"> 目标属性百分比:<input type="number" placeholder="目标属性百分比" style="width:50%"
        v-model="zcsx.percentage"></div>

    <div class="setting-item">      <div class="item-commands"><span @click="zcjscalc" >计算</span></div></div>

</div>`,
      lyui: `<div class='zdy_dialog' id="LianYao" style='text-align:right;width:280px'> 有空的话请点个star,您的支持是我最大的动力 <a target="_blank"
        href="https://github.com/knva/wsmud_plugins">https://github.com/knva/wsmud_plugins</a> 药方链接:<a target="_blank"
        href="https://emeisuqing.github.io/wsmud.old/yaofang/">https://emeisuqing.github.io/wsmud.old/yaofang/</a>
    <div class="setting-item"> <span> <label for="medicine_level"> 级别选择： </label><select style='width:80px'
                id="medicine_level" v-model="level">
                <option value="1">绿色</option>
                <option value="2">蓝色</option>
                <option value="3">黄色</option>
                <option value="4">紫色</option>
                <option value="5">橙色</option>
                <option value="6">红色</option>
            </select></span></div>
    <div class="setting-item"> 数量:<span><input id="mednum" v-model="num" style="width:80px;" type="number" name="mednum" value="1">
        </span></div>
    <div class="setting-item"> <span><label for="medicint_info"> 输入使用的顺序(使用半角逗号分隔,多配方使用 | 分割):</label></span></div>
    <div class="setting-item"><textarea v-model="info"  class="settingbox hide zdy-box" style="display: inline-block;"
            id='medicint_info'>石楠叶,金银花,金银花,金银花,当归</textarea></div>
    <div class="item-commands"> <span class="startDev" @click="startDev"> 开始 </span><span class="stopDev" @click="stopDev"> 停止 </span> </div>
</div>`,
      timeoutui: `<div class='zdy_dialog' style='text-align:right;width:280px'> 注意,可以留空的时或者分,这样就是每分钟/小时 的x秒触发任务,秒为必填项目 <div class="setting-item">    <span>任务名:<input type="text" id="questname" placeholder="任务名" style="width:50%"></span></div> <div class="setting-item">     <label for = "rtype"> 运行次数 </label><select style='width:80px' id="rtype"></div> <option value="1">一次</option> <option value="2">每天</option> </select></span></div> <div class="setting-item">  <span>时:<input type="number" id="ht" placeholder="时" style="width:50%"></span></div> <div class="setting-item">   <span>分:<input type="number" id="mt" placeholder="分" style="width:50%"></span></div> <div class="setting-item">  <span>秒:<input type="number" id="st" placeholder="秒" style="width:50%"></span></div> <div class="setting-item">  <span><label for="zml_info"> 输入自定义命令(用半角分号(;)分隔):</label></span></div> <div class="setting-item">   <textarea class = "settingbox hide zdy-box"style = "display: inline-block;"id = 'zml_info'></textarea></div> <div class = "item-commands"> <span class = "startQuest"> 开始 </span><span class = "removeQuest"> 删除 </span>  </div> <div class='questlist item-commands'></div> </div>`,
      toui: [
        `<div class='item-commands'><span cmd = "$to 扬州城-衙门正厅" > 衙门 </span>
            <span cmd = "$to 扬州城-当铺" > 当铺 </span>
            <span cmd = "$to 扬州城-醉仙楼" > 醉仙 </span>
            <span cmd = "$to 扬州城-杂货铺" > 杂货 </span>
            <span cmd = "$to 扬州城-打铁铺" > 打铁 </span>
            <span cmd = "$to 扬州城-钱庄" > 钱庄 </span>
            <span cmd = "$to 扬州城-药铺" > 药铺 </span>
            <span cmd = "$to 扬州城-扬州武馆" > 武馆 </span>
            <span cmd = "$to 扬州城-镖局正厅" > 镖局 </span>
            <span cmd = "$to 住房" > 住房 </span>
            <span cmd = "$to 扬州城-武庙" > 武庙 </span>
            <span cmd = "$to 帮会-大院" > 帮派 </span>
            <span cmd = "$to 扬州城-赌场" > 赌场 </span>
            <span cmd = "$to 扬州城-有间客栈" > 客栈 </span>
            <span cmd = "$to 扬州城-擂台" > 擂台 </span>
            <span cmd = "$to 扬州城-矿山" > 矿山 </span></div>`,
        `<div class='item-commands'><span cmd = "$to 武当派-后山小院" >掌门</span>
             <span cmd = "$to 武当派-石阶" >后勤</span>
             <span cmd = "$to 武当派-三清殿" >三清殿</span></div>`,
        `<div class='item-commands'><span cmd = "$to 少林派-方丈楼" >掌门</span>
             <span cmd = "$to 少林派-山门殿" >后勤</span>
             <span cmd = "$to 少林派-天王殿" >天王殿</span></div>`,
        `<div class='item-commands'><span cmd = "$to 华山派-客厅" >掌门</span>
             <span cmd = "$to 华山派-练武场" >后勤</span>
             <span cmd = "$to 华山派-落雁峰" >落雁峰</span>
             <span cmd = "$to 华山派-林间小屋" >封不平</span></div>`,
        `<div class='item-commands'><span cmd = "$to 峨眉派-清修洞" >掌门</span>
            <span cmd = "$to 峨眉派-走廊" >后勤</span>
            <span cmd = "$to 峨眉派-小屋" >周芷若</span>
            <span cmd = "$to 峨眉派-大殿" >静心</span></div>`,
        `<div class='item-commands'><span cmd = "$to 逍遥派-地下石室" >掌门</span>
             <span cmd = "$to 逍遥派-林间小道" >后勤</span>
             <span cmd = "$to 逍遥派-木屋" >薛慕华</span>
             <span cmd = "$to 逍遥派-练功房" >木桩</span></div>`,
        `<div class='item-commands'><span cmd = "$to 丐帮-林间小屋" >掌门</span>
             <span cmd = "$to 丐帮-暗道;go east;" >后勤</span>
             <span cmd = "$to 丐帮-土地庙" >土地庙</span></div>`,
        `<div class='item-commands'><span cmd = "$to 杀手楼-书房" >掌门</span>
             <span cmd = "$to 杀手楼-休息室;" >后勤</span></div>`,
        `<div class='item-commands'><span cmd = "@call 自动襄阳" >自动襄阳</span></div>`,
        `<div class='item-commands'><span cmd = "@call 自动武道塔" >自动武道塔</span>
            <span cmd = "$goyt">妖塔</span>
            <span cmd = "$gogzm">古宗门</span>
            <span cmd = "$godddb">大殿底部</span></div>`,
      ],
      fbui: function (e, t, s) {
        let o = "<div class='item-commands'>";
        const raid = legacy.getRaid();
        return (
          raid
            ? (raid.existAutoDungeon(e + " 0") &&
                (o += `<span cmd = "@fb ${e} 0" >自动副本-${e}</span>`),
              s &&
                raid.existAutoDungeon(e + " 1") &&
                (o += `<span cmd = "@fb ${e} 1" >自动副本-${e}-困难</span>`),
              t &&
                raid.existAutoDungeon(e + " 2") &&
                (o += `<span cmd = "@fb ${e} 2" >自动副本-${e}-组队</span>`))
            : (o += "未安装Raid.js插件"),
          "<div class='item-commands'>" == o
            ? "<div>暂无自动副本脚本,欢迎共享。可以到三三仓库寻找更多脚本。</div>"
            : o + "</div>"
        );
      },
      itemui: function (e) {
        const lockedItems = legacy.getLockedItems();
        let t = `<div class="item-commands ">
            <span class = "addstore" cmd='$addstore ${(e = e.toLowerCase())}'> 添加到存仓 </span>`;
        return (
          0 <= lockedItems.indexOf(e)
            ? (t += `<span class = "dellock" cmd='$dellock ${e}'> 移除物品锁 </span>`)
            : (t += `<span class = "addlock" cmd='$addlock ${e}'> 添加物品锁 </span>`),
          0 <= e.indexOf("★") ||
            0 <= e.indexOf("☆") ||
            0 <= e.indexOf("hio") ||
            0 <= e.indexOf("hir") ||
            0 <= e.indexOf("ord") ||
            ((t += `<span class = "addfenjieid"  cmd='$addfenjieid ${e}'> 添加到分解 </span>`),
            -1 == lockedItems.indexOf(e) &&
              (t += `<span class = "adddrop" cmd='$adddrop ${e}'> 添加到丢弃 </span>`)),
          (t += "</div>")
        );
      },
    };

      return UI;
    },
  );
})(window);
