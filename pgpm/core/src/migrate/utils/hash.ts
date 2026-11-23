import { hashString } from '@pgpmjs/ast';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { parse } from 'pgsql-parser';

import { cleanTree } from '../../packaging/package';

// Re-exported from @pgpmjs/ast so existing `@pgpmjs/core` consumers keep importing it here.
export { hashString };

/**
 * Generate SHA256 hash of a file's contents
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

/**
 * libpg-query parse-result versions that AST hashes included before
 * `hashSqlFile` stopped hashing the parser `version`. Ledger rows recorded
 * under `DEPLOYMENT_HASH_METHOD=ast` by those releases carry these hashes.
 */
export const LEGACY_AST_HASH_PARSER_VERSIONS: readonly number[] = [180004, 180006];

const parseForHash = async (filePath: string): Promise<Record<string, unknown>> => {
  const content = await readFile(filePath, 'utf-8');
  const { version: _version, ...parsed } = await parse(content);
  return parsed;
};

const hashAst = (tree: Record<string, unknown>): string =>
  hashString(JSON.stringify(cleanTree(tree)));

/**
 * Generate SHA256 hash of a SQL file's parsed AST, excluding parser metadata
 */
export async function hashSqlFile(filePath: string): Promise<string> {
  return hashAst(await parseForHash(filePath));
}

/**
 * Every AST hash a ledger may hold for this SQL file: the current
 * {@link hashSqlFile} value first, then the hashes older releases recorded
 * with the parser version included ({@link LEGACY_AST_HASH_PARSER_VERSIONS}).
 */
export async function hashSqlFileCandidates(filePath: string): Promise<string[]> {
  const parsed = await parseForHash(filePath);
  return [
    hashAst(parsed),
    ...LEGACY_AST_HASH_PARSER_VERSIONS.map(version => hashAst({ version, ...parsed }))
  ];
}
