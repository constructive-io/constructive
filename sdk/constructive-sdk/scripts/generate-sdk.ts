import { generate } from '@constructive-io/graphql-codegen';

const INFRASTRUCTURE_SCHEMAS = [
  'metaschema_public',
  'metaschema_modules_public',
  'services_public',
  'ddl_audit_public',
] as const;

const OBJECTS_SCHEMAS = [
  'object_store_public',
  'object_tree_public',
] as const;

const APP_SCHEMAS = [
  'constructive_public',
  'constructive_users_public',
  'constructive_user_identifiers_public',
  'constructive_auth_public',
  'constructive_logging_public',
] as const;

const SCHEMAS = [...INFRASTRUCTURE_SCHEMAS, ...OBJECTS_SCHEMAS, ...APP_SCHEMAS];

async function main() {
  const modulePath = process.env.PGPM_MODULE_PATH || '../../application/app';

  console.log('Starting SDK generation...');
  console.log(`Schemas: ${SCHEMAS.join(', ')}`);
  console.log(`Module path: ${modulePath}`);

  const result = await generate({
    db: {
      pgpm: { modulePath },
      schemas: [...SCHEMAS],
    },
    output: './src',
    orm: true,
    verbose: true,
  });

  if (!result.success) {
    console.error('SDK generation failed:', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
    process.exit(1);
  }

  console.log('SDK generation completed successfully!');
  console.log(result.message);
  if (result.tables?.length) {
    console.log('Tables:', result.tables.join(', '));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
