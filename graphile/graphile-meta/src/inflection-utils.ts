import type { MetaInflection, PgCodec } from './types';

export function safeInflection<T>(fn: () => T, fallback: T): T {
  try {
    return fn() ?? fallback;
  } catch {
    return fallback;
  }
}

export function createAttributeInflector(
  inflection: MetaInflection,
): (attrName: string, codec: PgCodec) => string {
  return (attrName: string, codec: PgCodec): string => {
    const attributeName = safeInflection(
      () => inflection._attributeName?.({ attributeName: attrName, codec }),
      attrName,
    );
    return safeInflection(
      () => inflection.camelCase?.(attributeName),
      attributeName,
    );
  };
}

export function fallbackTableType(codecName: string): string {
  return codecName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char: string) => char.toUpperCase())
    .replace(/ /g, '');
}
