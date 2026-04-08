---
"monarch-orm": minor
---

Relations now use typed field references instead of plain strings for `from` and `to` fields.

Relations also support default population options via `.options()`, which apply whenever a relation is populated with `true` and can be overridden per query.
