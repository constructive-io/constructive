#!/usr/bin/env node

import { getEnvOptions } from '@constructive-io/graphql-env';

import { PostgRESTServer as server } from './server';

server(getEnvOptions());
