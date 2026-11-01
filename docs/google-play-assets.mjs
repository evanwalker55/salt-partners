import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, '.private/google-play-preparation/assets');
await mkdir(output, { recursive: true });
await copyFile(resolve(root, 'public/icon-512.png'), resolve(output, 'app-icon-512.png'));
const bungee = (await readFile(resolve(root, 'public/fonts/bungee.woff2'))).toString('base64');
const sans = (await readFile(resolve(root, 'public/fonts/opensans.woff2'))).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500" role="img" aria-label="Simply Salt Partners: Good referrals. Real rewards. Customer referrals, technician rewards, and company stickers.">
<defs><style>@font-face{font-family:Bungee;src:url(data:font/woff2;base64,${bungee})} @font-face{font-family:OpenSans;src:url(data:font/woff2;base64,${sans})} text{fill:#15364d;font-family:OpenSans,sans-serif}.display{font-family:Bungee,sans-serif}</style>
<linearGradient id="water" x2="0" y2="1"><stop stop-color="#d7f1fc"/><stop offset="1" stop-color="#91d5ee"/></linearGradient>
<linearGradient id="tank" x2="1" y2="0"><stop stop-color="#e6edf0"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#c8d5dc"/></linearGradient></defs>
<rect width="1024" height="500" fill="#f7f4eb"/>
<path d="M658 0H1024V500H624C683 417 604 367 661 280S598 104 658 0Z" fill="url(#water)"/>
<circle cx="975" cy="64" r="135" fill="#b4e8f8" opacity=".5"/>
<text x="70" y="95" font-size="25" font-weight="700" letter-spacing="1">SIMPLY SALT PARTNERS</text>
<text class="display" x="66" y="190" font-size="53">GOOD REFERRALS.</text>
<text class="display" x="66" y="258" font-size="53">REAL REWARDS.</text>
<path d="M72 296H570" stroke="#88d3ef" stroke-width="5" stroke-linecap="round"/>
<text x="70" y="345" font-size="22">Salt delivery, connected to your team.</text>
<g font-size="17" font-weight="700"><rect x="70" y="380" width="142" height="44" rx="14" fill="#e6eff4"/><text x="95" y="409">REFERRALS</text><rect x="224" y="380" width="138" height="44" rx="14" fill="#e6eff4"/><text x="250" y="409">REWARDS</text><rect x="374" y="380" width="139" height="44" rx="14" fill="#e6eff4"/><text x="399" y="409">STICKERS</text></g>
<ellipse cx="809" cy="424" rx="124" ry="19" fill="#285a70" opacity=".12"/>
<rect x="720" y="159" width="176" height="249" rx="42" fill="url(#tank)" stroke="#89aabb" stroke-width="3"/>
<ellipse cx="808" cy="166" rx="88" ry="20" fill="#e5edf1" stroke="#89aabb" stroke-width="3"/>
<rect x="717" y="144" width="182" height="24" rx="10" fill="#1c3e54"/>
<path d="M754 143C754 115 862 115 862 143" fill="none" stroke="#1c3e54" stroke-width="12" stroke-linecap="round"/>
<g transform="rotate(-8 807 287)"><rect x="748" y="242" width="120" height="91" rx="15" fill="#8bd4ef" stroke="#15364d" stroke-width="2"/><text x="809" y="275" font-size="14" font-weight="700" text-anchor="middle">SIMPLY SALT</text><text class="display" x="809" y="302" font-size="18" text-anchor="middle">PARTNER</text><path d="m791 314 9 7 18-16" fill="none" stroke="#15364d" stroke-width="4" stroke-linecap="round"/></g>
<g transform="translate(866 341)"><circle r="39" fill="#f7f4eb"/><circle r="31" fill="#15364d"/><path d="m-15 0 10 10 21-23" fill="none" stroke="#8bd4ef" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;
await writeFile(resolve(output, 'feature-graphic.svg'), svg);
await writeFile(resolve(output, 'feature-graphic.html'), `<!doctype html><meta charset="utf-8"><title>Simply Salt Partners — Google Play feature graphic</title><style>html,body{margin:0;width:1024px;height:500px;overflow:hidden}svg{display:block}</style>${svg}`);
// Outline the app's existing fonts and render offline, without browser/file access.
const require = createRequire(import.meta.url);
const fontkit = require(resolve(root, '.private/google-play-tools/node_modules/fontkit'));
if (!process.env.SALT_GRAPHICS_NODE_MODULES) throw new Error('Set SALT_GRAPHICS_NODE_MODULES to the installed graphics libraries directory.');
const sharp = require(resolve(process.env.SALT_GRAPHICS_NODE_MODULES, 'sharp'));
const fonts = {
  display: fontkit.openSync(resolve(root, 'public/fonts/bungee.woff2')),
  sans: fontkit.openSync(resolve(root, 'public/fonts/opensans.woff2'))
};
const outlined = svg.replace(/<text([^>]*)>([^<]*)<\/text>/g, (_, attributes, label) => {
  const attribute = (name, fallback) => new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(attributes)?.[1] ?? fallback;
  const font = fonts[attribute('class', '') === 'display' ? 'display' : 'sans'];
  const size = Number(attribute('font-size', 17));
  const scale = size / font.unitsPerEm;
  const spacing = Number(attribute('letter-spacing', 0));
  const run = font.layout(label);
  const width = run.positions.reduce((sum, p) => sum + p.xAdvance * scale + spacing, 0) - spacing;
  let x = Number(attribute('x', 0)) - (attribute('text-anchor', '') === 'middle' ? width / 2 : 0);
  const y = Number(attribute('y', 0));
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const path = glyph.path.toSVG();
    const markup = path ? `<path d="${path}" transform="translate(${x + position.xOffset * scale} ${y - position.yOffset * scale}) scale(${scale} ${-scale})"/>` : '';
    x += position.xAdvance * scale + spacing;
    return markup;
  }).join('');
  return `<g aria-label="${label}" fill="#15364d">${paths}</g>`;
}).replace(/<style>[\s\S]*?<\/style>/, '');
await writeFile(resolve(output, 'feature-graphic-outlined.svg'), outlined);
await sharp(Buffer.from(outlined)).flatten({ background: '#f7f4eb' }).png().toFile(resolve(output, 'feature-graphic-1024x500.png'));
await writeFile(resolve(output, 'assets.json'), JSON.stringify({
  appIcon: { file: 'app-icon-512.png', width: 512, height: 512, source: 'public/icon-512.png; copied without modification' },
  featureGraphic: { file: 'feature-graphic-1024x500.png', width: 1024, height: 500, source: 'Original vector artwork with outlined app fonts, rendered offline with Sharp', altText: 'Simply Salt Partners connects customer referrals, technician rewards, and company sticker requests.' },
  screenshots: { source: 'Android instrumented test of the actual app; sample workspace clearly labeled', status: 'Awaiting native CI run and visual review' }
}, null, 2));
console.log(output);
