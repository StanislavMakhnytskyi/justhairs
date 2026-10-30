// Draws the service pictures: for each service, a flat-lay of the tools it uses,
// on the same navy dotted rubber mat as the hero footage, in one palette and one
// drawing style. Output (committed, served by next/image):
//
//   public/images/services/<slug>.webp          1200 x 900
//   src/lib/service-images.generated.ts         slug -> { src, blur }
//
//   node scripts/draw-service-images.mjs [--only mens-haircut,womens-blow-dry] [--sheet <dir>]
//
// Everything is vector, drawn from the tool library below, so the set can be
// re-composed, re-coloured or extended (new service = one new composition).
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./_pw.mjs";

const args = parseArgs();
const W = 1600;
const H = 1200;
const f = (n) => Math.round(n * 10) / 10;
const rng = (seed) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── palette & shared defs ────────────────────────────────────────────────────
const grad = (id, stops, { x2 = 0, y2 = 1 } = {}) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</linearGradient>`;

const DEFS = `<defs>
${grad("metal", [[0, "#f7f8fc"], [0.42, "#c5cad9"], [0.56, "#8f96ab"], [1, "#dde0ea"]])}
${grad("black", [[0, "#3b3b54"], [0.5, "#1d1d2c"], [1, "#101019"]])}
${grad("wood", [[0, "#e0a96f"], [0.55, "#b87642"], [1, "#8f5329"]])}
${grad("brass", [[0, "#f6d27e"], [1, "#b5852c"]])}
${grad("purple", [[0, "#9a85ff"], [1, "#4b25ff"]])}
${grad("lilac", [[0, "#ece6ff"], [1, "#b9a8ff"]])}
${grad("amber", [[0, "#f2b85a"], [1, "#8b5412"]])}
${grad("cobalt", [[0, "#6f8cff"], [1, "#1c2f9e"]])}
${grad("cream", [[0, "#fffaf0"], [1, "#e4d9c1"]])}
${grad("glass", [[0, "#ffffff", 0.55], [0.5, "#ffffff", 0.12], [1, "#ffffff", 0.3]])}
<radialGradient id="tintC" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#c3b2ff"/><stop offset=".55" stop-color="#6440fe"/><stop offset="1" stop-color="#3512c9"/></radialGradient>
<radialGradient id="lather" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e5dbc6"/></radialGradient>
<radialGradient id="pomade" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f4efff"/><stop offset="1" stop-color="#bcaeea"/></radialGradient>
<radialGradient id="cream2" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fffdf7"/><stop offset="1" stop-color="#eadfcb"/></radialGradient>
<pattern id="mat" width="46" height="46" patternUnits="userSpaceOnUse"><circle cx="23" cy="23" r="7.6" fill="#232338"/><circle cx="21" cy="21" r="3" fill="#2d2d47" opacity=".7"/></pattern>
<radialGradient id="vig" cx=".5" cy=".48" r=".78"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".66"/></radialGradient>
<linearGradient id="sweep" x1=".05" y1="0" x2=".95" y2="1"><stop offset="0" stop-color="#8f7dff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="sh" x="-30%" y="-30%" width="170%" height="170%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="13" result="b"/>
  <feOffset in="b" dx="15" dy="22" result="o"/>
  <feColorMatrix in="o" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.66 0" result="s"/>
  <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>`;

// A tool is drawn in its own coordinates (long axis along x, centred near 0,0)
// and placed with a rotation and scale; the shadow lives on the outer group so
// the light always falls the same way, whatever the tool's rotation.
const put = (x, y, rot, s, inner) =>
  `<g filter="url(#sh)"><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${inner}</g></g>`;
const hi = (d, w = 3, o = 0.55) =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

// ── tools ────────────────────────────────────────────────────────────────────
const scissors = (open = 7) => {
  const half = `
    <path d="M-26,-36 Q150,-28 308,-4 L308,3 L-26,8 Z" fill="url(#metal)"/>
    <path d="M-26,-36 Q150,-28 308,-4 L308,-1 Q150,-16 -26,-14 Z" fill="#fff" fill-opacity=".42"/>
    <path d="M-26,2 L308,1 L308,3 L-26,8 Z" fill="#000" fill-opacity=".18"/>
    ${hi("M-14,-30 Q150,-23 298,-5", 2.4, 0.8)}
    <path d="M-26,-36 L-122,-48 L-122,-12 L-26,8 Z" fill="url(#metal)"/>
    <ellipse cx="-184" cy="-36" rx="62" ry="46" fill="none" stroke="url(#metal)" stroke-width="20"/>
    <ellipse cx="-184" cy="-36" rx="52" ry="36" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2.4"/>
    ${hi("M-226,-76 Q-184,-88 -140,-72", 3.4, 0.65)}`;
  return `<g transform="rotate(${-open})">${half}</g><g transform="rotate(${open}) scale(1 -1)">${half}</g>
    <circle r="19" fill="url(#brass)"/><circle r="19" fill="none" stroke="#000" stroke-opacity=".32" stroke-width="2.4"/><path d="M-10,0H10" stroke="#6b4a12" stroke-width="3.4"/>`;
};

const woodGrain = (x0, x1, y0, y1, n = 6, seed = 3) => {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const y = y0 + ((y1 - y0) * (i + 0.5)) / n + (r() - 0.5) * 4;
    s += `<path d="M${x0},${f(y)} Q${f((x0 + x1) / 2)},${f(y + (r() - 0.5) * 6)} ${x1},${f(y + (r() - 0.5) * 3)}" fill="none" stroke="#6f3f18" stroke-opacity=".28" stroke-width="2"/>`;
  }
  return s;
};

const comb = ({ len = 420, h = 58, tooth = 70, n = 30, fill = "black" } = {}) => {
  const pitch = len / n;
  const tw = pitch * 0.56;
  let t = "";
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + i * pitch + (pitch - tw) / 2;
    t += `<rect x="${f(x)}" y="-4" width="${f(tw)}" height="${tooth + 4}" rx="${f(tw / 2)}" fill="url(#${fill})"/>`;
  }
  return `${t}<rect x="${-len / 2}" y="${-h}" width="${len}" height="${h + 4}" rx="16" fill="url(#${fill})"/>
    ${fill === "wood" ? woodGrain(-len / 2 + 10, len / 2 - 10, -h + 6, -2, 4) : ""}
    ${hi(`M${-len / 2 + 16},${-h + 10} H${len / 2 - 16}`, 3, 0.35)}`;
};

const tailComb = () => {
  let t = "";
  for (let i = 0; i < 26; i++) t += `<rect x="${-192 + i * 9.6}" y="-2" width="5.6" height="40" rx="2.8" fill="url(#black)"/>`;
  return `${t}<rect x="-196" y="-30" width="258" height="32" rx="10" fill="url(#black)"/>
    <path d="M56,-30 L240,-5 L240,4 L56,5 Z" fill="url(#black)"/>${hi("M-180,-22 H48", 2.5, 0.35)}`;
};

const clipper = () => {
  let teeth = "";
  for (let j = 0; j < 11; j++) teeth += `<rect x="178" y="${f(-50 + j * 9.2)}" width="30" height="5.2" rx="2.6" fill="url(#metal)"/>`;
  return `<rect x="-196" y="-66" width="262" height="132" rx="52" fill="url(#black)"/>
    <rect x="-118" y="-66" width="32" height="132" fill="url(#purple)"/>
    ${hi("M-150,-52 H30", 3, 0.28)}
    <path d="M60,-56 L178,-50 L178,50 L60,56 Z" fill="url(#metal)"/>${teeth}
    <rect x="96" y="-44" width="40" height="88" rx="8" fill="#000" fill-opacity=".18"/>
    <circle cx="-152" cy="0" r="14" fill="url(#metal)"/><circle cx="-152" cy="0" r="5" fill="#6440fe"/>`;
};

const trimmer = () => {
  let teeth = "";
  for (let j = 0; j < 9; j++) teeth += `<rect x="118" y="${f(-40 + j * 9)}" width="22" height="5" rx="2.5" fill="url(#metal)"/>`;
  return `<rect x="-176" y="-36" width="214" height="72" rx="36" fill="url(#black)"/>
    <rect x="-20" y="-36" width="34" height="72" fill="url(#metal)"/>
    ${hi("M-150,-26 H-40", 3, 0.28)}
    <path d="M38,-30 L118,-46 L118,46 L38,30 Z" fill="url(#metal)"/>${teeth}
    <circle cx="-126" cy="0" r="9" fill="url(#purple)"/>`;
};

const razor = () => `
  <path d="M-346,-19 L-36,-25 Q-12,-25 -12,-12 L-12,12 Q-12,25 -36,25 L-346,19 Q-364,19 -364,0 Q-364,-19 -346,-19 Z" fill="url(#wood)"/>
  ${woodGrain(-350, -30, -18, 18, 5, 9)}
  <circle cx="-320" cy="0" r="7" fill="url(#brass)"/><circle cx="-60" cy="0" r="7" fill="url(#brass)"/>
  <path d="M-2,-15 L306,-15 Q348,-15 350,4 Q348,15 322,15 L-2,15 Z" fill="url(#metal)"/>
  <path d="M-2,-15 L306,-15 L306,-8 L-2,-8 Z" fill="#fff" fill-opacity=".4"/>
  <path d="M6,8 H318" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
  <circle r="12" fill="url(#brass)"/><circle r="12" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2"/>`;

const shaveBrush = () => {
  const r = rng(11);
  let b = "";
  for (let k = 0; k < 34; k++) {
    const t = k / 33;
    const y0 = -26 + t * 52;
    b += `<path d="M46,${f(y0)} Q150,${f(y0 * 2.2)} ${f(232 + (r() - 0.5) * 16)},${f(y0 * 1.7)}" fill="none" stroke="#8a6a3e" stroke-opacity=".35" stroke-width="2"/>`;
  }
  return `<path d="M-194,-17 Q-150,-35 -100,-37 Q-40,-39 12,-27 L12,27 Q-40,39 -100,37 Q-150,35 -194,17 Q-206,0 -194,-17 Z" fill="url(#black)"/>
    ${hi("M-160,-24 Q-100,-31 -30,-27", 3, 0.3)}
    <rect x="8" y="-31" width="40" height="62" rx="6" fill="url(#brass)"/>
    <path d="M44,-29 C92,-62 172,-92 234,-52 C268,-30 268,30 234,52 C172,92 92,62 44,29 Z" fill="url(#cream)"/>${b}
    <path d="M50,-26 C100,-52 170,-76 224,-48" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="5" stroke-linecap="round"/>`;
};

const bowl = ({ lather = false } = {}) => `
  <circle r="134" fill="url(#black)"/><circle r="134" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="3"/>
  <circle r="110" fill="#0a0a12"/>
  <circle r="105" fill="url(#${lather ? "lather" : "tintC"})"/>
  <path d="M-62,-18 C-34,-66 44,-64 64,-12 C80,28 22,66 -32,48" fill="none" stroke="${lather ? "#fff" : "#e5dcff"}" stroke-opacity="${lather ? 0.95 : 0.55}" stroke-width="15" stroke-linecap="round"/>
  <path d="M-30,6 C-14,-18 22,-16 30,6" fill="none" stroke="${lather ? "#d4c9ae" : "#2a0aa8"}" stroke-opacity=".5" stroke-width="9" stroke-linecap="round"/>
  ${hi("M-96,-52 A112,112 0 0 1 -44,-98", 4, 0.5)}`;

const bottle = ({ fill = "amber", label = true, dropper = true } = {}) => `
  <rect x="-112" y="-48" width="184" height="96" rx="16" fill="url(#${fill})"/>
  <rect x="-112" y="-48" width="184" height="96" rx="16" fill="url(#glass)"/>
  <rect x="68" y="-24" width="34" height="48" rx="6" fill="url(#${fill})"/>
  <rect x="100" y="-28" width="46" height="56" rx="9" fill="url(#black)"/>
  ${dropper ? `<ellipse cx="184" cy="0" rx="42" ry="21" fill="url(#black)"/>${hi("M150,-12 Q184,-20 218,-10", 3, 0.3)}` : ""}
  ${label ? `<rect x="-80" y="-36" width="120" height="72" rx="6" fill="url(#cream)"/><circle cx="-34" cy="-6" r="13" fill="url(#purple)"/><path d="M-10,-16 H28 M-10,-4 H22 M-70,22 H30" stroke="#2a2a3a" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>` : ""}
  ${hi("M-96,-38 H56", 4, 0.5)}`;

const tin = ({ open = true, lid = "purple" } = {}) =>
  open
    ? `<circle r="104" fill="url(#metal)"/><circle r="92" fill="#171722"/><circle r="88" fill="url(#pomade)"/>
       <path d="M-52,-8 C-34,-54 34,-54 52,-8" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="10" stroke-linecap="round"/>
       <path d="M-30,18 C-14,0 14,0 30,18" fill="none" stroke="#9a8bd6" stroke-opacity=".5" stroke-width="8" stroke-linecap="round"/>`
    : `<circle r="104" fill="url(#${lid})"/><circle r="92" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
       <circle r="46" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5"/>
       <path d="M0,-28 L24,0 L0,28 L-24,0 Z" fill="#fff" fill-opacity=".88"/>${hi("M-80,-50 A92,92 0 0 1 -36,-82", 4, 0.4)}`;

const paddle = () => {
  let pins = "";
  for (let row = -3; row <= 3; row++) {
    for (let c = -4; c <= 4; c++) {
      const x = 20 + c * 30 + (row % 2 ? 15 : 0);
      const y = row * 28;
      if ((x - 20) ** 2 / 124 ** 2 + y ** 2 / 86 ** 2 > 1) continue;
      pins += `<circle cx="${x}" cy="${y}" r="7" fill="#d6dae8"/><circle cx="${x - 2}" cy="${y - 2}" r="2.6" fill="#fff" fill-opacity=".9"/>`;
    }
  }
  return `<path d="M-130,-30 L-304,-27 Q-350,-24 -350,0 Q-350,24 -304,27 L-130,30 Z" fill="url(#wood)"/>${woodGrain(-340, -134, -24, 24, 4, 7)}
    <rect x="-136" y="-36" width="22" height="72" rx="6" fill="url(#brass)"/>
    <rect x="-120" y="-112" width="304" height="224" rx="100" fill="url(#black)"/>
    <rect x="-100" y="-92" width="264" height="184" rx="86" fill="#0b0b14" fill-opacity=".55"/>${pins}`;
};

const roundBrush = () => {
  const r = rng(21);
  let b = "";
  for (let i = 0; i < 44; i++) {
    const x = -20 + i * 5.2;
    const tip = 22 + r() * 12;
    b += `<path d="M${f(x)},-52 L${f(x + (r() - 0.5) * 6)},${f(-52 - tip)}" stroke="#cfae7c" stroke-width="3.6" stroke-linecap="round"/>`;
    b += `<path d="M${f(x)},52 L${f(x + (r() - 0.5) * 6)},${f(52 + tip)}" stroke="#cfae7c" stroke-width="3.6" stroke-linecap="round"/>`;
  }
  for (let a = -44; a <= 44; a += 11) b += `<path d="M212,${a} L${f(212 + 30 + r() * 10)},${f(a * 1.18)}" stroke="#cfae7c" stroke-width="3.6" stroke-linecap="round"/>`;
  return `<path d="M-300,-24 L-34,-30 L-34,30 L-300,24 Q-314,24 -314,0 Q-314,-24 -300,-24 Z" fill="url(#wood)"/>${woodGrain(-308, -40, -22, 22, 4, 4)}
    ${b}<rect x="-34" y="-54" width="248" height="108" rx="16" fill="url(#black)"/>
    <rect x="-34" y="-54" width="248" height="108" rx="16" fill="url(#glass)" opacity=".4"/>
    <rect x="-46" y="-34" width="14" height="68" rx="4" fill="url(#brass)"/>`;
};

const dryer = () => `
  <path d="M-34,-4 L40,-4" stroke="none"/>
  <path d="M-150,-64 L-58,-64" stroke="none"/>
  <g transform="rotate(14 -6 40)"><rect x="-46" y="30" width="80" height="226" rx="38" fill="url(#blackH)"/>
  <rect x="-46" y="30" width="80" height="226" rx="38" fill="url(#black)"/><circle cx="-6" cy="84" r="11" fill="url(#metal)"/>
  <rect x="-46" y="206" width="80" height="14" fill="url(#purple)"/></g>
  <path d="M-8,252 C-4,340 -130,310 -176,356" fill="none" stroke="#0b0b13" stroke-width="15" stroke-linecap="round"/>
  <rect x="-176" y="-66" width="300" height="132" rx="56" fill="url(#black)"/>
  <rect x="-60" y="-66" width="34" height="132" fill="url(#purple)"/>
  ${hi("M-130,-52 H40", 3.5, 0.3)}
  <rect x="-198" y="-54" width="30" height="108" rx="8" fill="url(#metal)"/>
  <path d="M-190,-44 V44 M-180,-44 V44 M-172,-44 V44" stroke="#000" stroke-opacity=".35" stroke-width="2.4"/>
  <path d="M118,-58 L238,-36 Q250,-32 250,-20 L250,20 Q250,32 238,36 L118,58 Z" fill="url(#black)"/>
  ${hi("M130,-46 L236,-28", 3, 0.3)}
  <rect x="232" y="-22" width="22" height="44" rx="10" fill="#07070d"/>`;

const curler = () => `
  <path d="M-258,0 C-312,0 -300,86 -366,74" fill="none" stroke="#0b0b13" stroke-width="13" stroke-linecap="round"/>
  <rect x="-258" y="-37" width="258" height="74" rx="37" fill="url(#black)"/>
  <rect x="-158" y="-37" width="24" height="74" fill="url(#purple)"/>
  ${hi("M-224,-26 H-186", 3, 0.3)}<circle cx="-206" cy="12" r="10" fill="url(#metal)"/>
  <rect x="-14" y="-36" width="410" height="72" rx="36" fill="url(#black)"/>
  <rect x="-14" y="-36" width="410" height="72" rx="36" fill="url(#glass)" opacity=".3"/>
  <rect x="330" y="-36" width="66" height="72" rx="36" fill="url(#metal)"/>
  <path d="M-4,-54 L318,-54 Q352,-54 358,-40 L358,-34 L-4,-34 Z" fill="url(#metal)"/>
  <path d="M-4,-54 L-62,-78 L-88,-58 L-34,-34 Z" fill="url(#metal)"/><circle cx="-4" cy="-46" r="9" fill="url(#brass)"/>`;

const flatIron = () => {
  const arm = (led) => `<rect x="-70" y="-36" width="476" height="72" rx="36" fill="url(#black)"/>
    <rect x="70" y="-24" width="326" height="48" rx="24" fill="url(#metal)"/>
    <rect x="70" y="-24" width="326" height="48" rx="24" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2"/>
    ${hi("M-40,-26 H40", 3, 0.28)}${led ? `<circle cx="10" cy="0" r="8" fill="#9a85ff"/>` : ""}`;
  return `<path d="M-70,0 C-120,0 -120,70 -190,64" fill="none" stroke="#0b0b13" stroke-width="13" stroke-linecap="round"/>
    <g transform="rotate(-4.5 -60 0)">${arm(false)}</g><g transform="rotate(4.5 -60 0)">${arm(true)}</g>
    <circle cx="-60" cy="0" r="26" fill="url(#metal)"/><circle cx="-60" cy="0" r="9" fill="url(#brass)"/>`;
};

const duckbill = (color = "purple") => `
  <path d="M-94,-4 L6,-22 Q38,-27 60,-17 L88,-11 Q98,-8 98,0 Q98,8 88,11 L60,17 Q38,27 6,22 L-94,4 Z" fill="url(#${color})"/>
  <path d="M-94,0 H8" stroke="#000" stroke-opacity=".55" stroke-width="3.2"/>
  <path d="M34,-14 V14 M46,-15 V15 M58,-13 V13 M70,-11 V11" stroke="#000" stroke-opacity=".28" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="8" cy="0" r="8" fill="url(#metal)"/><circle cx="8" cy="0" r="8" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2"/>
  ${hi("M-80,-8 L4,-19 Q30,-22 52,-15", 2.6, 0.5)}`;

const bobby = (c = "#c9b79a") => `<path d="M0,0 H96 A10,10 0 0 1 96,20 H6" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6,10 L16,5 L26,15 L36,5 L46,15 L56,5 L66,15 L76,10" fill="none" stroke="${c}" stroke-opacity=".0" stroke-width="3"/>`;

const sprayCan = () => `
  <rect x="-196" y="-58" width="318" height="116" rx="14" fill="url(#purple)"/>
  <rect x="-60" y="-58" width="62" height="116" fill="url(#cream)"/>
  <circle cx="-29" cy="0" r="22" fill="url(#purple)"/><path d="M-29,-12 L-17,0 L-29,12 L-41,0 Z" fill="#fff" fill-opacity=".9"/>
  <path d="M120,-58 Q156,-58 166,-30 L176,-22 L176,22 L166,30 Q156,58 120,58 Z" fill="url(#metal)"/>
  <rect x="174" y="-34" width="84" height="68" rx="12" fill="url(#black)"/><circle cx="252" cy="0" r="9" fill="#05050a"/>
  ${hi("M-182,-44 H108", 4, 0.45)}`;

const sprayBottle = () => `
  <rect x="-156" y="-64" width="216" height="128" rx="28" fill="#bcd8ff" fill-opacity=".34"/>
  <rect x="-148" y="-6" width="200" height="62" rx="22" fill="#7fb2ff" fill-opacity=".55"/>
  <rect x="-156" y="-64" width="216" height="128" rx="28" fill="url(#glass)"/>
  <rect x="-156" y="-64" width="216" height="128" rx="28" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
  <rect x="58" y="-28" width="42" height="56" rx="6" fill="url(#metal)"/>
  <path d="M98,-46 L186,-46 Q206,-46 206,-26 L206,10 Q206,28 186,28 L98,28 Z" fill="url(#purple)"/>
  <rect x="200" y="-26" width="36" height="22" rx="8" fill="url(#black)"/>
  <path d="M132,26 Q122,74 154,86 Q168,60 166,26 Z" fill="url(#purple)"/>
  ${hi("M-138,-50 H44", 4, 0.55)}`;

const tube = (color = "purple") => `
  <path d="M-156,-36 L84,-44 L84,44 L-156,36 Z" fill="url(#${color})"/>
  <path d="M-156,-36 L84,-44 L84,-28 L-156,-22 Z" fill="#fff" fill-opacity=".28"/>
  <rect x="-176" y="-38" width="22" height="76" rx="3" fill="url(#metal)"/><path d="M-170,-34 V34 M-162,-34 V34" stroke="#000" stroke-opacity=".3" stroke-width="2"/>
  <rect x="-70" y="-42" width="86" height="84" fill="#fff" fill-opacity=".9" transform="skewY(-2)"/>
  <circle cx="-26" cy="0" r="16" fill="url(#${color})"/>
  <rect x="82" y="-32" width="56" height="64" rx="8" fill="url(#black)"/>`;

const foil = ({ w = 300, h = 124, paint = false, seed = 1 } = {}) => {
  const r = rng(seed);
  let c = "";
  for (let i = 0; i < 9; i++) {
    const x1 = r() * w;
    const y1 = r() * h;
    c += `<path d="M${f(x1)},${f(y1)} L${f(x1 + (r() - 0.5) * 120)},${f(y1 + (r() - 0.5) * 90)}" stroke="${r() > 0.5 ? "#fff" : "#4a5068"}" stroke-opacity="${r() > 0.5 ? 0.55 : 0.28}" stroke-width="${f(1.5 + r() * 2)}"/>`;
  }
  return `<path d="M0,0 L${w},8 L${w - 10},${h} L-8,${h - 10} Z" fill="url(#metal)"/>${c}
    ${paint ? `<path d="M26,${h * 0.46} Q${w * 0.3},${h * 0.3} ${w * 0.52},${h * 0.5} T${w - 30},${h * 0.46}" fill="none" stroke="url(#purple)" stroke-width="26" stroke-linecap="round"/>${hi(`M34,${h * 0.4} Q${w * 0.3},${h * 0.24} ${w * 0.5},${h * 0.43}`, 4, 0.5)}` : ""}
    <path d="M0,0 L${w},8" stroke="#fff" stroke-opacity=".7" stroke-width="2.5"/>`;
};

const tintBrush = () => `
  <path d="M-292,0 L-258,-8 L-24,-14 L-24,14 L-258,8 Z" fill="url(#black)"/>${hi("M-250,-6 L-30,-10", 2.4, 0.3)}
  <rect x="-26" y="-16" width="46" height="32" rx="4" fill="url(#metal)"/>
  <path d="M18,-17 L106,-25 L106,25 L18,17 Z" fill="#232333"/>
  <path d="M18,-12 L106,-19 M18,-5 L106,-9 M18,3 L106,5 M18,10 L106,15" stroke="#9aa0b8" stroke-opacity=".5" stroke-width="2"/>
  <path d="M74,-23 L106,-25 L106,25 L74,22 Z" fill="url(#purple)" fill-opacity=".92"/>`;

const ampoule = (color = "purple") => `
  <rect x="-84" y="-21" width="146" height="42" rx="21" fill="url(#${color})"/>
  <rect x="-84" y="-21" width="146" height="42" rx="21" fill="url(#glass)"/>
  <rect x="-20" y="-22" width="14" height="44" fill="url(#brass)"/>
  <path d="M60,-9 L96,-9 L116,-3 L116,3 L96,9 L60,9 Z" fill="#fff" fill-opacity=".5"/>
  ${hi("M-64,-12 H44", 3, 0.7)}`;

const jar = ({ lid = false } = {}) =>
  lid
    ? `<circle r="104" fill="url(#lilac)"/><circle r="94" fill="none" stroke="#6440fe" stroke-opacity=".45" stroke-width="3"/><circle r="40" fill="url(#purple)"/><path d="M-16,10 Q0,-24 16,10 Q0,-2 -16,10 Z" fill="#fff" fill-opacity=".92"/>${hi("M-80,-50 A92,92 0 0 1 -36,-82", 4, 0.5)}`
    : `<circle r="104" fill="url(#lilac)"/><circle r="92" fill="#e9e0ff"/><circle r="86" fill="url(#cream2)"/>
       <path d="M-50,-6 C-34,-52 34,-52 50,-6" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
       <path d="M-28,18 C-12,0 12,0 28,18" fill="none" stroke="#d2c6a9" stroke-width="8" stroke-linecap="round"/>`;

// ── scene ────────────────────────────────────────────────────────────────────
// Safe area: the middle of the canvas that survives both crops the site uses —
// 16:9 (service page) keeps 900 rows, 4:5 (menu frame) keeps 960 columns — a
// flat-lay may bleed a little at the sides of the tall crop, never top or bottom.
const SAFE_W = 1200;
const SAFE_H = 800;
const MAX_ZOOM = 2.3;

/** Bounding box of the drawn tools (no shadows), found by rendering them alone. */
async function measure(items) {
  const bare = items.join("").replaceAll('filter="url(#sh)"', "");
  const probe = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}${bare}</svg>`))
    .png()
    .toBuffer();
  const { info } = await sharp(probe).trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
  const left = -info.trimOffsetLeft;
  const top = -info.trimOffsetTop;
  return { cx: left + info.width / 2, cy: top + info.height / 2, w: info.width, h: info.height };
}

const scene = async (items) => {
  const m = await measure(items);
  const z = Math.min(SAFE_W / m.w, SAFE_H / m.h, MAX_ZOOM);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
<rect width="${W}" height="${H}" fill="#181826"/>
<rect width="${W}" height="${H}" fill="url(#mat)"/>
<rect width="${W}" height="${H}" fill="url(#sweep)"/>
<g transform="translate(${W / 2} ${H / 2}) scale(${f(z)}) translate(${f(-m.cx)} ${f(-m.cy)})">
${items.join("")}
</g>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
};

// Compositions: each one the tools that service really uses. Keep the group
// inside the centre (x 320-1280, y 150-1050) so 16:9 and 4:5 crops both hold it.
const SCENES = {
  "mens-haircut": () => [
    put(790, 540, -22, 1.0, scissors()),
    put(650, 850, 9, 1.0, comb({ fill: "black" })),
    put(1070, 800, 24, 0.95, clipper()),
  ],
  "mens-haircut-beard": () => [
    put(700, 470, -18, 0.85, scissors()),
    put(1010, 760, -28, 0.95, trimmer()),
    put(620, 830, 10, 0.9, comb({ fill: "wood", n: 26 })),
    put(1090, 460, 32, 0.8, bottle({ fill: "amber" })),
  ],
  "mens-beard": () => [
    put(790, 500, -10, 1.1, trimmer()),
    put(760, 790, 6, 1.0, comb({ fill: "wood", n: 16, tooth: 84, len: 400 })),
    put(1060, 770, -22, 0.95, bottle({ fill: "amber" })),
  ],
  "mens-shaving": () => [
    put(800, 470, -12, 1.0, razor()),
    put(760, 770, 7, 0.95, shaveBrush()),
    put(1110, 650, 0, 0.95, bowl({ lather: true })),
  ],
  "mens-styling": () => [
    put(700, 540, 0, 1.0, tin({ open: true })),
    put(930, 470, 20, 1.0, tin({ open: false })),
    put(830, 810, -8, 0.95, paddle()),
    put(1150, 760, -64, 0.95, comb({ fill: "wood", n: 34, len: 380 })),
  ],
  "womens-haircut": () => [
    put(760, 470, -14, 1.0, scissors()),
    put(700, 830, 6, 0.95, comb({ fill: "black", n: 18, tooth: 88, len: 420 })),
    put(1190, 640, -78, 0.8, sprayBottle()),
    put(1010, 780, 16, 1.0, duckbill("purple")),
    put(1070, 880, -20, 1.0, duckbill("metal")),
    put(950, 930, 6, 1.0, duckbill("purple")),
  ],
  "womens-coloring": () => [
    put(760, 560, 0, 1.0, bowl()),
    put(790, 560, -34, 1.0, tintBrush()),
    put(1100, 510, -14, 0.95, tube("purple")),
    put(1110, 760, 10, 0.9, tube("cream")),
    put(800, 880, 3, 0.9, tailComb()),
  ],
  "womens-highlights": () => [
    put(690, 540, -14, 1.0, foil({ seed: 2, w: 360, h: 150 })),
    put(760, 640, 3, 1.0, foil({ seed: 3, w: 360, h: 150, paint: true })),
    put(850, 745, 16, 1.0, foil({ seed: 4, w: 360, h: 150 })),
    put(1160, 560, 0, 0.85, bowl()),
    put(1100, 860, -8, 1.0, tailComb()),
    put(1190, 1000, 14, 0.95, tintBrush()),
  ],
  "womens-blow-dry": () => [
    put(790, 480, -8, 1.0, dryer()),
    put(780, 850, 5, 0.95, roundBrush()),
    put(1180, 700, -74, 0.8, paddle()),
  ],
  "womens-styling": () => [
    put(780, 430, -6, 1.0, curler()),
    put(770, 740, 4, 0.95, flatIron()),
    put(1230, 640, -82, 0.78, sprayCan()),
    put(820, 910, 12, 1.8, bobby()),
    put(900, 950, -14, 1.8, bobby()),
    put(980, 905, 30, 1.8, bobby("#9a8f7c")),
  ],
  "womens-treatment": () => [
    put(700, 540, 0, 1.0, jar()),
    put(970, 500, 18, 1.0, jar({ lid: true })),
    put(680, 850, -5, 1.25, ampoule("purple")),
    put(950, 885, 3, 1.25, ampoule("cobalt")),
    put(1190, 740, -40, 1.0, bottle({ fill: "cobalt" })),
  ],
};

// ── render ───────────────────────────────────────────────────────────────────
const only = args.only ? String(args.only).split(",") : Object.keys(SCENES);
const outDir = path.resolve("public/images/services");
mkdirSync(outDir, { recursive: true });
const index = {};
const sheet = [];
for (const slug of Object.keys(SCENES)) {
  const svg = await scene(SCENES[slug]());
  const png = await sharp(Buffer.from(svg)).resize(1200, 900).png().toBuffer();
  const webp = await sharp(png).webp({ quality: 84, effort: 5 }).toBuffer();
  const blur = await sharp(png).resize(16, 12, { fit: "fill" }).webp({ quality: 30 }).toBuffer();
  index[slug] = { src: `/images/services/${slug}.webp`, blur: `data:image/webp;base64,${blur.toString("base64")}` };
  if (only.includes(slug)) {
    writeFileSync(path.join(outDir, `${slug}.webp`), webp);
    sheet.push({ slug, png, kb: Math.round(webp.length / 1024) });
  }
}

const body = Object.entries(index)
  .map(([k, v]) => `  ${JSON.stringify(k)}: { src: ${JSON.stringify(v.src)}, blur: ${JSON.stringify(v.blur)} },`)
  .join("\n");
writeFileSync(
  path.resolve("src/lib/service-images.generated.ts"),
  `// Generated by scripts/draw-service-images.mjs — do not edit by hand.\n` +
    `// The picture for each service (a flat-lay of its tools) and its blur placeholder.\n\n` +
    `export const SERVICE_IMAGES: Record<string, { src: string; blur: string }> = {\n${body}\n};\n`,
);

if (args.sheet) {
  const dir = path.resolve(String(args.sheet));
  mkdirSync(dir, { recursive: true });
  const tw = 600, th = 450, cols = 4;
  const tiles = await Promise.all(sheet.map((s) => sharp(s.png).resize(tw, th).toBuffer()));
  const rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * (tw + 8), height: rows * (th + 8), channels: 3, background: "#fff" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * (tw + 8), top: Math.floor(i / cols) * (th + 8) })))
    .png()
    .toFile(path.join(dir, "services-sheet.png"));
  for (const s of sheet) await sharp(s.png).toFile(path.join(dir, `${s.slug}.png`));
}
console.log(sheet.map((s) => `${s.slug}  ${s.kb} KB`).join("\n"));
