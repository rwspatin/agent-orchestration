#!/usr/bin/env bash
# Installs the fixed-tier agents into ~/.claude/agents.
# Does not touch your CLAUDE.md: paste ./CLAUDE.md into it yourself.
set -euo pipefail

force=false
[[ "${1:-}" == "--force" ]] && force=true

src="$(cd "$(dirname "$0")" && pwd)/agents"
dest="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/agents"
mkdir -p "$dest"

for f in "$src"/*.md; do
  name="$(basename "$f")"
  if [[ -e "$dest/$name" && "$force" == false ]]; then
    echo "skip     $name (exists, use --force to overwrite)"
  else
    cp "$f" "$dest/$name"
    echo "install  $name"
  fi
done

echo
echo "Next: paste CLAUDE.md into ~/.claude/CLAUDE.md and adjust the model names."
