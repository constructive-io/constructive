import '../augmentations';
import type { GraphileConfig } from 'graphile-config';

/**
 * ConnectionFilterInflectionPlugin
 *
 * Adds inflection methods for naming filter types:
 * - filterType(typeName) -> e.g. "UserFilter"
 * - filterFieldType(typeName) -> e.g. "StringFilter"
 * - filterFieldListType(typeName) -> e.g. "StringListFilter"
 */
export const ConnectionFilterInflectionPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterInflectionPlugin',
  version: '1.0.0',
  description: 'Adds inflection methods for connection filter type naming',

  inflection: {
    add: {
      filterType(_preset, typeName: string): string {
        return `${typeName}Filter`;
      },
      filterFieldType(_preset, typeName: string): string {
        return `${typeName}Filter`;
      },
      filterFieldListType(_preset, typeName: string): string {
        return `${typeName}ListFilter`;
      },
    },
  },
};
