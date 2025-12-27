import { insertJsonMap, type JsonSeedMap } from 'pgsql-seed';

import { SeedAdapter, SeedContext } from './types';

export function json(data: JsonSeedMap): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      await insertJsonMap(ctx.pg, data);
    }
  };
}
