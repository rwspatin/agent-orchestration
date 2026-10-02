# Delegation contract

Most "the AI messed up my code" stories are really "I gave it a vague prompt." A subagent or Codex job can't see your conversation, so the prompt has to carry everything.

## Every delegated prompt contains

1. **Goal**: what should be true when the task is done, in one or two sentences.
2. **Context**: the files, functions and decisions that matter. Paths, not descriptions.
3. **Out of scope**: what **not** to touch. Files, APIs, behavior that must stay as-is.
4. **Done criteria**: observable conditions, not "make it work."
5. **Verification**: the exact command that proves it (`npm test -- auth`, `pytest tests/billing`, a screenshot of a page).
6. **Report format**: files:lines changed, the real output of the verification command, open items.

## Template

```md
## Goal
<what should be true when this is done>

## Context
- <path/to/file.ts>: <why it matters>
- <decision already made that must be respected>

## Do not touch
- <path or behavior>

## Done when
- <observable condition>
- <observable condition>

## Verify with
<exact command>

## Report
- Files and lines changed
- Real output of the verification command
- Anything not done or not verified, stated explicitly
```

## Checking the report

Before relaying a result or building on it, the orchestrator checks:

- `git diff --stat`: did it touch only what it should?
- The verification output: is it real output, or a claim?
- Open items: is "not verified" stated, or silently skipped?

"Done" only counts when it's verified. If the agent couldn't run the check, the report says so.
