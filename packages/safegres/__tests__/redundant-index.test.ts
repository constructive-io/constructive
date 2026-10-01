import { checkRedundantIndexes } from '../src/checks/indexes';
import type { IndexInfo, TableIndexSnapshot } from '../src/pg/indexes';

function index(name: string, columns: number[], over: Partial<IndexInfo> = {}): IndexInfo {
  return {
    name,
    columns,
    columnNames: columns.map(String),
    unique: false,
    primary: false,
    constraint: false,
    partial: false,
    expression: false,
    method: 'btree',
    definition: `CREATE INDEX ${name} ON t USING btree (...)`,
    attached: false,
    ...over
  };
}

function table(over: Partial<TableIndexSnapshot> = {}): TableIndexSnapshot {
  return {
    schema: 'app_public',
    name: 'events',
    oid: 1,
    isPartition: false,
    replicaIdentity: 'd',
    hasPrimaryKey: true,
    estimatedRows: 0,
    columns: [],
    indexes: [],
    foreignKeys: [],
    ...over
  };
}

function x5(t: TableIndexSnapshot): Array<{ index: string; coveredBy: string }> {
  return checkRedundantIndexes(t).map((f) => f.context as { index: string; coveredBy: string });
}

const pkey = { primary: true, unique: true, constraint: true };

describe('X5 — partitioned tables', () => {
  it('reports a prefix index on the partitioned parent', () => {
    const parent = table({
      indexes: [
        index('events_actor_id_idx', [2]),
        index('events_actor_id_name_idx', [2, 3]),
        index('events_captured_at_idx', [4]),
        index('events_pkey', [4, 1], pkey)
      ]
    });
    expect(x5(parent)).toEqual([
      expect.objectContaining({ index: 'events_actor_id_idx', coveredBy: 'events_actor_id_name_idx' }),
      expect.objectContaining({ index: 'events_captured_at_idx', coveredBy: 'events_pkey' })
    ]);
  });

  it('skips the same finding on a partition whose indexes are attached to the parent\'s', () => {
    const child = table({
      name: 'events_p20261201',
      isPartition: true,
      indexes: [
        index('events_p20261201_actor_id_idx', [2], { attached: true }),
        index('events_p20261201_actor_id_name_idx', [2, 3], { attached: true }),
        index('events_p20261201_captured_at_idx', [4], { attached: true }),
        index('events_p20261201_pkey', [4, 1], { ...pkey, attached: true })
      ]
    });
    expect(x5(child)).toEqual([]);
  });

  it('reports an index created on the partition alone', () => {
    const child = table({
      name: 'events_p20261201',
      isPartition: true,
      indexes: [
        index('events_p20261201_actor_id_name_idx', [2, 3], { attached: true }),
        index('events_p20261201_actor_local_idx', [2])
      ]
    });
    expect(x5(child)).toEqual([
      expect.objectContaining({
        index: 'events_p20261201_actor_local_idx',
        coveredBy: 'events_p20261201_actor_id_name_idx'
      })
    ]);
  });

  it('reports a partition-local exact duplicate of an attached index, whichever name sorts first', () => {
    const child = table({
      name: 'events_p20261201',
      isPartition: true,
      indexes: [
        index('events_p20261201_a_local_idx', [2, 3]),
        index('events_p20261201_actor_id_name_idx', [2, 3], { attached: true })
      ]
    });
    expect(x5(child)).toEqual([
      expect.objectContaining({
        index: 'events_p20261201_a_local_idx',
        coveredBy: 'events_p20261201_actor_id_name_idx',
        duplicate: true
      })
    ]);
  });

  it('still reports one of a pair of exact duplicates on an ordinary table', () => {
    const t = table({
      indexes: [index('events_a_idx', [2, 3]), index('events_b_idx', [2, 3])]
    });
    expect(x5(t)).toEqual([
      expect.objectContaining({ index: 'events_b_idx', coveredBy: 'events_a_idx' })
    ]);
  });
});
