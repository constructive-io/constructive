import {
  APPROVAL_AUTO_DENY_REASON,
  ClaudeCodeAdapter,
  CodexExecAdapter
} from '../src';

const claude = new ClaudeCodeAdapter();
const codex = new CodexExecAdapter();

describe('ClaudeCodeAdapter', () => {
  it('normalizes the verified Claude JSONL events', () => {
    // The spike elides unrelated fields and continuation lines; this closes
    // only those elisions and preserves the event payloads under test.
    expect(
      claude.parseEvent(
        '{"type":"system","subtype":"init","session_id":"2fdfd818-edfa-4869-ab55-59f481af498c"}'
      )
    ).toEqual([
      { kind: 'session', cliSessionId: '2fdfd818-edfa-4869-ab55-59f481af498c' }
    ]);
    expect(
      claude.parseEvent(
        '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"call_00_sDpahbIQfDnIdcrWSGmv7927","name":"Write","input":{"file_path":"/home/ubuntu/spike/work/cc.txt","content":"hi"}}]}}'
      )
    ).toEqual([
      {
        kind: 'tool_call',
        id: 'call_00_sDpahbIQfDnIdcrWSGmv7927',
        name: 'Write',
        input: { file_path: '/home/ubuntu/spike/work/cc.txt', content: 'hi' }
      }
    ]);
    expect(
      claude.parseEvent(
        '{"type":"user","message":{"content":[{"tool_use_id":"call_00_sDpahbIQfDnIdcrWSGmv7927","type":"tool_result","content":"File created successfully"}]}}'
      )
    ).toEqual([
      {
        kind: 'tool_result',
        id: 'call_00_sDpahbIQfDnIdcrWSGmv7927',
        output: 'File created successfully'
      }
    ]);
    expect(
      claude.parseEvent(
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Done. `cc.txt` contains `hi`"}]}}'
      )
    ).toEqual([{ kind: 'text', text: 'Done. `cc.txt` contains `hi`' }]);
    expect(
      claude.parseEvent(
        '{"type":"result","subtype":"success","is_error":false,"result":"Done. `cc.txt` contains `hi`","total_cost_usd":0.099364,"usage":{"input_tokens":15938}}'
      )
    ).toEqual([
      {
        kind: 'result',
        ok: true,
        summary: 'Done. `cc.txt` contains `hi`',
        usage: { input_tokens: 15938 },
        costUsd: 0.099364
      }
    ]);
    expect(
      claude.parseEvent(
        '{"type":"system","subtype":"permission_denied","tool_name":"Bash","tool_use_id":"call_00_ET_osVM1gksUapUeMRBjbFJ1590","decision_reason":"no approval surface in this session; permission request denied automatically"}'
      )
    ).toBeNull();
    expect(claude.parseEvent('{"type":"system","subtype":"thinking_tokens"}')).toBeNull();
    expect(
      claude.parseEvent(
        '{"type":"control_request","request_id":"ecc2f2c7-4182-4e11-bed6-8cfe809b6925","request":{"subtype":"can_use_tool","tool_name":"Bash","input":{"command":"python3 -c \\"print(6*7)\\""},"decision_reason":"This command requires approval"}}'
      )
    ).toEqual([
      {
        kind: 'approval_requested',
        requestId: 'ecc2f2c7-4182-4e11-bed6-8cfe809b6925',
        tool: 'Bash',
        input: { command: 'python3 -c "print(6*7)"' },
        reason: 'This command requires approval'
      }
    ]);
    expect(
      claude.parseEvent(
        '{"type":"user","message":{"content":[{"tool_use_id":"call_00_ET_osVM1gksUapUeMRBjbFJ1590","type":"tool_result","content":"Permission for this tool use was denied.","is_error":true}]}}'
      )
    ).toEqual([
      {
        kind: 'tool_result',
        id: 'call_00_ET_osVM1gksUapUeMRBjbFJ1590',
        output: 'Permission for this tool use was denied.',
        isError: true
      }
    ]);
    expect(() => claude.parseEvent('not json')).toThrow();
    expect(claude.parseEvent('')).toBeNull();
  });

  it('builds stream-json prompts and approval denials', () => {
    expect(claude.spawnArgs('hello')).toEqual({
      command: 'claude',
      args: [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--input-format',
        'stream-json',
        '--permission-prompt-tool',
        'stdio'
      ],
      stdinPrompt: '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"hello"}]}}\n'
    });
    expect(claude.spawnArgs('hello', 'resume-me').args).toContain('--resume');
    expect(claude.encodeApproval?.('request', 'deny', APPROVAL_AUTO_DENY_REASON)).toBe(
      '{"type":"control_response","response":{"subtype":"success","request_id":"request","response":{"behavior":"deny","message":"approval round-trip is not available in this session; denied automatically"}}}\n'
    );
  });
});

describe('CodexExecAdapter', () => {
  it('normalizes the verified Codex JSONL events', () => {
    expect(
      codex.parseEvent(
        '{"type":"thread.started","thread_id":"01a0a38b-442f-7f91-a250-72f305c839f7"}'
      )
    ).toEqual([
      { kind: 'session', cliSessionId: '01a0a38b-442f-7f91-a250-72f305c839f7' }
    ]);
    expect(
      codex.parseEvent(
        '{"type":"item.completed","item":{"id":"item_0","type":"error","message":"Model metadata unavailable"}}'
      )
    ).toEqual([
      { kind: 'tool_result', id: 'item_0', output: 'Model metadata unavailable', isError: true }
    ]);
    expect(
      codex.parseEvent(
        '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"I will help."}}'
      )
    ).toEqual([{ kind: 'text', text: 'I will help.' }]);
    expect(
      codex.parseEvent(
        '{"type":"item.started","item":{"id":"item_2","type":"command_execution","command":"echo hi"}}'
      )
    ).toBeNull();
    expect(
      codex.parseEvent(
        '{"type":"item.completed","item":{"id":"item_2","type":"command_execution","command":"/bin/bash -lc \\"printf hi\\"","aggregated_output":"hi\\n","exit_code":0,"status":"completed"}}'
      )
    ).toEqual([
      {
        kind: 'tool_call',
        id: 'item_2',
        name: 'command_execution',
        input: { command: '/bin/bash -lc "printf hi"' }
      },
      { kind: 'tool_result', id: 'item_2', output: 'hi\n' }
    ]);
    expect(codex.parseEvent('{"type":"turn.completed","usage":{"output_tokens":118}}')).toEqual([
      { kind: 'result', ok: true, usage: { output_tokens: 118 } }
    ]);
  });

  it('builds a resume command', () => {
    expect(codex.spawnArgs('hello', '01a0a38b-442f-7f91-a250-72f305c839f7')).toEqual({
      command: 'codex',
      args: [
        'exec',
        '--json',
        'resume',
        '01a0a38b-442f-7f91-a250-72f305c839f7',
        'hello'
      ]
    });
  });
});
