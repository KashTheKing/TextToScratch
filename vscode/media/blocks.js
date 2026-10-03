// TextToScratch blocks view. A headless scratch-vm loads the built .sb3 and emits each target's blocks as
// Blockly XML (its "workspaceUpdate" event, like scratch-gui), which a read-only scratch-blocks workspace renders.
// Works as the VS Code webview (messages from the extension) and as a plain page (?project=url&target=name).
(function () {
  const me = document.currentScript.src;
  const base = me.slice(0, me.lastIndexOf("/") + 1);
  const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
  const post = (m) => vscode && vscode.postMessage(m);
  const $ = (id) => document.getElementById(id);
  const status = (t) => ($("status").textContent = t);
  window.addEventListener("error", (e) => { status("Error: " + e.message); post({ type: "error", message: e.message }); });

  const Blockly = window.Blockly;
  const workspace = Blockly.inject($("workspace"), {
    readOnly: true,
    media: base + "vendor/blocks-media/",
    scrollbars: true,
    comments: true,
    zoom: { controls: false, wheel: true, startScale: 0.675 },
    grid: { spacing: 40, length: 2, colour: "#ddd" },
    colours: { workspace: "#F9F9F9", flyout: "#F9F9F9", scrollbar: "#CECDCE", scrollbarHover: "#CECDCE", insertionMarker: "#000000", insertionMarkerOpacity: 0.2, fieldShadow: "rgba(255, 255, 255, 0.3)", dragShadowOpacity: 0.6 },
  });
  if (Blockly.ScratchMsgs) Blockly.ScratchMsgs.setLocale("en");
  // Scratch runs a reporter in a boolean slot (and vice versa), but scratch-blocks refuses to connect it: show it anyway
  Blockly.Connection.prototype.checkType_ = () => true;

  const vm = new window.VirtualMachine();
  const Storage = window.ScratchStorage.ScratchStorage || window.ScratchStorage;
  vm.attachStorage(new Storage());
  // extension blocks (pen, music, ...) are defined from the VM's block info, like scratch-gui does
  const define = (infos) => infos.forEach((b) => { if (b.json) Blockly.Blocks[b.json.type] = { init() { this.jsonInit(b.json); } }; });
  vm.on("EXTENSION_ADDED", (c) => { define(c.menus); define(c.blocks); });

  let wanted = new URLSearchParams(location.search).get("target") || null; // sprite to show (the active .ts file)
  let topBlocks = []; // top-level scripts in compile order (= source order)
  vm.on("workspaceUpdate", ({ xml }) => {
    const dom = Blockly.Xml.textToDom(xml);
    for (const b of dom.children) if (b.hasAttribute("x")) { b.setAttribute("x", +b.getAttribute("x") + 24); b.setAttribute("y", +b.getAttribute("y") + 24); } // margin
    Blockly.Events.disable();
    try { Blockly.Xml.clearWorkspaceAndLoadFromXml(dom, workspace); }
    catch (e) { status("Could not show the blocks: " + e.message); return post({ type: "error", message: String(e.message || e) }); }
    finally { Blockly.Events.enable(); }
    const t = vm.editingTarget;
    // the compiler stacks scripts top to bottom in source order
    topBlocks = workspace.getTopBlocks(false).filter((b) => !b.isShadow()).sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y).map((b) => b.id);
    topBlocks.forEach((id, i) => (workspace.getBlockById(id).getSvgRoot().dataset.script = i));
    const count = workspace.getAllBlocks(false).filter((b) => !b.isShadow()).length;
    $("target").value = t.id;
    status(`${t.getName()}: ${topBlocks.length} script${topBlocks.length === 1 ? "" : "s"}, ${count} blocks`);
    post({ type: "rendered", target: t.getName(), scripts: topBlocks.length, blocks: count });
  });

  // clicking a script reveals the matching hat / function in the .ts (a read-only workspace has no block events,
  // so tag each script's SVG group; blocks below a hat are nested inside it)
  $("workspace").addEventListener("click", (e) => {
    const g = e.target.closest && e.target.closest("[data-script]");
    if (g) post({ type: "reveal", target: vm.editingTarget.isStage ? "Stage" : vm.editingTarget.getName(), index: Number(g.dataset.script) });
  });

  function show(name) {
    const t = vm.runtime.targets.find((t) => t.isOriginal && (name === "Stage" ? t.isStage : t.getName() === name));
    if (t) vm.setEditingTarget(t.id);
  }

  async function load(bytes) {
    status("Loading…");
    const m = workspace.getMetrics();
    const view = { x: m.viewLeft - m.contentLeft, y: m.viewTop - m.contentTop, scale: workspace.scale, target: vm.editingTarget && (vm.editingTarget.isStage ? "Stage" : vm.editingTarget.getName()) };
    try {
      await vm.loadProject(bytes);
    } catch (e) {
      status("Could not load the project: " + e.message);
      return post({ type: "error", message: String(e.message || e) });
    }
    const select = $("target");
    select.replaceChildren(...vm.runtime.targets.filter((t) => t.isOriginal).map((t) => Object.assign(document.createElement("option"), { value: t.id, textContent: t.isStage ? "Stage" : t.getName() })));
    show(wanted || view.target || "Stage");
    select.value = vm.editingTarget.id;
    if ((vm.editingTarget.isStage ? "Stage" : vm.editingTarget.getName()) === view.target) {
      workspace.setScale(view.scale); // same sprite rebuilt: keep the view where it was
      workspace.scrollbar.set(view.x, view.y);
    }
  }

  $("target").onchange = (e) => { vm.setEditingTarget(e.target.value); wanted = vm.editingTarget.isStage ? "Stage" : vm.editingTarget.getName(); };
  $("in").onclick = () => workspace.zoomCenter(1);
  $("out").onclick = () => workspace.zoomCenter(-1);
  $("reset").onclick = () => { workspace.setScale(0.675); workspace.scrollCenter(); };
  $("cleanup").onclick = () => workspace.cleanUp();
  window.addEventListener("resize", () => Blockly.svgResize(workspace));

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || !m.type) return;
    if (m.type === "load") { if (m.target) wanted = m.target; load(new Uint8Array(m.bytes).buffer); }
    if (m.type === "target") { wanted = m.target; show(m.target); }
  });
  const project = new URLSearchParams(location.search).get("project");
  if (vscode) post({ type: "hello" });
  else if (project) fetch(project + "?v=" + Date.now()).then((r) => r.arrayBuffer()).then(load);
  window.ttsBlocks = { vm, workspace, load, show };
})();
