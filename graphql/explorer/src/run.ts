#!/usr/bin/env node

import { getEnvOptions } from '@constructive-io/graphql-env';

import { GraphQLExplorer as server } from './server';

server(getEnvOptions());
