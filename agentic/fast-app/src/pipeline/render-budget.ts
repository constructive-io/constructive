// How long the render check may take, from its own timeouts. The CRUD check
// holds its test rows for the pages opened on them (verify-crud.ts), so its
// hold follows these instead of a guess of its own.

/** The longest a page's load, and its data requests after it, may take. */
export const PAGE_TIMEOUT_MS = 20_000;
/** The longest one step on the page may take: a debugger command, a read of the page. */
export const STEP_TIMEOUT_MS = 10_000;

/** Before the first page: the sign-in page, then the debugger's two commands and the session. */
export const RENDER_SETUP_BUDGET_MS = PAGE_TIMEOUT_MS + 3 * STEP_TIMEOUT_MS;
/** One page: its load and its data requests, then the read of what it shows. */
export const RENDER_PAGE_BUDGET_MS = PAGE_TIMEOUT_MS + STEP_TIMEOUT_MS;
