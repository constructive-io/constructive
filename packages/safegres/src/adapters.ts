/**
 * `safegres/adapters` — the built-in exposure adapters and the interface a
 * custom one implements. Kept as its own entry point so a config file can
 * import an adapter without pulling in the whole auditor.
 */

export type { ExposureAdapter, PlaneInput } from './exposure/adapters';
export {
  BUILTIN_ADAPTERS,
  constructiveAdapter,
  definePlanes,
  graphileAdapter,
  hasuraAdapter,
  postgrestAdapter,
  resolveAdapters,
  supabaseAdapter
} from './exposure/adapters';
