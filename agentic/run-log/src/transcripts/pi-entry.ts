/**
 * The structural subset of pi's session entries this package reads.
 *
 * Deliberately structural, not imported from pi: a run log stores pi entries
 * *verbatim*, so the types here describe what the projectors read rather than
 * re-declaring pi's format. Every interface keeps an index signature so an
 * entry produced by a newer pi still parses, and unknown `type` values are
 * carried through untouched instead of being dropped.
 *
 * Reference: `@earendil-works/pi-coding-agent` `docs/session-format.md`
 * (session file version 3).
 */

export interface PiUsageCost {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  total?: number;
  [key: string]: unknown;
}

export interface PiUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: PiUsageCost;
  [key: string]: unknown;
}

export interface PiTextContent {
  type: 'text';
  text: string;
}

export interface PiThinkingContent {
  type: 'thinking';
  thinking: string;
}

export interface PiImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface PiToolCallContent {
  type: 'toolCall';
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
}

export type PiContent = PiTextContent | PiThinkingContent | PiImageContent | PiToolCallContent;

export interface PiUserMessage {
  role: 'user';
  content: string | PiContent[];
  timestamp?: number;
  [key: string]: unknown;
}

export interface PiAssistantMessage {
  role: 'assistant';
  content: PiContent[];
  api?: string;
  provider?: string;
  model?: string;
  usage?: PiUsage;
  stopReason?: 'stop' | 'length' | 'toolUse' | 'error' | 'aborted';
  errorMessage?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface PiToolResultMessage {
  role: 'toolResult';
  toolCallId: string;
  toolName: string;
  content: PiContent[];
  details?: unknown;
  usage?: PiUsage;
  isError?: boolean;
  timestamp?: number;
  [key: string]: unknown;
}

export interface PiBashExecutionMessage {
  role: 'bashExecution';
  command: string;
  output: string;
  exitCode?: number;
  cancelled?: boolean;
  truncated?: boolean;
  timestamp?: number;
  [key: string]: unknown;
}

export interface PiCustomMessage {
  role: 'custom';
  customType: string;
  content: string | PiContent[];
  display?: boolean;
  details?: unknown;
  timestamp?: number;
  [key: string]: unknown;
}

export interface PiSummaryMessage {
  role: 'branchSummary' | 'compactionSummary';
  summary: string;
  timestamp?: number;
  [key: string]: unknown;
}

export type PiMessage =
  | PiUserMessage
  | PiAssistantMessage
  | PiToolResultMessage
  | PiBashExecutionMessage
  | PiCustomMessage
  | PiSummaryMessage;

export interface PiSessionHeader {
  type: 'session';
  version: number;
  id: string;
  timestamp: string;
  cwd?: string;
  parentSession?: string;
  [key: string]: unknown;
}

export interface PiEntryBase {
  id: string;
  parentId: string | null;
  timestamp: string;
}

export interface PiMessageEntry extends PiEntryBase {
  type: 'message';
  message: PiMessage;
  [key: string]: unknown;
}

export interface PiCompactionEntry extends PiEntryBase {
  type: 'compaction';
  summary: string;
  tokensBefore?: number;
  usage?: PiUsage;
  [key: string]: unknown;
}

export interface PiBranchSummaryEntry extends PiEntryBase {
  type: 'branch_summary';
  summary: string;
  fromId: string;
  usage?: PiUsage;
  [key: string]: unknown;
}

export interface PiOtherEntry extends PiEntryBase {
  type: string;
  [key: string]: unknown;
}

export type PiSessionEntry =
  | PiSessionHeader
  | PiMessageEntry
  | PiCompactionEntry
  | PiBranchSummaryEntry
  | PiOtherEntry;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isPiSessionHeader = (entry: PiSessionEntry): entry is PiSessionHeader =>
  entry.type === 'session';

export const isPiMessageEntry = (entry: PiSessionEntry): entry is PiMessageEntry =>
  entry.type === 'message' && isRecord((entry as PiMessageEntry).message);

export const isPiCompactionEntry = (entry: PiSessionEntry): entry is PiCompactionEntry =>
  entry.type === 'compaction';

export const isPiBranchSummaryEntry = (entry: PiSessionEntry): entry is PiBranchSummaryEntry =>
  entry.type === 'branch_summary';

export const isAssistantMessage = (message: PiMessage): message is PiAssistantMessage =>
  message.role === 'assistant';

export const isToolResultMessage = (message: PiMessage): message is PiToolResultMessage =>
  message.role === 'toolResult';

/**
 * Narrow an untrusted value (a database JSONB column, an HTTP body) to a pi
 * entry. Throws rather than returning null: a log row that cannot be read is a
 * corrupted log, never an empty one.
 */
export function assertPiSessionEntry(value: unknown): PiSessionEntry {
  if (!isRecord(value)) {
    throw new TypeError(`pi session entry must be an object, received ${typeof value}`);
  }
  if (typeof value.type !== 'string' || value.type.length === 0) {
    throw new TypeError('pi session entry must carry a non-empty string `type`');
  }
  if (value.type !== 'session') {
    if (typeof value.id !== 'string' || value.id.length === 0) {
      throw new TypeError(`pi ${value.type} entry must carry a non-empty string \`id\``);
    }
    if (typeof value.timestamp !== 'string') {
      throw new TypeError(`pi ${value.type} entry must carry an ISO string \`timestamp\``);
    }
    if (!('parentId' in value)) {
      throw new TypeError(`pi ${value.type} entry must carry \`parentId\` (null for the first entry)`);
    }
  }
  return value as PiSessionEntry;
}

/** The text of a message's content, whether it is a string or a block array. */
export function contentText(content: string | PiContent[] | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block): block is PiTextContent => isRecord(block) && block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/** Tool calls requested by an assistant message, in order. */
export function toolCalls(message: PiAssistantMessage): PiToolCallContent[] {
  if (!Array.isArray(message.content)) return [];
  return message.content.filter(
    (block): block is PiToolCallContent => isRecord(block) && block.type === 'toolCall'
  );
}
