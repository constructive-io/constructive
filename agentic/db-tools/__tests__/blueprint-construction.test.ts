import type { HarnessToolContext } from '@agentic-kit/harness';

jest.mock('../src/context', () => ({ resolveProjectContext: jest.fn() }));

import { modules } from '@constructive-io/sdk';

import { buildBlueprint, waitForConstruction } from '../src/blueprint-construction';
import { resolveProjectContext } from '../src/context';
import { provisionBlueprintTool } from '../src/tools/provision-blueprint';

const mockResolve = resolveProjectContext as jest.MockedFunction<typeof resolveProjectContext>;

type Row = { status: string; tableMap?: Record<string, string> };

// A schema from before the queued build has no `error` column, and rejects any
// query that names it.
const NO_ERROR_COLUMN = Symbol('no error column');
// A status read the backend refuses.
const REFUSED = Symbol('refused');
// A construct request that never gets an answer.
const DROPPED = Symbol('dropped');

type Backend = {
  statuses: ReadonlyArray<Row | typeof REFUSED>;
  error?: unknown;
  construct?: typeof DROPPED;
  onRead?: () => void;
};

const ok = (data: unknown): modules.QueryResult<unknown> => ({ ok: true, data, errors: undefined });

// The modules backend behind the real ORM client, so the test sees the
// documents the SDK builds. Each status read returns the next of `statuses`,
// and the last one repeats.
function backend({ statuses, error = null, construct, onRead }: Backend) {
  const documents: string[] = [];
  let reads = 0;
  const answer = (document: string): modules.QueryResult<unknown> => {
    documents.push(document);
    if (document.includes('constructBlueprint')) {
      if (construct === DROPPED) throw new TypeError('fetch failed');
      return ok({ constructBlueprint: { result: 'con-1' } });
    }
    if (document.includes('createBlueprint')) {
      return ok({ createBlueprint: { blueprint: { id: 'bp-1', name: 'library' } } });
    }
    if (/\berror\b/.test(document)) {
      if (error === NO_ERROR_COLUMN) {
        const message = 'Cannot query field "error" on type "BlueprintConstruction".';
        return { ok: false, data: null, errors: [{ message }] };
      }
      return ok({ blueprintConstructions: { nodes: [{ error }] } });
    }
    onRead?.();
    const row = statuses[Math.min(reads++, statuses.length - 1)];
    if (row === REFUSED) {
      return { ok: false, data: null, errors: [{ message: 'permission denied for table blueprint_construction' }] };
    }
    return ok({ blueprintConstructions: { nodes: [row] } });
  };
  const adapter: modules.GraphQLAdapter = {
    execute: async <T>(document: string) => answer(document) as modules.QueryResult<T>,
  };
  return { client: modules.createClient({ adapter }), documents, reads: () => reads };
}

// A clock that only moves when the wait sleeps.
function fakeTime() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number): Promise<void> => {
      t += ms;
    },
  };
}

const INPUT = { blueprintId: 'bp-1', schemaId: 'schema-1' };

describe('waiting for a blueprint build', () => {
  it('polls a queued build until it is constructed and returns its tables', async () => {
    const { client, documents } = backend({
      statuses: [
        { status: 'pending' },
        { status: 'constructing' },
        { status: 'constructed', tableMap: { books: 'tbl-1', authors: 'tbl-2' } },
      ],
    });

    await expect(buildBlueprint(client, INPUT, fakeTime())).resolves.toEqual({
      constructionId: 'con-1',
      tables: { books: 'tbl-1', authors: 'tbl-2' },
    });
    // The status reads never name `error`, so they stay valid on older schemas.
    expect(documents.filter((doc) => /\berror\b/.test(doc))).toEqual([]);
  });

  const INTERNAL = 'The blueprint build failed with an error the backend does not show. Construction id: con-1.';

  it.each([
    [
      'a public coded error, by its code and context',
      { code: 'BLUEPRINT_MODULE_NOT_INSTALLED', context: { module: 'agent' }, class: 'public' },
      'The blueprint build failed with the code BLUEPRINT_MODULE_NOT_INSTALLED {"module":"agent"}. Construction id: con-1.',
    ],
    ['an internal coded error, by the construction id only', { code: 'SOME_INTERNAL_CODE', context: { table: 'field' }, class: 'internal' }, INTERNAL],
    ['a database error, by the construction id only', { code: '57014', message: 'canceling statement due to statement timeout' }, INTERNAL],
    // What a live backend stored for a build an agent asked for.
    ['a refused null, by the construction id only', { code: '23502', message: 'null value in column "name" of relation "field" violates not-null constraint' }, INTERNAL],
  ])('says %s of a failed build', async (_kind, error, message) => {
    const { client } = backend({ statuses: [{ status: 'pending' }, { status: 'failed' }], error });

    await expect(buildBlueprint(client, INPUT, fakeTime())).rejects.toThrow(new Error(message));
  });

  it('fails clearly when the schema has no error column, without the text of the refusal', async () => {
    const { client } = backend({ statuses: [{ status: 'failed' }], error: NO_ERROR_COLUMN });

    await expect(buildBlueprint(client, INPUT, fakeTime())).rejects.toThrow(
      new Error('The blueprint build failed, and its reason could not be read (the backend answered with an error without a public code). Construction id: con-1.'),
    );
  });

  it('gives up at the deadline and says the build may still finish', async () => {
    const { client } = backend({ statuses: [{ status: 'pending' }] });

    await expect(waitForConstruction(client, 'con-1', fakeTime())).rejects.toThrow(
      /still waiting in the backend's build queue after 240 s\. The build may still finish/,
    );
  });

  it('stops polling as soon as the signal aborts', async () => {
    const controller = new AbortController();
    const { client, reads } = backend({
      statuses: [{ status: 'pending' }],
      onRead: () => controller.abort(),
    });

    // A short deadline, so a wait that ignored the signal fails fast instead
    // of polling for minutes.
    const options = { signal: controller.signal, pollMs: 1_000, deadlineMs: 1_000 };
    await expect(waitForConstruction(client, 'con-1', options)).rejects.toThrow(
      /^Stopped waiting for the blueprint build/,
    );
    expect(reads()).toBe(1);
  });
});

describe('provision_blueprint', () => {
  async function provision(client: ReturnType<typeof backend>['client']) {
    // The project has no table yet, so the blueprint's tables are free to make.
    const noTables = { table: { findMany: () => ({ execute: async () => ({ ok: true, data: { tables: { nodes: [] as { name: string }[] } } }) }) } };
    mockResolve.mockResolvedValue({
      context: { api: noTables, modules: client, databaseId: 'db-1', schemaId: 'schema-1', ownerId: 'user-1' },
      reason: '',
    } as never);
    const ctx: HarnessToolContext = { cwd: '/tmp/project' };
    const result = await provisionBlueprintTool.execute(
      {
        name: 'library',
        definition: { tables: [{ table_name: 'books', fields: [], policies: [] }] },
      } as never,
      ctx,
    );
    return result;
  }

  it('reports a failed build instead of the tables it asked for', async () => {
    const { client } = backend({
      statuses: [{ status: 'failed' }],
      error: { code: 'RELATION_TARGET_NOT_FOUND', context: { target_table: 'authors' }, class: 'public' },
    });

    expect((await provision(client)).details).toMatchObject({
      created: 0,
      error: 'Failed to provision "library": The blueprint build failed with the code RELATION_TARGET_NOT_FOUND {"target_table":"authors"}. Construction id: con-1.',
    });
  });

  it('shows none of the text of a build the backend failed, in the failure or the details', async () => {
    const { client } = backend({
      statuses: [{ status: 'failed' }],
      error: { code: '23502', message: 'null value in column "name" of relation "field" violates not-null constraint' },
    });

    const result = await provision(client);

    expect(result.failure).toMatchObject({ code: 'failed', message: 'Failed to provision "library": The blueprint build failed with an error the backend does not show. Construction id: con-1.' });
    expect(result.failure.hint).toMatch(/give the construction id to the backend operator/);
    const shown = JSON.stringify(result);
    for (const text of ['23502', 'null value', 'relation "field"']) expect(shown).not.toContain(text);
  });

  // A queued build carries on without the call, so the host must not call
  // again; a construct that never answered queued nothing.
  it.each([
    ['its status could not be read after the build was queued', { statuses: [REFUSED] }, 'con-1'],
    ['the construct request never answered', { statuses: [], construct: DROPPED }, null],
  ] as const)('carries the construction id only once a build is queued: %s', async (_case, setup, id) => {
    const { client } = backend(setup);

    const { details } = await provision(client);
    expect(details.error).toBeTruthy();
    expect(details.error).not.toContain('permission denied for table');
    expect(details.constructionId).toBe(id);
  });
});
