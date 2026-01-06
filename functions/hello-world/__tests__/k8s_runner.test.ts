
// import { describe, it, expect } from '@jest/globals';
import { getK8sClient, runK8sTestJob } from './k8s-utils';
import { execSync } from 'child_process';
import * as path from 'path';

// Only run this test if we are NOT inside the pod
// We can check PGHOST or a custom env var.
// Dockerfile sets PGHOST=localhost.
// But locally we likely don't have that set (or set to proxied value).
// Better: Check for a specific flag or script.

const IS_INSIDE_POD = process.env.PGHOST === 'localhost';

const runIfExternal = IS_INSIDE_POD ? describe.skip : describe;

runIfExternal('Kubernetes Remote Test Runner', () => {
    it('Should run tests inside a K8s Pod', async () => {
        const k8s = getK8sClient();
        const namespace = 'default'; // Run in default namespace for simplicity
        const jobName = 'hello-world-test-runner';
        const image = 'constructive/hello-world-test:v15';

        // Optional: Build Image locally (if desired)
        // console.log('Building Docker Image...');
        // execSync('docker build -t constructive/hello-world-test:latest -f functions/hello-world/Dockerfile.test .', { stdio: 'inherit', cwd: process.cwd() + '/../../' });

        console.log('Dispatching K8s Job...');
        const success = await runK8sTestJob(k8s, namespace, jobName, image);

        expect(success).toBe(true);
    }, 120000); // 2 minute timeout
});
