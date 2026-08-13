// ── Cross-field checks ───────────────────────────────────────────────────────
//
// Per-var validation cannot express a constraint BETWEEN two vars, so consumers
// wrote those after `env()` returned — each with its own `throw`, so an operator
// fixes one error, redeploys, and hits the next instead of getting envalid's one
// consolidated report. A check runs after per-var validation, over the cleaned
// (coerced) values, and its failure joins that single report.

export type EnvCheck<T = Record<string, unknown>> = {
  /** Vars this check is about: used to attribute the error, and to SKIP the
   *  check when any of them already failed validation ("both missing" must not
   *  also report as "both equal"). */
  vars: readonly string[];
  /** Return false (or throw) to fail. Receives the cleaned, coerced values. */
  check: (env: T) => boolean;
  /** Why it failed, phrased as an instruction to the operator. */
  message: string;
};

/** At most one of `vars` may be set. */
export const mutuallyExclusive = <T = Record<string, unknown>>(
  vars: readonly string[],
  message = `only one of ${vars.join(', ')} may be set`
): EnvCheck<T> => ({
    vars,
    message,
    check: (env) =>
      vars.filter((name) => (env as Record<string, unknown>)[name] !== undefined).length <= 1
  });

/** All of `vars` must hold distinct values (e.g. two roles that cannot be the
 *  same role — one needs BYPASSRLS, the other must be subject to RLS). */
export const distinct = <T = Record<string, unknown>>(
  vars: readonly string[],
  message = `${vars.join(', ')} must all be different`
): EnvCheck<T> => ({
    vars,
    message,
    check: (env) => {
      const values = vars
        .map((name) => (env as Record<string, unknown>)[name])
        .filter((value) => value !== undefined);
      return new Set(values).size === values.length;
    }
  });

/** When `flag` is truthy, every var in `vars` must be set — a feature flag that
 *  turns other vars into requirements. */
export const requiredWhen = <T = Record<string, unknown>>(
  flag: string,
  vars: readonly string[],
  message = `${vars.join(', ')} are required when ${flag} is set`
): EnvCheck<T> => ({
    vars: [flag, ...vars],
    message,
    check: (env) => {
      const record = env as Record<string, unknown>;
      if (!record[flag]) return true;
      return vars.every((name) => record[name] !== undefined && record[name] !== '');
    }
  });

/** Run the checks whose vars all validated; return one message per failure. */
export const runChecks = <T>(
  checks: readonly EnvCheck<T>[],
  cleaned: T,
  failedVars: ReadonlySet<string>
): { vars: readonly string[]; message: string }[] => {
  const failures: { vars: readonly string[]; message: string }[] = [];
  for (const check of checks) {
    if (check.vars.some((name) => failedVars.has(name))) continue;
    let ok: boolean;
    try {
      ok = check.check(cleaned);
    } catch {
      ok = false;
    }
    if (!ok) failures.push({ vars: check.vars, message: check.message });
  }
  return failures;
};
