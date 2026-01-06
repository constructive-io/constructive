
import { KubernetesClient } from "kubernetesjs";
// import { fetch } from "undici"; // Reliance on global fetch in Node 18+

export const getK8sClient = () => {
    return new KubernetesClient({ restEndpoint: 'http://127.0.0.1:8001' });
};

/**
 * Checks if a deployment is ready (readyReplicas >= 1)
 */
export const checkDeploymentReady = async (k8s: KubernetesClient, namespace: string, name: string): Promise<boolean> => {
    try {
        const deployment = await k8s.readAppsV1NamespacedDeployment({
            path: { namespace, name },
            query: {}
        });
        const isReady = !!(deployment.status?.readyReplicas && deployment.status.readyReplicas >= 1);
        if (isReady) {
            console.log(`[k8s] Deployment ${namespace}/${name} is READY.`);
        } else {
            console.warn(`[k8s] Deployment ${namespace}/${name} is NOT READY.`);
        }
        return isReady;
    } catch (e) {
        console.error(`[k8s] Failed to check deployment ${namespace}/${name}:`, e);
        return false;
    }
};

/**
 * Checks if pods matching selector are running
 */
export const checkPodsRunning = async (k8s: KubernetesClient, namespace: string, labelSelector: string): Promise<any[]> => {
    try {
        const pods = await k8s.listCoreV1NamespacedPod({
            path: { namespace },
            query: { labelSelector }
        });
        const runningPods = (pods.items || []).filter((p: any) => p.status?.phase === 'Running' && !p.metadata?.deletionTimestamp);

        if (runningPods.length > 0) {
            console.log(`[k8s] Found ${runningPods.length} running pods for ${labelSelector}.`);
        } else {
            console.warn(`[k8s] No running pods found for ${labelSelector}.`);
        }
        return runningPods;
    } catch (e) {
        console.error(`[k8s] Failed to check pods for ${labelSelector}:`, e);
        return [];
    }
};

/**
 * Dumps logs for pods matching selector
 */
export const dumpK8sLogs = async (k8s: KubernetesClient, namespace: string, labelSelector: string, containerName?: string) => {
    if (!k8s) return;
    try {
        console.log(`[k8s-debug] Fetching logs for ${namespace}/${labelSelector}...`);
        const pods = await k8s.listCoreV1NamespacedPod({
            path: { namespace },
            query: { labelSelector }
        });

        // Sort by creation timestamp, newest first
        const sortedPods = (pods.items || []).sort((a: any, b: any) => {
            return new Date(b.metadata.creationTimestamp).getTime() - new Date(a.metadata.creationTimestamp).getTime();
        });

        if (sortedPods.length > 0) {
            const podName = sortedPods[0].metadata?.name;
            if (podName) {
                try {
                    // Workaround: KubernetesJS expects JSON, logs are text. Use raw fetch via proxy.
                    const qs = new URLSearchParams({ tailLines: '50' });
                    if (containerName) qs.append('container', containerName);

                    const res = await fetch(`http://127.0.0.1:8001/api/v1/namespaces/${namespace}/pods/${podName}/log?${qs.toString()}`);
                    if (!res.ok) {
                        const errText = await res.text();
                        console.warn(`[k8s-debug] Failed to read logs for ${podName}: ${res.status} ${errText}`);
                        return;
                    }
                    const logs = await res.text();
                    console.log(`\n=== LOGS: ${namespace}/${podName} (${containerName || 'default'}) ===\n${logs}\n==============================\n`);
                } catch (logErr) {
                    console.warn(`[k8s-debug] Failed to read logs for ${podName}:`, logErr);
                }
            }
        } else {
            console.warn(`[k8s-debug] No pods found for ${namespace}/${labelSelector}`);
        }
    } catch (e) {
        console.error(`[k8s-debug] Error dumping logs via selector ${labelSelector}:`, e);
    }
};

/**
 * Runs a Kubernetes Job to execute tests inside the cluster.
 * Polls for completion and streams logs.
 */
export const runK8sTestJob = async (k8s: KubernetesClient, namespace: string, jobName: string, image: string): Promise<boolean> => {
    console.log(`[k8s] Starting Test Job ${jobName} with image ${image}...`);

    // 1. Delete existing job (cleanup)
    try {
        await k8s.deleteBatchV1NamespacedJob({
            path: { namespace, name: jobName },
            query: { propagationPolicy: 'Background' }
        });
        // Short wait to ensure deletion propagates (simple hack, strictly should wait for API 404)
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) { /* ignore if not exists */ }

    // 2. Create Job
    try {
        await k8s.createBatchV1NamespacedJob({
            path: { namespace },
            body: {
                metadata: {
                    name: jobName,
                    namespace: namespace
                },
                spec: {
                    backoffLimit: 0,
                    template: {
                        metadata: {
                            labels: {
                                "job-name": jobName,
                                "app": jobName
                            }
                        },
                        spec: {
                            restartPolicy: "Never",
                            containers: [{
                                name: "test",
                                image: image,
                                imagePullPolicy: "Never", // Use local image
                                env: [
                                    { name: "PGHOST", value: process.env.TEST_PGHOST || "localhost" },
                                    { name: "PGUSER", value: process.env.TEST_PGUSER || "postgres" },
                                    { name: "PGPASSWORD", value: process.env.TEST_PGPASSWORD || "postgres" },
                                    { name: "PGDATABASE", value: process.env.TEST_PGDATABASE || "launchql" },
                                    { name: "TEST_TARGET_URL", value: process.env.TEST_TARGET_URL || "" },
                                    // Pass through any other required env vars
                                    { name: "RUN_E2E", value: "true" }
                                ]
                            }]
                        }
                    }
                }
            },
            query: {}
        });
    } catch (e) {
        console.error(`[k8s] Failed to create job ${jobName}:`, e);
        return false;
    }

    // 3. Poll for Completion
    console.log(`[k8s] Waiting for job ${jobName} to complete...`);
    let attempts = 0;
    while (attempts < 60) { // 60s timeout? Maybe longer for build/initDB
        await new Promise(r => setTimeout(r, 2000)); // 2s polling
        attempts++;

        try {
            const job = await k8s.readBatchV1NamespacedJob({
                path: { namespace, name: jobName },
                query: {}
            });

            if (job.status?.succeeded && job.status.succeeded >= 1) {
                console.log(`[k8s] Job ${jobName} SUCCEEDED.`);
                await dumpK8sLogs(k8s, namespace, `job-name=${jobName}`);
                return true;
            }
            if (job.status?.failed && job.status.failed >= 1) {
                console.error(`[k8s] Job ${jobName} FAILED.`);
                await dumpK8sLogs(k8s, namespace, `job-name=${jobName}`);
                return false;
            }
        } catch (e) {
            console.warn(`[k8s] Error checking job status:`, e);
        }
    }

    console.error(`[k8s] Job ${jobName} TIMED OUT.`);
    return false;
};
