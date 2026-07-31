import { UUID } from './_common';
export interface InflectionRules {
  id: UUID;
  type: string | null;
  test: string | null;
  replacement: string | null;
}
export class InflectionRules implements InflectionRules {
  id: UUID;
  type: string | null;
  test: string | null;
  replacement: string | null;
  constructor(data: InflectionRules) {
    this.id = data.id;
    this.type = data.type;
    this.test = data.test;
    this.replacement = data.replacement;
  }
}