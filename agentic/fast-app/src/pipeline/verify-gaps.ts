// What a verify that passed didn't check: the render check that didn't run,
// the tables the CRUD check only read, the detail pages with no row to open,
// and the test rows it couldn't delete. The card shows the first, second and
// last as "Verified with gaps". A record page with no row is a note: an empty
// table is a normal state, and verify opens those pages on its own test rows
// when it can. The agent hears each one.

import type { AppBuildDetails, RenderCheckSummary, VerifyGaps } from './app-plan';
import type { CrudCheck } from './verify-crud';

export function gapsOf({
  render,
  detail,
  crud,
  why,
}: {
  render: RenderCheckSummary;
  detail: { open: readonly string[]; noRow: readonly string[]; onTestRows?: number };
  crud: Pick<CrudCheck, 'readOnly' | 'leftover'>;
  /** Screen → why the CRUD check made no test row in its table. */
  why?: Readonly<Record<string, string>>;
}): VerifyGaps {
  const onTestRows = render.skipped ? 0 : (detail.onTestRows ?? 0);
  const detailPages = detail.open.length + onTestRows + detail.noRow.length;
  const reasons = Object.fromEntries(
    detail.noRow.flatMap((screen) => (why?.[screen] ? [[screen, why[screen]]] : [])),
  );
  return {
    ...(render.skipped ? { renderSkipped: render.skipped } : {}),
    ...(crud.readOnly.length ? { readOnly: [...crud.readOnly] } : {}),
    ...(detailPages
      ? {
        detailPages: {
          rendered: render.skipped ? 0 : detail.open.length + onTestRows,
          noRow: [...detail.noRow],
          ...(onTestRows ? { onTestRows } : {}),
          ...(Object.keys(reasons).length ? { why: reasons } : {}),
        },
      }
      : {}),
    ...(crud.leftover.length ? { leftoverRows: [...crud.leftover] } : {}),
  };
}

/** Whether anything went unchecked; a detail page count alone is no gap. */
export const hasGaps = (gaps: VerifyGaps | undefined): gaps is VerifyGaps =>
  Boolean(gaps && (hasWarnings(gaps) || gaps.detailPages?.noRow.length));

/** The gaps that make a pass amber; a record page with no row is only a note. */
export const hasWarnings = (gaps: VerifyGaps | undefined): boolean =>
  Boolean(gaps && (gaps.renderSkipped || gaps.readOnly?.length || gaps.leftoverRows?.length));

/** The gaps the render line doesn't name already, one line each, for the agent. */
export function gapLines(details: Pick<AppBuildDetails, 'gaps'>): string[] {
  const { gaps } = details;
  if (!hasGaps(gaps)) return [];
  const lines: string[] = [];
  if (gaps.readOnly?.length) {
    lines.push(
      `The CRUD check only read ${gaps.readOnly.join(', ')}: the app can't delete their rows, so it made no test row there.`,
    );
  }
  if (gaps.detailPages?.noRow.length) {
    const why = gaps.detailPages.why ?? {};
    const pages = gaps.detailPages.noRow.map((screen) =>
      why[screen] ? `${screen} (no test row: ${why[screen]})` : screen,
    );
    lines.push(
      `Detail pages not opened in a browser, since their table has no row: ${pages.join(', ')}. This is not a failure; don't seed rows only to cover them.`,
    );
  }
  if (gaps.leftoverRows?.length) {
    const rows = gaps.leftoverRows.map((row) => `${row.table} ${row.id}`).join(', ');
    lines.push(
      `Test rows the CRUD check made and couldn't delete: ${rows}. Tell the user they are there.`,
    );
  }
  return lines;
}
