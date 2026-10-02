export const meta = {
  name: 'sweep-and-fix',
  description: 'Apply the same change across many files, one agent per file, an Opus reviewer per diff, one final verify',
  whenToUse: 'Repetitive migrations: API renames, deprecated calls, logging changes across a codebase',
  phases: [
    { title: 'Discover', detail: 'sonnet lists every site that needs the change' },
    { title: 'Fix', detail: 'one sonnet agent per file' },
    { title: 'Review', detail: 'opus checks each file diff', model: 'opus' },
    { title: 'Verify', detail: 'run the verification command once, on the whole tree' },
  ],
}

// args: { change: "replace logger.warn(...) with log.warn(...) and keep the message", verify: "npm test" }
if (!args?.change || !args?.verify) throw new Error('args required: { change, verify }')
const { change, verify } = args

const SITES = {
  type: 'object',
  properties: { files: { type: 'array', items: { type: 'string' } } },
  required: ['files'],
}

const REVIEW = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, problems: { type: 'string' } },
  required: ['ok', 'problems'],
}

const VERIFY = {
  type: 'object',
  properties: { passed: { type: 'boolean' }, output: { type: 'string' } },
  required: ['passed', 'output'],
}

phase('Discover')
const sites = await agent(
  `List every file in this repo that needs this change: ${change}. Return repo-relative paths only.`,
  { model: 'sonnet', effort: 'low', schema: SITES },
)
const files = [...new Set(sites?.files ?? [])]
if (!files.length) {
  log('nothing to change')
  return { approved: [], failed: [], verify: null }
}
log(`${files.length} file(s) to change`)

// Agents share the working tree, but each one edits only its own file, so they don't collide.
// Verification runs once at the end, on the whole tree, instead of per agent.
const results = await pipeline(
  files,
  file => agent(
    `In ${file} only, apply this change: ${change}. Do not touch any other file and do not run the test suite. ` +
    `Report what you changed.`,
    { label: `fix:${file}`, phase: 'Fix', model: 'sonnet', effort: 'medium' },
  ),
  (report, file) => report == null
    ? { ok: false, problems: 'fix agent failed' }
    : agent(
      `Review the change to ${file} (run: git diff -- ${file}). The requested change was: ${change}.\n\n` +
      `Implementer's report:\n${report}\n\n` +
      `ok=false if it changed anything beyond the request or broke behavior.`,
      { label: `review:${file}`, phase: 'Review', model: 'opus', effort: 'high', schema: REVIEW },
    ),
)

const reviewed = results.map((r, i) => ({ file: files[i], ...(r ?? { ok: false, problems: 'stage failed' }) }))
const approved = reviewed.filter(r => r.ok).map(r => r.file)
const failed = reviewed.filter(r => !r.ok)
log(`${approved.length}/${files.length} approved by review`)

phase('Verify')
const result = await agent(
  `Run exactly this command in the repo root and report whether it passed, with its real output (last 80 lines): ${verify}`,
  { model: 'sonnet', effort: 'low', schema: VERIFY },
)

return { approved, failed, verify: result }
