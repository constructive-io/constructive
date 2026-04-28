#!/usr/bin/env node

import path from 'node:path';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  makeRunId,
  postJson,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId());
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);

const tenantCount = Number.parseInt(getArgValue(args, '--tenant-count', '10'), 10);
const userPassword = getArgValue(args, '--user-password', 'Constructive!23456');
const userPrefix = getArgValue(args, '--user-prefix', `mtlt-${Date.now()}`);
const orgPrefix = getArgValue(args, '--org-prefix', `mtlt-org-${Date.now()}`);

const routeHost = getArgValue(args, '--route-host', 'localhost');
const privateApiName = getArgValue(args, '--private-api-name', 'private');
const privateDatabaseId = getArgValue(args, '--private-database-id', '028752cb-510b-1438-2f39-64534bd1cbd7');

const adminEmail = getArgValue(args, '--admin-email', 'admin@constructive.io');
const adminPassword = getArgValue(args, '--admin-password', 'admin123!@Constructive');

const routeHeaders = {
  Host: routeHost,
  'X-Api-Name': privateApiName,
  'X-Database-Id': privateDatabaseId,
};

const gql = async ({ query, variables, headers = {} }) => {
  return await postJson({
    url: `${baseUrl}/graphql`,
    headers: {
      ...routeHeaders,
      ...headers,
    },
    payload: { query, variables },
    timeoutMs: 20000,
  });
};

const signInMutation = `
mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    result {
      id
      userId
      accessToken
    }
  }
}
`;

const signUpMutation = `
mutation SignUp($input: SignUpInput!) {
  signUp(input: $input) {
    result {
      id
      userId
      accessToken
    }
  }
}
`;

const createUserMutation = `
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      type
      displayName
    }
  }
}
`;

const createOrgMembershipMutation = `
mutation CreateOrgMembership($input: CreateOrgMembershipInput!) {
  createOrgMembership(input: $input) {
    orgMembership {
      id
      actorId
      entityId
      isOwner
      isAdmin
      isActive
      isApproved
    }
  }
}
`;

const signInAdmin = async () => {
  const res = await gql({
    query: signInMutation,
    variables: {
      input: {
        email: adminEmail,
        password: adminPassword,
        rememberMe: true,
      },
    },
  });

  const token = res.json?.data?.signIn?.result?.accessToken;
  const userId = res.json?.data?.signIn?.result?.userId;
  if (!res.ok || !token || !userId) {
    throw new Error(
      `Admin sign-in failed for ${adminEmail}; status=${res.status}; error=${
        res.error || res.json?.errors?.[0]?.message || 'no token returned'
      }`,
    );
  }

  return { token, userId };
};

const signUpOrSignInUser = async ({ email, password }) => {
  const signUpRes = await gql({
    query: signUpMutation,
    variables: {
      input: {
        email,
        password,
        rememberMe: true,
      },
    },
  });

  const signUpResult = signUpRes.json?.data?.signUp?.result;
  if (signUpRes.ok && signUpResult?.accessToken && signUpResult?.userId) {
    return {
      mode: 'signUp',
      userId: signUpResult.userId,
      tokenId: signUpResult.id,
      accessToken: signUpResult.accessToken,
    };
  }

  const signInRes = await gql({
    query: signInMutation,
    variables: {
      input: {
        email,
        password,
        rememberMe: true,
      },
    },
  });

  const signInResult = signInRes.json?.data?.signIn?.result;
  if (signInRes.ok && signInResult?.accessToken && signInResult?.userId) {
    return {
      mode: 'signIn',
      userId: signInResult.userId,
      tokenId: signInResult.id,
      accessToken: signInResult.accessToken,
    };
  }

  throw new Error(
    `User auth failed for ${email}; signUpError=${
      signUpRes.error || signUpRes.json?.errors?.[0]?.message || 'null result'
    }; signInError=${signInRes.error || signInRes.json?.errors?.[0]?.message || 'null result'}`,
  );
};

const createOrg = async ({ adminToken, displayName }) => {
  const res = await gql({
    query: createUserMutation,
    headers: { Authorization: `Bearer ${adminToken}` },
    variables: {
      input: {
        user: {
          displayName,
          type: 2,
        },
      },
    },
  });

  const user = res.json?.data?.createUser?.user;
  if (!res.ok || !user?.id) {
    throw new Error(
      `Create org failed (${displayName}); status=${res.status}; error=${
        res.error || res.json?.errors?.[0]?.message || 'null result'
      }`,
    );
  }

  return user;
};

const createMembership = async ({ adminToken, actorId, entityId }) => {
  const res = await gql({
    query: createOrgMembershipMutation,
    headers: { Authorization: `Bearer ${adminToken}` },
    variables: {
      input: {
        orgMembership: {
          actorId,
          entityId,
          isOwner: true,
          isAdmin: true,
          isActive: true,
          isApproved: true,
        },
      },
    },
  });

  const membership = res.json?.data?.createOrgMembership?.orgMembership;
  if (!res.ok || !membership?.id) {
    throw new Error(
      `Create org membership failed actor=${actorId} entity=${entityId}; status=${res.status}; error=${
        res.error || res.json?.errors?.[0]?.message || 'null result'
      }`,
    );
  }

  return membership;
};

const main = async () => {
  if (!Number.isFinite(tenantCount) || tenantCount < 1) {
    throw new Error(`Invalid --tenant-count: ${tenantCount}`);
  }

  const dirs = await ensureRunDirs(runDir);
  const admin = await signInAdmin();

  const manifest = [];
  const credentials = [];

  for (let i = 1; i <= tenantCount; i += 1) {
    const idx = String(i).padStart(2, '0');
    const orgDisplayName = `${orgPrefix}-${idx}`;
    const email = `${userPrefix}-${idx}@example.com`;

    const org = await createOrg({ adminToken: admin.token, displayName: orgDisplayName });
    const user = await signUpOrSignInUser({ email, password: userPassword });
    const membership = await createMembership({
      adminToken: admin.token,
      actorId: user.userId,
      entityId: org.id,
    });

    manifest.push({
      tenantKey: `org:${org.id}`,
      orgId: org.id,
      orgDisplayName,
      userId: user.userId,
      userEmail: email,
      userAuthMode: user.mode,
      membershipId: membership.id,
    });

    credentials.push({
      tenantKey: `org:${org.id}`,
      email,
      password: userPassword,
      host: routeHost,
      apiName: privateApiName,
      databaseId: privateDatabaseId,
    });
  }

  const manifestPath = path.join(dirs.dataDir, 'tenant-manifest.json');
  const credentialsPath = path.join(dirs.dataDir, 'tenant-credentials.json');
  const summaryPath = path.join(dirs.reportsDir, 'seed-summary.json');

  await writeJson(manifestPath, manifest);
  await writeJson(credentialsPath, credentials);
  await writeJson(summaryPath, {
    createdAt: new Date().toISOString(),
    runDir,
    tenantCount,
    route: routeHeaders,
    adminUserId: admin.userId,
    manifestPath,
    credentialsPath,
  });

  console.log(
    JSON.stringify(
      {
        runDir,
        tenantCount,
        manifestPath,
        credentialsPath,
        summaryPath,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
