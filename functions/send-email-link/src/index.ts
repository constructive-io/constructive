import { createJobApp } from '@constructive-io/knative-job-fn';
import { GraphQLClient } from 'graphql-request';
import gql from 'graphql-tag';
import { generate } from '@launchql/mjml';
import { send as sendSmtp } from '@constructive-io/smtppostmaster';
import { parseEnvBoolean } from '@pgpmjs/env';
import { createLogger } from '@pgpmjs/logger';

const logger = createLogger('send-email-link');
let cachedPostmasterSend: typeof sendSmtp | null = null;

const getPostmasterSend = (): typeof sendSmtp => {
  if (!cachedPostmasterSend) {
    const postmaster = require('@launchql/postmaster') as { send: typeof sendSmtp };
    cachedPostmasterSend = postmaster.send;
  }
  return cachedPostmasterSend;
};

export type SendEmailLinkFunctionConfig = {
  dryRun?: boolean;
  useSmtp?: boolean;
  graphqlUrl?: string;
  metaGraphqlUrl?: string;
  graphqlAuthToken?: string;
  graphqlHostHeader?: string;
  metaGraphqlHostHeader?: string;
  localAppPort?: string;
  defaultDatabaseId?: string;
  envConfig?: NodeJS.ProcessEnv;
};

type ResolvedSendEmailLinkConfig = {
  isDryRun: boolean;
  useSmtp: boolean;
  graphqlUrl?: string;
  metaGraphqlUrl?: string;
  graphqlAuthToken?: string;
  graphqlHostHeader?: string;
  metaGraphqlHostHeader?: string;
  localAppPort?: string;
  defaultDatabaseId?: string;
  envConfig: NodeJS.ProcessEnv;
};

const resolveSendEmailLinkConfig = (
  config: SendEmailLinkFunctionConfig = {}
): ResolvedSendEmailLinkConfig => {
  const envConfig = config.envConfig ?? process.env;
  const isDryRun =
    typeof config.dryRun === 'boolean'
      ? config.dryRun
      : parseEnvBoolean(envConfig.SEND_EMAIL_LINK_DRY_RUN) ?? false;
  const useSmtp =
    typeof config.useSmtp === 'boolean'
      ? config.useSmtp
      : parseEnvBoolean(envConfig.EMAIL_SEND_USE_SMTP) ?? false;

  return {
    isDryRun,
    useSmtp,
    graphqlUrl: config.graphqlUrl ?? envConfig.GRAPHQL_URL,
    metaGraphqlUrl: config.metaGraphqlUrl ?? envConfig.META_GRAPHQL_URL,
    graphqlAuthToken: config.graphqlAuthToken ?? envConfig.GRAPHQL_AUTH_TOKEN,
    graphqlHostHeader: config.graphqlHostHeader ?? envConfig.GRAPHQL_HOST_HEADER,
    metaGraphqlHostHeader:
      config.metaGraphqlHostHeader ?? envConfig.META_GRAPHQL_HOST_HEADER,
    localAppPort: config.localAppPort ?? envConfig.LOCAL_APP_PORT,
    defaultDatabaseId:
      config.defaultDatabaseId ?? envConfig.DEFAULT_DATABASE_ID,
    envConfig
  };
};

const GetUser = gql`
  query GetUser($userId: UUID!) {
    user(id: $userId) {
      username
      displayName
      profilePicture
    }
  }
`;

const GetDatabaseInfo = gql`
  query GetDatabaseInfo($databaseId: UUID!) {
    database(id: $databaseId) {
      sites {
        nodes {
          domains {
            nodes {
              subdomain
              domain
            }
          }
          logo
          title
          siteThemes {
            nodes {
              theme
            }
          }
          siteModules(condition: { name: "legal_terms_module" }) {
            nodes {
              data
            }
          }
        }
      }
    }
  }
`;

type SendEmailParams = {
  email_type: 'invite_email' | 'forgot_password' | 'email_verification';
  email: string;
  invite_type?: number | string;
  invite_token?: string;
  sender_id?: string;
  user_id?: string;
  reset_token?: string;
  email_id?: string;
  verification_token?: string;
};

type GraphQLContext = {
  client: GraphQLClient;
  meta: GraphQLClient;
  databaseId: string;
};

const getRequiredConfigValue = (name: string, value?: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

const createGraphQLClient = (
  url: string,
  {
    authToken,
    hostHeader
  }: {
    authToken?: string;
    hostHeader?: string;
  } = {}
): GraphQLClient => {
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (hostHeader) {
    headers.host = hostHeader;
  }

  return new GraphQLClient(url, { headers });
};

export const sendEmailLink = async (
  params: SendEmailParams,
  context: GraphQLContext,
  sendEmailConfig: SendEmailLinkFunctionConfig = {}
) => {
  const resolved = resolveSendEmailLinkConfig(sendEmailConfig);
  const { client, meta, databaseId } = context;

  const validateForType = (): { missing?: string } | null => {
    switch (params.email_type) {
      case 'invite_email':
        if (!params.invite_token || !params.sender_id) {
          return { missing: 'invite_token_or_sender_id' };
        }
        return null;
      case 'forgot_password':
        if (!params.user_id || !params.reset_token) {
          return { missing: 'user_id_or_reset_token' };
        }
        return null;
      case 'email_verification':
        if (!params.email_id || !params.verification_token) {
          return { missing: 'email_id_or_verification_token' };
        }
        return null;
      default:
        return { missing: 'email_type' };
    }
  };

  if (!params.email_type) {
    return { missing: 'email_type' };
  }
  if (!params.email) {
    return { missing: 'email' };
  }

  const typeValidation = validateForType();
  if (typeValidation) {
    return typeValidation;
  }

  const databaseInfo = await meta.request<any>(GetDatabaseInfo, {
    databaseId
  });

  const site = databaseInfo?.database?.sites?.nodes?.[0];
  if (!site) {
    throw new Error('Site not found for database');
  }

  const legalTermsModule = site.siteModules?.nodes?.[0];
  const domainNode = site.domains?.nodes?.[0];
  const theme = site.siteThemes?.nodes?.[0]?.theme;

  if (!legalTermsModule || !domainNode || !theme) {
    throw new Error('Missing site configuration for email');
  }

  const subdomain = domainNode.subdomain;
  const domain = domainNode.domain;
  const supportEmail = legalTermsModule.data.emails.support;
  const logo = site.logo?.url;
  const company = legalTermsModule.data.company;
  const website = company.website;
  const nick = company.nick;
  const name = company.name;
  const primary = theme.primary;

  const hostname = subdomain ? [subdomain, domain].join('.') : domain;

  // Treat localhost-style hosts specially so we can generate
  // http://localhost[:port]/... links for local dev without
  // breaking production URLs.
  const isLocalHost =
    hostname.startsWith('localhost') ||
    hostname.startsWith('0.0.0.0') ||
    hostname.endsWith('.localhost');

  // Optional: LOCAL_APP_PORT lets you attach a port for local dashboards
  // e.g. LOCAL_APP_PORT=3000 -> http://localhost:3000
  // It is ignored for non-local hostnames. Only allow on DRY RUNs
  const localPort =
    isLocalHost && resolved.isDryRun && resolved.localAppPort
      ? `:${resolved.localAppPort}`
      : '';

  // Use http only for local dry-run to avoid browser TLS warnings
  // in dev; production stays https.
  const protocol = isLocalHost && resolved.isDryRun ? 'http' : 'https';
  const url = new URL(`${protocol}://${hostname}${localPort}`);

  let subject: string;
  let subMessage: string;
  let linkText: string;

  let inviterName: string | undefined;

  switch (params.email_type) {
    case 'invite_email': {
      if (!params.invite_token || !params.sender_id) {
        return { missing: 'invite_token_or_sender_id' };
      }
      url.pathname = 'register';
      url.searchParams.append('invite_token', params.invite_token);
      url.searchParams.append('email', params.email);

      const scope = Number(params.invite_type) === 2 ? 'org' : 'app';
      url.searchParams.append('type', scope);

      const inviter = await client.request<any>(GetUser, {
        userId: params.sender_id
      });
      inviterName = inviter?.user?.displayName;

      if (inviterName) {
        subject = `${inviterName} invited you to ${nick}!`;
        subMessage = `You've been invited to ${nick}`;
      } else {
        subject = `Welcome to ${nick}!`;
        subMessage = `You've been invited to ${nick}`;
      }
      linkText = 'Join Us';
      break;
    }
    case 'forgot_password': {
      if (!params.user_id || !params.reset_token) {
        return { missing: 'user_id_or_reset_token' };
      }
      url.pathname = 'reset-password';
      url.searchParams.append('role_id', params.user_id);
      url.searchParams.append('reset_token', params.reset_token);
      subject = `${nick} Password Reset Request`;
      subMessage = 'Click below to reset your password';
      linkText = 'Reset Password';
      break;
    }
    case 'email_verification': {
      if (!params.email_id || !params.verification_token) {
        return { missing: 'email_id_or_verification_token' };
      }
      url.pathname = 'verify-email';
      url.searchParams.append('email_id', params.email_id);
      url.searchParams.append('verification_token', params.verification_token);
      subject = `${nick} Email Verification`;
      subMessage = 'Please confirm your email address';
      linkText = 'Confirm Email';
      break;
    }
    default:
      return false;
  }

  const link = url.href;

  const html = generate({
    title: subject,
    link,
    linkText,
    message: subject,
    subMessage,
    bodyBgColor: 'white',
    headerBgColor: 'white',
    messageBgColor: 'white',
    messageTextColor: '#414141',
    messageButtonBgColor: primary,
    messageButtonTextColor: 'white',
    companyName: name,
    supportEmail,
    website,
    logo,
    headerImageProps: {
      alt: 'logo',
      align: 'center',
      border: 'none',
      width: '162px',
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingTop: '0'
    }
  });

  if (resolved.isDryRun) {
    logger.info('DRY RUN email (skipping send)', {
      email_type: params.email_type,
      email: params.email,
      subject,
      link
    });
  } else {
    const sendEmail = resolved.useSmtp ? sendSmtp : getPostmasterSend();
    await sendEmail({
      to: params.email,
      subject,
      html
    });
  }

  return {
    complete: true,
    ...(resolved.isDryRun ? { dryRun: true } : null)
  };
};

const createSendEmailLinkApp = (
  sendEmailConfig: SendEmailLinkFunctionConfig = {}
) => {
  const resolved = resolveSendEmailLinkConfig(sendEmailConfig);
  const app = createJobApp();

  // HTTP/Knative entrypoint (used by @constructive-io/knative-job-fn wrapper)
  app.post('/', async (req: any, res: any, next: any) => {
    try {
      const params = (req.body || {}) as SendEmailParams;

      const databaseId =
        req.get('X-Database-Id') ||
        req.get('x-database-id') ||
        resolved.defaultDatabaseId;
      if (!databaseId) {
        return res.status(400).json({
          error: 'Missing X-Database-Id header or DEFAULT_DATABASE_ID'
        });
      }

      const graphqlUrl = getRequiredConfigValue(
        'GRAPHQL_URL',
        resolved.graphqlUrl
      );
      const metaGraphqlUrl = resolved.metaGraphqlUrl || graphqlUrl;

      const client = createGraphQLClient(graphqlUrl, {
        authToken: resolved.graphqlAuthToken,
        hostHeader: resolved.graphqlHostHeader
      });
      const meta = createGraphQLClient(metaGraphqlUrl, {
        authToken: resolved.graphqlAuthToken,
        hostHeader: resolved.metaGraphqlHostHeader
      });

      const result = await sendEmailLink(
        params,
        {
          client,
          meta,
          databaseId
        },
        sendEmailConfig
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return app;
};

const app = createSendEmailLinkApp();

export { createSendEmailLinkApp };
export default app;

// When executed directly (e.g. via `node dist/index.js`), start an HTTP server.
if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  // @constructive-io/knative-job-fn exposes a .listen method that delegates to the Express app
  (app as any).listen(port, () => {
    logger.info(`listening on port ${port}`);
  });
}
