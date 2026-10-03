import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "TextToScratch",
  tagline: "Write Scratch games in typed TypeScript. Get real Scratch blocks.",
  favicon: "img/favicon.svg",
  url: "https://kashtheking.com",
  baseUrl: "/text-to-scratch/",
  // GitHub Pages redirects /page to /page/ (over http, since HTTPS isn't enforced): link to /page/ directly
  trailingSlash: true,
  organizationName: "TextToScratch",
  projectName: "TextToScratch",
  onBrokenLinks: "throw",
  markdown: { hooks: { onBrokenMarkdownLinks: "throw" } },
  i18n: { defaultLocale: "en", locales: ["en"] },

  presets: [
    [
      "classic",
      {
        docs: { sidebarPath: "./sidebars.ts", routeBasePath: "docs" },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [require.resolve("docusaurus-lunr-search")],

  themeConfig: {
    announcementBar: {
      id: "discord",
      content: `💬 TextToScratch has a Discord! <a target="_blank" rel="noopener noreferrer" href="https://discord.gg/AnsrYzRXar">Join the community</a> for help, ideas and game sharing.`,
      backgroundColor: "#5865f2",
      textColor: "#ffffff",
      isCloseable: true,
    },
    colorMode: { defaultMode: "light", respectPrefersColorScheme: false },
    navbar: {
      title: "TextToScratch",
      logo: { alt: "TextToScratch", src: "img/logo.svg" },
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Guide" },
        { to: "/docs/reference", label: "API", position: "left" },
        { href: "https://scratch.mit.edu/studios/52025574", label: "Scratch Studio", position: "right" },
        { href: "https://discord.gg/AnsrYzRXar", label: "Discord", position: "right" },
        { href: "pathname:///text-to-scratch/editor/", label: "Open Editor", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Learn",
          items: [
            { label: "Getting started", to: "/docs/intro" },
            { label: "Platformer tutorial", to: "/docs/platformer" },
            { label: "API reference", to: "/docs/reference" },
          ],
        },
        {
          title: "Tools",
          items: [
            { label: "Web editor", href: "pathname:///text-to-scratch/editor/" },
            { label: "Platformer example (.sb3)", href: "pathname:///text-to-scratch/examples/platformer.sb3" },
          ],
        },
        {
          title: "More",
          items: [
            { label: "Discord", href: "https://discord.gg/AnsrYzRXar" },
            { label: "Official Scratch studio", href: "https://scratch.mit.edu/studios/52025574" },
            { label: "GitHub", href: "https://github.com/TextToScratch/TextToScratch" },
            { label: "Support", to: "/support" },
            { label: "Privacy policy", to: "/privacy" },
            { label: "kashtheking.com", href: "https://kashtheking.com" },
          ],
        },
      ],
      copyright: `TextToScratch is not affiliated with the Scratch Foundation. Scratch is a project of the Scratch Foundation.`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
