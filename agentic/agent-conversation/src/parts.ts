// `agent_message.parts`, and the ToolPart state machine documented by the agent
// blueprint (`packages/blueprints/blueprints/agent/README.md`).
//
// The blueprint's whole point is that there is no tool-call table and no
// approval table: a tool call is a part of a message, and its lifecycle is the
// `state` field. That makes the transition table the only place the lifecycle is
// enforced — an illegal transition throws rather than writing a row that no
// reader can interpret.

export interface TextPart {
  type: 'text';
  text: string;
}

export type ToolPartState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-denied'
  | 'output-error';

export interface ToolApproval {
  id: string;
  approved?: boolean;
  reason?: string;
}

export interface ToolPart {
  /** `tool-<name>` — the blueprint's discriminator. */
  type: `tool-${string}`;
  toolCallId: string;
  input: unknown;
  state: ToolPartState;
  output?: string;
  approval?: ToolApproval;
}

export type MessagePart = TextPart | ToolPart;

/** The states each state may move to. Terminal states move nowhere. */
export const TOOL_PART_TRANSITIONS: Record<ToolPartState, readonly ToolPartState[]> = {
  'input-streaming': ['input-available', 'output-error'],
  'input-available': ['approval-requested', 'output-available', 'output-error'],
  'approval-requested': ['approval-responded', 'output-denied', 'output-error'],
  'approval-responded': ['output-available', 'output-denied', 'output-error'],
  'output-available': [],
  'output-denied': [],
  'output-error': [],
};

export class InvalidToolPartTransitionError extends Error {
  constructor(
    readonly toolCallId: string,
    readonly from: ToolPartState,
    readonly to: ToolPartState
  ) {
    super(
      `tool call ${toolCallId}: cannot move from "${from}" to "${to}" — allowed: ${
        TOOL_PART_TRANSITIONS[from].join(', ') || '(terminal)'
      }`
    );
    this.name = 'InvalidToolPartTransitionError';
  }
}

export function isToolPart(part: MessagePart): part is ToolPart {
  return typeof part.type === 'string' && part.type.startsWith('tool-');
}

export function isTextPart(part: MessagePart): part is TextPart {
  return part.type === 'text';
}

export function textPart(text: string): TextPart {
  return { type: 'text', text };
}

export function toolPart(input: {
  toolName: string;
  toolCallId: string;
  input: unknown;
  state?: ToolPartState;
}): ToolPart {
  return {
    type: `tool-${input.toolName}`,
    toolCallId: input.toolCallId,
    input: input.input,
    state: input.state ?? 'input-available',
  };
}

/** Move a tool part to its next state, or throw. Returns a new part. */
export function advanceToolPart(
  part: ToolPart,
  next: { state: ToolPartState; output?: string; approval?: ToolApproval }
): ToolPart {
  const allowed = TOOL_PART_TRANSITIONS[part.state];
  if (!allowed) throw new Error(`tool call ${part.toolCallId}: unknown state "${part.state}"`);
  if (!allowed.includes(next.state)) {
    throw new InvalidToolPartTransitionError(part.toolCallId, part.state, next.state);
  }
  return {
    ...part,
    state: next.state,
    ...(next.output === undefined ? {} : { output: next.output }),
    ...(next.approval === undefined ? {} : { approval: { ...part.approval, ...next.approval } }),
  };
}

/** Ask for a human decision on a tool call: `input-available` → `approval-requested`. */
export function requestApproval(part: ToolPart, approvalId: string): ToolPart {
  return advanceToolPart(part, {
    state: 'approval-requested',
    approval: { id: approvalId },
  });
}

/** Record the decision a human made: `approval-requested` → `approval-responded`. */
export function respondToApproval(
  part: ToolPart,
  decision: { approved: boolean; reason?: string }
): ToolPart {
  if (!part.approval) {
    throw new Error(`tool call ${part.toolCallId}: no approval was requested`);
  }
  return advanceToolPart(part, {
    state: 'approval-responded',
    approval: { id: part.approval.id, ...decision },
  });
}

/** The tool ran: `→ output-available`. */
export function completeToolPart(part: ToolPart, output: string): ToolPart {
  return advanceToolPart(part, { state: 'output-available', output });
}

/** The human said no, or the gate refused: `→ output-denied`. */
export function denyToolPart(part: ToolPart, reason: string): ToolPart {
  return advanceToolPart(part, { state: 'output-denied', output: reason });
}

/** The tool threw: `→ output-error`. */
export function failToolPart(part: ToolPart, message: string): ToolPart {
  return advanceToolPart(part, { state: 'output-error', output: message });
}
