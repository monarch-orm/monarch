import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Monarch ORM",
  description: "Type safe Object Document Mapper (ODM) for MongoDB",
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
          { text: "Schemas & Types", link: "/guide/schemas-and-types" },
          { text: "Advanced Schemas", link: "/guide/advanced-schemas" },
          { text: "Aggregations & Relations", link: "/guide/aggregation-and-relations" },
        ],
      },
      {
        text: "API Reference",
        items: [{ text: "Collection Methods", link: "/api/" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/monarch-orm/monarch" },
    ],
  },
});
