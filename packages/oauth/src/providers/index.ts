import { OAuthProviderConfig } from '../types';
import { googleProvider } from './google';
import { githubProvider, GITHUB_EMAILS_URL, extractPrimaryEmail } from './github';
import { facebookProvider } from './facebook';
import { linkedinProvider } from './linkedin';

export const providers: Record<string, OAuthProviderConfig> = {
  google: googleProvider,
  github: githubProvider,
  facebook: facebookProvider,
  linkedin: linkedinProvider,
};

export function getProvider(id: string): OAuthProviderConfig | undefined {
  return providers[id];
}

export function getProviderIds(): string[] {
  return Object.keys(providers);
}

export {
  googleProvider,
  githubProvider,
  facebookProvider,
  linkedinProvider,
  GITHUB_EMAILS_URL,
  extractPrimaryEmail,
};
