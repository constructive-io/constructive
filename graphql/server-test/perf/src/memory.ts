import { toRedactedErrorSample, writeJsonArtifact } from './artifacts';
import type {
  BenchmarkContext,
  MemoryPhase,
  MemorySnapshotArtifact,
  PerfRunConfig,
  RunArtifactPaths,
} from './types';
import { PERF_SCHEMA_VERSION } from './types';
import { memoryReportPath } from './artifacts';

export const captureMemorySnapshot = async (input: {
  context: BenchmarkContext;
  config: PerfRunConfig;
  artifacts: RunArtifactPaths;
  caseId: string;
  phase: MemoryPhase;
}): Promise<{ path: string; ok: boolean }> => {
  const { context, config, artifacts, caseId, phase } = input;
  const targetPath = memoryReportPath(artifacts, caseId, phase);
  const base: Omit<MemorySnapshotArtifact, 'ok' | 'status'> = {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: config.runId,
    caseId,
    phase,
    capturedAt: new Date().toISOString(),
    serverUrl: context.serverUrl,
  };

  if (!config.captureMemory) {
    await writeJsonArtifact(targetPath, {
      ...base,
      ok: true,
      status: 'disabled',
    } satisfies MemorySnapshotArtifact);
    return { path: targetPath, ok: true };
  }

  try {
    const response = await fetch(`${context.serverUrl}/debug/memory`);
    let payload: unknown;
    const text = await response.text();
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    const ok = response.ok;
    await writeJsonArtifact(targetPath, {
      ...base,
      ok,
      status: ok ? 'captured' : 'unavailable',
      httpStatus: response.status,
      payload,
    } satisfies MemorySnapshotArtifact);
    return { path: targetPath, ok };
  } catch (error) {
    await writeJsonArtifact(targetPath, {
      ...base,
      ok: false,
      status: 'failed',
      error: toRedactedErrorSample(error, { operation: 'memory.capture' }),
    } satisfies MemorySnapshotArtifact);
    return { path: targetPath, ok: false };
  }
};
