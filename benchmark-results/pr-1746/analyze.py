"""Validate and summarize all final reports, retaining per-process variation."""
import json
import gzip
import statistics
from pathlib import Path

directory = Path(__file__).resolve().parent
all_pids = []
summaries = {}
for filename in ("micro.json", "postgres.json", "variants.json"):
    report = json.loads(gzip.decompress((directory / (filename + ".gz")).read_bytes()))
    assert report["config"]["repetitions"] == 8
    assert not report["validation"]["errors"]
    for flag in ("allRunsSucceeded", "freshProcessPerRun", "caseValidationPassed", "schemaGroupsEquivalent"):
        assert report["validation"][flag], (filename, flag)
    cases = {}
    input_hashes = {}
    for run in report["runs"]:
        result = run["result"]
        assert result["status"] == "ok"
        all_pids.append(result["pid"])
        metadata = result["metadata"]
        group = metadata.get("workload", str(metadata.get("distinct", "variants")))
        input_hashes.setdefault(group, set()).add(metadata.get("inputHash", metadata.get("queryStreamHash")))
        cases.setdefault(run["caseName"], []).append(metadata)
    assert all(len(hashes) == 1 for hashes in input_hashes.values()), (filename, input_hashes)
    summary = {}
    for case, samples in sorted(cases.items()):
        assert len(samples) == 8
        def describe(values):
            return {"median": statistics.median(values), "min": min(values), "max": max(values)}
        value = {
            "requestMeanMs": describe([m["requestLatencyMs"]["mean"] for m in samples]),
            "requestP95Ms": describe([m["requestLatencyMs"]["p95"] for m in samples]),
            "requestP99Ms": describe([m["requestLatencyMs"]["p99"] for m in samples]),
            "cpuMsPerRequest": describe([m["cpuMs"] / m["requests"] for m in samples]),
            "retainedMiB": describe([m["retainedWorkloadHeapBytes"] / 1048576 for m in samples]),
            "newPlans": describe([m["measuredPlans"] for m in samples]),
            "requestsPerProcess": samples[0]["requests"],
            "samples": len(samples),
        }
        summary[case] = value
        print(case, " ".join(f"{key}={value[key]['median']:.4f}" for key in (
            "requestMeanMs", "cpuMsPerRequest", "retainedMiB", "newPlans")))
    summaries[filename] = summary
assert len(all_pids) == len(set(all_pids)), "worker PID reused across final suites"
output = {"finalFreshProcesses": len(all_pids), "reports": summaries}
(directory / "summary.json").write_text(json.dumps(output, indent=2) + "\n")
print(f"Validated {len(all_pids)} distinct worker processes.")
