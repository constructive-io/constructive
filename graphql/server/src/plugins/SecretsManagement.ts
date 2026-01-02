import type { Request } from 'express';
import type { Plugin } from 'graphile-build';
import { gql, makeExtendSchemaPlugin } from 'graphile-utils';
import type { ClientBase } from 'pg';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

interface SecretsContext {
  pgClient: ClientBase;
  req: Request;
  env: Record<string, any>;
}

interface SecretRef {
  providerRef: string;
  providerConfig: any;
}

interface SecretProvider {
  setSecret(ref: SecretRef, value: string): Promise<void>;
  deleteSecret(ref: SecretRef): Promise<void>;
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
    ...extraHeaders,
  };

  if (payload) {
    headers['Content-Length'] = String(Buffer.byteLength(payload));
  }

  return await new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port
          ? Number(url.port)
          : isHttps
          ? 443
          : 80,
        path: url.pathname + url.search,
        method,
        headers,
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
  private managementToken: string | undefined;

  constructor(config: any) {
    const envVaultAddress =
      process.env.OPENBAO_ADDR || process.env.VAULT_ADDR || '';
    const envMountPath = process.env.OPENBAO_MOUNT_PATH;
    const envRole = process.env.OPENBAO_ROLE;
    const envK8sAuthPath = process.env.OPENBAO_KUBERNETES_AUTH_PATH;

    this.vaultAddress =
      (config && config.vaultAddress) || envVaultAddress;
    this.mountPath = (config && config.mountPath) || envMountPath || 'kv/apps';
    this.role = (config && config.role) || envRole;
    this.kubernetesAuthPath =
      (config && config.kubernetesAuthPath) || envK8sAuthPath || 'auth/kubernetes';
    this.managementToken =
      process.env.OPENBAO_MANAGEMENT_TOKEN || process.env.VAULT_TOKEN;

    if (!this.vaultAddress) {
      throw new Error('OpenBao vaultAddress is not configured');
    }

    this.vaultAddress = this.vaultAddress.replace(/\/$/, '');
  }

  private async getClientToken(): Promise<string> {
    if (this.managementToken) {
      return this.managementToken;
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
        'OpenBao role is required for Kubernetes auth when no management token is set'
      );
    }

    const loginUrl = `${this.vaultAddress}/v1/${this.kubernetesAuthPath.replace(
      /^\/+|\/+$/g,
      ''
    )}/login`;

    const response = await httpJson('POST', loginUrl, {
      role: this.role,
      jwt,
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

  async setSecret(ref: SecretRef, value: string): Promise<void> {
    const token = await this.getClientToken();
    const mountPath = await this.getMountPath();
    const url = `${this.vaultAddress}/v1/${mountPath}/data/${ref.providerRef}`;

    await httpJson(
      'POST',
      url,
      {
        data: {
          value,
        },
      },
      {
        'X-Vault-Token': token,
      }
    );
  }

  async deleteSecret(ref: SecretRef): Promise<void> {
    const token = await this.getClientToken();
    const mountPath = await this.getMountPath();
    const url = `${this.vaultAddress}/v1/${mountPath}/metadata/${ref.providerRef}`;

    await httpJson(
      'DELETE',
      url,
      undefined,
      {
        'X-Vault-Token': token,
      }
    );
  }
}

function getSecretProvider(providerType: string, providerConfig: any): SecretProvider {
  const normalizedType = providerType.toLowerCase();
  if (normalizedType === 'openbao' || normalizedType === 'vault') {
    return new OpenBaoSecretProvider(providerConfig || {});
  }

  throw new Error(`Unsupported secret provider type: ${providerType}`);
}

function mapSecretRow(row: any) {
  if (!row) return null;

  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    appId: row.app_id,
    key: row.key,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rotatedAt: row.rotated_at,
    providerId: row.provider_id,
  };
}

const SecretsManagement: Plugin = makeExtendSchemaPlugin(() => {
  return {
    typeDefs: gql`
      type SecretMetadata {
        id: UUID!
        ownerType: String!
        ownerId: UUID!
        appId: UUID!
        key: String!
        description: String
        isActive: Boolean!
        createdAt: Datetime!
        updatedAt: Datetime!
        rotatedAt: Datetime
        providerId: UUID!
      }

      input CreateSecretInput {
        ownerType: String!
        ownerId: UUID!
        appId: UUID!
        key: String!
        value: String!
        providerId: UUID!
        description: String
      }

      input RotateSecretInput {
        secretId: UUID!
        newValue: String
      }

      input DeleteSecretInput {
        secretId: UUID!
      }

      input ListSecretsInput {
        ownerType: String!
        ownerId: UUID!
        appId: UUID!
      }

      extend type Mutation {
        createSecret(input: CreateSecretInput!): SecretMetadata!
        rotateSecret(input: RotateSecretInput!): SecretMetadata!
        deleteSecret(input: DeleteSecretInput!): Boolean!
      }

      extend type Query {
        secrets(input: ListSecretsInput!): [SecretMetadata!]!
      }
    `,
    resolvers: {
      Mutation: {
        async createSecret(
          _parent: any,
          args: { input: {
            ownerType: string;
            ownerId: string;
            appId: string;
            key: string;
            value: string;
            providerId: string;
            description?: string | null;
          } },
          context: SecretsContext
        ) {
          const { pgClient } = context;
          const {
            ownerType,
            ownerId,
            appId,
            key,
            value,
            providerId,
            description,
          } = args.input;

          const providerResult = await pgClient.query(
            `select id, provider_type, config from meta_public.secret_providers where id = $1 and is_active`,
            [providerId]
          );

          const providerRow = providerResult.rows[0];
          if (!providerRow) {
            throw new Error('SECRET_PROVIDER_NOT_FOUND');
          }

          const providerRef = `app-${appId}/${key.toLowerCase()}`;

          const secretResult = await pgClient.query(
            `select * from meta_public.create_secret_metadata($1, $2, $3, $4, $5, $6, $7)`,
            [
              ownerType,
              ownerId,
              appId,
              key,
              providerRow.id,
              providerRef,
              description ?? null,
            ]
          );

          const secretRow = secretResult.rows[0];
          if (!secretRow) {
            throw new Error('FAILED_TO_CREATE_SECRET_METADATA');
          }

          const provider = getSecretProvider(
            providerRow.provider_type,
            providerRow.config
          );

          await provider.setSecret(
            {
              providerRef: providerRef,
              providerConfig: providerRow.config,
            },
            value
          );

          return mapSecretRow(secretRow);
        },

        async rotateSecret(
          _parent: any,
          args: { input: { secretId: string; newValue?: string | null } },
          context: SecretsContext
        ) {
          const { pgClient } = context;
          const { secretId, newValue } = args.input;

          const existingResult = await pgClient.query(
            `select s.*, sp.provider_type, sp.config as provider_config
             from meta_public.secrets s
             join meta_public.secret_providers sp on sp.id = s.provider_id
             where s.id = $1 and sp.is_active`,
            [secretId]
          );

          const existing = existingResult.rows[0];
          if (!existing) {
            throw new Error('SECRET_NOT_FOUND');
          }

          if (newValue != null) {
            const provider = getSecretProvider(
              existing.provider_type,
              existing.provider_config
            );

            await provider.setSecret(
              {
                providerRef: existing.provider_ref,
                providerConfig: existing.provider_config,
              },
              newValue
            );
          }

          const rotatedResult = await pgClient.query(
            `select * from meta_public.rotate_secret_metadata($1)`,
            [secretId]
          );

          const rotatedRow = rotatedResult.rows[0];
          if (!rotatedRow) {
            throw new Error('FAILED_TO_ROTATE_SECRET_METADATA');
          }

          return mapSecretRow(rotatedRow);
        },

        async deleteSecret(
          _parent: any,
          args: { input: { secretId: string } },
          context: SecretsContext
        ) {
          const { pgClient } = context;
          const { secretId } = args.input;

          const existingResult = await pgClient.query(
            `select s.*, sp.provider_type, sp.config as provider_config
             from meta_public.secrets s
             join meta_public.secret_providers sp on sp.id = s.provider_id
             where s.id = $1 and sp.is_active`,
            [secretId]
          );

          const existing = existingResult.rows[0];
          if (!existing) {
            return false;
          }

          const provider = getSecretProvider(
            existing.provider_type,
            existing.provider_config
          );

          await provider.deleteSecret({
            providerRef: existing.provider_ref,
            providerConfig: existing.provider_config,
          });

          await pgClient.query(
            `select meta_public.delete_secret_metadata($1)`,
            [secretId]
          );

          return true;
        },
      },
      Query: {
        async secrets(
          _parent: any,
          args: { input: {
            ownerType: string;
            ownerId: string;
            appId: string;
          } },
          context: SecretsContext
        ) {
          const { pgClient } = context;
          const { ownerType, ownerId, appId } = args.input;

          const result = await pgClient.query(
            `select *
             from meta_public.secrets
             where owner_type = $1
               and owner_id = $2::uuid
               and app_id = $3::uuid
             order by key_normalized asc`,
            [ownerType, ownerId, appId]
          );

          return result.rows.map(mapSecretRow);
        },
      },
    },
  };
});

export default SecretsManagement;
