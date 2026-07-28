export type PlaneEndpoints = { admin: string; auth: string; app: string };

// Codegen and the Next.js dev server default every per-DB vhost to
// *-<db>.localhost:3000, which only exists on a local backend. Derive the real
// vhosts from the api endpoint the binding belongs to by swapping its first
// host label (api.launchql.dev -> admin-<db>.launchql.dev) — the same scheme
// context.ts uses for the data plane. The app DATA plane is `api-<db>`, not
// `app-<db>` (SUBDOMAIN-001).
export function derivePlaneEndpoints(
  apiEndpoint: string,
  databaseName: string,
): PlaneEndpoints | undefined {
  const derive = (label: string): string | undefined => {
    try {
      const url = new URL(apiEndpoint);
      const labels = url.hostname.split('.');
      labels[0] = `${label}-${databaseName}`;
      url.hostname = labels.join('.');
      return url.toString();
    } catch {
      return undefined;
    }
  };
  const admin = derive('admin');
  const auth = derive('auth');
  const app = derive('api');
  return admin && auth && app ? { admin, auth, app } : undefined;
}

// The template's graphql-codegen.config.ts honors CODEGEN_*_ENDPOINT for the
// URL and CODEGEN_*_HOST for the Host header; set both so scheme and routing
// stay in sync on any backend.
export function codegenEndpointEnv(planes: PlaneEndpoints): Record<string, string> {
  return {
    CODEGEN_ADMIN_ENDPOINT: planes.admin,
    CODEGEN_ADMIN_HOST: new URL(planes.admin).host,
    CODEGEN_AUTH_ENDPOINT: planes.auth,
    CODEGEN_AUTH_HOST: new URL(planes.auth).host,
    CODEGEN_APP_ENDPOINT: planes.app,
    CODEGEN_APP_HOST: new URL(planes.app).host,
  };
}

// .env.local for the dev server: the template's runtime config falls back to
// localhost vhosts unless NEXT_PUBLIC_*_ENDPOINT overrides are present.
export function envLocalContent(
  databaseName: string,
  planes: PlaneEndpoints | undefined,
): string {
  const lines = [`NEXT_PUBLIC_DB_NAME=${databaseName}`];
  if (planes) {
    lines.push(
      `NEXT_PUBLIC_ADMIN_ENDPOINT=${planes.admin}`,
      `NEXT_PUBLIC_AUTH_ENDPOINT=${planes.auth}`,
      `NEXT_PUBLIC_APP_ENDPOINT=${planes.app}`,
    );
  }
  return `${lines.join('\n')}\n`;
}
