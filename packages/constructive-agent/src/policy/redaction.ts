import { createHash } from 'crypto';

export interface RedactionConfig {
  sensitiveKeyPatterns: RegExp[];
  replacement: string;
}

export const DEFAULT_REDACTION_CONFIG: RedactionConfig = {
  sensitiveKeyPatterns: [
    /token/i,
    /secret/i,
    /password/i,
    /api[_-]?key/i,
    /authorization/i,
    /cookie/i,
  ],
  replacement: '[REDACTED]',
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const isSensitiveKey = (key: string, config: RedactionConfig): boolean => {
  return config.sensitiveKeyPatterns.some((pattern) => pattern.test(key));
};

export const redactValue = (
  value: unknown,
  config: RedactionConfig = DEFAULT_REDACTION_CONFIG,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, config));
  }

  if (isObject(value)) {
    const output: Record<string, unknown> = {};
    const keys = Object.keys(value);

    for (const key of keys) {
      if (isSensitiveKey(key, config)) {
        output[key] = config.replacement;
        continue;
      }

      output[key] = redactValue(value[key], config);
    }

    return output;
  }

  return value;
};

const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    const serialized = keys.map((key) => {
      return `${JSON.stringify(key)}:${stableSerialize(value[key])}`;
    });

    return `{${serialized.join(',')}}`;
  }

  return JSON.stringify(value);
};

export const hashValue = (value: unknown): string => {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
};

