import { loadModule, parseSqlProgram } from '@pgpmjs/transform';

import {
  buildObjectGraph,
  danglingEdges,
  objectKey,
  objectsInSchemas,
  prunablePrograms
} from '../src/object-graph';

beforeAll(async () => {
  await loadModule();
});

const programsFrom = (scripts: Record<string, string>) =>
  buildObjectGraph(Object.entries(scripts).map(([name, sql]) => [name, parseSqlProgram(sql)] as const));

const fixture = () =>
  programsFrom({
    'schemas/auth': 'CREATE SCHEMA auth;',
    'auth/users': 'CREATE TABLE auth.users (id uuid PRIMARY KEY);',
    'auth/uid': `CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM auth.users LIMIT 1 $$;`,
    'app/posts': `CREATE TABLE app.posts (id uuid PRIMARY KEY, author uuid REFERENCES auth.users (id));`,
    'app/policy': `CREATE POLICY p ON app.posts FOR SELECT USING (author = auth.uid());`
  });

describe('buildObjectGraph', () => {
  it('collects object nodes with creating statements and reference edges', () => {
    const graph = fixture();
    const users = graph.objects.get(objectKey({ schema: 'auth', name: 'users' }))!;
    expect(users.createdBy).toEqual([{ program: 'auth/users', statement: 0 }]);

    const intoUsers = graph.incoming.get(objectKey({ schema: 'auth', name: 'users' }))!;
    const kinds = intoUsers.map(e => `${e.from.program}:${e.kind}`).sort();
    expect(kinds).toContain('app/posts:fk');
    expect(kinds).toContain('auth/uid:late');
  });
});

describe('objectsInSchemas', () => {
  it('selects the subsystem objects by schema', () => {
    const graph = fixture();
    const dropped = objectsInSchemas(graph, ['auth']);
    const labels = [...dropped].sort();
    expect(labels).toContain(objectKey({ schema: 'auth', name: 'users' }));
    expect(labels).toContain(objectKey({ schema: 'auth', name: 'uid' }));
    expect(labels).not.toContain(objectKey({ schema: 'app', name: 'posts' }));
  });
});

describe('danglingEdges', () => {
  it('reports surviving references into the dropped set, and only those', () => {
    const graph = fixture();
    const dropped = objectsInSchemas(graph, ['auth']);
    dropped.add(objectKey({ schema: null, name: 'auth' }));

    const dangling = danglingEdges(graph, dropped);
    const summary = dangling.map(e => `${e.from.program}:${e.kind}`).sort();
    // auth/uid's body reference to auth.users originates inside the dropped
    // set, so it must NOT dangle; the FK and the policy accessor call must.
    expect(summary).toEqual(['app/policy:hard', 'app/posts:fk']);
  });

  it('is empty when the referencing statements are dropped too', () => {
    const graph = programsFrom({
      a: 'CREATE TABLE auth.users (id uuid PRIMARY KEY);',
      b: 'CREATE TABLE auth.sessions (uid uuid REFERENCES auth.users (id));'
    });
    const dropped = objectsInSchemas(graph, ['auth']);
    expect(danglingEdges(graph, dropped)).toEqual([]);
  });
});

describe('prunablePrograms', () => {
  it('prunes exactly the programs whose creates are all inside the dropped set', () => {
    const graph = fixture();
    const dropped = objectsInSchemas(graph, ['auth']);
    dropped.add(objectKey({ schema: null, name: 'auth' }));
    expect(prunablePrograms(graph, dropped).sort()).toEqual([
      'auth/uid',
      'auth/users',
      'schemas/auth'
    ]);
  });

  it('keeps mixed programs and programs that create nothing', () => {
    const graph = programsFrom({
      mixed: 'CREATE TABLE auth.a (id int); CREATE TABLE app.b (id int);',
      grants: 'GRANT SELECT ON app.b TO authenticated;'
    });
    const dropped = objectsInSchemas(graph, ['auth']);
    expect(prunablePrograms(graph, dropped)).toEqual([]);
  });
});
