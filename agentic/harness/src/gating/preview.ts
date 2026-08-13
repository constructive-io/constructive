/**
 * What a gated action will concretely do (e.g. the rows about to be inserted),
 * so hosts can render it for review before the user approves.
 */

export type ConfirmPreviewField = {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue: string | null;
};

export type ConfirmPreviewTable = {
  name: string;
  fields: ConfirmPreviewField[];
  policies: string[];
  relationCount: number;
};

export type ConfirmPreview =
  | { kind: 'records'; tableName: string; rows: Record<string, unknown>[] }
  | { kind: 'blueprint'; tables: ConfirmPreviewTable[] }
  | { kind: 'template'; displayName: string; blueprintName?: string; tables: ConfirmPreviewTable[] }
  | { kind: 'policies'; tableName: string; policies: string[] }
  | { kind: 'field'; tableName: string; field: ConfirmPreviewField };

/** What a host puts in front of the user for one gated call. */
export type ConfirmPrompt = { title: string; message: string; preview?: ConfirmPreview };
