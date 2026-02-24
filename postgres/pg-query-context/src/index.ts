import { ClientBase, Pool, PoolClient, QueryResult } from 'pg';

function setContext(ctx: Record<string, string>): { query: string; values: string[] }[] {
  return Object.keys(ctx || {}).reduce<{ query: string; values: string[] }[]>((m, el) => {
    m.push({ query: 'SELECT set_config($1, $2, true)', values: [el, ctx[el]] });
    return m;
  }, []);
}

async function execContext(client: ClientBase, ctx: Record<string, string>): Promise<void> {
  const local = setContext(ctx);
  for (const { query, values } of local) {
    await client.query(query, values);
  }
}

interface ExecOptions {
  client: Pool | ClientBase;
  context?: Record<string, string>;
  query: string;
  variables?: any[];
  skipTransaction?: boolean;
}

export default async ({ client, context = {}, query = '', variables = [], skipTransaction = false }: ExecOptions): Promise<QueryResult> => {
  const isPool = 'connect' in client;
  const shouldRelease = isPool;
  let pgClient: ClientBase | PoolClient | null = null;

  try {
    pgClient = isPool ? await (client as Pool).connect() : client as ClientBase;

    if (!skipTransaction) {
      await pgClient.query('BEGIN');
    }
    await execContext(pgClient, context);
    const result = await pgClient.query(query, variables);
    if (!skipTransaction) {
      await pgClient.query('COMMIT');
    }

    return result;
  } catch (error) {
    if (pgClient && !skipTransaction) {
      await pgClient.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (shouldRelease && pgClient && 'release' in pgClient) {
      pgClient.release();
    }
  }
};
