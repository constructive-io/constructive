import { buildBindingsQuery } from '../plugin';

describe('function bindings metadata compatibility', () => {
  it('reads payload metadata without requiring the newer payload_args column', () => {
    const { text, values } = buildBindingsQuery(
      {
        computeSchema: 'compute"public',
        bindingsTable: 'function_api_bindings',
        definitionsTable: 'function_definitions',
        invocationsSchema: 'compute_public',
        invocationsTable: 'function_invocations',
        invocationsEntityField: null
      },
      'api-id'
    );

    expect(text).toContain("to_jsonb(d) -> 'payload_args'");
    expect(text).toContain("to_jsonb(d) -> 'inputs'");
    expect(text).not.toContain('d.payload_args');
    expect(text).toContain('FROM "compute""public"."function_api_bindings" b');
    expect(values).toEqual(['api-id']);
  });
});
