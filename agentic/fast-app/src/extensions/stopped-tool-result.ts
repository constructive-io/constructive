import type { ExtensionFactory, ToolResultEvent } from '@earendil-works/pi-coding-agent';

export const STOPPED_TOOL_NOTE =
  'The user stopped this tool call before it finished. The outcome is unknown: the work may have gone through, or the backend may still finish it. Check the real state before you try again.';

type StoppedToolDetails = { stoppedByUser: true };

type StoppedToolResult = {
  content: ToolResultEvent['content'];
  details: StoppedToolDetails;
  isError: true;
};

export function isStoppedToolDetails(details: unknown): details is StoppedToolDetails {
  return (
    typeof details === 'object' &&
    details !== null &&
    (details as Partial<StoppedToolDetails>).stoppedByUser === true
  );
}

/** A call that finished cleanly after the stop has a known outcome and keeps its result. */
export function stoppedToolResult(
  event: Pick<ToolResultEvent, 'content' | 'isError'>,
  aborted: boolean,
): StoppedToolResult | undefined {
  if (!aborted || !event.isError) return undefined;
  return {
    content: [{ type: 'text', text: STOPPED_TOOL_NOTE }, ...event.content],
    details: { stoppedByUser: true },
    isError: true,
  };
}

export const stoppedToolNote: ExtensionFactory = (pi) => {
  pi.on('tool_result', (event, ctx) => stoppedToolResult(event, ctx.signal?.aborted === true));
};
