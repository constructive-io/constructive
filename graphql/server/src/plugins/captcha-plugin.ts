import '../middleware/types'; // for Request type

import type { ConstructiveError } from '@constructive-io/errors';
import { errors } from '@constructive-io/errors';
import { Logger } from '@pgpmjs/logger';
import type { Request } from 'express';
import type { GraphileConfig } from 'graphile-config';
import type { DocumentNode, ExecutionResult, SelectionSetNode } from 'graphql';
import { getOperationAST, GraphQLError, Kind } from 'graphql';

const log = new Logger('captcha');

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/** Header the client sends the CAPTCHA response token in. */
const CAPTCHA_HEADER = 'x-captcha-token';

/**
 * Mutation fields that need a verified CAPTCHA token when the tenant's
 * `enable_captcha` is on: the sign-up and password-reset endpoints.
 */
const CAPTCHA_PROTECTED_FIELDS = new Set([
  'signUp',
  'signUpMagicLink',
  'signUpSms',
  'forgotPassword',
  'resetPassword',
  // Names the gate has always listed; no current schema exposes them.
  'signUpWithMagicLink',
  'signUpWithSms',
  'requestPasswordReset'
]);

interface RecaptchaResponse {
  success: boolean;
  'error-codes'?: string[];
}

/** The response for a refused request: no data, the registered error. */
const refuse = (error: ConstructiveError): ExecutionResult => ({
  errors: [new GraphQLError(error.message, { extensions: error.toExtensions() })]
});

/**
 * The protected root fields of the mutation that will execute: the operation
 * `operationName` selects, with its fragments followed. An alias, the
 * operation's own name and the document's other operations play no part.
 * `@skip`/`@include` are not evaluated, so a conditional field counts.
 */
export const protectedMutationFields = (
  document: DocumentNode,
  operationName?: string | null
): string[] => {
  const operation = getOperationAST(document, operationName);
  if (operation?.operation !== 'mutation') return [];

  const found: string[] = [];
  const seenFragments = new Set<string>();
  const walk = (selectionSet: SelectionSetNode): void => {
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        if (CAPTCHA_PROTECTED_FIELDS.has(selection.name.value)) found.push(selection.name.value);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        walk(selection.selectionSet);
      } else if (!seenFragments.has(selection.name.value)) {
        seenFragments.add(selection.name.value);
        const fragment = document.definitions.find(
          (def) => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === selection.name.value
        );
        if (fragment?.kind === Kind.FRAGMENT_DEFINITION) walk(fragment.selectionSet);
      }
    }
  };
  walk(operation.selectionSet);
  return found;
};

const verifyToken = async (token: string, secretKey: string): Promise<boolean> => {
  try {
    const params = new URLSearchParams({ secret: secretKey, response: token });
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      body: params
    });
    const data = (await res.json()) as RecaptchaResponse;
    if (data.success !== true) {
      log.debug(`[captcha] Verification failed: ${data['error-codes']?.join(', ') ?? 'unknown'}`);
    }
    return data.success === true;
  } catch (e: any) {
    log.error('[captcha] Error verifying token:', e.message);
    return false;
  }
};

const getExpressRequest = (
  requestContext: Partial<Grafast.RequestContext> | undefined
): Request | undefined => (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;

/**
 * CaptchaPlugin — with the tenant's `enable_captcha` on, a sign-up or
 * password-reset mutation executes only for a request whose
 * `X-Captcha-Token` the reCAPTCHA service accepts.
 *
 * The check wraps grafast's `execute`, so it sees the document grafserv
 * parsed and the operation about to run. An Express middleware in front of
 * grafserv cannot do this: grafserv reads the request body itself, so
 * `req.body` is not there to inspect, and the operation name a client sends
 * says nothing about the fields that run. A refusal is returned as the
 * operation's result rather than thrown: grafserv reports a throw from here
 * as a bare message, without the error's code.
 */
export const CaptchaPlugin: GraphileConfig.Plugin = {
  name: 'CaptchaPlugin',
  version: '0.0.0',
  description: 'Requires a verified CAPTCHA token for sign-up and password-reset mutations when the tenant enables it.',

  grafast: {
    middleware: {
      async execute(next, event) {
        const { args } = event;
        const req = getExpressRequest(args.requestContext);

        if (req?.api?.authSettings?.enableCaptcha && args.document) {
          const fields = protectedMutationFields(args.document, args.operationName);
          if (fields.length > 0) {
            const token = req.get(CAPTCHA_HEADER);
            // A token is good for one action, so it cannot cover several.
            if (!token || fields.length > 1) return refuse(errors.CAPTCHA_REQUIRED());

            const secretKey = process.env.RECAPTCHA_SECRET_KEY;
            if (!secretKey) {
              log.error('[captcha] enable_captcha is true but RECAPTCHA_SECRET_KEY is not set; refusing the request');
              return refuse(errors.CAPTCHA_FAILED());
            }
            if (!(await verifyToken(token, secretKey))) return refuse(errors.CAPTCHA_FAILED());

            log.info(`[captcha] Verified for field=${fields[0]}`);
          }
        }

        return next();
      }
    }
  }
};
