import type { ParsedPayload } from './event-gate';

const MAX_VISIBLE_IDS = 10_000;

export class SubscriptionVisibility {
  private readonly visibleIds = new Set<string>();

  allow(payload: ParsedPayload, rowVisible: boolean): boolean {
    const id = payload.rowIds[0];
    if (payload.overflow || !id) return false;
    if (payload.event === 'DELETE') return this.visibleIds.delete(id);
    this.visibleIds.delete(id);
    if (!rowVisible) return false;
    this.visibleIds.add(id);
    if (this.visibleIds.size > MAX_VISIBLE_IDS) {
      this.visibleIds.delete(this.visibleIds.values().next().value!);
    }
    return true;
  }
}
