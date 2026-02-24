import { createOperationParametersSchema } from '../../src/operation-schema';

describe('createOperationParametersSchema', () => {
  it('builds required and optional schema entries', () => {
    const schema = createOperationParametersSchema({
      id: {
        type: 'id',
      },
      name: {
        type: 'string',
      },
      description: {
        type: 'string',
        nullable: true,
      },
      tags: {
        type: {
          arrayOf: 'string',
        },
        nullable: true,
      },
      meta: {
        type: 'json',
        nullable: true,
      },
    });

    const schemaRecord = schema as Record<string, unknown>;
    const properties = schemaRecord.properties as Record<string, unknown>;
    const required = schemaRecord.required as string[];

    expect(schemaRecord.type).toBe('object');
    expect(required).toEqual(expect.arrayContaining(['id', 'name']));
    expect(required).not.toEqual(expect.arrayContaining(['description', 'tags']));

    expect((properties.id as Record<string, unknown>).type).toBe('string');
    const tagsSchema = properties.tags as Record<string, unknown>;
    const tagsAnyOf = tagsSchema.anyOf as
      | Array<Record<string, unknown>>
      | undefined;
    expect(tagsAnyOf?.some((entry) => entry.type === 'array')).toBe(true);
    expect((properties.meta as Record<string, unknown>).anyOf).toBeDefined();
  });

  it('supports additionalProperties override', () => {
    const schema = createOperationParametersSchema(
      {
        query: {
          type: 'string',
        },
      },
      {
        additionalProperties: true,
      },
    ) as Record<string, unknown>;

    expect(schema.additionalProperties).toBe(true);
  });
});
