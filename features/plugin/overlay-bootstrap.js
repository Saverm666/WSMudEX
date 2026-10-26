/** Gate the site's optional legacy WG runtime before its SPA starts loading it. */
(function prepareOverlay(global) {
  'use strict';
  if (!global.location || !/(^|\.)wxmud1\.com$/i.test(global.location.hostname)) return;
  if (global.WSMudOverlayBootstrapInstalled) return;
  global.__wsmud2Plugin = global.__wsmud2Plugin || {
    version: '', enabled: false, loading: false, ready: false,
    loaded: [], excluded: [], error: '',
  };
  Object.defineProperty(global.__wsmud2Plugin, 'enabled', {
    configurable: true,
    get: function () { return false; },
    set: function () {},
  });
  // The SPA handles toolbar clicks at window capture and stops propagation.
  // Reserve an earlier handler so our added entries can reach their runtime.
  global.addEventListener('click', function (event) {
    if (typeof global.WSMudOverlayHandleClick === 'function') global.WSMudOverlayHandleClick(event);
  }, true);
  global.WSMudOverlayBootstrapInstalled = true;
})(window);
