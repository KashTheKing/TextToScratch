// Minimal Scratch player for testing compiled projects with real rendering and mouse/keyboard input.
const canvas = document.getElementById("stage");
const Storage = window.ScratchStorage.ScratchStorage ?? window.ScratchStorage;
const vm = (window.vm = new VirtualMachine());
vm.attachRenderer(new ScratchRender(canvas));
vm.attachStorage(new Storage());
vm.attachV2BitmapAdapter(new (window.ScratchSVGRenderer.BitmapAdapter)());
vm.start();

const project = new URLSearchParams(location.search).get("project") ?? "/examples/platformer/dist/platformer.sb3";
window.ready = fetch(project + "?v=" + Date.now())
  .then((r) => r.arrayBuffer())
  .then((b) => vm.loadProject(b))
  .then(() => new URLSearchParams(location.search).has("noflag") || vm.greenFlag()); // ?noflag: show the project as loaded

document.getElementById("flag").onclick = () => vm.greenFlag();
document.getElementById("stop").onclick = () => vm.stopAll();

const mouse = (e, isDown) => {
  const r = canvas.getBoundingClientRect();
  vm.postIOData("mouse", { x: e.clientX - r.left, y: e.clientY - r.top, canvasWidth: r.width, canvasHeight: r.height, isDown });
};
canvas.addEventListener("mousemove", (e) => mouse(e));
canvas.addEventListener("mousedown", (e) => mouse(e, true));
window.addEventListener("mouseup", (e) => mouse(e, false));
const key = (e, isDown) => vm.postIOData("keyboard", { key: e.key, isDown });
window.addEventListener("keydown", (e) => key(e, true));
window.addEventListener("keyup", (e) => key(e, false));
