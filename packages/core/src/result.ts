// Result: the return shape for any core function that can fail (ADR §10).
// Chosen over throwing exceptions specifically so every call site — especially
// in the renderer — is forced to consciously handle the failure case.

export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
