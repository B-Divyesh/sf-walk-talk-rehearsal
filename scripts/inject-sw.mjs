import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'sw.js') continue;
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(join(dir.pathname, entry.name), relative));
    else files.push(relative);
  }
  return files;
}
const files = await walk(dist);
const swPath = new URL('sw.js', dist);
const source = await readFile(swPath, 'utf8');
const manifest = `self.__PRECACHE_MANIFEST = ${JSON.stringify(files.sort())};\n`;
await writeFile(swPath, manifest + source);
