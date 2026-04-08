---
"monarch-orm": minor
---

The `many` relation now supports all field type combinations: single→single, single→array, array→single, and array→array.

The `refs` relation has been removed. Use `many` with an array `from` field instead.
