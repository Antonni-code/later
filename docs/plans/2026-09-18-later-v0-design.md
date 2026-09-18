# Later V0 — approved architecture

Local-first Chromium Manifest V3 extension. Strict TypeScript, vanilla DOM/CSS, Vite + CRXJS, and Vitest. No accounts, backend, sync, scheduling, AI, or payments in V0.

Popup sends validated ID-based commands to the service worker, which owns persistence and Chrome tab operations. Save durably before close; retain data on close failure. Serialize writes and reject full shelves instead of evicting records. Validate message sender and payloads. Version local storage and migrate the existing shelf without overwriting corrupt or newer data.

Request temporary activeTab and storage permissions only. No host permissions, content scripts, remote assets, or telemetry. Reject incognito saves. Render user-controlled data as text.

UI: compact ivory/ink shelf, a clear primary action, readable rows, current-page preview, empty/loading/error states, visible focus, and accessible destructive/bulk-action confirmations.

Verify URL and message validation, migration and corrupted storage, concurrency, duplicate requests, write/close failures, ID-based opening, permissions, typecheck, tests, build, and release content. Real Chrome integration and payment/store publication remain separate from mocked checks.

Use task-sized commit titles like `Improve (Completed) : Later - concise description`; no assistant names or co-author trailers.
