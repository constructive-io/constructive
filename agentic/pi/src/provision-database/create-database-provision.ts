// Provision a database through the modules endpoint's createDatabaseProvisionModule
// mutation — an insert into database_provision_modules whose BEFORE INSERT trigger
// creates the database, domain, API, and module set before the row returns (the
// same contract constructive-client's admin app uses). The retired requestDatabase
// mutation only ever existed on dev builds of the api endpoint; production
// deployments (modules.launchql.dev) expose this one. bootstrapUser: true copies
// the owner into the new database so its per-DB API recognizes the account user.
// The generated ORM's default adapter is plain fetch, so the SDK's FetchAdapter is
// injected to keep *.localhost DNS/Host routing working in Node.

import { api, modules } from '@constructive-io/sdk';

import type { ProvisionModule } from './presets';

type ProvisionInput = Parameters<modules.DatabaseProvisionModuleModel['create']>[0]['data'];

export async function createDatabaseProvision(args: {
  endpoint: string;
  bearer: string;
  databaseName: string;
  domain: string;
  ownerId: string;
  modules: ProvisionModule[];
}): Promise<{ databaseId: string }> {
  const db = modules.createClient({
    adapter: new api.FetchAdapter(args.endpoint, {
      Authorization: `Bearer ${args.bearer}`,
    }),
  });
  const result = await db.databaseProvisionModule
    .create({
      data: {
        databaseName: args.databaseName,
        subdomain: args.databaseName,
        domain: args.domain,
        ownerId: args.ownerId,
        modules: args.modules as unknown as ProvisionInput['modules'],
        bootstrapUser: true,
      },
      select: {
        id: true,
        databaseId: true,
        status: true,
        errorMessage: true,
        completedAt: true,
      },
    })
    .unwrap();
  const record = result.createDatabaseProvisionModule?.databaseProvisionModule;
  if (!record) throw new Error('createDatabaseProvisionModule returned no provision record.');
  if (record.status === 'failed') {
    throw new Error(record.errorMessage ?? 'provisioning failed');
  }
  if (record.status !== 'completed') {
    throw new Error(
      record.errorMessage ?? `provisioning did not complete (status: ${record.status ?? 'unknown'})`,
    );
  }
  if (!record.databaseId) throw new Error('provisioning completed but returned no databaseId.');
  return { databaseId: record.databaseId };
}
