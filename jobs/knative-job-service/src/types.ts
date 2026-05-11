export type FunctionName =
  | 'send-email'
  | 'send-verification-link'
  | 'email:send_email'
  | 'email:send_verification_link';

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

export type KnativeJobsSvcOptions = {
  functions?: FunctionsOptions;
  jobs?: JobsOptions;
};

export type StartedFunction = {
  name: FunctionName;
  port: number;
};

export type KnativeJobsSvcResult = {
  functions: StartedFunction[];
  jobs: boolean;
};
