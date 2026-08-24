// The swap seam ADR §13 calls for: everything downstream of search should
// depend on THIS interface, never on searchOperations directly. That's what
// makes it possible to later swap in a smarter implementation (Fuse.js,
// FlexSearch, etc. — for fuzzy matching or much larger specs) without
// touching any calling code, only which SearchProvider gets constructed.
//
// Kept synchronous on purpose: our default implementation is a plain
// in-memory scan with no I/O, and there's no evidence yet of a provider that
// would need to be async (e.g. a remote search service). Add that only if a
// real implementation actually needs it — see the same reasoning already
// applied to config's merge logic and search's own indexing approach.

import type { Operation } from "../spec/normalized-spec.js";
import type { SearchResult } from "./search-operations.js";
import { searchOperations } from "./search-operations.js";

export interface SearchProvider {
  search(operations: Operation[], query: string): SearchResult[];
}

/** The default provider — a thin wrapper around searchOperations (Part 2),
 * conforming to the interface everything else should depend on. */
export const defaultSearchProvider: SearchProvider = {
  search: searchOperations,
};
