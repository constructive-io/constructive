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
3. **Typed db tools** — the [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi) extension (including `provision_database`, `provision_blueprint`, `describe_schema`, and `run_codegen`) is materialized into the agent dir and loaded by pi automatically. The CLI does not register `add_records` or `create_api_key`; it has no tenant sign-in or secret-delivery integration for those tools.

The merged tree is materialized into the appstash-owned agent dir, so the session picks the skills up natively. All harness state lives in the [appstash](https://github.com/constructive-io/appstash) `~/.constructive/` layout; project directories are untouched.

## Commands

| Command | Description |
|---------|-------------|
| `agent [options...]` | Start an interactive session with the harness skills |
| `agent -p "prompt"` | One-shot print mode; gated tools are refused |
| `agent init` | Configure the skills source (repo + pin) interactively |
| `agent login` | Sign in to the Constructive platform (interactive) |
| `agent logout` | Revoke the API key and clear the stored session |
| `agent whoami` | Show the signed-in account, backend, and masked API key |
| `agent skills list` | Resolve and list the effective skill set per layer |
| `agent skills update` | Re-fetch the base release and re-materialize |
| `agent help` | Usage |

Print mode has no confirmation UI, so it refuses gated database changes and `run_codegen`. Setting a credential does not bypass confirmation. Use the interactive TUI or `agent --mode rpc` with a client that handles pi's approval requests for gated operations. Ungated tools, such as `describe_schema`, can still run in print mode.

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

Env overrides: `AGENT_SKILLS_REPO`, `AGENT_SKILLS_PIN`, `AGENT_HOME` (appstash base dir), `GITHUB_TOKEN` (private skills repos).

## Authentication

`agent login` signs in to the Constructive platform with email and password. The flow asks for a backend first: `localnet` (a local backend on `*.localhost:3000`), `devnet` (`*.launchql.dev`), or a custom API URL. After sign-in, the CLI mints a 5-year API key for the db tools and checks it on each startup. `agent logout` revokes the key and deletes the session.

Shared appstash files:

- `~/.constructive/config/credentials.json` — the signed-in session (user, access token, API key; mode `0600`, plaintext)
- `~/.constructive/config/contexts/<name>.json` — endpoints for each backend context
- `~/.constructive/config/settings.json` — shared settings, including the active context

The db tools read these files on each tool call, so a login mid-session is picked up without a restart. The CLI does not export stored credentials to child processes.

Env overrides for CI and headless use (these win over the stored session; read per tool call):
`CONSTRUCTIVE_USER_ID`, `CONSTRUCTIVE_ACCESS_TOKEN`, `CONSTRUCTIVE_API_KEY` (optional), `CONSTRUCTIVE_API_ENDPOINT`, `CONSTRUCTIVE_MODULES_ENDPOINT` (default to the local backend).

## Roadmap

- Harness system-prompt section + templates/prompts materialization, shared with constructive-desktop via a common adapter package.
