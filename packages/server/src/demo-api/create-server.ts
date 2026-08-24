// A small, real local HTTP API implementing exactly the operations declared
// in docs-app/app/example-openapi-spec.ts (GET/POST /v1/users, GET
// /v1/users/{userId}, GET /v1/pets) — so Try It Out has a real backend to
// talk to instead of the unreachable https://api.example.com/v1 placeholder.
//
// Deliberately plain node:http rather than a framework: four fixed routes
// don't need a router library, and this keeps packages/server dependency-
// free beyond @docs-platform/core (see the plan discussion — Express was
// the documented "someday" option but was never actually installed, and
// nothing here needs it).
//
// createDemoApiServer() returns an unstarted http.Server (like Express's
// `app` before `.listen()`) — start.ts is the only thing that actually
// calls `.listen()` for real use; tests call `.listen(0)` themselves for an
// ephemeral port, so this module has zero global/process-level side effects
// of its own and is fully unit-testable.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  createUser,
  findUserById,
  listPets,
  listUsers,
  type CreateUserInput,
} from "./data.js";

// Narrowly scoped to local development origins only (no wildcard, no
// production posture) — the two forms a browser might have the docs app
// open under. See client.ts: axios never sets `withCredentials`, so no
// Access-Control-Allow-Credentials is needed here.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (typeof origin === "string" && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // The only two headers Try It Out's built-in auth/body handling can ever
  // actually send (apply-auth-credentials.ts / build-request.ts) — kept
  // narrow rather than reflecting Access-Control-Request-Headers back
  // wholesale.
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(payload);
}

/** Presence-only check, matching what this demo actually needs to prove:
 * the spec's global `bearerAuth` requirement (inherited by listUsers/
 * getUser — see example-openapi-spec.ts) means Try It Out has to send SOME
 * Authorization: Bearer <token> header for those two operations to
 * succeed. This does not verify the token is real — there is no user/token
 * database here, only a check that the documented credential was actually
 * supplied, which is what "the spec requires a credential to execute"
 * means for a local demo with no real identity provider behind it. */
function hasBearerToken(req: IncomingMessage): boolean {
  const header = req.headers.authorization;
  if (typeof header !== "string") return false;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return Boolean(match && match[1] && match[1].trim().length > 0);
}

function requireBearerToken(req: IncomingMessage, res: ServerResponse): boolean {
  if (hasBearerToken(req)) return true;
  sendJson(res, 401, {
    error:
      "Missing or invalid Authorization header. This operation requires: Authorization: Bearer <token> (any non-empty token is accepted by this local demo API).",
  });
  return false;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) return undefined;
  return JSON.parse(raw); // caller wraps in try/catch — a malformed body is a 400, not a crash
}

function isValidCreateUserInput(value: unknown): value is CreateUserInput {
  if (typeof value !== "object" || value === null) return false;
  const email = (value as Record<string, unknown>).email;
  if (typeof email !== "string" || email.trim().length === 0) return false;
  const name = (value as Record<string, unknown>).name;
  return name === undefined || typeof name === "string";
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/v1/users") {
    if (!requireBearerToken(req, res)) return;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam !== null ? Number(limitParam) : undefined;
    sendJson(res, 200, listUsers(limit));
    return;
  }

  if (req.method === "POST" && pathname === "/v1/users") {
    // createUser has `security: []` in the spec — no auth check here.
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Request body is not valid JSON." });
      return;
    }
    if (!isValidCreateUserInput(body)) {
      sendJson(res, 400, { error: '"email" is required and must be a non-empty string.' });
      return;
    }
    const created = createUser(body);
    sendJson(res, 201, created);
    return;
  }

  const userMatch = /^\/v1\/users\/([^/]+)$/.exec(pathname);
  if (req.method === "GET" && userMatch) {
    if (!requireBearerToken(req, res)) return;
    const userId = decodeURIComponent(userMatch[1] as string);
    const user = findUserById(userId);
    if (!user) {
      sendJson(res, 404, { error: `No user found with id "${userId}".` });
      return;
    }
    sendJson(res, 200, user);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/pets") {
    // listPets has `security: []` in the spec — no auth check here.
    sendJson(res, 200, listPets());
    return;
  }

  sendJson(res, 404, { error: `No route for ${req.method} ${pathname}.` });
}

export function createDemoApiServer() {
  return createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
      // Should only happen for a genuinely unexpected failure (not a
      // malformed request, which is already handled above as a 400) — a
      // real 500 is still better than the connection just hanging.
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      });
    });
  });
}
