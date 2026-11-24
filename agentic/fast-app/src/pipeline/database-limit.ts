// db-tools currently reports backend refusals as code "failed" with the
// original backend code in the message. The agent endpoint may send it as a code.
export function isDatabaseLimit(code?: string, message?: string): boolean {
  return code === 'LIMIT_REACHED' || /\bLIMIT_REACHED\b/.test(message ?? '');
}

export const DATABASE_LIMIT_MESSAGE =
  'Your Constructive account has reached its database limit. A plan with a higher database allowance is required.';
