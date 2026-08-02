# Reporting — output formats, deltas, and code scanning

- [Output and verbosity](#output-and-verbosity)
- [Markdown for CI](#markdown-for-ci)
- [What changed (`--compare`)](#what-changed---compare)
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

The GitHub Actions pattern is to download the base branch's last successful report artifact:

```yaml
- name: Fetch the base branch's audit
  if: github.event_name == 'pull_request'
  continue-on-error: true
  env: { GH_TOKEN: '${{ github.token }}', BASE: '${{ github.event.pull_request.base.ref }}' }
  run: |
    run_id=$(gh run list --workflow audit.yaml --branch "$BASE" --status success \
      --limit 1 --json databaseId -q '.[0].databaseId')
    [ -n "$run_id" ] || { echo "no successful $BASE run to compare against"; exit 0; }
    gh run download "$run_id" -n safegres-reports -D previous
```

A missing artifact (new branch, expired retention) means no deltas — never a failure.

Library callers get `compareReports(previous, report)`, with `toSnapshot` / `parseSnapshot` /
`serializeSnapshot` for the file side; the result is carried in JSON output as `comparison`.

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
