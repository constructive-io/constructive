export class SteeringQueue<TMessage = string> {
  private steering: TMessage[] = [];
  private followUps: TMessage[] = [];

  enqueueSteering(message: TMessage): void {
    this.steering.push(message);
  }

  enqueueFollowUp(message: TMessage): void {
    this.followUps.push(message);
  }

  dequeueSteering(mode: 'one-at-a-time' | 'all' = 'one-at-a-time'): TMessage[] {
    if (mode === 'all') {
      const messages = this.steering.slice();
      this.steering = [];
      return messages;
    }

    if (this.steering.length === 0) {
      return [];
    }

    return [this.steering.shift() as TMessage];
  }

  dequeueFollowUp(mode: 'one-at-a-time' | 'all' = 'one-at-a-time'): TMessage[] {
    if (mode === 'all') {
      const messages = this.followUps.slice();
      this.followUps = [];
      return messages;
    }

    if (this.followUps.length === 0) {
      return [];
    }

    return [this.followUps.shift() as TMessage];
  }

  clear(): void {
    this.steering = [];
    this.followUps = [];
  }

  hasQueuedMessages(): boolean {
    return this.steering.length > 0 || this.followUps.length > 0;
  }
}
