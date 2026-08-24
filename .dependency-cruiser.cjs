/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-must-not-depend-on-siblings",
      comment:
        "ADR §6: core is framework-agnostic domain logic. It must never depend on theme, react-renderer, server, or docs-app.",
      severity: "error",
      from: { path: "^packages/core" },
      to: { path: "^packages/(theme|react-renderer|server|docs-app)" },
    },
    {
      name: "core-must-not-depend-on-react",
      comment: "ADR §6: core must contain no React or DOM APIs.",
      severity: "error",
      from: { path: "^packages/core" },
      to: { path: "node_modules/(react|react-dom|next)($|/)" },
    },
    {
      name: "theme-must-not-depend-on-siblings",
      comment:
        "ADR §6: theme is design tokens and presets only — no business logic, no spec-aware code.",
      severity: "error",
      from: { path: "^packages/theme" },
      to: { path: "^packages/(core|react-renderer|server|docs-app)" },
    },
    {
      name: "server-must-not-depend-on-ui",
      comment:
        "ADR §6: server (the optional Express proxy) must not depend on theme, react-renderer, or docs-app.",
      severity: "error",
      from: { path: "^packages/server" },
      to: { path: "^packages/(theme|react-renderer|docs-app)" },
    },
    {
      name: "server-must-not-depend-on-react",
      comment: "ADR §6: server must contain no UI logic.",
      severity: "error",
      from: { path: "^packages/server" },
      to: { path: "node_modules/(react|react-dom|next)($|/)" },
    },
    {
      name: "react-renderer-must-not-depend-on-server-or-app",
      comment:
        "ADR §6: react-renderer may depend on core and theme only — never server or docs-app (that would invert the dependency direction).",
      severity: "error",
      from: { path: "^packages/react-renderer" },
      to: { path: "^packages/(server|docs-app)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
