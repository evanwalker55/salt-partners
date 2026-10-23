import { readFile, writeFile } from 'node:fs/promises';

// Capacitor sync on Windows generates Windows separators inside Swift strings.
// Keep the generated package portable to the Mac that archives the iOS app.
const path = 'ios/App/CapApp-SPM/Package.swift';
const source = await readFile(path, 'utf8');
await writeFile(path, source.replace(/path: "([^"]+)"/g, (_, value) => `path: "${value.replaceAll('\\', '/')}"`));
console.log('iOS package paths normalized for macOS.');
