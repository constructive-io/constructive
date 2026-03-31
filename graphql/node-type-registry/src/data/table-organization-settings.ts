import type { NodeTypeDefinition } from '../types';

export const TableOrganizationSettings: NodeTypeDefinition = {
  "name": "TableOrganizationSettings",
  "slug": "table_organization_settings",
  "category": "data",
  "display_name": "Organization Settings",
  "description": "Creates an organization settings table with standard business fields (legal_name, address fields). Uses AuthzEntityMembership for access control.",
  "parameter_schema": {
    "type": "object",
    "properties": {}
  },
  "tags": [
    "template",
    "settings",
    "membership",
    "schema"
  ]
};
