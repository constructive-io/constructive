import { createHash } from 'node:crypto';

import {
  DEFAULT_RUN_ORDER_SEED,
  soakArmName,
  tenantCountsForHeap
} from './config';
import type { ArmPlan, DensityPlanV1 } from './types';

export interface DensityRunJob {
  arm: ArmPlan;
  heapMiB: number;
  tenantCount: number;
  repetition: number;
  orderIndex: number;
}

export interface CampaignScheduleJob {
  runKind: 'matrix' | 'soak';
  arm: string;
  heapMiB: number;
  tenantCount: number;
  repetition: number;
  orderIndex: number;
}

export interface CampaignScheduleManifestV1 {
  version: 1;
  campaignId: string;
  campaignStartedAt: string;
  runOrderSeed: string;
  planSha256: string;
  fleetSha256: string;
  node: string;
  v8: string;
  platform: NodeJS.Platform;
  architecture: string;
  jobs: CampaignScheduleJob[];
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const deterministicArmOrder = (
  arms: ArmPlan[],
  seed: string,
  repetition: number,
  heapMiB: number,
  tenantCount: number
): ArmPlan[] => [...arms].sort((left, right) => {
  const prefix = `${seed}\0${repetition}\0${heapMiB}\0${tenantCount}\0`;
  return sha256(`${prefix}${left.name}`).localeCompare(sha256(`${prefix}${right.name}`));
});

export const buildRunSchedule = (
  plan: DensityPlanV1,
  arms: ArmPlan[],
  heaps: number[],
  repetitions: number,
  tenantCountsOverride?: number[]
): DensityRunJob[] => {
  const jobs: DensityRunJob[] = [];
  const seed = plan.runOrderSeed ?? DEFAULT_RUN_ORDER_SEED;
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const heapMiB of heaps) {
      const counts = tenantCountsOverride ?? tenantCountsForHeap(plan, heapMiB);
      for (const tenantCount of counts) {
        for (const arm of deterministicArmOrder(
          arms,
          seed,
          repetition,
          heapMiB,
          tenantCount
        )) {
          jobs.push({
            arm,
            heapMiB,
            tenantCount,
            repetition,
            orderIndex: jobs.length + 1
          });
        }
      }
    }
  }
  return jobs;
};

export const scheduleJobsForPlan = (
  plan: DensityPlanV1,
  matrix: DensityRunJob[],
  includeSoak: boolean
): CampaignScheduleJob[] => {
  const jobs: CampaignScheduleJob[] = matrix.map((job) => ({
    runKind: 'matrix',
    arm: job.arm.name,
    heapMiB: job.heapMiB,
    tenantCount: job.tenantCount,
    repetition: job.repetition,
    orderIndex: job.orderIndex
  }));
  if (includeSoak && plan.soak?.enabled) {
    jobs.push({
      runKind: 'soak',
      arm: soakArmName(plan),
      heapMiB: plan.soak.heapMiB,
      tenantCount: plan.soak.tenantCount,
      repetition: plan.repetitions + 1,
      orderIndex: matrix.length + 1
    });
  }
  return jobs;
};

export const scheduleManifestSha256 = (
  manifest: CampaignScheduleManifestV1
): string => sha256(JSON.stringify(manifest));

export const sameRunSchedule = (
  left: DensityRunJob[],
  right: DensityRunJob[]
): boolean => JSON.stringify(left.map((job) => [
  job.arm.name,
  job.heapMiB,
  job.tenantCount,
  job.repetition,
  job.orderIndex
])) === JSON.stringify(right.map((job) => [
  job.arm.name,
  job.heapMiB,
  job.tenantCount,
  job.repetition,
  job.orderIndex
]));
