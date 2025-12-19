# Diff — `M` `docker-compose.jobs.yml`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+16/-16`
- Reproduce: `git diff main...HEAD -- docker-compose.jobs.yml`

## Guideline token summary
- Deltas: `launchql`: 11 → 0; `constructive`: 16 → 23; `Constructive`: 0 → 4; `LaunchQL`: 4 → 0; `@launchql/`: 3 → 0; `lql`: 2 → 0; `@constructive-io/`: 0 → 1

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
  # LaunchQL API server (GraphQL)										      |	  # Constructive GraphQL API server
  launchql-server:												      |	  constructive-server:
    container_name: launchql-server										      |	    container_name: constructive-server
    image: constructive-launchql:dev										      |	    image: constructive:dev
    # The image entrypoint already runs the LaunchQL CLI (`lql`).						      |	    # The image entrypoint already runs the Constructive CLI (`constructive`).
    entrypoint: ["lql", "server", "--port", "3000", "--origin", "*", "--strictAuth", "false"]			      |	    entrypoint: ["constructive", "server", "--port", "3000", "--origin", "*", "--strictAuth", "false"]
      PGDATABASE: launchql											      |	      PGDATABASE: constructive
    image: constructive-launchql:dev										      |	    image: constructive:dev
    # Override the image entrypoint (LaunchQL CLI) and run the Node function directly.				      |	    # Override the image entrypoint (Constructive CLI) and run the Node function directly.
      # Mailgun / email provider configuration for @launchql/postmaster						      |	      # Mailgun / email provider configuration for the Postmaster package
    image: constructive-launchql:dev										      |	    image: constructive:dev
      # LaunchQL selects the API by Host header; use a seeded domain route.					      |	      # Constructive selects the API by Host header; use a seeded domain route.
      # Mailgun / email provider configuration for @launchql/postmaster						      |	      # Mailgun / email provider configuration for the Postmaster package
    image: constructive-launchql:dev										      |	    image: constructive:dev
      PGDATABASE: launchql											      |	      PGDATABASE: constructive
      # Used by @launchql/knative-job-worker when NODE_ENV !== 'production'.					      |	      # Used by @constructive-io/knative-job-worker when NODE_ENV !== 'production'.
```
