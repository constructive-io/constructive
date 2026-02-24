# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.1.0 (2026-02-24)

### Features

- Initial experimental scaffold for Constructive agent runtime.
- Added core contracts for run state, events, policy, and tools.
- Added in-memory run/event stores and run controller skeleton.
- Added ADRs for identity propagation, event storage, and tool allowlist strategy.
- Added PI runtime adapter with policy-gated tool execution and lifecycle event mapping.
- Added GraphQL operation registry/tool factory and health-check tool path.
- Added approval lifecycle with pause/resume APIs and approval event contracts.
- Added redaction + argument hashing for approval and event audit safety.
- Added PostgreSQL stores for runs, events, and approvals, plus schema/retention helpers.
- Added replay helper for deterministic run reconstruction from event journals.
- Added real Constructive server + PostgreSQL RLS integration tests for agent tool execution.
- Added runner concurrency controls (global, per-actor, per-tenant).
- Added bridge helpers/tests for in-memory web publish/subscribe and buffered TUI events.
- Added rule-based contextual policy engine for tenant/resource-aware policy decisions.
- Added approval policy-matrix authorizer with scoped decider/capability/risk controls.
- Added operation bundle helpers for typed entity CRUD GraphQL tool registration.
- Added runner event publishing, run interruption (`abortRun`), and control protocol adapter.
- Added runtime + runner metrics/tracing hooks and in-memory observability sinks.
- Added control protocol integration tests (live stream, approval resume, interruption).
- Added threat model, runbook, and integration cookbook docs.
