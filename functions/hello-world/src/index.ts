import app from '@constructive-io/knative-job-fn';

app.post('/', async (req: any, res: any) => {
    // eslint-disable-next-line no-console
    console.log('[hello-world] Hello from Cloud Function!');
    // eslint-disable-next-line no-console
    // AUTHENTICITY CHECK: This log proves we are running the real code!
    console.log(`[hello-world] REAL CODE EXECUTION VERIFIED: ${new Date().toISOString()}`);
    console.log('[hello-world] Payload:', JSON.stringify(req.body, null, 2));

    res.status(200).json({
        message: 'Hello World',
        received: req.body,
        timestamp: new Date().toISOString()
    });
});

export default app;

if (require.main === module) {
    const port = Number(process.env.PORT ?? 8080);
    (app as any).listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`[hello-world] listening on port ${port}`);
    });
}
