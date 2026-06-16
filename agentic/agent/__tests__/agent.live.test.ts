import { OpenAIAdapter } from '@agentic-kit/openai';
import { createUserMessage, type AssistantMessage } from 'agentic-kit';

import { Agent } from '../src';

const modelId = process.env.OPENAI_LIVE_MODEL ?? 'gpt-5.4-nano';
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing required env var: OPENAI_API_KEY');
}

const liveSuite = process.env.AGENT_LIVE_SUITE ?? 'smoke';
const runSmoke = liveSuite === 'smoke' || liveSuite === 'extended';
const runExtended = liveSuite === 'extended';
const describeSmoke = runSmoke ? describe : describe.skip;
const describeExtended = runExtended ? describe : describe.skip;

describeSmoke('Agent live smoke', () => {
  jest.setTimeout(60_000);

  it('single turn populates state.totalUsage from the assistant message', async () => {
    const adapter = new OpenAIAdapter({ apiKey });
    const model = adapter.createModel(modelId);
    const agent = new Agent({ initialState: { model }, streamFn: adapter.stream.bind(adapter) });

    await agent.prompt('Reply with the single word PONG.');

    expect(agent.state.totalUsage.input).toBeGreaterThan(0);
    expect(agent.state.totalUsage.output).toBeGreaterThan(0);
    expect(agent.state.totalUsage.totalTokens).toBeGreaterThan(0);
    expect(agent.state.totalUsage.cost.total).toBeGreaterThan(0);

    const lastAssistant = agent.state.messages
      .filter((m): m is AssistantMessage => m.role === 'assistant')
      .at(-1)!;

    // Single turn: the per-message usage IS the cumulative total.
    expect(agent.state.totalUsage.input).toBe(lastAssistant.usage.input);
    expect(agent.state.totalUsage.output).toBe(lastAssistant.usage.output);
    expect(agent.state.totalUsage.reasoning).toBe(lastAssistant.usage.reasoning);
    expect(agent.state.totalUsage.cacheRead).toBe(lastAssistant.usage.cacheRead);
    expect(agent.state.totalUsage.cacheWrite).toBe(lastAssistant.usage.cacheWrite);
    expect(agent.state.totalUsage.totalTokens).toBe(lastAssistant.usage.totalTokens);
  });
});

describeExtended('Agent live extended', () => {
  jest.setTimeout(120_000);

  it('state.totalUsage equals field-wise sum across two turns', async () => {
    const adapter = new OpenAIAdapter({ apiKey });
    const model = adapter.createModel(modelId);
    const agent = new Agent({ initialState: { model }, streamFn: adapter.stream.bind(adapter) });

    await agent.prompt('What is 2 + 2? Reply with just the number.');

    const t1Usage = {
      ...agent.state.totalUsage,
      cost: { ...agent.state.totalUsage.cost },
    };

    // continue() does not accept text; append the follow-up user message first.
    agent.appendMessage(createUserMessage('Now what is that doubled? Reply with just the number.'));
    await agent.continue();

    const lastAssistant = agent.state.messages
      .filter((m): m is AssistantMessage => m.role === 'assistant')
      .at(-1)!;

    expect(agent.state.totalUsage.input).toBe(t1Usage.input + lastAssistant.usage.input);
    expect(agent.state.totalUsage.output).toBe(t1Usage.output + lastAssistant.usage.output);
    expect(agent.state.totalUsage.reasoning).toBe(t1Usage.reasoning + lastAssistant.usage.reasoning);
    expect(agent.state.totalUsage.cacheRead).toBe(t1Usage.cacheRead + lastAssistant.usage.cacheRead);
    expect(agent.state.totalUsage.cacheWrite).toBe(t1Usage.cacheWrite + lastAssistant.usage.cacheWrite);
    expect(agent.state.totalUsage.totalTokens).toBe(t1Usage.totalTokens + lastAssistant.usage.totalTokens);
    expect(agent.state.totalUsage.cost.input).toBeCloseTo(
      t1Usage.cost.input + lastAssistant.usage.cost.input,
      10
    );
    expect(agent.state.totalUsage.cost.output).toBeCloseTo(
      t1Usage.cost.output + lastAssistant.usage.cost.output,
      10
    );
    expect(agent.state.totalUsage.cost.total).toBeCloseTo(
      t1Usage.cost.total + lastAssistant.usage.cost.total,
      10
    );
  });

  it('prompt() resets totalUsage; continue() preserves it', async () => {
    const adapter = new OpenAIAdapter({ apiKey });
    const model = adapter.createModel(modelId);
    const agent = new Agent({ initialState: { model }, streamFn: adapter.stream.bind(adapter) });

    await agent.prompt('Reply with the single word A.');
    const firstTotals = { ...agent.state.totalUsage, cost: { ...agent.state.totalUsage.cost } };

    agent.appendMessage(createUserMessage('Reply with the single word B.'));
    await agent.continue();
    const secondTotals = { ...agent.state.totalUsage, cost: { ...agent.state.totalUsage.cost } };

    // continue() must not reset — totals should have grown.
    expect(secondTotals.input).toBeGreaterThanOrEqual(firstTotals.input);
    expect(secondTotals.totalTokens).toBeGreaterThanOrEqual(firstTotals.totalTokens);
    expect(agent.state.totalUsage.input).toBeGreaterThanOrEqual(firstTotals.input);

    await agent.prompt('Reply with the single word C.');

    const thirdAssistant = agent.state.messages
      .filter((m): m is AssistantMessage => m.role === 'assistant')
      .at(-1)!;

    // prompt() resets: the new total should be one turn's worth, not cumulative
    // across all three. We use < rather than === because token counts vary and
    // we cannot pin the exact value — only that it did not carry over the prior
    // two turns' worth of input tokens.
    expect(agent.state.totalUsage.input).toBeLessThan(secondTotals.input + 100);
    expect(agent.state.totalUsage.totalTokens).toBe(thirdAssistant.usage.totalTokens);
    expect(agent.state.totalUsage.input).toBe(thirdAssistant.usage.input);
    expect(agent.state.totalUsage.output).toBe(thirdAssistant.usage.output);
  });
});
