import type { Report } from '../types';

export function renderJson(report: Report, options: { pretty?: boolean } = {}): string {
  return options.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
}
