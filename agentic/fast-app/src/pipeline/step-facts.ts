// What the card's step details say about the calls and checks that aren't
// plain commands: a db-tools call by its name, its arguments in a few words
// and in full, what verify found per route, per page and per table, and the
// files gen wrote. Pure but for noteActivity, which records nothing outside a
// step.

import type { DeltaCall } from '../app-spec';
import { type ActivityStart, noteActivity } from './activity';
import type { StepCheck } from './app-plan';
import type { GenSummary } from './gen';
import type { VerifyFailure, VerifyResult } from './verify';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const call = (label: string, args: string[], params: unknown): ActivityStart => ({
  kind: 'call',
  label,
  args: args.filter(Boolean).join(' · '),
  params,
});

/** A db-tools call as the details list it: the tool, what it touches and its parameters in a few words, and in full. */
export function deltaCallActivity(delta: DeltaCall): ActivityStart {
  switch (delta.tool) {
  case 'provision_blueprint': {
    const { tables, relations = [] } = delta.params.definition;
    const counts = [
      plural(tables.length, 'table'),
      ...(relations.length ? [plural(relations.length, 'relation')] : []),
    ];
    return call(delta.tool, [delta.params.name, counts.join(', ')], delta.params);
  }
  case 'secure_table_provision': {
    const { table_name, nodes = [], policies = [] } = delta.params;
    const counts = [
      ...(nodes.length ? [plural(nodes.length, 'node')] : []),
      ...(policies.length ? [plural(policies.length, 'policy', 'policies')] : []),
    ];
    return call(delta.tool, [table_name, counts.join(', ')], delta.params);
  }
  case 'delete_table':
    return call(delta.tool, [delta.params.table_name], delta.params);
  default: {
    const params = delta.params as {
        table_name: string;
        field_name: string;
        type?: string;
        new_name?: string;
      };
    const change = params.new_name ? `to ${params.new_name}` : (params.type ?? '');
    return call(delta.tool, [`${params.table_name}.${params.field_name}`, change], delta.params);
  }
  }
}

/** The files gen wrote, left alone and removed, with their paths behind the item's disclosure. */
export function recordGenFiles({ files }: Pick<GenSummary, 'files'>): void {
  const unchanged = [...files.skipped, ...files.modified];
  noteActivity(
    { kind: 'files', label: 'Files' },
    {
      detail: `${files.written.length} written, ${unchanged.length} unchanged, ${files.removed.length} removed`,
      lists: [
        { label: 'Written', items: files.written },
        { label: 'Unchanged', items: unchanged },
        { label: 'Removed', items: files.removed },
      ].filter((list) => list.items.length),
    },
  );
}

/** A route's failure as its line: the status the server answered, and what it said. */
function routeCheck(route: string, failure: VerifyFailure | undefined): StepCheck {
  if (!failure) return { name: route, status: '200' };
  const status = /^HTTP (\d{3})/.exec(failure.message)?.[1];
  const note = failure.message.replace(/^HTTP \d{3}:?\s*/, '');
  return {
    name: route,
    status: status ?? 'no answer',
    failed: true,
    ...(note ? { note } : {}),
  };
}

const CRUD = 'create, read, update and delete';

/** What verify checked besides its commands: each route, each page and each table's CRUD. */
export function recordVerifyFacts(result: VerifyResult): void {
  const routeFailures = result.failures.filter((f) => f.check === 'route');
  noteActivity(
    { kind: 'check', label: `Fetched ${plural(result.routes.length, 'route')}` },
    {
      detail: routeFailures.length
        ? `${routeFailures.length} didn't answer 200`
        : 'each answered 200',
      failed: routeFailures.length > 0,
      checks: result.routes.map((route) =>
        routeCheck(
          route,
          routeFailures.find((f) => f.route === route),
        ),
      ),
    },
  );

  const { render } = result;
  if (render.skipped) {
    noteActivity({ kind: 'fact', label: 'No pages opened in a browser', detail: render.skipped });
  } else {
    const renderFailures = result.failures.filter((f) => f.check === 'render');
    const failedPages = new Set(renderFailures.map((f) => f.route));
    noteActivity(
      { kind: 'check', label: `Opened ${plural(render.pages, 'page')} in a browser` },
      {
        detail: failedPages.size ? `${plural(failedPages.size, 'page')} with errors` : 'no errors',
        failed: failedPages.size > 0,
        checks: (result.opened ?? []).map((route): StepCheck => {
          const errors = renderFailures.filter((f) => f.route === route);
          return errors.length
            ? {
              name: route,
              status: plural(errors.length, 'error'),
              failed: true,
              note: errors.map((f) => f.message).join('; '),
            }
            : { name: route, status: 'no errors' };
        }),
      },
    );
  }

  const { tested, skipped } = result.crud;
  if (!tested.length && !skipped.length) return;
  const crudFailures = result.failures.filter((f) => f.check === 'crud');
  const readOnly = new Set(result.gaps.readOnly ?? []);
  const checks: StepCheck[] = [
    ...tested.map((table): StepCheck => {
      const failed = crudFailures.filter((f) => f.resource === table);
      if (failed.length) {
        return {
          name: table,
          status: 'failed',
          failed: true,
          note: failed.map((f) => `${f.op ?? 'check'}: ${f.message}`).join('; '),
        };
      }
      return { name: table, status: readOnly.has(table) ? 'read only' : 'passed' };
    }),
    ...skipped.map(
      ({ table, reason }): StepCheck => ({ name: table, status: 'skipped', note: reason }),
    ),
  ];
  const count = (status: string) => checks.filter((check) => check.status === status).length;
  const failedTables = count('failed');
  const quirks = [
    ...(failedTables ? [`${failedTables} failed`] : []),
    ...(count('read only') ? [`${count('read only')} read only`] : []),
    ...(skipped.length ? [`${skipped.length} skipped`] : []),
  ];
  noteActivity(
    { kind: 'check', label: `Ran ${CRUD} on ${plural(tested.length, 'table')}` },
    { detail: quirks.join(', ') || 'each passed', failed: failedTables > 0, checks },
  );
}
