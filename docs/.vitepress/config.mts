import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Monarch ORM",
  description: "Type safe ODM for MongoDB",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Schemas", link: "/guide/schemas" },
          { text: "Types", link: "/guide/types" },
          { text: "Queries", link: "/guide/queries" },
          { text: "Relations", link: "/guide/relations" },
          { text: "Operators", link: "/guide/operators" },
        ],
      },
      {
        text: "API Reference",
        items: [{ text: "Collection Methods", link: "/api/" }],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/monarch-orm/monarch" }],
  },
});
