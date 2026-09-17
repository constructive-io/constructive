import { detectNoTtyFromProcess, isNoTtyRequested } from '../src/utils/tty';

describe('tty detection', () => {
  const originalIsTTY = process.stdin.isTTY;

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: originalIsTTY,
    });
  });

  it('treats a non-terminal stdin as non-interactive', () => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    expect(isNoTtyRequested({})).toBe(true);
    expect(detectNoTtyFromProcess(['node', 'pgpm'])).toBe(true);
  });
});
