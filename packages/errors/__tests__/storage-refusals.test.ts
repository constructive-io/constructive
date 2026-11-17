import { readFileSync } from 'fs';
import { join } from 'path';

import {
  errors,
  format,
  httpStatusFor,
  resetUnmappedStatusReports,
  setUnmappedStatusReporter,
  toError
} from '../src';

const inventory: Record<string, unknown> = JSON.parse(
  readFileSync(join(__dirname, '../scripts/db-error-inventory.json'), 'utf-8')
);

/** The shape errors.raise_error gives node-postgres: P0001 with the payload in DETAIL. */
const raised = (code: string, context: Record<string, unknown>, errorClass: 'public' | 'internal') =>
  Object.assign(new Error(code), {
    code: 'P0001',
    detail: JSON.stringify({ code, context, class: errorClass })
  });

const reported: string[] = [];

beforeEach(() => {
  reported.length = 0;
  resetUnmappedStatusReports();
  setUnmappedStatusReporter(code => reported.push(code));
});

afterAll(() => {
  setUnmappedStatusReporter(null);
});

const fileId = '6f1c2f0e-0000-4000-8000-000000000001';

describe('file and secret refusals raised by the database', () => {
  it('answers a write about a file row that is gone as a 404', () => {
    const err = toError(raised('FILE_NOT_FOUND', { file_id: fileId }, 'internal'));

    expect(inventory.FILE_NOT_FOUND).toBeDefined();
    expect(err).toMatchObject({
      code: 'FILE_NOT_FOUND',
      errorClass: 'internal',
      http: 404,
      context: { file_id: fileId }
    });
    expect(err.message).toBe('File not found.');
    expect(reported).toEqual([]);
  });

  it('keeps a write about a file in the wrong status internal, as the database raises it', () => {
    const err = toError(raised('FILE_STATUS_INVALID', { file_id: fileId }, 'internal'));

    expect(inventory.FILE_STATUS_INVALID).toBeDefined();
    expect(err).toMatchObject({
      code: 'FILE_STATUS_INVALID',
      errorClass: 'internal',
      http: 500,
      context: { file_id: fileId }
    });
    expect(err.message).toBe('File status invalid.');
    expect(reported).toEqual([]);
  });

  it('answers deleting a secret that does not exist as a public 404', () => {
    const err = toError(raised('SECRET_NOT_FOUND', {}, 'public'));

    expect(inventory.SECRET_NOT_FOUND).toBeDefined();
    expect(err).toMatchObject({ code: 'SECRET_NOT_FOUND', errorClass: 'public', http: 404 });
    expect(err.message).toBe('Secret not found.');
    expect(reported).toEqual([]);
  });
});

describe('FILE_NOT_FOUND on the local filesystem', () => {
  it('still names the path and the kind of file', () => {
    const err = errors.FILE_NOT_FOUND({ filePath: 'pgpm.json', type: 'configuration' });

    expect(err).toMatchObject({ code: 'FILE_NOT_FOUND', errorClass: 'internal', http: 404 });
    expect(err.message).toBe('configuration file not found: pgpm.json');
    expect(format('FILE_NOT_FOUND', { filePath: 'a.sql' })).toBe('File not found: a.sql');
  });
});

describe('codes a generator hands to a raise helper instead of spelling at the raise', () => {
  it.each([
    ['RESOURCE_CPU_CAP_EXCEEDED', 400],
    ['RESOURCE_MEMORY_CAP_EXCEEDED', 400],
    ['RESOURCE_STORAGE_TOTAL_CAP_EXCEEDED', 400],
    ['EXECUTION_DEADLINE_EXCEEDS_RETENTION', 400],
    ['PROCESS_EXTRACTION_INSERT_ON_FILES_TABLE', 400]
  ])('registers %s as a public %i', (code, status) => {
    expect(inventory[code]).toBeDefined();
    expect(httpStatusFor(code)).toEqual({ status, mapped: true });
    expect(toError(raised(code, {}, 'public'))).toMatchObject({ code, errorClass: 'public', http: status });
  });
});
