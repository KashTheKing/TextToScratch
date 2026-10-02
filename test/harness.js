// Harness setup: a VM exposed as window.vm (like TurboWarp), a chrome.runtime shim for content.js, and a live state dump.
// Seeds the VM with ?project=<url> (default: the built catcher example).
window.chrome = { runtime: { getURL: (p) => location.origin + "/extension/" + p } };
window.vm = new VirtualMachine();
vm.start();
fetch(new URLSearchParams(location.search).get("project") ?? "/examples/catcher/dist/catcher.sb3")
  .then((r) => r.arrayBuffer())
  .then((b) => vm.loadProject(b))
  .catch((e) => console.error("harness load failed", e));
setInterval(() => {
  document.getElementById("state").textContent = vm.runtime.targets
    .map((t) => `${t.getName()}${t.isOriginal ? "" : " (clone)"} x=${Math.round(t.x)} y=${Math.round(t.y)} blocks=${Object.keys(t.blocks._blocks).length}\n` +
      Object.values(t.variables).map((v) => `   ${v.name} = ${JSON.stringify(v.value)}`).join("\n"))
    .join("\n");
}, 200);
