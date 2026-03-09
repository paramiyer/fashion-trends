# Codex Agent Instructions

## Purpose

This repository uses Codex as a coding agent for feature development and maintenance.

## Basic Operating Rules

1. Understand the task before making edits.
2. Keep changes scoped to the requested feature.
3. Prefer small, verifiable updates.
4. Run relevant checks/tests when available.
5. Document meaningful assumptions in commit messages or PR notes.

## Repository Map Maintenance

- After every feature development task, create/update `repo_map.md` using the `codegraph` MCP server so it reflects the current full repository structure.
- If files or folders were added, removed, or moved, regenerate `repo_map.md` in the same change.

## MCP Context Passing

- Required MCP server for repo structure mapping: `codegraph`.
- Use `codegraph` to generate `repo_map.md` and to pass `repo_map.md` as context before implementation.
- If `codegraph` is installed but not visible in the active session, refresh/restart the Codex session and re-check MCP resources/templates before proceeding.

## File and Naming Discipline

- Use clear file names and consistent structure.
- Avoid creating unused files.
- Keep documentation aligned with code changes.
