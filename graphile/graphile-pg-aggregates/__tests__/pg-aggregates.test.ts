import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { getConnectionsObject, seed } from 'graphile-test';
import { join } from 'path';

import { PgAggregatesPreset } from '../src';

const SCHEMA = 'agg_test';
const sqlFile = (f: string) => join(__dirname, '../sql', f);

type QueryFn = GraphQLQueryFnObj;

// Enable orderBy + groupBy + filterBy on all columns so aggregates work on
// non-FK columns too (mirrors what production schemas have via indexes/behaviors).
const EnableAllBehaviorsPlugin: GraphileConfig.Plugin = {
  name: 'EnableAllBehaviorsPlugin',
  version: '1.0.0',
  schema: {
    entityBehavior: {
      pgCodecAttribute: {
        inferred: {
          after: ['postInferred'],
          provides: ['enableAllBehaviors'],
          callback(behavior: any) {
            return [behavior, 'orderBy', 'filterBy', 'attribute:groupBy'];
          },
        },
      },
    },
  },
};

const testPreset = {
  extends: [
    ConnectionFilterPreset(),
    PgAggregatesPreset
  ],
  plugins: [EnableAllBehaviorsPlugin],
  schema: {
    connectionFilterRelations: true,
  },
};

// ============================================================================
// BASIC AGGREGATES
// ============================================================================
describe('Basic aggregates', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('sum aggregates numeric columns', async () => {
    const result = await query<{ allPlayers: { aggregates: { sum: { goals: string } } } }>({
      query: `
        query {
          allPlayers {
            aggregates {
              sum {
                goals
              }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Total goals: 15+7+3+12+4+2+18+4+8+1 = 74
    expect(parseInt(result.data!.allPlayers.aggregates.sum.goals)).toBe(74);
  });

  it('average aggregates numeric columns', async () => {
    const result = await query<{ allPlayers: { aggregates: { average: { salary: string } } } }>({
      query: `
        query {
          allPlayers {
            aggregates {
              average {
                salary
              }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Average salary: (90000+75000+65000+85000+70000+60000+95000+68000+72000+55000) / 10 = 73500
    expect(parseFloat(result.data!.allPlayers.aggregates.average.salary)).toBeCloseTo(73500, 0);
  });

  it('min and max aggregate numeric columns', async () => {
    const result = await query<{
      allPlayers: {
        aggregates: {
          min: { goals: string };
          max: { goals: string };
        };
      };
    }>({
      query: `
        query {
          allPlayers {
            aggregates {
              min { goals }
              max { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(parseInt(result.data!.allPlayers.aggregates.min.goals)).toBe(1);
    expect(parseInt(result.data!.allPlayers.aggregates.max.goals)).toBe(18);
  });

  it('distinctCount aggregates', async () => {
    const result = await query<{
      allPlayers: {
        aggregates: {
          distinctCount: { position: string };
        };
      };
    }>({
      query: `
        query {
          allPlayers {
            aggregates {
              distinctCount { position }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // 3 distinct positions: Forward, Midfielder, Defender
    expect(parseInt(result.data!.allPlayers.aggregates.distinctCount.position)).toBe(3);
  });

  it('stddev and variance aggregates', async () => {
    const result = await query<{
      allPlayers: {
        aggregates: {
          stddevSample: { goals: string };
          varianceSample: { goals: string };
        };
      };
    }>({
      query: `
        query {
          allPlayers {
            aggregates {
              stddevSample { goals }
              varianceSample { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(parseFloat(result.data!.allPlayers.aggregates.stddevSample.goals)).toBeGreaterThan(0);
    expect(parseFloat(result.data!.allPlayers.aggregates.varianceSample.goals)).toBeGreaterThan(0);
  });

  it('aggregates coexist with nodes and totalCount', async () => {
    const result = await query<{
      allPlayers: {
        totalCount: number;
        nodes: { name: string }[];
        aggregates: { sum: { goals: string } };
      };
    }>({
      query: `
        query {
          allPlayers {
            totalCount
            nodes { name }
            aggregates {
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.allPlayers.totalCount).toBe(10);
    expect(result.data!.allPlayers.nodes).toHaveLength(10);
    expect(parseInt(result.data!.allPlayers.aggregates.sum.goals)).toBe(74);
  });
});

// ============================================================================
// GROUPED AGGREGATES (GROUP BY)
// ============================================================================
describe('Grouped aggregates (groupBy)', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('groups players by position with aggregates', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(groupBy: [POSITION]) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    expect(groups).toHaveLength(3); // Forward, Midfielder, Defender

    const forward = groups.find(g => g.keys[0] === 'Forward');
    expect(forward).toBeDefined();
    // Forwards: Alice(15) + Dave(12) + Grace(18) + Ivy(8) = 53
    expect(parseInt(forward!.sum.goals)).toBe(53);

    const defender = groups.find(g => g.keys[0] === 'Defender');
    expect(defender).toBeDefined();
    // Defenders: Carol(3) + Frank(2) + Jack(1) = 6
    expect(parseInt(defender!.sum.goals)).toBe(6);
  });

  it('groups players by team with sum of goals', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(groupBy: [TEAM_ID]) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    expect(groups).toHaveLength(4); // 4 teams

    // Sort by team_id key to get predictable order
    const sorted = [...groups].sort((a, b) => parseInt(a.keys[0]) - parseInt(b.keys[0]));
    // Team 1 (Red Hawks): 15+7+3 = 25
    expect(parseInt(sorted[0].sum.goals)).toBe(25);
    // Team 2 (Blue Jays): 12+4+2 = 18
    expect(parseInt(sorted[1].sum.goals)).toBe(18);
    // Team 3 (Green Lions): 18+4 = 22
    expect(parseInt(sorted[2].sum.goals)).toBe(22);
    // Team 4 (Gold Eagles): 8+1 = 9
    expect(parseInt(sorted[3].sum.goals)).toBe(9);
  });

  it('groups matches by season with attendance average', async () => {
    const result = await query<{
      allMatches: {
        groupedAggregates: {
          keys: string[];
          average: { attendance: string };
          sum: { homeScore: string };
        }[];
      };
    }>({
      query: `
        query {
          allMatches {
            groupedAggregates(groupBy: [SEASON]) {
              keys
              average { attendance }
              sum { homeScore }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allMatches.groupedAggregates;
    expect(groups).toHaveLength(2); // 2024 and 2025

    const season2024 = groups.find(g => g.keys[0] === '2024');
    expect(season2024).toBeDefined();
    // 2024 home scores: 3+2+1+4 = 10
    expect(parseInt(season2024!.sum.homeScore)).toBe(10);
  });
});

// ============================================================================
// HAVING (filter grouped aggregates)
// ============================================================================
describe('Having (filter grouped aggregates)', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('filters groups using having clause on sum', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(
              groupBy: [POSITION]
              having: { sum: { goals: { greaterThan: 10 } } }
            ) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    // Forward: 53 goals (> 10) ✓
    // Midfielder: 15 goals (> 10) ✓
    // Defender: 6 goals (not > 10) ✗
    expect(groups).toHaveLength(2);
    const positions = groups.map(g => g.keys[0]).sort();
    expect(positions).toEqual(['Forward', 'Midfielder']);
  });

  it('filters groups using having clause on average', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          average: { salary: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(
              groupBy: [POSITION]
              having: { average: { salary: { greaterThanOrEqualTo: "75000" } } }
            ) {
              keys
              average { salary }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    // Forward avg salary: (90000+85000+95000+72000)/4 = 85500 ✓
    // Midfielder avg salary: (75000+70000+68000)/3 = 71000 ✗
    // Defender avg salary: (65000+60000+55000)/3 = 60000 ✗
    expect(groups).toHaveLength(1);
    expect(groups[0].keys[0]).toBe('Forward');
  });
});

// ============================================================================
// RELATIONAL AGGREGATES (orderBy + filter)
// ============================================================================
describe('Relational aggregates', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('orders teams by sum of player goals (ascending)', async () => {
    const result = await query<{
      allTeams: {
        nodes: {
          name: string;
          playersByTeamId: { aggregates: { sum: { goals: string } } };
        }[];
      };
    }>({
      query: `
        query {
          allTeams(orderBy: PLAYERS_BY_TEAM_ID_SUM_GOALS_ASC) {
            nodes {
              name
              playersByTeamId {
                aggregates {
                  sum { goals }
                }
              }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const teams = result.data!.allTeams.nodes;
    expect(teams).toHaveLength(4);
    // Gold Eagles: 9, Blue Jays: 18, Green Lions: 22, Red Hawks: 25
    expect(teams[0].name).toBe('Gold Eagles');
    expect(teams[3].name).toBe('Red Hawks');
  });

  it('orders teams by average player salary (descending)', async () => {
    const result = await query<{
      allTeams: {
        nodes: {
          name: string;
          playersByTeamId: { aggregates: { average: { salary: string } } };
        }[];
      };
    }>({
      query: `
        query {
          allTeams(orderBy: PLAYERS_BY_TEAM_ID_AVERAGE_SALARY_DESC) {
            nodes {
              name
              playersByTeamId {
                aggregates {
                  average { salary }
                }
              }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const teams = result.data!.allTeams.nodes;
    expect(teams).toHaveLength(4);
    // Green Lions avg: (95000+68000)/2 = 81500
    // Red Hawks avg: (90000+75000+65000)/3 = 76666.67
    // Blue Jays avg: (85000+70000+60000)/3 = 71666.67
    // Gold Eagles avg: (72000+55000)/2 = 63500
    expect(teams[0].name).toBe('Green Lions');
    expect(teams[3].name).toBe('Gold Eagles');
  });

  it('filters teams by aggregate on child relation (sum goals > 20)', async () => {
    const result = await query<{
      allTeams: {
        nodes: {
          name: string;
        }[];
      };
    }>({
      query: `
        query {
          allTeams(
            where: {
              playersByTeamId: {
                aggregates: {
                  sum: {
                    goals: { greaterThan: "20" }
                  }
                }
              }
            }
          ) {
            nodes { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const names = result.data!.allTeams.nodes.map(n => n.name).sort();
    // Red Hawks: 25 ✓, Green Lions: 22 ✓, Blue Jays: 18 ✗, Gold Eagles: 9 ✗
    expect(names).toEqual(['Green Lions', 'Red Hawks']);
  });

  it('filters teams by aggregate on child relation (average salary >= 75000)', async () => {
    const result = await query<{
      allTeams: {
        nodes: {
          name: string;
        }[];
      };
    }>({
      query: `
        query {
          allTeams(
            where: {
              playersByTeamId: {
                aggregates: {
                  average: {
                    salary: { greaterThanOrEqualTo: "75000" }
                  }
                }
              }
            }
          ) {
            nodes { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const names = result.data!.allTeams.nodes.map(n => n.name).sort();
    // Green Lions: 81500 ✓, Red Hawks: 76666.67 ✓
    expect(names).toEqual(['Green Lions', 'Red Hawks']);
  });
});

// ============================================================================
// SCHEMA INTROSPECTION
// ============================================================================
describe('Schema introspection', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('connection type has aggregates field', async () => {
    const result = await query<{ __type: { fields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "PlayerConnection") {
            fields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type!.fields.map(f => f.name);
    expect(fieldNames).toContain('aggregates');
    expect(fieldNames).toContain('groupedAggregates');
    expect(fieldNames).toContain('nodes');
    expect(fieldNames).toContain('totalCount');
  });

  it('aggregates type has all standard aggregate fields', async () => {
    const result = await query<{ __type: { fields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "PlayerAggregates") {
            fields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type!.fields.map(f => f.name);
    expect(fieldNames).toContain('sum');
    expect(fieldNames).toContain('distinctCount');
    expect(fieldNames).toContain('min');
    expect(fieldNames).toContain('max');
    expect(fieldNames).toContain('average');
    expect(fieldNames).toContain('stddevSample');
    expect(fieldNames).toContain('stddevPopulation');
    expect(fieldNames).toContain('varianceSample');
    expect(fieldNames).toContain('variancePopulation');
    expect(fieldNames).toContain('keys');
  });

  it('GroupBy enum has attribute-based values', async () => {
    const result = await query<{ __type: { enumValues: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "PlayerGroupBy") {
            enumValues { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const enumNames = result.data!.__type!.enumValues.map(e => e.name);
    expect(enumNames).toContain('TEAM_ID');
    expect(enumNames).toContain('POSITION');
  });

  it('Having input type exists with aggregate fields', async () => {
    const result = await query<{ __type: { inputFields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "PlayerHavingInput") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type!.inputFields.map(f => f.name);
    expect(fieldNames).toContain('sum');
    expect(fieldNames).toContain('average');
    expect(fieldNames).toContain('min');
    expect(fieldNames).toContain('max');
  });

  it('orderBy enum has relational aggregate entries', async () => {
    const result = await query<{ __type: { enumValues: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "TeamOrderBy") {
            enumValues { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const enumNames = result.data!.__type!.enumValues.map(e => e.name);
    expect(enumNames).toContain('PLAYERS_BY_TEAM_ID_SUM_GOALS_ASC');
    expect(enumNames).toContain('PLAYERS_BY_TEAM_ID_SUM_GOALS_DESC');
    expect(enumNames).toContain('PLAYERS_BY_TEAM_ID_AVERAGE_SALARY_ASC');
    expect(enumNames).toContain('PLAYERS_BY_TEAM_ID_AVERAGE_SALARY_DESC');
  });

  it('MatchConnection has aggregates for numeric columns', async () => {
    const result = await query<{ __type: { fields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "MatchAggregates") {
            fields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type!.fields.map(f => f.name);
    expect(fieldNames).toContain('sum');
    expect(fieldNames).toContain('average');
    expect(fieldNames).toContain('min');
    expect(fieldNames).toContain('max');
  });

  it('HavingInput has stddev and variance fields', async () => {
    const result = await query<{ __type: { inputFields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "PlayerHavingInput") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data!.__type!.inputFields.map(f => f.name);
    expect(fieldNames).toContain('stddevSample');
    expect(fieldNames).toContain('stddevPopulation');
    expect(fieldNames).toContain('varianceSample');
    expect(fieldNames).toContain('variancePopulation');
    expect(fieldNames).toContain('distinctCount');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================
describe('Edge cases', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('aggregates handle NULL values correctly (rating column)', async () => {
    // Frank has NULL rating — aggregates should skip NULLs
    const result = await query<{
      allPlayers: {
        aggregates: {
          sum: { rating: string };
          average: { rating: string };
          distinctCount: { rating: string };
        };
      };
    }>({
      query: `
        query {
          allPlayers {
            aggregates {
              sum { rating }
              average { rating }
              distinctCount { rating }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // 9 non-null ratings: 4.5+3.8+4.1+4.2+3.9+4.8+3.5+4.0+3.2 = 36.0
    // Frank has NULL rating so only 9 values
    const sum = parseFloat(result.data!.allPlayers.aggregates.sum.rating);
    expect(sum).toBeCloseTo(36.0, 1);
    const avg = parseFloat(result.data!.allPlayers.aggregates.average.rating);
    expect(avg).toBeCloseTo(4.0, 1);
    // distinctCount should count distinct non-null ratings
    expect(parseInt(result.data!.allPlayers.aggregates.distinctCount.rating)).toBeGreaterThan(0);
  });

  it('aggregates with NULL attendance in matches', async () => {
    // Match 8 has NULL attendance — sum/average should skip it
    const result = await query<{
      allMatches: {
        aggregates: {
          sum: { attendance: string };
          average: { attendance: string };
          min: { attendance: string };
          max: { attendance: string };
        };
      };
    }>({
      query: `
        query {
          allMatches {
            aggregates {
              sum { attendance }
              average { attendance }
              min { attendance }
              max { attendance }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // 7 non-null attendances: 15000+12000+18000+11000+16000+13000+14000 = 99000
    expect(parseInt(result.data!.allMatches.aggregates.sum.attendance)).toBe(99000);
    expect(parseFloat(result.data!.allMatches.aggregates.average.attendance)).toBeCloseTo(99000 / 7, 0);
    expect(parseInt(result.data!.allMatches.aggregates.min.attendance)).toBe(11000);
    expect(parseInt(result.data!.allMatches.aggregates.max.attendance)).toBe(18000);
  });

  it('aggregates coexist with pagination (first/offset)', async () => {
    const result = await query<{
      allPlayers: {
        totalCount: number;
        nodes: { name: string }[];
        aggregates: { sum: { goals: string } };
      };
    }>({
      query: `
        query {
          allPlayers(first: 3) {
            totalCount
            nodes { name }
            aggregates {
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Pagination limits nodes but aggregates reflect the full unpaginated set
    expect(result.data!.allPlayers.nodes).toHaveLength(3);
    // Aggregates should be over ALL rows, not just the page
    expect(parseInt(result.data!.allPlayers.aggregates.sum.goals)).toBe(74);
  });

  it('aggregates with offset pagination', async () => {
    const result = await query<{
      allPlayers: {
        nodes: { name: string }[];
        aggregates: { sum: { goals: string } };
      };
    }>({
      query: `
        query {
          allPlayers(first: 2, offset: 5) {
            nodes { name }
            aggregates {
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.allPlayers.nodes).toHaveLength(2);
    // Aggregates should still be over ALL rows
    expect(parseInt(result.data!.allPlayers.aggregates.sum.goals)).toBe(74);
  });

  it('multiple aggregate functions in a single query', async () => {
    const result = await query<{
      allPlayers: {
        aggregates: {
          sum: { goals: string; assists: string; salary: string };
          average: { goals: string; assists: string };
          min: { salary: string };
          max: { salary: string };
          distinctCount: { position: string; teamId: string };
          stddevSample: { goals: string };
          variancePopulation: { salary: string };
        };
      };
    }>({
      query: `
        query {
          allPlayers {
            aggregates {
              sum { goals assists salary }
              average { goals assists }
              min { salary }
              max { salary }
              distinctCount { position teamId }
              stddevSample { goals }
              variancePopulation { salary }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const agg = result.data!.allPlayers.aggregates;
    expect(parseInt(agg.sum.goals)).toBe(74);
    expect(parseInt(agg.sum.assists)).toBe(74); // 8+12+5+6+15+3+10+9+4+2 = 74
    expect(parseFloat(agg.average.goals)).toBeCloseTo(7.4, 1);
    expect(parseFloat(agg.min.salary)).toBe(55000);
    expect(parseFloat(agg.max.salary)).toBe(95000);
    expect(parseInt(agg.distinctCount.position)).toBe(3);
    expect(parseInt(agg.distinctCount.teamId)).toBe(4);
    expect(parseFloat(agg.stddevSample.goals)).toBeGreaterThan(0);
    expect(parseFloat(agg.variancePopulation.salary)).toBeGreaterThan(0);
  });

  it('groupedAggregates returns empty array when having filters out all groups', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(
              groupBy: [POSITION]
              having: { sum: { goals: { greaterThan: 1000 } } }
            ) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.allPlayers.groupedAggregates).toHaveLength(0);
  });

  it('orderBy aggregate with first returns correct top-N', async () => {
    const result = await query<{
      allTeams: {
        nodes: {
          name: string;
          playersByTeamId: { aggregates: { sum: { goals: string } } };
        }[];
      };
    }>({
      query: `
        query {
          allTeams(
            orderBy: PLAYERS_BY_TEAM_ID_SUM_GOALS_DESC
            first: 2
          ) {
            nodes {
              name
              playersByTeamId {
                aggregates { sum { goals } }
              }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const teams = result.data!.allTeams.nodes;
    expect(teams).toHaveLength(2);
    // Top 2 by goals: Red Hawks (25), Green Lions (22)
    expect(teams[0].name).toBe('Red Hawks');
    expect(teams[1].name).toBe('Green Lions');
  });
});

// ============================================================================
// AGGREGATES WITH WHERE PRE-FILTER
// ============================================================================
describe('Aggregates with where pre-filter', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('aggregates only over filtered rows', async () => {
    // Filter to Forwards only, then aggregate
    const result = await query<{
      allPlayers: {
        totalCount: number;
        aggregates: { sum: { goals: string }; average: { salary: string } };
      };
    }>({
      query: `
        query {
          allPlayers(where: { position: { equalTo: "Forward" } }) {
            totalCount
            aggregates {
              sum { goals }
              average { salary }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.allPlayers.totalCount).toBe(4);
    // Forwards: Alice(15) + Dave(12) + Grace(18) + Ivy(8) = 53
    expect(parseInt(result.data!.allPlayers.aggregates.sum.goals)).toBe(53);
    // Forwards avg salary: (90000+85000+95000+72000)/4 = 85500
    expect(parseFloat(result.data!.allPlayers.aggregates.average.salary)).toBeCloseTo(85500, 0);
  });

  it('groupedAggregates with where pre-filter narrows the groups', async () => {
    // Filter to team 1 and 2 only, then group by position
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers(
            where: {
              or: [
                { teamId: { equalTo: 1 } }
                { teamId: { equalTo: 2 } }
              ]
            }
          ) {
            groupedAggregates(groupBy: [POSITION]) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    // Teams 1+2 have: Alice(F,15), Bob(M,7), Carol(D,3), Dave(F,12), Eve(M,4), Frank(D,2)
    expect(groups).toHaveLength(3);
    const forward = groups.find(g => g.keys[0] === 'Forward');
    // Only Alice(15) + Dave(12) = 27 (not Grace or Ivy)
    expect(parseInt(forward!.sum.goals)).toBe(27);
  });

  it('aggregates on matches filtered by season', async () => {
    const result = await query<{
      allMatches: {
        totalCount: number;
        aggregates: {
          sum: { homeScore: string; awayScore: string };
          average: { attendance: string };
        };
      };
    }>({
      query: `
        query {
          allMatches(where: { season: { equalTo: "2024" } }) {
            totalCount
            aggregates {
              sum { homeScore awayScore }
              average { attendance }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data!.allMatches.totalCount).toBe(4);
    // 2024 home scores: 3+2+1+4 = 10
    expect(parseInt(result.data!.allMatches.aggregates.sum.homeScore)).toBe(10);
    // 2024 away scores: 1+2+0+1 = 4
    expect(parseInt(result.data!.allMatches.aggregates.sum.awayScore)).toBe(4);
    // 2024 attendances: 15000+12000+18000+11000 = 56000, avg = 14000
    expect(parseFloat(result.data!.allMatches.aggregates.average.attendance)).toBeCloseTo(14000, 0);
  });
});

// ============================================================================
// MULTI-KEY GROUP BY
// ============================================================================
describe('Multi-key groupBy', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('groups by two keys (team + position)', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(groupBy: [TEAM_ID, POSITION]) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    // Each team-position combo: (1,F),(1,M),(1,D),(2,F),(2,M),(2,D),(3,F),(3,M),(4,F),(4,D)
    expect(groups.length).toBe(10);

    // Find team 1, Forward — should be just Alice (15 goals)
    const team1Forward = groups.find(g => g.keys[0] === '1' && g.keys[1] === 'Forward');
    expect(team1Forward).toBeDefined();
    expect(parseInt(team1Forward!.sum.goals)).toBe(15);
  });

  it('multi-key groupBy with having filters correctly', async () => {
    const result = await query<{
      allPlayers: {
        groupedAggregates: {
          keys: string[];
          sum: { goals: string };
        }[];
      };
    }>({
      query: `
        query {
          allPlayers {
            groupedAggregates(
              groupBy: [TEAM_ID, POSITION]
              having: { sum: { goals: { greaterThan: 10 } } }
            ) {
              keys
              sum { goals }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const groups = result.data!.allPlayers.groupedAggregates;
    // Only (1,Forward)=15, (2,Forward)=12, (3,Forward)=18 have sum > 10
    expect(groups).toHaveLength(3);
    groups.forEach(g => {
      expect(parseInt(g.sum.goals)).toBeGreaterThan(10);
    });
  });
});

// ============================================================================
// BEHAVIOR OPT-OUT (disable aggregates via smart tags)
// ============================================================================
describe('Behavior opt-out', () => {
  it('disabling aggregates behavior hides aggregates field', async () => {
    const DisableAggregatesPlugin: GraphileConfig.Plugin = {
      name: 'DisableAggregatesPlugin',
      version: '1.0.0',
      schema: {
        entityBehavior: {
          pgResource: {
            inferred: {
              after: ['postInferred'],
              provides: ['disableAggregates'],
              callback(behavior: any, resource: any) {
                if (resource.name === 'players') {
                  return [behavior, '-resource:aggregates'];
                }
                return behavior;
              },
            },
          },
        },
      },
    };

    const noAggPreset = {
      extends: [
        ConnectionFilterPreset(),
        PgAggregatesPreset
      ],
      plugins: [EnableAllBehaviorsPlugin, DisableAggregatesPlugin],
      schema: {
        connectionFilterRelations: true,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: noAggPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      // PlayerConnection should NOT have aggregates
      const playerResult = await connections.query<{ __type: { fields: { name: string }[] } | null }>({
        query: `
          query {
            __type(name: "PlayerConnection") {
              fields { name }
            }
          }
        `,
      });
      expect(playerResult.errors).toBeUndefined();
      const playerFields = playerResult.data!.__type!.fields.map(f => f.name);
      expect(playerFields).not.toContain('aggregates');
      expect(playerFields).not.toContain('groupedAggregates');

      // TeamConnection should still have aggregates (not disabled)
      const teamResult = await connections.query<{ __type: { fields: { name: string }[] } | null }>({
        query: `
          query {
            __type(name: "TeamConnection") {
              fields { name }
            }
          }
        `,
      });
      expect(teamResult.errors).toBeUndefined();
      const teamFields = teamResult.data!.__type!.fields.map(f => f.name);
      expect(teamFields).toContain('aggregates');
      expect(teamFields).toContain('groupedAggregates');
    } finally {
      await connections.teardown();
    }
  });
});
