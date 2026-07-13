import {
  buildCreateProbePartition,
  buildDropProbePartition,
  buildPartConfigLikePatterns,
  buildSettingsInsert,
  escapeLikeLiteral,
  PART_CONFIG_FOR_TENANT_SQL,
  qid,
  SCHEMA_UPDATE_CHANNEL,
  SETTINGS_DELETE_SQL,
  SETTINGS_FLAGS,
  splitParentTable
} from '../sql';

// ---------------------------------------------------------------------------
// settings-SQL builder — emits exactly the intended INSERT / DELETE
// ---------------------------------------------------------------------------
describe('buildSettingsInsert', () => {
  test('single flag → parameterized one-row INSERT ($1 = database_id, $2 = flag)', () => {
    expect(buildSettingsInsert(['enable_aggregates'])).toBe(
      'INSERT INTO services_public.database_settings (database_id, enable_aggregates) VALUES ($1, $2)'
    );
  });

  test('multiple flags keep order and placeholder numbering', () => {
    expect(buildSettingsInsert(['enable_aggregates', 'enable_realtime'])).toBe(
      'INSERT INTO services_public.database_settings (database_id, enable_aggregates, enable_realtime) VALUES ($1, $2, $3)'
    );
  });

  test('rejects an unknown column (allowlist guard) and an empty list', () => {
    expect(() => buildSettingsInsert(['drop_table' as any])).toThrow(/unknown settings flag/);
    expect(() => buildSettingsInsert([])).toThrow(/at least one flag/);
  });

  test('the allowlist is the 12 known feature flags', () => {
    expect(SETTINGS_FLAGS).toHaveLength(12);
    expect(SETTINGS_FLAGS).toContain('enable_realtime');
    expect(SETTINGS_FLAGS).toContain('enable_aggregates');
  });
});

describe('settings DELETE + notify channel', () => {
  test('DELETE targets exactly the seeded database_id set', () => {
    expect(SETTINGS_DELETE_SQL).toBe(
      'DELETE FROM services_public.database_settings WHERE database_id = ANY($1::uuid[])'
    );
  });

  test('schema:update channel is the server LISTEN channel', () => {
    expect(SCHEMA_UPDATE_CHANNEL).toBe('schema:update');
  });
});

// ---------------------------------------------------------------------------
// probe-partition DDL builders (reversible pair) + identifier escaping
// ---------------------------------------------------------------------------
describe('probe partition DDL', () => {
  test('CREATE quotes identifiers and inlines validated ISO bounds', () => {
    const sql = buildCreateProbePartition('factory2-aaaa1111-app-private', 'events', 'events__perfcreep_probe', '2099-01-01 00:00:00+00', '2099-01-08 00:00:00+00');
    expect(sql).toBe(
      'CREATE TABLE "factory2-aaaa1111-app-private"."events__perfcreep_probe" ' +
        'PARTITION OF "factory2-aaaa1111-app-private"."events" ' +
        "FOR VALUES FROM ('2099-01-01 00:00:00+00') TO ('2099-01-08 00:00:00+00')"
    );
  });

  test('DROP is the exact inverse', () => {
    expect(buildDropProbePartition('s', 'events__perfcreep_probe')).toBe('DROP TABLE IF EXISTS "s"."events__perfcreep_probe"');
  });

  test('rejects a non-ISO bound (guards the only interpolated literal)', () => {
    expect(() => buildCreateProbePartition('s', 'p', 'c', "2099'); DROP TABLE x;--", '2099-01-08')).toThrow(/ISO timestamp/);
  });

  test('qid escapes embedded double-quotes', () => {
    expect(qid('a"b')).toBe('"a""b"');
  });
});

// ---------------------------------------------------------------------------
// parent_table splitting (physical schemas have dashes, never dots)
// ---------------------------------------------------------------------------
describe('splitParentTable', () => {
  test('splits on the last dot', () => {
    expect(splitParentTable('factory2-aaaa1111-app-private.events')).toEqual({
      schema: 'factory2-aaaa1111-app-private',
      table: 'events'
    });
  });

  test('returns null when there is no usable dot', () => {
    expect(splitParentTable('events')).toBeNull();
    expect(splitParentTable('.events')).toBeNull();
    expect(splitParentTable('schema.')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// partman LIKE-pattern building — escape LIKE metacharacters so a schema's
// underscore/percent cannot over-match a DIFFERENT tenant's parents
// ---------------------------------------------------------------------------
describe('escapeLikeLiteral', () => {
  test('escapes the three LIKE metacharacters (backslash, %, _)', () => {
    expect(escapeLikeLiteral('foo_bar')).toBe('foo\\_bar');
    expect(escapeLikeLiteral('a%b')).toBe('a\\%b');
    expect(escapeLikeLiteral('a\\b')).toBe('a\\\\b');
  });

  test('leaves dashes and dots untouched (not LIKE metacharacters)', () => {
    expect(escapeLikeLiteral('factory2-aaaa1111-app-private')).toBe('factory2-aaaa1111-app-private');
    expect(escapeLikeLiteral('a.b')).toBe('a.b');
  });
});

describe('buildPartConfigLikePatterns', () => {
  test('appends the intended .% table wildcard to each schema', () => {
    expect(buildPartConfigLikePatterns(['factory2-aaaa1111-app-private'])).toEqual([
      'factory2-aaaa1111-app-private.%'
    ]);
  });

  test('an underscore in a schema is escaped so it cannot match a foreign tenant', () => {
    // Unescaped, 'foo_bar.%' would ALSO match 'fooXbar.<table>' (a cross-tenant
    // over-match); escaped, only the literal 'foo_bar.<table>' can match.
    expect(buildPartConfigLikePatterns(['foo_bar'])).toEqual(['foo\\_bar.%']);
  });

  test('preserves order and escapes each schema independently', () => {
    expect(buildPartConfigLikePatterns(['a_b', 'c-d', 'e%f'])).toEqual(['a\\_b.%', 'c-d.%', 'e\\%f.%']);
  });

  test('the query it feeds still matches with LIKE ANY over $1', () => {
    expect(PART_CONFIG_FOR_TENANT_SQL).toContain('parent_table LIKE ANY($1)');
  });
});
