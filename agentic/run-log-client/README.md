# @agentic-kit/run-log-client

The run log as a browser reads it.

This package provides a tenant-GraphQL `RunLogStore` over an agent run and its events.
It also includes the follower loop shared by each run surface.
Use it to read append-only run entries and project them into browser-facing views.
The client works with the published `@agentic-kit/run-log` data model.
