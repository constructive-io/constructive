import { getHeapStatistics } from 'node:v8';

import { errors } from '@constructive-io/errors';

export interface GraphileAdmissionOptions {
  max?: number;
  heapMaxBytes?: number;
  buildReserveBytes?: number;
}

interface AdmissionOwner {
  /** Includes residents and entries whose disposal has not completed. */
  occupied(): number;
  /** Removes one resident and awaits its exact disposal; false if none exists. */
  evict(): Promise<boolean>;
}

export interface GraphileAdmissionReservation {
  assertPublishable(): void;
  release(): void;
}

/** Admission for the existing cache, not a second store of resident entries. */
export class GraphileAdmission {
  private tail: Promise<void> = Promise.resolve();
  private reserved = 0;
  private failure: unknown;
  private failed = false;
  private configured = false;
  private policy: Required<GraphileAdmissionOptions>;

  constructor(
    private readonly owner: AdmissionOwner,
    max: number,
    private readonly heapUsed = () => process.memoryUsage().heapUsed,
    heapMaxBytes = Math.floor(getHeapStatistics().heap_size_limit * 0.85)
  ) {
    this.policy = { max, heapMaxBytes, buildReserveBytes: 64 * 1024 * 1024 };
  }

  /** Multiple server owners share the strictest process-wide limits. */
  configure(options: GraphileAdmissionOptions = {}): void {
    for (const [name, value] of Object.entries(options)) {
      if (value === undefined) continue;
      if (!Number.isSafeInteger(value) || value < (name === 'buildReserveBytes' ? 0 : 1)) {
        throw errors.INTERNAL_FAILURE({ details: 'Invalid schema admission configuration' });
      }
    }
    const next = {
      max: Math.min(this.policy.max, options.max ?? this.policy.max),
      heapMaxBytes: Math.min(this.policy.heapMaxBytes, options.heapMaxBytes ?? this.policy.heapMaxBytes),
      buildReserveBytes: this.configured
        ? Math.max(this.policy.buildReserveBytes, options.buildReserveBytes ?? this.policy.buildReserveBytes)
        : options.buildReserveBytes ?? this.policy.buildReserveBytes
    };
    if (next.buildReserveBytes >= next.heapMaxBytes) {
      throw errors.INTERNAL_FAILURE({ details: 'Schema build reserve exhausts the heap budget' });
    }
    if (this.owner.occupied() + this.reserved > next.max) {
      throw errors.INTERNAL_FAILURE({ details: 'Schema capacity cannot be lowered below current ownership' });
    }
    this.policy = next;
    this.configured = true;
  }

  get stats(): Required<GraphileAdmissionOptions> & { reserved: number; failed: boolean } {
    return { ...this.policy, reserved: this.reserved, failed: this.failed };
  }

  /** Failed disposal cannot be treated as reclaimed capacity. */
  fail(error: unknown): void {
    this.failed = true;
    this.failure = error;
  }

  private assertHealthy(): void {
    if (this.failed) throw this.failure;
  }

  async reserve(): Promise<GraphileAdmissionReservation> {
    const previous = this.tail;
    let unlock!: () => void;
    this.tail = new Promise<void>((resolve) => { unlock = resolve; });
    await previous;
    try {
      this.assertHealthy();
      while (
        this.owner.occupied() + this.reserved >= this.policy.max ||
        this.heapUsed() + (this.reserved + 1) * this.policy.buildReserveBytes > this.policy.heapMaxBytes
      ) {
        // Do not wait for another builder while holding the admission mutex.
        // Only already-resident victims can be reclaimed by this operation.
        if (!await this.owner.evict()) throw errors.SCHEMA_CAPACITY_EXHAUSTED();
        this.assertHealthy();
      }
      this.reserved++;
      let released = false;
      return {
        assertPublishable: () => {
          this.assertHealthy();
          if (released || this.heapUsed() > this.policy.heapMaxBytes) {
            throw errors.SCHEMA_CAPACITY_EXHAUSTED();
          }
        },
        release: () => {
          if (!released) {
            released = true;
            this.reserved--;
          }
        }
      };
    } finally {
      unlock();
    }
  }
}
