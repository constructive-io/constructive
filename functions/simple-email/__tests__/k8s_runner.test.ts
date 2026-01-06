
import { getK8sClient, runK8sTestJob } from './k8s-utils';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Kubernetes Remote Test Runner', () => {
    // Increase timeout for build/deploy/run
    jest.setTimeout(180000);

    it('Should run tests inside a K8s Pod', async () => {
        const k8s = getK8sClient();
        const namespace = 'default'; // Run in default namespace for simplicity
        const jobName = 'simple-email-test-runner';
        const image = 'constructive/simple-email-test:v4';

        // Optional: Build Image locally (if desired)
        // console.log('Building Docker Image...');
        // execSync('docker build -t constructive/simple-email-test:v1 -f base/Dockerfile.test .', { stdio: 'inherit', cwd: process.cwd() + '/../../' });

        // Run the job
        console.log('Dispatching K8s Job...');
        const success = await runK8sTestJob(k8s, namespace, jobName, image);

        expect(success).toBe(true);
    });
});
