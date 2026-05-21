export * from './authz';
export * from './blueprint-types.generated';
export * from './conditions';
export * from './data';
export * from './event';
export * from './job';
export * from './limit';
export * from './module-presets';
export * from './process';
export * from './relation';
export type { JSONSchema,NodeTypeDefinition } from './types';
export * from './view';

import * as authz from './authz';
import * as data from './data';
import * as event from './event';
import * as job from './job';
import * as limit from './limit';
import * as process from './process';
import * as relation from './relation';
import type { NodeTypeDefinition } from './types';
import * as view from './view';

export const allNodeTypes: NodeTypeDefinition[] = [
  ...Object.values(authz),
  ...Object.values(data),
  ...Object.values(event),
  ...Object.values(job),
  ...Object.values(limit),
  ...Object.values(process),
  ...Object.values(relation),
  ...Object.values(view)
];
