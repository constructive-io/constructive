import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';

/**
 * RequiredInputPlugin - Makes @requiredInput tagged fields non-nullable in mutation inputs.
 *
 * WHY THIS EXISTS:
 * Some foreign key columns are nullable at the database level (to allow SET NULL cascades
 * on FK deletion) but should be required at the API level (the application should always
 * provide a value when creating or updating a record).
 *
 * The `api_required` column in constructive-db's metaschema injects a `@requiredInput`
 * smart tag via PostgreSQL COMMENT ON COLUMN. This plugin reads that tag and wraps the
 * corresponding GraphQL input field type with NonNull, making it required in mutations
 * while keeping the output type nullable.
 *
 * USAGE:
 * In the database, set the smart tag on a column:
 *   COMMENT ON COLUMN app_public.membership.grantor_id IS E'@requiredInput';
 *
 * Or via constructive-db's metaschema:
 *   UPDATE metaschema_public.field SET api_required = true WHERE ...;
 *
 * The trigger `tg_sync_api_required_smart_tag` will inject `{"requiredInput": true}`
 * into the column's smart_tags JSONB, which PostGraphile reads as `@requiredInput`.
 *
 * RESULT:
 * - Mutation input types (create, patch, base): field becomes non-nullable (required)
 * - Output types: field remains nullable (unchanged)
 * - Query filters: unaffected
 */
export const RequiredInputPlugin: GraphileConfig.Plugin = {
  name: 'RequiredInputPlugin',
  version: '1.0.0',
  description: 'Makes @requiredInput tagged fields non-nullable in mutation input types',

  schema: {
    hooks: {
      GraphQLInputObjectType_fields(fields, build, context) {
        const {
          scope: { pgCodec, isPgPatch, isPgBaseInput, isMutationInput },
        } = context;

        // Only process row-based input types (create inputs, patch inputs, base inputs)
        if (!pgCodec || !pgCodec.attributes) {
          return fields;
        }

        // Must be a mutation-related input type
        if (!isPgPatch && !isPgBaseInput && !isMutationInput) {
          return fields;
        }

        const {
          graphql: { GraphQLNonNull },
        } = build;

        let newFields = fields;

        for (const [attributeName, attribute] of Object.entries(
          pgCodec.attributes as Record<string, any>
        )) {
          // Check for @requiredInput smart tag
          const tags = attribute.extensions?.tags;
          if (!tags || !tags.requiredInput) {
            continue;
          }

          // Find the corresponding GraphQL field name using inflection
          const fieldName = build.inflection.attribute({
            codec: pgCodec as any,
            attributeName,
          });

          const existingField = newFields[fieldName];
          if (!existingField) {
            continue;
          }

          // If the field type is already NonNull, skip
          const fieldType = existingField.type;
          if (fieldType instanceof GraphQLNonNull) {
            continue;
          }

          // Wrap the field type with NonNull to make it required
          newFields = build.extend(
            newFields,
            {
              [fieldName]: {
                ...existingField,
                type: new GraphQLNonNull(fieldType),
              },
            },
            `RequiredInputPlugin making '${fieldName}' non-nullable on '${pgCodec.name}' (via @requiredInput smart tag)`
          );
        }

        return newFields;
      },
    },
  },
};

/**
 * Preset that includes the RequiredInputPlugin.
 * Add this to your main preset's `extends` array.
 */
export const RequiredInputPreset: GraphileConfig.Preset = {
  plugins: [RequiredInputPlugin],
};
