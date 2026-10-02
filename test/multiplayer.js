// Fake cloud server: every cloud variable update from one VM reaches the others after LATENCY ms.
const LATENCY = 60;
const Storage = window.ScratchStorage.ScratchStorage ?? window.ScratchStorage;
const project = new URLSearchParams(location.search).get("project") ?? "/test/fixtures/multiplayer.sb3";
window.cloudLog = [];

const clients = (window.clients = [0, 1].map((i) => {
  const vm = new VirtualMachine();
  const client = { vm };
  vm.attachRenderer(new ScratchRender(document.getElementById(`c${i}`)));
  vm.attachStorage(new Storage());
  vm.attachV2BitmapAdapter(new (window.ScratchSVGRenderer.BitmapAdapter)());
  client.provider = {
    updateVariable(name, value) {
      window.cloudLog.push([i, name, String(value)]);
      for (const other of window.clients) if (other !== client) setTimeout(() => other.vm.postIOData("cloud", { varUpdate: { name, value } }), LATENCY);
    },
    createVariable() {},
    renameVariable() {},
    deleteVariable() {},
    requestCloseConnection() {},
  };
  return client;
}));

window.ready = (async () => {
  const data = await (await fetch(project + "?v=" + Date.now())).arrayBuffer();
  for (const c of clients) {
    await c.vm.loadProject(data.slice(0));
    c.vm.setCloudProvider(c.provider); // after loading: loadProject resets the provider
    c.vm.start();
  }
  clients[0].vm.greenFlag();
  await new Promise((r) => setTimeout(r, 1200)); // stagger joins like real players
  clients[1].vm.greenFlag();
})();
