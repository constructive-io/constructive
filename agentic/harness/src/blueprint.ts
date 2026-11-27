type DeleteAction = 'c' | 'r' | 'n' | 'a' | 'd';

export type Blueprint = {
  name: string;
  description: string;
  categories?: string[];
  tags?: string[];
  definition: {
    tables: Array<{
      table_name: string;
      fields?: Array<{ name: string; type: string; is_required?: boolean; default?: string | null }>;
      nodes?: Array<string | { $type: string; data?: Record<string, unknown> }>;
      policies: Array<{
        $type: string;
        data?: Record<string, unknown>;
        privileges?: string[];
        policy_role?: string;
        permissive?: boolean;
      }>;
    }>;
    relations?: Array<{
      source_table: string;
      target_table: string;
      delete_action?: DeleteAction;
    } & (
      | { $type: 'RelationBelongsTo'; field_name: string; is_required?: boolean }
      | { $type: 'RelationManyToMany'; junction_table_name: string }
    )>;
  };
};
