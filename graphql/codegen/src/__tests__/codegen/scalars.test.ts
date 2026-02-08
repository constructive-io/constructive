/**
 * Tests for scalar mappings
 */
import {
  BASE_FILTER_TYPE_NAMES,
  SCALAR_FILTER_MAP,
  SCALAR_NAMES,
  SCALAR_TS_MAP,
  scalarToFilterType,
  scalarToTsType,
} from '../../core/codegen/scalars';

describe('scalars', () => {
  describe('SCALAR_TS_MAP', () => {
    it('maps standard GraphQL scalars', () => {
      expect(SCALAR_TS_MAP.String).toBe('string');
      expect(SCALAR_TS_MAP.Int).toBe('number');
      expect(SCALAR_TS_MAP.Float).toBe('number');
      expect(SCALAR_TS_MAP.Boolean).toBe('boolean');
      expect(SCALAR_TS_MAP.ID).toBe('string');
    });

    it('maps PostGraphile scalars', () => {
      expect(SCALAR_TS_MAP.UUID).toBe('string');
      expect(SCALAR_TS_MAP.Datetime).toBe('string');
      expect(SCALAR_TS_MAP.JSON).toBe('unknown');
      expect(SCALAR_TS_MAP.BigInt).toBe('string');
    });

    it('maps PostgreSQL-specific types', () => {
      expect(SCALAR_TS_MAP.Inet).toBe('string');
      expect(SCALAR_TS_MAP.TsVector).toBe('string');
    });
  });

  describe('SCALAR_FILTER_MAP', () => {
    it('maps scalars to filter types', () => {
      expect(SCALAR_FILTER_MAP.String).toBe('StringFilter');
      expect(SCALAR_FILTER_MAP.Int).toBe('IntFilter');
      expect(SCALAR_FILTER_MAP.UUID).toBe('UUIDFilter');
      expect(SCALAR_FILTER_MAP.Datetime).toBe('DatetimeFilter');
    });

    it('maps ID to UUIDFilter', () => {
      expect(SCALAR_FILTER_MAP.ID).toBe('UUIDFilter');
    });
  });

  describe('SCALAR_NAMES', () => {
    it('contains all scalar names from SCALAR_TS_MAP', () => {
      expect(SCALAR_NAMES.has('String')).toBe(true);
      expect(SCALAR_NAMES.has('UUID')).toBe(true);
      expect(SCALAR_NAMES.has('Upload')).toBe(true);
      expect(SCALAR_NAMES.has('NotAScalar')).toBe(false);
    });
  });

  describe('BASE_FILTER_TYPE_NAMES', () => {
    it('includes scalar filter types', () => {
      expect(BASE_FILTER_TYPE_NAMES.has('StringFilter')).toBe(true);
      expect(BASE_FILTER_TYPE_NAMES.has('IntFilter')).toBe(true);
      expect(BASE_FILTER_TYPE_NAMES.has('UUIDFilter')).toBe(true);
    });

    it('includes list filter types', () => {
      expect(BASE_FILTER_TYPE_NAMES.has('StringListFilter')).toBe(true);
      expect(BASE_FILTER_TYPE_NAMES.has('IntListFilter')).toBe(true);
      expect(BASE_FILTER_TYPE_NAMES.has('UUIDListFilter')).toBe(true);
    });
  });

  describe('scalarToTsType', () => {
    it('returns mapped TypeScript type for known scalars', () => {
      expect(scalarToTsType('String')).toBe('string');
      expect(scalarToTsType('UUID')).toBe('string');
      expect(scalarToTsType('JSON')).toBe('unknown');
    });

    it('returns scalar name for unknown scalars by default', () => {
      expect(scalarToTsType('CustomScalar')).toBe('CustomScalar');
    });

    it('returns unknown for unknown scalars when option set', () => {
      expect(scalarToTsType('CustomScalar', { unknownScalar: 'unknown' })).toBe(
        'unknown',
      );
    });

    it('uses overrides when provided', () => {
      expect(scalarToTsType('JSON', { overrides: { JSON: 'JsonValue' } })).toBe(
        'JsonValue',
      );
    });
  });

  describe('scalarToFilterType', () => {
    it('returns filter type for known scalars', () => {
      expect(scalarToFilterType('String')).toBe('StringFilter');
      expect(scalarToFilterType('Int')).toBe('IntFilter');
      expect(scalarToFilterType('UUID')).toBe('UUIDFilter');
    });

    it('returns null for unknown scalars', () => {
      expect(scalarToFilterType('CustomScalar')).toBeNull();
    });

    it('returns list filter for array types', () => {
      expect(scalarToFilterType('String', true)).toBe('StringListFilter');
      expect(scalarToFilterType('Int', true)).toBe('IntListFilter');
      expect(scalarToFilterType('UUID', true)).toBe('UUIDListFilter');
    });

    it('returns null for array of non-list-filterable scalar', () => {
      expect(scalarToFilterType('Datetime', true)).toBeNull();
    });

    it('treats ID as UUID for filtering', () => {
      expect(scalarToFilterType('ID')).toBe('UUIDFilter');
      expect(scalarToFilterType('ID', true)).toBe('UUIDListFilter');
    });
  });
});
