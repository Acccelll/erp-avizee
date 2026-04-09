# Supabase MCP Setup Execution (2026-04-09 UTC)

This note records the **corrected** execution of the Supabase MCP setup steps requested in this task.

## Corrections applied

- The previous failure `codex: command not found` was fixed by exposing the existing Codex binary on PATH:

  ```bash
  ln -sf /opt/codex/bin/codex ~/.local/bin/codex
  ```

## Requested steps and results

1. `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=pybdhgjytswncqvznhkw`
   - **Result:** ✅ Success (`Added global MCP server 'supabase'.`).

2. Add to `~/.codex/config.toml`:

   ```toml
   [mcp]
   remote_mcp_client_enabled = true
   ```

   - **Result:** ✅ Present and configured.

3. `codex mcp login supabase`
   - **Result:** ⚠️ Fails with `Error: No authorization support detected`.
   - Observed server status via `codex mcp get supabase`: `Auth: Unsupported`.

4. Verify authentication via `/mcp` inside Codex
   - **Result:** ⚠️ Not verifiable as authenticated in this shell-only environment because login is unsupported in current CLI/server combination.

5. `npx skills add supabase/agent-skills` (optional)
   - **Result:** ⚠️ Fails with npm registry access error (`403 Forbidden` for package `skills`) in this environment.

## Current MCP status snapshot

`codex mcp list` / `codex mcp get supabase` report:

- Server `supabase` exists and is enabled.
- Transport is `streamable_http`.
- Authentication support is currently `Unsupported`.

## Commands to rerun locally

```bash
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=pybdhgjytswncqvznhkw"
codex mcp login supabase
# inside Codex chat
/mcp
npx skills add supabase/agent-skills
```
