import { promises as fs } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { PgClientLike } from '@constructive-io/job-utils';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('jobs:secrets');

export interface SecretRef {
  providerRef: string;
  providerConfig: any;
}

export interface SecretProvider {
  getSecret(ref: SecretRef): Promise<string>;
}

async function httpJson(
  method: string,
  urlStr: string,
  body?: any,
  extraHeaders: Record<string, string> = {}
): Promise<any> {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  const payload = body !== undefined ? JSON.stringify(body) : undefined;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (payload) {
    headers['Content-Length'] = String(Buffer.byteLength(payload));
  }

  return await new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : isHttps ? 443 : 80,
        path: url.pathname + url.search,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode} – ${data}`));
          }
          if (!data) {
            resolve(undefined);
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(undefined);
          }
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

class OpenBaoSecretProvider implements SecretProvider {
  private vaultAddress: string;
  private mountPath: string;
  private role: string | undefined;
  private kubernetesAuthPath: string;
  private runtimeToken: string | undefined;

  constructor(config: any) {
    const envVaultAddress =
      process.env.OPENBAO_ADDR || process.env.VAULT_ADDR || '';
    const envMountPath = process.env.OPENBAO_MOUNT_PATH;
    const envRole = process.env.OPENBAO_ROLE;
    const envK8sAuthPath = process.env.OPENBAO_KUBERNETES_AUTH_PATH;
 
    this.vaultAddress = (config && config.vaultAddress) || envVaultAddress;
    this.mountPath = (config && config.mountPath) || envMountPath || 'kv/apps';
    this.role = (config && config.role) || envRole;
    this.kubernetesAuthPath =
      (config && config.kubernetesAuthPath) || envK8sAuthPath || 'auth/kubernetes';
 
    // Runtime token can be scoped differently from any management token.
    const configToken =
      (config && (config.runtimeToken || config.token)) || undefined;
 
    this.runtimeToken =
      configToken ||
      process.env.OPENBAO_RUNTIME_TOKEN ||
      process.env.VAULT_RUNTIME_TOKEN ||
      process.env.OPENBAO_MANAGEMENT_TOKEN ||
      process.env.VAULT_TOKEN;
 
    if (!this.vaultAddress) {
      throw new Error('OpenBao vaultAddress is not configured');
    }
 
    this.vaultAddress = this.vaultAddress.replace(/\/$/, '');
  }


  private async getClientToken(): Promise<string> {
    if (this.runtimeToken) {
      return this.runtimeToken;
    }
 
    // In non-Kubernetes environments, we may intentionally rely on
    // a static token or local dev instance. To avoid noisy failures
    // when no ServiceAccount token is present, fall back to a
    // development default if explicitly configured.
    const devToken = process.env.OPENBAO_DEV_TOKEN;
    if (devToken) {
      return devToken;
    }
 
    const tokenPath =
      process.env.KUBERNETES_SERVICE_ACCOUNT_TOKEN_PATH ||
      '/var/run/secrets/kubernetes.io/serviceaccount/token';
 
    let jwt: string;
    try {
      jwt = await fs.readFile(tokenPath, 'utf8');
    } catch (err) {
      throw new Error(
        `Failed to read Kubernetes ServiceAccount token at ${tokenPath}: ${String(
          err
        )}`
      );
    }
 
    if (!this.role) {
      throw new Error(
        'OpenBao role is required for Kubernetes auth when no runtime token is set'
      );
    }


    const loginUrl = `${this.vaultAddress}/v1/${this.kubernetesAuthPath.replace(
      /^\/+|\/+$/g,
      ''
    )}/login`;

    const response = await httpJson('POST', loginUrl, {
      role: this.role,
      jwt
    });

    const token = response?.auth?.client_token as string | undefined;
    if (!token) {
      throw new Error('OpenBao auth response missing client_token');
    }

    return token;
  }

  private async getMountPath(): Promise<string> {
    return this.mountPath.replace(/^\/+|\/+$/g, '');
  }

  async getSecret(ref: SecretRef): Promise<string> {
    const token = await this.getClientToken();
    const mountPath = await this.getMountPath();
    const url = `${this.vaultAddress}/v1/${mountPath}/data/${ref.providerRef}`;

    const response = await httpJson(
      'GET',
      url,
      undefined,
      {
        'X-Vault-Token': token
      }
    );

    const value =
      response?.data?.data?.value ?? response?.data?.value ?? null;

    if (typeof value !== 'string') {
      throw new Error('Unexpected OpenBao secret payload shape');
    }

    return value;
  }
}

function getSecretProvider(
  providerType: string,
  providerConfig: any
): SecretProvider {
  const normalizedType = providerType.toLowerCase();
  if (normalizedType === 'openbao' || normalizedType === 'vault') {
    return new OpenBaoSecretProvider(providerConfig || {});
  }

  throw new Error(`Unsupported secret provider type: ${providerType}`);
}

export async function resolveSecretsForJob(
  client: PgClientLike,
  jobId: number | string
): Promise<Record<string, string>> {
  const { rows } = await client.query(
    `select key, provider_type, provider_config, provider_ref
       from meta_private.get_job_secrets_metadata($1)`,
    [jobId]
  );

  if (!rows || rows.length === 0) {
    return {};
  }

  const secrets: Record<string, string> = {};

  for (const row of rows as any[]) {
    const provider = getSecretProvider(row.provider_type, row.provider_config);
    try {
      const value = await provider.getSecret({
        providerRef: row.provider_ref,
        providerConfig: row.provider_config
      });
      secrets[row.key] = value;
    } catch (err) {
      log.error('Failed to resolve secret for job', {
        jobId,
        key: row.key,
        providerType: row.provider_type,
        providerRef: row.provider_ref,
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }

  return secrets;
}
