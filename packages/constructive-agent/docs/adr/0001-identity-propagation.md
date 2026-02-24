# ADR 0001: Identity Propagation Strategy

## Status
Accepted (experimental baseline)

## Context
Constructive relies on request-level identity and claims to enforce authorization through PostgreSQL RLS via GraphQL middleware and PostGraphile pgSettings.

## Decision
`constructive-agent` will propagate actor identity through GraphQL requests using bearer tokens and contextual headers where applicable (`X-Database-Id`, `X-Api-Name`, `X-Meta-Schema`).

The default execution path is:

`Agent tool -> GraphQL endpoint -> Constructive middleware -> RLS`

## Consequences
- Tool execution inherits existing RLS policy guarantees.
- Service-level bypass paths are not part of the default runtime.
- Policy layer remains additive defense, not replacement for RLS.
