# Diff — `M` `docker-compose.jobs.yml`

## Navigation
- Prev: [M_66aa1acffcff.md](M_66aa1acffcff.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_cf8737ff3000.md](M_cf8737ff3000.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `ROOT`
- Numstat: `+16/-16`
- Reproduce: `git diff main...HEAD -- docker-compose.jobs.yml`

## Changes (line-aligned)
- `  # Constructive GraphQL API server`
  - `LaunchQL` → `Constructive GraphQL`
  - `(GraphQL)` → ``
- `  constructive-server:`
  - `launchql` → `constructive`
- `    container_name: constructive-server`
  - `launchql` → `constructive`
- `    image: constructive:dev`
  - `-launchql` → ``
- ``    # The image entrypoint already runs the Constructive CLI (`constructive`).``
  - `LaunchQL` → `Constructive`
  - `lql` → `constructive`
- `    entrypoint: ["constructive", "server", "--port", "3000", "--origin", "*", "--strictAuth", "false"]`
  - `lql` → `constructive`
- `      PGDATABASE: constructive`
  - `launchql` → `constructive`
- `    image: constructive:dev`
  - `-launchql` → ``
- `    # Override the image entrypoint (Constructive CLI) and run the Node function directly.`
  - `LaunchQL` → `Constructive`
- `      # Mailgun / email provider configuration for the Postmaster package`
  - `@launchql/postmaster` → `the Postmaster package`
- `    image: constructive:dev`
  - `-launchql` → ``
- `      # Constructive selects the API by Host header; use a seeded domain route.`
  - `LaunchQL` → `Constructive`
- `      # Mailgun / email provider configuration for the Postmaster package`
  - `@launchql/postmaster` → `the Postmaster package`
- `    image: constructive:dev`
  - `-launchql` → ``
- `      PGDATABASE: constructive`
  - `launchql` → `constructive`
- `      # Used by @constructive-io/knative-job-worker when NODE_ENV !== 'production'.`
  - `launchql` → `constructive-io`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

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

</details>

## Navigation
- Prev: [M_66aa1acffcff.md](M_66aa1acffcff.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_cf8737ff3000.md](M_cf8737ff3000.md)
