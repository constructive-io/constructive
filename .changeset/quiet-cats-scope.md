---
'graphile-scoped-introspection': minor
'graphile-settings': patch
'@constructive-io/graphql-types': minor
'@constructive-io/graphql-env': minor
'@constructive-io/graphql-server': minor
---

Add an independently publishable, CNC-owned PostgreSQL introspection plugin
that scopes catalog queries to each service's configured schemas without
patching the Graphile stack. Keep the server on untouched upstream
introspection by default and activate the scoped preset and service factory
only with `GRAPHILE_INTROSPECTION_MODE=scoped-required`.
