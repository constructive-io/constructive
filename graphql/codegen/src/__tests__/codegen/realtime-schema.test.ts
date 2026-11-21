import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { buildSchema, graphql, parse, validate } from 'graphql';
import ts from 'typescript';

import { generate } from '../../core/codegen';
import { inferTablesFromIntrospection } from '../../core/introspect/infer-tables';
import { EndpointSchemaSource } from '../../core/introspect/source/endpoint';
import { FileSchemaSource } from '../../core/introspect/source/file';
import { getConfigOptions } from '../../types/config';
import type { IntrospectionQueryResponse } from '../../types/introspection';

const fixture = path.join(__dirname, 'realtime-plugin.graphql');
const schema = buildSchema(readFileSync(fixture, 'utf8'));

function generateSubscriptions(introspection: IntrospectionQueryResponse) {
  return generate({
    tables: inferTablesFromIntrospection(introspection),
    config: getConfigOptions({ reactQuery: true }),
  }).files.filter((file) => file.path.startsWith('subscriptions/'));
}

describe('codegen from the realtime plugin schema', () => {
  let server: Server;
  let endpoint: string;

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { query, variables } = JSON.parse(body);
      const result = await graphql({ schema, source: query, variableValues: variables });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/graphql`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it('captures the public signal: no description tag, but a subscription and payload', () => {
    expect(schema.getType('Note')?.description).toBeUndefined();
    expect(schema.getSubscriptionType()?.getFields().onNoteChanged).toBeDefined();
    const payload = schema.getType('NoteSubscriptionPayload') as import('graphql').GraphQLObjectType;
    expect(Object.keys(payload.getFields())).toEqual(['event', 'note', 'rowId', 'overflow']);
  });

  it.each(['endpoint', 'schema file'])('generates a validating subscription from %s introspection', async (source) => {
    const result = await (source === 'endpoint'
      ? new EndpointSchemaSource({ endpoint })
      : new FileSchemaSource({ schemaPath: fixture })).fetch();
    const tables = inferTablesFromIntrospection(result.introspection);
    expect(tables.find((table) => table.name === 'Note')?.smartTags).toEqual({ '@realtime': true });
    expect(inferTablesFromIntrospection(result.introspection, { comments: false })[0].smartTags).toEqual({ '@realtime': true });
    const files = generateSubscriptions(result.introspection);
    const hook = files.find((file) => file.path === 'subscriptions/useNoteSubscription.ts');
    expect(hook).toBeDefined();
    const ast = ts.createSourceFile('hook.ts', hook!.content, ts.ScriptTarget.Latest, true);
    let document: string | undefined;
    for (const statement of ast.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.name.getText(ast) === 'SUBSCRIPTION_DOCUMENT' && declaration.initializer && ts.isStringLiteral(declaration.initializer)) {
          document = declaration.initializer.text;
        }
      }
    }
    expect(document).toBeDefined();
    expect(document).not.toContain('timestamp');
    expect(validate(schema, parse(document!))).toEqual([]);
  });

  it('does not generate subscriptions when none are advertised', async () => {
    const { introspection } = await new FileSchemaSource({ schemaPath: fixture }).fetch();
    introspection.__schema.subscriptionType = null;
    expect(generateSubscriptions(introspection)).toEqual([]);
  });

  it.each(['event', 'note'])('does not infer realtime for a similarly named field with the wrong %s payload', async (name) => {
    const { introspection } = await new FileSchemaSource({ schemaPath: fixture }).fetch();
    const payload = introspection.__schema.types.find((type) => type.name === 'NoteSubscriptionPayload');
    payload!.fields = payload!.fields!.filter((field) => field.name !== name);
    expect(generateSubscriptions(introspection)).toEqual([]);
  });

  it('preserves description tags when recovering realtime metadata', async () => {
    const { introspection } = await new FileSchemaSource({ schemaPath: fixture }).fetch();
    introspection.__schema.types.find((type) => type.name === 'Note')!.description = '@realtime insert\n@custom value';
    const table = inferTablesFromIntrospection(introspection)[0];
    expect(table.smartTags).toMatchObject({ '@realtime': 'insert', '@custom': 'value' });
  });
});
