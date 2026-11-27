import type { ToolCallSuggestion, ToolFailure } from '@agentic-kit/harness';

import { constructiveDbTools } from '../src';

const TOOLS = constructiveDbTools.map((tool) => tool.name);

/**
 * The text of a failure names no tool, and no parameter of a call it suggests: the next steps travel only as its
 * calls, which each host renders in its own words.
 */
export function expectTextNamesNoTool(failure: Pick<ToolFailure, 'message' | 'hint' | 'calls'> | undefined): void {
  const text = `${failure?.message ?? ''} ${failure?.hint ?? ''}`;
  const params = (failure?.calls ?? []).flatMap((call) => Object.keys(call.input).concat(call.choose ?? [])).filter((key) => key.includes('_'));
  for (const name of [...TOOLS, ...params]) expect(text).not.toMatch(new RegExp(`\\b${name}\\b`));
}

/** One suggested call, any reason. */
export const suggests = (tool: string, input: Record<string, unknown>, choose?: string[]): ToolCallSuggestion =>
  expect.objectContaining({ tool, input, why: expect.any(String), ...(choose ? { choose } : {}) }) as ToolCallSuggestion;
