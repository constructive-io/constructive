import type {
  IdentityProviderConfiguration,
  NormalizedExternalIdentity,
  ProviderAuthorizationInput,
  ProviderAuthorizationResult,
  ProviderCallbackInput,
  ValidatedProviderConfiguration
} from './types';

/**
 * Protocol-neutral Provider boundary. Common login orchestration remains
 * outside adapters and no inheritance hierarchy is required.
 */
export interface ProviderAdapter<
  C extends ValidatedProviderConfiguration = ValidatedProviderConfiguration
> {
  readonly kind: string;
  validateConfiguration(input: IdentityProviderConfiguration): C;
  createAuthorizationRequest(
    input: ProviderAuthorizationInput<C>
  ): ProviderAuthorizationResult;
  completeAuthorization(
    input: ProviderCallbackInput<C>
  ): Promise<NormalizedExternalIdentity>;
}
