// Legacy env module kept for compatibility.
// Callback port now flows through @launchql/job-utils.getJobsCallbackPort().
export default {
  INTERNAL_JOBS_CALLBACK_PORT:
    Number(process.env.INTERNAL_JOBS_CALLBACK_PORT) || 12345
};
