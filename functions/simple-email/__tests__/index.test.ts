import http from 'http';
import app from '../src/index';
import { getConnections, PgTestClient } from 'pgsql-test';

// Configuration
const RUN_E2E = process.env.RUN_E2E === 'true';

describe('Simple Email Function Suite', () => {

    describe('Direct HTTP Invocation', () => {
        let server: http.Server;
        let port: number;
        let baseUrl: string;

        beforeAll((done) => {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr === 'object') {
                    port = addr.port;
                    baseUrl = `http://127.0.0.1:${port}`;
                }
                done();
            });
        });

        afterAll((done) => {
            if (server) {
                server.close(done);
            } else {
                done();
            }
        });

        it('should respond to health check or invalid method', async () => {
            // This function expects POST with body. GET might fail or 404.
            // But we verifying server is up.
            const response = await fetch(baseUrl, {
                method: 'GET'
            });
            // Express usually 404s on unhandled routes using default knative-job-fn
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });

    // Unified Suite with Shared DB Connectivity Test
    describe('Database Connectivity (Unified)', () => {
        let db: PgTestClient;
        let teardown: (opts?: any) => Promise<void>;

        if (!RUN_E2E) {
            it.skip('skipping in-cluster verification (RUN_E2E not set)', () => { });
            return;
        }

        beforeAll(async () => {
            const connections = await getConnections({
                pg: {
                    user: process.env.PGUSER,
                    password: process.env.PGPASSWORD,
                    host: process.env.PGHOST,
                    port: Number(process.env.PGPORT || 5432),
                    database: process.env.PGDATABASE || 'launchql'
                },
                db: {
                    connections: {
                        app: {
                            user: process.env.PGUSER,
                            password: process.env.PGPASSWORD
                        }
                    },
                    auth: { role: process.env.PGUSER || 'postgres' }
                }
            });

            db = connections.db;
            teardown = connections.teardown;

            // Ensure anonymous role exists
            await connections.pg.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anonymous') THEN 
                        CREATE ROLE anonymous; 
                    END IF; 
                END 
                $$;
            `);
        });

        afterAll(async () => {
            if (teardown) {
                await teardown({ keepDb: true });
            }
        });

        it('should be able to connect to postgres', async () => {
            const res = await db.query('SELECT 1 as val');
            expect(res.rows[0].val).toBe(1);
            console.log('Successfully connected to Postgres!');
        });
    });
});
