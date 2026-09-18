import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";

const root = resolve("dist");
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3 || manifest.permissions.join(",") !== "storage,activeTab" || manifest.host_permissions?.length) throw new Error("Unexpected extension permissions or manifest version.");
for (const file of [manifest.action.default_popup, manifest.background.service_worker, ...Object.values(manifest.icons)]) await readFile(join(root, file));

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
    else throw new Error("Release cannot contain symlinks.");
  }
  return result.sort();
}

const table = Array.from({ length: 256 }, (_, n) => {
  let crc = n;
  for (let i = 0; i < 8; i++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const localParts = [], centralParts = [];
let offset = 0, count = 0;
for (const path of await files(root)) {
  const name = relative(root, path).replaceAll("\\", "/");
  if (name.endsWith(".map") || name.startsWith(".") || /(?:node_modules|\.env|test\/)/.test(name)) throw new Error(`Unexpected release file: ${name}`);
  const filename = Buffer.from(name), data = await readFile(path), crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8);
  central.writeUInt16LE(33, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
  localParts.push(local, filename, data); centralParts.push(central, filename);
  offset += local.length + filename.length + data.length; count++;
}
const central = Buffer.concat(centralParts), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
await mkdir("release", { recursive: true });
const filename = `release/later-v${manifest.version}.zip`;
await writeFile(filename, Buffer.concat([...localParts, central, end]));
console.log(`Validated ${count} files. Created ${filename}`);
