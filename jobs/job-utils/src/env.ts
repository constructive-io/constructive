// Legacy env module kept for backwards compatibility with older builds.
// New code should use runtime.getJobSchema() from ./runtime instead.
export default {
  JOBS_SCHEMA: process.env.JOBS_SCHEMA || 'app_jobs'
};
