import type { JsonValue } from './types.js';

/** Deep structural clone via JSON round-trip. Used to snapshot streamed messages. */
export function clone<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

/**
 * Parse JSON that may be truncated mid-stream. Returns `{}` for empty/garbage
 * input. Attempts a strict parse first, then closes any open strings/brackets
 * and retries — so partial tool-call arguments deserialize as they arrive.
 */
export function parsePartialJson(raw: string): Record<string, JsonValue | undefined> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed) as Record<string, JsonValue | undefined>;
  } catch {
    // continue
  }

  const completed = completePartialJson(trimmed);
  if (!completed) {
    return {};
  }

  try {
    return JSON.parse(completed) as Record<string, JsonValue | undefined>;
  } catch {
    return {};
  }
}

/** Close any open strings, objects, and arrays so a truncated fragment parses. */
export function completePartialJson(input: string): string | undefined {
  let output = input;
  let inString = false;
  let escaping = false;
  const stack: string[] = [];

  for (const char of input) {
    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      stack.pop();
    }
  }

  if (inString) {
    output += '"';
  }

  while (stack.length > 0) {
    output += stack.pop();
  }

  return output;
}
