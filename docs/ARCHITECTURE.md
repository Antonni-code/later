# Later architecture

The smallest coherent product is a local-only extension, not a hosted SaaS service. The primary asset is the user's reopen data: saved titles, URLs, and dates. URLs may contain private information.

## Runtime boundary
| Component | Responsibility |
| --- | --- |
| Popup | Read state, render text, gather explicit user intent |
| Service worker | Validate sender/request, own persistence and tab operations |
| Domain/contracts | HTTP(S) validation, bounded records, schema and typed messages |
| Repository | Versioned Chrome storage; serialize reads/migrations/writes |
| Service | Capture tab IDs, save-before-close, duplicate protection, ID-based reopening |

The popup never writes storage directly or supplies a reopen URL. Only the exact popup URL and this extension's ID can call privileged message actions. Temporary activeTab is enabled by the action or shortcut; no persistent host access is requested.

## Persistence
`later.shelf` stores `{version:1, items:[{id,title,url,savedAt}]}`.
500 items maximum; titles 300 characters; URLs 8192 characters. Reopen keeps records; removal/clear are explicit. Overflow rejects the save and leaves the tab open.

Legacy `savedTabs` data is validated, written to the new schema, and only then cleared. A failed canonical write preserves the original. A failed cleanup preserves both and is retried on a later read. Malformed/newer schemas are not silently overwritten. Unsupported legacy records fail safely rather than being dropped.

## Critical paths
Save: captured tab ID → get/validate tab → create record → queued durable write → recheck URL/pinned/private state → close captured tab. Storage failure never triggers close. Close failure reports partial success and retains the record. Overlapping saves for the same captured tab share one in-flight result.

Reopen: saved ID → validated repository read → find record → create browser tab. Bulk reopening snapshots the shelf, opens up to 20 pages sequentially, and reports successes/failures without deleting records. Overlapping bulk commands share one in-flight operation.

Single-worker serialization protects read-modify-write flows; no other context owns a repository. Suspension after save may leave the original open, but persistence is not dependent on a timer. A final navigation/check-close race is not fully eliminable with Chrome's API.

## Resource and privacy choices
Dependency-free application runtime, bounded list rendering (40 rows initially), local monograms instead of remote favicons, system fonts, no telemetry or fetch-based APIs. CSP restricts script/style/font assets to the extension and outbound connections are disabled.

Accounts, cloud storage, database normalization, caches, workers outside Chrome, payment APIs, and AI are intentionally absent. A future license provider must keep its private signing/API secrets outside the extension package.

## Verification
See test/ for input/sender rejection, storage migration/corruption, failure recovery, concurrent writes, capacity, duplicate requests, bounded reopening, worker dispatch, and popup interaction tests. Typecheck/build/package validation are automated. Real extension execution and visual inspection remain release checks; mocked tests are not certifications.
