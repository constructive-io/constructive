import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { PostgresMemorySnapshot } from './types';

const UNIT_BYTES: Record<string, number> = {
  B: 1,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4
};

const CGROUP_FILE_MARKER = '__CPERF_CGROUP_FILE__ ';
const CGROUP_FILES = [
  'memory.current',
  'memory.peak',
  'memory.max',
  'memory.stat',
  'memory.events'
] as const;

const CGROUP_V2_SCRIPT = `
set -eu
base=/sys/fs/cgroup
if [ ! -r "$base/memory.current" ]; then
  relative=$(awk -F: '$1 == "0" { print $3; exit }' /proc/self/cgroup)
  if [ -n "$relative" ] && [ -r "$base$relative/memory.current" ]; then
    base="$base$relative"
  fi
fi
for file in memory.current memory.peak memory.max memory.stat memory.events; do
  if [ -r "$base/$file" ]; then
    printf '${CGROUP_FILE_MARKER}%s\n' "$file"
    sed -n '1,256p' "$base/$file"
  fi
done
`;

const CGROUP_IDENTITY_SCRIPT = [
  'set -eu',
  'test -r /sys/fs/cgroup/memory.current',
  'test -r /sys/fs/cgroup/memory.events',
  'printf "membership="',
  'cat /proc/1/cgroup',
  'printf "mount="',
  'stat -c "%d:%i" /sys/fs/cgroup'
].join('\n');

const CONTAINER_ID = /^[a-f0-9]{64}$/;
const PREFIXED_SHA256 = /^sha256:[a-f0-9]{64}$/;

const canonicalStringSha256 = (value: string): string => `sha256:${createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex')}`;

export const parseDockerBytes = (value: string): number | null => {
  const match = /^\s*([\d.]+)\s*(B|KiB|MiB|GiB|TiB)\s*$/.exec(value);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? Math.round(parsed * UNIT_BYTES[match[2]]) : null;
};

const parseNonNegativeInteger = (value: string | undefined): number | null => {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const parseCgroupKeyValues = (value: string): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const line of value.split(/\r?\n/)) {
    const match = /^([^\s]+)\s+(\d+)$/.exec(line.trim());
    if (!match) continue;
    const parsed = Number(match[2]);
    if (Number.isSafeInteger(parsed) && parsed >= 0) result[match[1]] = parsed;
  }
  return result;
};

const cgroupSections = (raw: string): Map<string, string> => {
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith(CGROUP_FILE_MARKER)) {
      const file = line.slice(CGROUP_FILE_MARKER.length).trim();
      current = (CGROUP_FILES as readonly string[]).includes(file) ? file : null;
      if (current && !sections.has(current)) sections.set(current, []);
    } else if (current) {
      sections.get(current)!.push(line);
    }
  }
  return new Map([...sections].map(([file, lines]) => [file, lines.join('\n').trim()]));
};

export interface ParsedCgroupV2Memory {
  currentBytes: number;
  peakBytes: number | null;
  maxBytes: number | null;
  stat: Record<string, number>;
  events: Record<string, number>;
}

export const parseCgroupV2Memory = (raw: string): ParsedCgroupV2Memory | null => {
  const sections = cgroupSections(raw);
  const currentBytes = parseNonNegativeInteger(sections.get('memory.current'));
  if (currentBytes == null) return null;
  const maxRaw = sections.get('memory.max')?.trim();
  return {
    currentBytes,
    peakBytes: parseNonNegativeInteger(sections.get('memory.peak')),
    maxBytes: maxRaw === 'max' ? null : parseNonNegativeInteger(maxRaw),
    stat: parseCgroupKeyValues(sections.get('memory.stat') ?? ''),
    events: parseCgroupKeyValues(sections.get('memory.events') ?? '')
  };
};

const execFileText = (
  command: string,
  args: string[],
  timeout: number
): Promise<string> => new Promise((resolve, reject) => {
  execFile(command, args, { timeout }, (error, stdout, stderr) => {
    if (error) {
      const detail = String(stderr).trim();
      reject(new Error(detail ? `${error.message}: ${detail}` : error.message));
      return;
    }
    resolve(String(stdout));
  });
});

interface DockerContainerIdentity {
  id: string;
  startedAt: string;
  cgroupIdentitySha256: string;
}

const inspectDockerContainer = async (container: string): Promise<{
  id: string;
  startedAt: string;
}> => {
  const raw = await execFileText('docker', ['inspect', container], 10_000);
  const records = JSON.parse(raw) as Array<{
    Id?: unknown;
    State?: { Running?: unknown; StartedAt?: unknown };
  }>;
  const record = Array.isArray(records) && records.length === 1 ? records[0] : null;
  const startedAtMs = Date.parse(
    typeof record?.State?.StartedAt === 'string' ? record.State.StartedAt : ''
  );
  if (
    !record
    || !CONTAINER_ID.test(String(record.Id ?? ''))
    || record.State?.Running !== true
    || !Number.isSafeInteger(startedAtMs)
  ) {
    throw new Error('PostgreSQL sampler container identity is invalid');
  }
  return {
    id: String(record.Id),
    startedAt: new Date(startedAtMs).toISOString()
  };
};

const inspectContainerCgroupIdentity = async (containerId: string): Promise<string> => {
  const raw = await execFileText('docker', [
    'exec',
    containerId,
    '/usr/bin/env', '-i', 'PATH=/usr/bin:/bin',
    'sh', '-ceu', CGROUP_IDENTITY_SCRIPT
  ], 10_000);
  return canonicalStringSha256(raw.trim());
};

const resolveDockerContainerIdentity = async (
  container: string,
  expected: Pick<
  PostgresMemorySamplerOptions,
  'expectedContainerId' | 'expectedContainerStartedAt' | 'expectedCgroupIdentitySha256'
  >
): Promise<DockerContainerIdentity> => {
  const inspected = await inspectDockerContainer(container);
  if (expected.expectedContainerId && inspected.id !== expected.expectedContainerId) {
    throw new Error(
      `PostgreSQL sampler container ID mismatch: expected ${expected.expectedContainerId}, observed ${inspected.id}`
    );
  }
  if (
    expected.expectedContainerStartedAt
    && inspected.startedAt !== expected.expectedContainerStartedAt
  ) {
    throw new Error(
      'PostgreSQL sampler container start time does not match run attestation'
    );
  }
  const cgroupIdentitySha256 = await inspectContainerCgroupIdentity(inspected.id);
  if (
    expected.expectedCgroupIdentitySha256
    && cgroupIdentitySha256 !== expected.expectedCgroupIdentitySha256
  ) {
    throw new Error('PostgreSQL sampler cgroup identity does not match run attestation');
  }
  return { ...inspected, cgroupIdentitySha256 };
};

const dockerWorkingSet = async (container: string): Promise<{
  usedBytes: number;
  limitBytes: number;
  raw: string;
}> => {
  const raw = (await execFileText(
    'docker',
    ['stats', '--no-stream', '--format', '{{.MemUsage}}', container],
    10_000
  )).trim();
  const parts = raw.split('/').map((part) => part.trim());
  const usedBytes = parseDockerBytes(parts[0] ?? '');
  const limitBytes = parseDockerBytes(parts[1] ?? '');
  if (usedBytes == null || limitBytes == null) {
    throw new Error(`unrecognized docker memory value '${raw}'`);
  }
  return { usedBytes, limitBytes, raw };
};

const dockerCgroupV2 = async (container: string): Promise<{
  parsed: ParsedCgroupV2Memory;
  raw: string;
}> => {
  const raw = await execFileText(
    'docker',
    ['exec', container, 'sh', '-c', CGROUP_V2_SCRIPT],
    10_000
  );
  const parsed = parseCgroupV2Memory(raw);
  if (!parsed) throw new Error('container does not expose readable cgroup-v2 memory.current');
  return { parsed, raw };
};

type CgroupReader = () => Promise<{ parsed: ParsedCgroupV2Memory; raw: string }>;

const readHostCgroupV2 = async (base: string): Promise<{
  parsed: ParsedCgroupV2Memory;
  raw: string;
}> => {
  const sections: string[] = [];
  for (const file of CGROUP_FILES) {
    try {
      const value = await fs.readFile(path.join(base, file), 'utf8');
      sections.push(`${CGROUP_FILE_MARKER}${file}\n${value.trim()}\n`);
    } catch (error) {
      if (file === 'memory.current') throw error;
    }
  }
  const raw = sections.join('');
  const parsed = parseCgroupV2Memory(raw);
  if (!parsed) throw new Error('host does not expose readable cgroup-v2 memory.current');
  return { parsed, raw };
};

const resolveCgroupReader = async (container: string): Promise<CgroupReader> => {
  if (process.platform === 'linux') {
    try {
      const pidRaw = (await execFileText(
        'docker',
        ['inspect', '--format', '{{.State.Pid}}', container],
        10_000
      )).trim();
      const pid = Number(pidRaw);
      if (!Number.isSafeInteger(pid) || pid <= 0) {
        throw new Error(`invalid container pid '${pidRaw}'`);
      }
      const membership = await fs.readFile(`/proc/${pid}/cgroup`, 'utf8');
      const relative = membership
        .split(/\r?\n/)
        .map((line) => /^0::(.+)$/.exec(line)?.[1])
        .find(Boolean);
      if (!relative) throw new Error('container process has no cgroup-v2 membership');
      const cgroupRoot = path.resolve('/sys/fs/cgroup');
      const base = path.resolve(cgroupRoot, `.${relative}`);
      if (base !== cgroupRoot && !base.startsWith(`${cgroupRoot}${path.sep}`)) {
        throw new Error('container cgroup path escaped the cgroup-v2 root');
      }
      await readHostCgroupV2(base);
      return () => readHostCgroupV2(base);
    } catch {
      // Docker Desktop and rootless engines may hide the host cgroup. The
      // container namespace fallback remains correct, though less frequent.
    }
  }
  return () => dockerCgroupV2(container);
};

export interface PostgresMemorySamplerOptions {
  intervalMs?: number;
  requireCgroupV2?: boolean;
  expectedContainerId?: string;
  expectedContainerStartedAt?: string;
  expectedCgroupIdentitySha256?: string;
}

export interface PostgresMemorySampler {
  snapshots: PostgresMemorySnapshot[];
  errors: string[];
  ready: Promise<void>;
  stop(): Promise<void>;
}

export const startPostgresMemorySampler = (
  container: string,
  options: number | PostgresMemorySamplerOptions = {}
): PostgresMemorySampler => {
  const intervalMs = typeof options === 'number' ? options : options.intervalMs ?? 250;
  const requireCgroupV2 = typeof options === 'number'
    ? false
    : options.requireCgroupV2 ?? false;
  const identityOptions: PostgresMemorySamplerOptions = typeof options === 'number'
    ? {}
    : options;
  if (
    identityOptions.expectedContainerId != null
    && !CONTAINER_ID.test(identityOptions.expectedContainerId)
  ) {
    throw new Error('expected PostgreSQL container ID must be a 64-character digest');
  }
  if (
    identityOptions.expectedCgroupIdentitySha256 != null
    && !PREFIXED_SHA256.test(identityOptions.expectedCgroupIdentitySha256)
  ) {
    throw new Error('expected PostgreSQL cgroup identity must be a prefixed SHA-256');
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error(`PostgreSQL sample interval must be positive, received ${intervalMs}`);
  }
  const snapshots: PostgresMemorySnapshot[] = [];
  const errors: string[] = [];
  let cgroupErrorRecorded = false;
  let cgroupReader: CgroupReader | null = null;
  let latestWorkingSet: Awaited<ReturnType<typeof dockerWorkingSet>> | null = null;
  let latestWorkingSetError: string | null = null;
  let workingSetInFlight: Promise<void> | null = null;
  let inFlight: Promise<void> | null = null;
  let stopped = false;
  let immutableIdentity: DockerContainerIdentity | null = null;
  const exactContainer = (): string => {
    if (!immutableIdentity) throw new Error('PostgreSQL sampler identity is unavailable');
    return immutableIdentity.id;
  };
  const revalidateIdentity = async (): Promise<void> => {
    if (!immutableIdentity) throw new Error('PostgreSQL sampler identity is unavailable');
    const observed = await resolveDockerContainerIdentity(immutableIdentity.id, {
      expectedContainerId: immutableIdentity.id,
      expectedContainerStartedAt: immutableIdentity.startedAt,
      expectedCgroupIdentitySha256: immutableIdentity.cgroupIdentitySha256
    });
    if (
      observed.id !== immutableIdentity.id
      || observed.startedAt !== immutableIdentity.startedAt
      || observed.cgroupIdentitySha256 !== immutableIdentity.cgroupIdentitySha256
    ) {
      throw new Error('PostgreSQL sampler immutable identity changed during the run');
    }
  };
  const sampleWorkingSet = (): Promise<void> => {
    if (workingSetInFlight) return workingSetInFlight;
    let pending: Promise<void>;
    pending = dockerWorkingSet(exactContainer()).then((snapshot) => {
      latestWorkingSet = snapshot;
      latestWorkingSetError = null;
    }, (error) => {
      // Docker's cache-subtracted working set is diagnostic when the raw
      // cgroup-v2 reader is healthy. Keep its failure in the sample payload,
      // but do not disqualify an otherwise complete raw-memory measurement.
      latestWorkingSetError = error instanceof Error ? error.message : String(error);
    }).finally(() => {
      if (workingSetInFlight === pending) workingSetInFlight = null;
    });
    workingSetInFlight = pending;
    return pending;
  };
  const sample = async (): Promise<void> => {
    const startedAtMs = Date.now();
    let cgroup: Awaited<ReturnType<CgroupReader>> | null = null;
    let cgroupError: string | null = null;
    try {
      cgroup = await cgroupReader!();
    } catch (error) {
      cgroupError = error instanceof Error ? error.message : String(error);
      if (requireCgroupV2 && !cgroupErrorRecorded) {
        cgroupErrorRecorded = true;
        errors.push(`cgroup-v2 telemetry unavailable: ${cgroupError}`);
      }
    }
    const endedAtMs = Date.now();
    const workingSet = latestWorkingSet;
    if (!cgroup && !workingSet) {
      errors.push('PostgreSQL memory telemetry produced neither cgroup nor Docker data');
      return;
    }
    const midpointMs = startedAtMs + ((endedAtMs - startedAtMs) / 2);
    snapshots.push({
      timestamp: new Date(midpointMs).toISOString(),
      containerId: immutableIdentity!.id,
      cgroupIdentitySha256: immutableIdentity!.cgroupIdentitySha256,
      sampleStartedAt: new Date(startedAtMs).toISOString(),
      sampleEndedAt: new Date(endedAtMs).toISOString(),
      sampleDurationMs: endedAtMs - startedAtMs,
      usedBytes: cgroup?.parsed.currentBytes ?? workingSet!.usedBytes,
      ...(workingSet ? { workingSetBytes: workingSet.usedBytes } : {}),
      limitBytes: cgroup?.parsed.maxBytes ?? workingSet?.limitBytes ?? 0,
      source: cgroup ? 'cgroup-v2' : 'docker-stats',
      ...(cgroup ? { cgroupV2: cgroup.parsed } : {}),
      raw: JSON.stringify({
        dockerStats: workingSet?.raw ?? null,
        dockerStatsError: latestWorkingSetError,
        cgroupV2: cgroup?.raw ?? null,
        cgroupError
      })
    });
  };
  const runSample = (): Promise<void> => {
    if (inFlight) return inFlight;
    let pending: Promise<void>;
    pending = sample().finally(() => {
      if (inFlight === pending) inFlight = null;
    });
    inFlight = pending;
    return pending;
  };
  let timer: ReturnType<typeof setInterval> | null = null;
  let workingSetTimer: ReturnType<typeof setInterval> | null = null;
  const ready = (async () => {
    immutableIdentity = await resolveDockerContainerIdentity(container, identityOptions);
    cgroupReader = await resolveCgroupReader(immutableIdentity.id);
    await sampleWorkingSet();
    await runSample();
    if (stopped) return;
    timer = setInterval(() => {
      void runSample();
    }, intervalMs);
    timer.unref?.();
    workingSetTimer = setInterval(() => {
      void sampleWorkingSet();
    }, Math.max(1_000, intervalMs * 4));
    workingSetTimer.unref?.();
  })();
  return {
    snapshots,
    errors,
    ready,
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      if (timer) clearInterval(timer);
      if (workingSetTimer) clearInterval(workingSetTimer);
      await ready;
      if (inFlight) await inFlight;
      if (workingSetInFlight) await workingSetInFlight;
      await sampleWorkingSet();
      await runSample();
      await revalidateIdentity();
    }
  };
};
