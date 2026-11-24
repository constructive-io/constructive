// The names the translator gives to what it creates beyond the spec: link
// tables and their key columns. They follow the backend's own convention for
// derived names (`projects` + `tags` → `project_tags` with `project_id` and
// `tag_id`), so the agent can predict them when it writes seed rows.

import type { SpecLink } from './types';

/** `shifts` → `shift`, `categories` → `category`, `classes` → `class`; anything else stays. */
export function singular(name: string): string {
  if (/ies$/.test(name) && name.length > 4) return `${name.slice(0, -3)}y`;
  if (/(ss|x|z|ch|sh)es$/.test(name)) return name.slice(0, -2);
  if (/[^s]s$/.test(name)) return name.slice(0, -1);
  return name;
}

/** The key column a link table keeps for one side: `volunteers` → `volunteer_id`. */
export function linkKey(entity: string): string {
  return `${singular(entity)}_id`;
}

/** `volunteers` + `shifts` → `volunteer_shifts`, unless the link names itself. */
export function linkTableName(link: SpecLink): string {
  return link.name ?? `${singular(link.between[0])}_${link.between[1]}`;
}

/** A snake_case identifier from free text, for the blueprint's own name. */
export function snakeName(text: string): string {
  const name = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^[a-z]/.test(name) ? name : `app_${name}`;
}
