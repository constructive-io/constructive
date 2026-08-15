import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_RESOLUTION_TYPE,
  constructiveEntryTypes,
  EntryTypeRegistry,
  GATE_DECISION_TYPE
} from '../src';

describe('EntryTypeRegistry', () => {
  const definition = {
    customType: 'acme.thing.happened',
    visibility: 'log-only' as const,
    label: 'Thing happened',
    assertDetails: (value: unknown) => value as { thing: string }
  };

  it('registers, finds and lists types in registration order', () => {
    const registry = new EntryTypeRegistry().register(definition);

    expect(registry.has('acme.thing.happened')).toBe(true);
    expect(registry.get('acme.thing.happened')?.label).toBe('Thing happened');
    expect(registry.list().map((entry) => entry.customType)).toEqual(['acme.thing.happened']);
  });

  it('refuses to register the same type twice', () => {
    const registry = new EntryTypeRegistry().register(definition);

    expect(() => registry.register(definition)).toThrow(/already registered/);
  });

  it('treats an unregistered type as log-only', () => {
    // A renderer showing an unknown row in the trace is right; one feeding it to
    // a model would not be.
    expect(new EntryTypeRegistry().visibilityOf('acme.unknown')).toBe('log-only');
  });

  it('hands out an independent registry so one host cannot surprise another', () => {
    constructiveEntryTypes().register(definition);

    expect(constructiveEntryTypes().has('acme.thing.happened')).toBe(false);
  });
});

describe('constructiveEntryTypes', () => {
  const registry = constructiveEntryTypes();

  it('knows the types Constructive writes', () => {
    expect(registry.list().map((entry) => entry.customType)).toEqual([
      APPROVAL_REQUEST_TYPE,
      APPROVAL_RESOLUTION_TYPE,
      GATE_DECISION_TYPE
    ]);
  });

  it('puts approvals on the surface and gate decisions in the log only', () => {
    // The agent is blocked on an approval, so it belongs to the conversation; a
    // denial already reached the model through the blocked call's error.
    expect(registry.visibilityOf(APPROVAL_REQUEST_TYPE)).toBe('surface');
    expect(registry.visibilityOf(APPROVAL_RESOLUTION_TYPE)).toBe('surface');
    expect(registry.visibilityOf(GATE_DECISION_TYPE)).toBe('log-only');
  });

  it('narrows details through the registered guard', () => {
    const gate = registry.get(GATE_DECISION_TYPE)!;

    expect(
      gate.assertDetails({ toolCallId: 'call-1', toolName: 'bash', verdict: 'deny', decision: 'deny' })
    ).toMatchObject({ toolCallId: 'call-1', decision: 'deny' });
    expect(() => gate.assertDetails({ toolName: 'bash', decision: 'deny' })).toThrow(/toolCallId/);
    expect(() => gate.assertDetails({ toolCallId: 'call-1', decision: 'maybe' })).toThrow(/allow.*deny/);
  });

  it('rejects an approval resolution that decides nothing', () => {
    const resolution = registry.get(APPROVAL_RESOLUTION_TYPE)!;

    expect(resolution.assertDetails({ toolCallId: 'call-1', decision: 'approved' })).toMatchObject({
      decision: 'approved'
    });
    expect(() => resolution.assertDetails({ toolCallId: 'call-1' })).toThrow(/approved.*rejected/);
  });
});
