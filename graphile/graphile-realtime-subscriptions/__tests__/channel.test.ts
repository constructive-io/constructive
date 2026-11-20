import { realtimeChannel } from '../src/channel';

it.each([
  ['app_public', 'projects', '82e4cc86e360dca4f9342e08ca91489d'],
  ['inventory_public', 'items', 'e66af24f0e368ab1c28a95c1cd4fd830'],
  ['schemä.測', 'table.名', '6e2395ccd5e544e252ecbf660f313099'],
  ['', '', '9a1c7ee2c7ce38d4bbbaf29ab9f2ac1e']
])('encodes %j and %j identically to the SQL emitter', (schema, table, hash) => {
  expect(realtimeChannel(schema, table)).toBe(`realtime:${hash}`);
});

it('bounds the channel even for maximum-size identifiers', () => {
  const schema = 's'.repeat(63);
  const table = 't'.repeat(63);
  expect(Buffer.byteLength(realtimeChannel(schema, table))).toBe(41);
  expect(realtimeChannel(schema, table)).toBe(realtimeChannel(schema, table));
});

it('keeps qualified names with ambiguous delimiters distinct', () => {
  expect(realtimeChannel('a.b', 'c')).toBe('realtime:a5507cd532dbd2308bb9ab5b425ff691');
  expect(realtimeChannel('a', 'b.c')).toBe('realtime:46e0a8e356179c0a3e4ed16727af894e');
});
