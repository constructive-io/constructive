import {
  CliError,
  createCommandRegistry,
  defineCommand,
  Type,
  type CommandAdapterHookMap,
  type CommandRegistry,
} from '@constructive-io/cli-runtime';
import type { Inquirerer } from 'inquirerer';

import {
  ConfigStore,
  ConfigStoreError,
  createConfigStoreForEnvironment,
} from '../config';
import { createCodegenHooks, codegenCommand } from './codegen-command';
import {
  createDiscoveryCommands,
  createDiscoveryHooks,
} from './discovery-commands';
import { createExecuteCommandDefinition } from './execute-command';
import { serviceCommands } from './service-commands';
import { createStateCommands } from './state-commands';

export interface CncRegistryOptions {
  version: string;
  store: ConfigStore;
}

export interface CncEnvironmentRegistryOptions {
  version: string;
  env: Readonly<Record<string, string | undefined>>;
  /** Explicit state location for embeddings without a home-directory model. */
  configDir?: string;
}

export interface CncRegistryBundle {
  registry: CommandRegistry;
  createHooks(prompter: Inquirerer): CommandAdapterHookMap;
}

export const createCncRegistry = ({
  version,
  store,
}: CncRegistryOptions): CncRegistryBundle => {
  let registry: CommandRegistry;
  const versionCommand = defineCommand({
    id: 'discovery.version',
    path: ['version'],
    summary: 'Print the CNC package and machine-protocol versions.',
    input: Type.Object({}, { additionalProperties: false }),
    output: Type.Object(
      {
        version: Type.String(),
        protocolVersion: Type.Literal('constructive.dev/cli/v1'),
      },
      { additionalProperties: false }
    ),
    bindings: [],
    examples: [{ argv: ['version'] }],
    lifecycle: 'finite',
    effect: 'read',
    async execute() {
      return {
        data: {
          version,
          protocolVersion: 'constructive.dev/cli/v1' as const,
        },
      };
    },
  });
  const discoveryCommands = createDiscoveryCommands({
    getRegistry: () => registry,
    toolVersion: version,
  });
  registry = createCommandRegistry([
    ...createStateCommands({ store }),
    createExecuteCommandDefinition({ store }),
    codegenCommand,
    ...serviceCommands,
    versionCommand,
    ...discoveryCommands,
  ]);

  return {
    registry,
    createHooks(prompter) {
      const collectHumanContext = async (
        input: unknown,
        context: {
          env: Readonly<Record<string, string | undefined>>;
        }
      ): Promise<Record<string, unknown>> => {
        const candidate = input as Record<string, unknown>;
        if (
          (typeof candidate.contextName === 'string' &&
            candidate.contextName.trim().length > 0) ||
          context.env.CNC_CONTEXT?.trim()
        ) {
          return candidate;
        }

        let state: ReturnType<ConfigStore['read']>;
        try {
          state = store.read();
        } catch (error) {
          if (error instanceof ConfigStoreError) {
            throw new CliError({
              code: error.code,
              category: 'configuration',
              message: error.message,
              details: error.details,
              retryable: error.code === 'CONFIG_LOCK_TIMEOUT',
              cause: error,
            });
          }
          throw error;
        }
        if (state.settings.currentContext !== undefined) return candidate;

        const contextNames = Object.keys(state.contexts).sort();
        if (contextNames.length === 0) {
          throw new CliError({
            code: 'CONTEXT_REQUIRED',
            category: 'configuration',
            message:
              'No contexts are configured. Create a context before configuring authentication.',
            retryable: false,
          });
        }

        const answer = await prompter.prompt(candidate, [
          {
            type: 'autocomplete',
            name: 'contextName',
            message: 'Select context',
            options: contextNames,
            required: true,
          },
        ]);
        return answer as Record<string, unknown>;
      };

      return {
        ...createDiscoveryHooks(),
        ...createCodegenHooks(prompter),
        'discovery.version': {
          renderHuman: (result) => (result.data as { version: string }).version,
        },
        'context.list': {
          renderHuman: (result) => {
            const data = result.data as {
              contexts: Array<{
                name: string;
                endpoint: string;
                current: boolean;
                authentication: string;
              }>;
            };
            if (data.contexts.length === 0) return 'No contexts configured.';
            return data.contexts
              .map(
                ({ name, endpoint, current, authentication }) =>
                  `${current ? '* ' : '  '}${name}\t${endpoint}\t${authentication}`
              )
              .join('\n');
          },
        },
        'context.current': {
          renderHuman: (result) => {
            const { context } = result.data as {
              context: { name: string; endpoint: string } | null;
            };
            return context
              ? `${context.name}\t${context.endpoint}`
              : 'No current context.';
          },
        },
        'auth.set-token': {
          collectInteractiveInput: async (input, context) => {
            const candidate = await collectHumanContext(input, context);
            if (
              candidate.legacyValue !== undefined ||
              candidate.stdinValue !== undefined ||
              candidate.environmentValue !== undefined
            ) {
              return candidate as never;
            }
            const answer = await prompter.prompt(candidate, [
              {
                type: 'password',
                name: 'stdinValue',
                message: 'API token',
                required: true,
              },
            ]);
            return answer as never;
          },
        },
        'auth.logout': {
          collectInteractiveInput: async (input, context) =>
            (await collectHumanContext(input, context)) as never,
        },
        execute: {
          renderHuman: (result) =>
            JSON.stringify((result.data as { data: unknown }).data, null, 2),
        },
      };
    },
  };
};

/**
 * Create the complete reusable CNC registry from an explicit environment
 * snapshot. This keeps in-process consumers off ambient process state and
 * avoids requiring knowledge of the state-store implementation.
 */
export const createCncRegistryForEnvironment = ({
  version,
  env,
  configDir,
}: CncEnvironmentRegistryOptions): CncRegistryBundle =>
  createCncRegistry({
    version,
    store:
      configDir === undefined
        ? createConfigStoreForEnvironment(env)
        : new ConfigStore({ configDir }),
  });
