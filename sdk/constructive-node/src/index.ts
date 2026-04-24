/**
 * @constructive-io/node
 *
 * @deprecated Use `@constructive-io/sdk` directly. As of codegen 5.x, every
 * generated SDK ships with an isomorphic `FetchAdapter` that transparently
 * handles Node's `*.localhost` DNS and `Host`-header quirks — no Node-specific
 * package required. This package remains for backwards compatibility and will
 * be removed in a future major release.
 *
 * @example Migration
 * ```diff
 * - import { admin, auth } from '@constructive-io/node';
 * + import { admin, auth } from '@constructive-io/sdk';
 * ```
 */

export * from '@constructive-io/sdk';

export { fetch } from './fetch';

export { NodeHttpAdapter } from './node-http-adapter';
export type { NodeHttpExecuteOptions } from './node-http-adapter';
