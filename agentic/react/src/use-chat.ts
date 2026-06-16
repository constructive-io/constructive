import type { AgentEvent, AgentToolResult } from '@agentic-kit/agent';
import { parseSSEStream } from '@agentic-kit/agent';
import type { AssistantMessage, Message, ToolCallContent, Usage } from 'agentic-kit';
import { createUserMessage } from 'agentic-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ToolDecisionPendingEvent = Extract<
  AgentEvent,
  { type: 'tool_decision_pending' }
>;

export interface ToolExecutionStartEvent {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolExecutionEndEvent {
  toolCallId: string;
  toolName: string;
  result: AgentToolResult;
  isError: boolean;
}

export interface UseChatOptions {
  api: string;
  body?: () => Record<string, unknown>;
  initialMessages?: Message[];
  fetch?: typeof globalThis.fetch;

  onMessage?: (message: Message) => void;
  onFinish?: (message: AssistantMessage) => void;
  onDecisionPending?: (event: ToolDecisionPendingEvent) => void;
  onToolExecutionStart?: (event: ToolExecutionStartEvent) => void;
  onToolExecutionEnd?: (event: ToolExecutionEndEvent) => void;
  onError?: (error: unknown) => void;
}

export interface UseChatResult {
  messages: Message[];
  streamingMessage: AssistantMessage | null;
  isStreaming: boolean;
  pendingDecisions: ReadonlyMap<string, ToolDecisionPendingEvent>;
  executingToolCallIds: ReadonlySet<string>;
  error: unknown;
  usage: Usage | null;

  send: (input: string | Message) => Promise<void>;
  sendMessages: (messages: Message[]) => Promise<void>;
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  respondWithDecision: (toolCallId: string, value: unknown) => Promise<void>;
  abort: () => void;
}

/**
 * Compute the pendingDecisions map from a messages array. A toolCall counts as
 * pending when it has neither a `decision` field nor a paired `toolResult`.
 *
 * Used on `setMessages` to recompute server-derived state from the new array.
 * The synthesized event is a stub (no `input`, no `schema`) — the original
 * decision-pending event is not recoverable from messages alone, but the map
 * key (toolCallId) is what consumers actually need to render decision UI.
 */
function rederivePendingDecisions(
  messages: Message[]
): Map<string, ToolDecisionPendingEvent> {
  const completed = new Set<string>();
  for (const m of messages) {
    if (m.role === 'toolResult') completed.add(m.toolCallId);
  }
  const pending = new Map<string, ToolDecisionPendingEvent>();
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    for (const block of m.content) {
      if (block.type !== 'toolCall') continue;
      if (completed.has(block.id)) continue;
      if ('decision' in block && block.decision !== undefined) continue;
      pending.set(block.id, {
        type: 'tool_decision_pending',
        toolCallId: block.id,
        toolName: block.name,
        input: block.arguments,
        schema: { type: 'object' },
      });
    }
  }
  return pending;
}

export function useChat(options: UseChatOptions): UseChatResult {
  const [messages, setMessagesState] = useState<Message[]>(
    () => options.initialMessages ?? []
  );
  const [streamingMessage, setStreamingMessage] = useState<AssistantMessage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingDecisions, setPendingDecisions] = useState<
    ReadonlyMap<string, ToolDecisionPendingEvent>
  >(() => rederivePendingDecisions(options.initialMessages ?? []));
  const [executingToolCallIds, setExecutingToolCallIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [error, setError] = useState<unknown>(undefined);
  const [usage, setUsage] = useState<Usage | null>(null);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const streamingMessageRef = useRef<AssistantMessage | null>(null);
  useEffect(() => {
    streamingMessageRef.current = streamingMessage;
  }, [streamingMessage]);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const runIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const failRun = useCallback((err: unknown) => {
    setError(err);
    optionsRef.current.onError?.(err);
    setIsStreaming(false);
  }, []);

  const runStream = useCallback(
    async (
      requestMessages: Message[],
      optimisticUserMessage: Message | null
    ): Promise<void> => {
      const opts = optionsRef.current;
      const myRun = ++runIdRef.current;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const isCurrent = () => runIdRef.current === myRun;

      setIsStreaming(true);
      setError(undefined);
      setPendingDecisions(new Map());
      setExecutingToolCallIds(new Set());
      setStreamingMessage(null);
      setUsage(null);
      if (optimisticUserMessage) {
        setMessagesState((prev) => [...prev, optimisticUserMessage]);
      }

      let skipUserEcho = optimisticUserMessage !== null;

      const fetchFn = opts.fetch ?? globalThis.fetch;
      const extraBody = opts.body?.() ?? {};

      let response: Response;
      try {
        response = await fetchFn(opts.api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: requestMessages, ...extraBody }),
          signal: controller.signal,
        });
      } catch (err) {
        if (!isCurrent()) return;
        if (controller.signal.aborted) {
          if (isCurrent()) setIsStreaming(false);
          return;
        }
        failRun(err);
        return;
      }

      if (!isCurrent()) return;

      if (!response.ok) {
        failRun(new Error(`HTTP ${response.status}: ${response.statusText}`));
        return;
      }

      if (!response.body) {
        failRun(new Error('Response has no body'));
        return;
      }

      try {
        for await (const event of parseSSEStream(response.body)) {
          if (!isCurrent()) return;

          switch (event.type) {
          case 'message_start': {
            if (skipUserEcho && event.message.role === 'user') {
              skipUserEcho = false;
              break;
            }
            if (event.message.role === 'assistant') {
              setStreamingMessage(event.message);
            }
            break;
          }
          case 'message_update': {
            setStreamingMessage(event.message);
            break;
          }
          case 'message_end': {
            if (event.message.role === 'assistant') {
              setStreamingMessage(null);
              setMessagesState((prev) => [...prev, event.message]);
            } else if (event.message.role === 'toolResult') {
              setMessagesState((prev) => [...prev, event.message]);
            }
            opts.onMessage?.(event.message);
            break;
          }
          case 'tool_execution_start': {
            setExecutingToolCallIds((prev) => {
              const next = new Set(prev);
              next.add(event.toolCallId);
              return next;
            });
            opts.onToolExecutionStart?.({
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.args,
            });
            break;
          }
          case 'tool_execution_end': {
            setExecutingToolCallIds((prev) => {
              if (!prev.has(event.toolCallId)) return prev;
              const next = new Set(prev);
              next.delete(event.toolCallId);
              return next;
            });
            opts.onToolExecutionEnd?.({
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              result: event.result,
              isError: event.isError,
            });
            break;
          }
          case 'tool_decision_pending': {
            setPendingDecisions((prev) => {
              const next = new Map(prev);
              next.set(event.toolCallId, event);
              return next;
            });
            opts.onDecisionPending?.(event);
            break;
          }
          case 'turn_end': {
            setUsage((prev) =>
              prev?.totalTokens === event.totalUsage.totalTokens ? prev : event.totalUsage
            );
            break;
          }
          case 'agent_end': {
            setStreamingMessage(null);
            setUsage((prev) =>
              prev?.totalTokens === event.totalUsage.totalTokens ? prev : event.totalUsage
            );
            setMessagesState(() => {
              if (!isCurrent()) return messagesRef.current;
              return event.messages;
            });
            const lastAssistant = [...event.messages]
              .reverse()
              .find((m): m is AssistantMessage => m.role === 'assistant');
            if (lastAssistant) {
              opts.onFinish?.(lastAssistant);
            }
            break;
          }
          }
        }
      } catch (err) {
        if (!isCurrent()) return;
        if (controller.signal.aborted) return;
        failRun(err);
        return;
      } finally {
        if (isCurrent()) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      }
    },
    [failRun]
  );

  const sendMessages = useCallback(
    async (msgs: Message[]): Promise<void> => {
      setMessagesState(msgs);
      messagesRef.current = msgs;
      await runStream(msgs, null);
    },
    [runStream]
  );

  const send = useCallback(
    async (input: string | Message): Promise<void> => {
      const userMessage: Message =
        typeof input === 'string' ? createUserMessage(input) : input;
      const requestMessages = [...messagesRef.current, userMessage];
      messagesRef.current = requestMessages;
      await runStream(requestMessages, userMessage);
    },
    [runStream]
  );

  const respondWithDecision = useCallback(
    async (toolCallId: string, value: unknown): Promise<void> => {
      const current = messagesRef.current;
      let targetIdx = -1;
      for (let i = current.length - 1; i >= 0; i--) {
        const msg = current[i];
        if (msg.role !== 'assistant') continue;
        const match = msg.content.find(
          (block) => block.type === 'toolCall' && block.id === toolCallId
        );
        if (!match) continue;
        if ('decision' in match && match.decision !== undefined) continue;
        targetIdx = i;
        break;
      }
      if (targetIdx === -1) {
        throw new Error(`No pending decision for toolCallId '${toolCallId}'`);
      }
      const target = current[targetIdx] as AssistantMessage;
      const updatedAssistant: AssistantMessage = {
        ...target,
        content: target.content.map((block) => {
          if (block.type !== 'toolCall' || block.id !== toolCallId) {
            return block;
          }
          return { ...(block as ToolCallContent), decision: value };
        }),
      };
      const requestMessages = [
        ...current.slice(0, targetIdx),
        updatedAssistant,
        ...current.slice(targetIdx + 1),
      ];
      setMessagesState(requestMessages);
      messagesRef.current = requestMessages;
      setPendingDecisions((prev) => {
        if (!prev.has(toolCallId)) return prev;
        const next = new Map(prev);
        next.delete(toolCallId);
        return next;
      });
      await runStream(requestMessages, null);
    },
    [runStream]
  );

  const setMessages = useCallback(
    (update: Message[] | ((prev: Message[]) => Message[])): void => {
      setMessagesState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        messagesRef.current = next;
        setPendingDecisions(rederivePendingDecisions(next));
        setExecutingToolCallIds(new Set());
        setError(undefined);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    runIdRef.current++;

    // Snapshot the in-flight assistant message before clearing so visible text
    // survives the stop. Drop toolCall blocks — without results they'd surface
    // as pending decisions via rederivePendingDecisions and re-pause the agent.
    const partial = streamingMessageRef.current;
    if (partial) {
      const visible = partial.content.filter(
        (b) => b.type === 'text' && b.text.length > 0
      );
      if (visible.length > 0) {
        setMessagesState((prev) => [...prev, { ...partial, content: visible }]);
      }
    }

    setIsStreaming(false);
    setStreamingMessage(null);
    setExecutingToolCallIds(new Set());
    setPendingDecisions(new Map());
  }, []);

  return useMemo(
    () => ({
      messages,
      streamingMessage,
      isStreaming,
      pendingDecisions,
      executingToolCallIds,
      error,
      usage,
      send,
      sendMessages,
      setMessages,
      respondWithDecision,
      abort,
    }),
    [
      messages,
      streamingMessage,
      isStreaming,
      pendingDecisions,
      executingToolCallIds,
      error,
      usage,
      send,
      sendMessages,
      setMessages,
      respondWithDecision,
      abort,
    ]
  );
}
