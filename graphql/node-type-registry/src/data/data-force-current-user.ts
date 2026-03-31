import type { NodeTypeDefinition } from '../types';

export const DataForceCurrentUser: NodeTypeDefinition = {
  "name": "DataForceCurrentUser",
  "slug": "data_force_current_user",
  "category": "data",
  "display_name": "Force Current User",
  "description": "BEFORE INSERT trigger that forces a field to the value of jwt_public.current_user_id(). Prevents clients from spoofing the actor/uploader identity. The field value is always overwritten regardless of what the client provides.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Name of the field to force to current_user_id()",
        "default": "actor_id"
      }
    }
  },
  "tags": [
    "trigger",
    "security",
    "schema"
  ]
};
