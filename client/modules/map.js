(function registerMapModule(global) {
  "use strict";

  global.WSMudClient.registerModule("map", function create(context) {
    const $ = context.jquery;
    const document = context.documentRef || global.document;
    const timers = context.timers || global;
    const getProcess = context.getProcess;
    const sendCommand = function (command) {
      return context.getSendCommand()(command);
    };
    const isFeatureEnabled = function (feature) {
      return context.isFeatureEnabled(feature);
    };
    const isTopPopupLayer = function (element) {
      return context.isTopPopupLayer(element);
    };
    const setTimeout = function (callback, delay) {
      return timers.setTimeout(callback, delay);
    };
    const clearTimeout = function (handle) {
      return timers.clearTimeout(handle);
    };
    const pendingAdvanceTimers = new Set();

    function scheduleRouteAdvance() {
      let handle;
      handle = setTimeout(function () {
        pendingAdvanceTimers.delete(handle);
        MAP.AdvanceAutoRoute();
      }, 80);
      pendingAdvanceTimers.add(handle);
      return handle;
    }

    function clearRouteAdvanceTimers() {
      for (const handle of pendingAdvanceTimers) clearTimeout(handle);
      pendingAdvanceTimers.clear();
    }

function CreateHeadPanel(_0x25060e) {
  var _0x38c632 = ['<div class="title">'];
  _0x38c632.push(_0x25060e.name);
  _0x38c632.push('</div><div><span>气血： </span><div class="progress">');
  _0x38c632.push('<div class="progress-bar" style="width:');
  _0x38c632.push((_0x25060e.hp * 100) / _0x25060e.max_hp);
  _0x38c632.push(
    '%; background-color: #800000;"></div><span class="progress-text">',
  );
  _0x38c632.push(_0x25060e.hp);
  _0x38c632.push(" / ");
  _0x38c632.push(_0x25060e.max_hp);
  _0x38c632.push(
    '</span></div></div><div><span>内力： </span><div class="progress"><div style="width:',
  );
  _0x38c632.push((_0x25060e.mp * 100) / _0x25060e.max_mp);
  _0x38c632.push(
    '%; background-color: #000080;"></div><span class="progress-text">',
  );
  _0x38c632.push(_0x25060e.mp);
  _0x38c632.push(" / ");
  _0x38c632.push(_0x25060e.max_mp);
  _0x38c632.push("</span></div></div><div></div>");
  return _0x38c632.join("");
}
var MAP = {
  DIRS: [
    "west",
    "north",
    "south",
    "east",
    "northwest",
    "southwest",
    "northeast",
    "southeast",
    "down",
    "up",
    "westdown",
    "northdown",
    "southdown",
    "eastdown",
    "westup",
    "northup",
    "southup",
    "eastup",
    "enter",
    "out",
  ],
  REG: /<(\w+)>(.+)<\/\w+>/,
  CreateExitsMap: function (_0x9681a7, _0x2dab1d, _0x9ae701) {
    var _0x559f64 = _0x9ae701.split("-");
    if (_0x559f64.length > 1) {
      _0x9ae701 = _0x559f64[_0x559f64.length - 1];
    }
    _0x9ae701 = _0x9ae701.replace(/\(.*?\)/, "");
    var _0x53d181 = 30;
    var _0x2295d6 = 70;
    var _0x860af7 = 60;
    var _0x50c8e1 = 20;
    var _0x1863e0 = _0x53d181 + 10;
    var _0x3fe7db = (_0x2dab1d - _0x860af7) / 2;
    var _0x35f46d = 10;
    var _0x34c907 = {};
    if (_0x9681a7.north && _0x9681a7.up) {
      _0x9681a7.north_2 = _0x9681a7.up;
      delete _0x9681a7.up;
    }
    if (_0x9681a7.south && _0x9681a7.down) {
      _0x9681a7.south_2 = _0x9681a7.down;
      delete _0x9681a7.down;
    }
    for (var _0x51a2c8 in _0x9681a7) {
      if (
        _0x51a2c8.indexOf("south") > -1 ||
        _0x51a2c8 == "down" ||
        _0x51a2c8 == "out"
      ) {
        _0x34c907.s = true;
      } else if (
        _0x51a2c8.indexOf("north") > -1 ||
        _0x51a2c8 == "up" ||
        _0x51a2c8 == "enter"
      ) {
        _0x34c907.n = true;
      }
    }
    if (_0x34c907.s) {
      _0x1863e0 += _0x53d181;
    }
    if (_0x34c907.n) {
      _0x1863e0 += _0x53d181;
      _0x35f46d += _0x53d181;
    }
    var _0xd16524 = [];
    _0xd16524.push(
      '<svg style="margin-left:-2em" height="' +
        _0x1863e0 +
        '" width="' +
        _0x2dab1d +
        '">',
    );
    _0xd16524.push(
      '<rect x="' +
        _0x3fe7db +
        '" y="' +
        _0x35f46d +
        '"  fill="dimgrey" stroke-width="1" stroke="gray" ',
    );
    _0xd16524.push(
      'width="' + _0x860af7 + '" height="' + _0x50c8e1 + '"></rect>',
    );
    _0xd16524.push(
      ' <text x="' +
        (_0x3fe7db + 30) +
        '" y="' +
        (_0x35f46d + 14) +
        '"  text-anchor="middle" style="font-size:12px;" ',
    );
    this.pushName(_0xd16524, _0x9ae701, true);
    for (var _0x51a2c8 in _0x9681a7) {
      var _0x4575ce;
      var _0x22e66e;
      var _0x26dbc9;
      switch (_0x51a2c8) {
        case "west":
        case "westup":
        case "westdown":
          _0x4575ce = [
            _0x3fe7db - (_0x2295d6 - _0x860af7),
            _0x35f46d + _0x50c8e1 / 2,
          ];
          _0x22e66e = [_0x3fe7db, _0x35f46d + _0x50c8e1 / 2];
          _0x26dbc9 = [_0x3fe7db - _0x2295d6, _0x35f46d];
          break;
        case "east":
        case "eastup":
        case "eastdown":
          _0x4575ce = [_0x3fe7db + _0x860af7, _0x35f46d + _0x50c8e1 / 2];
          _0x22e66e = [_0x3fe7db + _0x2295d6, _0x35f46d + _0x50c8e1 / 2];
          _0x26dbc9 = [_0x3fe7db + _0x2295d6, _0x35f46d];
          break;
        case "south":
        case "southup":
        case "southdown":
        case "down":
          _0x4575ce = [_0x3fe7db + _0x860af7 / 2, _0x35f46d + _0x50c8e1];
          _0x22e66e = [_0x3fe7db + _0x860af7 / 2, _0x35f46d + _0x53d181];
          _0x26dbc9 = [_0x3fe7db, _0x35f46d + _0x53d181];
          break;
        case "north":
        case "northup":
        case "northdown":
        case "up":
          _0x4575ce = [_0x3fe7db + _0x860af7 / 2, _0x35f46d];
          _0x22e66e = [
            _0x3fe7db + _0x860af7 / 2,
            _0x35f46d - (_0x53d181 - _0x50c8e1),
          ];
          _0x26dbc9 = [_0x3fe7db, _0x35f46d - _0x53d181];
          break;
        case "northwest":
          _0x4575ce = [
            _0x3fe7db - _0x2295d6 + _0x860af7,
            _0x35f46d - _0x53d181 + _0x50c8e1,
          ];
          _0x22e66e = [_0x3fe7db, _0x35f46d];
          _0x26dbc9 = [_0x3fe7db - _0x2295d6, _0x35f46d - _0x53d181];
          break;
        case "northeast":
        case "north_2":
        case "enter":
          _0x4575ce = [
            _0x3fe7db + _0x2295d6,
            _0x35f46d - _0x53d181 + _0x50c8e1,
          ];
          _0x22e66e = [_0x3fe7db + _0x860af7, _0x35f46d];
          _0x26dbc9 = [_0x3fe7db + _0x2295d6, _0x35f46d - _0x53d181];
          break;
        case "southeast":
        case "south_2":
          _0x4575ce = [_0x3fe7db + _0x2295d6, _0x35f46d + _0x53d181];
          _0x22e66e = [_0x3fe7db + _0x860af7, _0x35f46d + _0x50c8e1];
          _0x26dbc9 = [_0x3fe7db + _0x2295d6, _0x35f46d + _0x53d181];
          break;
        case "southwest":
        case "out":
          _0x4575ce = [
            _0x3fe7db - _0x2295d6 + _0x860af7,
            _0x35f46d + _0x53d181,
          ];
          _0x22e66e = [_0x3fe7db, _0x35f46d + _0x50c8e1];
          _0x26dbc9 = [_0x3fe7db - _0x2295d6, _0x35f46d + _0x53d181];
          break;
      }
      var _0xdb76e7 = _0x9681a7[_0x51a2c8];
      if (_0x51a2c8 == "south_2") {
        _0x51a2c8 = "down";
      } else if (_0x51a2c8 == "north_2") {
        _0x51a2c8 = "up";
      }
      _0xd16524.push(
        '<rect x="' +
          _0x26dbc9[0] +
          '" y="' +
          _0x26dbc9[1] +
          '" dir="' +
          _0x51a2c8 +
          '" fill="#232323" stroke-width="1" stroke="gray" ',
      );
      _0xd16524.push(
        'width="' + _0x860af7 + '" height="' + _0x50c8e1 + '"></rect>',
      );
      _0xd16524.push(
        ' <text x="' +
          (_0x26dbc9[0] + 30) +
          '" y="' +
          (_0x26dbc9[1] + 14) +
          '" dir="' +
          _0x51a2c8 +
          '" text-anchor="middle" style="font-size:12px;"',
      );
      this.pushName(_0xd16524, _0xdb76e7, false);
      if (_0x4575ce) {
        _0xd16524.push('<line  stroke="gray" ');
        _0xd16524.push(
          " x1='" +
            _0x4575ce[0] +
            "' y1='" +
            _0x4575ce[1] +
            "' x2='" +
            _0x22e66e[0] +
            "' y2='" +
            _0x22e66e[1] +
            "'",
        );
        if (_0x51a2c8.indexOf("up") > -1 || _0x51a2c8.indexOf("down") > -1) {
          _0xd16524.push(" stroke-dasharray='5,5'");
          _0xd16524.push(" stroke-width='10'");
        } else {
          _0xd16524.push(" stroke-width='1'");
        }
        _0xd16524.push("></line >");
      }
    }
    _0xd16524.push("</svg>");
    return _0xd16524.join("");
  },
  colors: {
    hig: "#00FF00",
    hir: "#FF0000",
    him: "#FF00FF",
    hic: "#00FFFF",
    hiy: "#FFFF00",
    red: "#800000",
    wht: "#C0C0C0",
    mag: "#800080",
    red: "#800000",
    hiw: "#FFFFFF",
    gre: "#008000",
    blu: "#000080",
    hib: "#0000FF",
  },
  GetColor: function (_0x2e8308, _0x5c1b01) {
    return this.colors[_0x2e8308.toLowerCase()] || "dimgrey";
  },
  EnsureModal: function () {
    var modal = $(".WG_map_modal");
    if (modal.length) {
      return modal;
    }
    modal = $(
      '<div class="WG_map_modal" hidden aria-hidden="true">' +
        '<section class="WG_map_modal_dialog" role="dialog" aria-modal="true" aria-labelledby="WG_map_modal_title">' +
        '<header class="WG_map_modal_header">' +
        '<span class="WG_map_modal_icon glyphicon glyphicon-map-marker" aria-hidden="true"></span>' +
        '<span class="WG_map_modal_title" id="WG_map_modal_title">地图</span>' +
        '<span class="WG_map_route_status" aria-live="polite">点击地点自动寻路</span>' +
        '<button class="WG_map_modal_close" type="button" aria-label="关闭地图">×</button>' +
        "</header>" +
        '<div class="WG_map_modal_viewport"></div>' +
        "</section>" +
        "</div>",
    ).appendTo($(".container").first());
    modal.find(".WG_map_modal_viewport").append($(".map-panel").first());
    modal.on("click.WG_map_modal", function (event) {
      if (event.target === this) {
        MAP.CloseModal();
      }
    });
    modal.on("click.WG_map_modal", ".WG_map_modal_close", function () {
      MAP.CloseModal();
    });
    modal.on(
      "click.WG_map_route",
      ".map-room, .map-room-label",
      function (event) {
        event.preventDefault();
        MAP.StartAutoRoute($(this).attr("data-room-id") || $(this).attr("rm"));
      },
    );
    modal.on("keydown.WG_map_route", ".map-room", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        MAP.StartAutoRoute($(this).attr("data-room-id") || $(this).attr("rm"));
      }
    });
    $(document)
      .off("keydown.WG_map_modal")
      .on("keydown.WG_map_modal", function (event) {
        if (
          event.key === "Escape" &&
          MAP.IsShow &&
          isTopPopupLayer($(".WG_map_modal"))
        ) {
          MAP.CloseModal();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      });
    return modal;
  },
  UpdateModalTitle: function () {
    var roomName = this.Room && this.Room.name ? this.Room.name : "地图";
    var separatorIndex = roomName.indexOf("-");
    if (separatorIndex > -1) {
      roomName = roomName.substr(0, separatorIndex);
    }
    $(".WG_map_modal_title").html(roomName || "地图");
  },
  OpenModal: function () {
    var modal = this.EnsureModal();
    if (!this.IsShow) {
      this.LastFocus = document.activeElement;
    }
    this.IsShow = true;
    this.UpdateModalTitle();
    modal.prop("hidden", false).attr("aria-hidden", "false");
    modal.find(".map-panel").stop(true, true).show();
    $("body").addClass("WG_map_modal_open");
    $(".room-title>.map-icon").attr("aria-expanded", "true");
    modal.find(".WG_map_modal_close").trigger("focus");
    return modal;
  },
  CloseModal: function () {
    var modal = $(".WG_map_modal");
    if (!modal.length || !this.IsShow) {
      return;
    }
    this.IsShow = false;
    modal.prop("hidden", true).attr("aria-hidden", "true");
    $("body").removeClass("WG_map_modal_open");
    $(".room-title>.map-icon").attr("aria-expanded", "false");
    var focusTarget = this.LastFocus;
    this.LastFocus = null;
    if (focusTarget && document.contains(focusTarget)) {
      $(focusTarget).trigger("focus");
    } else {
      $(".room-title>.map-icon").trigger("focus");
    }
  },
  PlainRoomName: function (name) {
    var plain = String(name || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\([^)]*\)/g, "")
      .trim();
    var separatorIndex = plain.lastIndexOf("-");
    return (separatorIndex > -1 ? plain.substr(separatorIndex + 1) : plain).trim();
  },
  EscapeAttribute: function (value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&#39;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
  BuildRouteGraph: function (rooms) {
    var graph = { nodes: {}, adjacency: {}, hasSpecial: false, invalid: false };
    var positions = {};
    if (!rooms || !rooms.length) {
      graph.invalid = true;
      return graph;
    }
    for (var index = 0; index < rooms.length; index++) {
      var room = rooms[index];
      if (!room || !room.id || !room.p || room.p.length < 2) {
        graph.invalid = true;
        return graph;
      }
      var positionKey = room.p[0] + "," + room.p[1];
      if (graph.nodes[room.id] || positions[positionKey]) {
        graph.invalid = true;
        return graph;
      }
      graph.nodes[room.id] = room;
      graph.adjacency[room.id] = [];
      positions[positionKey] = room.id;
    }
    var vectors = {
      w: [-1, 0, "west", "east"],
      e: [1, 0, "east", "west"],
      n: [0, -1, "north", "south"],
      s: [0, 1, "south", "north"],
      nw: [-1, -1, "northwest", "southeast"],
      ne: [1, -1, "northeast", "southwest"],
      sw: [-1, 1, "southwest", "northeast"],
      se: [1, 1, "southeast", "northwest"],
    };
    var addEdge = function (from, to, heading, elevated) {
      var edges = graph.adjacency[from];
      for (var edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
        if (edges[edgeIndex].to === to && edges[edgeIndex].heading === heading) {
          return;
        }
      }
      edges.push({ from: from, to: to, heading: heading, elevated: elevated });
    };
    var exitPattern = /^([a-z]{1,2})(\d+)?([dl])?$/;
    for (var roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      var source = rooms[roomIndex];
      var exits = source.exits || [];
      for (var exitIndex = 0; exitIndex < exits.length; exitIndex++) {
        var match = exitPattern.exec(exits[exitIndex]);
        var vector = match && vectors[match[1]];
        if (!match || !vector || match[3] === "l") {
          graph.hasSpecial = true;
          continue;
        }
        var distance = match[2] ? parseInt(match[2], 10) : 1;
        var targetId = positions[
          source.p[0] + vector[0] * distance + "," +
            (source.p[1] + vector[1] * distance)
        ];
        if (!targetId) {
          graph.hasSpecial = true;
          continue;
        }
        var elevated = match[3] === "d";
        addEdge(source.id, targetId, vector[2], elevated);
        addEdge(targetId, source.id, vector[3], elevated);
      }
    }
    return graph;
  },
  FindRoute: function (graph, startId, targetId) {
    if (!graph || graph.invalid || !graph.nodes[startId] || !graph.nodes[targetId]) {
      return null;
    }
    if (startId === targetId) {
      return [];
    }
    var queue = [startId];
    var visited = {};
    var previous = {};
    visited[startId] = true;
    while (queue.length) {
      var currentId = queue.shift();
      var edges = graph.adjacency[currentId] || [];
      for (var index = 0; index < edges.length; index++) {
        var edge = edges[index];
        if (visited[edge.to]) {
          continue;
        }
        visited[edge.to] = true;
        previous[edge.to] = edge;
        if (edge.to === targetId) {
          queue.length = 0;
          break;
        }
        queue.push(edge.to);
      }
    }
    if (!previous[targetId]) {
      return null;
    }
    var route = [];
    var routeId = targetId;
    while (routeId !== startId) {
      var routeEdge = previous[routeId];
      if (!routeEdge) {
        return null;
      }
      route.unshift(routeEdge);
      routeId = routeEdge.from;
    }
    return route;
  },
  SetRouteStatus: function (message, state) {
    $(".WG_map_route_status")
      .text(message || "点击地点自动寻路")
      .attr("data-state", state || "idle");
  },
  RenderAutoRoute: function () {
    if (!this.MapContent || !this.MapContent.length) {
      return;
    }
    this.MapContent
      .find(".map-room")
      .removeClass("WG_map_route_step WG_map_route_target");
    if (!this.AutoRoute) {
      return;
    }
    for (var index = this.AutoRoute.edgeIndex; index < this.AutoRoute.edges.length; index++) {
      this.MapContent
        .find(".map-room[rm='" + this.AutoRoute.edges[index].to + "']")
        .addClass("WG_map_route_step");
    }
    this.MapContent
      .find(".map-room[rm='" + this.AutoRoute.targetId + "']")
      .addClass("WG_map_route_target");
  },
  StartAutoRoute: function (targetId) {
    if (!isFeatureEnabled("mapAutoRoute")) {
      this.CancelAutoRoute();
      this.SetRouteStatus("自动寻路已在插件设置中关闭", "error");
      return;
    }
    var rooms = this.Buffer[this.CurMapID];
    var startId = getProcess().room_path;
    this.CancelAutoRoute();
    var graph = this.BuildRouteGraph(rooms);
    if (graph.invalid || !graph.nodes[startId] || !graph.nodes[targetId]) {
      this.SetRouteStatus("当前场景不支持自动寻路", "error");
      return;
    }
    var edges = this.FindRoute(graph, startId, targetId);
    if (!edges) {
      this.SetRouteStatus(
        graph.hasSpecial ? "目标需经过特殊通道，无法自动寻路" : "没有可用路径",
        "error",
      );
      return;
    }
    if (!edges.length) {
      this.SetRouteStatus("已在 " + this.PlainRoomName(graph.nodes[targetId].n), "done");
      return;
    }
    this.AutoRoute = {
      graph: graph,
      edges: edges,
      edgeIndex: 0,
      targetId: targetId,
      awaitingPath: null,
      sentExitsVersion: this.ExitsVersion || 0,
      timer: null,
    };
    this.SetRouteStatus(
      "前往 " + this.PlainRoomName(graph.nodes[targetId].n) + " · " + edges.length + "步",
      "running",
    );
    this.RenderAutoRoute();
    this.AdvanceAutoRoute();
  },
  ResolveRouteDirection: function (edge) {
    var exits = getProcess().room_exits || {};
    var groups = {
      west: ["west", "westup", "westdown"],
      east: ["east", "eastup", "eastdown"],
      north: ["north", "northup", "northdown"],
      south: ["south", "southup", "southdown"],
      northwest: ["northwest"],
      northeast: ["northeast"],
      southwest: ["southwest"],
      southeast: ["southeast"],
    };
    var candidates = groups[edge.heading] || [];
    var target = this.PlainRoomName(this.AutoRoute.graph.nodes[edge.to].n);
    var matching = [];
    for (var index = 0; index < candidates.length; index++) {
      var direction = candidates[index];
      if (!exits[direction]) {
        continue;
      }
      var exitName = this.PlainRoomName(exits[direction]);
      if (exitName === target || exitName.indexOf(target) > -1 || target.indexOf(exitName) > -1) {
        matching.push(direction);
      }
    }
    if (matching.length === 1) {
      return matching[0];
    }
    return null;
  },
  AdvanceAutoRoute: function () {
    var route = this.AutoRoute;
    if (!route || route.awaitingPath || route.edgeIndex >= route.edges.length) {
      return;
    }
    var edge = route.edges[route.edgeIndex];
    if (getProcess().room_path !== edge.from) {
      this.CancelAutoRoute("位置已变化，自动寻路已停止");
      return;
    }
    var direction = this.ResolveRouteDirection(edge);
    if (!direction) {
      this.CancelAutoRoute("出口与地图不一致，当前场景无法自动寻路");
      return;
    }
    route.awaitingPath = edge.to;
    route.sentExitsVersion = this.ExitsVersion || 0;
    this.SetRouteStatus(
      "寻路中 " +
        (route.edgeIndex + 1) +
        "/" +
        route.edges.length +
        " · " +
        this.PlainRoomName(route.graph.nodes[edge.to].n),
      "running",
    );
    sendCommand("go " + direction);
    route.timer = setTimeout(function () {
      if (MAP.AutoRoute === route && route.awaitingPath) {
        MAP.CancelAutoRoute("移动未成功，自动寻路已停止");
      }
    }, 5000);
  },
  OnRoomChanged: function (room) {
    var route = this.AutoRoute;
    if (!route || !route.awaitingPath) {
      return;
    }
    if (route.timer) {
      clearTimeout(route.timer);
      route.timer = null;
    }
    if (!room || room.path !== route.awaitingPath) {
      this.CancelAutoRoute("路线发生变化，自动寻路已停止");
      return;
    }
    route.edgeIndex++;
    route.awaitingPath = null;
    this.RenderAutoRoute();
    if (route.edgeIndex >= route.edges.length) {
      var destination = this.PlainRoomName(route.graph.nodes[route.targetId].n);
      this.CancelAutoRoute();
      this.SetRouteStatus("已到达 " + destination, "done");
      return;
    }
    if ((this.ExitsVersion || 0) > route.sentExitsVersion) {
      scheduleRouteAdvance();
    } else {
      this.SetRouteStatus("正在确认下一步出口…", "running");
    }
  },
  OnExitsChanged: function () {
    this.ExitsVersion = (this.ExitsVersion || 0) + 1;
    var route = this.AutoRoute;
    if (route && !route.awaitingPath) {
      scheduleRouteAdvance();
    }
  },
  CancelAutoRoute: function (message) {
    var route = this.AutoRoute;
    if (route && route.timer) {
      clearTimeout(route.timer);
    }
    clearRouteAdvanceTimers();
    this.AutoRoute = null;
    this.RenderAutoRoute();
    if (message) {
      this.SetRouteStatus(message, "error");
    }
  },
  ShowMap: function (_0x1af8d9, _0x3fb2d8) {
    if (!_0x1af8d9) {
      return;
    }
    this.OpenModal();
    this.CurMapID = _0x3fb2d8;
    var _0x2e36d2 = [];
    var _0x2bc9ce = MAP.getMinPos(_0x1af8d9);
    var _0x24eaa5 = 0 - _0x2bc9ce.minX;
    var _0x345301 = 0 - _0x2bc9ce.minY;
    var _0xc56578 = 50;
    var _0x407384 = 100;
    var _0x2961ce = 60;
    var _0x317f90 = 20;
    var _0x8fde77 = $(".map-panel");
    MAP.MapWidth = (_0x2bc9ce.maxX + _0x24eaa5 + 1) * _0x407384;
    var _0x11517f = 0;
    var _0x30e077 = _0x8fde77.width();
    if (MAP.MapWidth < _0x30e077) {
      _0x11517f = (_0x30e077 - MAP.MapWidth) / 2;
      MAP.MapWidth = _0x30e077;
    }
    MAP.MapHeight = (_0x2bc9ce.maxY + _0x345301 + 1) * _0xc56578;
    if (MAP.MapWidth < 0 || MAP.MapHeight < 0) {
      return;
    }
    var _0x3c839f = /^([a-z]{1,2})(\d)?([d|l])?$/;
    _0x2e36d2.push(
      '<svg class="map" height="' +
        MAP.MapHeight +
        '" width="' +
        MAP.MapWidth +
        '">',
    );
    for (var _0x2b2334 = 0; _0x2b2334 < _0x1af8d9.length; _0x2b2334++) {
      var routeRoomId = this.EscapeAttribute(_0x1af8d9[_0x2b2334].id);
      var routeRoomName = this.EscapeAttribute(
        this.PlainRoomName(_0x1af8d9[_0x2b2334].n),
      );
      _0x2e36d2.push(
        "<rect class='map-room' rm='" +
          routeRoomId +
          "' data-room-id='" +
          routeRoomId +
          "' tabindex='0' role='button' aria-label='自动寻路前往" +
          routeRoomName +
          "' ",
      );
      var _0x2e09bb =
        (_0x1af8d9[_0x2b2334].p[0] + _0x24eaa5) * _0x407384 + _0x11517f + 20;
      var _0x327025 = (_0x1af8d9[_0x2b2334].p[1] + _0x345301) * _0xc56578 + 20;
      _0x2e36d2.push("x='" + _0x2e09bb + "' y='" + _0x327025 + "'");
      _0x2e36d2.push(' fill="dimgrey" stroke-width="1" stroke="gray" ');
      _0x2e36d2.push(
        'width="' + _0x2961ce + '" height="' + _0x317f90 + '"></rect>',
      );
      var _0x56e921 = _0x1af8d9[_0x2b2334].exits;
      if (_0x56e921) {
        for (var _0x41dc17 = 0; _0x41dc17 < _0x56e921.length; _0x41dc17++) {
          _0x3c839f.test(_0x56e921[_0x41dc17]);
          var _0x2e92be = RegExp.$2 ? parseInt(RegExp.$2) : 1;
          var _0x5c6cce;
          var _0xf1fe3b;
          switch (RegExp.$1) {
            case "w":
              _0x5c6cce = [
                _0x2e09bb -
                  (_0x407384 - _0x2961ce) -
                  _0x407384 * (_0x2e92be - 1),
                _0x327025 + _0x317f90 / 2,
              ];
              _0xf1fe3b = [_0x2e09bb, _0x327025 + _0x317f90 / 2];
              break;
            case "e":
              _0x5c6cce = [_0x2e09bb + _0x2961ce, _0x327025 + _0x317f90 / 2];
              _0xf1fe3b = [
                _0x2e09bb + _0x407384 + _0x407384 * (_0x2e92be - 1),
                _0x327025 + _0x317f90 / 2,
              ];
              break;
            case "s":
              _0x5c6cce = [_0x2e09bb + _0x2961ce / 2, _0x327025 + _0x317f90];
              _0xf1fe3b = [
                _0x2e09bb + _0x2961ce / 2,
                _0x327025 + _0xc56578 + _0xc56578 * (_0x2e92be - 1),
              ];
              break;
            case "n":
              _0x5c6cce = [_0x2e09bb + _0x2961ce / 2, _0x327025];
              _0xf1fe3b = [
                _0x2e09bb + _0x2961ce / 2,
                _0x327025 -
                  (_0xc56578 - _0x317f90) -
                  _0xc56578 * (_0x2e92be - 1),
              ];
              break;
            case "nw":
              _0x5c6cce = [
                _0x2e09bb - _0x2e92be * _0x407384 + _0x2961ce,
                _0x327025 - _0x2e92be * _0xc56578 + _0x317f90,
              ];
              _0xf1fe3b = [_0x2e09bb, _0x327025];
              break;
            case "ne":
              _0x5c6cce = [_0x2e09bb + _0x2961ce, _0x327025];
              _0xf1fe3b = [
                _0x2e09bb + _0x2e92be * _0x407384,
                _0x327025 - (_0xc56578 - _0x317f90),
              ];
              break;
            case "se":
              _0x5c6cce = [_0x2e09bb + _0x2961ce, _0x327025 + _0x317f90];
              _0xf1fe3b = [
                _0x2e09bb + _0x2e92be * _0x407384,
                _0x327025 + _0x2e92be * _0xc56578,
              ];
              break;
            case "sw":
              _0x5c6cce = [_0x2e09bb, _0x327025 + _0x317f90];
              _0xf1fe3b = [
                _0x2e09bb -
                  (_0x407384 - _0x2961ce) -
                  _0x407384 * (_0x2e92be - 1),
                _0x327025 + _0x2e92be * _0xc56578,
              ];
              break;
          }
          if (_0x5c6cce) {
            _0x2e36d2.push('<line  stroke="gray" ');
            _0x2e36d2.push(
              " x1='" +
                _0x5c6cce[0] +
                "' y1='" +
                _0x5c6cce[1] +
                "' x2='" +
                _0xf1fe3b[0] +
                "' y2='" +
                _0xf1fe3b[1] +
                "'",
            );
            if (RegExp.$3) {
              _0x2e36d2.push(" stroke-dasharray='5,5'");
            }
            if (RegExp.$3 == "l") {
              _0x2e36d2.push(" stroke-width='10'");
            } else {
              _0x2e36d2.push(" stroke-width='1'");
            }
            _0x2e36d2.push("></line >");
          }
        }
      }
      _0x2e36d2.push(
        ' <text class="map-room-label" data-room-id="' +
          routeRoomId +
          '" x="' +
          (_0x2e09bb + 30) +
          '" y="' +
          (_0x327025 + 14) +
          '" text-anchor="middle" style="font-size:12px;" ',
      );
      this.pushName(_0x2e36d2, _0x1af8d9[_0x2b2334].n, true);
    }
    _0x2e36d2.push("</svg>");
    _0x8fde77.html(_0x2e36d2.join(""));
    this.MapContent = _0x8fde77.children("svg.map");
    this.SetRoom(this.Room);
    this.RenderAutoRoute();
  },
  pushName: function (_0x540a4c, _0x26e5a4, _0x1b3112) {
    var _0x448eed = this.REG.exec(_0x26e5a4);
    if (_0x448eed) {
      _0x540a4c.push('  fill="' + this.GetColor(_0x448eed[1]) + '"');
      _0x540a4c.push(">" + _0x448eed[2] + "</text>");
    } else {
      _0x540a4c.push(' fill="');
      _0x540a4c.push(_0x1b3112 ? "#232323" : "dimgrey");
      _0x540a4c.push('">' + _0x26e5a4 + "</text>");
    }
  },
  getMinPos: function (_0x15eadd) {
    var _0x30c962 = {
      minX: 99999,
      minY: 99999,
      maxX: 0,
      maxY: 0,
    };
    for (var _0x5adb23 = 0; _0x5adb23 < _0x15eadd.length; _0x5adb23++) {
      var _0x339bb0 = _0x15eadd[_0x5adb23].p[0];
      var _0x481dd8 = _0x15eadd[_0x5adb23].p[1];
      if (_0x339bb0 < _0x30c962.minX) {
        _0x30c962.minX = _0x339bb0;
      }
      if (_0x339bb0 > _0x30c962.maxX) {
        _0x30c962.maxX = _0x339bb0;
      }
      if (_0x481dd8 < _0x30c962.minY) {
        _0x30c962.minY = _0x481dd8;
      }
      if (_0x481dd8 > _0x30c962.maxY) {
        _0x30c962.maxY = _0x481dd8;
      }
    }
    return _0x30c962;
  },
  State: 0,
  ZoomState: 100,
  Buffer: {},
  HideItem: function () {
    if (this.State == 0) {
      this.State = 1;
      $(".room_desc").slideUp("fast");
    }
  },
  ShowItem: function () {
    if (this.State == 1) {
      this.State = 0;
      $(".room_desc").slideDown("fast");
    }
  },
  ZoomIn: function (_0x3773bf) {
    if (_0x3773bf.zoom) {
      return;
    }
    MAP.ZoomState = MAP.ZoomState / _0x3773bf.zoom;
    if (MAP.ZoomState > 200) {
      MAP.ZoomState = 200;
    }
    if (MAP.ZoomState < 80) {
      MAP.ZoomState = 80;
    }
    var _0x359443 = (MAP.MapWidth * MAP.ZoomState) / 100;
    var _0x39f51e = (MAP.MapHeight * MAP.ZoomState) / 100;
    this.MapContent.attr("viewBox", "0,0," + _0x359443 + "," + _0x39f51e);
  },
  SetRoom: function (_0x209ec1) {
    this.Room = _0x209ec1;
    if (!this.IsShow) {
      return;
    }
    if (this.CurRoomItem) {
      this.CurRoomItem.attr("fill", "dimgrey");
      this.CurRoomItem.attr("stroke", "gray");
    }
    this.CurRoomItem = null;
    var _0x49526c = this.MapContent.find("rect[rm='" + _0x209ec1.path + "']");
    if (_0x49526c.length) {
      this.CurRoomItem = _0x49526c;
      this.CurRoomItem.attr("fill", "#bebebe");
      this.CurRoomItem.attr("stroke", "gray");
      var _0x511103 = [
        _0x49526c.attr("x"),
        _0x49526c.attr("y"),
        _0x49526c.attr("width"),
        _0x49526c.attr("height"),
      ];
      var _0x55a4b2 = document.querySelector(".map-panel");
      var _0x578295 = _0x55a4b2.offsetHeight;
      var _0x5e78a3 = _0x55a4b2.offsetWidth;
      _0x55a4b2.scrollTop = _0x511103[1] - (_0x578295 - _0x511103[3]) / 2;
      _0x55a4b2.scrollLeft = _0x511103[0] - (_0x5e78a3 - _0x511103[2]) / 2;
    }
    var _0x206590 = _0x209ec1.path.substr(0, _0x209ec1.path.lastIndexOf("/"));
    if (_0x206590 != this.CurMapID) {
      if (MAP.Buffer[_0x206590]) {
        return MAP.ShowMap(MAP.Buffer[_0x206590], _0x206590);
      }
      sendCommand("map " + _0x206590);
    }
  },
  LoadMap: function () {
    if (this.IsShow) {
      return this.CloseModal();
    }
    var _0xb682e6 = MAP.Room;
    if (!_0xb682e6) {
      return;
    }
    this.OpenModal();
    var _0x565516 = _0xb682e6.path.substr(0, _0xb682e6.path.lastIndexOf("/"));
    if (_0x565516 == this.CurMapID) {
      this.SetRoom(this.Room);
      return;
    }
    if (MAP.Buffer[_0x565516]) {
      return MAP.ShowMap(MAP.Buffer[_0x565516], _0x565516);
    }
    sendCommand("map " + _0x565516);
  },
  SetMapBuffer: function (_0x44fbc8, _0x378911) {
    MAP.Buffer[_0x378911] = _0x44fbc8;
  },
  UpdateMap: function (_0x1b0390, _0x4bba0d) {
    var _0x44ffc1 = MAP.Buffer[_0x1b0390];
    if (!_0x44ffc1) {
      return;
    }
    if (!_0x4bba0d.id) {
      MAP.Buffer[_0x1b0390] = null;
      if (this.CurMapID == _0x1b0390) {
        this.CurMapID = null;
      }
      return;
    }
    for (var _0x564953 = 0; _0x564953 < _0x44ffc1.length; _0x564953++) {
      if (_0x44ffc1[_0x564953].id == _0x4bba0d.id) {
        _0x44ffc1[_0x564953].n = _0x4bba0d.n || _0x44ffc1[_0x564953].n;
        _0x44ffc1[_0x564953].p = _0x4bba0d.p || _0x44ffc1[_0x564953].p;
        _0x44ffc1[_0x564953].exits =
          _0x4bba0d.exits || _0x44ffc1[_0x564953].exits;
        break;
      }
    }
    if (_0x1b0390 == this.CurMapID && this.IsShow) {
      MAP.ShowMap(_0x44ffc1, _0x1b0390);
    }
  },
};


    function destroy() {
      MAP.CancelAutoRoute();
      MAP.CloseModal();
      $(document).off("keydown.WG_map_modal");
      $(".WG_map_modal")
        .off(".WG_map_modal")
        .off(".WG_map_route");
    }

    return {
      MAP,
      CreateHeadPanel,
      destroy,
    };
  });
})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
