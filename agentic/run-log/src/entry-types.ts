/**
 * The entry-type registry: the one place that says what a `custom` entry in a
 * run log means.
 *
 * pi's session format is extensible through `custom` messages, and Constructive
 * uses that seam rather than new tables — an approval, a gate decision, a future
 * command are all entries in the same append-only log, so a new kind of event
 * costs a registration here and no schema change at all.
 *
 * Two things are registered per type. A `details` guard, because the payload
 * arrives from a database column or an HTTP body and a projector must not read
 * it untyped. And a *visibility*: whether the entry is part of what the model
 * sees (`surface`) or a record only humans and tooling read (`log-only`). pi
 * decides what to replay from the entries it wrote itself, so the flag does not
 * steer the agent loop; it tells a renderer which rows belong to the
 * conversation and which belong to the trace, and it documents intent for the
 * writer.
 */

import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_RESOLUTION_TYPE,
  assertApprovalRequestDetails,
  assertApprovalResolutionDetails,
  assertGateDecisionDetails,
  GATE_DECISION_TYPE
} from './projectors/tool-state';

/**
 * Whether an entry contributes to the conversation the model sees.
 *
 * - `surface`: the entry is (or becomes) part of the model's context — an
 *   approval prompt the agent must react to, for instance.
 * - `log-only`: durable, replayable, projected into traces and audits, but
 *   never part of what the model reads. A gate decision is the archetype: the
 *   model already learned of a denial through the blocked tool call's error.
 */
export type EntryVisibility = 'surface' | 'log-only';

/** What the registry knows about one `customType`. */
export interface EntryTypeDefinition<TDetails = unknown> {
  /** The namespaced discriminator, e.g. `constructive.gate.decision`. */
  customType: string;
  visibility: EntryVisibility;
  /** Short human label — a renderer's fallback row title. */
  label: string;
  /**
   * Narrow the entry's `details`. Throws rather than returning null: a payload
   * that cannot be read is a corrupted entry, never an empty one.
   */
  assertDetails: (value: unknown) => TDetails;
}

/**
 * A registry of `custom` entry types.
 *
 * Registration is by value rather than by module side effect so a host can hold
 * its own registry (a test, a downstream package adding its own vocabulary)
 * without mutating everyone else's.
 */
export class EntryTypeRegistry {
  private readonly types = new Map<string, EntryTypeDefinition<unknown>>();

  constructor(definitions: readonly EntryTypeDefinition<never>[] = []) {
    for (const definition of definitions) this.register(definition);
  }

  /** Register a type. Re-registering the same `customType` is a programming error. */
  register<TDetails>(definition: EntryTypeDefinition<TDetails>): this {
    if (this.types.has(definition.customType)) {
      throw new Error(`entry type ${definition.customType} is already registered`);
    }
    this.types.set(definition.customType, definition as EntryTypeDefinition<unknown>);
    return this;
  }

  /** The definition for a `customType`, or undefined when nothing claims it. */
  get(customType: string): EntryTypeDefinition<unknown> | undefined {
    return this.types.get(customType);
  }

  has(customType: string): boolean {
    return this.types.has(customType);
  }

  /** Every registered type, in registration order. */
  list(): readonly EntryTypeDefinition<unknown>[] {
    return Array.from(this.types.values());
  }

  /**
   * The visibility of a `customType`. An unregistered type is `log-only`: a
   * renderer showing an unknown row in the trace is right, and one feeding it
   * to a model would not be.
   */
  visibilityOf(customType: string): EntryVisibility {
    return this.types.get(customType)?.visibility ?? 'log-only';
  }
}

/**
 * The types Constructive itself writes.
 *
 * A host that adds its own vocabulary registers onto a copy
 * (`constructiveEntryTypes()`) rather than mutating a shared singleton, so one
 * package's registration cannot surprise another's projector.
 */
export const constructiveEntryTypes = (): EntryTypeRegistry =>
  new EntryTypeRegistry()
    .register({
      customType: APPROVAL_REQUEST_TYPE,
      // The agent is blocked on this one, and a reconnecting surface must be
      // able to see it — it belongs to the conversation.
      visibility: 'surface',
      label: 'Approval requested',
      assertDetails: assertApprovalRequestDetails
    })
    .register({
      customType: APPROVAL_RESOLUTION_TYPE,
      visibility: 'surface',
      label: 'Approval answered',
      assertDetails: assertApprovalResolutionDetails
    })
    .register({
      customType: GATE_DECISION_TYPE,
      visibility: 'log-only',
      label: 'Gate decision',
      assertDetails: (value: unknown) => assertGateDecisionDetails(value)
    });
