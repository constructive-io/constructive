export type TestRole = 'anonymous' | 'authenticated' | 'admin';

export const roleHeaders = (role: TestRole): Record<string, string> => {
  if (role === 'authenticated') {
    return { Authorization: 'Bearer valid-token-123' };
  }
  return {};
};
