# ADR 0002: Event Storage Strategy

## Status
Accepted (phased)

## Context
Agent runs require replay, auditability, and post-failure inspection. A journaled event model is needed for deterministic reconstruction.

## Decision
Adopt append-only event envelopes with per-run sequence numbers.

Phased storage:
1. In-memory stores for early iteration and tests.
2. PostgreSQL-backed stores for durable persistence and recovery.

## Consequences
- Runtime behavior can be reconstructed from stored events.
- Event versioning will be required before external integrations scale.
- Storage interfaces must remain stable across adapters.
