import { createHash } from 'crypto';

export function realtimeChannel(schema: string, table: string): string {
  const key = `${Buffer.byteLength(schema, 'utf8')}:${schema}${table}`;
  return `realtime:${createHash('md5').update(key, 'utf8').digest('hex')}`;
}
