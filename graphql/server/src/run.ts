#!/usr/bin/env node

import { getEnvOptions } from '@constructive-io/graphql-env';

import { GraphQLServer as server } from './server';

server(getEnvOptions());
