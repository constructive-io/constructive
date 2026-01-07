import { ConstructiveOptions } from '@constructive-io/graphql-types';

export type FunctionName = 'simple-email' | 'send-email-link';

export type FunctionServiceConfig = {
  name: FunctionName;
  port?: number;
};

export type FunctionsOptions = {
  enabled?: boolean;
  services?: FunctionServiceConfig[];
};

export type JobsOptions = {
  enabled?: boolean;
};

export type GraphqlOptions = {
  enabled?: boolean;
  options?: ConstructiveOptions;
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
