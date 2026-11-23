import { EventThrottle, type ParsedPayload } from './event-gate';
import { SubscriptionVisibility } from './visibility';

export class SubscriptionDelivery {
  private readonly visibility = new SubscriptionVisibility();
  private readonly throttle: EventThrottle;

  constructor(threshold: number) {
    this.throttle = new EventThrottle(threshold);
  }

  project(payload: ParsedPayload, rowVisible: boolean): ParsedPayload | null {
    if (!this.visibility.allow(payload, rowVisible)) return null;
    const action = this.throttle.check();
    if (action === 'drop') return null;
    if (action === 'overflow') return { event: payload.event, rowIds: [], overflow: true };
    return payload;
  }
}
