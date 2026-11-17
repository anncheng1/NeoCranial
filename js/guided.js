/* =========================================================================
   NeoCranial USG – Beginner Mode content
   Per-view scanning guide, structure-by-structure findings, abnormality atlas
   ========================================================================= */

/* ---------- Extend anatomy options: explicit "cannot assess" states ------- */
const NV_LABELS = ['Not visualised', 'Not assessed', 'Limited view'];
ANATOMY.forEach(a => {
  if (a[0] === 'cerebellum' && !a[2].includes('Large cisterna magna')) a[2].push('Large cisterna magna');
  NV_LABELS.forEach(l => { if (!a[2].includes(l)) a[2].push(l); });
});
const anIdx = (key, label) => ANATOMY.find(a => a[0] === key)[2].indexOf(label);

/* ---------- Probe orientation drawing (original schematic) ---------------
   plane 'cor': side view of head, line shows tilt from vertical (+ = forward)
   plane 'sag': front view of head, line shows lateral tilt (+ = to baby's right) */
function probeSVG(plane, deg, label) {
  const cx = 70, cy = 72, r = 50, fx = cx, fy = cy - r;
  const rad = deg * Math.PI / 180;
  const len = 92, tx = fx + Math.sin(rad) * len * (plane === 'cor' ? -1 : 1), ty = fy + Math.cos(rad) * len;
  const face = plane === 'cor'
    ? `<path d="M${cx - r + 6} ${cy + 18} q-12 6 -6 20 q8 2 14 -4" class="pf"/><circle cx="${cx - r + 14}" cy="${cy}" r="3" class="pe"/><text x="6" y="132" class="pt">FRONT</text><text x="104" y="132" class="pt">BACK</text>`
    : `<circle cx="${cx - 16}" cy="${cy + 2}" r="3" class="pe"/><circle cx="${cx + 16}" cy="${cy + 2}" r="3" class="pe"/><path d="M${cx - 8} ${cy + 24} q8 6 16 0" class="pf"/><text x="4" y="132" class="pt">BABY R</text><text x="100" y="132" class="pt">BABY L</text>`;
  return `<svg viewBox="0 0 140 140" class="probe-svg" role="img" aria-label="Probe orientation ${label || ''}">
    <circle cx="${cx}" cy="${cy}" r="${r}" class="ph"/>${face}
    <line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" class="pl"/>
    <rect x="${fx - 13}" y="${fy - 16}" width="26" height="12" rx="4" class="pp" transform="rotate(${plane === 'cor' ? -deg : deg} ${fx} ${fy - 10})"/>
    <circle cx="${fx}" cy="${fy}" r="3" class="pfont"/>
  </svg>`;
}

/* ---------- Step 3: standard views ---------------------------------------- */
const VIEW_STEPS = [
  { id: 'C1', group: 'Coronal', title: 'C1 – Frontal lobes', plane: 'cor', tilt: 40,
    img: 'tp-fig01-coronal-normal', src: 'tp', fig: 1, panel: 'Panel A', extra: 'lc-coronal-c2',
    probe: 'Probe across the fontanelle (coronal). Set it so the baby’s RIGHT is on the screen LEFT – which side the probe marker goes depends on your machine/unit convention. Tilt steeply forward, aiming toward the orbits.',
    find: ['Interhemispheric fissure in the midline', 'Frontal lobes, symmetrical', 'Orbital roofs at the bottom'],
    check: ['Midline vertical and central', 'Both sides symmetrical', 'No frontal horns yet (you are in front of them)'] },
  { id: 'C2', group: 'Coronal', title: 'C2 – Frontal horns', plane: 'cor', tilt: 25,
    img: 'tp-fig01-coronal-normal', src: 'tp', fig: 1, panel: 'Panel B', extra: 'lc-coronal-c2',
    probe: 'Same orientation; tilt slightly less forward until the frontal horns appear.',
    find: ['Frontal horns (black, comma-shaped)', 'Cavum septum pellucidum between them', 'Corpus callosum above', 'Caudate heads below the horns'],
    check: ['Both frontal horns seen', 'CSP present (note if absent)', 'No echogenic material in the frontal horns'] },
  { id: 'C3', group: 'Coronal', title: 'C3 – Foramen of Monro', plane: 'cor', tilt: 10,
    img: 'tp-fig01-coronal-normal', src: 'tp', fig: 1, panel: 'Panel C', extra: 'cg-vi-ahw-dilated', extraSrc: 'cg', extraFig: 0,
    probe: 'Probe almost vertical. Find the small midline 3rd ventricle below the CSP.',
    find: ['Bodies of lateral ventricles', '3rd ventricle (small midline slit)', 'Sylvian fissures (Y-shape at term, open in preterm)'],
    check: ['This is the plane for VI and AHW – freeze and measure here', '3rd ventricle < 3 mm', 'Look at the caudothalamic region for GMH'] },
  { id: 'C4', group: 'Coronal', title: 'C4 – Thalami & cerebellum', plane: 'cor', tilt: -5,
    img: 'tp-fig01-coronal-normal', src: 'tp', fig: 1, panel: 'Panel D', extra: 'lc-coronal-c4',
    probe: 'Tilt just behind vertical.',
    find: ['Thalami either side of midline', '"Three-dot sign": choroid in both ventricular floors + 3rd ventricle roof', 'Tentorium and cerebellum below'],
    check: ['Thalami symmetrical, not bright (term)', 'Cerebellum visible', 'Caudothalamic grooves clear'] },
  { id: 'C5', group: 'Coronal', title: 'C5 – Trigones', plane: 'cor', tilt: -20,
    img: 'tp-fig01-coronal-normal', src: 'tp', fig: 1, panel: 'Panel E',
    probe: 'Tilt backwards through the trigones.',
    find: ['Bright choroid glomus filling each trigone', 'Peritrigonal white matter'],
    check: ['Choroid symmetrical, smooth', 'Peritrigonal "blush" LESS bright than choroid', 'Ventricles diverge (parallel = think corpus callosum anomaly)'] },
  { id: 'C6', group: 'Coronal', title: 'C6 – Occipital lobes', plane: 'cor', tilt: -38,
    img: 'cg-c6-parieto-occipital', src: 'cg', fig: 0, panel: 'Labelled parieto-occipital view', extra: 'tp-fig01-coronal-normal', extraSrc: 'tp', extraFig: 1,
    probe: 'Tilt steeply backwards.',
    find: ['Parieto-occipital white matter', 'Interhemispheric fissure', 'Sulcal pattern'],
    check: ['White matter symmetrical', 'No bright patches or cysts above the ventricles'] },
  { id: 'S1', group: 'Sagittal', title: 'S1 – Midline sagittal', plane: 'sag', tilt: 0,
    img: 'lc-sagittal-s1', src: 'lc', fig: 0, panel: 'Midline', extra: 'tp-fig02-sagittal-normal',
    probe: 'Rotate 90° to sagittal so the FRONT of the brain is on the screen LEFT (marker toward the nose or the back, depending on your machine/unit convention). Keep the probe in the exact midline.',
    find: ['Corpus callosum (curved dark band)', 'CSP below it', '3rd and 4th ventricles', 'Cerebellar vermis, cisterna magna'],
    check: ['Whole corpus callosum seen, genu to splenium', 'Vermis bright and lobulated', 'Cisterna magna not enlarged'] },
  { id: 'S2R', group: 'Sagittal', title: 'S2 – Right parasagittal (ventricle)', plane: 'sag', tilt: 14,
    img: 'tp-fig02-sagittal-normal', src: 'tp', fig: 2, panel: 'Panel B',
    probe: 'From midline, tilt ~10–15° to the baby’s RIGHT; rotate slightly so the whole C-shaped ventricle fits.',
    find: ['Whole C-shaped lateral ventricle', 'Caudothalamic groove (thin bright line between caudate and thalamus)', 'Choroid plexus in the atrium'],
    check: ['Look carefully just in front of the caudothalamic groove for GMH', 'No echogenic material in frontal or occipital horn', 'Freeze for TOD'] },
  { id: 'S2L', group: 'Sagittal', title: 'S2 – Left parasagittal (ventricle)', plane: 'sag', tilt: -14,
    img: 'tp-fig02-sagittal-normal', src: 'tp', fig: 2, panel: 'Panel B',
    probe: 'Return to midline, then tilt ~10–15° to the baby’s LEFT.',
    find: ['Whole C-shaped lateral ventricle', 'Caudothalamic groove', 'Choroid plexus'],
    check: ['Compare with the right side', 'Freeze for TOD'] },
  { id: 'S3R', group: 'Sagittal', title: 'S3 – Right parasagittal (insula)', plane: 'sag', tilt: 28,
    img: 'cg-s3-insula', src: 'cg', fig: 0, panel: 'Labelled Sylvian fissure and insula', extra: 'tp-fig02-sagittal-normal', extraSrc: 'tp', extraFig: 2,
    probe: 'Tilt further to the RIGHT (~25–30°), beyond the ventricle.',
    find: ['Sylvian fissure / insula', 'Periventricular white matter along the ventricle'],
    check: ['White matter homogeneous, no bright patches or cysts'] },
  { id: 'S3L', group: 'Sagittal', title: 'S3 – Left parasagittal (insula)', plane: 'sag', tilt: -28,
    img: 'cg-s3-insula', src: 'cg', fig: 0, panel: 'Labelled Sylvian fissure and insula (right side shown)', extra: 'tp-fig02-sagittal-normal', extraSrc: 'tp', extraFig: 2,
    probe: 'Tilt further to the LEFT (~25–30°).',
    find: ['Sylvian fissure / insula', 'Periventricular white matter'],
    check: ['Compare with the right side'] }
];
const EXTRA_VIEWS = [
  { id: 'MF', title: 'Mastoid fontanelle – posterior fossa', img: 'tp-fig03-mastoid-normal', src: 'tp', fig: 3,
    why: 'Recommended in all infants < 32 weeks – cerebellar haemorrhage is often missed through the anterior fontanelle.',
    probe: 'Probe ~1 cm behind the ear, just above the tragus; axial plane.',
    find: ['Both cerebellar hemispheres', 'Vermis (brighter) and 4th ventricle', 'Cisterna magna'],
    check: ['Symmetrical hemispheres', 'No bright focus in a hemisphere', 'Measure TCD if requested (NeoMaturity)'] },
  { id: 'PF', title: 'Posterior fontanelle – occipital horns', img: null,
    why: 'Helps find clot layering in the occipital horns and posterior white matter injury.',
    probe: 'Probe at the back of the head where sagittal and lambdoid sutures meet; sagittal and coronal sweeps.',
    find: ['Occipital horns', 'Posterior periventricular white matter'],
    check: ['No echogenic material layering in the occipital horns', 'Peritrigonal halo should fade in this view (if it persists, it may be real)'] }
];

/* ---------- Step 2: technique checklist ----------------------------------- */
const TECH_CHECK = [
  ['tc_baby', 'Baby settled, supine, warm; minimal handling'],
  ['tc_gel', 'Warmed gel; light probe pressure on the fontanelle'],
  ['tc_probe', 'Microconvex / sector probe (7–10 MHz preterm, ~5 MHz term)'],
  ['tc_preset', 'Neonatal head preset; depth to skull base'],
  ['tc_gain', 'Gain: parenchyma mid-grey, CSF black; TGC adjusted'],
  ['tc_label', 'Images labelled (2 patient identifiers, R/L, plane); at least 11 images stored (6 coronal + 5 sagittal)']
];

/* ---------- Step 5: structure-by-structure findings ------------------------
   Each option: [value, label, explanation, severity]  severity: ok | info | warn | bad | nv */
const NV_OPTS = [
  ['nv', 'Not visualised', 'Could not be seen adequately.', 'nv'],
  ['na', 'Not assessed', 'Not examined on this scan.', 'nv'],
  ['lim', 'Limited view', 'Seen, but image quality limits assessment.', 'nv']
];
const STRUCTURES = [
  { k: 'gs_vent', title: 'Lateral ventricles', where: 'Coronal C2–C4 and parasagittal S2', atlas: 'phvd',
    opts: [['normal', 'Normal size and shape', 'Thin, comma-shaped horns; similar both sides.', 'ok'],
      ['asym', 'Mildly asymmetric', 'One side slightly larger (often left). Common normal variant.', 'info'],
      ['slit', 'Slit-like / very small', 'Normal in many term babies; with bright brain consider oedema.', 'info'],
      ['dilated', 'Look enlarged / rounded', 'Horns look big or ballooned – take measurements in Step 4.', 'warn']] },
  { k: 'gs_gmh', title: 'Germinal matrix & ventricles (haemorrhage)', where: 'Caudothalamic groove: parasagittal S2 and coronal C3–C4', atlas: 'ivh', perSide: true,
    opts: [['none', 'No haemorrhage', 'Caudothalamic groove thin; nothing brighter than choroid outside its normal place.', 'ok'],
      ['gmh', 'Bright focus at caudothalamic groove only', 'Germinal matrix haemorrhage (Papile I).', 'warn'],
      ['ivh', 'Blood inside the ventricle, ventricle not enlarged', 'IVH without dilatation (Papile II).', 'bad'],
      ['ivhd', 'Blood filling > half the ventricle / ventricle enlarged', 'IVH with dilatation (Papile III).', 'bad']] },
  { k: 'gs_wm', title: 'Periventricular white matter', where: 'Coronal C5–C6 and parasagittal S2–S3', atlas: 'pvl',
    opts: [['normal', 'Normal', 'Even grey texture around the ventricles.', 'ok'],
      ['blush', 'Faint symmetric blush (physiological)', 'Symmetric, homogeneous, LESS bright than choroid. Common in preterms.', 'info'],
      ['pve', 'Bright: as bright as choroid or patchy', 'Pathological periventricular echogenicity – record how many days it has been present.', 'bad'],
      ['cystL', 'Small cysts (localised)', 'Small cysts above / beside the ventricle in one area.', 'bad'],
      ['cystE', 'Many cysts (extensive)', 'Cysts in fronto-parietal and occipital white matter.', 'bad'],
      ['cystS', 'Cysts reaching subcortical white matter', 'Extensive cystic change into subcortical white matter.', 'bad']] },
  { k: 'gs_cc', title: 'Corpus callosum & cavum septum pellucidum', where: 'Midline sagittal S1 and coronal C2', atlas: 'cong',
    opts: [['normal', 'Intact corpus callosum, CSP present', 'Curved dark band from front to back on midline sagittal.', 'ok'],
      ['csp0', 'CSP absent', 'No fluid space between frontal horns – look carefully at the corpus callosum.', 'warn'],
      ['ccAbn', 'Corpus callosum absent / short / thin', 'Possible callosal anomaly (parallel ventricles, radial sulci).', 'bad']] },
  { k: 'gs_bg', title: 'Basal ganglia & thalami', where: 'Coronal C3–C4 and parasagittal S2', atlas: 'hie',
    opts: [['normal', 'Normal', 'Similar brightness to cortex; symmetrical.', 'ok'],
      ['pretermBright', 'Mildly bright, preterm < 32 wk', 'Normal maturational finding before ~32 weeks.', 'info'],
      ['bright', 'Bright (term baby / clearly abnormal)', 'Increased echogenicity – think HIE in a term baby.', 'bad'],
      ['lsv', 'Bright linear / branching streaks', 'Lenticulostriate vasculopathy.', 'warn'],
      ['asym', 'Asymmetric / focal bright area', 'Focal lesion, e.g. haemorrhage or infarct.', 'bad']] },
  { k: 'gs_pf', title: 'Cerebellum & posterior fossa', where: 'Mastoid view (best); C4 and midline sagittal', atlas: 'cbh',
    opts: [['normalMF', 'Normal on mastoid view', 'Symmetric hemispheres, bright vermis, normal cisterna magna.', 'ok'],
      ['normalAF', 'Looks normal – anterior fontanelle only', 'Small cerebellar haemorrhage cannot be excluded without the mastoid view.', 'info'],
      ['punctate', 'Small bright focus (< 4 mm)', 'Punctate cerebellar haemorrhage.', 'bad'],
      ['limited', 'Bright area ≥ 4 mm, < 1/3 hemisphere', 'Limited cerebellar haemorrhage.', 'bad'],
      ['massive', 'Bright area ≥ 1/3 hemisphere', 'Massive cerebellar haemorrhage.', 'bad'],
      ['bigCM', 'Large fluid space below the vermis', 'Mega cisterna magna vs Dandy–Walker spectrum.', 'warn'],
      ['small', 'Small cerebellum / vermis', 'Possible hypoplasia.', 'bad']] },
  { k: 'gs_ext', title: 'Extra-axial spaces', where: 'Coronal C1–C3; linear probe for detail', atlas: 'extra',
    opts: [['normal', 'Normal', 'Thin fluid rim over the brain surface.', 'ok'],
      ['wide', 'Widened spaces, otherwise normal brain', 'Enlarged subarachnoid spaces (BESS pattern) – check head size.', 'warn'],
      ['coll', 'Collection pushing on the brain', 'Possible subdural collection or haemorrhage.', 'bad']] }
];

/* ---------- Measurement assistant (calliper guides, original SVG) --------- */
const CALIPER = {
  VI: { title: 'Ventricular index (VI)', plane: 'Coronal C3 – foramen of Monro',
    steps: ['Freeze the C3 image with the 3rd ventricle visible.', 'Place calliper 1 on the falx (midline).', 'Place calliper 2 on the OUTER (lateral) wall of the lateral ventricle, horizontally.', 'Repeat on the other side.'],
    img: 'lc-vi-measure', src: 'lc',
    svg: `<svg viewBox="0 0 240 150" class="cal-svg"><path d="M120 6 L10 120 A150 150 0 0 0 230 120 Z" class="sec"/><line x1="120" y1="10" x2="120" y2="130" class="ihf"/>
      <path d="M112 50 q-30 4 -36 26 q20 6 36 -10 z" class="csf"/><path d="M128 50 q30 4 36 26 q-20 6 -36 -10 z" class="csf"/><rect x="117" y="84" width="6" height="16" rx="2" class="csf"/>
      <line x1="120" y1="64" x2="76" y2="64" class="cal anim"/><circle cx="120" cy="64" r="3" class="cp"/><circle cx="76" cy="64" r="3" class="cp"/><text x="80" y="58" class="ct">VI</text></svg>` },
  AHW: { title: 'Anterior horn width (AHW)', plane: 'Coronal C3 – same image as VI',
    steps: ['Use the same frozen C3 image.', 'Measure the frontal horn diagonally at its WIDEST point, perpendicular to its long axis.', 'Repeat on the other side.'],
    img: 'cg-vi-ahw-dilated', src: 'cg',
    svg: `<svg viewBox="0 0 240 150" class="cal-svg"><path d="M120 6 L10 120 A150 150 0 0 0 230 120 Z" class="sec"/><line x1="120" y1="10" x2="120" y2="130" class="ihf"/>
      <path d="M112 50 q-30 4 -36 26 q20 6 36 -10 z" class="csf"/><path d="M128 50 q30 4 36 26 q-20 6 -36 -10 z" class="csf"/>
      <line x1="104" y1="52" x2="92" y2="72" class="cal anim"/><circle cx="104" cy="52" r="3" class="cp"/><circle cx="92" cy="72" r="3" class="cp"/><text x="64" y="48" class="ct">AHW</text></svg>` },
  TOD: { title: 'Thalamo-occipital distance (TOD)', plane: 'Parasagittal S2 – whole ventricle in view',
    steps: ['Freeze S2 with the whole C-shaped ventricle.', 'Calliper 1: outermost back edge of the thalamus (where choroid meets it).', 'Calliper 2: tip of the occipital horn.', 'Repeat on the other side.'],
    img: 'lc-vi-ahw-tod', src: 'lc',
    svg: `<svg viewBox="0 0 240 150" class="cal-svg"><path d="M120 6 L10 120 A150 150 0 0 0 230 120 Z" class="sec"/>
      <path d="M40 72 Q60 40 120 42 Q182 44 200 82 Q204 100 190 106 Q182 90 168 80 Q140 62 100 66 Q70 70 58 86 Z" class="csf"/>
      <ellipse cx="118" cy="92" rx="24" ry="16" class="gm"/>
      <line x1="140" y1="86" x2="196" y2="98" class="cal anim"/><circle cx="140" cy="86" r="3" class="cp"/><circle cx="196" cy="98" r="3" class="cp"/><text x="156" y="118" class="ct">TOD</text>
      <text x="14" y="20" class="ot">ANT</text><text x="200" y="20" class="ot">POST</text></svg>` }
};
/* plausible-value ranges in mm (outside → check units / re-measure) */
const MEAS_RANGE = { vi: [3, 30], ahw: [0.5, 25], tod: [8, 50] };

/* ---------- Abnormality Recognition Atlas --------------------------------- */
const ABN_ATLAS = [
  { id: 'ivh', title: 'Germinal matrix & intraventricular haemorrhage',
    imgs: [['tp-fig13-gmh', 'tp', 13, 'Grade I – germinal matrix'], ['fi-fig06-gmh-grade1-2', 'fi', 6, 'Grade I and II'], ['lc-ivh-grade3', 'lc', 0, 'Grade III'], ['fi-fig07-ivh-grade3', 'fi', 7, 'Grade III with MRI']],
    where: 'Caudothalamic groove on parasagittal S2 (both sides) and coronal C3–C4; occipital horns on posterior fontanelle view.',
    looks: ['Grade I: bright focus at the caudothalamic groove, brighter than choroid', 'Grade II: echogenic blood within the ventricle', 'Grade III: blood filling > 50% of the ventricle with dilatation', 'Clot later retracts and may leave a germinolytic cyst'],
    grade: 'Papile I–IV, each side separately. Grade IV = PVHI (see below).',
    pitfalls: ['Normal choroid reaches the caudothalamic groove – blood is brighter, bulky, or extends in front of it', 'Choroid is never in the frontal or occipital horn', 'Split / lobulated choroid: colour Doppler shows flow (clot has none)', 'Confirm in two planes'],
    senior: 'Any haemorrhage. Same day for grade III, PVHI, or a falling haemoglobin.' },
  { id: 'phi', title: 'Periventricular haemorrhagic infarction (PVHI)',
    imgs: [['tp-fig15-pvhi', 'tp', 15, 'PVHI right']],
    where: 'Periventricular white matter beside the ventricle with IVH – coronal C3–C5 and parasagittal S2–S3.',
    looks: ['Fan- or globular-shaped bright area beside the ventricle', 'Usually one side, same side as the IVH', 'Evolves into a single porencephalic cyst over weeks'],
    grade: 'Papile grade IV; record side, lobes involved and extent.',
    pitfalls: ['Not the same as PVL (PVL is bilateral and patchy)', 'Peritrigonal blush is symmetric and less bright than choroid'],
    senior: 'Always – same day.' },
  { id: 'phvd', title: 'Ventricular dilatation / PHVD',
    imgs: [['cg-vi-ahw-dilated', 'cg', 0, 'Dilated ventricles – VI 14.9/15.1, AHW 10.6/11.1 mm'], ['tp-fig14-ivh-dilated', 'tp', 14, 'Dilated ventricles with clot'], ['lc-vi-measure', 'lc', 0, 'VI measurement']],
    where: 'Coronal C3 (VI, AHW) and parasagittal S2 (TOD); occipital horns enlarge first.',
    looks: ['Rounded ("ballooned") frontal horns', 'Enlarged 3rd ventricle', 'Choroid "dangling" in a large ventricle'],
    grade: 'VI, AHW and TOD against PMA-specific reference charts; plot serially.',
    pitfalls: ['Preterm ventricles are normally larger', 'Mild asymmetry is common', 'Irregular, wavy outline suggests white matter loss (ex vacuo), not raised pressure', 'Dependent side looks smaller if the head is turned'],
    senior: 'Any measurement above the 97th centile, any rise on serial scans, or a rapidly growing head.' },
  { id: 'pvl', title: 'Periventricular echogenicity & PVL',
    imgs: [['lc-pathological-pve', 'lc', 0, 'Pathological PVE'], ['tp-fig18-pvl', 'tp', 18, 'PVE → cystic PVL'], ['fi-fig09-pvl-evolution', 'fi', 9, 'Early and late PVL']],
    where: 'Peritrigonal and frontal white matter – coronal C5–C6 and parasagittal S2–S3.',
    looks: ['Pathological: as bright as or brighter than choroid, patchy, asymmetric', 'Cysts appear 2–6 weeks later above and beside the ventricles', 'Late: wavy ventricular margins from white matter loss'],
    grade: 'de Vries I (echogenicity ≥ 7 days) to IV (subcortical cysts).',
    pitfalls: ['Physiological blush: symmetric, homogeneous, less bright than choroid, fades on posterior fontanelle view', 'Over-gain creates false echogenicity', 'In tiny preterms choroid is itself bright – rely on serial scans'],
    senior: 'Pathological echogenicity or any cysts.' },
  { id: 'cbh', title: 'Cerebellar haemorrhage',
    imgs: [['tp-fig16-cerebellar-haem', 'tp', 16, 'Seen on mastoid view']],
    where: 'Mastoid fontanelle view – each cerebellar hemisphere and the vermis.',
    looks: ['Bright focus or area within a cerebellar hemisphere', 'Often one-sided'],
    grade: 'Punctate < 4 mm · limited ≥ 4 mm and < 1/3 hemisphere · massive ≥ 1/3 hemisphere.',
    pitfalls: ['Frequently invisible through the anterior fontanelle', 'Normal vermis is brighter than the hemispheres'],
    senior: 'Any cerebellar haemorrhage.' },
  { id: 'hie', title: 'Term HIE (basal ganglia, thalami, cortex)',
    imgs: [['lc-term-hie', 'lc', 0, 'Term HIE'], ['tp-fig20-hie-basal-ganglia', 'tp', 20, 'Bright basal ganglia'], ['tp-fig19-term-asphyxia-cortex', 'tp', 19, 'Cortical injury']],
    where: 'Coronal C3–C4 and parasagittal S2 for deep grey matter; C1–C2 for cortex and white matter.',
    looks: ['Bright basal ganglia / thalami in a term baby', 'Loss of grey–white distinction; bright subcortical white matter', 'Oedema: effaced sulci, slit ventricles'],
    grade: 'Describe pattern: central (deep grey) vs watershed (peripheral).',
    pitfalls: ['Basal ganglia are normally bright before ~32 weeks', 'Early scans (< 24 h) may look normal'],
    senior: 'Always in suspected HIE.' },
  { id: 'infarct', title: 'Arterial stroke / focal infarction',
    imgs: [['tp-fig21-mca-stroke', 'tp', 21, 'MCA territory stroke'], ['fi-fig13-thalamic-haem', 'fi', 13, 'Thalamic haemorrhage']],
    where: 'Perisylvian cortex (MCA territory) on coronal C3–C4; compare both sides.',
    looks: ['Wedge-shaped bright, swollen cortex', 'Loss of grey–white differentiation, mild mass effect'],
    grade: 'Describe territory and side.',
    pitfalls: ['CUS can be normal early – a normal scan does not exclude stroke'],
    senior: 'Always.' },
  { id: 'cysts', title: 'Which cyst is it?',
    imgs: [['lc-cyst-locations', 'lc', 0, 'Cyst position guide'], ['tp-fig09-connatal-cysts', 'tp', 9, 'Connatal cysts'], ['cg-connatal-cor', 'cg', 0, 'Connatal cysts – coronal'], ['cg-choroid-cyst-cor', 'cg', 0, 'Choroid plexus cyst – coronal'], ['cg-choroid-cyst-sag', 'cg', 0, 'Choroid plexus cyst – parasagittal (arrow)'], ['fi-fig08-gmh-evolution', 'fi', 8, 'Subependymal cyst after GMH'], ['tp-fig12-choroid-cyst', 'tp', 12, 'Choroid plexus cysts']],
    where: 'Relate the cyst to the foramen of Monro and the upper border of the lateral ventricle.',
    looks: ['Connatal: outer angle of frontal horns, in front of the foramen of Monro (normal)', 'Germinolytic / subependymal: caudothalamic notch, behind the foramen of Monro', 'PVL: multiple, above and beside the ventricle', 'Porencephalic: single, large, after PVHI'],
    grade: 'Describe location, number and size.',
    pitfalls: ['Choroid plexus cysts < 1 cm and single are usually incidental'],
    senior: 'PVL or porencephalic cysts; multiple / large choroid cysts.' },
  { id: 'cong', title: 'Congenital anomalies',
    imgs: [['tp-fig29-holoprosencephaly', 'tp', 29, 'Holoprosencephaly'], ['tp-fig28-arachnoid-cyst', 'tp', 28, 'Arachnoid cyst']],
    where: 'Midline sagittal (corpus callosum, vermis) and coronal C2 (CSP, frontal horns).',
    looks: ['Absent CSP, parallel ventricles, radial sulci → corpus callosum agenesis', 'Single ventricle, fused thalami → holoprosencephaly', 'Large posterior fossa cyst with small vermis → Dandy–Walker spectrum'],
    grade: 'Describe; MRI confirms.',
    pitfalls: ['Cavum vergae and cavum veli interpositi are normal variants', 'Mega cisterna magna has a normal vermis'],
    senior: 'Always.' },
  { id: 'extra', title: 'Extra-axial spaces & collections',
    imgs: [['fi-fig15-benign-extra-axial', 'fi', 15, 'Benign enlarged spaces']],
    where: 'Over the convexity on coronal C1–C3; linear high-frequency probe.',
    looks: ['Benign enlargement: symmetric fluid, normal brain, veins cross the space', 'Subdural collection: veins pushed against the cortex, may compress the brain'],
    grade: 'Describe side, thickness and mass effect.',
    pitfalls: ['Lateral convexities are poorly seen on CUS', 'Use colour Doppler to see bridging veins'],
    senior: 'Any collection or mass effect.' },
  { id: 'variants', title: 'Normal variants that mimic disease',
    imgs: [['tp-fig10-csp-cv', 'tp', 10, 'CSP and cavum vergae'], ['fi-fig02-cavum-veli-interpositi', 'fi', 2, 'Cavum veli interpositi'], ['tp-fig11-mega-cisterna', 'tp', 11, 'Mega cisterna magna'], ['tp-fig08-ventricle-asymmetry', 'tp', 8, 'Ventricular asymmetry'], ['fi-fig04-choroid-cyst', 'fi', 4, 'Split choroid / choroid cyst'], ['lc-bg-choroid-preterm', 'lc', 0, 'Bright basal ganglia, bulky choroid (preterm)']],
    where: 'Anywhere – know these before calling something abnormal.',
    looks: ['CSP / cavum vergae / cavum veli interpositi', 'Ventricular asymmetry (left > right)', 'Bulky, split or lobulated choroid', 'Bright basal ganglia before 32 weeks', 'Peritrigonal blush; tangential sulcus pseudolesion; calcar avis'],
    grade: 'Not graded – record as normal variant.',
    pitfalls: ['If unsure whether it is a variant, ask'],
    senior: 'If uncertain.' }
];
