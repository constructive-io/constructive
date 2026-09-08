import type { BenchmarkCaseDefinition, BenchmarkCoordinate } from './types';

const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffledCaseNames = (
  definitions: readonly BenchmarkCaseDefinition[],
  seed: number,
  repetition: number
): string[] => {
  const result = definitions.map(({ name }) => name);
  const random = seededRandom((seed ^ Math.imul(repetition, 0x9e3779b1)) >>> 0);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export const validateCaseDefinitions = (
  definitions: readonly BenchmarkCaseDefinition[]
): void => {
  if (definitions.length === 0) {
    throw new Error('benchmark suite must contain at least one case');
  }
  const names = definitions.map(({ name }) => name);
  if (
    names.some(
      (name) => name.length === 0 || name.trim() !== name || name.includes('\0')
    ) ||
    new Set(names).size !== names.length
  ) {
    throw new Error(
      'benchmark case names must be unique exact non-empty strings'
    );
  }
};

export const makeSchedule = (
  definitions: readonly BenchmarkCaseDefinition[],
  repetitions: number,
  seed: number,
  exactOrder: readonly string[] | null = null
): BenchmarkCoordinate[] => {
  validateCaseDefinitions(definitions);
  if (!Number.isSafeInteger(repetitions) || repetitions < 1) {
    throw new Error('repetitions must be a positive safe integer');
  }
  const expectedNames = definitions.map(({ name }) => name).sort();
  const schedule: BenchmarkCoordinate[] = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const order = exactOrder
      ? [...exactOrder]
      : shuffledCaseNames(definitions, seed, repetition);
    if (
      order.length !== definitions.length ||
      new Set(order).size !== definitions.length ||
      [...order].sort().some((name, index) => name !== expectedNames[index])
    ) {
      throw new Error(
        'exact order must contain each benchmark case exactly once'
      );
    }
    order.forEach((caseName, index) => {
      schedule.push({ repetition, position: index + 1, caseName });
    });
  }
  return schedule;
};
