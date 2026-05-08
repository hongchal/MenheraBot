#!/usr/bin/env bash
# Enforce branch naming convention: <type>/issue-<num>[-short-desc]
# Bypassed on protected/local branches (main, develop, HEAD-detached, etc.)
set -euo pipefail

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"

# Branches exempt from the convention (don't break commits during rebase / on main)
case "$BRANCH" in
  main|master|develop|HEAD) exit 0 ;;
esac

# Allowed types — adjust here if you want stricter or looser rules
PATTERN='^(feature|bugfix|hotfix|chore|docs|refactor|test|ci)/issue-[0-9]+(-[a-z0-9-]+)?$'

if [[ ! "$BRANCH" =~ $PATTERN ]]; then
  cat <<EOF >&2
❌ Branch name violates the project convention.

Required pattern:
  <type>/issue-<num>[-short-desc]

Allowed types:
  feature | bugfix | hotfix | chore | docs | refactor | test | ci

Examples:
  feature/issue-1
  feature/issue-12-add-auth
  bugfix/issue-42-fix-login
  chore/issue-7-bump-deps

Current branch: $BRANCH

Rename it with:
  git branch -m feature/issue-N-short-desc

(Or push from a properly named branch.)
EOF
  exit 1
fi

exit 0
