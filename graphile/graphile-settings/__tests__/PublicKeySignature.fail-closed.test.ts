let capturedVerifyCallback:
  | ((value: { input: Record<string, unknown> }) => Promise<unknown>)
  | undefined;

jest.mock('grafast', () => ({
  context: jest.fn(() => ({ get: jest.fn() })),
  lambda: jest.fn((_step: unknown, callback: typeof capturedVerifyCallback) => {
    capturedVerifyCallback = callback;
    return 'lambda-step';
  }),
  object: jest.fn((value: unknown) => value),
}));

jest.mock('graphile-utils', () => ({
  extendSchema: jest.fn((factory: () => any) => {
    const schema = factory();
    schema.plans.Mutation.verifyMessageForSigning(null, {
      getRaw: () => 'input-step',
    });
    return { name: 'PublicKeySignatureTestPlugin', schema: { hooks: {} } };
  }),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

import { PublicKeySignature } from '../src/plugins/PublicKeySignature';

describe('PublicKeySignature verification', () => {
  it('cannot be enabled through ambient environment state', async () => {
    const previous = process.env.ENABLE_SIGNATURE_VERIFICATION;
    process.env.ENABLE_SIGNATURE_VERIFICATION = 'true';
    try {
      PublicKeySignature({
        schema: 'app_private',
        crypto_network: 'btc',
        sign_up_with_key: 'sign_up_with_key',
        sign_in_request_challenge: 'sign_in_request_challenge',
        sign_in_record_failure: 'sign_in_record_failure',
        sign_in_with_challenge: 'sign_in_with_challenge',
      });

      expect(capturedVerifyCallback).toBeDefined();
      await expect(
        capturedVerifyCallback!({
          input: {
            publicKey: 'public-key',
            message: 'challenge',
            signature: 'unverified-signature',
          },
        })
      ).rejects.toThrow('FEATURE_DISABLED');
    } finally {
      if (previous === undefined) {
        delete process.env.ENABLE_SIGNATURE_VERIFICATION;
      } else {
        process.env.ENABLE_SIGNATURE_VERIFICATION = previous;
      }
    }
  });
});
