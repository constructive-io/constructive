/**
 * The GraphQL names a module's run surface is exposed under.
 *
 * The tables are provisioned per agent module (`agent_module.has_runs`), and a
 * module carries its own table names — `agent_run`/`agent_event` at app scope,
 * `org_agent_run`/`org_agent_event` at org scope — so a reader cannot hardcode
 * the fields it queries. Everything here is derived from the two physical names
 * the module loader already reports, using the same inflection the generated
 * SDK targets use: `agent_event` → node `agentEvent`, connection `agentEvents`,
 * mutation `createAgentEvent`, order-by `SEQ_ASC`.
 *
 * Derived rather than injected because the alternative is a table of names per
 * tenant, which drifts the moment a module is provisioned under a new scope.
 */

export interface RunLogNames {
  /** Physical table name the rest of the names derive from. */
  runTable: string;
  eventTable: string;
  /**
   * The thread a run hangs from. `agent_run.thread_id` is required, so a host
   * that opens its own run — a local one — needs the thread's names too; a host
   * that only reads runs never touches them.
   */
  threadTable: string;
  /** Single-node field, e.g. `agentRun`. */
  run: string;
  event: string;
  thread: string;
  /** Connection field, e.g. `agentRuns`. */
  runs: string;
  events: string;
  threads: string;
  /** Type name, e.g. `AgentRun` — filters and inputs are named after it. */
  runType: string;
  eventType: string;
  threadType: string;
  createEvent: string;
  createRun: string;
  createThread: string;
  updateRun: string;
  /** Patch field on the update input, e.g. `agentRunPatch`. */
  runPatch: string;
}

const camelize = (snake: string): string =>
  snake
    .split('_')
    .filter((part) => part.length > 0)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');

const pascalize = (snake: string): string => {
  const camel = camelize(snake);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

/**
 * Graphile's pluralisation for the shapes a table name can take here. Only the
 * regular cases and the two irregular endings a generated name can hit are
 * handled: a table whose name pluralises irregularly would produce a field this
 * cannot name, and that is a schema this reader must not silently mis-address.
 */
const pluralize = (word: string): string => {
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
};

export const DEFAULT_RUN_TABLE = 'agent_run';
export const DEFAULT_EVENT_TABLE = 'agent_event';
export const DEFAULT_THREAD_TABLE = 'agent_thread';

export function runLogNames(
  runTable: string = DEFAULT_RUN_TABLE,
  eventTable: string = DEFAULT_EVENT_TABLE,
  threadTable: string = DEFAULT_THREAD_TABLE
): RunLogNames {
  if (!runTable || !eventTable || !threadTable) {
    throw new Error(
      'runLogNames requires the run, event and thread table names; a module without a run surface has none of them'
    );
  }
  const run = camelize(runTable);
  const event = camelize(eventTable);
  const thread = camelize(threadTable);
  const runType = pascalize(runTable);
  const eventType = pascalize(eventTable);
  const threadType = pascalize(threadTable);
  return {
    runTable,
    eventTable,
    threadTable,
    run,
    event,
    thread,
    runs: pluralize(run),
    events: pluralize(event),
    threads: pluralize(thread),
    runType,
    eventType,
    threadType,
    createEvent: `create${eventType}`,
    createRun: `create${runType}`,
    createThread: `create${threadType}`,
    updateRun: `update${runType}`,
    runPatch: `${run}Patch`,
  };
}
