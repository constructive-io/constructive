#!/usr/bin/env node

import { GraphQLServer as server } from './server';

server({ envConfig: process.env });
