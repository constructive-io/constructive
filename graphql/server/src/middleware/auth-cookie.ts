import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  AuthCookieSettings,
  setSessionCookie,
  clearSessionCookie,
  setDeviceTokenCookie,
} from './cookie';
import './types';

const log = new Logger('auth-cookie');

const AUTH_MUTATIONS = new Set([
  'signIn',
  'signUp',
  'signInSso',
  'signUpSso',
  'signInMagicLink',
  'signUpMagicLink',
  'signInEmailOtp',
  'signInSmsOtp',
  'signUpSms',
  'signInOneTimeToken',
  'signInCrossOrigin',
  'completeMfaChallenge',
  'refreshToken',
]);

const SIGN_OUT_MUTATIONS = new Set([
  'signOut',
  'revokeSession',
  'revokeAllSessions',
]);

function detectMutationName(body: Record<string, unknown>): string | null {
  const query = body?.query as string | undefined;
  const operationName = body?.operationName as string | undefined;

  if (!query) return null;

  if (operationName) {
    const allMutations = Array.from(AUTH_MUTATIONS).concat(Array.from(SIGN_OUT_MUTATIONS));
    for (const mutation of allMutations) {
      if (query.includes(mutation)) {
        return mutation;
      }
    }
  }

  const mutationMatch = query.match(/mutation\s*(?:\w+\s*)?\{[\s\S]*?(\w+)\s*\(/);
  if (mutationMatch) {
    return mutationMatch[1];
  }

  return null;
}

function extractRememberMe(body: Record<string, unknown>): boolean {
  const variables = body?.variables as Record<string, unknown> | undefined;
  const input = variables?.input as Record<string, unknown> | undefined;
  return input?.rememberMe === true;
}

export function createAuthCookieMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'POST' || !req.path.includes('/graphql')) {
      return next();
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body) {
      return next();
    }

    const mutationName = detectMutationName(body);
    if (!mutationName) {
      return next();
    }

    const isAuthMutation = AUTH_MUTATIONS.has(mutationName);
    const isSignOutMutation = SIGN_OUT_MUTATIONS.has(mutationName);

    if (!isAuthMutation && !isSignOutMutation) {
      return next();
    }

    log.info(`[auth-cookie] Intercepting mutation: ${mutationName}`);

    const originalJson = res.json.bind(res);

    res.json = (responseBody: unknown): Response => {
      try {
        const data = responseBody as Record<string, unknown>;
        const mutationData = data?.data as Record<string, unknown> | undefined;
        const result = mutationData?.[mutationName] as Record<string, unknown> | undefined;

        const authSettings = req.api?.authSettings as AuthCookieSettings | undefined;

        if (isAuthMutation && result) {
          const accessToken = (result.accessToken ?? result.access_token) as string | undefined;
          const deviceToken = (result.deviceToken ?? result.device_token) as string | undefined;

          if (accessToken) {
            const rememberMe = extractRememberMe(body);
            setSessionCookie(res, accessToken, authSettings, rememberMe);
            log.info(`[auth-cookie] Set session cookie for ${mutationName}`);

            if (deviceToken) {
              setDeviceTokenCookie(res, deviceToken, authSettings);
              log.info(`[auth-cookie] Set device token cookie for ${mutationName}`);
            }
          }
        }

        if (isSignOutMutation) {
          clearSessionCookie(res, authSettings);
          log.info(`[auth-cookie] Cleared session cookie for ${mutationName}`);
        }
      } catch (err) {
        log.error('[auth-cookie] Error processing response:', err);
      }

      return originalJson(responseBody);
    };

    next();
  };
}
