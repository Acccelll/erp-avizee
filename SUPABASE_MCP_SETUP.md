# Supabase MCP Setup Attempt (2026-04-09 UTC)

This repository-side note records the requested Supabase MCP setup steps and outcomes from this environment.

## Requested steps and results

1. `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=pybdhgjytswncqvznhkw`
   - **Result:** Failed in this environment because `codex` CLI is not installed (`codex: command not found`).

2. Update `~/.codex/config.toml` with:

   ```toml
   [mcp]
   remote_mcp_client_enabled = true
   ```

   - **Result:** Completed successfully in this environment.

3. `codex mcp login supabase`
   - **Result:** Failed in this environment because `codex` CLI is not installed (`codex: command not found`).

4. Verify with `/mcp` inside Codex
   - **Result:** Could not run from this non-interactive shell environment.

5. `npx skills add supabase/agent-skills`
   - **Result:** Failed with npm registry access error (`403 Forbidden` for package `skills`).

## What to run on your machine

If your local environment has Codex installed and npm registry access, run:

```bash
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=pybdhgjytswncqvznhkw"
codex mcp login supabase
# inside Codex chat, run:
/mcp
npx skills add supabase/agent-skills
```
