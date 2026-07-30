/**
 * graphile-history — PostGraphile v5 History Plugin
 *
 * Per-row version history, point-in-time reads, and restore mutations for
 * tables tagged with `@history` (the constructive-db `DataHistory` module).
 *
 * @example
 * ```typescript
 * import { HistoryPreset } from 'graphile-history';
 *
 * const preset = {
 *   extends: [
 *     HistoryPreset(),
 *   ],
 * };
 * ```
 */

// Plugin
export { createHistoryPlugin, HistoryPlugin } from './plugin';

// Preset
export { HistoryPreset } from './preset';

// Types
export type { HistoryColumn,HistoryPluginOptions, HistoryTableInfo } from './types';
