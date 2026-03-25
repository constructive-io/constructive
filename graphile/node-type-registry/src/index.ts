// Re-export types
export type { NodeTypeDefinition, JSONSchema } from './types';

// Re-export all node definitions by category
export * from './authz';
export * from './data';
export * from './field';
export * from './relation';
export * from './view';
export * from './table';

// Convenience: all nodes as a flat array
import type { NodeTypeDefinition } from './types';
import * as authz from './authz';
import * as data from './data';
import * as field from './field';
import * as relation from './relation';
import * as view from './view';
import * as table from './table';

export const allNodeTypes: NodeTypeDefinition[] = [
  ...Object.values(authz),
  ...Object.values(data),
  ...Object.values(field),
  ...Object.values(relation),
  ...Object.values(view),
  ...Object.values(table),
];
