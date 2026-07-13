/** HTTP server configuration. */
export interface ServerOptions {
  host?: string;
  port?: number;
  trustProxy?: boolean;
  origin?: string;
  strictAuth?: boolean;
}

export const serverDefaults: ServerOptions = {
  host: 'localhost',
  port: 3000,
  trustProxy: false,
  strictAuth: false,
};

/** Storage provider type for CDN/bucket operations. */
export type BucketProvider = 's3' | 'minio' | 'gcs';

/** CDN and file storage configuration. */
export interface CDNOptions {
  provider?: BucketProvider;
  bucketName?: string;
  awsRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  endpoint?: string;
  publicUrlPrefix?: string;
}

export const cdnDefaults: CDNOptions = {
  provider: 'minio',
  bucketName: 'test-bucket',
  awsRegion: 'us-east-1',
  awsAccessKey: 'minioadmin',
  awsSecretKey: 'minioadmin',
  endpoint: 'http://localhost:9000',
  publicUrlPrefix: 'http://localhost:9000',
};

export interface JobSchemaConfig {
  schema: string;
}

export interface JobHostnameConfig {
  hostname: string;
}

export interface JobTaskSupportConfig {
  supportAny: boolean;
  supported: string[];
}

export interface JobGatewayConfig {
  gatewayUrl: string;
  callbackUrl: string;
  callbackPort: number;
}

export interface FailJobParams {
  workerId: string;
  jobId: number | string;
  message: string;
}

export interface CompleteJobParams {
  workerId: string;
  jobId: number | string;
}

export interface GetJobParams {
  workerId: string;
  supportedTaskNames: string[] | null;
}

export interface GetScheduledJobParams {
  workerId: string;
  supportedTaskNames: string[] | null;
}

export interface RunScheduledJobParams {
  jobId: number | string;
}

export interface ReleaseScheduledJobsParams {
  workerId: string;
  ids?: Array<number | string>;
}

export interface ReleaseJobsParams {
  workerId: string;
}

export interface Job {
  id: number | string;
  task_name: string;
  payload?: any;
  worker_id?: string;
  max_attempts?: number;
  attempts?: number;
  priority?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
  run_at?: Date | string;
  last_error?: string;
}

export interface JobWorkerConfig
  extends JobSchemaConfig, JobHostnameConfig, JobTaskSupportConfig {
  pollInterval?: number;
  gracefulShutdown?: boolean;
}

export interface JobSchedulerConfig
  extends JobSchemaConfig, JobHostnameConfig, JobTaskSupportConfig {
  pollInterval?: number;
  gracefulShutdown?: boolean;
}

export interface JobsConfig {
  schema?: Partial<JobSchemaConfig>;
  worker?: Partial<JobWorkerConfig>;
  scheduler?: Partial<JobSchedulerConfig>;
  gateway?: Partial<JobGatewayConfig>;
}

export const jobsDefaults: JobsConfig = {
  schema: {
    schema: 'app_jobs',
  },
  worker: {
    schema: 'app_jobs',
    hostname: 'worker-0',
    supportAny: true,
    supported: [],
    pollInterval: 1000,
    gracefulShutdown: true,
  },
  scheduler: {
    schema: 'app_jobs',
    hostname: 'scheduler-0',
    supportAny: true,
    supported: [],
    pollInterval: 1000,
    gracefulShutdown: true,
  },
  gateway: {
    gatewayUrl: 'http://gateway:8080',
    callbackUrl: 'http://callback:12345',
    callbackPort: 12345,
  },
};

/** SMTP email configuration. */
export interface SmtpOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  replyTo?: string;
  requireTLS?: boolean;
  tlsRejectUnauthorized?: boolean;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  name?: string;
  logger?: boolean;
  debug?: boolean;
}

export const smtpDefaults: SmtpOptions = {
  port: 587,
  secure: false,
  pool: false,
  logger: false,
  debug: false,
};
