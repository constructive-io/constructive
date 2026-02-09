/**
 * Additional compile-time regression checks focused on strict selection behavior.
 */

import { useDatabasesQuery, useSignInMutation } from '../generated/hooks';
import { createClient } from '../generated/orm';

type Assert<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type NotHasKey<T, K extends PropertyKey> = K extends keyof T ? false : true;

const ormClient = createClient({
  endpoint: 'https://example.invalid/graphql',
});

function hookStrictnessChecks() {
  // @ts-expect-error selection.fields is required
  useDatabasesQuery({ selection: { first: 10 } });

  const selectedDatabases = useDatabasesQuery({
    selection: {
      first: 10,
      where: {
        and: [
          { name: { includesInsensitive: 'prod' } },
          { createdAt: { greaterThanOrEqualTo: '2026-01-01T00:00:00.000Z' } },
        ],
      },
      orderBy: ['CREATED_AT_DESC'],
      fields: {
        id: true,
        name: true,
        schemas: {
          first: 5,
          filter: {
            schemaName: { startsWithInsensitive: 'app_' },
            isPublic: { equalTo: true },
          },
          orderBy: ['SCHEMA_NAME_ASC'],
          select: {
            id: true,
            schemaName: true,
            isPublic: true,
          },
        },
      },
    },
  });
  const selectedDatabaseName = selectedDatabases.data?.databases.nodes[0]?.name;
  const selectedNestedSchema = selectedDatabases.data?.databases.nodes[0]?.schemas?.nodes[0]?.schemaName;
  void selectedDatabaseName;
  void selectedNestedSchema;

  useDatabasesQuery({
    // @ts-expect-error relation select options should use filter, not where
    selection: {
      fields: {
        schemas: {
          where: {
            schemaName: { equalTo: 'public' },
          },
          select: {
            id: true,
          },
        },
      },
    },
  });

  useDatabasesQuery({
    selection: {
      fields: {
        schemas: {
          filter: {
            // @ts-expect-error invalid field inside nested relation filter should be rejected
            invalidField: { equalTo: 'x' },
          },
          select: {
            id: true,
          },
        },
      },
    },
  });

  useDatabasesQuery({
    selection: {
      fields: {
        schemas: {
          // @ts-expect-error invalid orderBy literal should be rejected
          orderBy: ['INVALID_ASC'],
          select: {
            id: true,
          },
        },
      },
    },
  });

  const invalidDatabaseSelect = {
    id: true,
    invalidField: true,
  };
  // @ts-expect-error invalid variable select field should be rejected
  useDatabasesQuery({ selection: { fields: invalidDatabaseSelect } });

  const invalidNestedDatabaseSelect = {
    schemas: {
      select: {
        id: true,
        invalidField: true,
      },
    },
  };
  // @ts-expect-error invalid nested variable select field should be rejected
  useDatabasesQuery({ selection: { fields: invalidNestedDatabaseSelect } });

  const validSignInSelect = {
    clientMutationId: true,
    result: {
      select: {
        accessToken: true,
        userId: true,
      },
    },
  };
  useSignInMutation({ selection: { fields: validSignInSelect } });

  const invalidSignInNested = {
    clientMutationId: true,
    result: {
      select: {
        accessToken: true,
        invalidNestedField: true,
      },
    },
  };
  // @ts-expect-error invalid nested variable select field should be rejected
  useSignInMutation({ selection: { fields: invalidSignInNested } });
}

async function ormStrictnessChecks() {
  const selectedCurrentUser = ormClient.query.currentUser({
    select: {
      id: true,
    },
  });
  type SelectedCurrentUser = Awaited<ReturnType<typeof selectedCurrentUser.unwrap>>['currentUser'];
  type _selectedCurrentUserOmitsUsername = Assert<
    NotHasKey<SelectedCurrentUser, 'username'>
  >;

  const selectedCurrentUserWithUsername = ormClient.query.currentUser({
    select: {
      id: true,
      username: true,
    },
  });
  type SelectedCurrentUserWithUsername = Awaited<
    ReturnType<typeof selectedCurrentUserWithUsername.unwrap>
  >['currentUser'];
  type _selectedCurrentUserHasUsername = Assert<
    HasKey<SelectedCurrentUserWithUsername, 'username'>
  >;

  // @ts-expect-error custom ORM query requires options with select
  ormClient.query.currentUser();

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

  ormClient.mutation.signIn(
    {
      input: {
        email: 'dev@example.com',
        password: 'password',
        rememberMe: true,
      },
    },
    // @ts-expect-error custom ORM mutation options require select
    {},
  );
}

void hookStrictnessChecks;
void ormStrictnessChecks;
