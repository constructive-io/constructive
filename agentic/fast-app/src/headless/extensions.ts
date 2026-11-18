// The pi extensions a run with no UI loads for app building: plan_app and
// verify_app, and the tools the app-building prompt sends the agent to. They
// are the desktop's, less the database tools that would make a database or
// mint a key. The host's `preview: false` keeps the pod's dev server address
// out of plan_app's and verify_app's results.

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

/** The database tools with their limits, less the ones a cloud run doesn't get. */
export const headlessDbTools: ExtensionFactory = mapTools(dbToolsWithLimits, (tool) =>
  LEFT_OUT_TOOLS.has(tool.name) ? null : tool
);

/**
 * The extensions whose tools are the database and schema tools, as the
 * desktop's prompt groups them: the db tools and the blueprint tools.
 */
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
