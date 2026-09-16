import { readFileSync } from 'fs';
import { join } from 'path';

import {
  allCodes,
  classify,
  errors,
  format,
  getDefinition,
  httpStatusFor,
  parse,
  toError,
} from '../src';
import {
  GENERATED_CODE_META,
  generatedRegistry,
} from '../src/generated/registry.generated';

const inventory: Record<string, unknown> = JSON.parse(
  readFileSync(join(__dirname, '../scripts/db-error-inventory.json'), 'utf-8')
);

const SQL_CODES = [
  'STORAGE_ACCESS_CLAIM_MISMATCH',
  'STORAGE_FILE_NOT_FOUND',
  'STORAGE_SOURCE_HASH_REQUIRED',
  'STORAGE_SOURCE_HASH_MISMATCH',
  'STORAGE_INVALID_COMPLETION_RESULT',
  'STORAGE_PROCESSING_CONFLICT',
  'STORAGE_INVALID_UPLOAD_DOCUMENT',
] as const;

const RUNTIME_ONLY_CODES = [
  'STORAGE_BUCKET_DATABASE_MISMATCH',
  'STORAGE_FILE_TARGET_UNAVAILABLE',
] as const;

type SqlContext = {
  database_id: string | null;
  file_id: string | null;
  bucket_id: string | null;
};

const lifecycleDefinitions = [
  {
    code: 'STORAGE_ACCESS_CLAIM_MISMATCH',
    class: 'public',
    http: 403,
    message: 'You do not have permission to process this file.',
  },
  {
    code: 'STORAGE_FILE_NOT_FOUND',
    class: 'public',
    http: 404,
    message: 'The file could not be found.',
  },
  {
    code: 'STORAGE_SOURCE_HASH_REQUIRED',
    class: 'public',
    http: 400,
    message: 'A valid source file hash is required.',
  },
  {
    code: 'STORAGE_SOURCE_HASH_MISMATCH',
    class: 'public',
    http: 409,
    message: 'The source file has changed. Please process it again.',
  },
  {
    code: 'STORAGE_INVALID_COMPLETION_RESULT',
    class: 'public',
    http: 400,
    message: 'The file processing result is invalid.',
  },
  {
    code: 'STORAGE_PROCESSING_CONFLICT',
    class: 'public',
    http: 409,
    message: 'The file is not in a state that allows this processing result.',
  },
  {
    code: 'STORAGE_INVALID_UPLOAD_DOCUMENT',
    class: 'internal',
    http: 500,
    message: 'The stored upload document is invalid.',
  },
  {
    code: 'STORAGE_BUCKET_DATABASE_MISMATCH',
    class: 'internal',
    http: 500,
    message: 'The storage bucket does not belong to the invocation database.',
  },
  {
    code: 'STORAGE_FILE_TARGET_UNAVAILABLE',
    class: 'internal',
    http: 500,
    message: 'The storage file target is unavailable.',
  },
] as const;

const publicStorageContext = {
  database_id: 'db-1',
  file_id: 'file-1',
  bucket_id: 'bucket-1',
};

describe('storage lifecycle registry entries', () => {
  it('exposes every lifecycle code with its public contract and stable copy', () => {
    for (const expected of lifecycleDefinitions) {
      const definition = getDefinition(expected.code);

      expect(definition).toMatchObject(expected);
      expect(classify(expected.code)).toBe(expected.class);
      expect(httpStatusFor(expected.code)).toEqual({
        status: expected.http,
        mapped: true,
      });
      expect(format(expected.code)).toBe(expected.message);
      expect(format(expected.code, publicStorageContext)).toBe(
        expected.message
      );
      expect(allCodes()).toContain(expected.code);
    }
  });

  it('keeps SQL and runtime provenance synchronized', () => {
    for (const code of SQL_CODES) {
      expect(inventory[code]).toBeDefined();
      expect(generatedRegistry[code]).toBeDefined();
      expect(GENERATED_CODE_META[code]).toBeDefined();
    }
    for (const code of RUNTIME_ONLY_CODES) {
      expect(inventory[code]).toBeUndefined();
      expect(generatedRegistry[code]).toBeUndefined();
      expect(GENERATED_CODE_META[code]).toBeUndefined();
    }
  });
});

describe('storage lifecycle PostgreSQL DETAIL transport', () => {
  const sqlContext: SqlContext = {
    database_id: 'db-1',
    file_id: 'file-1',
    bucket_id: 'bucket-1',
  };
  const sqlDetails = SQL_CODES.map((code) => ({
    code,
    class: code === 'STORAGE_INVALID_UPLOAD_DOCUMENT' ? 'internal' : 'public',
    context: sqlContext,
  }));

  // NULL values come directly from the SQL helper's nullable claims/arguments.
  sqlDetails[0].context = {
    database_id: null,
    file_id: 'file-1',
    bucket_id: 'bucket-1',
  };
  sqlDetails[1].context = {
    database_id: 'db-1',
    file_id: null,
    bucket_id: 'bucket-1',
  };

  it('recovers known code, explicit class, raw message, and nullable SQL context', () => {
    for (const detail of sqlDetails) {
      const parsed = parse({
        message: detail.code,
        code: 'P0001',
        detail: JSON.stringify({
          code: detail.code,
          context: detail.context,
          class: detail.class,
        }),
      });

      expect(parsed).toMatchObject({
        code: detail.code,
        context: detail.context,
        class: detail.class,
        known: true,
        rawMessage: detail.code,
        sqlState: 'P0001',
      });
      expect(parsed.context).toEqual(detail.context);
    }
  });

  it('falls back to the registry when DETAIL omits class', () => {
    for (const expected of lifecycleDefinitions) {
      const parsed = parse({
        message: expected.code,
        code: 'P0001',
        detail: JSON.stringify({ code: expected.code, context: {} }),
      });

      expect(parsed.class).toBe(expected.class);
      expect(parsed.known).toBe(true);
    }
  });

  it('trusts an explicit class even when it differs from the registry', () => {
    for (const expected of lifecycleDefinitions) {
      const explicitClass = expected.class === 'public' ? 'internal' : 'public';
      const parsed = parse({
        message: expected.code,
        code: 'P0001',
        detail: JSON.stringify({
          code: expected.code,
          context: {},
          class: explicitClass,
        }),
      });

      expect(parsed.class).toBe(explicitClass);
      expect(parsed.known).toBe(true);
    }
  });

  it('normalizes every raw lifecycle transport with registry copy and status', () => {
    const contexts = {
      STORAGE_ACCESS_CLAIM_MISMATCH: publicStorageContext,
      STORAGE_FILE_NOT_FOUND: publicStorageContext,
      STORAGE_SOURCE_HASH_REQUIRED: publicStorageContext,
      STORAGE_SOURCE_HASH_MISMATCH: publicStorageContext,
      STORAGE_INVALID_COMPLETION_RESULT: publicStorageContext,
      STORAGE_PROCESSING_CONFLICT: publicStorageContext,
      STORAGE_INVALID_UPLOAD_DOCUMENT: publicStorageContext,
      STORAGE_BUCKET_DATABASE_MISMATCH: {
        bucket: 'exports',
        bucketDatabaseId: 'db-bucket',
        invocationDatabaseId: 'db-invocation',
      },
      STORAGE_FILE_TARGET_UNAVAILABLE: {
        bucket: 'exports',
        bucketId: 'bucket-1',
      },
    } as const;

    for (const expected of lifecycleDefinitions) {
      const err = toError({
        message: expected.code,
        code: 'P0001',
        detail: JSON.stringify({
          code: expected.code,
          context: contexts[expected.code],
        }),
      });

      expect(err).toMatchObject({
        code: expected.code,
        errorClass: expected.class,
        http: expected.http,
        message: expected.message,
        context: contexts[expected.code],
      });
      expect(err.context).toEqual(contexts[expected.code]);
    }
  });

  it('uses the registry HTTP status even when DB class is explicitly internal', () => {
    for (const expected of lifecycleDefinitions.filter(
      (item) => item.class === 'public'
    )) {
      const err = toError({
        message: expected.code,
        code: 'P0001',
        detail: JSON.stringify({
          code: expected.code,
          context: publicStorageContext,
          class: 'internal',
        }),
      });

      expect(err.errorClass).toBe('internal');
      expect(err.http).toBe(expected.http);
      expect(httpStatusFor(expected.code)).toEqual({
        status: expected.http,
        mapped: true,
      });
    }
  });

  it('parses runtime DETAIL with camelCase validation context', () => {
    const context = {
      field: 'output',
      reason: 'serialized_size',
      maxBytes: 64 * 1024,
    };
    const parsed = parse({
      message: 'STORAGE_INVALID_COMPLETION_RESULT',
      code: 'STORAGE_INVALID_COMPLETION_RESULT',
      detail: JSON.stringify({
        code: 'STORAGE_INVALID_COMPLETION_RESULT',
        context,
        class: 'internal',
      }),
    });

    expect(parsed).toMatchObject({
      code: 'STORAGE_INVALID_COMPLETION_RESULT',
      context,
      class: 'internal',
      known: true,
      rawMessage: 'STORAGE_INVALID_COMPLETION_RESULT',
    });
    expect(parsed.context).toEqual(context);
  });
});

describe('storage lifecycle runtime contexts', () => {
  it('builds both runtime-only context variants as known internal errors', () => {
    const cases = [
      {
        code: 'STORAGE_BUCKET_DATABASE_MISMATCH' as const,
        contexts: [
          {
            bucket: 'exports',
            capabilitiesDatabaseId: 'db-capabilities',
            invocationDatabaseId: null as string | null,
            reason: 'capability_bundle_database_mismatch',
          },
          {
            bucket: 'exports',
            bucketDatabaseId: 'db-bucket',
            invocationDatabaseId: 'db-invocation',
          },
        ],
      },
      {
        code: 'STORAGE_FILE_TARGET_UNAVAILABLE' as const,
        contexts: [
          { bucket: 'exports', reason: 'database_unavailable' },
          { bucket: 'exports', bucketId: 'bucket-1' },
        ],
      },
    ];

    for (const entry of cases) {
      for (const context of entry.contexts) {
        const err = errors[entry.code](context);
        expect(err).toMatchObject({
          code: entry.code,
          errorClass: 'internal',
          http: 500,
          context,
        });
        expect(err.context).toEqual(context);
        expect(parse(err)).toMatchObject({
          code: entry.code,
          context,
          class: 'internal',
          known: true,
        });
        expect(parse(err).context).toEqual(context);
      }
    }
  });

  it('accepts SQL and runtime context variants for shared codes', () => {
    const fileNotFound = errors.STORAGE_FILE_NOT_FOUND({
      database_id: null,
      file_id: null,
      bucket_id: null,
    });
    const invalidTarget = errors.STORAGE_FILE_NOT_FOUND({
      reason: 'invalid_target',
    });
    const resolvedTarget = errors.STORAGE_FILE_NOT_FOUND({
      bucket: 'exports',
      fileId: 'file-1',
    });
    const sourceHashRequired = errors.STORAGE_SOURCE_HASH_REQUIRED({
      database_id: 'db-1',
      file_id: null,
      bucket_id: null,
    });
    const missingHash = errors.STORAGE_SOURCE_HASH_REQUIRED({
      field: 'expected.contentHash',
    });
    const invalidResult = errors.STORAGE_INVALID_COMPLETION_RESULT({
      database_id: null,
      file_id: 'file-1',
      bucket_id: 'bucket-1',
    });
    const serializationFailure = errors.STORAGE_INVALID_COMPLETION_RESULT({
      field: 'output',
      reason: 'serialization_failed',
      cause: 'Converting circular structure to JSON',
    });
    const oversizedResult = errors.STORAGE_INVALID_COMPLETION_RESULT({
      field: 'output',
      reason: 'serialized_size',
      maxBytes: 64 * 1024,
    });

    expect(fileNotFound.context).toMatchObject({
      database_id: null,
      file_id: null,
      bucket_id: null,
    });
    expect(invalidTarget.context).toEqual({ reason: 'invalid_target' });
    expect(resolvedTarget.context).toEqual({
      bucket: 'exports',
      fileId: 'file-1',
    });
    expect(sourceHashRequired.context).toMatchObject({
      database_id: 'db-1',
      file_id: null,
      bucket_id: null,
    });
    expect(missingHash.context).toEqual({ field: 'expected.contentHash' });
    expect(invalidResult.context).toMatchObject({
      database_id: null,
      file_id: 'file-1',
      bucket_id: 'bucket-1',
    });
    expect(serializationFailure.context).toMatchObject({
      field: 'output',
      reason: 'serialization_failed',
      cause: 'Converting circular structure to JSON',
    });
    expect(oversizedResult.context).toMatchObject({
      field: 'output',
      reason: 'serialized_size',
      maxBytes: 64 * 1024,
    });
  });
});
