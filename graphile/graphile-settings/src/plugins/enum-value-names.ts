/**
 * GraphQL names for PostgreSQL enum labels.
 *
 * A label is free text, but a GraphQL enum value name must match
 * /^[_A-Za-z][_0-9A-Za-z]*$/ and every name of one enum must differ. One label
 * that breaks either rule (`'in progress'`, `'done-ish'`) used to stop the whole
 * schema from building.
 *
 * The rule, applied to all labels of an enum together:
 * 1. A label whose name was valid before keeps it (`todo` -> `TODO`). When two
 *    labels shared one name (`'Done'`, `'done'`), the later label kept it, so it
 *    still does; the earlier one could not be read and moves on to step 3.
 * 2. Any other label replaces each run of characters outside [A-Za-z0-9_] with
 *    one `_` and is upper-cased (`'in progress'` -> `IN_PROGRESS`). A label with
 *    no letter or digit left becomes `_` and the label's hash.
 * 3. A name an earlier label already took gets `_` and the label's hash
 *    (`'a-b'` after `'a b'` -> `A_B_BSWM03`).
 *
 * The hash depends only on the label, so a name never depends on the order or
 * the presence of other labels beyond the collision itself.
 */

/** The name the label had before this rule: the default name, upper-cased. */
export type CurrentEnumValueName = (label: string) => string;

const VALID_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;

function isValidName(name: string): boolean {
  // Names starting with "__" are reserved for GraphQL introspection.
  return VALID_NAME.test(name) && !name.startsWith('__');
}

/** FNV-1a over the label's UTF-8 bytes, in base 36: short, stable, label-only. */
function labelHash(label: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(label)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

function rewrittenName(currentName: string, label: string): string {
  const name = currentName.replace(/[^0-9A-Za-z_]+/g, '_').toUpperCase().replace(/^__+/, '_');
  return /[0-9A-Za-z]/.test(name) ? name : `_${labelHash(label)}`;
}

/** The GraphQL name of every label of one enum, in the enum's label order. */
export function enumValueNames(
  labels: readonly string[],
  currentName: CurrentEnumValueName
): Map<string, string> {
  const names = new Map<string, string>();
  const taken = new Set<string>();
  const claim = (label: string, name: string) => {
    names.set(label, name);
    taken.add(name);
  };

  // Step 1, latest label first: where labels shared a name, the later one owned it.
  for (const label of [...labels].reverse()) {
    const name = currentName(label);
    if (isValidName(name) && !taken.has(name)) claim(label, name);
  }

  // Steps 2 and 3, in label order.
  for (const label of labels) {
    if (names.has(label)) continue;
    const current = currentName(label);
    const base = isValidName(current) ? current : rewrittenName(current, label);
    let name = taken.has(base) ? `${base}_${labelHash(label)}` : base;
    for (let n = 2; taken.has(name); n++) name = `${base}_${labelHash(label)}_${n}`;
    claim(label, name);
  }

  return names;
}

/** The slice of an enum codec this reads: its labels, in order. */
export interface EnumLabels {
  values?: readonly { value: string }[];
}

/**
 * The GraphQL name of one label of `codec`. The names of all its labels are
 * worked out together, since a name is unique only among them; an enum has few
 * labels, so this is cheap enough to do per call.
 */
export function enumValueName(
  label: string,
  codec: EnumLabels | null | undefined,
  currentName: CurrentEnumValueName
): string {
  const labels = codec?.values?.map((value) => value.value) ?? [];
  const names = enumValueNames(labels.includes(label) ? labels : [...labels, label], currentName);
  return names.get(label)!;
}
