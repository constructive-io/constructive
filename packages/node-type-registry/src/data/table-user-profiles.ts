import type { NodeTypeDefinition } from '../types';

export const TableUserProfiles: NodeTypeDefinition = {
  name: 'TableUserProfiles',
  slug: 'table_user_profiles',
  category: 'data',
  display_name: 'User Profiles',
  description: 'Creates a user profiles table with standard profile fields and owner-based access control.',
  parameter_schema: { type: 'object', properties: {} },
  tags: ['template', 'settings', 'ownership', 'schema']
};
