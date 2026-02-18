/**
 * PostGraphile v5 Upload Plugin
 *
 * Adds file upload support to PostGraphile v5 mutations. For columns that match
 * the configured upload field definitions (by PG type name/namespace or by smart
 * tag), this plugin:
 *
 * 1. Registers a GraphQL `Upload` scalar type
 * 2. Adds `*Upload` input fields on mutation input types
 * 3. Wraps mutation field resolvers to process file uploads before the mutation
 *    executes, calling the user-supplied resolver for each upload
 *
 * In v5, the `GraphQLObjectType_fields_field` hook wraps the `resolve` function
 * (which still exists on mutation fields alongside `plan`) to intercept uploads
 * at the HTTP layer before the plan executes.
 */

import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { UploadFieldDefinition, UploadPluginOptions } from './types';

/**
 * Determines whether a codec attribute matches an upload field definition.
 * Returns the matching definition or undefined.
 */
function relevantUploadType(
  attribute: any,
  uploadFieldDefinitions: UploadFieldDefinition[]
): UploadFieldDefinition | undefined {
  const types = uploadFieldDefinitions.filter(({ name, namespaceName, tag }) => {
    if (name && namespaceName) {
      // Type-name based matching: check the attribute's codec PG extension metadata
      const pgExt = attribute.codec?.extensions?.pg;
      if (pgExt && pgExt.name === name && pgExt.schemaName === namespaceName) {
        return true;
      }
      // Fallback: check codec name directly
      if (attribute.codec?.name === name) {
        return true;
      }
    }
    if (tag) {
      // Smart-tag based matching: check if the attribute has the specified tag
      const tags = attribute.extensions?.tags;
      if (tags && tags[tag]) {
        return true;
      }
    }
    return false;
  });

  if (types.length === 1) {
    return types[0];
  } else if (types.length > 1) {
    throw new Error('Upload field definitions are ambiguous');
  }
  return undefined;
}

/**
 * Creates the Upload plugin with the given options.
 */
export function createUploadPlugin(
  options: UploadPluginOptions = {}
): GraphileConfig.Plugin {
  const { uploadFieldDefinitions = [] } = options;

  return {
    name: 'UploadPlugin',
    version: '2.0.0',
    description: 'File upload support for PostGraphile v5',
    after: ['PgAttributesPlugin', 'PgMutationCreatePlugin', 'PgMutationUpdateDeletePlugin'],

    schema: {
      hooks: {
        // Register the Upload scalar type
        init(_, build) {
          const {
            graphql: { GraphQLScalarType, GraphQLError }
          } = build;

          const GraphQLUpload = new GraphQLScalarType({
            name: 'Upload',
            description: 'The `Upload` scalar type represents a file upload.',
            parseValue(value: any) {
              const maybe = value;
              if (
                maybe &&
                maybe.promise &&
                typeof maybe.promise.then === 'function'
              ) {
                return maybe.promise;
              }
              throw new GraphQLError('Upload value invalid.');
            },
            parseLiteral(_ast: any) {
              throw new GraphQLError('Upload literal unsupported.');
            },
            serialize() {
              throw new GraphQLError('Upload serialization unsupported.');
            }
          });

          build.registerScalarType(
            GraphQLUpload.name,
            {},
            () => GraphQLUpload,
            'UploadPlugin registering Upload scalar'
          );

          return _;
        },

        // Add *Upload input fields alongside matching columns on mutation input types
        GraphQLInputObjectType_fields(fields, build, context) {
          const {
            scope: { pgCodec, isPgPatch, isPgBaseInput, isMutationInput }
          } = context;

          // Only process row-based input types (create inputs, patch inputs, base inputs)
          if (!pgCodec || !pgCodec.attributes) {
            return fields;
          }

          // Must be a mutation-related input type
          if (!isPgPatch && !isPgBaseInput && !isMutationInput) {
            return fields;
          }

          const UploadType = build.getTypeByName('Upload');
          if (!UploadType) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            const matchedDef = relevantUploadType(attribute, uploadFieldDefinitions);
            if (!matchedDef) continue;

            // Generate the upload field name: columnName + 'Upload'
            const baseFieldName = build.inflection.attribute({
              codec: pgCodec as any,
              attributeName
            });
            const uploadFieldName = baseFieldName + 'Upload';

            if (newFields[uploadFieldName]) {
              throw new Error(
                `Two columns produce the same upload field name '${uploadFieldName}' ` +
                `on codec '${pgCodec.name}'; one of them is '${attributeName}'`
              );
            }

            newFields = build.extend(
              newFields,
              {
                [uploadFieldName]: context.fieldWithHooks(
                  { fieldName: uploadFieldName, isPgUploadField: true } as any,
                  {
                    description: attribute.description
                      ? `Upload for ${attribute.description}`
                      : `File upload for the \`${baseFieldName}\` field.`,
                    type: UploadType
                  }
                )
              },
              `UploadPlugin adding upload field '${uploadFieldName}' for ` +
              `attribute '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },

        // Wrap mutation field resolvers to process file uploads
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            scope: { isRootMutation, fieldName, pgCodec }
          } = context;

          if (!isRootMutation || !pgCodec || !pgCodec.attributes) {
            return field;
          }

          // Build the mapping of upload field names to their resolvers
          const uploadResolversByFieldName: Record<string, any> = {};
          const tags: Record<string, any> = {};
          const types: Record<string, string> = {};
          const originals: Record<string, string> = {};

          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            const matchedDef = relevantUploadType(attribute, uploadFieldDefinitions);
            if (!matchedDef) continue;

            const baseFieldName = build.inflection.attribute({
              codec: pgCodec as any,
              attributeName
            });
            const uploadFieldName = baseFieldName + 'Upload';

            uploadResolversByFieldName[uploadFieldName] = matchedDef.resolve;
            tags[uploadFieldName] = attribute.extensions?.tags || {};
            types[uploadFieldName] = matchedDef.type || '';
            originals[uploadFieldName] = baseFieldName;
          }

          // If no upload fields match this mutation's codec, skip wrapping
          if (Object.keys(uploadResolversByFieldName).length === 0) {
            return field;
          }

          const defaultResolver = (obj: any) => obj[fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, context: any, info: any) {
              // Recursively walk args to find and resolve Upload promises
              async function resolvePromises(obj: any): Promise<void> {
                for (const key of Object.keys(obj)) {
                  if (obj[key] instanceof Promise) {
                    if (uploadResolversByFieldName[key]) {
                      const upload = await obj[key];
                      obj[originals[key]] = await uploadResolversByFieldName[key](
                        upload,
                        args,
                        context,
                        {
                          ...info,
                          uploadPlugin: {
                            tags: tags[key],
                            type: types[key]
                          }
                        }
                      );
                    }
                  } else if (obj[key] !== null && typeof obj[key] === 'object') {
                    await resolvePromises(obj[key]);
                  }
                }
              }

              await resolvePromises(args);
              return oldResolve(source, args, context, info);
            }
          };
        }
      }
    }
  };
}

export const UploadPlugin = createUploadPlugin;
export default UploadPlugin;
