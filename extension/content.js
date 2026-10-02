// Isolated-world content script: adds a "Text Code" menu item and hosts the editor iframe over the code area.
(() => {
  const EDITOR = chrome.runtime.getURL("editor.html");
  const ORIGIN = new URL(EDITOR).origin;
  let frame = null;

  function codeArea() {
    return document.querySelector('[class*="gui_editor-wrapper"]') ?? document.querySelector('[class*="gui_body-wrapper"]');
  }

  function place() {
    const area = codeArea();
    if (!frame || !area) return;
    const r = area.getBoundingClientRect();
    Object.assign(frame.style, { top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" });
  }

  function toggle(show = !frame || frame.style.display === "none") {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.src = EDITOR;
      frame.allow = "clipboard-read; clipboard-write";
      Object.assign(frame.style, { position: "fixed", zIndex: 500, border: "0", borderRadius: "0.5rem", background: "#e5f0ff", boxShadow: "0 0 0 1px hsla(0,0%,0%,0.15)" });
      document.body.append(frame);
      new ResizeObserver(place).observe(document.body);
      window.addEventListener("resize", place);
    }
    frame.style.display = show ? "block" : "none";
    place();
  }

  // iframe -> page bridge
  window.addEventListener("message", (e) => {
    if (frame && e.source === frame.contentWindow && e.origin === ORIGIN) {
      if (e.data?.tts === "close") return toggle(false);
      if (e.data?.tts === "req") window.postMessage({ ttsBridge: "req", id: e.data.id, cmd: e.data.cmd, data: e.data.data }, "*");
    } else if (e.source === window && e.data?.ttsBridge === "res" && frame) {
      frame.contentWindow.postMessage({ tts: "res", id: e.data.id, data: e.data.data, error: e.data.error }, ORIGIN);
    }
  });

  // menu-bar button, styled like Scratch's own menu items
  function addButton() {
    if (document.getElementById("tts-button")) return;
    const bar = document.querySelector('[class*="menu-bar_main-menu"]') ?? document.querySelector('[class*="menu-bar_file-group"]');
    if (!bar) return;
    const item = document.createElement("div");
    item.id = "tts-button";
    item.title = "Code this project in text (TextToScratch)";
    item.innerHTML = '<span style="background:#fff;color:#855cd6;border-radius:.25rem;padding:0 .3rem;margin-right:.35rem;font-weight:bold">{ }</span>Text Code';
    Object.assign(item.style, { display: "flex", alignItems: "center", padding: "0 0.75rem", height: "100%", cursor: "pointer", color: "#fff", fontWeight: "bold", fontSize: "0.75rem", whiteSpace: "nowrap" });
    item.onmouseenter = () => (item.style.background = "hsla(0,0%,0%,0.15)");
    item.onmouseleave = () => (item.style.background = "");
    item.onclick = () => toggle();
    bar.append(item);
  }
  new MutationObserver(addButton).observe(document.documentElement, { childList: true, subtree: true });
  addButton();
})();
