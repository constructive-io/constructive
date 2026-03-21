/**
 * JSON Schema to GraphQL Input Field Spec Converter
 *
 * Converts JSON Schema objects (from node_type_registry.parameter_schema)
 * into field spec objects compatible with PostGraphile v5's fieldWithHooks API.
 *
 * Handles:
 * - string, integer, number, boolean primitives
 * - arrays (items -> GraphQLList)
 * - enums -> GraphQLEnumType
 * - required fields -> GraphQLNonNull
 * - union types (["integer", "string"]) -> JSON scalar fallback
 */

import type {
  GraphQLInputType,
  GraphQLScalarType,
  GraphQLNullableType,
} from 'graphql';

interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  format?: string;
}

interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  anyOf?: JsonSchema[];
  description?: string;
}

/**
 * A field spec that mirrors GraphQLInputFieldConfig.
 */
export interface FieldSpec {
  type: GraphQLInputType;
  description?: string;
}

/**
 * Minimal build interface — only what we need from PostGraphile's Build object.
 *
 * Uses permissive constructor signatures to avoid variance issues between
 * GraphQLNullableType and GraphQLInputType in the graphql-js type hierarchy.
 */
export interface BuildLike {
  graphql: {
    GraphQLString: GraphQLScalarType;
    GraphQLInt: GraphQLScalarType;
    GraphQLFloat: GraphQLScalarType;
    GraphQLBoolean: GraphQLScalarType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GraphQLNonNull: new (type: any) => GraphQLInputType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GraphQLList: new (type: any) => GraphQLInputType & GraphQLNullableType;
    GraphQLEnumType: new (config: {
      name: string;
      values: Record<string, { value: string }>;
    }) => GraphQLInputType & GraphQLNullableType;
  };
  getTypeByName: (name: string) => unknown;
}

/**
 * Convert a JSON Schema type string to a GraphQL scalar type.
 */
function jsonTypeToGraphQL(
  jsonType: string | string[],
  graphql: BuildLike['graphql'],
  jsonScalar: GraphQLInputType,
): GraphQLInputType {
  if (Array.isArray(jsonType)) {
    return jsonScalar;
  }

  switch (jsonType) {
    case 'string':
      return graphql.GraphQLString;
    case 'integer':
      return graphql.GraphQLInt;
    case 'number':
      return graphql.GraphQLFloat;
    case 'boolean':
      return graphql.GraphQLBoolean;
    case 'object':
      return jsonScalar;
    case 'array':
      return new graphql.GraphQLList(jsonScalar);
    default:
      return jsonScalar;
  }
}

/**
 * Convert a full JSON Schema (from parameter_schema) to field specs.
 *
 * Uses the build object from PostGraphile v5 to access GraphQL types,
 * avoiding direct graphql imports (which can cause version mismatches).
 *
 * @param schema - The JSON Schema object
 * @param typeName - The name prefix for generated enum types
 * @param build - The PostGraphile build object
 * @returns Record of field name -> FieldSpec
 */
export function jsonSchemaToGraphQLFieldSpecs(
  schema: JsonSchema,
  typeName: string,
  build: BuildLike,
): Record<string, FieldSpec> {
  const fields: Record<string, FieldSpec> = {};
  const properties = schema.properties as
    | Record<string, JsonSchemaProperty>
    | undefined;

  if (!properties) {
    return fields;
  }

  const { graphql } = build;
  const jsonScalar = (build.getTypeByName('JSON') ?? graphql.GraphQLString) as GraphQLInputType;
  const required = new Set(schema.required ?? []);

  for (const [propName, prop] of Object.entries(properties)) {
    let fieldType: GraphQLInputType;

    if (prop.enum && prop.enum.length > 0) {
      const values: Record<string, { value: string }> = {};
      for (const val of prop.enum) {
        const safeName = val.replace(/[^_a-zA-Z0-9]/g, '_').toUpperCase();
        values[safeName] = { value: val };
      }
      fieldType = new graphql.GraphQLEnumType({
        name: `${typeName}_${propName}`,
        values,
      });
    } else if (prop.type === 'array' && prop.items) {
      const innerType = prop.items.type
        ? jsonTypeToGraphQL(prop.items.type, graphql, jsonScalar)
        : jsonScalar;
      fieldType = new graphql.GraphQLList(innerType);
    } else {
      fieldType = jsonTypeToGraphQL(prop.type ?? 'string', graphql, jsonScalar);
    }

    if (required.has(propName)) {
      fieldType = new graphql.GraphQLNonNull(fieldType as GraphQLNullableType);
    }

    fields[propName] = {
      type: fieldType,
      description: prop.description ?? undefined,
    };
  }

  return fields;
}
