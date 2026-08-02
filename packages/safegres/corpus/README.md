# The safegres evaluation corpus

Small schemas with a deliberate flaw and a written-down answer.

"The score went up" is not evidence of anything on its own. A corpus with known answers turns
safegres into an instrument you can calibrate: every case names the findings a correct audit must
produce, so a run is graded on *recall* — did it find the flaw? — rather than on a number whose
provenance nobody can check.

## Layout

```
corpus/
  bootstrap.sql          # corpus_anon / corpus_user: the two roles every case is graded against
  cases/<id>/
    schema.sql           # the case, as SQL
    case.json            # the answer key
```

`case.json`:

```jsonc
{
  "title": "The anonymous role holds a write grant",
  "dimension": "security",                       // which axis the flaw is on
  "exposure": {                                  // the surface it is graded against
    "schemas": ["c_anon_write_grant"],
    "roles": ["corpus_anon", "corpus_user"],
    "anonRoles": ["corpus_anon"]                 // reachable without credentials
  },
  "expect": [{ "code": "R1", "relation": "c_anon_write_grant.posts", "note": "…" }],
  "forbid": ["R2"],                              // false positives this case guards against
  "worstSeverity": "critical",
  "fix": "REVOKE INSERT … — writes belong to the signed-in role."
}
```

Cases are **data, not code**: another tool can consume the corpus without running ours.

## Grading

`expect` is a lower bound, not an equality check — a later release adding an unrelated advisory
must not invalidate the corpus. What a case pins *negatively* goes in `forbid`.

```ts
import { audit, gradeCase, loadCorpus, loadConfig } from 'safegres';

const { config } = loadConfig({ sealed: true, preset: 'recommended' });
for (const c of loadCorpus()) {
  await client.query(c.sql);
  const report = await audit(client, { config, exposure: c.exposure, perf: true, sealed: true });
  const { missed, falsePositives, passed } = gradeCase(report, c);
}
```

Runs sealed, so the corpus is graded by the shipped preset and never by a config file in the tree —
see `--sealed` and `report.provenance` in the main README.

## Using it to evaluate an agent

1. Deploy a case and audit it.
2. Hand the agent the findings (or just the schema) and ask for a fix.
3. Re-audit. The expected findings must be **gone**, no `forbid` code may appear, and the score on
   the case's dimension must reach 100.

Step 3 is why every case carries a one-sentence `fix`: the corpus states what "solved" means
instead of leaving it to the number.

## Adding a case

Keep it to one flaw. Anything the case does *not* mean to demonstrate — an unforced RLS table, an
open read policy left in to make the SQL shorter — shows up as an extra finding and muddies the
answer, so the surrounding schema should be otherwise correct. `__tests__/corpus.test.ts` runs
every case and additionally checks that the flaw costs points exactly when the rule carries weight
(`info` severities and fail-closed rules are weightless by construction).
