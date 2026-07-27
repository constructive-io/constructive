export interface ParsedAuthor {
  fullName: string;
  email?: string;
}

export function parseAuthor(author: string): ParsedAuthor {
  const trimmed = (author || '').trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return {
      fullName: match[1].trim(),
      email: match[2].trim()
    };
  }
  return { fullName: trimmed };
}
