# Later V0 release and recovery checklist

## Automated checks completed

- `npm run check`: strict TypeScript, 45 passing Vitest tests, and Vite production build.
- Tests include domain/storage constraints, corrupt/newer schemas, legacy migration interruption, concurrent writes, duplicate requests, save/close failures, sender/payload authorization, ID-based reopening, bounded/partial bulk opening, and popup DOM interactions.
- `npm audit --audit-level=high`: no reported vulnerabilities at verification time. This is not a security audit or guarantee.
- `npm run package`: validates permissions, required manifest assets, and release content. Builds clear dist to prevent stale bundles from shipping.
- `unzip -t release/later-v0.2.0.zip`: all archive entries pass CRC validation.

The packaged application has no runtime library dependencies. Bundles and system fonts are local; no telemetry or API backend exists.

## Manual checks still required before distribution

The cloud browser rejected the local visual-QA page under its URL policy. No bypass was attempted. DOM tests verify interaction logic, not pixel layout or actual Chrome API behavior. Store submission and paid licensing are not complete.

1. In an ordinary Chrome/Chromium profile, load dist via `chrome://extensions` → Developer mode → Load unpacked.
2. Pin Later. Save an HTTP(S) page using both the popup and the assigned shortcut; confirm the original closes and the shelf persists after browser restart.
3. Reopen the saved item and verify it stays saved. Delete a single item. Confirm Clear shelf cancellation and completion.
4. Try internal pages and pinned tabs; confirm save is unavailable and the original stays open. Verify private-session tabs cannot be saved if access is enabled in Chrome settings.
5. Seed several tabs and confirm bulk reopening opens at most 20 newest pages, keeps the list, and reports partial failures.
6. Inspect actual worker errors at chrome://extensions. Test popup reconnection after extension reload, unsupported storage, and browser suspension.
7. Visually inspect empty/loading/full/error/dialog states; keyboard focus and Escape; long titles; zoom and narrow presentation. Verify readable contrast and no hidden essential actions.
8. Inspect the final ZIP and manifest, confirm no development-only code or remote resources, then create accurate store listings and owner contact details.

## Recovery and rollback

- Failed persistence leaves the tab open. A lost reply means the outcome may be unknown: inspect the shelf before repeating a save.
- If closing fails or the URL changed during saving, the committed item remains and the original stays open; close it manually if desired.
- Browser interruption after save may leave the original open. The stored item does not rely on in-memory timers.
- Unknown or corrupt storage is never automatically overwritten. Do not clear/reinstall as a recovery step without preserving data.
- Before testing an upgrade with real saved data, copy the extension's `later.shelf` and legacy `savedTabs` JSON from Chrome's extension-storage inspection into an owner-controlled local backup. Avoid posting URLs/logs publicly. V0 has no export/import UI.
- Current schema v1 remains unchanged in this release. Downgrading to the original pre-versioned V0 cannot read migrated data, so do not downgrade a live profile without a verified restoration plan.
- To revert source, revert the relevant Git commit on a branch, run all checks, package it, and manually test a disposable profile before replacing an installed build. Do not erase the user's shelf during rollback.

## Commercial next step

Choose a one-time checkout and license strategy separately. GitHub publication is complete; the browser store is a distribution decision, not an implemented checkout. Do not embed secret signing keys or payment credentials in the extension. Public source and a local-only unlocked V0 do not enforce a paid entitlement.
