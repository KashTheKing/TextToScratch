import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    "install",
    "platformer",
    { type: "category", label: "Language", collapsed: false, items: ["language", "reference", "differences"] },
    "cli",
  ],
};

export default sidebars;
