# Later project instructions

- Preserve the approved local-only Manifest V3 scope. No backend, accounts, AI, sync, or payments without a specific request.
- Use strict TypeScript and vanilla semantic DOM/CSS. Runtime code must stay dependency-free and offline.
- The worker owns all storage writes and tab operations. Validate sender and message payloads; never accept a reopen URL from the popup.
- Persist before close. Storage failure must leave the original tab open. Do not silently evict data at capacity.
- Keep titles and URLs out of markup injection, logs, telemetry, and remote asset requests.
- Verify with `npm run check` before completing a task; note environmental limitations honestly.
- Task-sized commit style: `Build (Completed) : Later - ...`, `Improve (Completed) : Later - ...`, or `Fix (Completed) : Later - ...`.
- No assistant names, generated-by footers, or co-author trailers. Do not add a software license without user approval.
