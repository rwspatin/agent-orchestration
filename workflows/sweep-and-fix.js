export const meta = {
  name: 'sweep-and-fix',
  description: 'Apply the same change across many files, one worktree per file, with a reviewer per file',
  whenToUse: 'Repetitive migrations: API renames, deprecated calls, logging changes across a codebase',
  phases: [
    { title: 'Discover', detail: 'sonnet lists every site that needs the change' },
    { title: 'Fix', detail: 'one sonnet agent per file, isolated worktree' },
    { title: 'Review', detail: 'opus checks each diff', model: 'opus' },
  ],
}

// args: { change: "replace logger.warn(...) with log.warn(...) and keep the message", verify: "npm test" }
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

phase('Discover')
const { files } = await agent(
  `List every file in this repo that needs this change: ${change}. Return repo-relative paths only.`,
  { model: 'sonnet', effort: 'low', schema: SITES },
)
log(`${files.length} file(s) to change`)

const results = await pipeline(
  files,
  file => agent(
    `In ${file} only, apply this change: ${change}. Do not touch any other file. ` +
    `Then run: ${verify}. Report the full diff and the real verification output.`,
    { label: `fix:${file}`, phase: 'Fix', model: 'sonnet', effort: 'medium', isolation: 'worktree' },
  ),
  (report, file) => agent(
    `Review this change to ${file}. The requested change was: ${change}.\n\nImplementer's report:\n${report}\n\n` +
    `ok=false if it changed anything beyond the request, broke behavior, or the verification output is missing or failing.`,
    { label: `review:${file}`, phase: 'Review', model: 'opus', effort: 'high', schema: REVIEW },
  ).then(r => ({ file, ...r })),
)

const failed = results.filter(r => !r?.ok)
log(`${results.length - failed.length}/${files.length} approved`)
return { approved: results.filter(r => r?.ok).map(r => r.file), failed }
