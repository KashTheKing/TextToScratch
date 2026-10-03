// TextToScratch game viewer. The page (toolbar) hosts one iframe per player; each iframe runs its own scratch-vm +
// scratch-render (separate WebGL contexts, so pen layers are never shared). Cloud variables are simulated locally:
// an update from one player reaches the others after LATENCY ms, like test/multiplayer.js.
// Works as the VS Code webview (messages from the extension) and as a plain page (?project=url).
(function () {
  const me = document.currentScript.src;
  const base = me.slice(0, me.lastIndexOf("/") + 1);
  const VENDOR = ["scratch-vm.js", "scratch-render.js", "scratch-storage.js", "scratch-svg-renderer.js", "scratch-audio.js"];
  if (window.name.startsWith("tts-player")) return player();

  // ---------------- toolbar page ----------------
  const LATENCY = 60;
  const SIZES = [["Small", 0.5], ["Normal", 1], ["Large", 1.5], ["Fit", 0]];
  const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
  const $ = (id) => document.getElementById(id);
  const saved = (vscode && vscode.getState()) || {};
  const state = { players: saved.players || 1, size: saved.size ?? 3, turbo: !!saved.turbo, autoreload: saved.autoreload ?? true, keeprunning: saved.keeprunning ?? true };
  let project = null; // last loaded .sb3 bytes
  let pending = null; // build that arrived while auto-reload was off
  let frames = [];
  const save = () => vscode && vscode.setState(state);
  const post = (msg) => vscode && vscode.postMessage(msg);
  const status = (t) => ($("status").textContent = t);
  window.ttsError = (message) => { status("Error: " + message); post({ type: "error", message }); };
  window.addEventListener("error", (e) => window.ttsError(e.message));

  // Player frames are srcdoc iframes, which can't load from the VS Code webview resource server: give them blob: copies.
  const asBlob = (f) => fetch(base + f).then((r) => r.blob()).then((b) => URL.createObjectURL(new Blob([b], { type: "text/javascript" })));
  const assets = Promise.all([asBlob("viewer.js"), fetch(base + "viewer.css").then((r) => r.text()), Promise.all(VENDOR.map((f) => asBlob("vendor/" + f)))])
    .then(([js, css, vendor]) => { window.ttsVendor = vendor; return { js, css }; });
  assets.catch((e) => window.ttsError("could not load the player: " + e.message));

  // the simulated cloud server: remembers every value so a player who (re)joins gets the current state, like Scratch's
  const cloudState = new Map();
  window.ttsCloud = (from, name, value) => {
    cloudState.set(name, value);
    for (const f of frames) if (f.index !== from) setTimeout(() => f.api && f.api.cloud(name, value), LATENCY);
  };
  window.ttsCloudState = () => [...cloudState];

  function makeFrames() {
    const box = $("frames");
    box.textContent = "";
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    frames = Array.from({ length: state.players }, (_, i) => {
      const fig = document.createElement("figure");
      const frame = document.createElement("iframe");
      frame.name = "tts-player-" + i;
      frame.title = "Scratch stage" + (state.players > 1 ? " " + (i + 1) : "");
      frame.setAttribute("allow", "fullscreen; autoplay");
      assets.then((a) => (frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8">${csp ? csp.outerHTML : ""}<style>${a.css}</style></head>` +
        `<body class="player"><div id="stage"><canvas id="canvas" width="480" height="360" tabindex="0"></canvas><div id="monitors"></div>` +
        `<form id="ask" hidden><span id="askq"></span><input id="askin" autocomplete="off"><button title="Answer">✓</button></form></div>` +
        `<script src="${a.js}"></script></body></html>`));
      const f = { index: i, frame, api: null, ready: null };
      f.ready = new Promise((resolve) => (frame.onload = () => {
        const check = () => (frame.contentWindow.ttsPlayer ? resolve((f.api = frame.contentWindow.ttsPlayer)) : setTimeout(check, 20));
        check();
      }));
      fig.append(frame);
      if (state.players > 1) {
        // per-player flag / stop / rejoin, next to the global ones in the toolbar
        const cap = document.createElement("figcaption");
        const btn = (title, html, fn) => { const b = document.createElement("button"); b.title = title; b.innerHTML = html; b.onclick = fn; cap.append(b); };
        btn("Green flag (this player)", $("flag").innerHTML, () => f.api && f.api.flag());
        btn("Stop (this player)", $("stop").innerHTML, () => f.api && f.api.stop());
        btn("Rejoin: reload only this player, like a late join", "⟳", () => f.api && project && f.api.load(project.slice(0), true));
        cap.append("Player " + (i + 1));
        fig.append(cap);
      }
      fig.onmousedown = () => setActive(i);
      f.fig = fig;
      box.append(fig);
      return f;
    });
    setActive(0);
    layout();
    const these = frames;
    setTimeout(() => { if (frames === these && frames.some((f) => !f.api)) window.ttsError("the player frame did not start"); }, 30000);
    Promise.all(frames.map((f) => f.ready)).then(() => {
      frames.forEach((f) => { f.api.index = f.index; f.api.setTurbo(state.turbo); });
      post({ type: "ready", players: frames.length });
    });
  }

  // keys typed on the toolbar go to the player whose stage was clicked last (highlighted)
  let activePlayer = 0;
  function setActive(i) {
    activePlayer = i;
    frames.forEach((f) => f.fig.classList.toggle("active", frames.length > 1 && f.index === i));
  }
  window.ttsActive = setActive;

  function layout() {
    const box = $("frames");
    const full = document.fullscreenElement === box;
    let scale = SIZES[state.size][1];
    box.classList.toggle("fit", !scale || full);
    if (!scale || full) {
      const w = (box.clientWidth - 24 - 12 * (frames.length - 1)) / frames.length, h = box.clientHeight - 24 - (frames.length > 1 ? 34 : 0);
      scale = Math.max(0.25, Math.min(w / 480, h / 360));
    }
    for (const f of frames) { f.frame.style.width = 480 * scale + "px"; f.frame.style.height = 360 * scale + "px"; }
    $("size").textContent = SIZES[state.size][0];
  }

  async function load(bytes, flag) {
    project = bytes;
    pending = null;
    cloudState.clear(); // a fresh "server" per load
    status("Loading…");
    try {
      await Promise.all(frames.map((f) => f.ready));
      // stagger joins like real players so multiplayer handshakes see each other
      for (const f of frames) {
        await f.api.load(bytes.slice(0), flag);
        if (flag && frames.length > 1) await new Promise((r) => setTimeout(r, 600));
      }
      const info = frames[0].api.info();
      status(`Loaded: ${info.sprites} sprite${info.sprites === 1 ? "" : "s"}, ${info.costumes} costumes, ${info.sounds} sounds${flag ? " - running" : " - press the green flag"}`);
      post({ type: "loaded", running: flag });
    } catch (e) {
      status("Could not load the project: " + e.message);
      post({ type: "error", message: String(e.message || e) });
    }
  }

  const running = () => frames.some((f) => f.api && f.api.running());

  // messages from the extension
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || !m.type) return;
    if (m.type === "load") {
      const bytes = new Uint8Array(m.bytes).buffer;
      $("errors").hidden = true;
      if (m.reason === "save" && !state.autoreload) { pending = bytes; return status("New build ready - press the green flag to load it"); }
      load(bytes, m.reason === "save" ? state.keeprunning && running() : m.flag !== false);
    }
    if (m.type === "errors") {
      $("errors").hidden = !m.messages.length;
      $("errors").textContent = m.messages.join("\n");
      if (m.messages.length) status(`Build failed: ${m.messages.length} error${m.messages.length === 1 ? "" : "s"}`);
    }
    if (m.type === "flag") $("flag").click();
    if (m.type === "stop") $("stop").click();
  });

  $("flag").onclick = () => (pending ? load(pending, true) : frames.forEach((f) => f.api && f.api.flag()));
  $("stop").onclick = () => frames.forEach((f) => f.api && f.api.stop());
  // keys pressed while the toolbar has focus go to the active player
  for (const [type, down] of [["keydown", true], ["keyup", false]])
    window.addEventListener(type, (e) => {
      const f = frames[activePlayer];
      if (e.target.tagName === "INPUT" || !f || !f.api) return;
      f.api.key(e.key, down);
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    });
  $("turbo").checked = state.turbo;
  $("turbo-label").hidden = !state.turbo;
  $("turbo").onchange = (e) => { state.turbo = e.target.checked; $("turbo-label").hidden = !state.turbo; frames.forEach((f) => f.api && f.api.setTurbo(state.turbo)); save(); };
  for (const id of ["autoreload", "keeprunning"]) {
    $(id).checked = state[id];
    $(id).onchange = (e) => { state[id] = e.target.checked; save(); post({ type: "setting", key: id, value: state[id] }); };
  }
  $("size").onclick = () => { state.size = (state.size + 1) % SIZES.length; layout(); save(); };
  const playersLabel = () => {
    $("players").textContent = state.players + (state.players === 1 ? " player" : " players");
    $("players").classList.toggle("on", state.players > 1);
  };
  playersLabel();
  $("players").onclick = () => {
    state.players = (state.players % 4) + 1; // 1 -> 2 -> 3 -> 4 -> 1
    playersLabel();
    save();
    makeFrames();
    if (project) load(project, true);
  };
  $("fullscreen").onclick = () => {
    const box = $("frames");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (box.requestFullscreen) box.requestFullscreen().catch(() => { state.size = 3; layout(); });
  };
  document.addEventListener("fullscreenchange", layout);
  window.addEventListener("resize", layout);
  setInterval(() => {
    const fps = frames.map((f) => (f.api ? f.api.fps() : 0));
    $("fps").textContent = fps.map((n) => n + "").join(" / ") + " fps";
  }, 500);

  makeFrames();
  const params = new URLSearchParams(location.search);
  if (params.get("players")) { state.players = Math.min(4, Number(params.get("players")) || 1); playersLabel(); makeFrames(); }
  if (vscode) post({ type: "hello" });
  else if (params.get("project"))
    fetch(params.get("project") + "?v=" + Date.now()).then((r) => r.arrayBuffer()).then((b) => load(b, !params.has("noflag")));
  // Show Blocks: the extension opens its panel; as a plain page, open blocks.html for the same project
  $("blocks").onclick = () => (vscode ? post({ type: "showBlocks" }) : window.open(base + "blocks.html?project=" + encodeURIComponent(params.get("project") || "")));
  window.ttsViewer = { load, frames: () => frames, running, active: () => activePlayer };

  // ---------------- one player (inside an iframe) ----------------
  function player() {
    const loaded = window.parent.ttsVendor.reduce((p, s) => p.then(() => new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = s;
      el.onload = resolve;
      el.onerror = () => reject(new Error("could not load the Scratch player scripts"));
      document.head.append(el);
    })), Promise.resolve());

    window.addEventListener("error", (e) => window.parent.ttsError && window.parent.ttsError(e.message));
    loaded.catch((e) => window.parent.ttsError && window.parent.ttsError(e.message));
    let vm = null, frameCount = 0, fps = 0;
    const canvas = document.getElementById("canvas");
    const api = (window.ttsPlayer = {
      index: 0,
      async load(bytes, flag) {
        await loaded;
        if (!vm) setup();
        vm.stopAll();
        // copy into this frame's realm: the VM checks `instanceof ArrayBuffer`
        await vm.loadProject(new Uint8Array(bytes).slice().buffer);
        vm.setCloudProvider(provider); // loadProject resets the provider
        // each player is a different logged-in user (multiplayer games tell players apart by username)
        vm.postIOData("userData", { username: "Player" + (api.index + 1) });
        for (const [name, value] of window.parent.ttsCloudState ? window.parent.ttsCloudState() : []) api.cloud(name, value);
        vm.setTurboMode(turbo);
        if (flag) vm.greenFlag();
      },
      flag: () => vm && vm.greenFlag(),
      key: (key, isDown) => vm && vm.postIOData("keyboard", { key, isDown }),
      stop: () => vm && vm.stopAll(),
      running: () => !!vm && vm.runtime.threads.some((t) => t.status !== 4 /* STATUS_DONE */),
      setTurbo: (on) => { turbo = on; vm && vm.setTurboMode(on); },
      fps: () => fps,
      cloud: (name, value) => vm && vm.postIOData("cloud", { varUpdate: { name, value } }),
      info: () => {
        const ts = vm.runtime.targets.filter((t) => t.isOriginal);
        return {
          sprites: ts.filter((t) => !t.isStage).length,
          costumes: ts.reduce((n, t) => n + t.sprite.costumes.length, 0),
          sounds: ts.reduce((n, t) => n + t.sprite.sounds.length, 0),
        };
      },
      vm: () => vm,
    });
    let turbo = false;
    const provider = {
      updateVariable: (name, value) => window.parent.ttsCloud && window.parent.ttsCloud(api.index, name, value),
      createVariable() {}, renameVariable() {}, deleteVariable() {}, requestCloseConnection() {},
    };

    function setup() {
      vm = new window.VirtualMachine();
      const Storage = window.ScratchStorage.ScratchStorage || window.ScratchStorage;
      vm.attachRenderer(new window.ScratchRender(canvas));
      vm.attachStorage(new Storage());
      vm.attachV2BitmapAdapter(new window.ScratchSVGRenderer.BitmapAdapter());
      vm.attachAudioEngine(new window.AudioEngine());
      vm.setCompatibilityMode(true); // 30 fps like the Scratch website
      vm.start();
      const step = vm.runtime._step.bind(vm.runtime);
      vm.runtime._step = () => { frameCount++; step(); };
      setInterval(() => { fps = frameCount * 2; frameCount = 0; }, 500);
      vm.on("MONITORS_UPDATE", renderMonitors);
      vm.runtime.on("QUESTION", ask);
      input();
    }

    // ---- input ----
    function input() {
      const mouse = (e, isDown) => {
        const r = canvas.getBoundingClientRect();
        vm.postIOData("mouse", { x: e.clientX - r.left, y: e.clientY - r.top, canvasWidth: r.width, canvasHeight: r.height, isDown });
      };
      canvas.addEventListener("mousemove", (e) => mouse(e));
      canvas.addEventListener("mousedown", (e) => { canvas.focus(); window.parent.ttsActive && window.parent.ttsActive(api.index); mouse(e, true); e.preventDefault(); });
      window.addEventListener("mouseup", (e) => mouse(e, false));
      const key = (e, isDown) => {
        if (e.target && e.target.id === "askin") return;
        vm.postIOData("keyboard", { key: e.key, isDown });
        if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      };
      window.addEventListener("keydown", (e) => key(e, true));
      window.addEventListener("keyup", (e) => key(e, false));
      canvas.focus();
    }

    // ---- ask and wait ----
    const form = document.getElementById("ask");
    function ask(question) {
      form.hidden = question === null;
      document.getElementById("askq").textContent = question || "";
      if (question !== null) { document.getElementById("askin").value = ""; document.getElementById("askin").focus(); }
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      vm.runtime.emit("ANSWER", document.getElementById("askin").value);
      form.hidden = true;
      canvas.focus();
    };

    // ---- variable / list monitors ----
    const box = document.getElementById("monitors");
    const els = new Map();
    const fit = () => (box.style.transform = `scale(${window.innerWidth / 480}, ${window.innerHeight / 360})`);
    window.addEventListener("resize", fit);
    fit();
    function label(m) {
      const p = m.get("params") || {};
      const name = p.VARIABLE || p.LIST || m.get("opcode").replace(/^\w+_/, "");
      return (m.get("spriteName") ? m.get("spriteName") + ": " : "") + name;
    }
    function renderMonitors(monitors) {
      const seen = new Set();
      monitors.forEach((m, id) => {
        if (!m.get("visible")) return;
        seen.add(id);
        const mode = m.get("mode");
        let el = els.get(id);
        if (!el || el.dataset.mode !== mode) {
          if (el) el.remove();
          el = document.createElement("div");
          el.dataset.mode = mode;
          el.className = "monitor " + mode;
          el.innerHTML = mode === "list" ? '<div class="label"></div><ol></ol>' : '<span class="label"></span><span class="value"></span>';
          box.append(el);
          els.set(id, el);
        }
        el.style.left = (m.get("x") || 0) + "px";
        el.style.top = (m.get("y") || 0) + "px";
        el.querySelector(".label").textContent = label(m);
        const value = m.get("value");
        if (mode === "list") {
          const ol = el.querySelector("ol");
          if (m.get("width")) el.style.width = m.get("width") + "px";
          if (m.get("height")) ol.style.height = m.get("height") - 24 + "px";
          const items = (Array.isArray(value) ? value : []).slice(0, 50);
          ol.replaceChildren(...items.map((v) => { const li = document.createElement("li"); const s = document.createElement("span"); s.textContent = v; li.append(s); return li; }));
        } else {
          const n = typeof value === "number" ? Math.round(value * 1e6) / 1e6 : value;
          el.querySelector(".value").textContent = n;
        }
      });
      for (const [id, el] of els) if (!seen.has(id)) { el.remove(); els.delete(id); }
    }
  }
})();
