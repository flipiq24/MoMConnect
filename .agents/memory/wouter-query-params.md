---
name: wouter query params
description: How to read URL query strings with wouter v3 in this app (useLocation is pathname-only)
---

# Reading query params with wouter v3

In wouter v3 (`wouter@^3.3.5`), `useLocation()` returns the **pathname only** — it does NOT include the `?query=string`. So `location.split('?')[1]` is always `undefined` and silently reads no params.

**Rule:** Read query params with `useSearch()` (returns the search string, no leading `?` needed — `new URLSearchParams(search)` handles it either way). Navigating with `setLocation('/path?x=1')` works fine and updates what `useSearch()` returns.

**Why:** `client/src/pages/acquisition.tsx` relied on `location.split('?')` to read `?tab=`, `?propertyId=`, and `?new=1`. It appeared to "work" only because the propertyId fallback loaded the most-recent property (often the same id being tested). The bug masked itself. Switched to `useSearch()`.

**How to apply:** Any new query-param reading in client pages must use `useSearch()`, not `useLocation()`. When changing one param, rebuild from the full current search (`new URLSearchParams(search)` then `.set(...)`) so you don't drop the others (e.g. keep `propertyId` when changing `tab`).
