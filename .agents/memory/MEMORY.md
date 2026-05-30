# Memory Index

- [Acquisition autosave loop](acquisition-autosave.md) — the page PATCHes the property every ~2s while idle due to a hydration↔mutation cache cycle; harmless but noisy.
- [Timestamp date coercion](timestamp-date-coercion.md) — top-level timestamp columns 400 on save unless coerced (client sends date strings); use `optionalTimestamp` in the property schema.
