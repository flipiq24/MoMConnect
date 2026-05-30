---
name: acquisition autosave loop
description: Why the acquisition page can fall into an infinite autosave loop, and how it's prevented
---

# Acquisition page infinite autosave loop

The acquisition form auto-saves on every `propertyData` change (debounced effect), and the save's `onSuccess` writes the saved property back into the React Query cache (`setQueryData`) that the hydration effect reads from.

**The loop:** hydrate sets `propertyData` → autosave fires → `onSuccess` `setQueryData(recent-property / properties/:id)` → `existingProperty` reference changes → hydration effect re-runs → `setPropertyData` (new object) → autosave fires again → repeats ~every 1s forever once any deal is open. It also continuously re-`invalidateQueries` the My Deals list, causing UI flicker.

**Fix / rule:** the hydration effect must only run when a *genuinely different* property loads — guard with `existingProperty.id !== currentPropertyId` (and include `currentPropertyId` in deps). Never let an effect that writes a cache also unconditionally re-run from that same cache.

**How to apply:** if you add any effect in `client/src/pages/acquisition.tsx` that reacts to the property query and also triggers a save/cache write, gate it so it can't re-fire on its own write. There is still one autosave-on-load write per property open (pre-existing); only the *loop* is removed.
