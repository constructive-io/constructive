// The `ToolsHost` a Job can honestly provide.

import type { ToolsHost } from '@agentic-kit/pi/host';

export interface PiHostValues {
  userId: string;
  accessToken: string;
  apiKey?: string;
  apiEndpoint?: string;
  modulesEndpoint?: string;
}

/**
 * A `ToolsHost` built from values.
 *
 * The desktop host reads an Electron singleton; a Job has a token and two
 * endpoints, and nothing else. It offers no preview token, no data-auth broker
 * and no step-up, so the data-plane tools decline cleanly rather than half-work,
 * and no `deliverSecret`, so `create_api_key` refuses to mint a secret that has
 * nowhere safe to go.
 */
export function createPiToolsHost(values: PiHostValues): ToolsHost {
  if (!values.accessToken) throw new Error('a pi tools host needs an access token');
  return {
    account: () => ({
      userId: values.userId,
      accessToken: values.accessToken,
      ...(values.apiKey ? { apiKey: values.apiKey } : {})
    }),
    backendConfig: () => ({
      ...(values.apiEndpoint ? { apiEndpoint: values.apiEndpoint } : {}),
      ...(values.modulesEndpoint ? { modulesEndpoint: values.modulesEndpoint } : {})
    }),
    signInHint: 'This run was launched without a usable platform token.'
  };
}
