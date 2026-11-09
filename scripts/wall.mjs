// Alphabet wall with a string of lights that spells a message letter by
// letter, then flickers. Output: assets/wall.svg
// Usage: node scripts/wall.mjs "LETS BUILD"
import { writeFileSync } from 'node:fs';

const message = (process.argv[2] || 'LETS BUILD').toUpperCase();
const W = 1200, H = 400;
const rows = ['ABCDEFGH', 'IJKLMNOPQ', 'RSTUVWXYZ'];
const colors = ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ff9f0a', '#bf5af2'];

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// Timeline: one slot per character, then a frantic flicker, then darkness.
const SLOT = 0.7, FLICKER = 1.8, DARK = 1.2;
const spellEnd = message.length * SLOT;
const T = spellEnd + FLICKER + DARK;
const pct = (t) => +((t / T) * 100).toFixed(2);

function keyframes(letter) {
  const frames = [[0, 0]];
  [...message].forEach((ch, i) => {
    if (ch !== letter) return;
    const s = i * SLOT, e = s + SLOT * 0.85;
    frames.push([pct(s), 0], [pct(s + 0.05), 1], [pct(e), 1], [pct(e + 0.05), 0]);
  });
  // Frantic flicker: every bulb, its own stutter pattern.
  let t = spellEnd + 0.1;
  while (t < spellEnd + FLICKER) {
    const on = 0.04 + rand() * 0.12, off = 0.04 + rand() * 0.16;
    frames.push([pct(t), 0], [pct(t + 0.01), 1], [pct(t + on), 1], [pct(t + on + 0.01), 0]);
    t += on + off;
  }
  frames.push([100, 0]);
  const seen = new Set();
  return frames
    .sort((a, b) => a[0] - b[0])
    .filter(([p]) => (seen.has(p) ? false : seen.add(p)))
    .map(([p, o]) => `${p}%{opacity:${o}}`)
    .join('');
}

let wires = '', bulbs = '', letters = '', css = '';
rows.forEach((row, r) => {
  const y = 128 + r * 112;
  const left = 110 + (r === 0 ? 55 : 0), right = W - 110 - (r === 0 ? 55 : 0);
  const step = (right - left) / (row.length - 1);
  const pts = [];
  [...row].forEach((ch, i) => {
    const x = left + i * step + (rand() - 0.5) * 10;
    const by = y - 62 + (rand() - 0.5) * 8;
    pts.push([x, by]);
    const c = colors[(i + r * 2) % colors.length];
    const rot = ((rand() - 0.5) * 14).toFixed(1);
    const id = `b${ch}`;
    css += `#${id} .on{animation:${id} ${T.toFixed(2)}s linear infinite}@keyframes ${id}{${keyframes(ch)}}`;
    bulbs += `<g id="${id}" transform="translate(${x.toFixed(1)} ${by.toFixed(1)}) rotate(${rot})">` +
      `<rect x="-3.5" y="-7" width="7" height="7" rx="1" fill="#2b2b22"/>` +
      `<ellipse cy="9" rx="6" ry="9" fill="${c}" opacity=".35"/>` +
      `<g class="on" opacity="0"><circle cy="9" r="26" fill="url(#g${(i + r * 2) % colors.length})"/><ellipse cy="9" rx="6" ry="9" fill="${c}"/><ellipse cx="-2" cy="6" rx="1.6" ry="3" fill="#fff" opacity=".8"/></g></g>`;
    const lr = ((rand() - 0.5) * 10).toFixed(1);
    letters += `<text x="${x.toFixed(1)}" y="${y + 18}" transform="rotate(${lr} ${x.toFixed(1)} ${y})">${ch}</text>`;
  });
  // Sagging wire between bulbs.
  let d = `M${left - 70},${pts[0][1] - 14}`;
  pts.forEach(([x, by], i) => {
    const [px, py] = i === 0 ? [left - 70, pts[0][1] - 14] : pts[i - 1];
    d += ` Q${((px + x) / 2).toFixed(1)},${(Math.max(py, by) + 16).toFixed(1)} ${x.toFixed(1)},${(by - 7).toFixed(1)}`;
  });
  d += ` Q${right + 35},${pts.at(-1)[1] + 12} ${right + 70},${pts.at(-1)[1] - 14}`;
  wires += `<path d="${d}" fill="none" stroke="#1d2418" stroke-width="2.6" stroke-linecap="round"/>`;
});

const glows = colors
  .map((c, i) => `<radialGradient id="g${i}"><stop offset="0" stop-color="${c}" stop-opacity=".75"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`)
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="A string of lights spelling ${message}">
<style>
  .letters text{font:400 64px Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;fill:#17120d;opacity:.88;text-anchor:middle}
  ${css}
</style>
<defs>
  ${glows}
  <pattern id="paper" width="80" height="80" patternUnits="userSpaceOnUse">
    <rect width="80" height="80" fill="#cdbb8f"/>
    <circle cx="20" cy="20" r="9" fill="none" stroke="#b39f72" stroke-width="2" opacity=".55"/>
    <circle cx="20" cy="20" r="3" fill="#b39f72" opacity=".5"/>
    <circle cx="60" cy="60" r="9" fill="none" stroke="#b39f72" stroke-width="2" opacity=".55"/>
    <circle cx="60" cy="60" r="3" fill="#b39f72" opacity=".5"/>
    <path d="M40 0v80" stroke="#bfae80" stroke-width="6" opacity=".35"/>
  </pattern>
  <radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" rx="12" fill="url(#paper)"/>
<g class="letters">${letters}</g>
${wires}
${bulbs}
<rect width="${W}" height="${H}" rx="12" fill="url(#vig)"/>
</svg>
`;
writeFileSync('assets/wall.svg', svg);
console.log(`wrote assets/wall.svg, cycle ${T.toFixed(1)}s`);
