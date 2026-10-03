import { copyFile, mkdir } from 'node:fs/promises';

// Keep the browser worker and its shared module aligned with the installed version.
const source = new URL('../node_modules/maplibre-gl/', import.meta.url);
const target = new URL('../public/lib/maplibre/', import.meta.url);
await mkdir(target, { recursive: true });
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  await copyFile(new URL(`dist/${name}`, source), new URL(name, target));
}
await copyFile(new URL('LICENSE.txt', source), new URL('LICENSE.txt', target));
