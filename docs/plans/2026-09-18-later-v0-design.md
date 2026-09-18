# Later V0 — approved design

## Goal and approval

Build the previously approved local-first Chrome/Chromium extension using strict TypeScript, vanilla DOM/CSS, Vite + CRXJS, and Vitest. The user approved the proposed stack and requested implementation, a dedicated public GitHub repository, and task-sized commits in this style: `Improve (Completed) : Later - concise description`. No co-author trailers or assistant names.

The main journey is save the current page, commit reopen data locally, close the original tab, and revisit it from the shelf. No automatic interception of ordinary tab closing. No accounts, cloud sync, scheduling, API, AI, or payment processing in this release.

## Alternatives and decision

- Recommended: typed lightweight extension; native controls, no runtime framework, clear privileged boundary.
- Keep plain JavaScript: lowest tooling cost, but weaker message and persistence contracts as the product grows.
- React/Next.js or a cloud service: useful for a larger web product, but adds unnecessary runtime/operations costs to this V0.

## Architecture and invariants

The popup sends a validated command to the service worker. The worker owns all writes and tab creation/closing. Domain functions validate HTTP(S) URLs, records, and the versioned shelf. A small repository adapter owns Chrome local storage and a serialized operation queue prevents overlapping read-modify-write operations.

Save before close. Never silently discard saved tabs when the shelf is full. Persist a record before calling tab removal; if closing fails, retain the record and report that the page was saved but not closed. Prevent two commands targeting the same tab from duplicating data or closing the next active page. Opening uses a saved ID, never a client-supplied URL. Reopen does not delete the record.

Migrate the existing `savedTabs` array only after a durable schema-v1 write. Unknown schema versions or malformed storage fail safely without overwriting the source. Keep retention bounded at 500 items and URL/title length bounded.

## Trust boundaries and privacy

Only this extension's popup is allowed to send privileged messages. Validate sender extension ID and exact popup URL, and validate action payloads. Request `activeTab` and `storage`, no host permissions or content scripts. Never load remote favicons, fonts, scripts, analytics, or trackers. Render stored titles and URLs as text, not HTML.

Local URLs may contain private information; store only the reopen URL, title, generated ID, timestamp, and temporary source-tab metadata for duplicate protection. Removing or uninstalling the extension removes local data. Incognito saving is rejected to avoid leaking private-session tabs into the regular shelf.

## UI and failure states

Compact editorial shelf: ivory background, ink text/button, subtle borders, amber detail. Show the current page, primary save-and-close button, saved count and readable list. Use native labeled controls, consistent local SVG icons, sufficient contrast, visible focus rings, reduced-motion support, and an accessible dialog for clear/open-all confirmation. Empty state explains the next action. Loading, recoverable errors, and status updates stay truthful. Offer retry for reads and restore focus after row removal.

## Verification and delivery

Unit/integration tests cover URL/message validation, malformed storage, migration, full shelves, concurrent saves/deletes, duplicate commands, write failure (must not close), close failure (record remains), opening only known IDs, sender checks, and bounded bulk reopening. Run typecheck, tests, build, and package-content verification. Inspect the rendered popup; distinguish mocked UI verification from real Chrome extension integration.

Do not claim universal speed, security certification, or perfection. Record measured bundle sizes and actual checks. GitHub source publication is authorized; Chrome Web Store submission and collecting payment are not. A commercial license/payment choice remains separate.
