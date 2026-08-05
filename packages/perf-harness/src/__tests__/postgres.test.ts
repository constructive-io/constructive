import {
  parseCgroupKeyValues,
  parseCgroupV2Memory,
  parseDockerBytes
} from '../postgres';

describe('PostgreSQL container telemetry', () => {
  it('parses Docker memory units without decimal loss', () => {
    expect(parseDockerBytes('1.5GiB')).toBe(1.5 * 1024 ** 3);
    expect(parseDockerBytes('256MiB')).toBe(256 * 1024 ** 2);
    expect(parseDockerBytes('unknown')).toBeNull();
  });

  it('parses raw cgroup-v2 charge, peak, limits, stats, and events', () => {
    const raw = [
      '__CPERF_CGROUP_FILE__ memory.current',
      '104857600',
      '__CPERF_CGROUP_FILE__ memory.peak',
      '157286400',
      '__CPERF_CGROUP_FILE__ memory.max',
      '2147483648',
      '__CPERF_CGROUP_FILE__ memory.stat',
      'anon 73400320',
      'file 20971520',
      'shmem 1048576',
      '__CPERF_CGROUP_FILE__ memory.events',
      'low 0',
      'high 2',
      'oom 0',
      'oom_kill 0'
    ].join('\n');
    expect(parseCgroupV2Memory(raw)).toEqual({
      currentBytes: 104857600,
      peakBytes: 157286400,
      maxBytes: 2147483648,
      stat: {
        anon: 73400320,
        file: 20971520,
        shmem: 1048576
      },
      events: {
        low: 0,
        high: 2,
        oom: 0,
        oom_kill: 0
      }
    });
  });

  it('treats an unlimited cgroup max as null and rejects missing current charge', () => {
    expect(parseCgroupV2Memory([
      '__CPERF_CGROUP_FILE__ memory.current',
      '4096',
      '__CPERF_CGROUP_FILE__ memory.max',
      'max'
    ].join('\n'))).toMatchObject({ currentBytes: 4096, maxBytes: null });
    expect(parseCgroupV2Memory('__CPERF_CGROUP_FILE__ memory.max\nmax')).toBeNull();
    expect(parseCgroupKeyValues('anon 10\ninvalid\nfile nope\nshmem 20')).toEqual({
      anon: 10,
      shmem: 20
    });
  });
});
