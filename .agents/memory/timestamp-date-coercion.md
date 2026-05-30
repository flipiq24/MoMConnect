---
name: Timestamp columns reject client date strings
description: Drizzle-zod timestamp columns need z.coerce in the property insert/update schema or saves 400
---

Top-level `timestamp(...)` columns on the `properties` table (e.g. `contingencyRemovalDate`, `finalApprovalDate`) are validated by `insertPropertySchema`/`updatePropertySchema` (from `createInsertSchema`). By default these expect a JS `Date`, but the client writes date/ISO **strings** (`<input type="date">` values, `new Date().toISOString()`). A raw string fails `.parse()` with `Expected date, received string` → the PATCH/POST 400s and the value silently never persists.

**Why:** drizzle-zod maps a timestamp column to `z.date()`, not a string. This bit us because the existing manual date input had been writing strings all along — saves for those fields were quietly broken until tested.

**How to apply:** Any new top-level timestamp column that the UI sets must be coerced in the schema. Use the shared `optionalTimestamp` helper in `shared/schema.ts` (`z.preprocess(v => v === '' ? null : v, z.coerce.date().nullable().optional())`) and add it to the `.extend({...})` on `insertPropertySchema`. Date fields stored inside JSONB blobs (e.g. `finalContractTerms.emdStatusDate`) are fine as strings — only real timestamp **columns** need this.
