import { EventEmitter } from 'events';

import { segmentKeys, splitCoalescedKeypresses } from '../src/keypress-chunks';

describe('segmentKeys', () => {
  it('keeps single characters whole', () => {
    expect(segmentKeys('a')).toEqual(['a']);
    expect(segmentKeys('\r')).toEqual(['\r']);
  });

  it('splits a pasted string into single keys', () => {
    expect(segmentKeys('QaAgentLogin!2026\r')).toEqual([...'QaAgentLogin!2026', '\r']);
  });

  it('keeps CSI escape sequences intact', () => {
    expect(segmentKeys('\u001b[B')).toEqual(['\u001b[B']);
    expect(segmentKeys('\u001b[B\u001b[B\r')).toEqual(['\u001b[B', '\u001b[B', '\r']);
    expect(segmentKeys('\u001b[1;5D')).toEqual(['\u001b[1;5D']);
    expect(segmentKeys('\u001b[3~')).toEqual(['\u001b[3~']);
  });

  it('keeps two-char alt sequences intact', () => {
    expect(segmentKeys('\u001bb')).toEqual(['\u001bb']);
    expect(segmentKeys('\u001b')).toEqual(['\u001b']);
  });

  it('splits mixed text and escapes', () => {
    expect(segmentKeys('ab\u001b[Ac')).toEqual(['a', 'b', '\u001b[A', 'c']);
  });
});

describe('splitCoalescedKeypresses', () => {
  function fakePrompter() {
    const input = new EventEmitter();
    const received: string[] = [];
    const kp = {
      input,
      listeners: {} as Record<string, unknown[]>,
      dataHandler: (key: string) => received.push(key)
    };
    input.on('data', kp.dataHandler);
    return { prompter: { keypress: kp } as any, kp, input, received };
  }

  it('feeds coalesced chunks to the handler one key at a time', () => {
    const { prompter, input, received } = fakePrompter();
    splitCoalescedKeypresses(prompter);
    input.emit('data', 'n!2026\r');
    expect(received).toEqual(['n', '!', '2', '0', '2', '6', '\r']);
  });

  it('delivers a chunk whole when it is itself a registered key', () => {
    const { prompter, kp, input, received } = fakePrompter();
    kp.listeners['\u001b[B'] = [(): void => undefined];
    splitCoalescedKeypresses(prompter);
    input.emit('data', '\u001b[B');
    expect(received).toEqual(['\u001b[B']);
  });

  it('replaces dataHandler so keypress.destroy removes the wrapper', () => {
    const { prompter, kp, input } = fakePrompter();
    const original = kp.dataHandler;
    splitCoalescedKeypresses(prompter);
    expect(kp.dataHandler).not.toBe(original);
    expect(input.listeners('data')).toEqual([kp.dataHandler]);
  });

  it('is a no-op without a keypress handler (noTty)', () => {
    expect(() => splitCoalescedKeypresses({ keypress: null } as any)).not.toThrow();
  });
});
