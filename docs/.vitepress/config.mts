import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Monarch ORM",
  description: "Type safe ODM for MongoDB",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Schemas", link: "/guide/schemas" },
          { text: "Queries & Mutations", link: "/guide/queries-and-mutations" },
          { text: "Query Builders", link: "/guide/query-builders" },
          { text: "Types", link: "/guide/types" },
          { text: "Relations", link: "/guide/relations" },
          { text: "Operators", link: "/guide/operators" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/monarch-orm/monarch" }],
  },
});
