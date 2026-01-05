/**
 * Server Configuration
 *
 * Specifies which PostgreSQL schemas contain the API metadata tables
 * (apis, domains, sites, api_extensions, etc.) for multi-tenant routing.
 */

import type { ConstructiveOptions } from '@constructive-io/graphql-types';

export const defaultConfig: Partial<ConstructiveOptions> = {
  api: {
    metaSchemas: [
      'services_public',
      'metaschema_public',
      'metaschema_modules_public',
    ],
  },
};

export default defaultConfig;
