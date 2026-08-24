// Thin executable entry point — the only thing that actually calls
// `.listen()`. Run via `pnpm demo-api` (root package.json) after a real
// build, or directly as `node dist/demo-api/start.js` once built.

import { createDemoApiServer } from "./create-server.js";

const PORT = Number(process.env.DEMO_API_PORT ?? 4000);

const server = createDemoApiServer();
server.listen(PORT, () => {
  console.log(`Demo API listening on http://localhost:${PORT}/v1`);
  console.log("Allowed origins: http://localhost:3000, http://127.0.0.1:3000");
});
