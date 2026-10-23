import { cp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { build } from 'esbuild';
const native = process.argv.includes('--native');
const apiOrigin = native ? process.env.SALT_NATIVE_API_ORIGIN : '';
if (native) {
  const origin = new URL(apiOrigin || 'https://invalid.example');
  if (!apiOrigin || origin.protocol !== 'https:' || origin.origin !== apiOrigin || origin.username || origin.password) throw new Error('Set SALT_NATIVE_API_ORIGIN to the approved HTTPS backend origin before building a mobile release.');
}
const output = resolve('dist');
if (dirname(output) !== process.cwd() || basename(output) !== 'dist') throw new Error('Build output must be the workspace dist folder.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp('public', 'dist', { recursive: true, filter: source => !native || !['admin.html', 'admin.js', 'sw.js'].includes(basename(source)) });
await writeFile('dist/config.js', `window.SALT_CONFIG = ${JSON.stringify({ apiOrigin: apiOrigin || '' })};\n`);
await build({ entryPoints: ['public/app.js'], outfile: 'dist/app.js', bundle: true, format: 'esm', target: ['safari15', 'chrome89'], minify: false });
if (native) {
  for (const name of ['index', 'privacy', 'terms', 'support', 'delete-account']) {
    const path = `dist/${name}.html`;
    let html = await readFile(path, 'utf8');
    const policy = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: ${apiOrigin}; font-src 'self'; connect-src 'self' ${apiOrigin}; base-uri 'none'; form-action 'self'`;
    html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
    html = html.replace(/<span id="owner-link">[\s\S]*?<\/span>/, '');
    await writeFile(path, html);
  }
}
console.log(native ? 'Native app assets built.' : 'Web app built.');
