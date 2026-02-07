/**
 * Additional compile-time regression checks focused on strict selection behavior.
 *
 * These tests target edge cases around:
 * - nested relation select options (filter/orderBy)
 * - invalid relation option keys
 * - default vs explicit selection result narrowing
 * - custom ORM operation option contracts
 */

import {
  useDatabasesQuery,
  useSignInMutation,
} from '../generated/hooks';
import { createClient } from '../generated/orm';

type Assert<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type NotHasKey<T, K extends PropertyKey> = K extends keyof T ? false : true;

const ormClient = createClient({
  endpoint: 'https://example.invalid/graphql',
});

function hookStrictnessChecks() {
  const defaultDatabases = useDatabasesQuery({ selection: { first: 10 } });
  const defaultDatabaseId = defaultDatabases.data?.databases.nodes[0]?.id;
  void defaultDatabaseId;
  // @ts-expect-error default select for useDatabasesQuery should not expose name
  defaultDatabases.data?.databases.nodes[0]?.name;

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

  // @ts-expect-error relation select options should use filter, not where
  useDatabasesQuery({
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

  // @ts-expect-error invalid field inside nested relation filter should be rejected
  useDatabasesQuery({
    selection: {
      fields: {
        schemas: {
          filter: {
            invalidField: { equalTo: 'x' },
          },
          select: {
            id: true,
          },
        },
      },
    },
  });

  // @ts-expect-error invalid orderBy literal should be rejected
  useDatabasesQuery({
    selection: {
      fields: {
        schemas: {
          orderBy: ['INVALID_ASC'],
          select: {
            id: true,
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
  const defaultCurrentUser = ormClient.query.currentUser();
  type DefaultCurrentUser = Awaited<ReturnType<typeof defaultCurrentUser.unwrap>>['currentUser'];
  type _defaultCurrentUserOmitsUsername = Assert<NotHasKey<DefaultCurrentUser, 'username'>>;

  const selectedCurrentUser = ormClient.query.currentUser({
    select: {
      id: true,
      username: true,
    },
  });
  type SelectedCurrentUser = Awaited<ReturnType<typeof selectedCurrentUser.unwrap>>['currentUser'];
  type _selectedCurrentUserHasUsername = Assert<HasKey<SelectedCurrentUser, 'username'>>;

  // @ts-expect-error custom ORM query options object requires select when provided
  ormClient.query.currentUser({});

  const defaultSignIn = ormClient.mutation.signIn({
    input: {
      email: 'dev@example.com',
      password: 'password',
      rememberMe: true,
    },
  });
  type DefaultSignIn = Awaited<ReturnType<typeof defaultSignIn.unwrap>>['signIn'];
  type _defaultSignInOmitsResult = Assert<NotHasKey<DefaultSignIn, 'result'>>;

  const selectedSignIn = ormClient.mutation.signIn(
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
    }
  );
  type SelectedSignIn = Awaited<ReturnType<typeof selectedSignIn.unwrap>>['signIn'];
  type _selectedSignInHasResult = Assert<HasKey<SelectedSignIn, 'result'>>;

  ormClient.mutation.signIn(
    {
      input: {
        email: 'dev@example.com',
        password: 'password',
        rememberMe: true,
      },
    },
    // @ts-expect-error custom ORM mutation options object requires select when provided
    {}
  );
}

void hookStrictnessChecks;
void ormStrictnessChecks;
