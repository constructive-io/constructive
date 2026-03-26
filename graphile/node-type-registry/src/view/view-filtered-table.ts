import type { NodeTypeDefinition } from '../types';

export const ViewFilteredTable: NodeTypeDefinition = {
  name: 'ViewFilteredTable',
  slug: 'view_filtered_table',
  category: 'view',
  display_name: 'Filtered Table',
  description: 'Table projection with an Authz* filter baked into the view definition. The view only returns records matching the filter.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "source_table_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the source table"
        },
        "filter_type": {
          "type": "string",
          "description": "Authz* node type name (e.g., AuthzDirectOwner, AuthzPublishable)"
        },
        "filter_data": {
          "type": "object",
          "description": "Parameters for the Authz* filter type"
        },
        "field_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "description": "Optional array of field UUIDs to include (alternative to field_names)"
        },
        "field_names": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Optional array of field names to include (alternative to field_ids)"
        }
      },
      "required": [
        "source_table_id",
        "filter_type"
      ]
    },
  tags: ['view', 'filter', 'authz'],
};
