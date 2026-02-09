/**
 * Test App for graphql-codegen hooks
 *
 * Tests the full auth flow (signUp, signIn, signOut) and then
 * exercises authenticated queries/mutations with type-safe select.
 *
 * Run `pnpm codegen` first to generate the hooks from the live API.
 */

import { useState, FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  // Client configuration
  configure,

  // Auth mutation hooks
  useSignUpMutation,
  useSignInMutation,
  useSignOutMutation,

  // Authenticated query hooks
  useCurrentUserQuery,
  useCurrentUserIdQuery,
  useUsersQuery,
  useDatabasesQuery,
  useDatabaseQuery,
  useSchemasQuery,
  useApisQuery,
  useDomainsQuery,

  // Authenticated mutation hooks — Users
  useCreateUserMutation,
  useUpdateUserMutation,

  // Authenticated mutation hooks — Databases
  useCreateDatabaseMutation,
  useUpdateDatabaseMutation,
  useDeleteDatabaseMutation,

  // Authenticated mutation hooks — Schemas, APIs, Sites, Domains
  useCreateSchemaMutation,
  useCreateApiMutation,
  useCreateSiteMutation,
  useCreateDomainMutation,
} from './generated/hooks';

const ENDPOINT = 'http://api.localhost:3000/graphql';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function reconfigureClient(token?: string) {
  configure({
    endpoint: ENDPOINT,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// ---------------------------------------------------------------------------
// Sign Up Form
// ---------------------------------------------------------------------------
function SignUpForm({ onAuth }: { onAuth: (token: string, userId: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { mutate, isPending, error } = useSignUpMutation({
    selection: {
      fields: {
        result: {
          select: {
            accessToken: true,
            userId: true,
            isVerified: true,
          },
        },
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate(
      { input: { email, password } },
      {
        onSuccess: (data) => {
          const result = data.signUp.result;
          if (result?.accessToken) {
            onAuth(result.accessToken, result.userId ?? '');
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3>Sign Up</h3>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
      <button type="submit" disabled={isPending} style={btnStyle}>
        {isPending ? 'Signing up...' : 'Sign Up'}
      </button>
      {error && <p style={errStyle}>{error.message}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sign In Form
// ---------------------------------------------------------------------------
function SignInForm({ onAuth }: { onAuth: (token: string, userId: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { mutate, isPending, error } = useSignInMutation({
    selection: {
      fields: {
        result: {
          select: {
            accessToken: true,
            userId: true,
            isVerified: true,
            totpEnabled: true,
          },
        },
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate(
      { input: { email, password } },
      {
        onSuccess: (data) => {
          // AUTOCOMPLETION TEST: type `data.signIn.result.` — should suggest accessToken, userId, isVerified, totpEnabled
          const result = data.signIn.result;
          if (result?.accessToken) {
            onAuth(result.accessToken, result.userId ?? '');
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3>Sign In</h3>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
      <button type="submit" disabled={isPending} style={btnStyle}>
        {isPending ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <p style={errStyle}>{error.message}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Auth Page (unauthenticated)
// ---------------------------------------------------------------------------
function AuthPage({ onAuth }: { onAuth: (token: string, userId: string) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMode('signin')} style={{ ...tabStyle, fontWeight: mode === 'signin' ? 700 : 400 }}>
          Sign In
        </button>
        <button onClick={() => setMode('signup')} style={{ ...tabStyle, fontWeight: mode === 'signup' ? 700 : 400 }}>
          Sign Up
        </button>
      </div>
      {mode === 'signin' ? <SignInForm onAuth={onAuth} /> : <SignUpForm onAuth={onAuth} />}
    </div>
  );
}

// ===========================================================================
// SECTION: Identity & Profile
// ===========================================================================

function CurrentUser() {
  const { data, isLoading, error } = useCurrentUserQuery({
    selection: { fields: { id: true, username: true, displayName: true, createdAt: true } },
  });

  if (isLoading) return <p>Loading current user...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  // AUTOCOMPLETION TEST: type `data?.currentUser.` — should suggest id, username, displayName, createdAt
  const user = data?.currentUser;

  return (
    <div style={cardStyle}>
      <h3>Current User</h3>
      {user ? (
        <dl style={dlStyle}>
          <dt>ID</dt><dd><code>{user.id}</code></dd>
          <dt>Username</dt><dd>{user.username ?? '—'}</dd>
          <dt>Display Name</dt><dd>{user.displayName ?? '—'}</dd>
          <dt>Created At</dt><dd>{user.createdAt}</dd>
        </dl>
      ) : (
        <p>No user found</p>
      )}
    </div>
  );
}

function CurrentUserId() {
  const { data, isLoading } = useCurrentUserIdQuery();
  if (isLoading) return <p>Loading...</p>;

  return (
    <div style={cardStyle}>
      <h3>Current User ID (scalar)</h3>
      <code>{data?.currentUserId ?? 'null'}</code>
    </div>
  );
}

function UserList() {
  const { data, isLoading, error } = useUsersQuery({
    selection: {
      fields: { id: true, username: true, displayName: true, createdAt: true },
      first: 10,
      orderBy: ['CREATED_AT_DESC'],
    },
  });

  if (isLoading) return <p>Loading users...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  const users = data?.users?.nodes ?? [];

  return (
    <div style={cardStyle}>
      <h3>Users ({users.length})</h3>
      <DataTable
        columns={['Username', 'Display Name', 'Created']}
        rows={users}
        renderRow={(user) => [user.username, user.displayName, user.createdAt]}
      />
    </div>
  );
}

function CreateUserForm() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { mutate, isPending, error, data: result } = useCreateUserMutation({
    selection: { fields: { id: true, username: true, displayName: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate({ username, displayName });
  };

  return (
    <div style={cardStyle}>
      <h3>Create User</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required style={inputStyle} />
        <input placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Creating...' : 'Create'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.createUser.user, null, 2)}</pre>}
    </div>
  );
}

function UpdateUserForm({ userId }: { userId: string }) {
  const [displayName, setDisplayName] = useState('');
  const { mutate, isPending, error, data: result } = useUpdateUserMutation({
    selection: { fields: { id: true, username: true, displayName: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate({ id: userId, patch: { displayName } });
  };

  return (
    <div style={cardStyle}>
      <h3>Update Current User</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="New Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Updating...' : 'Update'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.updateUser.user, null, 2)}</pre>}
    </div>
  );
}

// ===========================================================================
// SECTION: Database Management (full CRUD)
// ===========================================================================

function DatabaseListWithSchemas() {
  const { data, isLoading, error, refetch } = useDatabasesQuery({
    selection: {
      fields: {
        id: true,
        name: true,
        label: true,
        schemaName: true,
        createdAt: true,
        schemas: {
          first: 20,
          filter: {
            isPublic: { equalTo: true },
            schemaName: { startsWithInsensitive: 'app_' },
          },
          orderBy: ['SCHEMA_NAME_ASC'],
          select: {
            id: true,
            name: true,
            schemaName: true,
            isPublic: true,
          },
        },
      },
      first: 10,
      where: {
        and: [
          { name: { includesInsensitive: 'prod' } },
          { createdAt: { greaterThanOrEqualTo: '2026-01-01T00:00:00.000Z' } },
        ],
      },
      orderBy: ['CREATED_AT_DESC'],
    },
  });

  if (isLoading) return <p>Loading databases...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  // AUTOCOMPLETION TEST: type `db.` — should suggest id, name, label, createdAt, schemas
  const databases = data?.databases?.nodes ?? [];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Databases ({databases.length})</h3>
        <button onClick={() => refetch()} style={{ ...btnSmall, background: '#6b7280' }}>Refresh</button>
      </div>
      {databases.length === 0 ? (
        <p>No databases — create one below</p>
      ) : (
        databases.map((db) => (
          <div key={db.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{db.name}</strong>
                {db.label && <span style={{ color: '#6b7280', marginLeft: 8 }}>({db.label})</span>}
                <code style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>{db.id.slice(0, 8)}</code>
              </div>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{db.createdAt}</span>
            </div>
            {/* NESTED RELATION: schemas under this database */}
            {db.schemas?.nodes && db.schemas.nodes.length > 0 && (
              <div style={{ marginLeft: 16, marginTop: 4, fontSize: 13, color: '#4b5563' }}>
                Schemas: {db.schemas.nodes.map((s) => (
                  <span key={s.id} style={{ ...badge, background: s.isPublic ? '#dbeafe' : '#f3f4f6' }}>
                    {s.schemaName ?? s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function DatabaseDetail({ databaseId }: { databaseId: string }) {
  const { data, isLoading, error } = useDatabaseQuery({
    id: databaseId,
    selection: {
      fields: {
        id: true,
        name: true,
        label: true,
        schemaName: true,
        privateSchemaName: true,
        createdAt: true,
        updatedAt: true,
        // NESTED: owner user
        owner: {
          select: { id: true, username: true, displayName: true },
        },
      },
    },
  });

  if (isLoading) return <p>Loading database...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  // AUTOCOMPLETION TEST: type `data?.database.` — should suggest id, name, label, owner, etc.
  const db = data?.database;
  if (!db) return <p>Database not found</p>;

  return (
    <div style={cardStyle}>
      <h3>Database Detail</h3>
      <dl style={dlStyle}>
        <dt>ID</dt><dd><code>{db.id}</code></dd>
        <dt>Name</dt><dd>{db.name}</dd>
        <dt>Label</dt><dd>{db.label ?? '—'}</dd>
        <dt>Public Schema</dt><dd>{db.schemaName ?? '—'}</dd>
        <dt>Private Schema</dt><dd>{db.privateSchemaName ?? '—'}</dd>
        <dt>Owner</dt><dd>{db.owner?.displayName ?? db.owner?.username ?? '—'}</dd>
        <dt>Created</dt><dd>{db.createdAt}</dd>
        <dt>Updated</dt><dd>{db.updatedAt}</dd>
      </dl>
    </div>
  );
}

function CreateDatabaseForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const { mutate, isPending, error, data: result } = useCreateDatabaseMutation({
    selection: { fields: { id: true, name: true, label: true, createdAt: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // AUTOCOMPLETION TEST: mutate arg should suggest ownerId, name, label, schemaName, etc.
    mutate({
      ownerId: userId,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: label || null,
    });
  };

  return (
    <div style={cardStyle}>
      <h3>Create Database</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Database name (e.g. my_app)" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Creating...' : 'Create'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.createDatabase.database, null, 2)}</pre>}
    </div>
  );
}

function UpdateDatabaseForm() {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const { mutate, isPending, error, data: result } = useUpdateDatabaseMutation({
    selection: { fields: { id: true, name: true, label: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // AUTOCOMPLETION TEST: patch should suggest DatabasePatch fields — ownerId, name, label, etc.
    mutate({ id, patch: { label } });
  };

  return (
    <div style={cardStyle}>
      <h3>Update Database</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Database ID" value={id} onChange={(e) => setId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
        <input placeholder="New Label" value={label} onChange={(e) => setLabel(e.target.value)} required style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Updating...' : 'Update'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.updateDatabase.database, null, 2)}</pre>}
    </div>
  );
}

function DeleteDatabaseForm() {
  const [id, setId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { mutate, isPending, error, data: result } = useDeleteDatabaseMutation({
    selection: { fields: { id: true, name: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!confirm) return;
    mutate({ id });
  };

  return (
    <div style={cardStyle}>
      <h3>Delete Database</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Database ID to delete" value={id} onChange={(e) => { setId(e.target.value); setConfirm(false); }} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          Confirm delete
        </label>
        <button type="submit" disabled={isPending || !confirm} style={{ ...btnStyle, background: '#dc2626' }}>
          {isPending ? 'Deleting...' : 'Delete'}
        </button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>Deleted: {JSON.stringify(result.deleteDatabase.database, null, 2)}</pre>}
    </div>
  );
}

// ===========================================================================
// SECTION: Schema & API Management
// ===========================================================================

function SchemaList() {
  const { data, isLoading, error } = useSchemasQuery({
    selection: {
      fields: {
        id: true,
        name: true,
        schemaName: true,
        isPublic: true,
        // NESTED RELATION: parent database
        database: {
          select: { id: true, name: true },
        },
      },
      first: 20,
    },
  });

  if (isLoading) return <p>Loading schemas...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  const schemas = data?.schemas?.nodes ?? [];

  return (
    <div style={cardStyle}>
      <h3>Schemas ({schemas.length})</h3>
      <DataTable
        columns={['Schema Name', 'Display Name', 'Database', 'Public']}
        rows={schemas}
        renderRow={(s) => [
          s.schemaName,
          s.name,
          s.database?.name ?? '—',
          s.isPublic ? 'Yes' : 'No',
        ]}
      />
    </div>
  );
}

function CreateSchemaForm() {
  const [databaseId, setDatabaseId] = useState('');
  const [name, setName] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const { mutate, isPending, error, data: result } = useCreateSchemaMutation({
    selection: { fields: { id: true, name: true, schemaName: true, isPublic: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // AUTOCOMPLETION TEST: mutate arg should suggest databaseId, name, schemaName, label, isPublic, etc.
    mutate({
      databaseId,
      name,
      schemaName: schemaName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    });
  };

  return (
    <div style={cardStyle}>
      <h3>Create Schema</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Database ID" value={databaseId} onChange={(e) => setDatabaseId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
        <input placeholder="Display Name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input placeholder="Schema identifier (e.g. app_public)" value={schemaName} onChange={(e) => setSchemaName(e.target.value)} required style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Creating...' : 'Create'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.createSchema.schema, null, 2)}</pre>}
    </div>
  );
}

function ApiList() {
  const { data, isLoading, error } = useApisQuery({
    selection: {
      fields: {
        id: true,
        name: true,
        dbname: true,
        roleName: true,
        anonRole: true,
        isPublic: true,
        // NESTED RELATION: parent database
        database: {
          select: { id: true, name: true },
        },
      },
      first: 20,
    },
  });

  if (isLoading) return <p>Loading APIs...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  const apis = data?.apis?.nodes ?? [];

  return (
    <div style={cardStyle}>
      <h3>APIs ({apis.length})</h3>
      <DataTable
        columns={['Name', 'DB Name', 'Role', 'Database', 'Public']}
        rows={apis}
        renderRow={(api) => [
          api.name,
          api.dbname,
          api.roleName,
          api.database?.name ?? '—',
          api.isPublic ? 'Yes' : 'No',
        ]}
      />
    </div>
  );
}

function CreateApiForm() {
  const [databaseId, setDatabaseId] = useState('');
  const [name, setName] = useState('');
  const { mutate, isPending, error, data: result } = useCreateApiMutation({
    selection: { fields: { id: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // AUTOCOMPLETION TEST: mutate arg should suggest databaseId, name, dbname, roleName, anonRole, isPublic
    mutate({ databaseId, name });
  };

  return (
    <div style={cardStyle}>
      <h3>Create API</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Database ID" value={databaseId} onChange={(e) => setDatabaseId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
        <input placeholder="API Name (e.g. app-public)" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Creating...' : 'Create'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.createApi.api, null, 2)}</pre>}
    </div>
  );
}

// ===========================================================================
// SECTION: Site & Domain Management
// ===========================================================================

function CreateSiteForm() {
  const [databaseId, setDatabaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { mutate, isPending, error, data: result } = useCreateSiteMutation({
    selection: { fields: { id: true, title: true, description: true, dbname: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // AUTOCOMPLETION TEST: mutate arg should suggest databaseId, title, description, favicon, ogImage, etc.
    mutate({ databaseId, title, description: description || null });
  };

  return (
    <div style={cardStyle}>
      <h3>Create Site</h3>
      <form onSubmit={handleSubmit} style={rowForm}>
        <input placeholder="Database ID" value={databaseId} onChange={(e) => setDatabaseId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
        <input placeholder="Site Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
        <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
        <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Creating...' : 'Create'}</button>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.createSite.site, null, 2)}</pre>}
    </div>
  );
}

function DomainList() {
  const { data, isLoading, error } = useDomainsQuery({
    selection: {
      fields: {
        id: true,
        subdomain: true,
        domain: true,
        // NESTED RELATIONS: api and site via FK
        api: { select: { id: true, name: true } },
        site: { select: { id: true, title: true } },
      },
      first: 20,
    },
  });

  if (isLoading) return <p>Loading domains...</p>;
  if (error) return <p style={errStyle}>Error: {error.message}</p>;

  // AUTOCOMPLETION TEST: type `d.` — should suggest id, subdomain, domain, api, site
  const domains = data?.domains?.nodes ?? [];

  return (
    <div style={cardStyle}>
      <h3>Domains ({domains.length})</h3>
      <DataTable
        columns={['Subdomain', 'Domain', 'API', 'Site']}
        rows={domains}
        renderRow={(d) => [
          d.subdomain ?? '—',
          d.domain ?? '—',
          d.api?.name ?? '—',
          d.site?.title ?? '—',
        ]}
      />
    </div>
  );
}

function CreateDomainForm() {
  const [databaseId, setDatabaseId] = useState('');
  const [apiId, setApiId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [domain, setDomain] = useState('');
  const { mutate, isPending, error, data: result } = useCreateDomainMutation({
    selection: { fields: { id: true, subdomain: true, domain: true } },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // AUTOCOMPLETION TEST: mutate arg should suggest databaseId, apiId, siteId, subdomain, domain
    mutate({ databaseId, apiId, siteId, subdomain, domain });
  };

  return (
    <div style={cardStyle}>
      <h3>Create Domain</h3>
      <form onSubmit={handleSubmit} style={{ ...formStyle, maxWidth: 'none' }}>
        <div style={rowForm}>
          <input placeholder="Database ID" value={databaseId} onChange={(e) => setDatabaseId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
          <input placeholder="API ID" value={apiId} onChange={(e) => setApiId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
          <input placeholder="Site ID" value={siteId} onChange={(e) => setSiteId(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
        </div>
        <div style={rowForm}>
          <input placeholder="Subdomain (e.g. api)" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} style={inputStyle} />
          <input placeholder="Domain (e.g. example.com)" value={domain} onChange={(e) => setDomain(e.target.value)} style={inputStyle} />
          <button type="submit" disabled={isPending} style={btnStyle}>{isPending ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
      {error && <p style={errStyle}>{error.message}</p>}
      {result && <pre style={preStyle}>{JSON.stringify(result.createDomain.domain, null, 2)}</pre>}
    </div>
  );
}

// ===========================================================================
// Shared: Generic data table component
// ===========================================================================

function DataTable<T extends { id: string }>({
  columns,
  rows,
  renderRow,
}: {
  columns: string[];
  rows: T[];
  renderRow: (row: T) => (string | boolean | null | undefined)[];
}) {
  if (rows.length === 0) return <p style={{ color: '#9ca3af' }}>None</p>;

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col} style={thStyle}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {renderRow(row).map((cell, i) => (
              <td key={i} style={tdStyle}>{cell ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ===========================================================================
// Authenticated Dashboard
// ===========================================================================

function Dashboard({ token, userId, onSignOut }: { token: string; userId: string; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const [activeDbId, setActiveDbId] = useState<string | null>(null);

  const { mutate: signOut, isPending: signingOut } = useSignOutMutation({
    selection: {
      fields: {
        clientMutationId: true,
      },
    },
    onSuccess: () => {
      queryClient.clear();
      onSignOut();
    },
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>Authenticated</span>
          <code style={{ marginLeft: 12, fontSize: 12, color: '#666' }}>{token.slice(0, 20)}...</code>
        </div>
        <button onClick={() => signOut({ input: {} })} disabled={signingOut} style={{ ...btnStyle, background: '#dc2626' }}>
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>

      {/* Identity & Profile */}
      <SectionHeader title="Identity & Profile" />
      <CurrentUser />
      <CurrentUserId />

      {/* Users */}
      <SectionHeader title="Users" />
      <UserList />
      <CreateUserForm />
      <UpdateUserForm userId={userId} />

      {/* Database Management */}
      <SectionHeader title="Database Management" />
      <DatabaseListWithSchemas />
      <CreateDatabaseForm userId={userId} />
      <UpdateDatabaseForm />
      <DeleteDatabaseForm />

      {/* Database Detail (enter an ID to inspect) */}
      <div style={cardStyle}>
        <h3>Inspect Database (findOne)</h3>
        <div style={rowForm}>
          <input
            placeholder="Paste a database ID to inspect"
            value={activeDbId ?? ''}
            onChange={(e) => setActiveDbId(e.target.value || null)}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, flex: 1 }}
          />
        </div>
      </div>
      {activeDbId && <DatabaseDetail databaseId={activeDbId} />}

      {/* Schemas & APIs */}
      <SectionHeader title="Schemas & APIs" />
      <SchemaList />
      <CreateSchemaForm />
      <ApiList />
      <CreateApiForm />

      {/* Sites & Domains */}
      <SectionHeader title="Sites & Domains" />
      <CreateSiteForm />
      <DomainList />
      <CreateDomainForm />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 8, marginTop: 32, marginBottom: 16 }}>
      {title}
    </h2>
  );
}

// ===========================================================================
// Main App
// ===========================================================================

export default function App() {
  const [auth, setAuth] = useState<{ token: string; userId: string } | null>(null);
  const queryClient = useQueryClient();

  const handleAuth = (token: string, userId: string) => {
    reconfigureClient(token);
    queryClient.clear();
    setAuth({ token, userId });
  };

  const handleSignOut = () => {
    reconfigureClient();
    setAuth(null);
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>GraphQL Codegen Test App</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Auth flow + CRUD mutations + nested relation queries with type-safe select.
        Open <code>src/App.tsx</code> in your editor to inspect types.
      </p>

      {auth ? (
        <Dashboard token={auth.token} userId={auth.userId} onSignOut={handleSignOut} />
      ) : (
        <AuthPage onAuth={handleAuth} />
      )}
    </div>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  maxWidth: 360,
};

const rowForm: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const btnSmall: React.CSSProperties = {
  padding: '4px 10px',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};

const tabStyle: React.CSSProperties = {
  padding: '6px 16px',
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
};

const errStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: 13,
  marginTop: 4,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const dlStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '4px 16px',
  margin: 0,
  fontSize: 14,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  borderBottom: '2px solid #e5e7eb',
  padding: '6px 8px',
};

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #f3f4f6',
  padding: '6px 8px',
};

const preStyle: React.CSSProperties = {
  background: '#f9fafb',
  padding: 12,
  borderRadius: 6,
  fontSize: 12,
  overflow: 'auto',
  marginTop: 8,
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 12,
  marginRight: 4,
};
