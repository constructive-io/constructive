import * as t from 'gql-ast';
import { Kind } from 'graphql';
import type { InlineFragmentNode } from 'graphql';

import type { CleanField, MetaField } from './types';

export function getCustomAst(fieldDefn?: MetaField): any {
  if (!fieldDefn) {
    return null;
  }

  const { pgType } = fieldDefn.type;
  if (pgType === 'geometry') {
    return geometryAst(fieldDefn.name);
  }

  if (pgType === 'interval') {
    return intervalAst(fieldDefn.name);
  }

  return t.field({
    name: fieldDefn.name,
  });
}

/**
 * Generate custom AST for CleanField type - handles GraphQL types that need subfield selections
 */
export function getCustomAstForCleanField(field: CleanField): any {
  const { name, type } = field;
  const { gqlType, pgType } = type;

  // Handle by GraphQL type first (this is what the error messages reference)
  if (gqlType === 'GeometryPoint') {
    return geometryPointAst(name);
  }

  if (gqlType === 'Interval') {
    return intervalAst(name);
  }

  if (gqlType === 'GeometryGeometryCollection') {
    return geometryCollectionAst(name);
  }

  // Handle by pgType as fallback
  if (pgType === 'geometry') {
    return geometryAst(name);
  }

  if (pgType === 'interval') {
    return intervalAst(name);
  }

  // Return simple field for scalar types
  return t.field({
    name,
  });
}

/**
 * Check if a CleanField requires subfield selection based on its GraphQL type
 */
export function requiresSubfieldSelection(field: CleanField): boolean {
  const { gqlType } = field.type;

  // Complex GraphQL types that require subfield selection
  const complexTypes = [
    'GeometryPoint',
    'Interval',
    'GeometryGeometryCollection',
    'GeoJSON',
  ];

  return complexTypes.includes(gqlType);
}

/**
 * Generate AST for GeometryPoint type
 */
export function geometryPointAst(name: string): any {
  return t.field({
    name,
    selectionSet: t.selectionSet({
      selections: toFieldArray(['x', 'y']),
    }),
  });
}

/**
 * Generate AST for GeometryGeometryCollection type
 */
export function geometryCollectionAst(name: string): any {
  // Manually create inline fragment since gql-ast doesn't support it
  const inlineFragment: InlineFragmentNode = {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition: {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: 'GeometryPoint',
      },
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [
        {
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'x',
          },
        },
        {
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'y',
          },
        },
      ],
    },
  };

  return t.field({
    name,
    selectionSet: t.selectionSet({
      selections: [
        t.field({
          name: 'geometries',
          selectionSet: t.selectionSet({
            selections: [inlineFragment as any], // gql-ast limitation with inline fragments
          }),
        }),
      ],
    }),
  });
}

export function geometryAst(name: string): any {
  return t.field({
    name,
    selectionSet: t.selectionSet({
      selections: toFieldArray(['geojson']),
    }),
  });
}

export function intervalAst(name: string): any {
  return t.field({
    name,
    selectionSet: t.selectionSet({
      selections: toFieldArray([
        'days',
        'hours',
        'minutes',
        'months',
        'seconds',
        'years',
      ]),
    }),
  });
}

function toFieldArray(strArr: string[]): any[] {
  return strArr.map((fieldName) => t.field({ name: fieldName }));
}

export function isIntervalType(obj: any): boolean {
  return ['days', 'hours', 'minutes', 'months', 'seconds', 'years'].every(
    (key) => obj.hasOwnProperty(key)
  );
}
