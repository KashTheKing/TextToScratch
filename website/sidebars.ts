import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    "install",
    "platformer",
    { type: "category", label: "Language", collapsed: false, items: ["language", "reference", "differences", "decompile"] },
    {
      type: "category",
      label: "Game engine",
      collapsed: false,
      items: ["engine/overview", "engine/classes", "engine/2d", "engine/3d", "engine/multiplayer", "engine/utilities"],
    },
    "cli",
  ],
};

export default sidebars;
