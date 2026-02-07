/**
 * Compile-time regression checks for React Query + ORM output modes.
 *
 * These checks focus on overload behavior introduced to recover contextual
 * typing/autocomplete for nested select objects.
 */

import {
  useCurrentUserQuery,
  useGetObjectAtPathQuery,
  useSignInMutation,
  useUserQuery,
  useUsersQuery,
} from '../generated/hooks';
import { createClient } from '../generated/orm';

type Assert<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type NotHasKey<T, K extends PropertyKey> = K extends keyof T ? false : true;

const ormClient = createClient({
  endpoint: 'https://example.invalid/graphql',
});

function hookTypeChecks() {
  const currentUser = useCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        username: true,
      },
    }
  });

  const maybeUsername = currentUser.data?.currentUser.username;
  void maybeUsername;

  const defaultUser = useUserQuery({ id: '00000000-0000-0000-0000-000000000000' });
  const defaultUserId = defaultUser.data?.user?.id;
  void defaultUserId;
  // @ts-expect-error default select for useUserQuery should not expose username
  defaultUser.data?.user?.username;

  const selectedUser = useUserQuery({
    id: '00000000-0000-0000-0000-000000000000',
    selection: {
      fields: {
        id: true,
        username: true,
      },
    },
  });
  const selectedUsername = selectedUser.data?.user?.username;
  void selectedUsername;

  const users = useUsersQuery({
    selection: {
      fields: {
        id: true,
        databasesByOwnerId: {
          first: 2,
          select: {
            id: true,
            schemaName: true,
            name: true
          },
        },
      },
      first: 5,
      orderBy: ['CREATED_AT_DESC'],
    },
  });

  const nestedSchema = users.data?.users.nodes[0]?.databasesByOwnerId?.nodes[0]?.schemaName;
  void nestedSchema;

  // Optional variables + required select args overload (custom query case)
  useGetObjectAtPathQuery({
    variables: undefined,
    selection: {
      fields: {
        id: true,
        data: true,
      },
    },
  });

  const defaultSignIn = useSignInMutation();
  const defaultSignInClientMutationId = defaultSignIn.data?.signIn.clientMutationId;
  void defaultSignInClientMutationId;
  // @ts-expect-error default signIn select should not expose result
  defaultSignIn.data?.signIn.result;

  useSignInMutation({
    selection: {
      fields: {
        clientMutationId: true,
        result: {
          select: {
            accessToken: true,
            accessTokenExpiresAt: true,
            isVerified: true,
            totpEnabled: true,
            userId: true,
          },
        },
      },
    },
  });

  const validSignInSelect = {
    clientMutationId: true,
    result: {
      select: {
        accessToken: true,
        isVerified: true,
        totpEnabled: true,
        userId: true,
      },
    },
  };
  useSignInMutation({ selection: { fields: validSignInSelect } });

  const invalidUsersSelect = {
    id: true,
    invalidField: true,
  };
  // @ts-expect-error invalid variable select key should be rejected
  useUsersQuery({ selection: { fields: invalidUsersSelect } });

  const invalidNestedUsersSelect = {
    databasesByOwnerId: {
      select: {
        id: true,
        doesNotExist: true,
      },
    },
  };
  // @ts-expect-error invalid nested variable select key should be rejected
  useUsersQuery({ selection: { fields: invalidNestedUsersSelect } });

  const invalidCurrentUserSelect = {
    id: true,
    nope: true,
  };
  // @ts-expect-error invalid variable select key should be rejected
  useCurrentUserQuery({ selection: { fields: invalidCurrentUserSelect } });

  const invalidSignInSelect = {
    result: {
      select: {
        accessToken: true,
        nope: true,
      },
    },
  };
  // @ts-expect-error invalid mutation variable select key should be rejected
  useSignInMutation({ selection: { fields: invalidSignInSelect } });

  // @ts-expect-error invalid nested select key should be rejected
  useUsersQuery({
    selection: {
      fields: {
        databasesByOwnerId: {
          select: {
            doesNotExist: true,
          },
        },
      },
    },
  });

  // @ts-expect-error invalid custom query select key should be rejected
  useGetObjectAtPathQuery({
    variables: undefined,
    selection: { fields: { nope: true } },
  });
}

async function ormModelTypeChecks() {
  const defaultBuilder = ormClient.user.findOne({
    id: '00000000-0000-0000-0000-000000000000',
  });
  type DefaultUser = Awaited<ReturnType<typeof defaultBuilder.unwrap>>['user'];
  type _defaultOmitsUsername = Assert<NotHasKey<NonNullable<DefaultUser>, 'username'>>;

  const defaultSelected = await defaultBuilder.unwrapOr({ user: null });

  if (defaultSelected.user) {
    const id: string = defaultSelected.user.id;
    void id;
  }

  const explicitlySelected = ormClient.user.findOne({
    id: '00000000-0000-0000-0000-000000000000',
    select: {
      id: true,
      username: true,
      databasesByOwnerId: {
        first: 1,
        select: {
          id: true,
          schemaName: true,
        },
      },
    },
  });

  type ExplicitUser = Awaited<ReturnType<typeof explicitlySelected.unwrap>>['user'];
  type _explicitHasUsername = Assert<HasKey<NonNullable<ExplicitUser>, 'username'>>;

  ormClient.user.findMany({
    first: 5,
    select: {
      id: true,
      username: true,
      databasesByOwnerId: {
        first: 1,
        select: {
          id: true,
          schemaName: true,
        },
      },
    },
  });

  ormClient.query.currentUser({
    select: {
      id: true,
      username: true,
      databasesByOwnerId: {
        first: 1,
        select: {
          id: true,
        },
      },
    },
  });

  ormClient.query.getObjectAtPath(
    {
      dbId: '00000000-0000-0000-0000-000000000000',
      path: ['root'],
      refname: 'main',
    },
    {
      select: {
        id: true,
      },
    }
  );

  // @ts-expect-error invalid model select key should be rejected
  ormClient.user.findMany({ select: { invalidField: true } });

  // @ts-expect-error invalid custom query select key should be rejected
  ormClient.query.currentUser({ select: { invalidField: true } });

  const invalidModelSelect = {
    id: true,
    invalidField: true,
  };
  // @ts-expect-error invalid model variable select key should be rejected
  ormClient.user.findMany({ select: invalidModelSelect });

  const invalidNestedModelSelect = {
    databasesByOwnerId: {
      select: {
        id: true,
        invalidField: true,
      },
    },
  };
  // @ts-expect-error invalid nested model variable select key should be rejected
  ormClient.user.findMany({ select: invalidNestedModelSelect });

  const invalidCustomQuerySelect = {
    id: true,
    invalidField: true,
  };
  // @ts-expect-error invalid custom query variable select key should be rejected
  ormClient.query.currentUser({ select: invalidCustomQuerySelect });

  const invalidCustomMutationSelect = {
    result: {
      select: {
        accessToken: true,
        invalidField: true,
      },
    },
  };
  ormClient.mutation.signIn(
    {
      input: {
        email: 'dev@example.com',
        password: 'password',
        rememberMe: true,
      },
    },
    // @ts-expect-error invalid custom mutation variable select key should be rejected
    { select: invalidCustomMutationSelect }
  );
}

void hookTypeChecks;
void ormModelTypeChecks;
