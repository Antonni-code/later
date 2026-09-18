# Later V0 implementation plan

The brainstorming workflow points to a writing-plans skill, which is not installed in this session. This plan is the scoped fallback after the user-approved design.

1. Commit approved design and plan to the dedicated public repository.
2. Add strict TypeScript, Vite + CRXJS, Vitest, lockfile, and project instructions. Keep runtime dependency-free.
3. Implement domain contracts, versioned storage adapter, serialized operations, and validated worker messages. Add meaningful failure/concurrency tests.
4. Build popup around real extension state; support current-tab saving, one/all reopening, remove/clear, onboarding, shortcut copy, loading, retry, and accessible confirmations. Apply UI/UX skill guidance directly because its bundled generator script is missing.
5. Add local app icons, privacy notes, release/manual-test documentation, and CI checks. Preserve user commit style at each completed task.
6. Run typecheck/tests/build, inspect rendered UI if supported, validate release ZIP, publish task-sized commits to GitHub, and report remaining real-browser/store/payment limitations.
