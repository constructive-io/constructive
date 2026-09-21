import { GraphileAdmission } from '../admission';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
};

describe('resident admission', () => {
  it('does not reuse capacity until eviction completes, including concurrent admissions', async () => {
    const disposal = deferred();
    let occupied = 1;
    const evict = jest.fn(async () => {
      if (!occupied) return false;
      await disposal.promise;
      occupied--;
      return true;
    });
    const admission = new GraphileAdmission({ occupied: () => occupied, evict }, 1, () => 10, 100);
    admission.configure({ buildReserveBytes: 10 });
    let admitted = false;
    const first = admission.reserve().then((reservation) => { admitted = true; return reservation; });
    const second = admission.reserve();
    const refusal = expect(second).rejects.toMatchObject({ code: 'SCHEMA_CAPACITY_EXHAUSTED' });
    await Promise.resolve();
    expect(admitted).toBe(false);
    disposal.resolve();
    const reservation = await first;
    await refusal;
    expect(admission.stats.reserved).toBe(1);
    reservation.release();
    reservation.release();
    expect(admission.stats.reserved).toBe(0);
  });

  it('reserves independent build headroom before admitting concurrent builders', async () => {
    const admission = new GraphileAdmission({ occupied: () => 0, evict: async () => false }, 10, () => 60, 100);
    admission.configure({ buildReserveBytes: 30 });
    const first = await admission.reserve();
    await expect(admission.reserve()).rejects.toMatchObject({ code: 'SCHEMA_CAPACITY_EXHAUSTED' });
    first.release();
    const next = await admission.reserve();
    next.release();
  });

  it('refuses publication after a build exceeds the heap watermark', async () => {
    let heap = 10;
    const admission = new GraphileAdmission({ occupied: () => 0, evict: async () => false }, 2, () => heap, 100);
    admission.configure({ buildReserveBytes: 10 });
    const reservation = await admission.reserve();
    heap = 101;
    expect(() => reservation.assertPublishable()).toThrow('Schema capacity');
    reservation.release();
  });

  it('does not recover from failed disposal when ownership counters reach zero', async () => {
    const error = new Error('release failed');
    const admission = new GraphileAdmission({ occupied: () => 0, evict: async () => false }, 2, () => 10, 100);
    admission.configure({ buildReserveBytes: 10 });
    const reservation = await admission.reserve();
    admission.fail(error);
    expect(() => reservation.assertPublishable()).toThrow(error);
    await expect(admission.reserve()).rejects.toBe(error);
    reservation.release();
    expect(admission.stats).toMatchObject({ reserved: 0, failed: true });
    admission.configure({ buildReserveBytes: 10 });
    await expect(admission.reserve()).rejects.toBe(error);
  });

  it('combines process owners conservatively and rejects impossible or malformed budgets', () => {
    const admission = new GraphileAdmission({ occupied: () => 0, evict: async () => false }, 10, () => 10, 100);
    admission.configure({ max: 4, buildReserveBytes: 10 });
    admission.configure({ max: 8, heapMaxBytes: 90, buildReserveBytes: 20 });
    expect(admission.stats).toMatchObject({ max: 4, heapMaxBytes: 90, buildReserveBytes: 20 });
    expect(() => admission.configure({ max: 0 })).toThrow();
    expect(() => admission.configure({ buildReserveBytes: 90 })).toThrow();
  });
});
