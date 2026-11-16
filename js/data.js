/* =========================================================================
   NeoCUS — reference data, classifications and scanning-guide content
   All thresholds here are editable. Verify against your unit protocol.
   ========================================================================= */

/* ---------- Ventricular reference (PMA 24–42 wk) -------------------------
   Values digitised from the "Ventricular Measurement Risk Zones" tool
   (El-Dib M et al. J Pediatr 2020;226:16-27, Fig 4; data from Brouwer et al.).
   p97 = p97.5 line. High-risk line: VI p97+4 mm, AHW 10 mm, TOD p97+6 mm.
   Anchor points are linearly interpolated.                                  */
const REF = {
  VI: {
    label: 'Ventricular index (VI)',
    plane: 'Coronal, level of foramen of Monro',
    mean: [[24, 8.0], [42, 12.2]],
    p97:  [[24, 9.5], [42, 14.3]],
    high: [[24, 13.5], [42, 18.3]],
    yMin: 4, yMax: 24
  },
  AHW: {
    label: 'Anterior horn width (AHW)',
    plane: 'Coronal, same plane as VI (diagonal width of frontal horn)',
    mean: [[24, 1.5], [42, 1.5]],
    p97:  [[24, 6.0], [42, 6.0]],
    high: [[24, 10.0], [42, 10.0]],
    yMin: 0, yMax: 16
  },
  TOD: {
    label: 'Thalamo-occipital distance (TOD)',
    plane: 'Parasagittal, outermost thalamus to tip of occipital horn',
    mean: [[24, 14.5], [28, 15.2], [32, 15.8], [35, 16.0], [38, 15.9], [42, 15.5]],
    p97:  [[24, 19.0], [28, 19.9], [32, 20.5], [35, 20.8], [38, 20.7], [42, 20.2]],
    high: [[24, 24.6], [28, 25.7], [32, 26.4], [35, 26.8], [38, 26.6], [42, 26.2]],
    yMin: 10, yMax: 34
  }
};

function interp(points, x) {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return null;
}

/** Classify a measurement against the reference at a given PMA (weeks, decimal). */
function classifyVent(key, value, pma) {
  if (value === '' || value == null || isNaN(value)) return null;
  const r = REF[key];
  const p97 = interp(r.p97, pma), high = interp(r.high, pma), mean = interp(r.mean, pma);
  let zone = 'normal';
  if (value >= high) zone = 'high';
  else if (value > p97) zone = 'moderate';
  return {
    value: +value, mean, p97, high, zone,
    outOfRange: pma < 24 || pma > 42
  };
}

const ZONE_TEXT = {
  normal:   { label: 'Within reference (≤ p97)', cls: 'z-normal' },
  moderate: { label: 'Moderate-risk zone (> p97)', cls: 'z-moderate' },
  high:     { label: 'High-risk zone', cls: 'z-high' }
};

/* ---------- Other simple reference values -------------------------------- */
const OTHER_REF = {
  thirdVentricle: { normalMax: 3, significant: 5 },      // mm
  cisternaMagna: { min: 3, max: 10 },                    // mm
  riLow: 0.55, riHigh: 0.85
};

/** Rule-of-thumb trans-cerebellar diameter (James 2018): TCD (mm) ≈ GA (wk) to 27 wk, then +2 mm/wk. */
function expectedTCD(pma) {
  if (!pma) return null;
  const v = pma <= 27 ? pma : 27 + 2 * (pma - 27);
  return Math.min(v, 55);
}

/* ---------- Option lists -------------------------------------------------- */
const INDICATIONS = [
  ['routine', 'Routine screening (GA < 32 wk / BW < 1500 g)'],
  ['prematurity', 'Prematurity'],
  ['seizures', 'Seizures'],
  ['suspIVH', 'Suspected IVH'],
  ['abnNeuro', 'Abnormal neurological findings'],
  ['hie', 'Neonatal encephalopathy / HIE'],
  ['ivhFU', 'IVH follow-up'],
  ['phvdFU', 'Ventricular dilatation / PHVD follow-up'],
  ['congenital', 'Suspected congenital anomaly'],
  ['infection', 'Sepsis / meningitis'],
  ['headSize', 'Macrocephaly / microcephaly'],
  ['deterioration', 'Acute deterioration / Hb drop']
];

const CORONAL_VIEWS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const SAGITTAL_VIEWS = [
  ['S1', 'Midline sagittal'],
  ['S2R', 'Right parasagittal (lateral ventricle)'],
  ['S2L', 'Left parasagittal (lateral ventricle)'],
  ['S3R', 'Right parasagittal (insula)'],
  ['S3L', 'Left parasagittal (insula)']
];

/* Brain anatomy checklist: [key, label, options (first = normal)] */
const ANATOMY = [
  ['midline', 'Midline structures', ['Central, normal', 'Midline shift', 'Abnormal (see notes)']],
  ['csp', 'Cavum septum pellucidum', ['Present, normal', 'Cavum vergae present (normal variant)', 'Absent', 'Enlarged']],
  ['ventricles', 'Lateral ventricles', ['Normal size and shape', 'Dilated', 'Asymmetric (normal variant)', 'Slit-like', 'Ballooned', 'Irregular outline (ex vacuo)']],
  ['ctg', 'Caudothalamic grooves', ['Normal, no echogenic focus', 'Echogenic focus – right', 'Echogenic focus – left', 'Echogenic focus – bilateral']],
  ['choroid', 'Choroid plexus', ['Normal, smooth', 'Bulky / irregular', 'Choroid plexus cyst', 'Haemorrhage suspected']],
  ['pvwm', 'Periventricular white matter', ['Normal echogenicity', 'Increased echogenicity (flare)', 'Cystic change', 'Reduced volume']],
  ['cortex', 'Cortex / gyration', ['Appropriate for PMA', 'Simplified for PMA', 'Abnormal (see notes)']],
  ['deepgrey', 'Thalami / basal ganglia', ['Normal', 'Increased echogenicity', 'Lenticulostriate vasculopathy', 'Asymmetric']],
  ['cerebellum', 'Cerebellum / posterior fossa', ['Normal', 'Haemorrhage', 'Hypoplastic', 'Abnormal (see notes)']],
  ['extraaxial', 'Extra-axial spaces', ['Normal', 'Increased', 'Collection present']]
];

/* ---------- Classification text ----------------------------------------- */
const PAPILE = {
  0: 'No GMH-IVH',
  1: 'Grade I – germinal matrix (subependymal) haemorrhage only',
  2: 'Grade II – IVH without ventricular dilatation',
  3: 'Grade III – IVH with acute ventricular dilatation',
  4: 'Grade IV – IVH with parenchymal haemorrhage (periventricular haemorrhagic infarction)'
};
const VOLPE = {
  0: 'No GMH-IVH',
  1: 'Grade I – GMH with no or minimal IVH (< 10% ventricular area)',
  2: 'Grade II – IVH occupying 10–50% of ventricular area',
  3: 'Grade III – IVH > 50% of ventricular area, usually with distension'
};
const DEVRIES = {
  0: 'No white matter injury',
  0.5: 'Transient periventricular echogenicity (< 7 days) – not graded as PVL; repeat scan',
  1: 'Grade I PVL – periventricular echogenicity persisting ≥ 7 days',
  2: 'Grade II PVL – echodensity evolving into small localised fronto-parietal cysts',
  3: 'Grade III PVL – extensive periventricular cystic lesions (fronto-parietal and occipital)',
  4: 'Grade IV PVL – extensive cystic change extending into subcortical white matter'
};
const CBH = {
  none: 'No cerebellar haemorrhage',
  punctate: 'Punctate cerebellar haemorrhage (< 4 mm)',
  limited: 'Limited cerebellar haemorrhage (≥ 4 mm, < 1/3 of hemisphere)',
  massive: 'Massive cerebellar haemorrhage (≥ 1/3 of hemisphere)'
};

/* ---------- Scanning guide ------------------------------------------------
   Schematic drawings are simplified, original line diagrams (not images).
   Anterior is on the LEFT of sagittal images; patient's right is on the
   LEFT of coronal images (standard convention).                            */
const G = {
  sector(extra = '') {
    return `<path d="M150 8 L14 150 A190 190 0 0 0 286 150 Z" class="sec"/>${extra}`;
  },
  lab(x, y, tx, ty, text, anchor = 'start') {
    return `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" class="ldr"/><circle cx="${x}" cy="${y}" r="1.8" class="dot"/><text x="${tx + (anchor === 'end' ? -2 : 2)}" y="${ty + 3}" text-anchor="${anchor}" class="lbl">${text}</text>`;
  },
  meas(x1, y1, x2, y2, t, tx, ty) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="meas"/><text x="${tx}" y="${ty}" class="mlbl">${t}</text>`;
  }
};

const IHF = '<line x1="150" y1="14" x2="150" y2="150" class="ihf"/>';

const GUIDE = [
  {
    id: 'C1', plane: 'coronal', title: 'C1 – Frontal lobes',
    how: 'Angle the probe as far anteriorly as possible, in front of the frontal horns. Orbital roofs form the inferior border. Image must be symmetrical with the interhemispheric fissure (IHF) central.',
    see: ['Interhemispheric fissure', 'Frontal lobes / frontal white matter', 'Orbital roofs', 'Extra-axial space over convexity'],
    look: 'Frontal white matter echogenicity, extra-axial collections, frontal cysts.',
    svg: () => G.sector(IHF +
      '<path d="M90 160 Q120 140 145 158" class="bone"/><path d="M155 158 Q180 140 210 160" class="bone"/>' +
      '<ellipse cx="110" cy="95" rx="38" ry="40" class="wm"/><ellipse cx="190" cy="95" rx="38" ry="40" class="wm"/>' +
      G.lab(150, 50, 205, 28, 'IHF') + G.lab(110, 95, 40, 70, 'Frontal lobe', 'start') + G.lab(120, 150, 60, 182, 'Orbital roof'))
  },
  {
    id: 'C2', plane: 'coronal', title: 'C2 – Frontal horns',
    how: 'Angle slightly posteriorly until the frontal horns appear as paired anechoic structures either side of the midline.',
    see: ['Frontal horns of lateral ventricles', 'Cavum septum pellucidum (CSP)', 'Corpus callosum (genu)', 'Caudate heads', 'Sylvian fissures'],
    look: 'Anterior horn width (AHW) can be measured here or at C3. CSP is larger in preterm infants – do not mistake for 3rd ventricle. Absent CSP → think agenesis of corpus callosum / septo-optic dysplasia.',
    svg: () => G.sector(IHF +
      '<path d="M120 68 Q150 52 180 68" class="cc"/>' +
      '<path d="M128 74 q-10 6 -6 20 q8 -2 18 -14 z" class="csf"/><path d="M172 74 q10 6 6 20 q-8 -2 -18 -14 z" class="csf"/>' +
      '<rect x="146" y="74" width="8" height="18" rx="3" class="csf"/>' +
      '<ellipse cx="124" cy="104" rx="14" ry="10" class="gm"/><ellipse cx="176" cy="104" rx="14" ry="10" class="gm"/>' +
      '<path d="M70 120 l20 -6" class="fis"/><path d="M230 120 l-20 -6" class="fis"/>' +
      G.lab(150, 60, 200, 30, 'Corpus callosum') + G.lab(128, 84, 50, 60, 'Frontal horn') + G.lab(150, 86, 210, 70, 'CSP') +
      G.lab(124, 104, 46, 130, 'Caudate head') + G.lab(225, 118, 200, 160, 'Sylvian fissure'))
  },
  {
    id: 'C3', plane: 'coronal', title: 'C3 – Foramina of Monro / 3rd ventricle',
    how: 'Angle further back to show the 3rd ventricle as a small midline slit below the CSP. The Sylvian fissures are Y-shaped (term) or widely open (preterm).',
    see: ['Bodies of lateral ventricles', 'Foramen of Monro', '3rd ventricle', 'Caudothalamic groove region', 'Sylvian fissures'],
    look: 'Standard plane for the Levene ventricular index (VI): falx → lateral wall of lateral ventricle, each side. AHW is the diagonal width of the frontal horn in this plane. 3rd ventricle normally < 3 mm. Look for GMH at the caudothalamic region.',
    svg: () => G.sector(IHF +
      '<path d="M118 66 Q150 50 182 66" class="cc"/>' +
      '<path d="M127 72 q-14 8 -8 24 q10 -2 22 -16 z" class="csf"/><path d="M173 72 q14 8 8 24 q-10 -2 -22 -16 z" class="csf"/>' +
      '<rect x="147" y="74" width="6" height="12" rx="2" class="csf"/><rect x="148" y="100" width="4" height="22" rx="2" class="csf"/>' +
      '<path d="M66 112 l22 -2 l10 -12 M88 110 l10 10" class="fis"/><path d="M234 112 l-22 -2 l-10 -12 M212 110 l-10 10" class="fis"/>' +
      G.meas(150, 86, 119, 86, 'VI', 120, 82) +
      G.meas(126, 73, 120, 95, '', 0, 0) +
      G.lab(150, 112, 200, 150, '3rd ventricle') + G.lab(140, 92, 60, 60, 'Foramen of Monro') + G.lab(90, 104, 40, 140, 'Sylvian fissure'))
  },
  {
    id: 'C4', plane: 'coronal', title: 'C4 – Thalami / choroid plexus',
    how: 'Angle posterior to the foramen of Monro to show the thalami, bodies of the lateral ventricles with choroid plexus, and the cerebellum below the tentorium.',
    see: ['Thalami', 'Bodies of lateral ventricles + choroid plexus', 'Tentorium', 'Cerebellum (vermis brighter than hemispheres)', 'Cisterna magna'],
    look: 'Thalamic/basal ganglia echogenicity (HIE). Some units measure VI here. Cerebellar haemorrhage (supplement with mastoid view).',
    svg: () => G.sector(IHF +
      '<path d="M116 62 Q150 48 184 62" class="cc"/>' +
      '<path d="M126 68 q-16 10 -10 24 q12 -4 24 -18 z" class="csf"/><path d="M174 68 q16 10 10 24 q-12 -4 -24 -18 z" class="csf"/>' +
      '<ellipse cx="128" cy="80" rx="6" ry="4" class="cp"/><ellipse cx="172" cy="80" rx="6" ry="4" class="cp"/>' +
      '<ellipse cx="134" cy="110" rx="15" ry="13" class="gm"/><ellipse cx="166" cy="110" rx="15" ry="13" class="gm"/>' +
      '<path d="M100 150 Q150 122 200 150" class="bone"/>' +
      '<ellipse cx="150" cy="168" rx="34" ry="14" class="cb"/><ellipse cx="150" cy="168" rx="9" ry="12" class="cp"/>' +
      G.lab(134, 110, 50, 120, 'Thalamus') + G.lab(172, 80, 230, 55, 'Choroid plexus') + G.lab(190, 145, 240, 135, 'Tentorium') + G.lab(176, 170, 236, 180, 'Cerebellum'))
  },
  {
    id: 'C5', plane: 'coronal', title: 'C5 – Trigones',
    how: 'Angle further back through the trigones (atria). Ventricular cavities diverge laterally and are filled with echogenic choroid plexus.',
    see: ['Trigones with glomus of choroid plexus', 'Peritrigonal white matter', 'Cavum vergae (if present)'],
    look: 'Distinguish the normal symmetrical "peritrigonal blush" (less echogenic than choroid) from periventricular flare. Parallel ventricles → consider corpus callosum dysgenesis. Choroid plexus cysts / bleed.',
    svg: () => G.sector(IHF +
      '<path d="M140 70 q-26 4 -36 26 q18 6 34 -10 z" class="csf"/><path d="M160 70 q26 4 36 26 q-18 6 -34 -10 z" class="csf"/>' +
      '<ellipse cx="122" cy="86" rx="12" ry="7" class="cp"/><ellipse cx="178" cy="86" rx="12" ry="7" class="cp"/>' +
      '<ellipse cx="112" cy="100" rx="22" ry="14" class="blush"/><ellipse cx="188" cy="100" rx="22" ry="14" class="blush"/>' +
      G.lab(122, 86, 46, 60, 'Choroid (glomus)') + G.lab(188, 104, 226, 140, 'Peritrigonal WM') + G.lab(140, 74, 170, 30, 'Trigone'))
  },
  {
    id: 'C6', plane: 'coronal', title: 'C6 – Occipital lobes',
    how: 'Angle maximally posteriorly to show parietal and occipital cortex with the IHF central.',
    see: ['Occipital / parietal white matter', 'Sulcal pattern', 'Interhemispheric fissure'],
    look: 'Best plane for periventricular flare and cystic PVL in the occipital white matter. Sulcation becomes more complex with increasing PMA.',
    svg: () => G.sector(IHF +
      '<ellipse cx="112" cy="90" rx="36" ry="40" class="wm"/><ellipse cx="188" cy="90" rx="36" ry="40" class="wm"/>' +
      '<path d="M90 70 q10 6 6 16 M100 110 q10 -4 16 6 M200 70 q-10 6 -6 16 M200 110 q-10 -4 -16 6" class="fis"/>' +
      G.lab(112, 90, 40, 60, 'Occipital WM') + G.lab(96, 80, 40, 140, 'Sulci') + G.lab(150, 40, 200, 24, 'IHF'))
  },
  {
    id: 'S1', plane: 'sagittal', title: 'S1 – Midline sagittal',
    how: 'Rotate the probe 90° (marker toward the nose; anterior on the left of the image) and keep it in the midline of the anterior fontanelle.',
    see: ['Corpus callosum (genu → splenium)', 'Cingulate sulcus', 'CSP / cavum vergae', '3rd ventricle', 'Aqueduct, brainstem', 'Cerebellar vermis + 4th ventricle', 'Cisterna magna'],
    look: 'Corpus callosum presence and length; vermis size and lobulation; 4th ventricle; cisterna magna (normal 3–10 mm). Absent/abnormal CC → MRI.',
    svg: () => G.sector(
      '<path d="M70 92 Q150 30 228 96" class="ccband"/>' +
      '<path d="M82 92 Q150 46 216 98" class="fis"/>' +
      '<path d="M100 98 Q150 66 196 100 L190 106 Q150 80 108 104 Z" class="csf"/>' +
      '<path d="M138 112 l18 -2 l6 16 l-18 4 z" class="csf"/>' +
      '<path d="M160 130 q6 18 -2 34" class="gm" style="fill:none;stroke-width:10"/>' +
      '<ellipse cx="200" cy="150" rx="22" ry="20" class="cb"/><path d="M182 146 l10 4 l-10 4 z" class="csf"/>' +
      '<path d="M190 172 q16 10 34 2 l-4 -6 q-14 6 -26 -2 z" class="csf"/>' +
      G.lab(120, 60, 56, 30, 'Corpus callosum') + G.lab(140, 86, 70, 130, 'CSP') + G.lab(150, 118, 90, 160, '3rd ventricle') +
      G.lab(208, 146, 244, 120, 'Vermis') + G.lab(186, 150, 230, 196, '4th ventricle') + G.lab(214, 176, 214, 194, 'Cisterna magna', 'end') +
      '<text x="20" y="24" class="ori">ANT</text><text x="262" y="24" class="ori">POST</text>')
  },
  {
    id: 'S2', plane: 'sagittal', title: 'S2 – Parasagittal (lateral ventricle), right & left',
    how: 'From midline, angle laterally (right, then left) until the whole C-shaped lateral ventricle is shown.',
    see: ['C-shaped lateral ventricle', 'Choroid plexus in atrium', 'Caudate nucleus (anterior floor)', 'Thalamus', 'Caudothalamic groove (CTG)'],
    look: 'Key plane for GMH: echogenicity at the CTG that is ≥ choroid plexus, or choroid extending anterior to CTG, suggests GMH. Choroid is NOT normally in frontal or occipital horns – echogenic material there = blood. Measure TOD here (outermost thalamus → tip of occipital horn).',
    svg: () => G.sector(
      '<path d="M62 92 Q90 56 150 58 Q214 60 236 102 Q240 124 222 132 Q214 112 196 96 Q160 76 120 82 Q92 88 80 104 Z" class="csf"/>' +
      '<path d="M152 80 Q190 82 214 116 Q204 122 190 112 Q172 92 150 90 Z" class="cp"/>' +
      '<ellipse cx="104" cy="110" rx="22" ry="14" class="gm"/><ellipse cx="148" cy="116" rx="26" ry="20" class="gm"/>' +
      '<path d="M124 98 l4 10 l4 -10" class="ctg"/>' +
      G.meas(170, 112, 232, 116, 'TOD', 196, 128) +
      G.lab(104, 110, 40, 140, 'Caudate') + G.lab(148, 120, 110, 170, 'Thalamus') + G.lab(128, 104, 92, 50, 'CTG') + G.lab(190, 96, 200, 40, 'Choroid plexus') +
      '<text x="20" y="24" class="ori">ANT</text><text x="262" y="24" class="ori">POST</text>')
  },
  {
    id: 'S3', plane: 'sagittal', title: 'S3 – Parasagittal (insula), right & left',
    how: 'Angle further laterally, beyond the lateral ventricle, to the insula.',
    see: ['Sylvian fissure and insula', 'Periventricular white matter', 'Cortical sulcation'],
    look: 'Periventricular flare and cystic PVL along the length of the ventricle; sulcal maturity relative to PMA.',
    svg: () => G.sector(
      '<ellipse cx="150" cy="100" rx="90" ry="50" class="wm"/>' +
      '<path d="M90 120 Q150 100 220 112 M150 106 l-10 -24 M180 108 l6 -26 M120 112 l-14 -18" class="fis"/>' +
      G.lab(160, 104, 150, 170, 'Sylvian fissure / insula') + G.lab(110, 80, 50, 50, 'Periventricular WM') +
      '<text x="20" y="24" class="ori">ANT</text><text x="262" y="24" class="ori">POST</text>')
  },
  {
    id: 'PF', plane: 'supplementary', title: 'Posterior fontanelle',
    how: 'Probe at the junction of sagittal and lambdoid sutures; coronal and sagittal sweeps.',
    see: ['Occipital horns', 'Trigones', 'Posterior periventricular white matter', 'Infratentorial structures'],
    look: 'Improves detection of occipital horn blood/clot, occipital PVL and posterior fossa pathology.',
    svg: () => G.sector(IHF +
      '<path d="M140 50 q-30 10 -30 50 q14 0 30 -30 z" class="csf"/><path d="M160 50 q30 10 30 50 q-14 0 -30 -30 z" class="csf"/>' +
      G.lab(124, 80, 50, 60, 'Occipital horn') + G.lab(176, 80, 236, 60, 'Occipital horn'))
  },
  {
    id: 'MF', plane: 'supplementary', title: 'Mastoid fontanelle',
    how: 'Probe ~1 cm behind the helix, above the tragus (junction of squamosal, lambdoid and occipital sutures). Axial and coronal planes.',
    see: ['Cerebellar hemispheres and vermis', '4th ventricle', 'Cisterna magna', 'Brainstem'],
    look: 'Essential for cerebellar haemorrhage (often missed via AF), especially < 32 wk. Trans-cerebellar diameter (TCD) can be measured here.',
    svg: () => G.sector(
      '<ellipse cx="116" cy="110" rx="34" ry="26" class="cb"/><ellipse cx="184" cy="110" rx="34" ry="26" class="cb"/>' +
      '<ellipse cx="150" cy="108" rx="12" ry="22" class="cp"/><path d="M144 84 l6 10 l6 -10 z" class="csf"/>' +
      '<path d="M120 142 Q150 160 180 142 Q150 150 120 142" class="csf"/>' +
      G.meas(82, 110, 218, 110, 'TCD', 150, 104) +
      G.lab(116, 120, 50, 160, 'Cerebellar hemisphere') + G.lab(150, 88, 200, 50, '4th ventricle') + G.lab(150, 150, 210, 180, 'Cisterna magna'))
  }
];

const GUIDE_TIPS = [
  'Warm gel; scan when settled (after cares/feeds); minimal head handling in VLBW infants.',
  'Microconvex 5–8 MHz for standard views; linear 7–12 MHz for cortex, extra-axial space and superior sagittal sinus.',
  'Adjust depth to just include the skull base; gain so parenchyma is mid-grey (over-gain masks haemorrhage).',
  'Standard sequence: Coronal C1 → C6 › Midline sagittal › Right & left parasagittal › Posterior fontanelle › Mastoid › Doppler.',
  'Confirm any abnormality in two planes (coronal + sagittal) or a supplementary window. Save cine loops.',
  'Germinal matrix echogenicity should be less than choroid plexus at any GA – equal or brighter suggests GMH.'
];

const GUIDE_REFS = [
  'James AC. Practical guide to neonatal cranial ultrasound (CrUS): basics. Paediatr Child Health 2018.',
  'El-Dib M, Limbrick DD, Inder T, et al. Management of post-hemorrhagic ventricular dilatation in the infant born preterm. J Pediatr 2020;226:16-27.',
  'Papile LA, et al. Incidence and evolution of subependymal and intraventricular hemorrhage. J Pediatr 1978;92:529-34.',
  'Volpe JJ. Intracranial hemorrhage: germinal matrix–intraventricular hemorrhage of the premature infant. Neurology of the Newborn.',
  'de Vries LS, Eken P, Dubowitz LM. The spectrum of leukomalacia using cranial ultrasound. Behav Brain Res 1992;49:1-6.',
  'Boswinkel V, et al. The CHOPIn study: cerebellar haemorrhage classification. Neonatology 2019.',
  'Levene MI. Measurement of the growth of the lateral ventricles in preterm infants with real-time ultrasound. Arch Dis Child 1981;56:900-4.',
  'Hospital Miri NICU – Neonatal Cranial Ultrasound Protocol.'
];
