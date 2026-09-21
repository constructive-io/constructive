"""Summarize fresh-process samples; never pool requests across processes."""
import json
import gzip
import statistics
from pathlib import Path

directory = Path(__file__).resolve().parent / "results"
report = json.loads(gzip.decompress((directory / "postgres.json.gz").read_bytes()))
assert all(report["validation"][key] for key in (
    "allRunsSucceeded", "freshProcessPerRun", "caseValidationPassed",
    "schemaGroupsEquivalent",
))
samples = {}
for run in report["runs"]:
    samples.setdefault(run["caseName"], {})[run["repetition"]] = run["result"]["metadata"]


def describe(values):
    return {"median": statistics.median(values), "min": min(values), "max": max(values)}


def metrics(value):
    return {
        "mean_ms": value["requestLatencyMs"]["mean"],
        "p95_ms": value["requestLatencyMs"]["p95"],
        "p99_ms": value["requestLatencyMs"]["p99"],
        "cpu_ms_per_request": value["cpuMs"] / value["requests"],
        "retained_mib": value["retainedWorkloadHeapBytes"] / 1048576,
        "new_plans": value["measuredPlans"],
    }


summary = {}
for case, by_repetition in samples.items():
    values = [metrics(value) for value in by_repetition.values()]
    assert len({value["queryStreamHash"] for value in by_repetition.values()}) == 1
    summary[case] = {key: describe([value[key] for value in values]) for key in values[0]}
    summary[case]["samples"] = len(values)

comparisons = {}
for size in (32, 600):
    baseline = samples[f"pg-{size}-defaults"]
    for arm in ("example", "large"):
        name = f"pg-{size}-{arm}"
        candidate = samples[name]
        assert baseline.keys() == candidate.keys()
        for repetition in baseline:
            assert baseline[repetition]["queryStreamHash"] == candidate[repetition]["queryStreamHash"]
        comparisons[name] = {
            key: describe([
                100 * (metrics(candidate[rep])[key] / metrics(baseline[rep])[key] - 1)
                for rep in baseline
            ]) for key in ("mean_ms", "p95_ms", "cpu_ms_per_request", "retained_mib")
        }

output = {"sampleSummary": summary, "pairedPercentChangeVsDefaults": comparisons}
(directory / "postgres-summary.json").write_text(json.dumps(output, indent=2) + "\n")
for name in sorted(summary):
    value = summary[name]
    print(name, " ".join(f"{key}={value[key]['median']:.3f}" for key in (
        "mean_ms", "p95_ms", "cpu_ms_per_request", "retained_mib", "new_plans"
    )))
print("Paired changes:")
print(json.dumps(comparisons, indent=2))
