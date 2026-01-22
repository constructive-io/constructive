import { createJobApp } from '@constructive-io/knative-job-fn';
import { generate } from '@launchql/mjml';
import { send as sendPostmaster } from '@launchql/postmaster';
import { parseEnvBoolean } from '@pgpmjs/env';
import { createLogger } from '@pgpmjs/logger';
import { GraphQLClient } from 'graphql-request';
import gql from 'graphql-tag';
import { send as sendSmtp } from 'simple-smtp-server';

const isDryRun = parseEnvBoolean(process.env.SEND_EMAIL_LINK_DRY_RUN) ?? false;
const useSmtp = parseEnvBoolean(process.env.EMAIL_SEND_USE_SMTP) ?? false;
const logger = createLogger('send-email-link');
const app = createJobApp();

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

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

// Maximum logo size to embed as base64 (50 KB)
const MAX_LOGO_SIZE_BYTES = 50 * 1024;

/**
 * Validates that a URL is safe to fetch (prevents SSRF attacks).
 * @param urlString - The URL to validate
 * @returns true if the URL is safe to fetch, false otherwise
 */
const isUrlSafeToFetch = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);

    // Only allow HTTP and HTTPS protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      logger.warn('Blocked URL with disallowed protocol', { url: urlString, protocol: url.protocol });
      return false;
    }

    // Get hostname for IP validation
    const hostname = url.hostname.toLowerCase();

    // Block localhost and local hostnames
    const localHostnames = ['localhost', '0.0.0.0', '127.0.0.1'];
    if (localHostnames.includes(hostname) || hostname.endsWith('.localhost')) {
      logger.warn('Blocked URL pointing to localhost', { url: urlString, hostname });
      return false;
    }

    // Block private IP ranges using regex patterns
    // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (link-local)
    const ipv4PrivateRanges = [
      /^10\./,                      // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 (matches 172.16-31.x.x)
      /^192\.168\./,                // 192.168.0.0/16
      /^169\.254\./,                // 169.254.0.0/16 (link-local/cloud metadata)
      /^127\./                      // 127.0.0.0/8 (loopback)
    ];

    for (const pattern of ipv4PrivateRanges) {
      if (pattern.test(hostname)) {
        logger.warn('Blocked URL pointing to private IP range', { url: urlString, hostname });
        return false;
      }
    }

    // Block IPv6 localhost and link-local addresses
    if (hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
      logger.warn('Blocked URL pointing to private IPv6 address', { url: urlString, hostname });
      return false;
    }

    return true;
  } catch {
    // Invalid URL
    logger.warn('Invalid URL format', { url: urlString });
    return false;
  }
};

/**
 * Fetches an image and returns it as a base64 data URI.
 * This bypasses email client image proxies that may not handle SVG.
 * Falls back to original URL if image is too large or fetch fails.
 * Validates URLs to prevent SSRF attacks.
 */
const fetchLogoAsBase64 = async (url: string | undefined): Promise<string | undefined> => {
  if (!url) return undefined;

  // Validate URL to prevent SSRF attacks
  if (!isUrlSafeToFetch(url)) {
    logger.warn('Blocked unsafe URL for logo fetch', { url });
    return undefined;
  }
  // Add timeout to prevent hanging on unresponsive servers
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) return url;

    const buffer = await response.arrayBuffer();

    // Skip base64 for large images to avoid bloating emails
    if (buffer.byteLength > MAX_LOGO_SIZE_BYTES) {
      logger.debug('Logo too large for base64 embedding, using original URL', {
        url,
        size: buffer.byteLength,
        maxSize: MAX_LOGO_SIZE_BYTES
      });
      return url;
    }

    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch {
    logger.warn('Failed to fetch logo for base64 encoding, using original URL', { url });
    return url;
  } finally {
    clearTimeout(timeoutId);
  }
};

type GraphQLClientOptions = {
  hostHeaderEnvVar?: string;
  databaseId?: string;
  useMetaSchema?: boolean;
  apiName?: string;
  schemata?: string;
};

// TODO: Consider moving this to @constructive-io/knative-job-fn as a shared
// utility so all job functions can create GraphQL clients with consistent
// header-based routing without duplicating this logic.
const createGraphQLClient = (
  url: string,
  options: GraphQLClientOptions = {}
): GraphQLClient => {
  const headers: Record<string, string> = {};

  if (process.env.GRAPHQL_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GRAPHQL_AUTH_TOKEN}`;
  }

  const envName = options.hostHeaderEnvVar || 'GRAPHQL_HOST_HEADER';
  const hostHeader = process.env[envName];
  if (hostHeader) {
    headers.host = hostHeader;
  }

  // Header-based routing for internal cluster services (API_IS_PUBLIC=false)
  if (options.databaseId) {
    headers['X-Database-Id'] = options.databaseId;
  }
  if (options.useMetaSchema) {
    headers['X-Meta-Schema'] = 'true';
  }
  if (options.apiName) {
    headers['X-Api-Name'] = options.apiName;
  }
  if (options.schemata) {
    headers['X-Schemata'] = options.schemata;
  }

  return new GraphQLClient(url, { headers });
};

export const sendEmailLink = async (
  params: SendEmailParams,
  context: GraphQLContext
) => {
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
  const logo = await fetchLogoAsBase64(site.logo?.url);
  const company = legalTermsModule.data.company;
  const website = company.website;
  const nick = company.nick;
  const name = company.name;
  const primary = theme.primary;

  // Check if this is a localhost-style domain before building hostname
  // TODO: Security consideration - this only affects localhost domains which
  // should not exist in production. The isLocalHost check combined with isDryRun
  // ensures special behavior (http, custom port) only applies in dev environments.
  const isLocalDomain =
    domain === 'localhost' ||
    domain.startsWith('localhost') ||
    domain === '0.0.0.0';

  // For localhost, skip subdomain to generate cleaner URLs (http://localhost:3000)
  const hostname = subdomain && !isLocalDomain
    ? [subdomain, domain].join('.')
    : domain;

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
    isLocalHost && isDryRun && process.env.LOCAL_APP_PORT
      ? `:${process.env.LOCAL_APP_PORT}`
      : '';

  // Use http only for local dry-run to avoid browser TLS warnings
  // in dev; production stays https.
  const protocol = isLocalHost && isDryRun ? 'http' : 'https';
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

  if (isDryRun) {
    logger.info('DRY RUN email (skipping send)', {
      email_type: params.email_type,
      email: params.email,
      subject,
      link
    });
  } else {
    const sendEmail = useSmtp ? sendSmtp : sendPostmaster;
    await sendEmail({
      to: params.email,
      subject,
      html
    });
  }

  return {
    complete: true,
    ...(isDryRun ? { dryRun: true } : null)
  };
};

// HTTP/Knative entrypoint (used by @constructive-io/knative-job-fn wrapper)
app.post('/', async (req: any, res: any, next: any) => {
  try {
    const params = (req.body || {}) as SendEmailParams;

    const databaseId =
      req.get('X-Database-Id') || req.get('x-database-id') || process.env.DEFAULT_DATABASE_ID;
    if (!databaseId) {
      return res.status(400).json({ error: 'Missing X-Database-Id header or DEFAULT_DATABASE_ID' });
    }

    const graphqlUrl = getRequiredEnv('GRAPHQL_URL');
    const metaGraphqlUrl = process.env.META_GRAPHQL_URL || graphqlUrl;

    // Get API name or schemata from env (for tenant queries like GetUser)
    const apiName = process.env.GRAPHQL_API_NAME;
    const schemata = process.env.GRAPHQL_SCHEMATA;

    // For GetUser query - needs tenant API access via X-Api-Name or X-Schemata
    const client = createGraphQLClient(graphqlUrl, {
      hostHeaderEnvVar: 'GRAPHQL_HOST_HEADER',
      databaseId,
      ...(apiName && { apiName }),
      ...(schemata && { schemata })
    });

    // For GetDatabaseInfo query - uses same API routing as client
    // The private API exposes both user and database queries
    const meta = createGraphQLClient(metaGraphqlUrl, {
      hostHeaderEnvVar: 'META_GRAPHQL_HOST_HEADER',
      databaseId,
      ...(apiName && { apiName }),
      ...(schemata && { schemata })
    });

    const result = await sendEmailLink(params, {
      client,
      meta,
      databaseId
    });

    // Validation failures return { missing: '...' } - treat as client error
    if (result && typeof result === 'object' && 'missing' in result) {
      return res.status(400).json({ error: `Missing required field: ${result.missing}` });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default app;

// When executed directly (e.g. via `node dist/index.js`), start an HTTP server.
if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);

  // Log startup configuration (non-sensitive values only - no API keys or tokens)
  logger.info('[send-email-link] Starting with config:', {
    port,
    graphqlUrl: process.env.GRAPHQL_URL || 'not set',
    metaGraphqlUrl: process.env.META_GRAPHQL_URL || process.env.GRAPHQL_URL || 'not set',
    apiName: process.env.GRAPHQL_API_NAME || 'not set',
    defaultDatabaseId: process.env.DEFAULT_DATABASE_ID || 'not set',
    dryRun: isDryRun,
    useSmtp,
    mailgunDomain: process.env.MAILGUN_DOMAIN || 'not set',
    mailgunFrom: process.env.MAILGUN_FROM || 'not set',
    localAppPort: process.env.LOCAL_APP_PORT || 'not set',
    hasAuthToken: !!process.env.GRAPHQL_AUTH_TOKEN
  });

  // @constructive-io/knative-job-fn exposes a .listen method that delegates to the Express app
  (app as any).listen(port, () => {
    logger.info(`listening on port ${port}`);
  });
}
