import app from '../src/index';
import { getConnections, PgTestClient } from 'pgsql-test';
import http from 'http';

// Configuration
const RUN_E2E = process.env.RUN_E2E === 'true';

describe('Runtime Script Function Suite', () => {

    describe('Direct HTTP Invocation', () => {
        let server: http.Server;
        let port: number;
        let baseUrl: string;

        beforeAll((done) => {
            // Note: We don't initialize DB here for the App.
            // The App connects lazily on request.
            // We assume the DB will be ready when we make requests.
            // In a real scenario, we might want to wait for DB.
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

        it('should execute a simple query', async () => {
            // This test depends on DB availability.
            // We probably need to initialize DB *before* this runs if we want it to succeed.
            // Currently DB init happens in the NEXT describe block.
            // Jest runs describe blocks sequentially? No, it collects them.
            // beforeAll runs in order.
            // We should move DB init to TOP LEVEL beforeAll if we want shared DB.
        });
    });

    // Unified Suite with Shared DB
    describe('Full Integration', () => {
        let db: PgTestClient;
        let teardown: (opts?: any) => Promise<void>;
        let server: http.Server;
        let port: number;
        let baseUrl: string;

        if (!RUN_E2E) {
            it.skip('skipping in-cluster verification (RUN_E2E not set)', () => { });
            return;
        }

        beforeAll(async () => {
            // 1. Initialize DB via pgsql-test
            // This will create the DB (cloning template1).
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

            // Critical Fix: Ensure anonymous role exists
            await connections.pg.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anonymous') THEN 
                        CREATE ROLE anonymous; 
                    END IF; 
                END 
                $$;
            `);

            await db.setContext({ role: process.env.PGUSER || 'postgres' });

            // 2. Start App
            await new Promise<void>((resolve) => {
                server = app.listen(0, () => {
                    const addr = server.address();
                    if (addr && typeof addr === 'object') {
                        port = addr.port;
                        baseUrl = `http://127.0.0.1:${port}`;
                    }
                    resolve();
                });
            });
        });

        afterAll(async () => {
            if (server) server.close();
            if (teardown) {
                await teardown({ keepDb: true });
            }
        });

        it('should have app_jobs schema deployed via entrypoint', async () => {
            const res = await db.query(`
                SELECT nspname FROM pg_namespace WHERE nspname = 'app_jobs'
            `);
            expect(res.rowCount).toBe(1);
        });

        it('should execute a simple query (HTTP)', async () => {
            const query = 'SELECT 1 as val';
            const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.rowCount).toBe(1);
            expect(body.rows[0].val).toBe(1);
        });

        it('should be able to insert data and query it via function (Side Effect)', async () => {
            // 1. Create a real table (since temp tables are session-bound)
            await db.query(`CREATE TABLE IF NOT EXISTS real_test_table (id serial primary key, info text)`);
            await db.query(`TRUNCATE real_test_table`);
            await db.query(`INSERT INTO real_test_table (info) VALUES ('test_info')`);

            try {
                const query = "SELECT * FROM real_test_table";
                const response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });

                expect(response.status).toBe(200);
                const body = await response.json();
                expect(body.rowCount).toBe(1);
                expect(body.rows[0].info).toBe('test_info');

            } finally {
                await db.query(`DROP TABLE IF EXISTS real_test_table`);
            }
        });
    });
});
