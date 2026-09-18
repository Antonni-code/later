import type { Action, Payloads, Reply, Results } from "../src/contracts";
import { LaterError, isRecord } from "../src/domain";

export async function send<K extends Action>(type: K, payload: Payloads[K]): Promise<Results[K]> {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) {
    throw new LaterError("EXTENSION_REQUIRED", "Load the built dist folder in Chrome Extensions to use Later.");
  }
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply: unknown = await Promise.race([
      chrome.runtime.sendMessage({ type, ...payload }),
      new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new LaterError("TIMEOUT", "The action is taking longer than expected. Check the shelf before retrying.")), 10000); })
    ]);
    if (!isRecord(reply) || typeof reply.ok !== "boolean") throw new LaterError("BAD_REPLY", "Later could not read the response. Please refresh the shelf.");
    const response = reply as Reply<Results[K]>;
    if (!response.ok) throw new LaterError(response.error.code, response.error.message);
    return response.data;
  } finally { if (deadline !== undefined) clearTimeout(deadline); }
}
