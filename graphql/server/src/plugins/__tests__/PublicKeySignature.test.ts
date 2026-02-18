import { PublicKeySignature } from '../PublicKeySignature';
import type { PublicKeyChallengeConfig } from '../PublicKeySignature';

const defaultConfig: PublicKeyChallengeConfig = {
  schema: 'app_private',
  crypto_network: 'btc',
  sign_up_with_key: 'sign_up_with_key',
  sign_in_request_challenge: 'sign_in_request_challenge',
  sign_in_record_failure: 'sign_in_record_failure',
  sign_in_with_challenge: 'sign_in_with_challenge'
};

describe('PublicKeySignature plugin factory', () => {
  it('returns a valid GraphileConfig.Plugin object', () => {
    const plugin = PublicKeySignature(defaultConfig);
    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe('object');
    // extendSchema returns a plugin with a name and version
    expect(plugin.name).toBeDefined();
    expect(typeof plugin.name).toBe('string');
  });

  it('returns a plugin with schema hooks', () => {
    const plugin = PublicKeySignature(defaultConfig);
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
  });

  it('accepts custom config values', () => {
    const customConfig: PublicKeyChallengeConfig = {
      schema: 'custom_schema',
      crypto_network: 'eth',
      sign_up_with_key: 'custom_signup',
      sign_in_request_challenge: 'custom_challenge',
      sign_in_record_failure: 'custom_failure',
      sign_in_with_challenge: 'custom_verify'
    };
    const plugin = PublicKeySignature(customConfig);
    expect(plugin).toBeDefined();
    expect(typeof plugin.name).toBe('string');
  });

  it('default export matches named export', async () => {
    const mod = await import('../PublicKeySignature');
    expect(mod.default).toBe(mod.PublicKeySignature);
  });
});

describe('PublicKeyChallengeConfig interface', () => {
  it('requires all config fields', () => {
    // TypeScript enforces this at compile time; this runtime check
    // verifies that the factory does not throw with a complete config.
    expect(() => PublicKeySignature(defaultConfig)).not.toThrow();
  });
});
