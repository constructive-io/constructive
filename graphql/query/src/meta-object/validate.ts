import Ajv, { type ValidateFunction } from 'ajv';

import format from './format.json';

export interface ValidationResult {
  errors: unknown[] | null | undefined;
  message: string;
}

let cachedAjv: Ajv | null = null;
let cachedValidator: ValidateFunction | null = null;

function getValidator() {
  if (!cachedAjv) {
    cachedAjv = new Ajv({ allErrors: true });
    cachedValidator = cachedAjv.compile(format);
  }

  return {
    ajv: cachedAjv,
    validator: cachedValidator!,
  };
}

/**
 * Validate a MetaObject against the JSON schema
 * @returns true if valid, or an object with errors and message if invalid
 */
export function validateMetaObject(obj: unknown): true | ValidationResult {
  const { ajv, validator } = getValidator();
  const valid = validator(obj);

  if (valid) return true;

  return {
    errors: validator.errors,
    message: ajv.errorsText(validator.errors, { separator: '\n' }),
  };
}
