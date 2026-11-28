# @agentic-kit/cli

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/cli"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fcli%2Fpackage.json"/></a>
</p>

`agent` — a local coding agent with Constructive skills, a backend harness, and confirmation for gated database tools. The confirmation gate does not sandbox pi's built-in tools or apply the separate Agentic Kit permissions engine.

```bash
npm install -g @agentic-kit/cli
agent                 # interactive TUI session in the current project
agent -p "explain this repo"   # one-shot print mode
```

## What it does

On startup, `agent` assembles the harness skill tree and drops you into an interactive terminal session:

1. **Base layer** — [`constructive-io/constructive-skills`](https://github.com/constructive-io/constructive-skills), fetched as a git tag/branch/SHA tarball into `~/.constructive/data/skills/<version>/` (default ref: `main`; offline fallback: newest cached release).
2. **Local overlay** — `~/.constructive/config/skills-overlay/<skill-name>/SKILL.md` (agentskills.io layout), highest precedence: a same-name skill replaces the base skill wholesale.
3. **Typed db tools** — the [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi) extension (including `provision_database`, `provision_blueprint`, `describe_schema`, `run_codegen`, and the access tools `describe_policy_type`, `explain_access` and `set_access`) is materialized into the agent dir and loaded by pi automatically. The CLI does not register `add_records` or `create_api_key`; it has no tenant sign-in or secret-delivery integration for those tools.

The merged tree is materialized into the appstash-owned agent dir, so the session picks the skills up natively. All harness state lives in the [appstash](https://github.com/constructive-io/appstash) `~/.constructive/` layout; project directories are untouched.

## Commands

| Command | Description |
|---------|-------------|
| `agent [options...]` | Start an interactive session with the harness skills |
| `agent -p "prompt"` | One-shot print mode; every database tool that changes something is refused, and pi's own tools still run |
| `agent init` | Configure the skills source (repo + pin) interactively |
| `agent login` | Sign in to the Constructive platform (interactive) |
| `agent logout` | Revoke the API key at the backend that issued it and clear the stored session; a session from the environment is not stored, so there is nothing to remove |
| `agent whoami` | Show the signed-in account, backend, and masked API key, and ask the backend whether it still accepts the credential |
| `agent skills list` | Resolve and list the effective skill set per layer |
| `agent skills update` | Re-fetch the base release and re-materialize |
| `agent help` | Usage |

Print mode has no confirmation UI, so it refuses every database tool whose effect is a write or a destructive change, `run_codegen` included. Setting a credential does not bypass confirmation. Use the interactive TUI or `agent --mode rpc` with a client that handles pi's approval requests for gated operations. Database tools that only read, such as `describe_schema`, still run in print mode, and so do pi's own tools (`bash`, `edit`, `write`): the gate covers the database tools only.

## Configuration

`~/.constructive/config/skills-manifest.json`:

```json
{
  "repo": "constructive-io/constructive-skills",
  "pin": "main",
  "manifest": {
    "sources": [
      { "name": "constructive-skills" },
      { "name": "local-overlay" }
    ]
  }
}
```

Env overrides: `AGENT_SKILLS_REPO`, `AGENT_SKILLS_PIN`, `CONSTRUCTIVE_STASH_DIR` (base directory that replaces `~` for `~/.constructive/`, shared with the session store and Constructive Desktop), `GITHUB_TOKEN` (private skills repos).

## Authentication

`agent login` signs in to the Constructive platform with email and password, through [`@agentic-kit/session`](https://www.npmjs.com/package/@agentic-kit/session), the sign-in every Constructive binary shares. The CLI ships no backend URLs: the flow asks for the backend's API GraphQL endpoint (e.g. `https://api.example.com/graphql`, defaulting to the last one used or `CONSTRUCTIVE_API_ENDPOINT`) and derives the auth, modules, agent and compute endpoints from its host. With no backend chosen the db tools fail and say so; they never fall back to a default host. After sign-in, the CLI asks for a 30-day API key for the db tools, then ends the password sign-in on the backend, so the key is the only credential it keeps. If no key can be made, the sign-in fails and nothing is stored. When the key is within 7 days of its end, each startup asks you to run `agent login` again, which signs you in and mints a new key; nothing renews it on its own. `agent logout` revokes the key and deletes the session.

Shared appstash files (with `CONSTRUCTIVE_STASH_DIR` set, each `~/.constructive/` below is `$CONSTRUCTIVE_STASH_DIR/.constructive/`):

- `~/.constructive/config/credentials.json` — the signed-in session (user and API key; mode `0600`, plaintext)
- `~/.constructive/config/contexts/<name>.json` — endpoints for each backend context
- `~/.constructive/config/settings.json` — shared settings, including the active context

The db tools read these files on each tool call, so a login mid-session is picked up without a restart. The CLI does not export stored credentials to child processes.

Env overrides for CI and headless use (read per tool call): `CONSTRUCTIVE_USER_ID`, `CONSTRUCTIVE_ACCESS_TOKEN` and `CONSTRUCTIVE_API_KEY` (optional) give the credential, and need `CONSTRUCTIVE_API_ENDPOINT` to name its backend. `CONSTRUCTIVE_API_ENDPOINT` alone picks a backend; the stored session is used with it only when it names the backend of the active context. `CONSTRUCTIVE_AUTH_ENDPOINT`, `CONSTRUCTIVE_MODULES_ENDPOINT`, `CONSTRUCTIVE_AGENT_ENDPOINT` and `CONSTRUCTIVE_COMPUTE_ENDPOINT` give one plane each (only together with `CONSTRUCTIVE_API_ENDPOINT`); the planes are derived only from an api host that starts with `api.`. An incomplete or wrong set is reported at startup, and every db tool call fails with that cause (for example `no-backend` naming `CONSTRUCTIVE_API_ENDPOINT`) in place of a sign-in prompt. See [`@agentic-kit/session`](https://www.npmjs.com/package/@agentic-kit/session) for the rules.

## Roadmap

- Harness system-prompt section + templates/prompts materialization, shared with constructive-desktop via a common adapter package.
