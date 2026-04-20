import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import './types'; // for Request type

const log = new Logger('captcha');

/** Google reCAPTCHA verification endpoint */
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Header name the client sends the CAPTCHA response token in.
 * Follows the common pattern: X-Captcha-Token.
 */
const CAPTCHA_HEADER = 'x-captcha-token';

/**
 * GraphQL mutation names that require CAPTCHA verification when enabled.
 * Only sign-up and password-reset are gated; normal sign-in is not.
 */
const CAPTCHA_PROTECTED_OPERATIONS = new Set([
  'signUp',
  'signUpWithMagicLink',
  'signUpWithSms',
  'resetPassword',
  'requestPasswordReset',
]);

interface RecaptchaResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Attempt to extract the GraphQL operation name from the request body.
 * Works for both JSON and already-parsed bodies.
 */
const getOperationName = (req: Request): string | undefined => {
  const body = (req as any).body;
  if (!body) return undefined;
  // Already parsed (express.json ran first)
  if (typeof body === 'object' && body.operationName) {
    return body.operationName;
  }
  return undefined;
};

/**
 * Verify a reCAPTCHA token with Google's API.
 */
const verifyToken = async (token: string, secretKey: string): Promise<boolean> => {
  try {
    const params = new URLSearchParams({ secret: secretKey, response: token });
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      body: params,
    });
    const data = (await res.json()) as RecaptchaResponse;
    if (!data.success) {
      log.debug(`[captcha] Verification failed: ${data['error-codes']?.join(', ') ?? 'unknown'}`);
    }
    return data.success;
  } catch (e: any) {
    log.error('[captcha] Error verifying token:', e.message);
    return false;
  }
};

/**
 * Creates a CAPTCHA verification middleware.
 *
 * When `enable_captcha` is true in app_auth_settings, this middleware checks
 * the X-Captcha-Token header on protected mutations (sign-up, password reset).
 * The secret key is read from the RECAPTCHA_SECRET_KEY environment variable
 * (the public site key is stored in app_auth_settings for the frontend).
 *
 * Skips verification when:
 *  - CAPTCHA is not enabled in auth settings
 *  - The request is not a protected mutation
 *  - No secret key is configured server-side
 */
export const createCaptchaMiddleware = (): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authSettings = req.api?.authSettings;

    // Skip if CAPTCHA is not enabled
    if (!authSettings?.enableCaptcha) {
      return next();
    }

    // Only gate protected operations
    const opName = getOperationName(req);
    if (!opName || !CAPTCHA_PROTECTED_OPERATIONS.has(opName)) {
      return next();
    }

    // Secret key must be set server-side (env var, not stored in DB for security)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      log.warn('[captcha] enable_captcha is true but RECAPTCHA_SECRET_KEY env var is not set; skipping verification');
      return next();
    }

    const captchaToken = req.get(CAPTCHA_HEADER);
    if (!captchaToken) {
      res.status(200).json({
        errors: [{
          message: 'CAPTCHA verification required',
          extensions: { code: 'CAPTCHA_REQUIRED' },
        }],
      });
      return;
    }

    const valid = await verifyToken(captchaToken, secretKey);
    if (!valid) {
      res.status(200).json({
        errors: [{
          message: 'CAPTCHA verification failed',
          extensions: { code: 'CAPTCHA_FAILED' },
        }],
      });
      return;
    }

    log.info(`[captcha] Verified for operation=${opName}`);
    next();
  };
};
