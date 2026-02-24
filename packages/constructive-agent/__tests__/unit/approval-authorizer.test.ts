import {
  PolicyMatrixApprovalAuthorizer,
  RoleBasedApprovalAuthorizer,
  assertApprovalAuthorized,
} from '../../src/policy/approval-authorizer';

describe('approval authorizers', () => {
  it('allows only configured actors in role-based authorizer', async () => {
    const authorizer = new RoleBasedApprovalAuthorizer({
      allowedActors: ['operator-1'],
    });

    await expect(
      authorizer.authorize({
        runId: 'run-1',
        requestId: 'req-1',
        decision: 'approved',
        decidedBy: 'operator-1',
      }),
    ).resolves.toBe(true);

    await expect(
      authorizer.authorize({
        runId: 'run-1',
        requestId: 'req-1',
        decision: 'approved',
        decidedBy: 'operator-2',
      }),
    ).resolves.toBe(false);
  });

  it('supports scoped approval matrix rules', async () => {
    const authorizer = new PolicyMatrixApprovalAuthorizer({
      rules: [
        {
          id: 'deny-destructive-for-ops',
          priority: 20,
          effect: 'deny',
          deciders: ['operator-1'],
          riskClasses: ['destructive'],
        },
        {
          id: 'allow-tenant-low-risk',
          priority: 10,
          effect: 'allow',
          deciders: ['operator-1'],
          tenantIds: ['tenant-1'],
          decisions: ['approved'],
          riskClasses: ['low', 'high'],
        },
      ],
      defaultEffect: 'deny',
    });

    await expect(
      authorizer.authorize({
        runId: 'run-1',
        requestId: 'req-1',
        decision: 'approved',
        decidedBy: 'operator-1',
        tenantId: 'tenant-1',
        riskClass: 'low',
      }),
    ).resolves.toBe(true);

    await expect(
      authorizer.authorize({
        runId: 'run-1',
        requestId: 'req-1',
        decision: 'approved',
        decidedBy: 'operator-1',
        tenantId: 'tenant-1',
        riskClass: 'destructive',
      }),
    ).resolves.toBe(false);

    await expect(
      authorizer.authorize({
        runId: 'run-1',
        requestId: 'req-1',
        decision: 'approved',
        decidedBy: 'operator-2',
        tenantId: 'tenant-1',
        riskClass: 'low',
      }),
    ).resolves.toBe(false);
  });

  it('throws when assert helper fails authorization', async () => {
    const authorizer = new RoleBasedApprovalAuthorizer({
      allowedActors: ['operator-1'],
    });

    await expect(
      assertApprovalAuthorized(authorizer, {
        runId: 'run-1',
        requestId: 'req-1',
        decision: 'rejected',
        decidedBy: 'operator-2',
      }),
    ).rejects.toThrow('Approval decision not authorized');
  });
});
