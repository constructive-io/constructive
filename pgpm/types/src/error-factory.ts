/**
 * pgpm error factory.
 *
 * The canonical error system now lives in `@constructive-io/errors` (a
 * standalone, zero-dependency package). pgpm's error codes are registered
 * there; this module re-exports the shared factory so existing call sites
 * (`throw errors.MODULE_NOT_FOUND({ name })`) are unchanged.
 */
export { errors, makeError } from '@constructive-io/errors';
