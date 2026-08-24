import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createDemoApiServer } from "./create-server.js";

let server: ReturnType<typeof createDemoApiServer>;
let baseUrl: string;

beforeEach(async () => {
  server = createDemoApiServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const ORIGIN = "http://localhost:3000";
const BEARER = { Authorization: "Bearer any-non-empty-token" };

describe("demo API — GET /v1/users", () => {
  it("returns 200 with the seeded users when a bearer token is present", async () => {
    const res = await fetch(`${baseUrl}/v1/users`, { headers: { ...BEARER, Origin: ORIGIN } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body[0]).toMatchObject({ email: expect.any(String) });
  });

  it("honors the limit query parameter", async () => {
    const res = await fetch(`${baseUrl}/v1/users?limit=1`, { headers: { ...BEARER } });
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("returns 401 when no Authorization header is sent (spec's global bearerAuth requirement)", async () => {
    const res = await fetch(`${baseUrl}/v1/users`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/authorization/i);
  });
});

describe("demo API — POST /v1/users", () => {
  it("creates a user and returns 201 with no auth required (spec overrides security: [])", async () => {
    const res = await fetch(`${baseUrl}/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "New Person" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ email: "new@example.com", name: "New Person" });
    expect(typeof body.id).toBe("string");
  });

  it("the created user is then retrievable via GET /v1/users/:userId", async () => {
    const createRes = await fetch(`${baseUrl}/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "roundtrip@example.com" }),
    });
    const created = await createRes.json();

    const getRes = await fetch(`${baseUrl}/v1/users/${created.id}`, { headers: { ...BEARER } });
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched).toEqual(created);
  });

  it("returns 400 when email is missing (NewUser schema requires it)", async () => {
    const res = await fetch(`${baseUrl}/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Email" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it("returns 400 for a malformed JSON body instead of crashing", async () => {
    const res = await fetch(`${baseUrl}/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json",
    });
    expect(res.status).toBe(400);
  });
});

describe("demo API — GET /v1/users/:userId", () => {
  it("returns 200 for a seeded user id", async () => {
    const res = await fetch(`${baseUrl}/v1/users/00000000-0000-4000-8000-000000000001`, {
      headers: { ...BEARER },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("ada@example.com");
  });

  it("returns 404 for an unknown user id (the deliberate 404 case)", async () => {
    const res = await fetch(`${baseUrl}/v1/users/does-not-exist`, { headers: { ...BEARER } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no user found/i);
  });

  it("returns 401 when no Authorization header is sent, before even checking the id", async () => {
    const res = await fetch(`${baseUrl}/v1/users/00000000-0000-4000-8000-000000000001`);
    expect(res.status).toBe(401);
  });
});

describe("demo API — GET /v1/pets", () => {
  it("returns 200 with the seeded pets, no auth required", async () => {
    const res = await fetch(`${baseUrl}/v1/pets`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);
  });
});

describe("demo API — unknown routes", () => {
  it("returns 404 for a path that matches no route", async () => {
    const res = await fetch(`${baseUrl}/v1/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe("demo API — CORS", () => {
  it("reflects an allowed origin on a normal GET response", async () => {
    const res = await fetch(`${baseUrl}/v1/pets`, { headers: { Origin: ORIGIN } });
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("does not set Access-Control-Allow-Origin for a disallowed origin", async () => {
    const res = await fetch(`${baseUrl}/v1/pets`, { headers: { Origin: "https://evil.example" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers an OPTIONS preflight with 204 and the expected CORS headers", async () => {
    const res = await fetch(`${baseUrl}/v1/users`, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("access-control-allow-methods")).toMatch(/POST/);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/content-type/i);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/authorization/i);
  });
});
