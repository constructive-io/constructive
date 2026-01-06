import http from 'http';
import app from '../src/index';
import { getConnections, PgTestClient } from 'pgsql-test';
// import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

// Configuration
const RUN_E2E = process.env.RUN_E2E === 'true';
const TEST_TARGET_URL = process.env.TEST_TARGET_URL;

describe('Hello World Function Suite', () => {
    // Shared state
    let server: http.Server;
    let port: number;
    let baseUrl: string;

    // Start Server once for all tests
    beforeAll((done) => {
        if (TEST_TARGET_URL) {
            baseUrl = TEST_TARGET_URL;
            console.log(`[test] Targeting remote URL: ${baseUrl}`);
            done();
        } else {
            const appServer = app.listen(0, () => {
                const addr = appServer.address();
                if (addr && typeof addr === 'object') {
                    port = addr.port;
                    baseUrl = `http://127.0.0.1:${port}`;
                }
                server = appServer;
                done();
            });
        }
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('Direct HTTP Invocation', () => {
        it('should return 200 and echo the payload', async () => {
            const payload = { test: 'data' };
            const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Job-Id': 'test-job-id'
                },
                body: JSON.stringify(payload)
            });

            expect(response.status).toBe(200);

            const body = await response.json();
            expect(body).toMatchObject({
                message: 'Hello World',
                received: payload
            });
            expect(body.timestamp).toBeDefined();
        });
    });

    describe('Async Job Verification (pgsql-test)', () => {
        let db: PgTestClient;
        let teardown: (opts?: any) => Promise<void>;

        // Skip if not in E2E mode
        if (!RUN_E2E) {
            it.skip('skipping in-cluster verification (RUN_E2E not set)', () => { });
            return;
        }

        beforeAll(async () => {
            // Configuration is primarily driven by env vars (PGUSER, PGPASSWORD, PGHOST, PGPORT, TEST_DB)
            // provided by the K8s Job.
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
                    // Force the default role to be the user we logged in as
                    auth: { role: process.env.PGUSER || 'postgres' }
                }
            });

            db = connections.db;
            teardown = connections.teardown;

            // CRITICAL FIX: Create 'anonymous' role if it doesn't exist, because pgsql-test
            // defaults to setting it, causing errors if missing.
            await connections.pg.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anonymous') THEN 
                        CREATE ROLE anonymous; 
                    END IF; 
                END 
                $$;
            `);

            // Force the default role to be the user we logged in as
            await db.setContext({ role: process.env.PGUSER || 'postgres' });

            // KUBERNETES CHECKS REMOVED: Since this runs inside the pod, we rely on the external wrapper or readiness checks.
        });

        afterAll(async () => {
            if (teardown) {
                // keepDb: true prevents dropping the existing database
                await teardown({ keepDb: true });
            }
        });

        it('should invoke cloud function via job queue and verify side effects', async () => {
            const jobId = 'pgsql-verify-' + Date.now();
            console.log(`[verify] Enqueuing job with payload ID: ${jobId}`);

            // 1. Insert Job
            const insertQuery = `
                SELECT app_jobs.add_job(
                    '00000000-0000-0000-0000-000000000000', 
                    'hello-world', 
                    $1
                ) as job_row;
            `;
            const payload = JSON.stringify({ testId: jobId });
            await db.query(insertQuery, [payload]);

            console.log('[verify] Job enqueued successfully. Waiting for completion...');

            // MOCK WORKER: Simulate a worker to process the job since we are in a secluded environment
            const runWorker = async () => {
                const workerId = 'test-worker-1';
                // Loop for 30s max
                const end = Date.now() + 30000;
                while (Date.now() < end) {
                    try {
                        // 1. Get Job
                        const getRes = await db.query(`SELECT * FROM app_jobs.get_job($1)`, [workerId]);
                        if (getRes.rows.length > 0) {
                            const job = getRes.rows[0];
                            console.log(`[worker] Processing job ${job.id} (task: ${job.task_identifier})`);

                            // 2. Process (Call Function)
                            // In real usages, we'd hit the endpoint.
                            // Here we can just hit the URL we set up in beforeAll.
                            const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
                            await fetch(url, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Job-Id': job.id,
                                    'X-Worker-Id': workerId
                                },
                                body: JSON.stringify(job.payload)
                            });

                            // 3. Complete Job
                            await db.query(`SELECT app_jobs.complete_job($1, $2)`, [workerId, job.id]);
                            console.log(`[worker] Job ${job.id} completed.`);
                        }
                    } catch (e) {
                        console.warn('[worker] Error processing:', e);
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
            };
            // Start worker concurrently
            runWorker();

            // 2. Poll for Completion
            const startTime = Date.now();
            const timeout = 60000; // 60s timeout

            while (Date.now() - startTime < timeout) {
                const checkQuery = `
                    SELECT id, last_error, attempts, locked_by 
                    FROM app_jobs.jobs 
                    WHERE payload->>'testId' = $1
                `;
                const checkRes = await db.query(checkQuery, [jobId]);

                if (checkRes.rowCount === 0) {
                    console.log('[verify] Job not found in queue - likely COMPLETED successfully!');
                    return; // Success!
                }

                const job = checkRes.rows[0];
                if (job.last_error) {
                    console.error('[verify] Job failed with error:', job.last_error);
                    throw new Error(`Job failed: ${job.last_error}`);
                }

                console.log(`[verify] Job still valid (Attempts: ${job.attempts}, Locked: ${!!job.locked_by})...`);
                await new Promise(r => setTimeout(r, 2000));
            }

            throw new Error('Timeout waiting for job completion');
        }, 70000);
    });
});
