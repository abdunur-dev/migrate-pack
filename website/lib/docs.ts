export interface DocLink {
  href: string;
  title: string;
}

export const DOC_GROUPS: { title: string; links: DocLink[] }[] = [
  { title: "Get started", links: [{ href: "/docs", title: "Introduction" }] },
  {
    title: "Guides",
    links: [
      { href: "/docs/commands", title: "Commands" },
      { href: "/docs/manual-review", title: "Manual review" },
    ],
  },
  {
    title: "Reference",
    links: [
      { href: "/docs/rules", title: "Rules" },
      { href: "/docs/rules-file", title: "Rules file" },
    ],
  },
  { title: "Project", links: [{ href: "/docs/limits", title: "Limits and roadmap" }] },
];

export const DOC_ORDER: DocLink[] = DOC_GROUPS.flatMap((g) => g.links);

export const GITHUB_URL = "https://github.com/abdunur-dev/migrate-pack";
export const NPM_URL = "https://www.npmjs.com/package/migrate-pack";
export const EXPRESS_GUIDE_URL = "https://expressjs.com/en/guide/migrating-5.html";
