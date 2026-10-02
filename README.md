# agent-orchestration

How I run coding agents across **Claude Code** and **Codex**: one model orchestrates, every task goes to the cheapest model + reasoning level that can do it well, and whoever implemented never reviews.

This repo is the setup itself, ready to install:

- **6 fixed-tier subagents** for Claude Code (`opus-low/medium/high`, `sonnet-low/medium/high`)
- **A drop-in `CLAUDE.md`** with the routing rules
- **Codex recipes**: models, reasoning levels, sandbox modes
- **Workflow scripts** for multi-agent fan-out with an explicit model on every agent
- **A delegation contract** template so delegated work comes back verifiable

## The three rules

**1. The most capable model only orchestrates.**
It understands the request, breaks it down, delegates and checks the reports. It doesn't edit files or run builds. The moment it starts "just fixing one thing," it burns context and loses the big picture.

**2. Cheapest model that can do the job well.**
Start at the lowest tier that fits. If the report comes back weak, move up one step. Never start at the top.

**3. Whoever implemented doesn't review.**
A different model reviews. For critical work, cross vendors: Claude wrote it → Codex reviews; Codex wrote it → Opus reviews. A second model catches what the first one is blind to.

## Routing matrix

| Task | Claude Code | Codex |
|---|---|---|
| Search, reading, summaries, renames, trivial edits | `sonnet-low` | Luna · low |
| Boilerplate, simple tests, docs, localized fixes | `sonnet-medium` | Luna · medium / Sol · low |
| Small/medium feature, code analysis | `sonnet-high` | Sol · medium / Terra · low |
| Multi-file implementation, debugging, refactor | `opus-medium` (`opus-low` if scope is closed) | Terra · medium |
| Architecture, subtle bugs, concurrency, security, planning | `opus-high` | Terra · high |
| Large repetitive batch (many files, same change) | `sonnet-low` in parallel | Luna · high / Sol · high |

Models in my setup: Claude Opus 5.5 and Sonnet 5; Codex `gpt-5.6-terra` (strongest for code), `gpt-5.6-sol` (everyday workhorse), `gpt-5.6-luna` (fast and cheap). Swap in whatever is current; the shape of the matrix is what matters.

### Claude or Codex?

- **Claude** when the task needs the session's tools (MCP, skills, browser preview, memory) or a lot of conversation context.
- **Codex** for self-contained work inside a repo (implement, fix, run tests) and for parallelism that doesn't spend the orchestrator's context.
- Never two writers in the same working tree. Parallel Codex jobs get separate repos or worktrees.

## Install

```sh
git clone https://github.com/rwspatin/agent-orchestration
cd agent-orchestration
./install.sh            # copies the agents to ~/.claude/agents (skips existing files)
./install.sh --force    # overwrite existing agents with the same names
```

Then paste [`CLAUDE.md`](CLAUDE.md) into your global `~/.claude/CLAUDE.md` (or a project's `CLAUDE.md`) and adjust the model names to the ones you use. The installer does not touch your `CLAUDE.md`.

Optional, in `~/.claude/settings.json`, pin the `opus` alias so `model: "opus"` always means the version you expect:

```json
{ "env": { "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-5-5" } }
```

## Why fixed-tier agents?

A subagent without an explicit model inherits the parent's model. If your main session runs on the most expensive model, every "quick search" subagent does too. The six agents in [`agents/`](agents) pin model **and** effort in their frontmatter, so routing is a choice of `subagent_type`, not something you have to remember on every call:

```md
---
name: sonnet-low
description: Fixed-tier executor (claude-sonnet-5, low effort).
model: claude-sonnet-5
effort: low
---
```

## Docs

- [Delegation contract](docs/delegation-contract.md): what every delegated prompt must contain
- [Codex](docs/codex.md): invocation, models, reasoning levels, sandbox modes, cross-review
- [Workflows](docs/workflows.md): multi-agent scripts with an explicit model per agent

## License

MIT
