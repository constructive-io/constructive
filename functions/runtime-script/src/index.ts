import app from '@constructive-io/knative-job-fn';
import { Pool } from 'pg';

app.post('/', async (req: any, res: any) => {
    console.log('[runtime-script] Received script request');

    const payload = req.body;
    const query = payload.query;

    if (!query) {
        console.error('[runtime-script] No query provided');
        res.status(400).json({ error: 'Missing "query" in payload' });
        return;
    }

    console.log('[runtime-script] Executing query:', query);

    const pool = new Pool({
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'launchql'
    });

    let client;
    try {
        client = await pool.connect();
        const result = await client.query(query);

        console.log(`[runtime-script] Query executed. Rows: ${result.rowCount}`);

        res.status(200).json({
            message: 'Script executed successfully',
            rowCount: result.rowCount,
            rows: result.rows
        });
    } catch (error: any) {
        console.error('[runtime-script] Execution failed:', error);
        res.status(500).json({
            error: 'Script execution failed',
            details: error.message
        });
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
});

export default app;

if (require.main === module) {
    const port = Number(process.env.PORT ?? 8080);
    (app as any).listen(port, () => {
        console.log(`[runtime-script] listening on port ${port}`);
    });
}
