/**
 * The documents this lane needs, built from a module's names.
 *
 * Written as strings rather than generated: the run surface belongs to a
 * tenant's schema, so there is no committed SDK target that carries it, and the
 * fields queried here are exactly the columns the run generator emits.
 *
 * The shapes follow the conventions the generated targets in `sdk/` use against
 * this platform's GraphQL: a collection takes `where: <Type>Filter` (not
 * `filter`), there is no single-node query field — one row is a `first: 1`
 * collection read — and an update takes `{ id, <singular>Patch }`.
 */

import type { RunLogNames } from './names';

export const RUN_FIELDS = `
      id
      threadId
      actorId
      entityId
      status
      placement
      executionId
      repoUrl
      branch
      baseCommit
      headCommit
      lastEventSeq
      attempt
      parentRunId
      error
      artifacts
      deadlineAt
      startedAt
      finishedAt
      createdAt`;

// The columns are named for what they describe rather than for the harness that
// writes them, which is the shape `@agentic-kit/run-log`'s record asserts.
export const EVENT_FIELDS = `
      runId
      seq
      recordedAt
      transcriptFormat
      transcriptVersion
      entry`;

export const runsDocument = (names: RunLogNames): string => `
query Runs($first: Int!, $where: ${names.runType}Filter) {
  ${names.runs}(first: $first, where: $where, orderBy: [CREATED_AT_DESC]) {
    nodes {${RUN_FIELDS}
    }
  }
}`;

export const runDocument = (names: RunLogNames): string => `
query Run($where: ${names.runType}Filter!) {
  ${names.runs}(first: 1, where: $where) {
    nodes {${RUN_FIELDS}
    }
  }
}`;

export const eventsDocument = (names: RunLogNames): string => `
query RunEvents($first: Int!, $where: ${names.eventType}Filter!) {
  ${names.events}(first: $first, where: $where, orderBy: [SEQ_ASC]) {
    nodes {${EVENT_FIELDS}
    }
  }
}`;

export const appendDocument = (names: RunLogNames): string => `
mutation AppendRunEvent($input: Create${names.eventType}Input!) {
  ${names.createEvent}(input: $input) {
    ${names.event} {${EVENT_FIELDS}
    }
  }
}`;

/**
 * Open a run.
 *
 * A cloud run is opened by the worker on the platform's side of the callback
 * lane; a local run has no worker, so the host that executes it opens its own
 * row here — as the user, over the tenant API, which is what makes `actor_id`,
 * `principal_id` and `entity_id` the session's claims rather than anything this
 * client could pass. Only the columns a host legitimately chooses are sent.
 */
export const createRunDocument = (names: RunLogNames): string => `
mutation CreateRun($input: Create${names.runType}Input!) {
  ${names.createRun}(input: $input) {
    ${names.run} {${RUN_FIELDS}
    }
  }
}`;

/**
 * Open the thread a run hangs from. `agent_run.thread_id` is required and a
 * local host is the first writer of its own conversation, so it creates one.
 */
export const createThreadDocument = (names: RunLogNames): string => `
mutation CreateThread($input: Create${names.threadType}Input!) {
  ${names.createThread}(input: $input) {
    ${names.thread} {
      id
      title
      createdAt
    }
  }
}`;

export const advanceRunDocument = (names: RunLogNames): string => `
mutation AdvanceRun($input: Update${names.runType}Input!) {
  ${names.updateRun}(input: $input) {
    ${names.run} {${RUN_FIELDS}
    }
  }
}`;
