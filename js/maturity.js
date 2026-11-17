/* =========================================================================
   NeoMaturity – Brain Maturation & GA Assessment
   Each method is reported separately with its own source. NO combined GA.
   ========================================================================= */

/* ---------- 1. Ultrasound Score of Brain Development (USBD) ------------
   Stein A, Sody E, Bruns N, Felderhoff-Müser U. AJNR 2023;44(7):846-52.
   doi:10.3174/ajnr.A7909. Table 3 (cut-offs, cm → mm here) and Table 4.
   Derived in 344 scans / 94 infants born ≤ 32 wk; PMA at scan 23+4 – 39+1.
   All three in ONE midcoronal plane through the foramina of Monro.        */
const USBD = {
  items: {
    io:  { label: 'Interopercular opening', unit: 'mm',
           how: 'Midcoronal at foramina of Monro: gap between frontal and temporal opercula over the insula (Sylvian fissure opening).',
           pts: v => v >= 5.5 ? 0 : v >= 1.5 ? 1 : 2,
           bands: '≥ 5.5 mm = 0 · 1.5–5.4 = 1 · < 1.5 = 2' },
    ins: { label: 'Insular cortex height (straight)', unit: 'mm',
           how: 'Same plane: straight line between the upper and lower limits of the insular cortex.',
           pts: v => v <= 12.5 ? 0 : v < 17.5 ? 1 : 2,
           bands: '≤ 12.5 mm = 0 · 12.6–17.4 = 1 · ≥ 17.5 = 2' },
    cs:  { label: 'Cingulate sulcus depth', unit: 'mm',
           how: 'Same plane: depth of the cingulate sulcus above the corpus callosum, from the gyral surface to the sulcal fundus.',
           pts: v => v <= 1.0 ? 0 : v < 4.5 ? 1 : 2,
           bands: '≤ 1.0 mm (not yet formed) = 0 · 1.1–4.4 = 1 · ≥ 4.5 = 2' }
  },
  // Table 4: total score → mean PMA (SD), observed range (weeks+days), n scans
  table: {
    0: { mean: 25.8, sd: 1.4, range: '23+4 – 29+0', lo: 23 + 4 / 7, hi: 29, n: 20 },
    1: { mean: 26.9, sd: 1.6, range: '23+5 – 29+5', lo: 23 + 5 / 7, hi: 29 + 5 / 7, n: 25 },
    2: { mean: 28.9, sd: 1.3, range: '25+0 – 32+0', lo: 25, hi: 32, n: 53 },
    3: { mean: 30.4, sd: 1.5, range: '27+0 – 35+0', lo: 27, hi: 35, n: 56 },
    4: { mean: 32.1, sd: 1.6, range: '27+1 – 36+0', lo: 27 + 1 / 7, hi: 36, n: 67 },
    5: { mean: 34.4, sd: 1.9, range: '30+2 – 39+1', lo: 30 + 2 / 7, hi: 39 + 1 / 7, n: 67 },
    6: { mean: 36.1, sd: 1.6, range: '33+2 – 39+1', lo: 33 + 2 / 7, hi: 39 + 1 / 7, n: 24 }
  },
  notes: [
    'Score rises ≈ 0.43 points per PMA week; 1 point ≈ 1.8 weeks (all scans, R = 0.88).',
    'Cingulate sulcus: before it appears it cannot separate PMAs (first seen at 25 wk in the 25th centile, 28 wk in the 75th).',
    'Interopercular opening stops discriminating once the Sylvian fissure closes.',
    'Ceiling: maximum score 6 is reached around 36 wk – not informative beyond that.',
    'Single-centre retrospective study; inter-/intra-rater reproducibility not tested; infants with brain lesions excluded.'
  ],
  cite: 'Stein A et al. AJNR Am J Neuroradiol 2023;44(7):846-52',
  url: 'https://doi.org/10.3174/ajnr.A7909'
};

/* ---------- 2. Transverse cerebellar diameter references ---------------- */
const wk = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TCD_REFS = {
  prasad10: {
    name: 'Prasad 2025 – scanned ≤ 10 days (n = 530)',
    short: 'Prasad 2025 (≤ 10 d)',
    cite: 'Prasad et al. Pediatr Radiol 2025 (online 19 Nov 2025). Gestational age determination in neonates – transcerebellar ultrasound measurements help: a retrospective study of 671 neonates. Table 2.',
    url: 'https://doi.org/10.1007/s00247-025-06426-9',
    method: 'Mastoid fontanelle, single symmetric axial image; outer edge to outer edge of both hemispheres at greatest width.',
    maxDol: 10, ga: wk(22, 40),
    mean: [23.2, 24.8, 26.1, 26.9, 29.5, 30.9, 32.1, 34.2, 36.3, 37.8, 39.7, 41.2, 42.6, 46.2, 47.6, 48.1, 50.2, 51.6, 52.0],
    sd:   [2.1, 2.0, 2.0, 2.9, 2.2, 2.7, 3.0, 3.0, 3.3, 3.9, 2.7, 4.5, 4.1, 4.0, 3.7, 3.4, 3.3, 3.9, 4.0],
    n:    [10, 9, 34, 15, 24, 37, 50, 39, 55, 28, 20, 14, 27, 10, 29, 36, 29, 43, 21],
    note: 'GA from early CRL or LMP. Percentiles not published – centiles shown assume a normal distribution (mean ± SD).'
  },
  prasad21: {
    name: 'Prasad 2025 – scanned ≤ 21 days (n = 671)',
    short: 'Prasad 2025 (≤ 21 d)',
    cite: 'Prasad et al. Pediatr Radiol 2025. Table 1.',
    url: 'https://doi.org/10.1007/s00247-025-06426-9',
    method: 'As above.',
    maxDol: 21, ga: wk(22, 40),
    mean: [23.4, 25.3, 26.3, 27.8, 30.0, 31.6, 32.8, 34.9, 36.9, 38.5, 41.0, 42.3, 43.0, 45.5, 47.8, 48.3, 50.1, 51.6, 52.1],
    sd:   [1.8, 2.0, 2.1, 2.8, 2.3, 3.0, 3.3, 3.2, 3.6, 4.1, 3.4, 4.2, 4.2, 3.8, 3.4, 3.6, 3.3, 3.9, 3.9],
    n:    [15, 13, 40, 26, 34, 47, 63, 54, 66, 38, 28, 24, 34, 14, 36, 41, 32, 44, 22],
    note: 'Wider postnatal window – some postnatal growth included.'
  },
  davies: {
    name: 'Davies 1999 – regression, preterm 23–32 wk',
    short: 'Davies 1999',
    cite: 'Davies MW, Swaminathan M, Betheras FR. Transverse cerebellar diameter on cranial ultrasound scan in preterm neonates in an Australian population. J Paediatr Child Health 1999;35:346-9.',
    url: 'https://doi.org/10.1046/j.1440-1754.1999.00365.x',
    method: 'Published regression: TCD (mm) = −12.9 + 1.61 × GA (wk); R² = 0.80.',
    maxDol: null, range: [23, 32],
    eq: g => -12.9 + 1.61 * g, inv: t => (t + 12.9) / 1.61,
    note: 'Equation only – no SD published in the abstract, so no centile or range.'
  },
  imamoglu: {
    name: 'Imamoglu 2013 – AGA nomogram 26–42 wk (not loaded)',
    short: 'Imamoglu 2013',
    cite: 'Imamoglu EY, Gursoy T, Ovali F, et al. Nomograms of cerebellar vermis height and transverse cerebellar diameter in appropriate-for-gestational-age neonates. Early Hum Dev 2013;89:919-23.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Imamoglu+Nomograms+of+cerebellar+vermis+height+and+transverse+cerebellar+diameter',
    method: 'Neonatal nomogram, 321 AGA infants.',
    loaded: false, ga: [], mean: [], sd: [],
    note: 'Values are not open access and are NOT included. To enable: enter the published per-week mean and SD (mm) in js/maturity.js → TCD_REFS.imamoglu and set loaded: true.'
  }
};

/* ---------- maths helpers ---------- */
function lerp(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) if (x >= xs[i] && x <= xs[i + 1])
    return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
}
function normCdf(z) { // Abramowitz-Stegun
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const wkTxt = g => g == null ? '–' : `${Math.floor(g + 1e-6)}+${Math.round((g - Math.floor(g + 1e-6)) * 7) % 7}`;

/** TCD → estimate against a reference. Returns {est, lo, hi, z, centile, flags[]} */
function tcdEstimate(refKey, tcd, ctx) {
  const r = TCD_REFS[refKey], out = { flags: [] };
  if (tcd == null) return null;
  if (r.maxDol != null && ctx.dol != null && ctx.dol > r.maxDol)
    out.flags.push(`Scan on day ${ctx.dol} is beyond this reference's ${r.maxDol}-day window – postnatal growth may overestimate GA at birth.`);
  if (refKey === 'davies') {
    out.est = r.inv(tcd);
    if (out.est < r.range[0] - 0.5 || out.est > r.range[1] + 0.5) out.flags.push('Outside the 23–32 wk range of this regression.');
    if (ctx.ga != null) out.expected = r.eq(ctx.ga);
    return out;
  }
  if (r.loaded === false) { out.unavailable = true; return out; }
  const { ga, mean, sd } = r;
  if (tcd < mean[0]) out.flags.push(`Below the ${ga[0]}-wk mean – outside reference range.`);
  if (tcd > mean[mean.length - 1]) out.flags.push(`Above the ${ga[ga.length - 1]}-wk mean – outside reference range.`);
  // estimate: inverse interpolation on the mean curve
  for (let i = 0; i < ga.length - 1; i++) {
    const a = mean[i], b = mean[i + 1];
    if (tcd >= Math.min(a, b) && tcd <= Math.max(a, b)) { out.est = ga[i] + (tcd - a) / (b - a || 1); break; }
  }
  // plausible range: weeks (0.1-wk steps) where |z| ≤ 1.96
  let lo = null, hi = null;
  for (let g = ga[0]; g <= ga[ga.length - 1] + 1e-9; g += 0.1) {
    const z = (tcd - lerp(ga, mean, g)) / lerp(ga, sd, g);
    if (Math.abs(z) <= 1.96) { if (lo == null) lo = g; hi = g; }
  }
  out.lo = lo; out.hi = hi;
  out.loEdge = lo != null && lo <= ga[0] + 0.05; out.hiEdge = hi != null && hi >= ga[ga.length - 1] - 0.05;
  if (ctx.ga != null && ctx.ga >= ga[0] - 0.5 && ctx.ga <= ga[ga.length - 1] + 0.5) {
    const m = lerp(ga, mean, ctx.ga), s = lerp(ga, sd, ctx.ga);
    out.expected = m; out.z = (tcd - m) / s; out.centile = normCdf(out.z) * 100;
  }
  return out;
}

function usbdCalc(v) {
  const it = USBD.items, res = { parts: {}, total: null, complete: false };
  let sum = 0, cnt = 0;
  ['io', 'ins', 'cs'].forEach(k => {
    const x = v[k];
    if (x != null) { const p = it[k].pts(x); res.parts[k] = p; sum += p; cnt++; }
  });
  if (cnt === 3) { res.total = sum; res.complete = true; res.ref = USBD.table[sum]; }
  return res;
}

/* ---------- visual reference: midcoronal schematic (original drawing) ---- */
const MAT_SVG = `
<svg viewBox="0 0 320 210" class="matsvg" role="img" aria-label="Midcoronal plane measurement schematic">
  <path d="M160 8 L18 150 A200 200 0 0 0 302 150 Z" class="sec"/>
  <line x1="160" y1="14" x2="160" y2="78" class="ihf"/>
  <!-- cingulate gyri & sulci -->
  <path d="M160 40 Q140 40 132 56 Q128 70 150 74" class="gyr"/><path d="M160 40 Q180 40 188 56 Q192 70 170 74" class="gyr"/>
  <path d="M136 50 l12 6" class="sul"/><path d="M184 50 l-12 6" class="sul"/>
  <path d="M128 78 Q160 66 192 78" class="cc"/>
  <path d="M138 84 q-14 8 -8 22 q12 -4 22 -16 z" class="csf"/><path d="M182 84 q14 8 8 22 q-12 -4 -22 -16 z" class="csf"/>
  <rect x="157" y="86" width="6" height="10" rx="2" class="csf"/>
  <!-- insula + opercula -->
  <path d="M74 104 q-6 16 4 34" class="ins"/><path d="M246 104 q6 16 -4 34" class="ins"/>
  <path d="M60 100 q14 -2 22 6" class="op"/><path d="M62 142 q14 2 20 -6" class="op"/>
  <path d="M260 100 q-14 -2 -22 6" class="op"/><path d="M258 142 q-14 2 -20 -6" class="op"/>
  <!-- measurements -->
  <line x1="66" y1="112" x2="66" y2="134" class="m1"/><text x="40" y="126" class="ml">①</text>
  <line x1="80" y1="104" x2="80" y2="138" class="m2"/><text x="86" y="122" class="ml">②</text>
  <line x1="148" y1="56" x2="141" y2="51" class="m3"/><text x="112" y="44" class="ml">③</text>
  <line x1="172" y1="42" x2="174" y2="73" class="m4"/><text x="198" y="56" class="ml g">④</text>
  <text x="10" y="176" class="lg">① Interopercular opening   ② Insular height</text>
  <text x="10" y="189" class="lg">③ Cingulate sulcus depth</text>
  <text x="10" y="202" class="lg g">④ Cingulate gyrus height (not part of USBD)</text>
</svg>`;
