# knative-job-worker

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/knative-job-worker"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=jobs%2Fknative-job-worker%2Fpackage.json"/></a>
</p>

Knative-compatible job worker that uses the existing Constructive PostgreSQL job queue and job utilities, invoking HTTP functions via `KNATIVE_SERVICE_URL` (or `INTERNAL_GATEWAY_URL` as a fallback) while preserving the same headers and payload shape as the OpenFaaS worker.
