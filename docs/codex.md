# Codex

Codex is the parallel workforce: self-contained jobs inside a repo, running in the background while the orchestrator keeps going.

## Models and reasoning

| Model | Role | Typical effort |
|---|---|---|
| `gpt-5.6-luna` | Fast and cheap: searches, renames, repetitive batches | low–medium |
| `gpt-5.6-sol` | Everyday workhorse: features, fixes, tests | low–medium |
| `gpt-5.6-terra` | Strongest for code: multi-file work, hard bugs, reviews | medium–high |

Reasoning effort is set per call with `-c model_reasoning_effort="low|medium|high"`.

## Invocation

```sh
# change code
codex exec -m gpt-5.6-terra -c model_reasoning_effort="medium" -s workspace-write -C ~/code/app "<prompt>"

# answer a question without touching anything
codex exec -m gpt-5.6-luna -c model_reasoning_effort="low" -s read-only -C ~/code/app "<question>"

# long prompt via stdin
cat prompt.md | codex exec -m gpt-5.6-sol -c model_reasoning_effort="medium" -s workspace-write -C ~/code/app -
```

## Sandbox modes

- `-s read-only`: analysis and review.
- `-s workspace-write`: implementation inside the repo.
- `danger-full-access`: don't, unless you explicitly need it.

## Parallelism

- Independent jobs run in parallel, in the background.
- Never two writers in the same working tree. Use separate repos or `git worktree add` per job.

## Cross-review

Whoever implemented doesn't review:

```sh
# Claude implemented → Codex Terra reviews
cd ~/code/app
codex exec review --uncommitted -m gpt-5.6-terra -c model_reasoning_effort="high"   # working-tree changes
codex exec review --base main   -m gpt-5.6-terra -c model_reasoning_effort="high"   # whole branch vs main
```

Codex implemented → hand the diff to the `opus-high` subagent in Claude Code.

## Rules

- Codex can't see your conversation. The prompt follows the [delegation contract](delegation-contract.md).
- Always read the diff before trusting it or building on it. You own the final quality.
