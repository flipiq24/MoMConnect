---
name: Acquisition autosave loop
description: Why the Acquisition page fires a property PATCH every ~2s even with no user input
---

# Acquisition autosave self-loop

The Acquisition page (`client/src/pages/acquisition.tsx`) autosaves on a timer keyed to `propertyData`, and the save-success handler writes the response back into the React Query cache, which re-triggers the hydration `useEffect`, which calls `setPropertyData`, which re-arms the autosave timer. The net effect is a continuous PATCH to `/api/properties/:id` roughly every 2 seconds even when the user types nothing.

**Why:** hydration and mutation-success both mutate the same `propertyData`/cache state, forming a cycle. It is harmless (server returns 200, data is stable) but floods the logs and makes "is autosave working?" hard to read.

**How to apply:** Don't mistake the steady PATCH stream for a real edit being saved — it's the idle loop. If you ever need to add a "dirty" check or debounce, break the cycle by not feeding mutation responses back through the hydration effect (e.g. guard hydration so it only runs on initial load / id change, not on every cache write). Predates the login-removal and Property-Information-card-removal work.
