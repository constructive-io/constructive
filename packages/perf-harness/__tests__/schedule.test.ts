import { makeSchedule } from '../src/schedule';

const cases = [
  { name: 'a', workerConfig: null },
  { name: 'b', workerConfig: null },
  { name: 'c', workerConfig: null },
];

describe('generic benchmark scheduling', () => {
  test('is deterministic and supports any case list', () => {
    const first = makeSchedule(cases, 4, 1234);
    expect(makeSchedule(cases, 4, 1234)).toEqual(first);
    expect(makeSchedule(cases, 4, 4321)).not.toEqual(first);
    for (let repetition = 1; repetition <= 4; repetition += 1) {
      expect(
        first
          .filter((item) => item.repetition === repetition)
          .map((item) => item.caseName)
          .sort()
      ).toEqual(['a', 'b', 'c']);
    }
  });

  test('accepts an exact order containing each case once', () => {
    expect(
      makeSchedule(cases, 2, 1, ['c', 'a', 'b']).map((item) => item.caseName)
    ).toEqual(['c', 'a', 'b', 'c', 'a', 'b']);
  });
});
