import type { TableMeta } from './types';

export let cachedTablesMeta: TableMeta[] = [];

export function getCachedTablesMeta(): TableMeta[] {
  return cachedTablesMeta;
}

export function setCachedTablesMeta(tablesMeta: TableMeta[]): void {
  cachedTablesMeta = tablesMeta;
}
