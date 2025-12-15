// Legacy env module kept for compatibility.
// New code should use @launchql/job-utils.getJobPgConfig()/getJobSchema().
export default {
  PGUSER: process.env.PGUSER || 'postgres',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPASSWORD: process.env.PGPASSWORD || 'password',
  PGPORT: Number(process.env.PGPORT) || 5432,
  PGDATABASE: process.env.PGDATABASE || 'jobs',
  JOBS_SCHEMA: process.env.JOBS_SCHEMA || 'app_jobs'
};
