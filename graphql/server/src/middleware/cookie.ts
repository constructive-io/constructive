import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import type { CookieOptions, Response } from 'express';

const log = new Logger('cookie');

export const SESSION_COOKIE_NAME = 'constructive_session';
export const DEVICE_COOKIE_NAME = 'constructive_device_token';

export interface AuthCookieSettings {
  enableCookieAuth?: boolean;
  defaultSessionDuration?: string;
  rememberMeDuration?: string;
  cookieSecure?: boolean;
  cookieSameSite?: 'strict' | 'lax' | 'none';
  cookieDomain?: string;
  cookiePath?: string;
}

const DEFAULT_SESSION_MAX_AGE = 3600; // 1 hour in seconds
const DEFAULT_REMEMBER_ME_MAX_AGE = 30 * 24 * 3600; // 30 days in seconds
const DEFAULT_DEVICE_TOKEN_MAX_AGE = 90 * 24 * 3600; // 90 days in seconds

function parseIntervalToSeconds(interval?: string): number | undefined {
  if (!interval) return undefined;

  const match = interval.match(/^(\d+)\s*(second|minute|hour|day|week|month|year)s?$/i);
  if (!match) return undefined;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000,
    year: 31536000,
  };

  return value * (multipliers[unit] || 1);
}

export function buildCookieOptions(
  settings?: AuthCookieSettings,
  rememberMe = false
): CookieOptions {
  const isProduction = getNodeEnv() === 'production';

  let maxAge: number;
  if (rememberMe) {
    // Use configured rememberMeDuration or default 30 days
    maxAge = settings?.rememberMeDuration
      ? (parseIntervalToSeconds(settings.rememberMeDuration) ?? DEFAULT_REMEMBER_ME_MAX_AGE)
      : DEFAULT_REMEMBER_ME_MAX_AGE;
  } else {
    // Use configured defaultSessionDuration or default 1 hour
    maxAge = settings?.defaultSessionDuration
      ? (parseIntervalToSeconds(settings.defaultSessionDuration) ?? DEFAULT_SESSION_MAX_AGE)
      : DEFAULT_SESSION_MAX_AGE;
  }

  return {
    httpOnly: true,
    secure: settings?.cookieSecure ?? isProduction,
    sameSite: settings?.cookieSameSite ?? 'lax',
    domain: settings?.cookieDomain,
    path: settings?.cookiePath ?? '/',
    maxAge: maxAge * 1000, // Express expects milliseconds
  };
}

export function buildDeviceCookieOptions(settings?: AuthCookieSettings): CookieOptions {
  const isProduction = getNodeEnv() === 'production';

  return {
    httpOnly: true,
    secure: settings?.cookieSecure ?? isProduction,
    sameSite: settings?.cookieSameSite ?? 'lax',
    domain: settings?.cookieDomain,
    path: settings?.cookiePath ?? '/',
    maxAge: DEFAULT_DEVICE_TOKEN_MAX_AGE * 1000,
  };
}

export function setSessionCookie(
  res: Response,
  token: string,
  settings?: AuthCookieSettings,
  rememberMe = false
): void {
  const options = buildCookieOptions(settings, rememberMe);
  res.cookie(SESSION_COOKIE_NAME, token, options);
  log.info(`[cookie] Set session cookie, rememberMe=${rememberMe}, maxAge=${options.maxAge}ms`);
}

export function clearSessionCookie(res: Response, settings?: AuthCookieSettings): void {
  const options = buildCookieOptions(settings);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    domain: options.domain,
    path: options.path,
  });
  log.info('[cookie] Cleared session cookie');
}

export function setDeviceTokenCookie(
  res: Response,
  deviceToken: string,
  settings?: AuthCookieSettings
): void {
  const options = buildDeviceCookieOptions(settings);
  res.cookie(DEVICE_COOKIE_NAME, deviceToken, options);
  log.info('[cookie] Set device token cookie');
}

export function clearDeviceTokenCookie(res: Response, settings?: AuthCookieSettings): void {
  const options = buildDeviceCookieOptions(settings);
  res.clearCookie(DEVICE_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    domain: options.domain,
    path: options.path,
  });
  log.info('[cookie] Cleared device token cookie');
}
