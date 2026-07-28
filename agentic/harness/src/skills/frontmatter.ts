export interface ParsedSkillFrontmatter {
  name: string;
  description: string;
  body: string;
}

function unquoteScalar(value: string | undefined): string | undefined {
  if (value && value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value;
    }
  }
  return value;
}

/** Parse the minimal YAML frontmatter (`name`, `description`) of a SKILL.md. */
export function parseFrontmatter(raw: string): ParsedSkillFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Skill is missing YAML frontmatter (expected leading `---` block)');
  }
  const [, fm, body] = match;
  const nameMatch = fm.match(/(?:^|\n)name:\s*(.+?)\s*(?:\n|$)/);
  const descMatch = fm.match(/(?:^|\n)description:\s*(.+?)\s*(?:\n|$)/);
  const name = unquoteScalar(nameMatch?.[1]?.trim());
  const description = unquoteScalar(descMatch?.[1]?.trim());
  if (!name) throw new Error('Skill frontmatter missing `name`');
  if (!description) throw new Error('Skill frontmatter missing `description`');
  return { name, description, body };
}
