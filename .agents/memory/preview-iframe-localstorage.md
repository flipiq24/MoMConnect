---
name: preview iframe localStorage crash
description: Why localStorage/sessionStorage access can blank the whole app inside the Replit preview iframe
---

# localStorage throws inside the embedded preview iframe

The Replit workspace/canvas preview loads the app inside a cross-origin iframe
(`/__replco/workspace_iframe.html`). Under modern browser storage partitioning,
accessing `window.localStorage` (or `sessionStorage`) from that third-party
context can throw `SecurityError`.

**Symptom:** the page "appears then disappears" / "won't show" **only inside the
Replit preview iframe**, while a direct load (and the agent's app_preview
screenshot, which loads the dev URL top-level) renders fine. That discrepancy —
agent screenshots always work, user's canvas iframe always blanks — is the tell.

**Why it blanks:** an unguarded `localStorage` read in a render path (e.g. a
`useState` initializer) or a write in a `useEffect` throws, the error propagates
to React, and the tree unmounts → blank.

**Rule:** never access `localStorage`/`sessionStorage` directly. Wrap every read
and write in `try/catch` with a safe fallback. Applies to any provider/hook that
persists UI state (theme, sidebar, dismissed banners, etc.).

**How to apply:** when adding client-persisted state, guard storage access. If a
user reports the preview blanking but agent screenshots look fine, suspect an
unguarded storage (or other browser API) call in a context the partitioned
iframe blocks, and the user must hard-refresh the preview to pick up the fix.
