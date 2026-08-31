/** Raid-flow room snapshot and item/death observers. */
(function registerRaidFlowRoom(global) {
  "use strict";

  global.WSMudPlugin.registerService(
    "raid-flow-room",
    function createRaidFlowRoom(context) {
      const addHook = context.addHook || (() => {});
      const now = context.now || (() => new Date().getTime());
      const filter = context.filter || (() => false);
      let room;
      const getRoom = context.getRoom || (() => room);

      const Room = {
        name: null,
        path: null,
        updateTimestamp: null,
        init: function () {
          (this._monitorLocation(),
            this._monitorItemsInRoom(),
            this._monitorDeath());
        },
        getItem: function (e) {
          return this._itemsInRoom[e];
        },
        getItemId: function (e, t, o, n) {
          for (var r of Object.values(this._itemsInRoom))
            if (1 == t) {
              if (
                -1 != r.name.indexOf(e) &&
                (1 != o || -1 == r.name.indexOf("的尸体")) &&
                !filter(n, r)
              )
                return r.id;
            } else if (r.name == e && !filter(n, r)) return r.id;
          return null;
        },
        didKillItemsInRoom: function (e) {
          var t,
            o = this._deadItemsInRoom.slice();
          for (t of e) {
            var n = !1;
            for (let e = 0; e < o.length; e++) {
              var r = o[e];
              if (
                (1 == t.blurry
                  ? -1 != r.name.indexOf(t.name) && (n = !0)
                  : r.name == t.name && (n = !0),
                n)
              ) {
                o.splice(e, 1);
                break;
              }
            }
            if (!n) return !1;
          }
          return !0;
        },
        _itemsInRoom: {},
        _deadItemsInRoom: [],
        _monitorLocation: function () {
          addHook("room", function (e) {
            const room = getRoom();
            ((room.name = e.name),
              (room.path = e.path),
              (room.updateTimestamp = now()),
              (room._itemsInRoom = {}),
              (room._deadItemsInRoom = []));
          });
        },
        _monitorItemsInRoom: function () {
          addHook(
            ["items", "itemadd", "itemremove", "sc", "status"],
            function (t) {
              const room = getRoom();
              switch (t.type) {
                case "items":
                  if (null != t.items)
                    for (var e of t.items)
                      null != e.name &&
                        null != e.id &&
                        (room._itemsInRoom[e.id] = e);
                  break;
                case "itemadd":
                  null != t.name && null != t.id && (room._itemsInRoom[t.id] = t);
                  break;
                case "itemremove":
                  null != t.id && delete room._itemsInRoom[t.id];
                  break;
                case "sc":
                  var o;
                  null != t.id &&
                    null != (o = room._itemsInRoom[t.id]) &&
                    (null != t.hp && (o.hp = t.hp),
                    null != t.max_hp && (o.max_hp = t.max_hp),
                    null != t.mp && (o.mp = t.mp),
                    null != t.max_mp) &&
                    (o.max_mp = t.max_mp);
                  break;
                case "status":
                  if (null != t.action && null != t.id && null != t.sid) {
                    var n = room._itemsInRoom[t.id];
                    if (null != n)
                      if ("add" == t.action)
                        (null == n.status && (n.status = []),
                          n.status.push({
                            sid: t.sid,
                            name: t.name,
                            duration: t.duration,
                            overtime: 0,
                          }));
                      else if ("remove" == t.action)
                        for (let e = 0; e < n.status.length; e++)
                          if (n.status[e].sid == t.sid) {
                            n.status.splice(e, 1);
                            break;
                          }
                  }
              }
            },
          );
        },
        _monitorDeath: function () {
          addHook("sc", function (e) {
            const room = getRoom();
            if (null != e.id && null != e.hp && 0 == e.hp)
              for (var t of Object.values(room._itemsInRoom))
                if (t.id == e.id) return void room._deadItemsInRoom.push(t);
          });
        },
      };

      room = Room;
      return { Room };
    },
  );
})(window);
