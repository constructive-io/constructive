import { ConstructiveError } from '@constructive-io/errors';

/** The public response must not identify an occupying file or why it is unavailable. */
export function fileNotReplaceable(): ConstructiveError {
  return new ConstructiveError({
    code: 'FILE_NOT_REPLACEABLE',
    message: 'The upload key is unavailable.',
    errorClass: 'public',
    http: 409,
  });
}
