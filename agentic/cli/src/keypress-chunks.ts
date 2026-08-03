import { Inquirerer } from 'inquirerer';

const ESC = '\u001b';
const CSI_FINAL = /[a-zA-Z~]/;

export function segmentKeys(chunk: string): string[] {
  if (chunk.length <= 1) return [chunk];
  const keys: string[] = [];
  let i = 0;
  while (i < chunk.length) {
    if (chunk[i] === ESC && i + 1 < chunk.length) {
      let j = i + 2;
      if (chunk[i + 1] === '[') {
        while (j < chunk.length && !CSI_FINAL.test(chunk[j])) j++;
        j++;
      }
      keys.push(chunk.slice(i, Math.min(j, chunk.length)));
      i = j;
    } else {
      keys.push(chunk[i]);
      i++;
    }
  }
  return keys;
}

/**
 * inquirerer's TerminalKeypress looks a stdin data chunk up as one exact key,
 * so a paste or fast typing (several bytes coalescing into one chunk) is
 * silently dropped — a pasted password dies with a bogus auth error. Re-wire
 * the data listener to feed the original handler one key at a time, unless the
 * whole chunk is itself a registered key (arrow sequences arrive that way).
 */
export function splitCoalescedKeypresses(prompter: Inquirerer): void {
  const kp = (prompter as unknown as { keypress?: KeypressInternals }).keypress;
  if (!kp?.dataHandler || !kp.input) return;
  const original = kp.dataHandler;
  kp.input.removeListener('data', original);
  const wrapped = (chunk: string): void => {
    if (kp.listeners?.[chunk]?.length) {
      original(chunk);
      return;
    }
    for (const key of segmentKeys(chunk)) original(key);
  };
  kp.dataHandler = wrapped;
  kp.input.on('data', wrapped);
}

interface KeypressInternals {
  dataHandler: ((key: string) => void) | null;
  listeners: Record<string, unknown[]>;
  input: NodeJS.ReadStream;
}
