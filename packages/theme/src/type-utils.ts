// Token objects (primitives/semantic/component/theme) are declared `as const`
// for readonly-ness and precise IDE hints, but the *type* each one exports
// (Primitives/Semantic/ComponentTokens/Theme) needs to describe shape only —
// which keys exist and that their values are strings — not the exact literal
// value of the default/light preset. Without this widening, `Theme` would be
// a type only the default theme's exact values could satisfy, making it
// impossible to type a second preset (e.g. dark) with different color values.
export type Widen<T> = T extends string
  ? string
  : { readonly [K in keyof T]: Widen<T[K]> };
