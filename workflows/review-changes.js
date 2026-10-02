export const meta = {
  name: 'review-changes',
  description: 'Review the current diff across dimensions, then adversarially verify each finding',
  whenToUse: 'Before merging a branch or after an agent finishes a multi-file change',
  phases: [
    { title: 'Review', detail: 'one sonnet reviewer per dimension' },
    { title: 'Verify', detail: '3 opus skeptics per finding, majority wins', model: 'opus' },
  ],
}

const DIMENSIONS = [
  { key: 'correctness', prompt: 'logic errors, wrong conditions, off-by-one, unhandled null/undefined, broken edge cases' },
  { key: 'security', prompt: 'injection, missing auth/authorization checks, secrets in code, unsafe input handling' },
  { key: 'concurrency', prompt: 'race conditions, missing awaits, non-idempotent retries, shared mutable state' },
  { key: 'tests', prompt: 'changed behavior without tests, tests that assert nothing, tests that cannot fail' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          summary: { type: 'string' },
          scenario: { type: 'string', description: 'concrete input/state that triggers the bug' },
        },
        required: ['file', 'line', 'summary', 'scenario'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted', 'reason'],
}

const results = await pipeline(
  DIMENSIONS,
  // Cheap, wide: one reviewer per dimension.
  d => agent(
    `Review the uncommitted changes in this repo (git diff HEAD) for ${d.key} issues: ${d.prompt}. ` +
    `Report only issues you can tie to a specific line and a concrete failing scenario.`,
    { label: `review:${d.key}`, phase: 'Review', model: 'sonnet', effort: 'medium', schema: FINDINGS },
  ),
  // Expensive, narrow: each finding faces 3 independent skeptics.
  review => parallel((review?.findings ?? []).map(f => () =>
    parallel([0, 1, 2].map(i => () => agent(
      `Try to refute this code-review finding (skeptic #${i + 1}). Read the code yourself.\n` +
      `${f.file}:${f.line} — ${f.summary}\nScenario: ${f.scenario}\n` +
      `Set refuted=true if the scenario cannot happen or the code handles it. If unsure, refuted=true.`,
      { label: `verify:${f.file}:${f.line}`, phase: 'Verify', model: 'opus', effort: 'high', schema: VERDICT },
    ))).then(votes => ({ ...f, survives: votes.filter(Boolean).filter(v => !v.refuted).length >= 2 })),
  )),
)

const confirmed = results.flat().filter(Boolean).filter(f => f.survives)
log(`${confirmed.length} confirmed finding(s)`)
return confirmed
