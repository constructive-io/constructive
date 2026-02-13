/**
 * Compile-time regression checks for React Query + ORM output modes.
 *
 * These checks focus on overload behavior and nested select contextual typing.
 */

import {
  useAppPermissionsGetByMaskQuery,
  useCurrentUserQuery,
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
    },
  });

  const maybeUsername = currentUser.data?.currentUser.username;
  void maybeUsername;

  // @ts-expect-error selection is required
  useUserQuery({ id: '00000000-0000-0000-0000-000000000000' });

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
        username: true,
        ownedDatabases: {
          first: 2,
          select: {
            id: true,
            schemaName: true,
            name: true,
          },
        },
      },
      first: 5,
      orderBy: ['CREATED_AT_DESC'],
    },
  });

  const nestedSchema = users.data?.users.nodes[0]?.ownedDatabases?.nodes[0]?.schemaName;
  void nestedSchema;

  useAppPermissionsGetByMaskQuery({
    variables: { mask: '11', first: 10 },
    enabled: false,
  });
  // @ts-expect-error selection is not available on this custom query
  useAppPermissionsGetByMaskQuery({ selection: { fields: { id: true } } });

  // @ts-expect-error selection is required for custom mutation hooks
  useSignInMutation();

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
    ownedDatabases: {
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
}

async function ormModelTypeChecks() {
  // @ts-expect-error findOne requires explicit select
  ormClient.user.findOne({
    id: '00000000-0000-0000-0000-000000000000',
  });

  const idOnlyBuilder = ormClient.user.findOne({
    id: '00000000-0000-0000-0000-000000000000',
    select: {
      id: true,
    },
  });
  type IdOnlyUser = Awaited<ReturnType<typeof idOnlyBuilder.unwrap>>['user'];
  type _idOnlyOmitsUsername = Assert<NotHasKey<NonNullable<IdOnlyUser>, 'username'>>;

  const explicitlySelected = ormClient.user.findOne({
    id: '00000000-0000-0000-0000-000000000000',
    select: {
      id: true,
      username: true,
      ownedDatabases: {
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
      ownedDatabases: {
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
      ownedDatabases: {
        first: 1,
        select: {
          id: true,
        },
      },
    },
  });
  // @ts-expect-error custom ORM query requires options with select
  ormClient.query.currentUser();

  ormClient.query.appPermissionsGetByMask({});
  // @ts-expect-error appPermissionsGetByMask requires an args object
  ormClient.query.appPermissionsGetByMask();

  ormClient.mutation.signIn(
    {
      input: {
        email: 'dev@example.com',
        password: 'password',
        rememberMe: true,
      },
    },
    {
      select: {
        clientMutationId: true,
        result: {
          select: {
            accessToken: true,
            userId: true,
          },
        },
      },
    },
  );
  // @ts-expect-error custom ORM mutation requires options with select
  ormClient.mutation.signIn({
    input: {
      email: 'dev@example.com',
      password: 'password',
      rememberMe: true,
    },
  });

  const invalidModelSelect = {
    id: true,
    invalidField: true,
  };
  // @ts-expect-error invalid model variable select key should be rejected
  ormClient.user.findMany({ select: invalidModelSelect });

  const invalidNestedModelSelect = {
    ownedDatabases: {
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
    { select: invalidCustomMutationSelect },
  );
}

void hookTypeChecks;
void ormModelTypeChecks;
