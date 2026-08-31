/** Plugin side rails, equipment and combat overlays, and floating panel markup. */
(function registerFeatureModule(global) {
  "use strict";

  global.WSMudPlugin.registerFeature("ui-shell", function install(context) {
    const { WG, G, UI, legacy } = context;

    Object.assign(UI, {
      wgui: function () {
        let e;
        return (
          `<aside class="WG_side_rail WG_side_rail_left" aria-label="角色状态与装备">
              <span class="WG_rail_role">等待角色数据</span>
              <div class="WG_resource_list">
                <div class="WG_resource_row WG_resource_hp" data-resource="hp">
                  <div class="WG_resource_line"><span class="WG_resource_label">气血</span><span class="WG_resource_value">—</span></div>
                  <div class="WG_resource_track"><span class="WG_resource_fill"></span></div>
                </div>
                <div class="WG_resource_row WG_resource_mp" data-resource="mp">
                  <div class="WG_resource_line"><span class="WG_resource_label">内力</span><span class="WG_resource_value">—</span></div>
                  <div class="WG_resource_track"><span class="WG_resource_fill"></span></div>
                </div>
                <div class="WG_resource_row WG_resource_energy" data-resource="energy">
                  <div class="WG_resource_line">
                    <span class="WG_resource_label">精力</span>
                    <span class="WG_resource_value WG_energy_value"><span class="WG_energy_timed_value" hidden></span><span class="WG_energy_permanent_value">—</span></span>
                  </div>
                  <div class="WG_resource_track" role="img" aria-label="暂无常驻精力数据"><span class="WG_resource_fill"></span></div>
                </div>
                <div class="WG_resource_row" data-resource="potential"><div class="WG_resource_line"><span class="WG_resource_label">潜能</span><span class="WG_resource_value">—</span></div></div>
                <div class="WG_resource_row" data-resource="experience"><div class="WG_resource_line"><span class="WG_resource_label">经验</span><span class="WG_resource_value">—</span></div></div>
              </div>
              <div class="WG_equipment_list"></div>
            </aside>
            <aside class="WG_side_rail WG_side_rail_right" aria-label="右侧信息栏">
              <div class="WG_side_dashboard_actions" aria-hidden="true"></div>
              <section class="WG_side_chat_view" id="WG_side_chat_view" hidden aria-hidden="true" aria-label="聊天面板">
                <header class="WG_side_chat_header">
                  <span class="WG_side_chat_title">聊天</span>
                  <button class="WG_side_chat_close" type="button" aria-label="关闭右侧聊天">关闭</button>
                </header>
                <div class="WG_side_chat_filters" role="toolbar" aria-label="筛选聊天记录"></div>
                <div class="WG_side_chat_history_host"></div>
                <div class="WG_side_chat_panel_host"></div>
              </section>
            </aside>
            <div class="WG_rail_resizer WG_rail_resizer_left" data-side="left" role="separator" aria-label="调整左侧栏宽度" aria-orientation="vertical" tabindex="0" title="拖动调整左侧栏，双击恢复默认"></div>
            <div class="WG_rail_resizer WG_rail_resizer_right" data-side="right" role="separator" aria-label="调整右侧栏宽度" aria-orientation="vertical" tabindex="0" title="拖动调整右侧栏，双击恢复默认"></div>
            <div class="WG_equipment_picker" hidden>
              <section class="WG_equipment_picker_dialog" role="dialog" aria-modal="true" aria-labelledby="WG_equipment_picker_title">
                <header class="WG_equipment_picker_header">
                  <span class="WG_equipment_picker_title" id="WG_equipment_picker_title">选择装备</span>
                  <button class="WG_equipment_picker_close" type="button" aria-label="关闭装备选择">×</button>
                </header>
                <div class="WG_equipment_picker_current"></div>
                <div class="WG_equipment_picker_list" aria-live="polite"></div>
              </section>
            </div>
            <div class="WG_auto_first_round" hidden>
              <section class="WG_auto_first_round_dialog" role="dialog" aria-modal="true" aria-labelledby="WG_auto_first_round_title">
                <header class="WG_auto_first_round_header">
                  <span class="WG_auto_first_round_title" id="WG_auto_first_round_title">自动攻击 · 首轮出招</span>
                  <button class="WG_auto_first_round_close" type="button" aria-label="关闭首轮出招设置">×</button>
                </header>
                <p class="WG_auto_first_round_hint">拖动招式调整首轮顺序；下一场战斗依次尝试一次；首轮结束后，恢复冷却完成即出招。</p>
                <div class="WG_auto_first_round_columns">
                  <section class="WG_auto_first_round_column">
                    <div class="WG_auto_first_round_column_title">首轮顺序</div>
                    <div class="WG_auto_first_round_list WG_auto_first_round_selected" role="list" aria-label="首轮出招顺序"></div>
                  </section>
                  <section class="WG_auto_first_round_column">
                    <div class="WG_auto_first_round_column_title">当前可用招式</div>
                    <div class="WG_auto_first_round_list WG_auto_first_round_available"></div>
                  </section>
                </div>
                <footer class="WG_auto_first_round_footer">
                  <button class="WG_auto_first_round_button WG_auto_first_round_clear" type="button">清空</button>
                  <button class="WG_auto_first_round_button WG_auto_first_round_save" type="button">保存</button>
                </footer>
              </section>
            </div>
            <button class="WG_floating_toggle" type="button" aria-expanded="false">打开插件</button>
            <section class="WG_floating_panel" aria-label="WSMUD 插件面板">
              <div class="WG_floating_header">
                <span>WSMUD 助手</span>
                <button class="WG_floating_close" type="button" aria-label="收起插件面板">×</button>
              </div>
              <div class='WG_log'>
                    <pre></pre>
              </div>` +
          (e = legacy.renderActionButtons()) +
          `</section>`
        );
      },
    });
  });
})(window);
