# Model orchestration

Drop this into `~/.claude/CLAUDE.md` (global) or a project's `CLAUDE.md`. Adjust model names to the ones you use.

## Rule 1 — The main session only orchestrates
If the main session runs on the most capable model, it **only orchestrates**: understands the request, decomposes it, delegates, checks the reports, and answers the user.
- It does not edit/write project files, run builds/tests/migrations, or do long investigations itself. Only the minimum needed for routing (read 1–2 files, `git status`, list a directory).
- The orchestrator model is never used as a subagent, at any depth.

## Rule 2 — Always delegate with an explicit tier
A subagent with no model set inherits the parent's model. Therefore:
- Always use one of these `subagent_type` values: `opus-low`, `opus-medium`, `opus-high`, `sonnet-low`, `sonnet-medium`, `sonnet-high` (fixed model + effort, defined in `~/.claude/agents/`).
- Don't use generic agent types without an override; if one is truly required, pass `model: "sonnet"` or `model: "opus"`.
- In Workflow scripts, every `agent()` call takes an explicit `model`.

## Routing matrix
Pick the cheapest tier that gets the job done; move up one step only if the report comes back insufficient.

| Task | Claude | Codex |
|---|---|---|
| Search, reading, summaries, renames, trivial edits | `sonnet-low` | `luna` low |
| Boilerplate, simple tests, docs, localized fixes | `sonnet-medium` | `luna` medium / `sol` low |
| Small/medium feature, code analysis | `sonnet-high` | `sol` medium / `terra` low |
| Multi-file implementation, debugging, refactor | `opus-medium` (`opus-low` if scope is closed) | `terra` medium |
| Architecture, subtle bugs, concurrency, security, planning | `opus-high` | `terra` high |
| Large repetitive batch (many files, same change) | `sonnet-low` in parallel | `luna` high / `sol` high |

Splitting work between Claude and Codex:
- **Claude** when the task needs this session's tools (MCP, skills, preview, memory) or a lot of conversation context.
- **Codex** for self-contained execution inside a repository (implement, fix, run tests) and for parallelizing without spending context.
- **Cross second opinion** on critical work: whoever implemented does not review. Implemented with Codex → reviewed by `opus-high`; implemented with Claude → reviewed by `terra` high (`codex exec review`).

## Codex — how to invoke
Models: `gpt-5.6-terra` (strongest for code), `gpt-5.6-sol` (everyday workhorse), `gpt-5.6-luna` (fast and cheap). Effort: `low`, `medium`, `high`.

```sh
codex exec -m gpt-5.6-terra -c model_reasoning_effort="high" -s workspace-write -C "<repo>" "<self-contained prompt>"
codex exec -m gpt-5.6-luna  -c model_reasoning_effort="low"  -s read-only       -C "<repo>" "<question>"
```
- `-s read-only` for analysis/review; `-s workspace-write` to change code. Never `danger-full-access` unless the user asks for it.
- Long prompt: send it via stdin (`cat prompt.md | codex exec ... -`).
- Long task: run it in the background and keep orchestrating; independent Codex tasks run in parallel (separate repos or worktrees — never two writers in the same working tree).
- Codex cannot see this conversation: the prompt must contain the goal, files, constraints, done criteria, and the verification command.
- Always review Codex's diff/output before trusting or building on it.

## Delegation contract (Claude and Codex)
Every delegated prompt contains: goal, relevant context/files, what **not** to touch, done criteria, verification command, and report format (files:lines changed, real verification output, open items).
The orchestrator checks the report before relaying it: `git diff --stat` and the test results. If something was not verified, say so instead of assuming.

## If the main session is not the top model
A mid-tier main session may execute small tasks directly; the matrix still applies to delegation.
