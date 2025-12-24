import { parseUrl } from '@constructive-io/url-domains';
import corsPlugin from 'cors';
import type { Request, RequestHandler } from 'express';
import { CorsModuleData } from '../types';
import './types';

export const cors = (fallbackOrigin?: string): RequestHandler => {
  const dynamicOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void, req: Request) => {
    if (fallbackOrigin && fallbackOrigin.trim().length) {
      if (fallbackOrigin.trim() === '*') {
        return callback(null, true);
      }
      if (origin && origin.trim() === fallbackOrigin.trim()) {
        return callback(null, true);
      }
    }

    const api = (req as any).api as { apiModules?: any[]; domains?: string[] } | undefined;
    if (api) {
      const corsModules = (api.apiModules || []).filter((m: any) => m.name === 'cors') as { name: 'cors'; data: CorsModuleData }[];
      const siteUrls = api.domains || [];
      const listOfDomains = corsModules.reduce<string[]>((m, mod) => [...mod.data.urls, ...m], siteUrls);

      if (origin && listOfDomains.includes(origin)) {
        return callback(null, true);
      }
    }

    if (origin) {
      try {
        const parsed = parseUrl(new URL(origin));
        if (parsed.domain === 'localhost') {
          return callback(null, true);
        }
      } catch {
        // ignore invalid origin
      }
    }

    return callback(null, false);
  };

  const handler: RequestHandler = (req, res, next) =>
    corsPlugin({
      origin: (reqOrigin, cb) => dynamicOrigin(reqOrigin, cb as any, req),
      credentials: true,
      optionsSuccessStatus: 200,
    })(req, res, next);

  return handler;
};
