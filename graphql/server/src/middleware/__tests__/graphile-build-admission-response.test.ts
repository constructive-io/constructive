import type { Response } from 'express';
import {
  CacheBuildAdmissionError,
  GraphileRealtimeStartupError
} from 'graphile-cache';

import {
  GRAPHILE_BUILD_RESIDENT_CAPACITY_CODE,
  handleBuildAvailabilityError
} from '../graphile';
import { GraphileRealtimeNotificationConfigError } from '../realtime-notification-config';

describe('Graphile build admission responses', () => {
  it('maps preserved resident capacity to a stable retryable 503', () => {
    const response = {
      destroyed: false,
      writableEnded: false,
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn()
    };
    response.status.mockReturnValue(response);

    expect(handleBuildAvailabilityError(
      response as unknown as Response,
      new CacheBuildAdmissionError('resident_capacity')
    )).toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '15');
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: GRAPHILE_BUILD_RESIDENT_CAPACITY_CODE,
        message: 'GraphQL schema capacity is temporarily unavailable'
      }
    });
  });

  it.each([
    [
      new GraphileRealtimeNotificationConfigError('secret resolver detail'),
      'GRAPHILE_REALTIME_NOTIFICATION_CONFIG_INVALID',
      'Shared realtime notification configuration is unavailable'
    ],
    [
      new GraphileRealtimeStartupError('opaque-cache-key', new Error('secret startup detail')),
      'GRAPHILE_REALTIME_STARTUP_FAILED',
      'Realtime delivery could not be activated for this GraphQL instance'
    ]
  ])('maps realtime activation failures to credential-free stable 503s', (
    error,
    code,
    message
  ) => {
    const response = {
      destroyed: false,
      writableEnded: false,
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn()
    };
    response.status.mockReturnValue(response);

    expect(handleBuildAvailabilityError(
      response as unknown as Response,
      error
    )).toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '15');
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: { code, message }
    });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('secret');
  });
});
