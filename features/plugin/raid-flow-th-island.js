/** Raid-flow Peach Blossom Island maze automation service. */
(function registerRaidFlowTHIsland(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-th-island",
    function createRaidFlowTHIsland(context) {
      const getRole = context.getRole || (() => null);
      const getWG = context.getWG || (() => null);
      const appendMessage = context.appendMessage || (() => {});
      let island;
      const getTHIsland = context.getTHIsland || (() => island);
      const getAncientCmdExecuter =
        context.getAncientCmdExecuter || (() => null);

      const THIsland = {
        outMaze: function (e) {
          getRole().atPath("taohua/haitan")
            ? new (getAncientCmdExecuter())(
                ["go south", "@look 1", "@look 5"],
                function () {
                  getTHIsland()._monitorMaze();
                },
                function () {
                  (getTHIsland()._cancelMonitorMaze(), e && e());
                },
                function (e, t) {
                  const island = getTHIsland();
                  return "@look 1" == t
                    ? island._goCenterCmd || null
                    : "@look 5" == t
                      ? island._decodedMaze
                        ? island._outMazeCmd()
                        : null
                      : t;
                },
                void 0,
                1e3,
              ).execute()
            : appendMessage("只有在 桃花岛的海滩 才能使用此虫洞。");
        },
        zhoubotong: function (e) {
          getRole().atPath("taohua/wofang")
            ? new (getAncientCmdExecuter())(
                [
                  "go south;go west;go west;go west;go north;go north;go north",
                  "go west;go east;go west;go east;go west",
                  "go south",
                  "@look 1",
                  "@look 5",
                  "@go 2",
                  "@go 3",
                  "@go 4",
                  "@go 6",
                  "@go 7",
                  "@go 8",
                  "@end",
                ],
                function () {
                  const island = getTHIsland();
                  (island._monitorMaze(),
                    (island._exitsHookIndex = getWG().add_hook(
                      "exits",
                      function (e) {
                        const island = getTHIsland();
                        if (
                          null != island._lastCoord &&
                          island._lastCoord != [0, 0] &&
                          4 == Object.keys(e.items).length
                        ) {
                          for (var t in e.items)
                            if ("桃花林" != e.items[t]) return;
                          var o,
                            n = island._lastCoord[0] + 1,
                            r = island._lastCoord[1] + 1,
                            i = [
                              [
                                ["north", "northeast", "east"],
                                ["east", "north", "south"],
                                ["east", "south", "southeast"],
                              ],
                              [
                                ["east", "north", "west"],
                                [],
                                ["west", "east", "south"],
                              ],
                              [
                                ["west", "northwest", "north"],
                                ["west", "south", "north"],
                                ["west", "southwest", "south"],
                              ],
                            ][n][r];
                          for (o in e.items)
                            if (-1 == i.indexOf(o))
                              return void (island._goCave = "go " + o);
                        }
                      },
                    )));
                },
                function () {
                  const island = getTHIsland();
                  ((island._lastCoord = void 0),
                    (island._lastGo = void 0),
                    (island._goCave = void 0),
                    island._cancelMonitorMaze(),
                    getWG().remove_hook(island._exitsHookIndex),
                    e && e());
                },
                function (e, t) {
                  const island = getTHIsland();
                  if (island._goCave)
                    return island._goCave + ";go west;[exit]";
                  var o,
                    n = 0;
                  switch (t) {
                    case "@look 1":
                      return island._goCenterCmd || null;
                    case "@look 5":
                      if (island._decodedMaze) break;
                      return null;
                    case "@go 2":
                      return (
                        (island._lastCoord = island._mazeCoords[2]),
                        (island._lastGo = island._mazePath(island._lastCoord)),
                        island._lastGo
                      );
                    case "@go 3":
                      n = 3;
                      break;
                    case "@go 4":
                      n = 4;
                      break;
                    case "@go 6":
                      n = 6;
                      break;
                    case "@go 7":
                      n = 7;
                      break;
                    case "@go 8":
                      n = 8;
                  }
                  return 0 != n
                    ? ((o = island._mazeBackPath(island._lastGo)),
                      (island._lastCoord = island._mazeCoords[n]),
                      (island._lastGo = island._mazePath(island._lastCoord)),
                      o + ";" + island._lastGo)
                    : t;
                },
                void 0,
                1e3,
              ).execute()
            : appendMessage("只有在 蓉儿的卧室 才能使用此虫洞。");
        },
        _outMazeCmd: function () {
          const island = getTHIsland();
          for (var e = "", t = 2; t <= 9; t++) {
            var o = island._mazeCoords[t],
              o = island._mazePath(o);
            e +=
              9 == t
                ? o + ";" + o
                : o + ";" + island._mazeBackPath(o) + ";";
          }
          return (e += ";go south");
        },
        _mazePath: function (e) {
          return [
            ["go southwest", "go west", "go northwest"],
            ["go south", "", "go north"],
            ["go southeast", "go east", "go northeast"],
          ][e[0] + 1][e[1] + 1];
        },
        _mazeBackPath: function (e) {
          return {
            "": "",
            "go southwest": "go northeast",
            "go west": "go east",
            "go northwest": "go southeast",
            "go south": "go north",
            "go north": "go south",
            "go southeast": "go northwest",
            "go east": "go west",
            "go northeast": "go southwest",
          }[e];
        },
        _monitorMaze: function () {
          const island = getTHIsland();
          ((island._mazeCoords = [
            [2, 2],
            [2, 2],
            [2, 2],
            [2, 2],
            [2, 2],
            [0, 0],
            [2, 2],
            [2, 2],
            [2, 2],
            [2, 2],
          ]),
            (island._atFirst = !1),
            (island._goCenterCmd = void 0),
            (island._decodedMaze = !1));
          var e = getWG().add_hook(["room", "exits"], function (e) {
              const island = getTHIsland();
              null == island._goCenterCmd &&
                ("room" == e.type
                  ? null != e.desc &&
                    new RegExp("四周栽了大概有一棵桃树").exec(e.desc) &&
                    (island._atFirst = !0)
                  : "exits" == e.type &&
                    null != e.items &&
                    island._atFirst &&
                    (e.items.north && e.items.south
                      ? e.items.west
                        ? ((island._mazeCoords[1] = [1, 0]),
                          (island._goCenterCmd = "go west"))
                        : ((island._mazeCoords[1] = [-1, 0]),
                          (island._goCenterCmd = "go east"))
                      : e.items.west &&
                        e.items.east &&
                        (e.items.north
                          ? ((island._mazeCoords[1] = [0, -1]),
                            (island._goCenterCmd = "go north"))
                          : ((island._mazeCoords[1] = [0, 1]),
                            (island._goCenterCmd = "go south")))));
            }),
            t = getWG().add_hook("room", function (e) {
              const island = getTHIsland();
              if (!island._decodedMaze && null != e.desc) {
                e = new RegExp("能看到东南方向大概有.(?=棵桃树)").exec(e.desc);
                if (e) {
                  e = e.toString();
                  switch (e.substring(e.length - 1)) {
                    case "二":
                      island._mazeCoords[2] = [1, -1];
                      break;
                    case "四":
                      island._mazeCoords[4] = [1, -1];
                      break;
                    case "六":
                      island._mazeCoords[6] = [1, -1];
                      break;
                    case "八":
                      island._mazeCoords[8] = [1, -1];
                  }
                  for (
                    island._mazeCoords[9] = [
                      -island._mazeCoords[1][0],
                      -island._mazeCoords[1][1],
                    ];
                    ;
                  )
                    if (
                      (2 != island._mazeCoords[2][0] &&
                        (island._mazeCoords[8] = [
                          -island._mazeCoords[2][0],
                          -island._mazeCoords[2][1],
                        ]),
                      2 != island._mazeCoords[8][0] &&
                        (island._mazeCoords[8][0] == island._mazeCoords[1][0]
                          ? (island._mazeCoords[6] = [
                              island._mazeCoords[8][0],
                              -island._mazeCoords[8][1],
                            ])
                          : (island._mazeCoords[6] = [
                              -island._mazeCoords[8][0],
                              island._mazeCoords[8][1],
                            ])),
                      2 != island._mazeCoords[6][0] &&
                        (island._mazeCoords[4] = [
                          -island._mazeCoords[6][0],
                          -island._mazeCoords[6][1],
                        ]),
                      2 != island._mazeCoords[4][0] &&
                        (island._mazeCoords[4][0] == island._mazeCoords[9][0]
                          ? (island._mazeCoords[2] = [
                              island._mazeCoords[4][0],
                              -island._mazeCoords[4][1],
                            ])
                          : (island._mazeCoords[2] = [
                              -island._mazeCoords[4][0],
                              island._mazeCoords[4][1],
                            ])),
                      2 != island._mazeCoords[2][0] &&
                        2 != island._mazeCoords[4][0] &&
                        2 != island._mazeCoords[6][0] &&
                        2 != island._mazeCoords[8][0])
                    )
                      break;
                  (island._mazeCoords[8][0] == island._mazeCoords[4][0]
                    ? (island._mazeCoords[3] = [island._mazeCoords[8][0], 0])
                    : (island._mazeCoords[3] = [0, island._mazeCoords[8][1]]),
                    (island._mazeCoords[7] = [
                      -island._mazeCoords[3][0],
                      -island._mazeCoords[3][1],
                    ]),
                    (island._decodedMaze = !0));
                }
              }
            });
          island._mazeHookIndexes = [e, t];
        },
        _cancelMonitorMaze: function () {
          const island = getTHIsland();
          for (var e = island._mazeHookIndexes.length - 1; 0 <= e; e--) {
            var t = island._mazeHookIndexes[e];
            getWG().remove_hook(t);
          }
        },
      };

      island = THIsland;
      return { THIsland };
    },
  );
})(window);
