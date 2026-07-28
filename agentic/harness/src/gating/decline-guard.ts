// Per-session memory of tool calls the user declined in the current agent run.
// A declined call re-issued with equivalent arguments is blocked without
// re-prompting the user; the memory clears when a new run starts (agent_start),
// so a later "go ahead" from the user re-prompts normally. That reset assumes
// user messages only arrive between runs — if mid-run steering ever lands, a
// steered approval won't clear this memory and needs its own reset hook.

export type DeclineGuard = {
  recordDecline: (toolName: string, input: Record<string, unknown> | undefined) => void;
  checkRetry: (toolName: string, input: Record<string, unknown> | undefined) => string | null;
  clear: () => void;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = canonicalize(record[key]);
    }
    return sorted;
  }
  return value;
}

function callKey(toolName: string, input: Record<string, unknown> | undefined): string {
  return `${toolName}::${JSON.stringify(canonicalize(input ?? {}))}`;
}

export function buildDeclineReason(toolName: string): string {
  return (
    `The user reviewed this ${toolName} call and declined it. ` +
    `This is a deliberate decision, not an error — do not call ${toolName} again with the same arguments. ` +
    `Continue the task without it, or tell the user in one sentence what you can't do without it.`
  );
}

function buildRetryBlockReason(toolName: string): string {
  return (
    `Blocked: the user already declined this exact ${toolName} call in this run, ` +
    `so it was not shown to the user again. Do not issue it again — ` +
    `proceed without it or ask the user how they'd like to continue.`
  );
}

export function createDeclineGuard(): DeclineGuard {
  const declined = new Set<string>();
  return {
    recordDecline(toolName, input) {
      declined.add(callKey(toolName, input));
    },
    checkRetry(toolName, input) {
      if (!declined.has(callKey(toolName, input))) return null;
      return buildRetryBlockReason(toolName);
    },
    clear() {
      declined.clear();
    },
  };
}
