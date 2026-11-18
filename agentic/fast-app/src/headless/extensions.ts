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

/**
 * provision_database would make a second database for a clone with no .env
 * and write the account key into one; create_api_key writes the key it mints
 * into .env.
 */
export const LEFT_OUT_TOOLS: ReadonlySet<string> = new Set(['provision_database', 'create_api_key']);

type AnyTool = ToolDefinition<any, any, any>;

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

export const headlessDbTools: ExtensionFactory = mapTools(dbToolsWithLimits, (tool) =>
  LEFT_OUT_TOOLS.has(tool.name) ? null : tool
);

/** As the desktop's prompt groups the database and schema tools. */
export const DATABASE_EXTENSIONS: readonly ExtensionFactory[] = [headlessDbTools, blueprintTools];

/** The extensions, in the desktop's order (harness/index.ts). */
export function headlessExtensions(): ExtensionFactory[] {
  return [
    codeRules,
    headlessDbTools,
    blueprintTools,
    scopeTools,
    blocksTools,
    fastAppTools,
    planTools
  ];
}

// The Job checks a tenant's tool list before the session exists, so the names
// come from running the extensions on a pi that only records.
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
