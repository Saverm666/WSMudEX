/** Adapt overlay hosts that keep their own game client. */
(function registerNativeClientCompat(global) {
  'use strict';

  function isBinaryHandshake(text) {
    return typeof text === 'string' && text.indexOf('#binary') === 0;
  }

  function recoverCookieAfterHandshake(cookieBefore, sentText, cookieAfter) {
    if (!isBinaryHandshake(sentText)) return cookieAfter;
    if (cookieBefore === undefined && cookieAfter === sentText) return undefined;
    return cookieAfter;
  }

  function isBinaryPayload(data) {
    return (
      (typeof ArrayBuffer === 'function' && data instanceof ArrayBuffer) ||
      (typeof Uint8Array === 'function' && data instanceof Uint8Array)
    );
  }

  function materializeSocketMessage(msg, decodeBinary) {
    if (!msg || !isBinaryPayload(msg.data) || typeof decodeBinary !== 'function') {
      return msg;
    }
    const decoded = decodeBinary(msg.data);
    if (!decoded) return msg;
    return { data: JSON.stringify(decoded) };
  }

  function decodeBinary(data) {
    const protocol =
      global.WSMudBinaryProtocol ||
      (typeof window === 'object' && window && window.WSMudBinaryProtocol);
    if (!protocol || typeof protocol.decodeBinaryMessage !== 'function') {
      return null;
    }
    return protocol.decodeBinaryMessage(data);
  }

  function install(target) {
    const host = target || global;
    if (!host || host.WSMudNativeClientCompatInstalled) return false;
    const WG = host.WG;
    if (WG && typeof WG.receive_message === 'function') {
      const originalReceive = WG.receive_message;
      WG.receive_message = function (msg) {
        return originalReceive.call(
          this,
          materializeSocketMessage(msg, decodeBinary),
        );
      };
    }
    const Socket = host.WebSocket;
    if (Socket && Socket.prototype && typeof Socket.prototype.send === 'function') {
      const originalSend = Socket.prototype.send;
      Socket.prototype.send = function (text) {
        const cookieBefore = host.G ? host.G.cookie : undefined;
        const result = originalSend.call(this, text);
        if (host.G) {
          host.G.cookie = recoverCookieAfterHandshake(
            cookieBefore,
            text,
            host.G.cookie,
          );
        }
        return result;
      };
    }
    host.WSMudNativeClientCompatInstalled = true;
    return true;
  }

  const api = {
    isBinaryHandshake: isBinaryHandshake,
    recoverCookieAfterHandshake: recoverCookieAfterHandshake,
    materializeSocketMessage: materializeSocketMessage,
    install: install,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  global.WSMudNativeClientCompat = api;
  if (typeof window === 'object' && window && window !== global) {
    window.WSMudNativeClientCompat = api;
  }
  if (typeof window === 'object' && window) {
    install(window);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
