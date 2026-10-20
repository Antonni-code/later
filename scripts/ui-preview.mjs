// Local visual-QA harness only. Not referenced by the extension manifest or shipped.
import { build } from "vite";
import { readFile, writeFile } from "node:fs/promises";

const output = await build({ configFile: false, logLevel: "silent", build: { write: false, lib: { entry: "popup/popup.ts", name: "LaterPopup", formats: ["iife"] }, minify: false } });
const bundle = (Array.isArray(output) ? output[0] : output).output.find(chunk => chunk.type === "chunk").code;
const css = await readFile("popup/popup.css", "utf8");
const html = await readFile("popup/index.html", "utf8");
const seed = [
  ["Designing for the long term", "https://read.cv/notes/design", 0],
  ["A better way to manage your attention", "https://www.notion.so/attention", 1],
  ["Tiny projects, meaningful progress", "https://github.com/explore", 3],
  ["Release notes: what changed in the new popup", "https://github.com/Antonni-code/later", 20],
  ["CSS @starting-style and entry transitions", "https://developer.mozilla.org/docs/Web/CSS/@starting-style", 30],
  ["Designing calm interfaces", "https://read.cv/notes/calm", 52],
  ["Chrome extension service worker lifecycle", "https://developer.chrome.com/docs/extensions/develop/concepts/service-workers", 80],
  ["Writing for product interfaces", "https://www.notion.so/ux-writing", 200],
  ["Weekend reading list", "https://news.ycombinator.com/item?id=1", 260],
  ["Intl.Collator for natural sorting", "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator", 400]
].map(([title, url, hours], n) => ({ id: String(n), title, url, savedAt: new Date(Date.now() - hours * 3600000).toISOString() }));
const mock = `
let items = ${JSON.stringify(seed)};
window.chrome = { runtime: { id: 'visual-qa-only', sendMessage: async (message) => {
  let data;
  if (message.type === 'GET_STATE') data = { items: [...items], currentTab: { id: 7, title: 'The art of doing one thing at a time', url: 'https://read.cv/notes/focus', saveable: true, reason: '' }, shortcut: '⌘⇧L' };
  if (message.type === 'OPEN_TAB') data = { opened: 1 };
  if (message.type === 'REMOVE_TAB') { items = items.filter(i => i.id !== message.id); data = [...items]; }
  if (message.type === 'CLEAR_SHELF') { items = []; data = []; }
  if (message.type === 'OPEN_SELECTED') data = { opened: message.ids.length, total: message.ids.length, failed: 0 };
  if (message.type === 'OPEN_BATCH') data = { opened: items.length, total: items.length, failed: 0 };
  if (message.type === 'SAVE_TAB') { const item = { id: 'new', title: 'The art of doing one thing at a time', url: 'https://read.cv/notes/focus', savedAt: new Date().toISOString() }; items.unshift(item); data = { item, closed: false }; }
  return { ok: true, data };
} }, storage: { onChanged: { addListener: () => {} } } };
`;
const preview = html.replace('<link rel="stylesheet" href="popup.css" />', `<style>${css}</style>`).replace('<script type="module" src="popup.ts"></script>', `<script>${mock}</script><script>${bundle.replaceAll("</script", "<\\/script")}</script>`);
await writeFile("../later-visual-qa.html", preview);
console.log("Created visual-QA harness outside the extension build.");
