import type { NodeTypeDefinition } from '../types';

export const AuthzRelatedMemberList: NodeTypeDefinition = {
  name: 'AuthzRelatedMemberList',
  slug: 'authz_related_member_list',
  category: 'authz',
  display_name: 'Related Member List',
  description: 'Array membership check in a related table.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "owned_schema": {
          "type": "string",
          "description": "Schema of the related table"
        },
        "owned_table": {
          "type": "string",
          "description": "Name of the related table"
        },
        "owned_table_key": {
          "type": "string",
          "description": "Array column in related table"
        },
        "owned_table_ref_key": {
          "type": "string",
          "description": "FK column in related table"
        },
        "this_object_key": {
          "type": "string",
          "description": "PK column in protected table"
        }
      },
      "required": [
        "owned_schema",
        "owned_table",
        "owned_table_key",
        "owned_table_ref_key",
        "this_object_key"
      ]
    },
  tags: ['ownership', 'authz'],
};
