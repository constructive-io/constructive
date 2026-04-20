export type { NodeTypeDefinition, JSONSchema } from './types';
export * from './authz';
export * from './data';
export * from './relation';
export * from './view';
export * from './blueprint-types.generated';
export * from './module-presets';

import type { NodeTypeDefinition } from './types';
import * as authz from './authz';
import * as data from './data';
import * as relation from './relation';
import * as view from './view';

export const allNodeTypes: NodeTypeDefinition[] = [
  ...Object.values(authz),
  ...Object.values(data),
  ...Object.values(relation),
  ...Object.values(view),
];
