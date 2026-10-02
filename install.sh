#!/usr/bin/env bash
# Installs the fixed-tier agents into ~/.claude/agents.
# Does not touch your CLAUDE.md: paste ./CLAUDE.md into it yourself.
set -euo pipefail

force=false
case "${1:-}" in
  "") ;;
  --force) force=true ;;
  *) echo "usage: $0 [--force]" >&2; exit 2 ;;
esac

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
echo "Next: paste CLAUDE.md into ${CLAUDE_CONFIG_DIR:-~/.claude}/CLAUDE.md and adjust the model names."
