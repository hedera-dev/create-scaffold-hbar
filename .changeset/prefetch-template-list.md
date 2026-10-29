---
"create-scaffold-hbar": patch
---

Start the template-list fetch before the project-name prompt instead of between that prompt and the template menu, so the GitHub request overlaps with the user typing. Removes a silent stall (462ms measured, up to the 10s request timeout on a slow connection) that had no spinner or message. The prefetch is gated so `--template`, `--yes` and `--ci` continue to make no network calls at all.
