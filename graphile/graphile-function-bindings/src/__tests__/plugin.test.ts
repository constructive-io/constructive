/**
 * Integration tests for the function bindings plugin.
 *
 * Uses graphile-test with a real PostgreSQL database seeded with minimal
 * compute tables (see setup.sql) to verify:
 * - one mutation per graphql-enabled binding for the configured api
 * - graphql-disabled bindings and other-api bindings are not exposed
 * - payload_args-derived and JSON-Schema-derived input types
 * - fallback `payload: JSON` input
 * - the resolver inserts an RLS-visible function_invocations row
 */

import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';

import { createFunctionBindingsPlugin } from '../plugin';

const API_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

interface MutationFieldsResult {
  __schema: {
    mutationType: {
      fields: { name: string }[];
    };
  };
}

interface InputTypeResult {
  __type: {
    name: string;
    inputFields: {
      name: string;
      type: {
        kind: string;
        name: string | null;
        ofType: { kind: string; name: string | null } | null;
      };
    }[];
  } | null;
}

describe('function bindings plugin', () => {
  let pg: any;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const plugin = createFunctionBindingsPlugin({ apiId: API_ID });

    const connections = await (getConnections as any)(
      {
        schemas: ['fn_test'],
        preset: { plugins: [plugin] },
        useRoot: true,
        authRole: 'postgres'
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

    pg = connections.pg;
    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    await teardown();
  });

  it('exposes one mutation per graphql-enabled binding for the api', async () => {
    const result = await query<MutationFieldsResult>(`
      { __schema { mutationType { fields { name } } } }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data!.__schema.mutationType.fields.map((f) => f.name);
    expect(names).toContain('resizeImage');
    expect(names).toContain('sendEmail');
    expect(names).toContain('validateOrder');
  });

  it('does not expose graphql-disabled bindings', async () => {
    const result = await query<MutationFieldsResult>(`
      { __schema { mutationType { fields { name } } } }
    `);
    const names = result.data!.__schema.mutationType.fields.map((f) => f.name);
    expect(names).not.toContain('secretFn');
  });

  it('does not expose bindings belonging to other apis', async () => {
    const result = await query<MutationFieldsResult>(`
      { __schema { mutationType { fields { name } } } }
    `);
    const names = result.data!.__schema.mutationType.fields.map((f) => f.name);
    expect(names).not.toContain('otherApiFn');
  });

  it('derives a typed input from payload_args', async () => {
    const result = await query<InputTypeResult>(`
      {
        __type(name: "ResizeImageInput") {
          name
          inputFields {
            name
            type { kind name ofType { kind name } }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data!.__type).toMatchSnapshot();
  });

  it('derives a typed input (enum + required) from a config JSON Schema', async () => {
    const result = await query<InputTypeResult>(`
      {
        __type(name: "ValidateOrderInput") {
          name
          inputFields {
            name
            type { kind name ofType { kind name } }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data!.__type).toMatchSnapshot();
    const mode = result.data!.__type!.inputFields.find((f) => f.name === 'mode');
    expect(mode!.type.kind).toBe('NON_NULL');
    expect(mode!.type.ofType!.kind).toBe('ENUM');
  });

  it('uses a JSON payload fallback input when no metadata is available', async () => {
    const result = await query<InputTypeResult>(`
      {
        __type(name: "SendEmailInput") {
          name
          inputFields {
            name
            type { kind name ofType { kind name } }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type!.inputFields.map((f) => f.name);
    expect(fieldNames).toEqual(['clientMutationId', 'payload']);
  });

  it('inserts a function invocation row on mutation', async () => {
    const result = await query<{
      resizeImage: { invocationId: string; status: string; clientMutationId: string | null };
    }>(
      `
        mutation ($input: ResizeImageInput!) {
          resizeImage(input: $input) {
            clientMutationId
            invocationId
            status
          }
        }
      `,
      { input: { url: 'https://example.com/a.png', width: 640, clientMutationId: 'cm1' } }
    );
    expect(result.errors).toBeUndefined();
    const payload = result.data!.resizeImage;
    expect(payload.status).toBe('pending');
    expect(payload.clientMutationId).toBe('cm1');
    expect(payload.invocationId).toBeTruthy();

    const { rows } = await pg.query(
      `SELECT task_identifier, payload, status FROM fn_test.function_invocations WHERE id = $1`,
      [payload.invocationId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].task_identifier).toBe('images:resize');
    expect(rows[0].status).toBe('pending');
    expect(rows[0].payload).toEqual({ url: 'https://example.com/a.png', width: 640 });
  });

  it('passes the fallback JSON payload through verbatim', async () => {
    const result = await query<{
      sendEmail: { invocationId: string; status: string };
    }>(
      `
        mutation ($input: SendEmailInput!) {
          sendEmail(input: $input) {
            invocationId
            status
          }
        }
      `,
      { input: { payload: { to: 'a@b.c', subject: 'hi' } } }
    );
    expect(result.errors).toBeUndefined();
    const payload = result.data!.sendEmail;

    const { rows } = await pg.query(
      `SELECT task_identifier, payload FROM fn_test.function_invocations WHERE id = $1`,
      [payload.invocationId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].task_identifier).toBe('emails:send');
    expect(rows[0].payload).toEqual({ to: 'a@b.c', subject: 'hi' });
  });

  it('returns the created invocation via the FunctionInvocation type', async () => {
    const result = await query<{
      resizeImage: {
        invocationId: string;
        invocation: { rowId: string; status: string; taskIdentifier: string } | null;
      };
    }>(
      `
        mutation ($input: ResizeImageInput!) {
          resizeImage(input: $input) {
            invocationId
            invocation {
              rowId
              status
              taskIdentifier
            }
          }
        }
      `,
      { input: { url: 'https://example.com/b.png' } }
    );
    expect(result.errors).toBeUndefined();
    const payload = result.data!.resizeImage;
    expect(payload.invocation).not.toBeNull();
    expect(payload.invocation!.rowId).toBe(payload.invocationId);
    expect(payload.invocation!.status).toBe('pending');
    expect(payload.invocation!.taskIdentifier).toBe('images:resize');
  });
});
