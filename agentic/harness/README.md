# @agentic-kit/harness

Host-agnostic core of the **Constructive harness** — the layer that turns a
generic coding agent into a Constructive app builder. Code only: **no skills
are bundled in this package**. Skills are pulled at runtime from
[`constructive-skills`](https://github.com/constructive-io/constructive-skills)
(plus optional overlays), so guidance stays fresh without a host release.

Planning: [constructive-planning#1273](https://github.com/constructive-io/constructive-planning/issues/1273)
(extraction) and [#1274](https://github.com/constructive-io/constructive-planning/issues/1274)
(skills consolidation).

## Layering

```
@agentic-kit/protocol → agentic-kit → @agentic-kit/agent   (LLM/runtime substrate)
                                            ↓
                                  @agentic-kit/harness      (this package)
                                            ↓
        pi/Electron desktop adapter | terminal CLI | MCP server | exports
```

Hosts inject a `HarnessContext` (cwd, endpoints, credentials, confirm gate);
the core owns everything host-neutral.

## What's here today

- `HarnessContext` / `HarnessCredentials` / `GateRequest` — the injection
  contracts identified in the desktop extraction research.
- `harnessDirs()` — on-disk layout via [`appstash`](https://www.npmjs.com/package/appstash)
  (`~/.constructive/{config,cache,data,logs}` with XDG/tmp fallbacks):
  downloaded skill releases under `data/skills/<version>`, the merged tree
  under `cache/skills-materialized`, update-check metadata in `cache/`.
- Ordered-overlay skill resolution:
  - `SkillsManifest` — ordered source layers, each with its own version pin
    and include/exclude filters, plus `compatibleSkillsRange` so updaters
    never adopt a skills release the installed tool code doesn't support.
  - `DirectorySkillSource` — loads the agentskills.io layout
    (`<skill>/SKILL.md` + references/scripts).
  - `resolveSkills()` — last-write-wins merge across layers (hardened base →
    team overlays → private known-gaps overlay).
  - `materializeSkills()` — writes the merged tree with `{{VAR}}`
    substitution (e.g. `HARNESS_TEMPLATES_DIR`).

## Roadmap (per #1273)

- Typed db-tools (`provision_database`, `provision_blueprint`, `run_codegen`,
  …) and gating extracted from `constructive-desktop` against
  `HarnessContext`.
- npm/git release fetchers (download + integrity check into
  `data/skills/<version>`, offline fallback to the last good release).
- pi adapter, terminal CLI, and `.claude`/MCP export surfaces.

```ts
import {
  DirectorySkillSource,
  harnessDirs,
  materializeSkills,
  resolveSkills,
} from '@agentic-kit/harness';

const dirs = harnessDirs();
const skills = await resolveSkills(
  {
    sources: [
      { name: 'constructive-skills', pin: '1.2.0' },
      { name: 'known-gaps', pin: 'abc1234' },
    ],
    compatibleSkillsRange: '^1.2.0',
  },
  [
    new DirectorySkillSource('constructive-skills', dirs.skillsVersionDir('1.2.0')),
    new DirectorySkillSource('known-gaps', '/path/to/private/overlay'),
  ]
);
materializeSkills(dirs.materializedDir, skills, {
  templateVars: { HARNESS_TEMPLATES_DIR: '/path/to/templates' },
});
```
