#!/bin/bash
set -e

# Start Postgres
echo "Starting Postgres..."
mkdir -p /run/postgresql
chown -R postgres:postgres /run/postgresql
chown -R postgres:postgres /var/lib/postgresql

# Init DB if needed
if [ ! -d "/var/lib/postgresql/data/base" ]; then
    echo "Initializing Database..."
    su postgres -c "initdb -D /var/lib/postgresql/data"
fi

# Start Server
su postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/log"

# Wait for readiness
echo "Waiting for Postgres..."
until su postgres -c "pg_isready"; do
    sleep 1
done

# Create Roles (Needed for deploy)
echo "Creating Roles..."
su postgres -c "psql -d postgres -c \"CREATE ROLE authenticated; CREATE ROLE anonymous; CREATE ROLE administrator;\" || true"

# Deploy Schema to template1
echo "Deploying Schema to template1..."
which pgpm || echo "pgpm not in PATH"
pgpm deploy --package pgpm-database-jobs --database template1 --yes

# Create Database (Skipped - let pgsql-test create it from template1)
# echo "Creating Database $PGDATABASE..."
# su postgres -c "createdb $PGDATABASE || true"

# Run Test
echo "Running Tests..."
pnpm test:inner
