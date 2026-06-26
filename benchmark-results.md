# Benchmark Results

_Generated: 2026-06-26 01:46:44 UTC_

> Runs via `vitest bench` + jsdom. Measures JS-side mount/unmount cost — browser layout/paint excluded by design.
> All times in **ms**. Lower is better.

## hello-world

| | Framework | ops/sec | mean | min | p75 | p99 | margin |
|-|-----------|--------:|-----:|----:|----:|----:|-------:|
| 🏆 | **diyx** | 132929 | 0.0075 | 0.0054 | 0.0066 | 0.0187 | ±2.16% |
| 2. | **react** | 11410 | 0.0876 | 0.0644 | 0.0930 | 0.2618 | ±1.33% |

_**diyx** is **11.65×** faster than react._

