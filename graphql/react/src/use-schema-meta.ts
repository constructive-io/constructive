// @ts-nocheck
import { useEffect } from 'react';
import { gql } from 'graphql-request';
import { useQuery } from 'react-query';
import { useGraphqlClient } from './use-graphql-client';

const fieldFragment = `
  name
  type {
    gqlType
    isArray
    pgType
    isNotNull
    hasDefault
  }
`;

const queryFragment = `
  query {
    all
    create
    delete
    one
    update
  }
`;

const primaryConstraintsFragment = `
  primaryKeyConstraints {
    name
    fields {
      ${fieldFragment}
    }
  }
`;

const foreignKeyConstraintsFragment = `
  foreignKeyConstraints {
    name
    fields {
      ${fieldFragment}
    }
    referencedTable
    referencedFields
    refFields {
      ${fieldFragment}
    }
    refTable {
      name
    }
  }
`;

const inflectionFragment = `
  inflection {
    tableType
    allRows
    connection
    edge
    filterType
    orderByType
    conditionType
    patchType
    createInputType
    createPayloadType
    updatePayloadType
    deletePayloadType
  }
`;

const metaQuery = gql`
  query SchemaMetaQuery {
    _meta {
      tables {
        name
        ${queryFragment}

        ${inflectionFragment}

        fields {
          ${fieldFragment}
        }

        ${primaryConstraintsFragment}

        ${foreignKeyConstraintsFragment}

        uniqueConstraints {
          name
          fields {
            ${fieldFragment}
          }
        }

        relations {
          belongsTo {
            fieldName
            isUnique
            type
            keys {
              ${fieldFragment}
            }
            references {
              name
            }
          }
          has {
            fieldName
            isUnique
            type
            keys {
              ${fieldFragment}
            }
            referencedBy {
              name
            }
          }
          hasMany {
            fieldName
            isUnique
            type
            keys {
              ${fieldFragment}
            }
            referencedBy {
              name
            }
          }
          hasOne {
            fieldName
            isUnique
            type
            keys {
              ${fieldFragment}
            }
            referencedBy {
              name
            }
          }
          manyToMany {
            fieldName
            type
            leftKeyAttributes {
              ${fieldFragment}
            }
            rightKeyAttributes {
              ${fieldFragment}
            }
            junctionTable {
              name
            }
            junctionLeftConstraint {
              name
              fields {
                ${fieldFragment}
              }
              refFields {
                ${fieldFragment}
              }
              refTable {
                name
              }
            }
            junctionRightConstraint {
              name
              fields {
                ${fieldFragment}
              }
              refFields {
                ${fieldFragment}
              }
              refTable {
                name
              }
            }
            junctionLeftKeyAttributes {
              ${fieldFragment}
            }
            junctionRightKeyAttributes {
              ${fieldFragment}
            }
            rightTable {
              name
            }
          }
        }
      }
    }
  }
`;

export function useSchemaMeta({
  tableName,
  onSuccess,
  onError,
  headers,
  ...restOptions
} = {}) {
  const graphqlClient = useGraphqlClient();

  useEffect(() => {
    if (headers && graphqlClient) {
      graphqlClient.setHeaders(headers);
    }
  }, [graphqlClient, headers]);

  const { data, refetch, ...otherProps } = useQuery(
    'schemaMeta',
    async () => {
      return await graphqlClient.request(metaQuery);
    },
    {
      onError,
      onSuccess,
      ...restOptions,
      // The query will not execute until the graphqlClient exists
      enabled: !!graphqlClient,
      // SQL schema rarely changes, so we don't want it to invalidate too often
      refetchInterval: false,
      refetchIntervalInBackground: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false
    }
  );

  return {
    ...otherProps,
    refetch,
    data: tableName ? data?._meta?.tables[tableName] : data?._meta
  };
}
