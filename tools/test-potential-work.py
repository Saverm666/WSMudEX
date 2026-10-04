"""Exercise loaded navigation and upstream state wiring in headless Chromium."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
upstream = (ROOT / 'features/upstream-automation.js').read_text()
marker = 'WG.add_hook("state", function (data) {'
start = upstream.index(marker) + len(marker)
state_handler = upstream[start:upstream.index('\n            });', start)]
routes = re.search(r'var place = (\{[\s\S]*?\n    \});', upstream).group(1)
go_start = upstream.index('        go: async function (p) {')
navigation = upstream[go_start:upstream.index('        getIdByName:', go_start)]
send_start = upstream.index('        SendCmd: async function (cmd) {')
send_method = upstream[send_start:upstream.index('        sleep:', send_start)]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        page.route('http://test.local/**', lambda r: r.fulfill(
            content_type='text/html', body='<main><div class="room-name">广场</div><div class="content-message"></div><div class="WG_log"><pre></pre></div></main>'))
        page.goto('http://test.local/')
        page.wait_for_load_state('networkidle')
        page.clock.install()
        page.add_script_tag(path=ROOT / 'vendor/jquery-3.7.1.js')
        page.add_script_tag(path=ROOT / 'client/core.js')
        page.add_script_tag(path=ROOT / 'client/modules/message-queue.js')
        page.evaluate('''() => {
          const process = {};
          const dialog = {extend: {message_filter: () => false, trigger() {}}};
          const messaging = WSMudClient.createModule('message-queue', {
            jquery: jQuery, isMobile: () => false, hostWindow: window,
            getDialog: () => dialog, getProcess: () => process,
          });
          process.message = messaging.MessageQueue.create(jQuery('.content-message'));
          window.ReceiveMessage = messaging.ReceiveMessage;
          window.hooks = new Map(); window.nextHook = 0;
          window.commands = []; window.travels = []; window.activityItems = [];
          window.G = {connected: true, room_name: '广场'};
          window.Setting = {auto_work: false};
          window.emit = event => {
            if (event.type === 'room') {
              G.room_name = event.name;
              jQuery('.room-name').text(event.name);
            }
            for (const [id, hook] of [...hooks])
              if (hooks.has(id) && [hook.type].flat().includes(event.type)) hook.fn(event);
          };
          window.WG = {
            online: true, silentResponseMatchers: [],
            syncDashboardAfterSkillProgress() {}, updateSideDashboard() {},
            add_hook(type, fn) {const id = nextHook++; hooks.set(id, {type, fn}); return id;},
            remove_hook(id) {hooks.delete(id);},
            suppressNextResponse(matcher) {this.silentResponseMatchers.push({matcher});},
            deserializePackData: data => data,
            sleep: () => Promise.resolve(),
            Send(command) {
              commands.push(command);
              if (command === 'jh fam 0 start') window.routeBuffer = [];
              if (command === 'jh fam 0 start' || command.startsWith('go ')) {
                routeBuffer.push(command);
                const target = Object.keys(workRoutes).find(name => workRoutes[name] === routeBuffer.join(';'));
                if (target) {
                  travels.push(target);
                  if (!window.dropArrival) setTimeout(() => emit({type: 'room', name: target.split('-').pop()}), 1000);
                }
              }
              if (command === 'events' && !window.dropEvents)
                emit({type: 'dialog', dialog: 'events', items: activityItems});
              if (command.includes('stopstate')) emit({type: 'state'});
              if (command.includes('pack')) emit({type: 'dialog', dialog: 'pack',
                items: [{id: 'rod', name: '钓鱼竿'}, {name: '鱼饵', count: 10}],
                eqs: [{name: '铁镐'}]});
              const states = {wa: '挖矿', cai: '采药', diao: '钓鱼'};
              if (states[command]) emit({type: 'state', state: states[command]});
            },
            SendCmd() {},
          };
          window.GM_getValue = (_key, fallback) => fallback;
          window.roleid = 'test'; window.statehml = '';
          const services = new Map();
          window.WSMudPlugin = {
            registerService(name, create) {services.set(name, create);},
            createService(name) {return services.get(name)({});},
            registerFeature(_name, install) {
            install({WG, G, UI: {}, legacy: {isTransportAvailable: () => true},
              messageAppend: text => jQuery('.WG_log pre').append(text)});
          }};
        }''')
        page.evaluate('''(source) => {
          const place = new Function('return (' + source.routes + ')')();
          window.workRoutes = Object.fromEntries(['扬州城-药林', '扬州城-江边', '扬州城-矿山'].map(name => [name, place[name]]));
          Object.assign(WG, new Function('place', 'needfind', 'saveAddr',
            'return ({' + source.navigation + '})')(place, {}, '关'));
          Object.assign(WG, new Function('return ({' + source.send + '})')());
        }''', {'routes': routes, 'navigation': navigation, 'send': send_method})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_script_tag(path=ROOT / 'features/plugin/pack-data-codec.js')
        page.add_script_tag(path=ROOT / 'features/plugin/protocol-compatibility.js')
        page.add_script_tag(path=ROOT / 'features/plugin/navigation-enhancements.js')
        page.evaluate('(body) => WG.add_hook("state", new Function("data", body))', state_handler)
        page.evaluate('''() => {
          activityItems = [['mine', '挖矿指南', '获得经验+20。'],
                           ['herb', '药王新篇', '三转巅峰成为了新任药王谷谷主，采药获得的经验+40。']];
          WG.zdwk();
        }''')
        assert not page.evaluate("commands.includes('cai')")
        assert page.evaluate("commands.includes('go south')")
        page.clock.run_for(1100)
        page.wait_for_function("commands.includes('cai')")
        assert page.evaluate('travels.at(-1)') == '扬州城-药林'
        assert page.evaluate('G.potentialWorkCurrentId') == 'herbalism'
        assert '智能挂机选择采药（活动额外 +40 潜能/10秒）' in page.locator('.content-message').inner_text()
        assert page.locator('.WG_log pre').inner_text() == ''
        # A newly stronger event changes destination on the five-second check.
        page.evaluate("activityItems = [['fish', '钓鱼', '获得潜能+60。']]")
        page.clock.fast_forward(5000)
        page.clock.run_for(1100)
        page.wait_for_function("commands.includes('diao')")
        assert page.evaluate('travels.at(-1)') == '扬州城-江边'
        # Equal bonuses, including all-zero, keep the current destination.
        before = page.evaluate('travels.length')
        message_before = page.locator('.content-message').inner_text()
        page.evaluate("activityItems = []")
        page.clock.fast_forward(5000)
        page.clock.run_for(1100)
        assert page.evaluate('travels.length') == before
        assert page.locator('.content-message').inner_text() == message_before
        # Mining uses its real equipment/arrival workflow as well.
        page.evaluate("activityItems = [['mine', '挖矿指南', '获得经验+80。']]")
        page.clock.fast_forward(5000)
        page.wait_for_function("commands.includes('wa')")
        assert page.evaluate('travels.at(-1)') == '扬州城-矿山'
        assert page.evaluate('G.potentialWorkCurrentId') == 'mining'
        before = page.evaluate('travels.length')
        # Lost responses keep current work; a stop cancels the pending hook/timer.
        page.evaluate('dropEvents = true')
        page.clock.fast_forward(5000)
        assert page.evaluate('G.potentialWorkSelectionPending') is True
        page.clock.fast_forward(5000)
        assert page.evaluate('travels.length') == before
        page.evaluate("emit({type: 'state'})")
        count = page.evaluate('commands.length')
        page.clock.fast_forward(15000)
        assert page.evaluate('commands.length') == count
        assert page.evaluate('G.potentialWorkCurrentId === undefined && !G.potentialWorkSelectionPending')
        # Exercise cleanup prefixes from the actual socket/login callbacks.
        close_start = upstream.index('ws.onclose = (e) => {') + len('ws.onclose = (e) => {')
        close_body = upstream[close_start:upstream.index('auto_relogin =', close_start)]
        login_start = upstream.index('case "login":') + len('case "login":')
        login_body = upstream[login_start:upstream.index('if (shouldGreetChief', login_start)]
        for body, event in [(close_body, {}), (login_body, {'id': 'new-role'})]:
            page.evaluate('''() => {
              G.connected = true; WG.online = true;
              emit({type: 'state', state: '挖矿'});
            }''')
            assert page.evaluate('G.potentialWorkSelectionPending') is True
            page.evaluate('(args) => new Function("data", args.body)(args.event)',
                          {'body': body, 'event': event})
            assert page.evaluate('!G.potentialWorkSelectionPending && G.potentialWorkCurrentId === undefined')
        page.evaluate('''() => {
          G.connected = true; WG.online = true; dropArrival = true;
          emit({type: 'room', name: '广场'});
          WG.startPreparedPotentialWork({id: 'herbalism', name: '采药', bonus: 40});
        }''')
        cai_count = page.evaluate("commands.filter(command => command === 'cai').length")
        page.clock.run_for(9000)
        assert page.evaluate("commands.filter(command => command === 'cai').length") == cai_count
        assert '未能到达扬州城-药林，未开始采药' in page.locator('.content-message').inner_text()
        page.evaluate("() => { WG.startPreparedPotentialWork({id: 'herbalism', name: '采药', bonus: 40}); }")
        assert page.evaluate('typeof G.potentialWorkArrivalCancel') == 'function'
        page.evaluate("emit({type: 'state'}); emit({type: 'room', name: '药林'})")
        page.clock.run_for(9000)
        assert page.evaluate("commands.filter(command => command === 'cai').length") == cai_count
        assert page.evaluate('G.potentialWorkArrivalCancel === undefined')
        assert not errors, errors
        print('验证通过：实际上游路线表、go/at/SendCmd、到达后开工、正文提示、协议兼容层、活动选择及生命周期清理。')
    finally:
        browser.close()
