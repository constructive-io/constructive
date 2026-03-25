import type { NodeTypeDefinition } from '../types';

export const TableUserProfiles: NodeTypeDefinition = {
  name: 'TableUserProfiles',
  slug: 'table_user_profiles',
  category: 'data',
  display_name: 'User Profiles',
  description: 'Creates a user profiles table with standard profile fields (profile_picture, bio, first_name, last_name, tags, desired). Uses AuthzDirectOwner for edit access and AuthzAllowAll for select.',
  parameter_schema: {
      "type": "object",
      "properties": {}
    },
  tags: ['template', 'settings', 'ownership', 'schema'],
};
