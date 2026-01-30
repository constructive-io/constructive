export const logDbSessionInfo = async (db: { query: (sql: string) => Promise<any> }) => {
  // Note: PgTestClient.query returns rows directly, not the full result object
  const rows = await db.query(`
      select
        current_user,
        session_user,
        current_setting('role', true) as role,
        current_setting('myapp.user_id', true) as user_id
    `);
  console.log('[db session info]', rows[0]);
};
  