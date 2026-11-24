import type {
  BashToolCallEvent,
  EditToolCallEvent,
  ToolCallEvent,
  WriteToolCallEvent,
} from '@earendil-works/pi-coding-agent';

export function isEditEvent(event: ToolCallEvent): event is EditToolCallEvent {
  return event.toolName === 'edit';
}

export function isWriteEvent(event: ToolCallEvent): event is WriteToolCallEvent {
  return event.toolName === 'write';
}

export function isBashEvent(event: ToolCallEvent): event is BashToolCallEvent {
  return event.toolName === 'bash';
}
