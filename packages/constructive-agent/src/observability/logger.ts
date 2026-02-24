import { Logger } from '@pgpmjs/logger';

export const createAgentLogger = (namespace: string): Logger => {
  return new Logger(`constructive-agent:${namespace}`);
};
