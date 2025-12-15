// Legacy env module kept for compatibility.
// New configuration flows through @launchql/job-utils runtime helpers.
const KNATIVE_SERVICE_URL = process.env.KNATIVE_SERVICE_URL;

if (!KNATIVE_SERVICE_URL) {
  throw new Error(
    'KNATIVE_SERVICE_URL is required for @launchql/knative-job-worker'
  );
}

const INTERNAL_GATEWAY_DEVELOPMENT_MAP =
  process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP;

export default {
  KNATIVE_SERVICE_URL,
  INTERNAL_GATEWAY_DEVELOPMENT_MAP
};
