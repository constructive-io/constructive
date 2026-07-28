export interface ParsedSkillFrontmatter {
  name: string;
  description: string;
  /** Skill names this skill depends on (frontmatter `requires:`). */
  requires: string[];
  body: string;
}

function parseRequires(fm: string): string[] {
  const inline = fm.match(/(?:^|\n)requires:\s*\[([^\]]*)\]/);
  if (inline) {
    return inline[1]
      .split(',')
      .map((s) => unquoteScalar(s.trim()) ?? '')
      .filter(Boolean);
  }
  const block = fm.match(/(?:^|\n)requires:\s*\n((?:[ \t]+-[^\n]*\n?)+)/);
  if (block) {
    return block[1]
      .split('\n')
      .map((line) => line.replace(/^[ \t]+-\s*/, '').trim())
      .map((s) => unquoteScalar(s) ?? '')
      .filter(Boolean);
  }
  return [];
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

/** Parse the minimal YAML frontmatter (`name`, `description`, optional `requires`) of a SKILL.md. */
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
  return { name, description, requires: parseRequires(fm), body };
}
