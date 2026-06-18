import { Logger } from '@pgpmjs/logger';

import type { TenantInstance } from './types';

const log = new Logger('multi-tenancy-cache:lifecycle');

/** Tenant resources that have already been disposed. Prevents double release via manual + LRU paths. */
const disposedTenants = new WeakSet<TenantInstance>();

export async function disposeTenant(tenant: TenantInstance): Promise<void> {
  if (disposedTenants.has(tenant)) {
    return;
  }
  disposedTenants.add(tenant);

  try {
    if (tenant.release) {
      await tenant.release();
      return;
    }
    if (tenant.httpServer?.listening) {
      await new Promise<void>((resolve) => {
        tenant.httpServer.close(() => resolve());
      });
    }
    if (tenant.realtimeManager) {
      await tenant.realtimeManager.stop();
    }
    if (tenant.pgl) {
      await tenant.pgl.release();
    }
  } catch (err) {
    log.error(`Error disposing handler buildKey=${tenant.buildKey}:`, err);
  }
}
