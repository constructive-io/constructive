import '../../test-utils/env';

import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { GraphileConfig } from 'graphile-config';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { getConnectionsObject, seed, snapshot } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { PostGraphileConnectionFilterPreset } from '../../src';
import CustomOperatorsPlugin from '../../test-utils/customOperatorsPlugin';

jest.setTimeout(60000);

type ConnectionVariant =
  | 'addConnectionFilterOperator'
  | 'dynamicJson'
  | 'networkScalars'
  | 'normal'
  | 'nullAndEmptyAllowed'
  | 'relations'
  | 'simpleCollections';

type ConnectionContext = {
  db: PgTestClient;
  query: GraphQLQueryFnObj;
  teardown: () => Promise<void>;
};

const SCHEMA = process.env.SCHEMA ?? 'p';
const AUTH_ROLE = 'postgres';
const sql = (file: string) => join(__dirname, '../../sql', file);
const queriesDir = join(__dirname, '../fixtures/queries');
const queryFileNames = readdirSync(queriesDir);

/**
 * Base preset for v5 testing.
 * Extends graphile-build defaults and the connection filter preset.
 * Disables NodePlugin and PgConditionArgumentPlugin to match v4 test setup.
 */
const BaseTestPreset: GraphileConfig.Preset = {
  extends: [
    graphileBuildDefaultPreset,
    graphileBuildPgDefaultPreset,
    PostGraphileConnectionFilterPreset,
  ],
  disablePlugins: [
    'NodePlugin',
    'PgConditionArgumentPlugin',
  ],
};

const seeds = [
  seed.sqlfile([sql('schema.sql'), sql('data.sql')]),
];

const createContext = async (
  variantPreset?: GraphileConfig.Preset
): Promise<ConnectionContext> => {
  const useRoot = true;

  // Build the complete preset by merging base with variant-specific options
  const preset: GraphileConfig.Preset = {
    extends: [
      BaseTestPreset,
      ...(variantPreset?.extends ?? []),
    ],
    ...(variantPreset?.plugins && { plugins: variantPreset.plugins }),
    ...(variantPreset?.disablePlugins && { disablePlugins: variantPreset.disablePlugins }),
    ...(variantPreset?.schema && { schema: variantPreset.schema }),
    ...(variantPreset?.grafast && { grafast: variantPreset.grafast }),
  };

  const connections = await getConnectionsObject(
    {
      useRoot,
      schemas: [SCHEMA],
      authRole: AUTH_ROLE,
      preset,
    },
    seeds
  );

  const session = useRoot ? connections.pg : connections.db;

  return {
    db: session,
    query: connections.query,
    teardown: connections.teardown,
  };
};

/**
 * Variant configurations using v5 preset format.
 *
 * V4 to V5 mapping:
 * - graphileBuildOptions -> schema options in preset
 * - dynamicJson: true -> grafast.context with jsonDynamic setting
 * - simpleCollections: 'only' -> schema.simpleCollections = 'only'
 * - pgUseCustomNetworkScalars: true -> Default in v5, no change needed
 * - appendPlugins: [Plugin] -> plugins: [Plugin] in preset
 */
const variantConfigs: Record<ConnectionVariant, GraphileConfig.Preset | undefined> = {
  normal: undefined,

  dynamicJson: {
    // In v5, dynamic JSON behavior is controlled differently.
    // The grafast execution handles JSON dynamically by default.
    // This config enables JSON as a GraphQL scalar type.
    schema: {
      jsonScalarAsString: false,
    },
  },

  networkScalars: {
    // pgUseCustomNetworkScalars is the default in v5
    // No additional configuration needed
    schema: {},
  },

  relations: {
    schema: {
      connectionFilterRelations: true,
    },
  },

  simpleCollections: {
    // In v5, simpleCollections is achieved via behavior settings.
    // 'only' means: disable connections, enable lists
    schema: {
      defaultBehavior: '-connection -resource:connection list resource:list',
    },
  },

  nullAndEmptyAllowed: {
    schema: {
      connectionFilterAllowNullInput: true,
      connectionFilterAllowEmptyObjectInput: true,
    },
  },

  addConnectionFilterOperator: {
    plugins: [CustomOperatorsPlugin],
  },
};

const variantByQueryFile: Record<string, ConnectionVariant> = {
  'addConnectionFilterOperator.graphql': 'addConnectionFilterOperator',
  'dynamicJsonTrue.graphql': 'dynamicJson',
  'types.cidr.graphql': 'networkScalars',
  'types.macaddr.graphql': 'networkScalars',
  'arrayTypes.cidrArray.graphql': 'networkScalars',
  'arrayTypes.macaddrArray.graphql': 'networkScalars',
  'relations.graphql': 'relations',
  'simpleCollections.graphql': 'simpleCollections',
  'nullAndEmptyAllowed.graphql': 'nullAndEmptyAllowed',
};

const contexts: Partial<Record<ConnectionVariant, ConnectionContext>> = {};

beforeAll(async () => {
  for (const variant of Object.keys(variantConfigs) as ConnectionVariant[]) {
    const config = variantConfigs[variant];
    contexts[variant] = await createContext(config);
  }
});

afterAll(async () => {
  await Promise.all(
    Object.values(contexts).map(async (ctx) => {
      if (ctx) {
        await ctx.teardown();
      }
    })
  );
});

describe.each(queryFileNames)('%s', (queryFileName) => {
  const variant = variantByQueryFile[queryFileName] ?? 'normal';
  let ctx!: ConnectionContext;

  beforeAll(() => {
    const context = contexts[variant];

    if (!context) {
      throw new Error(`Missing connection context for variant ${variant}`);
    }

    ctx = context;
  });

  beforeEach(() => ctx.db.beforeEach());
  beforeEach(() => ctx.db.setContext({ role: AUTH_ROLE }));
  afterEach(() => ctx.db.afterEach());

  it('matches snapshot', async () => {
    const query = await readFile(join(queriesDir, queryFileName), 'utf8');
    const result = await ctx.query({ query });
    expect(snapshot(result)).toMatchSnapshot();
  });
});
