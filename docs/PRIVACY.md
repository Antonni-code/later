# Later V0 privacy notes

Later is a local-only tool for intentionally saving and reopening browser tabs.

## Data kept

For each saved page: a generated ID, page title, reopen URL, and saved timestamp. The extension stores this in Chrome's local extension storage in the current browser profile. URLs may include sensitive query parameters. Later does not encrypt records independently of the browser or device.

There are no accounts, cloud uploads, cross-device sync, analytics, AI requests, remote favicons/fonts, or payment calls. Reopening a website is normal browser navigation; that website's own network and privacy behavior is outside Later.

## Permissions

- `storage`: retain the shelf on this browser profile.
- `activeTab`: temporarily access the current page's title and URL when you click the extension or trigger its save shortcut.

No host permissions or content scripts are requested. Private-session and pinned tabs are not saved. Browser settings pages, local file URLs, and URLs with embedded username/password credentials are rejected.

## Retention and removal

Items remain until individually removed, the shelf is cleared, or the extension is uninstalled. Reopening does not remove an item. A full shelf rejects a new save rather than deleting old records. Migration writes validated legacy data into the new format before clearing the legacy source.

No external privacy/contact destination is invented for this V0. Before commercial distribution, the owner must provide actual support/contact information and ensure store disclosures describe the released implementation.
