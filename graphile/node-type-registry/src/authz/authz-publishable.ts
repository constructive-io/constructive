import type { NodeTypeDefinition } from '../types';

export const AuthzPublishable: NodeTypeDefinition = {
  name: 'AuthzPublishable',
  slug: 'authz_publishable',
  category: 'authz',
  display_name: 'Published Content',
  description: 'Published state access control. Restricts access to records that are published.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "is_published_field": {
          "type": "string",
          "description": "Boolean field indicating published state",
          "default": "is_published"
        },
        "published_at_field": {
          "type": "string",
          "description": "Timestamp field for publish time",
          "default": "published_at"
        },
        "require_published_at": {
          "type": "boolean",
          "description": "Require published_at to be non-null and <= now()",
          "default": true
        }
      }
    },
  tags: ['temporal', 'publishing', 'authz'],
};
