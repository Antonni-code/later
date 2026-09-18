# Later
Close now, reopen later.

A small, private Chrome/Chromium extension that lets you deliberately save and close a tab, then reopen it from your shelf. No account, cloud sync, backend, scheduling, or AI.

## Stack
Manifest V3 · strict TypeScript · vanilla DOM/CSS · Vite + CRXJS · Vitest.
No application runtime dependencies. Node.js 24+ recommended for development.

## Install from source
1. Clone this repository.
2. Run `npm ci` and `npm run build`.
3. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
4. Select **dist**, not the source folder.
5. Pin Later, open an ordinary HTTP(S) page, and use **Save & close tab**.

The shortcut defaults to Cmd/Ctrl+Shift+L. If it conflicts with your browser or another extension, assign it at `chrome://extensions/shortcuts`. The popup shows the actual assigned shortcut.

## What works
- Save the current page locally before closing the captured tab.
- Reopen one saved page; it stays on the shelf.
- Confirm bulk reopening (up to 20 newest pages at a time).
- Remove individual items or confirm clearing the shelf.
- Keep up to 500 saved pages; reject overflow instead of evicting old pages.
- Versioned local data and safe migration from the original V0 shelf.
- Loading, empty, error, retry, pending, and partial-success states.

Internal browser pages, private-session tabs, pinned tabs, credential-bearing URLs, and file URLs are not saved. Unpin a pinned tab first.

## Development
`npm run dev` watches the production build. Load dist once, then reload the extension after worker or manifest changes and reopen the popup after UI changes.
`npm run check` runs typecheck, tests, and production build.
`npm run package` validates and produces `release/later-v0.2.0.zip`; the ZIP has manifest.json at its root.

## Project layout
| Folder | Owner |
| --- | --- |
| src/domain.ts, contracts.ts | Records, validation, and typed commands |
| src/repository.ts | Versioned local storage and serialized writes |
| src/service.ts | Save-before-close and bounded tab operations |
| src/background.ts | Chrome adapters, sender validation, shortcut, badge |
| popup/ | Semantic UI, state, confirmations, and interaction |
| test/ | Domain, worker, concurrency, failure, and DOM interaction tests |
| docs/ | Architecture, design, privacy, and delivery notes |
| scripts/ | Validated packaging and development-only visual-QA harness |

## Privacy and commercial status
Later requests only storage and temporary activeTab access. It has no content scripts, host permissions, analytics, remote favicons, remote fonts, or payment requests. Normal websites reopened by Chrome make their own requests.

Saved URLs can contain private query parameters. Data is confined to this browser profile and is not encrypted by Later. Clearing the shelf or uninstalling removes the extension's records. See [privacy](docs/PRIVACY.md).

This repository is public at the owner's request. No open-source license or paid unlock is included. Distribution, the one-time checkout provider, commercial licensing, and store submission require a separate decision. Chrome Web Store delivery should not be confused with integrated payment processing.

## Verification limitations
Mocked Chrome adapters and DOM tests do not prove behavior in an installed browser extension. The cloud browser blocked the local visual-QA page, so pixel layout has not been inspected. Run the [manual release checklist](docs/RELEASE.md) before distributing.

Navigation is checked again before closing; Chrome provides no atomic compare-and-close operation, so navigation in the final check/close interval remains a narrow race. If the worker stops after saving but before closing, the saved item remains and the original tab may remain open.
