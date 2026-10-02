# Workflows

For work bigger than one context can hold (audits, migrations, reviews across many files), Claude Code can run a **Workflow**: a JavaScript script that fans work out to many subagents with deterministic control flow (loops, fan-out, verification).

The same routing rules apply inside a workflow, with one extra rule:

> **Every `agent()` call takes an explicit `model`.** An agent without one inherits the session model. If the session runs on your most expensive model, a 30-agent fan-out does too.

## The building blocks

```js
agent(prompt, { model, effort, schema, phase, label, isolation })  // one subagent
pipeline(items, stage1, stage2, ...)  // each item flows through the stages independently (default)
parallel([() => agent(...), ...])     // barrier: waits for all (use only when you need all results together)
phase('Title')                        // groups agents in the progress view
log('message')                        // progress line for the user
```

- `schema` (JSON Schema) forces structured output, so `agent()` returns a validated object instead of text.
- `effort`: `'low'` for mechanical stages, higher only for judge/verify stages.
- `isolation: 'worktree'` gives each agent its own git worktree. Use it only when agents write files in parallel.

## Routing inside a script

| Stage | Model | Effort |
|---|---|---|
| Discovery, listing, grep-style sweeps | `sonnet` | `low` |
| Per-item analysis or implementation | `sonnet` (or `opus` for hard items) | `medium` |
| Adversarial verification, judging | `opus` | `high` |
| Final synthesis | `opus` | `medium` |

Cheap stages fan out wide; expensive stages only see what survived the cheap ones.

## Patterns that pay off

- **Find → verify:** cheap finders surface candidates; independent skeptics try to refute each one. Only findings that survive the majority get reported.
- **Implement → cross-review:** one agent implements, a different model reviews (in Claude Code that's `opus`; outside it, `codex exec review`).
- **Loop until dry:** keep spawning finders until two rounds in a row find nothing new.
- **Completeness critic:** a final agent asks "what wasn't covered?" and its answer becomes the next round.

## Examples

- [`workflows/review-changes.js`](../workflows/review-changes.js): review the current diff across dimensions, then adversarially verify each finding.
  Usage: *"run the workflow at workflows/review-changes.js"*.
- [`workflows/sweep-and-fix.js`](../workflows/sweep-and-fix.js): apply the same change across many files (one agent per file, an Opus reviewer per diff), then run your verification command once.
  Usage: *"run the workflow at workflows/sweep-and-fix.js with args {"change": "replace logger.warn with log.warn", "verify": "npm test"}"*.

Workflows are a Claude Code feature that fans out many agents, so they spend tokens fast. Claude Code only runs one when you explicitly ask for it.
