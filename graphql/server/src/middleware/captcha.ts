import './types'; // for Request type

import { errors } from '@constructive-io/errors';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response
} from 'express';
import {
  Kind,
  parse,
  type DocumentNode,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
  type SelectionSetNode
} from 'graphql';

import { respondWithGraphQLError } from '../errors/graphql-response';

const log = new Logger('captcha');

/** Google reCAPTCHA verification endpoint */
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Header name the client sends the CAPTCHA response token in.
 * Follows the common pattern: X-Captcha-Token.
 */
const CAPTCHA_HEADER = 'x-captcha-token';

/** Match Grafserv's default maximum GraphQL request length. */
export const CAPTCHA_GRAPHQL_BODY_LIMIT_BYTES = 100_000;

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

export type CaptchaOperationInspection =
  | { kind: 'protected'; fields: readonly string[] }
  | { kind: 'not-protected' }
  | { kind: 'invalid'; reason: string };

interface RecaptchaResponse {
  success: boolean;
  'error-codes'?: string[];
}

export interface CaptchaMiddlewareOptions {
  /** Authentication-required deployments must never disable CAPTCHA implicitly. */
  strictAuth?: boolean;
  /** @internal Deterministic environment seam for focused tests. */
  nodeEnv?: ReturnType<typeof getNodeEnv>;
}

/**
 * Parse the GraphQL request formats Grafserv accepts before CAPTCHA admission.
 * Multipart requests are deliberately left to graphql-upload, which supplies
 * the same object-shaped body before the CAPTCHA middleware runs.
 */
export const createCaptchaGraphqlBodyParsers = (): RequestHandler[] => [
  express.json({ limit: CAPTCHA_GRAPHQL_BODY_LIMIT_BYTES }),
  express.text({
    type: 'application/graphql',
    limit: CAPTCHA_GRAPHQL_BODY_LIMIT_BYTES
  }),
  express.urlencoded({
    extended: false,
    limit: CAPTCHA_GRAPHQL_BODY_LIMIT_BYTES
  })
];

const selectOperation = (
  document: DocumentNode,
  operationName: string | undefined
): OperationDefinitionNode | undefined => {
  const operations = document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION
  );
  if (operationName === undefined) {
    return operations.length === 1 ? operations[0] : undefined;
  }
  const matches = operations.filter(
    (operation) => operation.name?.value === operationName
  );
  return matches.length === 1 ? matches[0] : undefined;
};

const collectRootFields = (
  selectionSet: SelectionSetNode,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  activeFragments: Set<string>,
  fields: Set<string>
): string | undefined => {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      fields.add(selection.name.value);
      continue;
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const invalid = collectRootFields(
        selection.selectionSet,
        fragments,
        activeFragments,
        fields
      );
      if (invalid) return invalid;
      continue;
    }

    const fragmentName = selection.name.value;
    const fragment = fragments.get(fragmentName);
    if (!fragment) return `missing fragment ${fragmentName}`;
    if (activeFragments.has(fragmentName)) {
      return `cyclic fragment ${fragmentName}`;
    }
    activeFragments.add(fragmentName);
    const invalid = collectRootFields(
      fragment.selectionSet,
      fragments,
      activeFragments,
      fields
    );
    activeFragments.delete(fragmentName);
    if (invalid) return invalid;
  }
  return undefined;
};

/**
 * Classify the selected operation from the GraphQL document itself. Operation
 * labels are client-controlled and therefore never stand in for root fields.
 */
export const inspectCaptchaOperation = (
  query: unknown,
  operationName: unknown
): CaptchaOperationInspection => {
  if (typeof query !== 'string' || query.trim().length === 0) {
    return { kind: 'invalid', reason: 'missing GraphQL query' };
  }
  if (
    operationName !== undefined
    && operationName !== null
    && (typeof operationName !== 'string' || operationName.length === 0)
  ) {
    return { kind: 'invalid', reason: 'invalid GraphQL operation name' };
  }

  let document: DocumentNode;
  try {
    document = parse(query);
  } catch {
    return { kind: 'invalid', reason: 'malformed GraphQL document' };
  }

  const selected = selectOperation(
    document,
    typeof operationName === 'string' ? operationName : undefined
  );
  if (!selected) {
    return { kind: 'invalid', reason: 'ambiguous or missing GraphQL operation' };
  }
  if (selected.operation !== 'mutation') return { kind: 'not-protected' };

  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind !== Kind.FRAGMENT_DEFINITION) continue;
    if (fragments.has(definition.name.value)) {
      return { kind: 'invalid', reason: `duplicate fragment ${definition.name.value}` };
    }
    fragments.set(definition.name.value, definition);
  }

  const fields = new Set<string>();
  const invalid = collectRootFields(
    selected.selectionSet,
    fragments,
    new Set(),
    fields
  );
  if (invalid) return { kind: 'invalid', reason: invalid };

  const protectedFields = [...fields]
    .filter((field) => CAPTCHA_PROTECTED_OPERATIONS.has(field))
    .sort();
  return protectedFields.length > 0
    ? { kind: 'protected', fields: protectedFields }
    : { kind: 'not-protected' };
};

const isGraphqlPath = (req: Request): boolean => req.path === '/graphql';

const isWebSocketUpgrade = (req: Request): boolean =>
  req.method === 'GET'
  && req.get('upgrade')?.trim().toLowerCase() === 'websocket';

const inspectHttpRequest = (req: Request): CaptchaOperationInspection => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return inspectCaptchaOperation(req.query?.query, req.query?.operationName);
  }

  const body = (req as Request & { body?: unknown }).body;
  if (typeof body === 'string') {
    return inspectCaptchaOperation(body, undefined);
  }
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return { kind: 'invalid', reason: 'invalid GraphQL request body' };
  }
  const graphqlBody = body as Record<string, unknown>;
  return inspectCaptchaOperation(graphqlBody.query, graphqlBody.operationName);
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
 *  - No secret key is configured in a non-production, non-strict local server
 *
 * Production and strict-auth servers fail closed when tenant policy enables
 * CAPTCHA but the server-side secret is missing.
 */
export const createCaptchaMiddleware = (
  options: CaptchaMiddlewareOptions = {}
): RequestHandler => {
  const failClosedWithoutSecret = options.strictAuth === true
    || (options.nodeEnv ?? getNodeEnv()) === 'production';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authSettings = req.api?.authSettings;

    // Skip if CAPTCHA is not enabled
    if (!authSettings?.enableCaptcha) {
      return next();
    }

    // WebSocket handshakes have no operation document. The generation-scoped
    // onSubscribe admission hook rejects protected mutations per operation.
    if (!isGraphqlPath(req) || isWebSocketUpgrade(req) || req.method === 'OPTIONS') {
      return next();
    }

    const inspection = inspectHttpRequest(req);
    if (inspection.kind === 'not-protected') return next();
    if (inspection.kind === 'invalid') {
      log.warn(`[captcha] Rejecting GraphQL request: ${inspection.reason}`);
      respondWithGraphQLError(
        res,
        errors.INTERNAL_FAILURE({ details: 'authentication failed' })
      );
      return;
    }

    // Secret key must be set server-side (env var, not stored in DB for security)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey?.trim()) {
      if (failClosedWithoutSecret) {
        log.error(
          '[captcha] enable_captcha is true but RECAPTCHA_SECRET_KEY is not configured; rejecting protected operation'
        );
        respondWithGraphQLError(
          res,
          errors.INTERNAL_FAILURE({ details: 'authentication failed' })
        );
        return;
      }
      log.warn(
        '[captcha] enable_captcha is true but RECAPTCHA_SECRET_KEY is not configured; '
          + 'skipping verification only for non-production, non-strict local mode'
      );
      return next();
    }

    const captchaToken = req.get(CAPTCHA_HEADER);
    if (!captchaToken) {
      respondWithGraphQLError(res, errors.CAPTCHA_REQUIRED());
      return;
    }

    const valid = await verifyToken(captchaToken, secretKey);
    if (!valid) {
      respondWithGraphQLError(res, errors.CAPTCHA_FAILED());
      return;
    }

    log.info(`[captcha] Verified for fields=${inspection.fields.join(',')}`);
    next();
  };
};
