import type { TSchema } from 'typebox';
import { z } from 'zod';

// Tool parameter schemas are authored in zod; pi's ToolDefinition wants a
// typebox TSchema. Structurally a TSchema is just a JSON Schema object, so the
// draft-7 output of z.toJSONSchema (minus the $schema marker, matching what
// typebox emits) is cast across the boundary. typebox itself is a type-only
// import — it never appears in the runtime bundle.
export function toolSchema(schema: z.ZodType): TSchema {
  const { $schema: _$schema, ...rest } = z.toJSONSchema(schema, { target: 'draft-7' });
  return rest as unknown as TSchema;
}
