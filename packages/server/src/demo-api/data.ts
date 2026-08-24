// In-memory data for the local demo API (see create-server.ts). Deliberately
// just two arrays living in module scope — no database, no persistence
// across process restarts, per this task's explicit scope. Shapes match
// the User/Pet/NewUser schemas in docs-app/app/example-openapi-spec.ts
// exactly (id: string(uuid), email: string(email), name?: string /
// id: string(uuid), name?: string) — this module is intentionally the one
// place those shapes are duplicated as real runtime data, since the spec
// itself is just a JSON document with no code behind it.

export interface DemoUser {
  id: string;
  email: string;
  name?: string;
}

export interface DemoPet {
  id: string;
  name?: string;
}

// Fixed (not randomly generated) seed ids/values — deterministic, so both
// the automated tests and a manual demo can reliably reference
// "00000000-0000-4000-8000-000000000001" as "the first seeded user" without
// having to discover it via a GET first.
const seedUsers: DemoUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "ada@example.com",
    name: "Ada Lovelace",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "grace@example.com",
    name: "Grace Hopper",
  },
];

const seedPets: DemoPet[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Rex" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Whiskers" },
];

// Mutable, module-scoped, reset only by restarting the process — the
// "in-memory dataset" the task asks for, nothing more durable.
export const users: DemoUser[] = [...seedUsers];
export const pets: DemoPet[] = [...seedPets];

export function listUsers(limit?: number): DemoUser[] {
  if (typeof limit === "number" && Number.isInteger(limit) && limit >= 0) {
    return users.slice(0, limit);
  }
  return users;
}

export function findUserById(id: string): DemoUser | undefined {
  return users.find((user) => user.id === id);
}

export interface CreateUserInput {
  email: string;
  name?: string;
}

export function createUser(input: CreateUserInput): DemoUser {
  const user: DemoUser = {
    id: crypto.randomUUID(),
    email: input.email,
    ...(input.name !== undefined ? { name: input.name } : {}),
  };
  users.push(user);
  return user;
}

export function listPets(): DemoPet[] {
  return pets;
}
