// The pi extensions a run with no UI loads for app building: plan_app and
// verify_app, and the tools the app-building prompt sends the agent to. They
// are the desktop's, with two changes for a cloud run: the database tools
// that would make a database or mint a key are left out, and no result
// carries the pod's dev server address.

import type {
  ExtensionAPI,
  ExtensionFactory,
  ToolDefinition
} from '@earendil-works/pi-coding-agent';

import { blocksTools } from '../extensions/blocks-tools';
import { blueprintTools } from '../extensions/blueprint-tools';
import { codeRules } from '../extensions/code-rules';
import { dbToolsWithLimits } from '../extensions/db-tools/index-extension';
import { planTools } from '../extensions/plan-tools';
import { scopeTools } from '../extensions/scope-tools';
import { fastAppTools } from '../tools';
import { withoutPreviewUrl } from './progress-watch';

/**
 * The database tools a cloud run doesn't get. provision_database would make a
 * second database for a clone with no .env and write the account key into
 * one; create_api_key writes the key it mints into .env. The run's database
 * exists already, and no key goes on disk.
 */
export const LEFT_OUT_TOOLS: ReadonlySet<string> = new Set(['provision_database', 'create_api_key']);

type AnyTool = ToolDefinition<any, any, any>;

/** `factory`, with each tool it registers passed through `map`; null leaves the tool out. */
export function mapTools(
  factory: ExtensionFactory,
  map: (tool: AnyTool) => AnyTool | null
): ExtensionFactory {
  return (pi) =>
    factory(
      new Proxy(pi, {
        get(target, key) {
          if (key === 'registerTool') {
            return (tool: AnyTool) => {
              const mapped = map(tool);
              if (mapped) target.registerTool(mapped);
            };
          }
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      })
    );
}

const cleanResult = <T extends { details?: unknown }>(result: T): T => {
  const details = result?.details as { previewUrl?: string } | undefined;
  return details && typeof details === 'object' && 'previewUrl' in details
    ? { ...result, details: withoutPreviewUrl(details) }
    : result;
};

/** A tool whose result and updates leave out `previewUrl`: no other client reaches the pod. */
export function withoutPreviewUrls(tool: AnyTool): AnyTool {
  return {
    ...tool,
    execute: async (toolCallId, params, signal, onUpdate, ctx) =>
      cleanResult(
        await tool.execute(
          toolCallId,
          params,
          signal,
          onUpdate && ((partial) => onUpdate(cleanResult(partial))),
          ctx
        )
      )
  };
}

/** The extensions, in the desktop's order (harness/index.ts). */
export function headlessExtensions(): ExtensionFactory[] {
  return [
    codeRules,
    mapTools(dbToolsWithLimits, (tool) => (LEFT_OUT_TOOLS.has(tool.name) ? null : tool)),
    blueprintTools,
    scopeTools,
    blocksTools,
    mapTools(fastAppTools, withoutPreviewUrls),
    planTools
  ];
}

/**
 * The names of the tools the extensions register, read by running them on a
 * pi that only records: the Job checks a tenant's tool list against them
 * before the session exists.
 */
export async function toolNamesOf(extensions: readonly ExtensionFactory[]): Promise<string[]> {
  const names: string[] = [];
  const recorder = new Proxy({} as ExtensionAPI, {
    get: (_target, key) =>
      key === 'registerTool'
        ? (tool: AnyTool): void => void names.push(tool.name)
        : (): undefined => undefined
  });
  for (const extension of extensions) await extension(recorder);
  return names;
}
