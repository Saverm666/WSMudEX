/** Paged message queue with guarded auto-scroll behavior. */
(function registerMessageQueueModule(global) {
  "use strict";

  global.WSMudClient.registerModule("message-queue", function create(context) {
    const { jquery, isMobile, hostWindow } = context;
    const MessageQueue = {
      size: 3,
      max: 666,
      container: null,
      pages: null,
      count: 0,
      allow_scroll: true,
      create: function (container, size = 3, max = 666) {
        const queue = Object.create(this);
        queue.container = container;
        queue.pages = [];
        queue.size = size;
        queue.max = max;
        container.on(
          "scroll",
          this.stopDrag.bind(queue),
        );
        queue.scroll_button = jquery(
          '<div class="scroll-flag" style="display:none;"><span class="glyphicon glyphicon-chevron-down"></span></div>',
        );
        queue.scroll_button.appendTo(container);
        queue.scroll_button.on("pointerup", queue.start_move.bind(queue));
        return queue;
      },
      stopDrag: function () {
        const atEnd = this.is_end();
        if (atEnd === this.allow_scroll) return;
        this.allow_scroll = atEnd;
        if (atEnd) this.scroll_button.hide();
      },
      start_move: function () {
        this.allow_scroll = true;
        this.scroll_button.hide();
        this.scroll2end();
      },
      push: function (message) {
        const pages = this.pages;
        if (!pages.length) pages.push(jquery("<pre></pre>").appendTo(this.container));
        if (this.count > this.max) {
          if (pages.length >= this.size) pages.splice(0, 1)[0].remove();
          this.count = 0;
          pages.push(jquery("<pre></pre>").appendTo(this.container));
        }
        if (this.container.hasClass("channel")) {
          jquery('<div class="WG_chat_message"></div>')
            .html(message)
            .appendTo(pages[pages.length - 1]);
        } else {
          pages[pages.length - 1].append(message + "\n");
        }
        this.count += 1;
      },
      clear: function () {
        for (const page of this.pages) page.remove();
        this.pages.length = 0;
        this.count = 0;
      },
      is_end: function () {
        const element = this.container[0];
        return element.scrollTop + element.clientHeight >= element.scrollHeight - 50;
      },
      scroll2end: function () {
        const element = this.container[0];
        if (element.scrollHeight < element.clientHeight) return;
        if (!this.allow_scroll) {
          const bounds = element.getBoundingClientRect();
          return this.scroll_button
            .show()
            .css(
              "top",
              bounds.bottom - this.scroll_button.height(),
            );
        }
        element.scrollTo({ top: element.scrollHeight, behavior: "instant" });
      },
    };

    function ReceiveMessage(message) {
      const Dialog = context.getDialog();
      const Process = context.getProcess();
      if (
        Process.consumeDetailPopupMessage &&
        Process.consumeDetailPopupMessage(message)
      )
        return;
      if (Dialog.extend.message_filter(message)) return;
      Process.message.push(message);
      Process.message.scroll2end();
      Dialog.extend.trigger(message);
    }

    function ReceiveData(data) {
      const Dialog = context.getDialog();
      const Process = context.getProcess();
      if (Dialog.extend.data_filter(data)) return;
      const handler = Process[data.type];
      if (handler) handler(data);
      Dialog.extend.process(data);
    }

    function OnSendBoxKeyDown(event) {
      if (event.keyCode === 13) SendChatMessage();
    }

    function SendChatMessage() {
      const message = jquery(".sender-box").val();
      if (!message) return;
      if (message.length > 100)
        return ReceiveMessage("<hir>你输入的内容太多了。</hir>");
      const channel = jquery(".channel-box").attr("channel");
      jquery(".sender-box").val("").focus();
      context.sendCommand(channel + " " + message);
    }

    function RefreshInput(type) {
      switch (type) {
        case "name":
          jquery("#reg_name").val(
            context.createName(jquery("#gender_0").is(":checked") ? 0 : 1),
          );
          break;
        case "id":
          jquery("#reg_id").val(context.createId());
          break;
        case "prop":
          var values = context.createProp();
          jquery("#reg_str").val(values.str);
          jquery("#reg_con").val(values.con);
          jquery("#reg_dex").val(values.dex);
          jquery("#reg_int").val(values.int);
          break;
      }
    }

    return {
      MessageQueue,
      ReceiveMessage,
      ReceiveData,
      OnSendBoxKeyDown,
      SendChatMessage,
      RefreshInput,
    };
  });
})(window);
