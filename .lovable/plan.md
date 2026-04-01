

## Problem Analysis

The "Clientes" detail drawer opens but stays stuck on "Carregando dados do cliente..." indefinitely.

**Root cause** in `src/components/views/ClienteView.tsx`:

1. **No error handling** — The `fetchData` function has no `try/catch`. If any Supabase query fails, the promise rejects silently and `setLoading(false)` is never called.
2. **Early return without cleanup** — Line 33: `if (!c) return;` exits without calling `setLoading(false)`, so if the client record isn't found, the spinner stays forever.

## Fix

**File: `src/components/views/ClienteView.tsx`** — Wrap `fetchData` in try/catch and ensure `setLoading(false)` always runs:

- Add `try/catch/finally` around the fetch logic
- Move `setLoading(false)` into the `finally` block so it always executes
- Handle the `!c` case by setting `selected` to null and returning (loading will still be set to false via finally)

This is a small, focused fix in a single file.

