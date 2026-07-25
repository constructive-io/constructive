export type JobsOptions = {
  enabled?: boolean;
};

export type KnativeJobsSvcOptions = {
  jobs?: JobsOptions;
};

export type KnativeJobsSvcResult = {
  jobs: boolean;
};
