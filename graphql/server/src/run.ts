#!/usr/bin/env node

import { getEnvOptions } from '@constructive-io/graphql-env';

import { defaultConfig } from './config';
import { GraphQLServer as server } from './server';

// Merge default config with environment options
// Priority: env vars > defaultConfig > framework defaults
server(getEnvOptions(defaultConfig));
