// Legacy env module (no longer used in code).
// PG configuration is now resolved via @launchql/job-utils.getJobPgConfig().
export default {
  PGUSER: process.env.PGUSER || 'postgres',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPASSWORD: process.env.PGPASSWORD || 'password',
  PGPORT: Number(process.env.PGPORT) || 5432,
  PGDATABASE: process.env.PGDATABASE || 'jobs'
};
