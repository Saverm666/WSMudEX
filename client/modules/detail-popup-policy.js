/** Classify detail-popup commands and filter unsafe public-text responses. */
(function registerDetailPopupPolicy(global) {
  "use strict";

  function normalizeCommand(command) {
    return String(command || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function describePopupDetailCommand(command) {
    const normalized = normalizeCommand(command);
    if (!normalized) return null;
    let match = normalized.match(/^checkskill\s+(\S+)(?:\s+(\S+))?$/);
    if (match) {
      const id = match[1];
      const from = match[2];
      if (!from) {
        return {
          command: normalized,
          kind: "skill",
          id: id,
          expectedDialog: "skills",
        };
      }
      if (from === "help" || /^\d+$/.test(from)) {
        return {
          command: normalized,
          kind: "text-detail",
          id: id,
          textType: "skill-help",
        };
      }
      return {
        command: normalized,
        kind: "skill",
        id: id,
        expectedDialog: "master",
        from: from,
      };
    }
    match = normalized.match(/^(?:dc\s+\S+\s+)?checkobj\s+(\S+)\s+from\s+(\S+)$/);
    if (match) {
      return {
        command: normalized,
        kind: "pack-item",
        id: match[1],
        from: match[2],
      };
    }
    if (
      /^stats\s+(?:top|score|exp|mp|money)(?:\s+\S+)?\s+\d+$/.test(normalized)
    ) {
      return {
        command: normalized,
        kind: "ranking-character",
      };
    }
    match = normalized.match(/^look3\s+(\d+)\s+of\s+(fb_\d+)$/);
    if (match) {
      return {
        command: normalized,
        kind: "text-detail",
        id: match[2] + "#" + match[1],
        textType: "jianghu-loot",
      };
    }
    return null;
  }

  function isPopupDetailCommand(command) {
    return Boolean(describePopupDetailCommand(command));
  }

  function matchesSkillDetailDialog(pending, data) {
    if (data.dialog == pending.expectedDialog) return true;
    return pending.expectedDialog == "master" && data.dialog == "skills";
  }

  function resolveSkillDetailOwnerKind(pending, data) {
    if (
      (pending && pending.expectedDialog == "master") ||
      (data && data.dialog == "master")
    ) {
      return "master";
    }
    return "skills";
  }

  function matchesDetailPopupData(pending, data) {
    if (!pending || !data) return false;
    if (pending.kind == "skill") {
      return (
        matchesSkillDetailDialog(pending, data) &&
        data.id != null &&
        String(data.id) == String(pending.id) &&
        typeof data.desc == "string" &&
        data.desc.length > 0
      );
    }
    if (pending.kind == "pack-item") {
      return (
        data.dialog == "pack" &&
        data.desc != null &&
        data.id == pending.id
      );
    }
    if (pending.kind == "ranking-character") {
      return (
        (data.type == "item" && data.desc != null) ||
        (data.dialog == "score" && data.name)
      );
    }
    if (pending.kind == "text-detail") {
      if (typeof data.desc != "string" || !data.desc.length) return false;
      if (pending.textType == "skill-help") {
        return (
          (data.dialog == "skills" || data.dialog == "master") &&
          data.id != null &&
          String(data.id) == String(pending.id)
        );
      }
      return data.type == "item";
    }
    return false;
  }

  function stripTags(text) {
    return String(text || "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function classifyDetailText(message) {
    const text = String(message || "");
    const plain = stripTags(text);
    if (
      /等级提升了/.test(text) ||
      /你吞下一粒/.test(text) ||
      /潜能不够/.test(text) ||
      /好像没什么效果/.test(text) ||
      /你还没有学会可以突破的技能/.test(text) ||
      /似乎有些心得/.test(plain) ||
      /你开始练习/.test(plain) ||
      /你正在练习/.test(plain) ||
      /加入练习队列/.test(plain) ||
      /你开始认真研读/.test(plain) ||
      /你听了/.test(plain) ||
      /预计耗时/.test(plain) ||
      /点击练习其他武功/.test(plain)
    ) {
      return "ignore";
    }
    if (/没有这个|没有这件|你要看什么/.test(plain)) return "error";
    if (plain.length < 12) return "ignore";
    if (/<[a-z]{2,4}>/i.test(text)) return "accept";
    if (text.indexOf("\n") >= 0 && plain.length >= 20) return "accept";
    if (plain.length >= 40) return "accept";
    return "ignore";
  }

  function isDialogPanelPayload(data) {
    if (!data || !data.dialog) return false;
    if (
      data.dialog == "pack" ||
      data.dialog == "skills" ||
      data.dialog == "master"
    ) {
      return Array.isArray(data.items);
    }
    return true;
  }

  const api = {
    normalizeCommand: normalizeCommand,
    describePopupDetailCommand: describePopupDetailCommand,
    isPopupDetailCommand: isPopupDetailCommand,
    matchesDetailPopupData: matchesDetailPopupData,
    resolveSkillDetailOwnerKind: resolveSkillDetailOwnerKind,
    classifyDetailText: classifyDetailText,
    isDialogPanelPayload: isDialogPanelPayload,
    textDetailTimeout: 2500,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (global.WSMudClient && typeof global.WSMudClient.registerModule === "function") {
    global.WSMudClient.registerModule("detail-popup-policy", function () {
      return api;
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
