import type passport from 'passport';
import type { OAuthProvider, UpsertResult } from '../common';
import type { Response, Request } from 'express';

export type OAuthProviderConfig = {
  clientId?: string;
  clientSecret?: string;
};

export type EmailPicker = (profile: any) => { email: string; verified: boolean } | null;

export type ProviderBuilder = {
  name: OAuthProvider;
  scope: string[];
  mount: (
    opts: any,
    cfg: OAuthProviderConfig | undefined,
    deps: {
      pool: ReturnType<typeof import('pg-cache').getPgPool>;
      frontendCallbackUrl?: string;
      redirectWithToken: (
        res: Response,
        tokenData: UpsertResult,
        provider: OAuthProvider,
        req: Request
      ) => void;
      logError: (msg: string, err?: unknown) => void;
    }
  ) => import('express').Router;
};
