import { randomBytes, timingSafeEqual } from 'crypto';

export const generateState = (byteLength = 32): string =>
  randomBytes(byteLength).toString('hex');

export const verifyState = (
  expected: string | null | undefined,
  actual: string | null | undefined
): boolean => {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
};
