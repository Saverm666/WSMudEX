/** Touch gesture recognition for slide and pinch interactions. */
(function registerTouchModule(global) {
  "use strict";

  global.WSMudClient.registerModule("touch", function create(context) {
    const { documentRef } = context;
    const touch = {
      List: {},
      AddListener: function (name, selector, listener) {
        const element = documentRef.querySelector(selector);
        element.addEventListener("touchstart", touch.Start);
        element.addEventListener(
          name === "zoom" ? "touchmove" : "touchend",
          name === "zoom" ? touch.Move : touch.End,
        );
        if (!touch.List[name]) touch.List[name] = [];
        touch.List[name].push(listener);
      },
      Start: function (event) {
        touch.StartPos = Array.from(event.changedTouches, function (point) {
          return [point.screenX, point.screenY];
        });
      },
      Move: function (event) {
        if (event.changedTouches.length !== 2) return;
        const positions = Array.from(event.changedTouches, function (point) {
          return [point.screenX, point.screenY];
        });
        if (positions.length !== 2) return;
        touch.Zoom(touch.StartPos, positions);
        touch.StartPos = positions;
      },
      End: function (event) {
        const positions = Array.from(event.changedTouches, function (point) {
          return [point.screenX, point.screenY];
        });
        if (!positions.length || positions.length !== touch.StartPos.length)
          return;
        if (positions.length === 1) touch.Slide(touch.StartPos[0], positions[0]);
        else if (positions.length === 2) touch.Zoom(touch.StartPos, positions);
      },
      Zoom: function (start, end) {
        touch.On("zoom", {
          zoom: touch.Distance(end[0], end[1]) / touch.Distance(start[0], start[1]),
        });
      },
      Distance: function (first, second) {
        return Math.sqrt(
          Math.pow(first[0] - second[0], 2) +
            Math.pow(first[1] - second[1], 2),
        );
      },
      Slide: function (start, end) {
        const offX = start[0] - end[0];
        const offY = start[1] - end[1];
        if (Math.abs(offX) < Math.abs(offY) && Math.abs(offY) > 20) {
          touch.On("slide", { offY, offX, isTop: offY > 0 });
        }
      },
      On: function (name, payload) {
        const listeners = touch.List[name];
        if (!listeners) return;
        for (const listener of listeners) listener(payload);
      },
    };
    return touch;
  });
})(window);
