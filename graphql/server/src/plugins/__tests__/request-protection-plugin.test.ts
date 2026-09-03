import { SafeError } from 'grafast';

import { documentRefusalReason } from '../request-protection-plugin';

describe('documentRefusalReason', () => {
  it.each([
    ['QUERY_TOO_DEEP', 'query_too_deep'],
    ['QUERY_TOO_COSTLY', 'query_too_costly'],
    ['PAGE_SIZE_TOO_LARGE', 'page_size_too_large']
  ])('maps %s to the %s refusal', (code, reason) => {
    expect(documentRefusalReason(new SafeError('refused', { code, statusCode: 400 }))).toBe(reason);
  });

  it('ignores errors that are not document-protection refusals', () => {
    expect(documentRefusalReason(new SafeError('other', { code: 'FORBIDDEN' }))).toBeUndefined();
    expect(documentRefusalReason(new SafeError('no code'))).toBeUndefined();
    expect(documentRefusalReason(new Error('plain'))).toBeUndefined();
    expect(documentRefusalReason('string')).toBeUndefined();
  });
});
