import {
  getCallbackBaseUrl,
  getJobGatewayDevMap,
  getNodeEnvironment
} from '@constructive-io/job-utils';

// this module exists to fail fast on missing env
// it is intentionally evaluated at import time

function normalizeBaseUrl(raw: string): string {
  const v = raw.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return `http://${v}`;
}

const rawGatewayUrl =
  process.env.KNATIVE_SERVICE_URL ||
  process.env.INTERNAL_GATEWAY_URL;

if (!rawGatewayUrl) {
  throw new Error(
    'KNATIVE_SERVICE_URL (or INTERNAL_GATEWAY_URL as fallback) is required'
  );
}

const gatewayUrl = normalizeBaseUrl(rawGatewayUrl);

const completeUrl =
  process.env.INTERNAL_JOBS_CALLBACK_URL ||
  getCallbackBaseUrl();
const nodeEnv = getNodeEnvironment();
const devMap = nodeEnv !== 'production' ? getJobGatewayDevMap() : null;

export { completeUrl, gatewayUrl, devMap };


