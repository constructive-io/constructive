// Whether the project's database can be used, checked where a build or a
// check starts: the binding is reconciled (on desktop, .env follows the
// project store), then probed. A database that is gone, suspended or another
// account's is recorded on the project, so the sidebar shows it; nothing else
// changes it here.
//
// Its reads and writes come in as dependencies (db-port.ts wires the host's),
// so the tests give their own.

import type { FastAppProject, ProjectDatabaseState } from './host';
import { ownedByAnother, type ProvisionedBinding } from './provisioned-binding';

/** db-tools' DatabaseProbe, read structurally. */
export type BindingProbe =
  | { status: 'found'; name?: string; ownerId?: string; hash?: string }
  | { status: 'suspended'; name?: string }
  | { status: 'missing' }
  | { status: 'unreachable'; cause: 'network' | 'server' | 'auth' | 'error'; detail: string };

export type DatabaseState =
  | { kind: 'unbound' }
  | { kind: 'found'; databaseId: string; name: string; hash: string | null; ownerId?: string }
  /**
   * `other-account`: the probe said missing, but another account owns the
   * binding, and the platform hides a database from accounts outside its
   * owner's org. It may well exist: never offer to replace it.
   */
  | { kind: 'missing' | 'suspended' | 'other-account'; databaseId: string; name?: string }
  /** The backend didn't say: no answer, a failing backend, or a rejected account. Never "missing". */
  | {
      kind: 'unreachable';
      cause: Extract<BindingProbe, { status: 'unreachable' }>['cause'];
      detail: string;
    };

/** The state a probe says; `userId` is the signed-in account's. */
export function classifyProbe(
  binding: ProvisionedBinding,
  probe: BindingProbe,
  userId: string | undefined,
): DatabaseState {
  const { databaseId } = binding;
  switch (probe.status) {
  case 'found':
    return {
      kind: 'found',
      databaseId,
      name: probe.name ?? binding.databaseName ?? '',
      hash: probe.hash ?? null,
      ...(probe.ownerId ? { ownerId: probe.ownerId } : {}),
    };
  case 'suspended':
  case 'missing': {
    const name =
        probe.status === 'suspended' ? (probe.name ?? binding.databaseName) : binding.databaseName;
    const kind =
        probe.status === 'missing' && ownedByAnother(binding.ownerId, userId)
          ? 'other-account'
          : probe.status;
    return { kind, databaseId, ...(name ? { name } : {}) };
  }
  case 'unreachable':
    return { kind: 'unreachable', cause: probe.cause, detail: probe.detail };
  }
}

/**
 * The state to store on the project after a check: null clears it, undefined
 * leaves it. An unreachable backend leaves it, since it says nothing either way.
 */
export function storedStateAfter(
  current: ProjectDatabaseState | undefined,
  state: DatabaseState,
  now: number,
): ProjectDatabaseState | null | undefined {
  switch (state.kind) {
  case 'unreachable':
    return undefined;
  case 'unbound':
  case 'found':
    return current ? null : undefined;
  default:
    return current?.status === state.kind ? undefined : { status: state.kind, since: now };
  }
}

export type CheckDeps = {
  /** The project at `cwd`, from the host's records; undefined for a folder that isn't one. */
  project(cwd: string, projectId?: string): FastAppProject | undefined;
  /** The binding the host's record and the folder agree on (desktop: .env follows the store). */
  reconcile(cwd: string, project: FastAppProject | undefined): Promise<ProvisionedBinding | null>;
  probe(databaseId: string): Promise<BindingProbe>;
  /** The signed-in account's user id. */
  accountUserId(): string | undefined;
  /** Store the state (null clears it); the project when it changed. */
  saveState(
    projectId: string,
    state: ProjectDatabaseState | null,
  ): Promise<FastAppProject | undefined>;
  /** Tell the host's UI about a changed project. */
  notify(project: FastAppProject): void;
  /** Forget the passwords remembered for the project's apps. */
  forgetPasswords(projectId: string): Promise<void>;
  now(): number;
};

/** Reconcile, probe, and record a database that can't be used on the project. The caller holds the project lock. */
export async function checkDatabase(
  cwd: string,
  projectId: string | undefined,
  deps: CheckDeps,
): Promise<DatabaseState> {
  const project = deps.project(cwd, projectId);
  const binding = await deps.reconcile(cwd, project);
  let state: DatabaseState = { kind: 'unbound' };
  if (binding) {
    const probe = await deps.probe(binding.databaseId).catch(
      (err: unknown): BindingProbe => ({
        status: 'unreachable',
        cause: 'error',
        detail: err instanceof Error ? err.message : String(err),
      }),
    );
    state = classifyProbe(binding, probe, deps.accountUserId());
  }
  // Reconciling may have changed the stored project.
  const current = project ? deps.project(cwd, project.id) : undefined;
  if (current) {
    const next = storedStateAfter(current.databaseState, state, deps.now());
    if (next !== undefined) {
      const updated = await deps.saveState(current.id, next);
      if (updated) deps.notify(updated);
    }
    // A gone database's password signs in nowhere; a rebuild asks for it again.
    if (state.kind === 'missing') await deps.forgetPasswords(current.id);
  }
  return state;
}
