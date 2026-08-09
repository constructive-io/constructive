import type { ConstructiveContext } from '@constructive-io/express-context';

export interface UnifiedAuthGraphQLContext {
  constructive?: ConstructiveContext;
  /** Server-read authentication-center first-party browser binding. */
  browserBinding?: string;
}

export interface ProviderDisplayOption {
  key: string;
  displayName: string;
}

export interface StartProviderAuthenticationInput {
  transactionId: string;
  providerKey: string;
}

export interface StartProviderAuthenticationPayload {
  authorizationUrl: string;
}

export interface StartUnifiedLoginInput {
  siteId: string;
  callbackUrl?: string | null;
  returnTo?: string | null;
  siteState: string;
}

export interface ContinueUnifiedLoginInput {
  transactionId: string;
}

export interface UnifiedPasswordInput extends ContinueUnifiedLoginInput {
  email: string;
  password: string;
  rememberMe?: boolean | null;
  deviceToken?: string | null;
}

export interface UnifiedAuthSite {
  id: string;
  displayName: string;
  iconUrl: string | null;
  themeColor: string | null;
}

export interface UnifiedAuthAccount {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StartUnifiedLoginPayload {
  transactionId: string;
  site: UnifiedAuthSite;
  signInMode: 'CONFIRM_BEFORE_SIGN_IN' | 'SILENT';
  reusableAuthentication: boolean;
  currentAccount: UnifiedAuthAccount | null;
  providers: ProviderDisplayOption[];
}

export interface UnifiedLoginContinuationPayload {
  transactionId: string;
  authenticated: true;
  continuationUrl: string;
}

export interface RedeemUnifiedLoginHandoffInput {
  handoffCode: string;
}

export interface RedeemUnifiedLoginHandoffPayload {
  credentialId: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isVerified: boolean;
  totpEnabled: boolean;
  returnTo: string;
}

export interface UnifiedLoginCredentialPayload
  extends UnifiedLoginContinuationPayload {
  credentialId: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isVerified: boolean;
  totpEnabled: boolean;
}
