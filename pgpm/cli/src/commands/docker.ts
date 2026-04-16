import { spawn } from 'child_process';
import { CLIOptions, Inquirerer, cliExitWithError, extractFirst } from 'inquirerer';

const dockerUsageText = `
Docker Command:

  pgpm docker <subcommand> [OPTIONS]

  Manage Docker containers for local development.
  PostgreSQL is always started by default.

Subcommands:
  start              Start containers
  stop               Stop containers
  ls                 List available services and their status

PostgreSQL Options:
  --name <name>      Container name (default: postgres)
  --image <image>    Docker image (default: constructiveio/postgres-plus:18)
  --port <port>      Host port mapping (default: 5432)
  --user <user>      PostgreSQL user (default: postgres)
  --password <pass>  PostgreSQL password (default: password)
  --shm-size <size>  Shared memory size for container (default: 2g)

Additional Services:
  --minio            Include MinIO S3-compatible object storage (API: 9000, Console: 9001)
  --ollama           Include Ollama LLM inference server (API: 11434)
  --gpu              Enable NVIDIA GPU passthrough for Ollama (requires NVIDIA Container Toolkit)

General Options:
  --help, -h         Show this help message
  --recreate         Remove and recreate containers on start

Examples:
  pgpm docker start                           Start PostgreSQL only
  pgpm docker start --minio                   Start PostgreSQL + MinIO
  pgpm docker start --ollama                  Start PostgreSQL + Ollama (CPU)
  pgpm docker start --ollama --gpu            Start PostgreSQL + Ollama (NVIDIA GPU)
  pgpm docker start --port 5433               Start on custom port
  pgpm docker start --shm-size 4g             Start with 4GB shared memory
  pgpm docker start --recreate                Remove and recreate containers
  pgpm docker start --recreate --minio        Recreate PostgreSQL + MinIO
  pgpm docker stop                            Stop PostgreSQL
  pgpm docker stop --minio                    Stop PostgreSQL + MinIO
  pgpm docker stop --ollama                   Stop PostgreSQL + Ollama
  pgpm docker ls                              List services and status
`;

interface DockerRunOptions {
  name: string;
  image: string;
  port: number;
  user: string;
  password: string;
  shmSize: string;
  recreate?: boolean;
}

interface PortMapping {
  host: number;
  container: number;
}

interface VolumeMapping {
  name: string;
  containerPath: string;
}

interface ServiceDefinition {
  name: string;
  image: string;
  ports: PortMapping[];
  env: Record<string, string>;
  command?: string[];
  volumes?: VolumeMapping[];
  gpuCapable?: boolean;
}

const ADDITIONAL_SERVICES: Record<string, ServiceDefinition> = {
  minio: {
    name: 'minio',
    image: 'minio/minio',
    ports: [
      { host: 9000, container: 9000 },
      { host: 9001, container: 9001 },
    ],
    env: {
      MINIO_ROOT_USER: 'minioadmin',
      MINIO_ROOT_PASSWORD: 'minioadmin',
    },
    command: ['server', '/data', '--console-address', ':9001'],
    volumes: [{ name: 'minio-data', containerPath: '/data' }],
  },
  ollama: {
    name: 'ollama',
    image: 'ollama/ollama',
    ports: [
      { host: 11434, container: 11434 },
    ],
    env: {},
    volumes: [{ name: 'ollama-data', containerPath: '/root/.ollama' }],
    gpuCapable: true,
  },
};

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

function run(command: string, args: string[], options: { stdio?: 'inherit' | 'pipe' } = {}): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const stdio = options.stdio || 'pipe';
    const child = spawn(command, args, { stdio });

    let stdout = '';
    let stderr = '';

    if (stdio === 'pipe') {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function checkDockerAvailable(): Promise<boolean> {
  try {
    const result = await run('docker', ['--version']);
    return result.code === 0;
  } catch (error) {
    return false;
  }
}

async function isContainerRunning(name: string): Promise<boolean | null> {
  try {
    const result = await run('docker', ['inspect', '-f', '{{.State.Running}}', name]);
    if (result.code === 0) {
      return result.stdout.trim() === 'true';
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function containerExists(name: string): Promise<boolean> {
  try {
    const result = await run('docker', ['inspect', name]);
    return result.code === 0;
  } catch (error) {
    return false;
  }
}

async function startContainer(options: DockerRunOptions): Promise<void> {
  const { name, image, port, user, password, shmSize, recreate } = options;

  const dockerAvailable = await checkDockerAvailable();
  if (!dockerAvailable) {
    await cliExitWithError('Docker is not installed or not available in PATH. Please install Docker first.');
    return;
  }

  const exists = await containerExists(name);
  const running = await isContainerRunning(name);

  if (running === true) {
    console.log(`✅ Container "${name}" is already running`);
    return;
  }

  if (recreate && exists) {
    console.log(`🗑️  Removing existing container "${name}"...`);
    const removeResult = await run('docker', ['rm', '-f', name], { stdio: 'inherit' });
    if (removeResult.code !== 0) {
      await cliExitWithError(`Failed to remove container "${name}"`);
      return;
    }
  }

  if (exists && running === false) {
    console.log(`🔄 Starting existing container "${name}"...`);
    const startResult = await run('docker', ['start', name], { stdio: 'inherit' });
    if (startResult.code === 0) {
      console.log(`✅ Container "${name}" started successfully`);
    } else {
      await cliExitWithError(`Failed to start container "${name}"`);
    }
    return;
  }

  console.log(`🚀 Creating and starting new container "${name}"...`);
  const runArgs = [
    'run',
    '-d',
    '--name', name,
    '--shm-size', shmSize,
    '-e', `POSTGRES_USER=${user}`,
    '-e', `POSTGRES_PASSWORD=${password}`,
    '-p', `${port}:5432`,
    image
  ];

  const runResult = await run('docker', runArgs, { stdio: 'inherit' });
  if (runResult.code === 0) {
    console.log(`✅ Container "${name}" created and started successfully`);
    console.log(`📌 PostgreSQL is available at localhost:${port}`);
    console.log(`👤 User: ${user}`);
    console.log(`🔑 Password: ${password}`);
  } else {
    await cliExitWithError(`Failed to create container "${name}". Check if port ${port} is already in use.`);
  }
}

async function stopContainer(name: string): Promise<void> {
  const dockerAvailable = await checkDockerAvailable();
  if (!dockerAvailable) {
    await cliExitWithError('Docker is not installed or not available in PATH. Please install Docker first.');
    return;
  }

  const exists = await containerExists(name);
  if (!exists) {
    console.log(`ℹ️  Container "${name}" not found`);
    return;
  }

  const running = await isContainerRunning(name);
  if (running === false) {
    console.log(`ℹ️  Container "${name}" is already stopped`);
    return;
  }

  console.log(`🛑 Stopping container "${name}"...`);
  const stopResult = await run('docker', ['stop', name], { stdio: 'inherit' });
  if (stopResult.code === 0) {
    console.log(`✅ Container "${name}" stopped successfully`);
  } else {
    await cliExitWithError(`Failed to stop container "${name}"`);
  }
}

async function startService(service: ServiceDefinition, recreate: boolean, gpu: boolean = false): Promise<void> {
  const { name, image, ports, env: serviceEnv, command } = service;

  const exists = await containerExists(name);
  const running = await isContainerRunning(name);

  if (running === true) {
    console.log(`✅ Container "${name}" is already running`);
    return;
  }

  if (recreate && exists) {
    console.log(`🗑️  Removing existing container "${name}"...`);
    const removeResult = await run('docker', ['rm', '-f', name], { stdio: 'inherit' });
    if (removeResult.code !== 0) {
      await cliExitWithError(`Failed to remove container "${name}"`);
      return;
    }
  }

  if (exists && running === false) {
    console.log(`🔄 Starting existing container "${name}"...`);
    const startResult = await run('docker', ['start', name], { stdio: 'inherit' });
    if (startResult.code === 0) {
      console.log(`✅ Container "${name}" started successfully`);
    } else {
      await cliExitWithError(`Failed to start container "${name}"`);
    }
    return;
  }

  console.log(`🚀 Creating and starting new container "${name}"...`);
  const runArgs = [
    'run',
    '-d',
    '--name', name,
  ];

  for (const [key, value] of Object.entries(serviceEnv)) {
    runArgs.push('-e', `${key}=${value}`);
  }

  for (const portMapping of ports) {
    runArgs.push('-p', `${portMapping.host}:${portMapping.container}`);
  }

  if (service.volumes) {
    for (const vol of service.volumes) {
      runArgs.push('-v', `${vol.name}:${vol.containerPath}`);
    }
  }

  if (gpu && service.gpuCapable) {
    runArgs.push('--gpus', 'all');
  }

  runArgs.push(image);

  if (command) {
    runArgs.push(...command);
  }

  const runResult = await run('docker', runArgs, { stdio: 'inherit' });
  if (runResult.code === 0) {
    console.log(`✅ Container "${name}" created and started successfully`);
    const portInfo = ports.map(p => `localhost:${p.host}`).join(', ');
    console.log(`📌 ${name} is available at ${portInfo}`);
  } else {
    const portInfo = ports.map(p => String(p.host)).join(', ');
    await cliExitWithError(`Failed to create container "${name}". Check if port ${portInfo} is already in use.`);
  }
}

async function stopService(service: ServiceDefinition): Promise<void> {
  await stopContainer(service.name);
}

function resolveServiceFlags(args: Partial<Record<string, any>>): ServiceDefinition[] {
  const services: ServiceDefinition[] = [];
  for (const [key, service] of Object.entries(ADDITIONAL_SERVICES)) {
    if (args[key] === true || typeof args[key] === 'string') {
      services.push(service);
    }
  }
  return services;
}

async function listServices(): Promise<void> {
  const dockerAvailable = await checkDockerAvailable();

  console.log('\nAvailable services:\n');
  console.log('  Primary:');

  if (dockerAvailable) {
    const pgRunning = await isContainerRunning('postgres');
    const pgStatus = pgRunning === true ? '\x1b[32mrunning\x1b[0m' : pgRunning === false ? '\x1b[33mstopped\x1b[0m' : '\x1b[90mnot created\x1b[0m';
    console.log(`    postgres    constructiveio/postgres-plus:18    ${pgStatus}`);
  } else {
    console.log('    postgres    constructiveio/postgres-plus:18    \x1b[90m(docker not available)\x1b[0m');
  }

  console.log('\n  Additional (use --<name> flag):');

  for (const [key, service] of Object.entries(ADDITIONAL_SERVICES)) {
    if (dockerAvailable) {
      const running = await isContainerRunning(service.name);
      const status = running === true ? '\x1b[32mrunning\x1b[0m' : running === false ? '\x1b[33mstopped\x1b[0m' : '\x1b[90mnot created\x1b[0m';
      const portInfo = service.ports.map(p => String(p.host)).join(', ');
      console.log(`    ${key.padEnd(12)}${service.image.padEnd(36)}${status}    port ${portInfo}`);
    } else {
      const portInfo = service.ports.map(p => String(p.host)).join(', ');
      console.log(`    ${key.padEnd(12)}${service.image.padEnd(36)}\x1b[90m(docker not available)\x1b[0m    port ${portInfo}`);
    }
  }

  console.log('');
}

export default async (
  argv: Partial<Record<string, any>>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(dockerUsageText);
    process.exit(0);
  }

  const { first: subcommand, newArgv } = extractFirst(argv);
  const args = newArgv as Partial<Record<string, any>>;

  if (!subcommand) {
    console.log(dockerUsageText);
    await cliExitWithError('No subcommand provided. Use "start", "stop", or "ls".');
    return;
  }
  const name = (args.name as string) || 'postgres';
  const image = (args.image as string) || 'constructiveio/postgres-plus:18';
  const port = typeof args.port === 'number' ? args.port : 5432;
  const user = (args.user as string) || 'postgres';
  const password = (args.password as string) || 'password';
  const shmSize = (args['shm-size'] as string) || (args.shmSize as string) || '2g';
  const recreate = args.recreate === true;
  const gpu = args.gpu === true;
  const includedServices = resolveServiceFlags(args);

  switch (subcommand) {
  case 'start':
    await startContainer({ name, image, port, user, password, shmSize, recreate });
    for (const service of includedServices) {
      await startService(service, recreate, gpu);
    }
    break;

  case 'stop':
    await stopContainer(name);
    for (const service of includedServices) {
      await stopService(service);
    }
    break;

  case 'ls':
    await listServices();
    break;

  default:
    console.log(dockerUsageText);
    await cliExitWithError(`Unknown subcommand: ${subcommand}. Use "start", "stop", or "ls".`);
  }
};
