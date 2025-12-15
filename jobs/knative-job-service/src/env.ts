// Legacy env module kept for compatibility.
// New configuration flows through @launchql/job-utils runtime helpers.
export default {
  PGUSER: process.env.PGUSER || 'postgres',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPASSWORD: process.env.PGPASSWORD || 'password',
  PGPORT: Number(process.env.PGPORT) || 5432,
  PGDATABASE: process.env.PGDATABASE || 'jobs',
  JOBS_SCHEMA: process.env.JOBS_SCHEMA || 'app_jobs',
  JOBS_SUPPORT_ANY: process.env.JOBS_SUPPORT_ANY !== 'false',
  JOBS_SUPPORTED: (process.env.JOBS_SUPPORTED || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  HOSTNAME: process.env.HOSTNAME || 'worker-0',
  INTERNAL_JOBS_CALLBACK_URL: process.env.INTERNAL_JOBS_CALLBACK_URL,
  INTERNAL_JOBS_CALLBACK_PORT:
    Number(process.env.INTERNAL_JOBS_CALLBACK_PORT) || 12345
};
