import { ModuleMap } from '../modules/modules';

/**
 * Get the list of available extensions, including predefined core extensions.
 */
export const getAvailableExtensions = async (
  modules: ModuleMap
): Promise<string[]> => {

  const coreExtensions = [
    // Security & identity
    'pgcrypto',
    'uuid-ossp',
  
    // Developer ergonomics
    'citext',
    'hstore',
  
    // Search & relevance
    'pg_trgm',
    'unaccent',
  
    // Indexing building blocks
    'btree_gin',
    'btree_gist',
  
    // Data interoperability
    'postgres_fdw',
  
    // Geospatial (vertical showcase)
    'postgis',
  
    // Procedural logic (baseline)
    'plpgsql',
  ];
  
  return Object.keys(modules).reduce<string[]>((acc, module) => {
    if (!acc.includes(module)) acc.push(module);
    return acc;
  }, [...coreExtensions]);
};
