import type { CommandAdapterHookMap } from '@constructive-io/cli-runtime';
import type { Inquirerer, OptionValue, Question } from 'inquirerer';

import { importOptionalCapability } from './optional-capability';

const loadServicePromptDependencies = async () =>
  Promise.all([
    importOptionalCapability(
      'service prompts',
      '@constructive-io/graphql-env',
      () => import('@constructive-io/graphql-env')
    ),
    importOptionalCapability(
      'service prompts',
      'pg-cache',
      () => import('pg-cache')
    ),
  ]);

const serverQuestions: Question[] = [
  {
    name: 'simpleInflection',
    message: 'Use simple inflection?',
    type: 'confirm',
    required: false,
    default: true,
    useDefault: true,
  },
  {
    name: 'oppositeBaseNames',
    message: 'Use opposite base names?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'postgis',
    message: 'Enable PostGIS extension?',
    type: 'confirm',
    required: false,
    default: true,
    useDefault: true,
  },
  {
    name: 'servicesApi',
    message: 'Enable Services API?',
    type: 'confirm',
    required: false,
    default: true,
    useDefault: true,
  },
  {
    name: 'origin',
    message: 'CORS origin (exact URL or *)',
    type: 'text',
    required: false,
  },
  {
    name: 'port',
    message: 'Development server port',
    type: 'number',
    required: false,
    default: 5555,
    useDefault: true,
  },
];

const explorerQuestions: Question[] = [
  ...serverQuestions.filter(
    ({ name }) => name !== 'servicesApi' && name !== 'origin'
  ),
  {
    name: 'origin',
    message: 'CORS origin URL',
    type: 'text',
    required: false,
    default: 'http://localhost:3000',
    useDefault: true,
  },
];

const listDatabases = async (
  cwd: string,
  env: Readonly<Record<string, string | undefined>>
): Promise<string[]> => {
  const [{ getEnvOptions }, { getPgPool, PgPoolCacheManager }] =
    await loadServicePromptDependencies();
  const cache = new PgPoolCacheManager(undefined, env);
  try {
    const options = getEnvOptions({ pg: { database: 'postgres' } }, cwd, {
      ...env,
    });
    const result = await getPgPool(options.pg, {
      cache,
      environment: env,
    }).query<{ datname: string }>(`
      SELECT datname FROM pg_database
      WHERE datistemplate = false AND datname NOT IN ('postgres')
        AND datname !~ '^pg_'
      ORDER BY datname;
    `);
    return result.rows.map(({ datname }) => datname);
  } finally {
    await cache.close();
  }
};

const listSchemas = async (
  database: string,
  cwd: string,
  env: Readonly<Record<string, string | undefined>>
): Promise<string[]> => {
  const [{ getEnvOptions }, { getPgPool, PgPoolCacheManager }] =
    await loadServicePromptDependencies();
  const cache = new PgPoolCacheManager(undefined, env);
  try {
    const options = getEnvOptions({ pg: { database } }, cwd, { ...env });
    const result = await getPgPool(options.pg, {
      cache,
      environment: env,
    }).query<{ nspname: string }>(`
      SELECT nspname FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY nspname;
    `);
    return result.rows.map(({ nspname }) => nspname);
  } finally {
    await cache.close();
  }
};

export const createServiceHooks = (
  prompter: Inquirerer
): CommandAdapterHookMap => ({
  'server.start': {
    collectInteractiveInput: async (input, context) => {
      const [{ getEnvOptions }] = await loadServicePromptDependencies();
      let candidate = { ...(input as Record<string, unknown>) };
      if (candidate.database === undefined) {
        const configured = getEnvOptions({}, context.cwd, {
          ...context.env,
        }).pg.database;
        if (context.env.PGDATABASE || configured !== 'postgres') {
          candidate.database = context.env.PGDATABASE ?? configured;
        } else {
          const databases = await listDatabases(context.cwd, context.env);
          candidate = await prompter.prompt(candidate, [
            {
              type: 'autocomplete',
              name: 'database',
              message: 'Select the database to use',
              options: databases,
              required: true,
            },
          ]);
        }
      }

      candidate = await prompter.prompt(candidate, serverQuestions);
      if (candidate.servicesApi === false) {
        if (candidate.schemas === undefined) {
          const schemas = await listSchemas(
            String(candidate.database),
            context.cwd,
            context.env
          );
          const answer = await prompter.prompt(candidate, [
            {
              type: 'checkbox',
              name: 'schemas',
              message: 'Select schemas to expose',
              options: schemas.map((schema) => ({
                name: schema,
                value: schema,
                selected: true,
              })),
              required: true,
            },
          ]);
          candidate.schemas = (answer.schemas as OptionValue[])
            .filter(({ selected }) => selected)
            .map(({ value }) => value)
            .join(',');
        }
        candidate = await prompter.prompt(candidate, [
          {
            type: 'autocomplete',
            name: 'authRole',
            message: 'Select the authentication role',
            options: ['postgres', 'authenticated', 'anonymous'],
            required: true,
          },
          {
            type: 'autocomplete',
            name: 'roleName',
            message: 'Enter the default role name',
            options: ['postgres', 'authenticated', 'anonymous'],
            required: true,
          },
        ]);
      }
      return candidate as never;
    },
  },
  'explorer.start': {
    collectInteractiveInput: async (input) =>
      (await prompter.prompt(
        input as Record<string, unknown>,
        explorerQuestions
      )) as never,
  },
  'jobs.up': {
    collectInteractiveInput: async (input) =>
      (await prompter.prompt(input as Record<string, unknown>, [
        {
          name: 'withJobsServer',
          message: 'Enable jobs server?',
          type: 'confirm',
          required: false,
          default: false,
          useDefault: true,
        },
      ])) as never,
  },
});
