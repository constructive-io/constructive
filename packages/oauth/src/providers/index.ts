import { OAuthProviderConfig } from '../types';
import { facebookProvider } from './facebook';
import {
  extractPrimaryEmail,
  GITHUB_EMAILS_URL,
  githubProvider,
  selectGitHubEmail,
} from './github';
import { googleProvider } from './google';
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
  extractPrimaryEmail,
  facebookProvider,
  GITHUB_EMAILS_URL,
  githubProvider,
  googleProvider,
  linkedinProvider,
  selectGitHubEmail,
};
