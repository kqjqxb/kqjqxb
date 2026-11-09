// Renders the contribution calendar twice: the normal world on top and its
// mirrored, burning reflection below. Output: dist/upside-down.svg
// Usage: node scripts/upside-down.mjs <github-login>
import { mkdirSync, writeFileSync } from 'node:fs';

const login = process.argv[2] || 'kqjqxb';
const res = await fetch(`https://github.com/users/${login}/contributions`, {
  headers: { 'User-Agent': 'profile-readme-generator' },
});
if (!res.ok) throw new Error(`contributions fetch failed: ${res.status}`);
const html = await res.text();

const days = [...html.matchAll(/<td[^>]*data-date="([\d-]+)"[^>]*data-level="(\d)"/g)]
  .map(([, date, level]) => ({ date, level: +level }))
  .sort((a, b) => a.date.localeCompare(b.date));
if (!days.length) throw new Error('no contribution cells found');
const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
const total = totalMatch ? totalMatch[1] : '';

// Seeded PRNG so the SVG only changes when the data does.
let seed = 1337;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const CELL = 11, STEP = 15, W = 900, H = 365;
const first = new Date(days[0].date + 'T00:00:00Z');
const startOffset = first.getUTCDay();
const weeks = Math.ceil((days.length + startOffset) / 7);
const X0 = Math.round((W - weeks * STEP + (STEP - CELL)) / 2);
const TOP = 70, HORIZON = 190, BOTTOM = 215;

const top = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const low = ['#2a0c10', '#4d0b12', '#85101b', '#c8141f', '#ff2b2b'];

let up = '', down = '';
days.forEach((d, i) => {
  const idx = i + startOffset;
  const col = Math.floor(idx / 7), row = idx % 7;
  const x = X0 + col * STEP;
  up += `<rect x="${x}" y="${TOP + row * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${top[d.level]}"/>`;
  const y = BOTTOM + (6 - row) * STEP;
  const flick = d.level >= 3 ? ` class="hot" style="animation-delay:${(col * 0.06).toFixed(2)}s,${(rand() * 3).toFixed(2)}s"` : ` class="ig" style="animation-delay:${(col * 0.06).toFixed(2)}s"`;
  down += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${low[d.level]}"${flick}/>`;
});

let spores = '';
for (let i = 0; i < 46; i++) {
  const x = (rand() * W).toFixed(0), y = (BOTTOM + rand() * 140).toFixed(0);
  const r = (0.8 + rand() * 1.8).toFixed(1), dur = (6 + rand() * 8).toFixed(1), del = (-rand() * 14).toFixed(1);
  spores += `<circle cx="${x}" cy="${y}" r="${r}" style="animation-duration:${dur}s;animation-delay:${del}s"/>`;
}

const gridW = weeks * STEP;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contribution graph and its Upside Down reflection">
<style>
  .lbl{font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em}
  .ig{animation:ig 8s linear infinite;opacity:.25}
  .hot{animation:ig 8s linear infinite,fl 3s steps(1) infinite;opacity:.25;filter:url(#glow)}
  @keyframes ig{0%{opacity:.25}2%{opacity:1}70%{opacity:1}86%{opacity:.25}100%{opacity:.25}}
  @keyframes fl{0%,100%{fill-opacity:1}47%{fill-opacity:.35}49%{fill-opacity:1}83%{fill-opacity:.55}85%{fill-opacity:1}}
  .scan{animation:scan 8s linear infinite}
  @keyframes scan{0%{transform:translateX(0);opacity:1}40%{transform:translateX(${gridW}px);opacity:1}41%,100%{transform:translateX(${gridW}px);opacity:0}}
  .flash{animation:flash 9s linear infinite;opacity:0}
  @keyframes flash{0%,86%{opacity:0}87%{opacity:.55}88%{opacity:0}90%{opacity:.35}91%,100%{opacity:0}}
  .sp circle{fill:#ffd9d0;opacity:.55;animation-name:drift;animation-timing-function:linear;animation-iteration-count:infinite}
  @keyframes drift{0%{transform:translate(0,0);opacity:0}15%{opacity:.6}100%{transform:translate(28px,-150px);opacity:0}}
</style>
<defs>
  <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="ud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0508"/><stop offset="1" stop-color="#07090f"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff2b2b" stop-opacity="0"/><stop offset="1" stop-color="#ff5a4a" stop-opacity=".9"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" rx="12" fill="#0d1117"/>
<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#ud)"/>
<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="#ff3030" class="flash"/>
<text x="${X0}" y="44" class="lbl" fill="#8b949e">HAWKINS, INDIANA · THE LAST 365 DAYS OF COMMITS</text>
${up}
<line x1="0" x2="${W}" y1="${HORIZON}" y2="${HORIZON}" stroke="#ff2b2b" stroke-opacity=".55"/>
<g class="sp">${spores}</g>
${down}
<rect x="${X0 - 40}" y="${BOTTOM - 8}" width="40" height="${7 * STEP + 6}" fill="url(#beam)" class="scan"/>
<text x="${W - X0}" y="${H - 22}" text-anchor="end" class="lbl" fill="#ff4d4d">THE UPSIDE DOWN</text>
</svg>
`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/upside-down.svg', svg);
console.log(`wrote dist/upside-down.svg: ${days.length} days, ${weeks} weeks, total ${total || 'n/a'}`);
