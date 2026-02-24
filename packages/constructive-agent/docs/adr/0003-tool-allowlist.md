# ADR 0003: Tool Allowlist Strategy

## Status
Accepted (experimental baseline)

## Context
Allowing unrestricted model-authored GraphQL introduces unnecessary risk and weakens security boundaries.

## Decision
`constructive-agent` uses an explicit allowlist tool registry. Each tool includes:

- name, label, description
- capability tag
- risk class
- validated execution function

Only registered tools can execute.

## Consequences
- Strong default control surface for model actions.
- Additional development effort to define operation-specific tools.
- Better compatibility with policy and approval gates.
