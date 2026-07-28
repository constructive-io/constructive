# @agentic-kit/cli

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

`agent` — a local, secure-by-default coding agent that builds your frontend and your backend. Skills, a backend harness, and offline-capable skill releases, batteries included.

```bash
npm install -g @agentic-kit/cli
agent                 # interactive TUI session in the current project
agent -p "explain this repo"   # one-shot print mode
```

## What it does

On startup, `agent` assembles the harness skill tree and drops you into an interactive terminal session:

1. **Base layer** — a pinned release of [`constructive-io/constructive-skills`](https://github.com/constructive-io/constructive-skills), fetched as a git tag/branch/SHA tarball into `~/.constructive/data/skills/<version>/` (offline fallback: newest cached release).
2. **Local overlay** — `~/.constructive/config/skills-overlay/<skill-name>/SKILL.md` (agentskills.io layout), highest precedence: a same-name skill replaces the base skill wholesale.

The merged tree is materialized into the appstash-owned agent dir, so the session picks the skills up natively. All harness state lives in the [appstash](https://github.com/constructive-io/appstash) `~/.constructive/` layout; project directories are untouched.

## Commands

| Command | Description |
|---------|-------------|
| `agent [options...]` | Start an interactive session with the harness skills |
| `agent -p "prompt"` | One-shot print mode |
| `agent init` | Configure the skills source (repo + pin) interactively |
| `agent skills list` | Resolve and list the effective skill set per layer |
| `agent skills update` | Re-fetch the base release and re-materialize |
| `agent help` | Usage |

## Configuration

`~/.constructive/config/skills-manifest.json`:

```json
{
  "repo": "constructive-io/constructive-skills",
  "pin": "^1.0.0",
  "manifest": {
    "sources": [
      { "name": "constructive-skills" },
      { "name": "local-overlay" }
    ]
  }
}
```

Env overrides: `AGENT_SKILLS_REPO`, `AGENT_SKILLS_PIN`, `AGENT_HOME` (appstash base dir), `GITHUB_TOKEN` (private skills repos).

## Roadmap

- Typed Constructive db tools + confirm gating (`@agentic-kit/harness` gating wired to the terminal confirm UI) once the tools are extracted from constructive-desktop against `HarnessContext`.
- Harness system-prompt section + templates/prompts materialization, shared with constructive-desktop via a common adapter package.

## Credits

The interactive session is powered by the excellent [pi coding agent](https://github.com/badlogic/pi-mono) — thank you! `agent` layers the Constructive harness (skill releases, overlays, backend tooling) on top.
