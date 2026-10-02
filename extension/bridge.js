// Runs in the page's own JS world: finds the Scratch VM and serves get/load/stop requests from content.js.
(() => {
  function findVM() {
    if (window.vm?.runtime) return window.vm; // TurboWarp exposes it
    const start = document.querySelector('[class*="stage-wrapper"], [class*="gui_body-wrapper"], canvas');
    if (!start) return null;
    const key = Object.keys(start).find((k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance"));
    for (let f = start[key]; f; f = f.return) {
      const vm = f.memoizedProps?.vm ?? f.stateNode?.props?.vm;
      if (vm?.runtime) return vm;
    }
    return null;
  }

  const handlers = {
    async get() {
      return await (await findVM().saveProjectSb3()).arrayBuffer();
    },
    async load({ data, run }) {
      const vm = findVM();
      const editing = vm.editingTarget?.getName?.();
      await vm.loadProject(data);
      const keep = editing && vm.runtime.getSpriteTargetByName(editing);
      if (keep) vm.setEditingTarget(keep.id);
      if (run) vm.greenFlag();
    },
    stop() {
      findVM().stopAll();
    },
  };

  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.data?.ttsBridge !== "req") return;
    const { id, cmd, data } = e.data;
    try {
      if (!findVM()) throw new Error("Scratch editor not ready");
      const result = await handlers[cmd](data);
      window.postMessage({ ttsBridge: "res", id, data: result }, "*");
    } catch (err) {
      window.postMessage({ ttsBridge: "res", id, error: String(err?.message ?? err) }, "*");
    }
  });
})();
