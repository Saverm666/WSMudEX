/** Decide whether a game host uses the replacement client or overlay plugins. */
(function registerPageLoadPlan(global) {
  'use strict';

  function normalizeHost(hostname) {
    return String(hostname || '').toLowerCase();
  }

  function hostMatches(hostname, domain) {
    const host = normalizeHost(hostname);
    return host === domain || host.endsWith('.' + domain);
  }

  function isSupportedGameHost(hostname) {
    return (
      hostMatches(hostname, 'wsmud2.com') ||
      hostMatches(hostname, 'wsmud2.cn') ||
      hostMatches(hostname, 'wxmud1.com')
    );
  }

  function shouldReplaceGameClient(hostname) {
    return (
      hostMatches(hostname, 'wsmud2.com') || hostMatches(hostname, 'wsmud2.cn')
    );
  }

  function selectPageScripts(hostname, scripts) {
    const list = Array.isArray(scripts) ? scripts.slice() : [];
    if (shouldReplaceGameClient(hostname)) return list;
    return list.filter(function (scriptPath) {
      return String(scriptPath || '').indexOf('client/') !== 0;
    });
  }

  const api = {
    isSupportedGameHost: isSupportedGameHost,
    shouldReplaceGameClient: shouldReplaceGameClient,
    selectPageScripts: selectPageScripts,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  global.WSMudPageLoadPlan = api;
  if (typeof window === 'object' && window && window !== global) {
    window.WSMudPageLoadPlan = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
