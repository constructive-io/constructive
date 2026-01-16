import type { Pool } from 'pg';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { JobsRuntimeConfigOptions } from '@constructive-io/job-utils';
import type { SimpleEmailFunctionConfig } from '@constructive-io/simple-email-fn';
import type { SendEmailLinkFunctionConfig } from '@constructive-io/send-email-link-fn';

export type FunctionName = 'simple-email' | 'send-email-link';

export type FunctionServiceConfig = {
  name: FunctionName;
  port?: number;
};

export type FunctionsOptions = {
  enabled?: boolean;
  services?: FunctionServiceConfig[];
  functionsConfig?: {
    'simple-email'?: SimpleEmailFunctionConfig;
    'send-email-link'?: SendEmailLinkFunctionConfig;
  };
  envConfig?: Record<string, string | undefined>;
};

export type JobsOptions = {
  enabled?: boolean;
  pgPool?: Pool;
  workerConfig?: {
    workerId?: string;
    tasks?: string[];
    idleDelay?: number;
  };
  schedulerConfig?: {
    workerId?: string;
    tasks?: string[];
    idleDelay?: number;
  };
  callbackServerConfig?: {
    port?: number;
  };
} & JobsRuntimeConfigOptions;

export type GraphqlOptions = {
  enabled?: boolean;
  options?: ConstructiveOptions;
  graphqlConfig?: ConstructiveOptions;
  envConfig?: NodeJS.ProcessEnv;
  cwd?: string;
};

export type CombinedServerOptions = {
  functions?: FunctionsOptions;
  jobs?: JobsOptions;
  graphql?: GraphqlOptions;
};

export type StartedFunction = {
  name: FunctionName;
  port: number;
};

export type CombinedServerResult = {
  functions: StartedFunction[];
  jobs: boolean;
  graphql: boolean;
};
