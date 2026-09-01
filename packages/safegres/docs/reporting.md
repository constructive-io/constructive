# Reporting — output formats, deltas, and code scanning

- [Output and verbosity](#output-and-verbosity)
- [Planes in the report](#planes-in-the-report)
- [Analysis → view → render](#analysis--view--render)
- [Markdown for CI](#markdown-for-ci)
- [GitHub Actions (`--github`)](#github-actions---github)
- [What changed (`--compare`)](#what-changed---compare)
- [The baseline (`compare: auto`)](#the-baseline-compare-auto)
- [Code scanning (SARIF)](#code-scanning-sarif)

## Output and verbosity

Pretty output prints the exposure line, both scores, and the exposed findings. Internal
(non-exposed) advisories are collapsed to a one-line count by default so a large database's report
stays readable.

- `--summary`, `-q` — only the exposure line, scores/grades, and severity counts (no per-finding
  lines). Ideal for CI job summaries.
- `--verbose` — expand the internal advisories instead of collapsing them to a count.
- `--exposed-only` — drop internal findings entirely.
- `--format json` / `--format json-pretty` — machine-readable; always carries every finding, plus
  `score`, `perf`, `exposure`, `roleAccess`, `comparison`, `callGraph` and any diffs.
- `--format markdown` — GitHub-flavoured markdown for a job summary or PR comment.
- `--format sarif` — SARIF 2.1.0 for GitHub code scanning.
- `--plane <name|glob>` — expand a secondary access plane (repeatable; `'*'` for all).

One audit can produce several artifacts at once, which is cheaper and less error-prone than
auditing three times with three `--format` values:

```bash
safegres audit --perf --summary \
  --write-json     reports/safegres.json \
  --write-markdown reports/safegres.md \
  --write-sarif    reports/safegres.sarif
```

## Planes in the report

Every declared [plane](../README.md#planes-the-other-ways-in) appears in `report.planes` — the
primary one first, whose score *is* `report.score`:

```jsonc
{
  "score": { "value": 87, "grade": "B", "deductions": […] },
  "planes": [
    { "name": "api", "kind": "api", "primary": true, "schemas": ["app_public"],
      "exposedTables": 24, "score": { "value": 87, "grade": "B" } },
    { "name": "direct:reporting", "kind": "role", "primary": false, "roles": ["reporting"],
      "reachedVia": "grant", "exposedTables": 12, "score": { "value": 41, "grade": "F" } }
  ]
}
```

Findings carry `planes: string[]` — every plane the finding is reachable on. It is *not* part of a
finding's identity: `exposed`, the baseline keys, and the SARIF fingerprints are unchanged by
adding a plane, so a plane can never invalidate a baseline. A plane whose role bypasses RLS
(`BYPASSRLS`, superuser) reports `skipped` instead of a grade.

Pretty and markdown output summarize secondary planes in one line/row each; `--plane` expands the
per-rule deductions for the ones you name.

## Analysis → view → render

The library separates *what was found* from *what to show*. `audit()` produces a `Report` and
nothing presentational; `selectView(report, viewConfig)` decides which planes, dimensions, and
sections appear; the renderers are functions of the result.

```ts
import { audit, renderMarkdown, selectView } from 'safegres';

const report = await audit(client, { exposure });
const view = selectView(report, { planes: ['direct:*'], dimensions: ['security'] });
view.scores;         // [{ id: 'security', … }, { id: 'plane:direct:app', … }]
view.security;       // { exposed, internal } — partitioned, report untouched
renderMarkdown(report, { view: { planes: ['direct:*'] } });
```

The same selection is available in config, so it is versioned with the repo:

```jsonc
{ "report": { "planes": ["direct:*"], "dimensions": ["security", "perf"] } }
```

`--summary`, `--verbose`, and `--exposed-only` remain shorthands for view settings.

## Markdown for CI

```yaml
- name: Database audit
  run: npx safegres audit --perf --format markdown >> "$GITHUB_STEP_SUMMARY"
```

Scores lead, then the severity counts, then a table per dimension; internal advisories and accepted
baseline debt fold into `<details>` so the summary stays skimmable. To post it as a PR comment
instead, pipe it to `gh pr comment --body-file -`.

Library callers get the same renderer as `renderMarkdown(report)`, which additionally accepts
`{ summary: true, title: '…' }` — the compact variant worth using when the full report is large
(GitHub caps a job summary at 1 MB, and a report with thousands of baselined perf findings will
exceed it). Keep the full report as a CI artifact and put the summary in the job summary.

## GitHub Actions (`--github`)

Inside Actions (`GITHUB_ACTIONS=true`) safegres writes its own job summary and annotations, so the
shell plumbing above becomes unnecessary:

```yaml
- run: npx safegres audit --perf --fail-on-grade B --github --github-comment
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # only needed for the PR comment
```

- **Job summary** — grade-colored [shields.io](https://shields.io) badges, then the markdown report.
- **Annotations** — `::error`/`::warning` on the findings that *failed a gate*, so the one finding
  that blocked the merge is not buried under a hundred advisories.
- **Sticky PR comment** — one comment, edited in place on every push (`--github-comment`, or
  `--write-github-comment <file>` to post it yourself).

What appears is configuration, not code:

```jsonc
{
  "report": {
    "github": {
      "summary": ["security", "perf", "planes:direct:*"],  // which scores get a badge, in order
      "comment": { "sticky": true, "sections": ["scores", "delta", "new-findings"] },
      "annotations": "gate-failures",                       // "all" | "gate-failures" | "none"
      "badges": true                                        // false → 🟢🟡🔴 text, no images
    }
  }
}
```

GitHub Markdown has no text color, so a genuinely colored score has to be an image; `badges: false`
falls back to emoji for air-gapped runners that cannot reach shields.io.

## The action

`packages/safegres/action.yml` is the same run as a composite action — it installs the CLI, runs the
audit with `--github`, and optionally posts the comment and uploads the SARIF:

```yaml
- uses: constructive-io/constructive/packages/safegres@main
  with:
    comment: true
    upload-sarif: true
```

Its inputs are deliberately only the things that differ *between jobs sharing one config* —
`database`/`pgpm` (what to audit), `fail-on-grade` and `report-only` (whether the gates bite),
`out`/`comment`/`upload-sarif` (what leaves the runner; `out` only when the config's `outputs.dir`
is not where this job wants them), the `compare*` inputs ([the
delta](#the-baseline-compare-auto)), plus
`version`, `config`, `preset`, `working-directory` and an `args` escape hatch. Everything a run
repeats belongs in the committed config file, so the common case passes nothing at all.

Two jobs can then share one config and differ only where they should: a gated merge check
(`safegres audit`, the file's `failOn` in force) and an advisory scan of a deployed database
(`database: staging`, `report-only: true`). The step exports `security-score`, `security-grade`,
`perf-score` and `report` as outputs on failing runs too — a gate failure is exactly when the score
is worth reading:

```yaml
- uses: constructive-io/constructive/packages/safegres@main
  id: audit
  with: { fail-on-grade: B }
- if: always()
  run: echo "graded ${{ steps.audit.outputs.security-grade }}"
```

Permissions are the caller's: `pull-requests: write` for `comment`, `security-events: write` for
`upload-sarif`, `actions: read` for the default `compare: auto` baseline lookup.

`version` installs the CLI globally (a dist-tag or an exact version), with one exception:
`version: local` runs the safegres already in `working-directory`'s `node_modules`. A `source.pgpm`
audit needs that — deploying the workspace goes through `pgsql-test`, an optional peer a global
install does not resolve, and a repo auditing its own module already pins the pair in its lockfile.
The rest of the run is identical.

The SARIF upload and the `report`/`out-dir` outputs read the directory the reports were actually
written to: `out` when it is given, otherwise the resolved config's `outputs.dir` (the action asks
`safegres print-config`), so a config-only job does not have to repeat the path in YAML.

## What changed (`--compare`)

A report says what the database *is*; on a pull request the only question is what the branch *did*
to it. `--compare` diffs this run against a previous one and renders the movement — a Δ column in
the score table, the severity counts that moved, and every rule whose finding count changed:

```bash
safegres audit --perf --compare main-report.json --compare-ref main --format markdown
```

```
| Dimension   | Score      | Grade | Δ vs main                                | Top deductions   |
| Security    | **99.3**   | **A+**| 🟢 ▲ +1.2 (from 98.1)                    | `A3` −4 (×2)     |
| Performance | **72.4**   | **C** | 🔴 ▼ −2.6 (from 75.0) · B → C · 40 → 46 findings | `X1` −18 (×46) |
```

Colour tracks *direction*, never severity: 🟢 is a better score or fewer findings, 🔴 the reverse,
⚪ no movement. A rule the previous run never reported — one added by a newer safegres, or a
dimension that run didn't scan — renders as `⚪ not measured before` rather than a red increase from
zero, so upgrading the scanner doesn't read as a regression.

The previous run is a file, not something safegres remembers: a scanner has no memory and shouldn't
acquire one, so CI decides what "previous" means (the report artifact from the base branch, a
committed scoreboard, last night's nightly) and hands it over. Any earlier `--format json` output
works as input. When keeping whole reports is too much, `--write-snapshot <file>` writes just the
aggregates the comparison reads — scores, grades, severity counts, per-rule counts — and `--compare`
accepts either. `--compare-ref` labels the previous run in the output.

In GitHub Actions the action finds that file for you — see [the baseline](#the-baseline-compare-auto),
which is a lookup worth getting right rather than a `gh run list --limit 1`.

Library callers get `compareReports(previous, report)`, with `toSnapshot` / `parseSnapshot` /
`serializeSnapshot` for the file side; the result is carried in JSON output as `comparison`.

## The baseline (`compare: auto`)

A delta is only meaningful against the right previous run, and "the base branch's last successful
run" is not that:

```bash
# The obvious query, and the bug.
gh run list --workflow audit.yaml --branch main --status success --limit 1 --json databaseId
```

`--limit 1` is `per_page=1`, so one unvalidated API row decides the comparison. When the newest
`main` run has not concluded yet, or its artifact never uploaded, the answer walks silently back to
an arbitrarily old run — a real one was 13.6 days and ~150 merges stale, and every pull request was
then billed for the accumulated backlog as its own delta. It went unnoticed for weeks because
nothing said which run the Δ was against.

So the action does the lookup instead, on by default (`compare: auto`) for pull requests. It walks
the base branch's recent runs, newest first, and takes the first that survives four questions:

1. did it conclude `success`?
2. is it younger than `compare-max-age-hours` (default 48 — a quiet weekend, not a fortnight)?
3. is its head commit in the history of this branch's **merge base** with the base branch? A run
   from *after* the branch point measures other people's merges.
4. does its artifact still download, and hold a report that parses?

Every rejection is logged with its reason, and the chosen run — id, commit, age, link — is rendered
in the job summary, the PR comment and the terminal, so the delta is checkable:

```
merge base with main: af904c90d
rejected 33373361061 (fb3f9d10e): fb3f9d10e is not an ancestor of merge base af904c90d
baseline: run 33373344814 main@af904c90d, 28 minutes old
```

> **Changes since main@af904c90d — [run 33373344814](…), 28 minutes old**

Nothing qualifying is not a failure — it is the normal state of a new branch. The report renders
with no deltas and says why, and the absolute gates (`failOn.grade`, the perf ratchet) still decide
the job:

> [!NOTE]
> No delta baseline: no run within 2.0 days whose head is an ancestor of merge base af904c90d
> (4 candidate(s) rejected). The absolute score and the perf baseline still gate this run.

The lookup needs `permissions: actions: read` (list runs, download artifacts). `compare: <file>`
still wins — an explicit baseline is never second-guessed — and `compare: off` skips the lookup.
Outside a pull request there is no branch point to measure from, so there is no delta.

Without the action, the same selection is one command:

```yaml
- id: baseline
  run: npx safegres baseline --provider github    # writes compare* to $GITHUB_OUTPUT
- run: |
    npx safegres audit --github \
      --compare "${{ steps.baseline.outputs.compare }}" \
      --compare-ref "${{ steps.baseline.outputs.compare-ref }}" \
      --compare-sha "${{ steps.baseline.outputs.compare-sha }}" \
      --compare-run-id "${{ steps.baseline.outputs.compare-run-id }}" \
      --compare-run-url "${{ steps.baseline.outputs.compare-run-url }}" \
      --compare-age "${{ steps.baseline.outputs.compare-age }}" \
      --compare-skipped "${{ steps.baseline.outputs.compare-skipped }}"
```

The provenance flags are what the renderers print; `--compare-skipped <why>` is the no-baseline
case, and passing it is how an absent delta reads as "not measured" instead of "nothing changed".
Library callers pass the same thing as `toSnapshot(report, { ref, provenance })` and get it back on
`comparison.previous.provenance`; `describeBaseline(comparison.previous)` renders the line above.

Other providers are not implemented — `--provider` exists so that stays a lookup rather than a
fork of the guard, which is pure and provider-agnostic (`selectBaseline`).

## Code scanning (SARIF)

`--format sarif` emits SARIF 2.1.0, so findings become GitHub code-scanning alerts — Security tab,
inline PR annotations, dismissals that stick:

```yaml
- run: npx safegres audit --perf --format sarif --sarif-sources ./deploy > safegres.sarif
- uses: github/codeql-action/upload-sarif@v3
  with: { sarif_file: safegres.sarif }
```

An alert needs a file and a line, but safegres reads the catalog — a live database has no source
location. `--sarif-sources <dir>` scans that directory's `.sql` for the `CREATE TABLE` /
`CREATE POLICY` that defines each object, so a finding on `app_public.widgets` points at the
migration that created it (policy findings resolve to the `CREATE POLICY` line). Findings that
don't resolve are still emitted, without a location — GitHub drops those, other SARIF consumers
keep them.

Results are fingerprinted by finding *identity* (code + relation + policy + subject, the same key
the perf baseline uses), never by message text, so rewording a rule in a later release doesn't
close and reopen every alert. Perf rules are tagged `performance`, security rules `security`.
