import { memoryReportPath, toRedactedErrorSample, writeJsonArtifact } from './artifacts';
import type {
  BenchmarkContext,
  MemoryCaptureResult,
  MemoryPhase,
  MemorySnapshotArtifact,
  PerfRunConfig,
  RedactedErrorSample,
  RunArtifactPaths,
} from './types';
import { PERF_SCHEMA_VERSION } from './types';

export const captureMemorySnapshot = async (input: {
  context: BenchmarkContext;
  config: PerfRunConfig;
  artifacts: RunArtifactPaths;
  caseId: string;
  phase: MemoryPhase;
}): Promise<MemoryCaptureResult> => {
  const { context, config, artifacts, caseId, phase } = input;
  const filePath = memoryReportPath(artifacts, caseId, phase);

  if (!config.captureMemory) {
    const payload: MemorySnapshotArtifact = {
      schemaVersion: PERF_SCHEMA_VERSION,
      runId: config.runId,
      caseId,
      phase,
      capturedAt: new Date().toISOString(),
      ok: true,
      status: 'disabled',
      serverUrl: context.serverUrl,
    };
    await writeJsonArtifact(filePath, payload);
    return { ok: true, status: 'disabled', path: filePath };
  }

  try {
    const response = await context.conn.request.get('/debug/memory');
    if (response.status === 200) {
      const payload: MemorySnapshotArtifact = {
        schemaVersion: PERF_SCHEMA_VERSION,
        runId: config.runId,
        caseId,
        phase,
        capturedAt: new Date().toISOString(),
        ok: true,
        status: 'captured',
        serverUrl: context.serverUrl,
        httpStatus: response.status,
        snapshot: response.body,
      };
      await writeJsonArtifact(filePath, payload);
      return { ok: true, status: 'captured', path: filePath };
    }

    const error = toRedactedErrorSample(response.text || `HTTP ${response.status}`, {
      operation: 'memory.capture',
      status: response.status,
    }) as RedactedErrorSample;
    const payload: MemorySnapshotArtifact = {
      schemaVersion: PERF_SCHEMA_VERSION,
      runId: config.runId,
      caseId,
      phase,
      capturedAt: new Date().toISOString(),
      ok: false,
      status: 'unavailable',
      serverUrl: context.serverUrl,
      httpStatus: response.status,
      error,
    };
    await writeJsonArtifact(filePath, payload);
    return { ok: false, status: 'unavailable', path: filePath, error };
  } catch (err) {
    const error = toRedactedErrorSample(err, { operation: 'memory.capture' }) as RedactedErrorSample;
    const payload: MemorySnapshotArtifact = {
      schemaVersion: PERF_SCHEMA_VERSION,
      runId: config.runId,
      caseId,
      phase,
      capturedAt: new Date().toISOString(),
      ok: false,
      status: 'failed',
      serverUrl: context.serverUrl,
      error,
    };
    await writeJsonArtifact(filePath, payload);
    return { ok: false, status: 'failed', path: filePath, error };
  }
};
