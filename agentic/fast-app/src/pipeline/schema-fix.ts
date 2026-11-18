// What a schema-phase refusal from the backend asks the agent to change, when
// its cause names something more exact than the step's own fix. Pure.

// metaschema keeps a table's field names unique after dropping _id-style
// suffixes from uuid columns. plan_app refuses the clashes it can see; this
// says what the backend's own refusal means when one reaches it anyway.
const FIELD_NAME_FIX =
  'Two columns of one table count as the same name: the backend compares uuid columns without their "_id"-style suffix, so a field like "owner" clashes with owner_id and "deal" with a deal_id key. Rename the field (for example "owner_name"), then call plan_app again.';

/** The fix a backend refusal calls for, when its cause names one; else the step's own. */
export function fixFor(cause: string, fix: string): string {
  return /databases_field_uniq_names_idx/.test(cause) ? FIELD_NAME_FIX : fix;
}
