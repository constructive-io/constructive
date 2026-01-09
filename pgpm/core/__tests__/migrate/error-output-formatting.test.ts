import { formatQueryHistory, truncateErrorOutput, QueryHistoryEntry } from '../../src/migrate/utils/transaction';

describe('error output formatting', () => {
  describe('formatQueryHistory', () => {
    it('formats a single query correctly', () => {
      const history: QueryHistoryEntry[] = [
        { query: 'SELECT 1', params: [], timestamp: Date.now(), duration: 10 }
      ];
      
      const result = formatQueryHistory(history);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('1. SELECT 1');
      expect(result[0]).toContain('(10ms)');
    });

    it('collapses consecutive identical queries', () => {
      const history: QueryHistoryEntry[] = [
        { query: 'BEGIN', params: [], timestamp: Date.now() },
        { query: 'CALL pgpm_migrate.deploy($1, $2)', params: ['pkg', 'change1'], timestamp: Date.now() },
        { query: 'CALL pgpm_migrate.deploy($1, $2)', params: ['pkg', 'change2'], timestamp: Date.now() },
        { query: 'CALL pgpm_migrate.deploy($1, $2)', params: ['pkg', 'change3'], timestamp: Date.now() },
        { query: 'ROLLBACK', params: [], timestamp: Date.now() }
      ];
      
      const result = formatQueryHistory(history);
      
      // Should have: BEGIN, collapsed deploy calls, ROLLBACK
      expect(result.length).toBeLessThan(5);
      
      // Should show the collapsed range
      const collapsedLine = result.find(line => line.includes('(3 calls)'));
      expect(collapsedLine).toBeDefined();
      expect(collapsedLine).toContain('2-4');
    });

    it('shows first and last change names for pgpm_migrate.deploy', () => {
      const history: QueryHistoryEntry[] = [
        { query: 'CALL pgpm_migrate.deploy($1, $2)', params: ['pkg', 'schemas/first/table'], timestamp: Date.now() },
        { query: 'CALL pgpm_migrate.deploy($1, $2)', params: ['pkg', 'schemas/middle/table'], timestamp: Date.now() },
        { query: 'CALL pgpm_migrate.deploy($1, $2)', params: ['pkg', 'schemas/last/table'], timestamp: Date.now() }
      ];
      
      const result = formatQueryHistory(history);
      const resultText = result.join('\n');
      
      expect(resultText).toContain('First: schemas/first/table');
      expect(resultText).toContain('Last:  schemas/last/table');
    });

    it('does not collapse non-consecutive identical queries', () => {
      const history: QueryHistoryEntry[] = [
        { query: 'SELECT 1', params: [], timestamp: Date.now() },
        { query: 'SELECT 2', params: [], timestamp: Date.now() },
        { query: 'SELECT 1', params: [], timestamp: Date.now() }
      ];
      
      const result = formatQueryHistory(history);
      
      // Each query should be separate since they're not consecutive
      expect(result).toHaveLength(3);
    });

    it('limits query history to configured limit', () => {
      // Create 100 queries
      const history: QueryHistoryEntry[] = [];
      for (let i = 0; i < 100; i++) {
        history.push({ query: `SELECT ${i}`, params: [], timestamp: Date.now() });
      }
      
      const result = formatQueryHistory(history);
      
      // Should be limited (default is 30) plus the "omitted" message
      expect(result.length).toBeLessThanOrEqual(32);
      
      // Should have omitted message
      const omittedLine = result.find(line => line.includes('earlier queries omitted'));
      expect(omittedLine).toBeDefined();
    });

    it('returns empty array for empty history', () => {
      const result = formatQueryHistory([]);
      expect(result).toEqual([]);
    });
  });

  describe('truncateErrorOutput', () => {
    it('does not truncate short output', () => {
      const lines = ['Line 1', 'Line 2', 'Line 3'];
      const result = truncateErrorOutput(lines);
      expect(result).toEqual(lines);
    });

    it('truncates very long output', () => {
      // Create output that exceeds 10000 chars
      const lines: string[] = [];
      for (let i = 0; i < 500; i++) {
        lines.push(`This is a very long line number ${i} with lots of text to make it longer and exceed the limit`);
      }
      
      const result = truncateErrorOutput(lines);
      const resultText = result.join('\n');
      
      // Should be truncated
      expect(resultText.length).toBeLessThan(lines.join('\n').length);
      
      // Should have truncation notice
      expect(result.some(line => line.includes('output truncated'))).toBe(true);
      expect(result.some(line => line.includes('PGPM_ERROR_VERBOSE'))).toBe(true);
    });
  });

  describe('integration: large deploy scenario', () => {
    it('handles realistic large deployment error output', () => {
      // Simulate a realistic scenario with many pgpm_migrate.deploy calls
      const history: QueryHistoryEntry[] = [
        { query: 'BEGIN', params: [], timestamp: Date.now() }
      ];
      
      // Add 100 deploy calls
      for (let i = 0; i < 100; i++) {
        history.push({
          query: 'CALL pgpm_migrate.deploy($1::TEXT, $2::TEXT, $3::TEXT, $4::TEXT[], $5::TEXT, $6::BOOLEAN)',
          params: ['constructive', `schemas/table_${i}/table`, 'hash123', null, 'CREATE TABLE...', false],
          timestamp: Date.now(),
          duration: 5
        });
      }
      
      history.push({ query: 'ROLLBACK', params: [], timestamp: Date.now(), duration: 10 });
      
      const result = formatQueryHistory(history);
      const resultText = result.join('\n');
      
      // Should be much shorter than 102 lines
      expect(result.length).toBeLessThan(20);
      
      // Should show collapsed deploy calls
      expect(resultText).toContain('calls)');
      
      // Should show first and last change names
      expect(resultText).toContain('First:');
      expect(resultText).toContain('Last:');
      
      // Should show BEGIN and ROLLBACK
      expect(resultText).toContain('BEGIN');
      expect(resultText).toContain('ROLLBACK');
    });
  });
});
