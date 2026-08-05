'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { describe, it } = require('node:test');

const {
  createRealtimeConnectionRegistry,
  matchPhysicalUpgradeRoute,
} = require('./server.cjs');

const socket = () => Object.assign(new EventEmitter(), {
  destroyed: false,
  destroy() { this.destroyed = true; },
});

describe('physical density server-side realtime accounting', () => {
  it('routes only one exact customer and tenant upgrade path', () => {
    assert.deepEqual(
      matchPhysicalUpgradeRoute(
        '/customer/physical-customer-0007/tenant/b/graphql'
      ),
      { customerId: 'physical-customer-0007', tenantId: 'b' }
    );
    assert.equal(matchPhysicalUpgradeRoute('/customer/c1/tenant/b/graphql?token=x'), null);
    assert.equal(matchPhysicalUpgradeRoute('/customer/c1/graphql'), null);
    assert.equal(matchPhysicalUpgradeRoute('/customer/c1/tenant/b/other'), null);
  });

  it('counts one accepted live socket per surface without retaining clients', () => {
    const registry = createRealtimeConnectionRegistry(['customer-1:a', 'customer-1:b']);
    const a = socket();
    const b = socket();
    assert.equal(registry.trackAccepted('customer-1:a', a), true);
    assert.equal(registry.trackAccepted('customer-1:b', b), true);
    assert.deepEqual(registry.assertResident(), {
      connectionsExpected: 2,
      connectionsAccepted: 2,
      connectionsActive: 2,
      connectionDrops: 0,
      connectionErrors: 0,
      connectionsPerSurface: [
        {
          key: 'customer-1:a',
          accepted: 1,
          active: 1,
          peakActive: 1,
          drops: 0,
          errors: 0,
        },
        {
          key: 'customer-1:b',
          accepted: 1,
          active: 1,
          peakActive: 1,
          drops: 0,
          errors: 0,
        },
      ],
    });
  });

  it('fails residency after a drop, error, duplicate, or unknown route', () => {
    const registry = createRealtimeConnectionRegistry(['customer-1:a']);
    const accepted = socket();
    registry.trackAccepted('customer-1:a', accepted);
    accepted.emit('error', new Error('reset'));
    assert.throws(
      () => registry.assertResident(),
      /PDCF_REALTIME_CONNECTIONS_NOT_RESIDENT:0:1:1:1/
    );

    const duplicateRegistry = createRealtimeConnectionRegistry(['customer-1:a']);
    duplicateRegistry.trackAccepted('customer-1:a', socket());
    duplicateRegistry.trackAccepted('customer-1:a', socket());
    assert.throws(
      () => duplicateRegistry.assertResident(),
      /PDCF_REALTIME_CONNECTIONS_NOT_RESIDENT/
    );

    const unknown = socket();
    assert.equal(duplicateRegistry.trackAccepted('customer-2:a', unknown), false);
    assert.equal(unknown.destroyed, true);
  });
});
