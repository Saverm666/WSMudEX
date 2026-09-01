from pathlib import Path

from playwright.sync_api import sync_playwright


EXTENSION_ROOT = Path(__file__).resolve().parents[1]


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.route(
        "http://test.local/**",
        lambda route: route.fulfill(
            status=200,
            content_type="text/html",
            body="<main><div class='right-bar'></div></main>",
        ),
    )
    page.goto("http://test.local/")
    page.wait_for_load_state("networkidle")
    page.add_script_tag(path=EXTENSION_ROOT / "vendor/jquery-3.7.1.js")
    page.add_script_tag(path=EXTENSION_ROOT / "features/plugin/core.js")
    page.add_script_tag(path=EXTENSION_ROOT / "features/plugin/plugin-settings.js")
    page.evaluate(
        """
        () => {
          window.G = { auto_preform: false, skills: [] };
          window.WG = {
            getQuickLoadoutNames: () => ["", "", ""],
            resetQuickLoadoutNames: () => {},
            resetActionLoadoutConfig: () => {},
            rememberActionBarButtons: () => [],
            getActionLoadoutConfig: () => ({ buttons: {} }),
            closeEquipmentPicker: () => {},
          };
          window.WSMudPlugin.installFeatures({
            WG: window.WG,
            G: window.G,
            legacy: {},
          });
          window.WG.initPluginSettings();
          window.WG.openPluginSettings();
        }
        """
    )

    toggle = page.get_by_role(
        "switch", name="每次打开自动尝试请安", exact=True
    )
    toggle.wait_for(state="visible")
    assert toggle.get_attribute("aria-checked") == "true"

    toggle.click()
    assert toggle.get_attribute("aria-checked") == "false"
    assert page.evaluate(
        "JSON.parse(localStorage.getItem('WG_plugin_feature_flags_v1')).autoGreetOnOpen"
    ) is False

    page.evaluate("WG.closePluginSettings(); WG.openPluginSettings();")
    toggle = page.get_by_role(
        "switch", name="每次打开自动尝试请安", exact=True
    )
    assert toggle.get_attribute("aria-checked") == "false"

    toggle.click()
    assert page.evaluate("WG.isPluginFeatureEnabled('autoGreetOnOpen')") is True
    browser.close()

print("验证通过：自动请安开关默认开启、可切换并持久化。")
