/**
 * Reads benchmark-results.json (written by vitest bench outputJson) and
 * generates benchmark-results.md at the repo root.
 *
 * Usage:  node scripts/report.mjs
 * Or via: npm run report   (which runs vitest bench first, then this)
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const jsonPath = resolve(root, 'benchmark-results.json')
const mdPath = resolve(root, 'benchmark-results.md')

const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
const date = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

let md = `# Benchmark Results\n\n`
md += `_Generated: ${date}_\n\n`
md += `> Runs via \`vitest bench\` + jsdom. Measures JS-side mount/unmount cost — browser layout/paint excluded by design.\n`
md += `> All times in **ms**. Lower is better.\n\n`

for (const file of data.files ?? []) {
  for (const group of file.groups ?? []) {
    // "scenarios/01-hello-world/hello-world.bench.ts > hello-world" → "hello-world"
    const title = (group.fullName ?? group.name ?? 'unknown').split(' > ').pop()

    md += `## ${title}\n\n`
    md += `| | Framework | ops/sec | mean | min | p75 | p99 | margin |\n`
    md += `|-|-----------|--------:|-----:|----:|----:|----:|-------:|\n`

    const benchmarks = [...(group.benchmarks ?? [])].sort((a, b) => a.rank - b.rank)
    const fastest = benchmarks.find(b => b.rank === 1)

    for (const b of benchmarks) {
      const trophy = b.rank === 1 ? '🏆' : `${b.rank}.`
      const hz = b.hz.toFixed(0)
      const mean = b.mean.toFixed(4)
      const min = b.min.toFixed(4)
      const p75 = b.p75.toFixed(4)
      const p99 = b.p99.toFixed(4)
      const rme = `±${b.rme.toFixed(2)}%`
      md += `| ${trophy} | **${b.name}** | ${hz} | ${mean} | ${min} | ${p75} | ${p99} | ${rme} |\n`
    }

    if (fastest && benchmarks.length > 1) {
      const second = benchmarks.find(b => b.rank === 2)
      const ratio = (fastest.hz / second.hz).toFixed(2)
      md += `\n_**${fastest.name}** is **${ratio}×** faster than ${second.name}._\n`
    }

    md += '\n'
  }
}

writeFileSync(mdPath, md)
console.log(`Written → ${mdPath}`)
