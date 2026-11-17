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

/* ---------- Image sources (open-access licences) ------------------------- */
const SOURCES = {
  tp: { short: 'Caro-Domínguez P et al. Transl Pediatr 2021;10(4):1117-37',
        url: 'https://doi.org/10.21037/tp-20-399', licence: 'CC BY-NC-ND 4.0',
        licUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/', note: 'Reproduced unaltered (resized).' },
  fi: { short: 'Fichera G et al. J Ultrasound 2024;27:993-1002',
        url: 'https://doi.org/10.1007/s40477-024-00914-8', licence: 'CC BY 4.0',
        licUrl: 'https://creativecommons.org/licenses/by/4.0/', note: 'Resized from original.' },
  lc: { short: '', url: '', licence: '', licUrl: '', note: '' },  // unit teaching images (CUS Overview lecture)
  cg: { short: 'Cranial Ultrasound Guidelines, Dr O. Ejiwunmi (Oct 2025)', url: '', licence: 'used with permission', licUrl: '', note: '' },
  du: { short: 'Dudink J et al (eurUS.brain). Pediatr Res 2020;87(S1):3-12', url: 'https://doi.org/10.1038/s41390-020-0776-y', licence: 'CC BY 4.0', licUrl: 'https://creativecommons.org/licenses/by/4.0/', note: 'Resized; single panels cropped from the original figure where shown.' },
  pa: { short: 'Parodi A et al (eurUS.brain). Pediatr Res 2020;87(S1):13-24', url: 'https://doi.org/10.1038/s41390-020-0780-2', licence: 'CC BY 4.0', licUrl: 'https://creativecommons.org/licenses/by/4.0/', note: 'Resized; single panels cropped from the original figure where shown.' },
  fu: { short: 'Fumagalli M et al (eurUS.brain). Pediatr Res 2020;87(S1):25-36', url: 'https://doi.org/10.1038/s41390-020-0778-9', licence: 'CC BY 4.0', licUrl: 'https://creativecommons.org/licenses/by/4.0/', note: 'Resized; single panels cropped from the original figure where shown.' },
  ag: { short: 'Agut T et al (eurUS.brain). Pediatr Res 2020;87(S1):37-49', url: 'https://doi.org/10.1038/s41390-020-0781-1', licence: 'CC BY 4.0', licUrl: 'https://creativecommons.org/licenses/by/4.0/', note: 'Resized; single panels cropped from the original figure where shown.' },
  an: { short: 'Annink KV et al. Pediatr Res 2020;87(S1):59-66', url: 'https://doi.org/10.1038/s41390-020-0782-0', licence: 'CC BY 4.0', licUrl: 'https://creativecommons.org/licenses/by/4.0/', note: 'Resized; single panels cropped from the original figure where shown.' },
};

/* ---------- Normal views (real images) ------------------------------------ */
const VIEWS = [
  { id: 'coronal', title: 'Coronal views C1–C6', img: 'tp-fig01-coronal-normal', src: 'tp', fig: 1,
    window: 'Anterior fontanelle', how: 'Probe marker to the baby’s right. Sweep from the frontal lobes back to the occipital lobes, keeping the interhemispheric fissure central.',
    panels: [
      ['A · C1', 'Frontal lobes', 'Interhemispheric fissure, frontal white matter, orbital roofs'],
      ['B · C2', 'Frontal horns', 'Frontal horns, cavum septum pellucidum, corpus callosum, caudate heads'],
      ['C · C3', 'Foramen of Monro / 3rd ventricle', 'Standard plane for VI and AHW; 3rd ventricle < 3 mm; Sylvian fissures'],
      ['D · C4', 'Thalami / cerebellum', 'Thalami, choroid plexus in ventricular bodies, tentorium, cerebellum'],
      ['E · C5', 'Trigones', 'Choroid glomus fills trigones; peritrigonal blush must be less bright than choroid'],
      ['F · C6', 'Occipital lobes', 'Best plane for occipital periventricular flare and cystic PVL']
    ] },
  { id: 'sagittal', title: 'Sagittal views S1–S3', img: 'tp-fig02-sagittal-normal', src: 'tp', fig: 2,
    window: 'Anterior fontanelle', how: 'Rotate 90° (marker toward nose; anterior on image left). Midline, then angle to each side.',
    panels: [
      ['A · S1', 'Midline sagittal', 'Corpus callosum, CSP, 3rd & 4th ventricles, vermis, cisterna magna'],
      ['B · S2', 'Parasagittal – lateral ventricle (R & L)', 'Caudothalamic groove (GMH site), caudate, thalamus, choroid; measure TOD'],
      ['C · S3', 'Parasagittal – insula (R & L)', 'Sylvian fissure, periventricular white matter, sulcation']
    ] },
  { id: 'mastoid', title: 'Mastoid fontanelle', img: 'tp-fig03-mastoid-normal', src: 'tp', fig: 3,
    window: 'Mastoid fontanelle', how: 'Probe ~1 cm behind the ear, above the tragus. Essential for cerebellar haemorrhage, especially < 32 wk.',
    panels: [['', 'Posterior fossa', 'Cerebellar hemispheres, vermis, 4th ventricle, cisterna magna; measure TCD']] },
  { id: 'sulcation', title: 'Sulcation: preterm vs term', img: 'tp-fig04-sulcation', src: 'tp', fig: 4,
    window: 'Coronal + sagittal', how: 'Gyral pattern must match PMA. A smooth brain at term is abnormal.',
    panels: [['A, C', 'Preterm', 'Few, shallow sulci; wide open Sylvian fissure'], ['B, D', 'Term', 'Complex, branching sulci']] }
];

/* ---------- Atlas: normal variants and abnormal findings ------------------ */
/* link = Findings section the example relates to                         */
const ATLAS = [
  // Haemorrhage
  { cat: 'Haemorrhage', title: 'Germinal matrix haemorrhage (Papile I)', img: 'tp-fig13-gmh', src: 'tp', fig: 13, link: 'ivh',
    keys: ['Echogenic focus at the caudothalamic groove', 'Brighter than choroid; choroid never extends into the frontal horn', 'Confirm in coronal and parasagittal planes'] },
  { cat: 'Haemorrhage', title: 'GMH grade I (left) and grade II (right)', img: 'fi-fig06-gmh-grade1-2', src: 'fi', fig: 6, link: 'ivh',
    keys: ['Bilateral caudothalamic haemorrhage', 'Grade II: blood within the ventricle, no dilatation'] },
  { cat: 'Haemorrhage', title: 'IVH grade III with ventricular dilatation', img: 'tp-fig14-ivh-dilated', src: 'tp', fig: 14, link: 'ivh',
    keys: ['Clot filling dilated frontal horns', 'Extends into 3rd ventricle', 'Measure VI/AHW/TOD and start PHVD chart'] },
  { cat: 'Haemorrhage', title: 'IVH grade III – US and MRI', img: 'fi-fig07-ivh-grade3', src: 'fi', fig: 7, link: 'ivh',
    keys: ['Haemorrhage > 50% of ventricle', 'MRI confirmation shown alongside'] },
  { cat: 'Haemorrhage', title: 'Periventricular haemorrhagic infarction (Papile IV)', img: 'tp-fig15-pvhi', src: 'tp', fig: 15, link: 'phi',
    keys: ['Fan-shaped periventricular echodensity, usually unilateral', 'Venous infarction – not simple extension of IVH', 'Evolves to a single porencephalic cyst'] },
  { cat: 'Haemorrhage', title: 'GMH evolution → subependymal cyst', img: 'fi-fig08-gmh-evolution', src: 'fi', fig: 8, link: 'ivh',
    keys: ['Clot liquefies, then forms a germinolytic cyst', 'Cyst at caudothalamic notch – a residual, not PVL'] },
  { cat: 'Haemorrhage', title: 'Cerebellar haemorrhage (mastoid view)', img: 'tp-fig16-cerebellar-haem', src: 'tp', fig: 16, link: 'cbh',
    keys: ['Often invisible through the anterior fontanelle', 'Mastoid view shows the lesion', 'MRI confirmation'] },
  { cat: 'Haemorrhage', title: 'Thalamic haemorrhage (term)', img: 'fi-fig13-thalamic-haem', src: 'fi', fig: 13, link: 'echo',
    keys: ['Unilateral thalamic echogenic area', 'Consider sinovenous thrombosis', 'MRI to confirm'] },
  { cat: 'Haemorrhage', title: 'IVH grade III – coronal and parasagittal', img: 'lc-ivh-grade3', src: 'lc', fig: 0, link: 'ivh',
    keys: ['IVH > 50% of ventricular area on parasagittal view', 'Dilated ventricles'] },
  { cat: 'Haemorrhage', title: 'GMH-IVH grading I–III (eurUS.brain)', img: 'eu-par-f3-gmh-grading', src: 'pa', fig: 3, link: 'ivh',
    keys: ['Arrowheads: germinal matrix haemorrhage', 'Arrows: clot in the ventricle', 'Asterisk: choroid plexus'] },
  { cat: 'Haemorrhage', title: 'Indirect signs of IVH', img: 'eu-par-f4-indirect-ivh', src: 'pa', fig: 4, link: 'ivh',
    keys: ['Clot extending into midline cavities (cavum vergae)', 'Look beyond the lateral ventricles'] },
  { cat: 'Haemorrhage', title: 'Types of venous (haemorrhagic) infarction', img: 'eu-par-f6-venous-infarction', src: 'pa', fig: 6, link: 'phi',
    keys: ['Thalamostriate, anterior terminal, inferior ventricular and medial subependymal vein territories', 'Compare with a developmental venous anomaly'] },
  { cat: 'Haemorrhage', title: 'Venous infarction → porencephaly', img: 'eu-par-f7-porencephaly', src: 'pa', fig: 7, link: 'phi',
    keys: ['Acute echodensity evolves into a porencephalic cavity', 'MRI at term-equivalent age'] },
  { cat: 'Haemorrhage', title: 'PHVD – measuring dilated ventricles', img: 'eu-par-f8-phvd', src: 'pa', fig: 8, link: 'vent',
    keys: ['Ventricular index (Levene), roof-to-floor index, thalamo-occipital distance', 'Third ventricle and aqueduct in severe dilatation'] },
  { cat: 'Haemorrhage', title: 'Cerebellar haemorrhage – different sizes', img: 'eu-fum-f4-cbh-sizes', src: 'fu', fig: 4, link: 'cbh',
    keys: ['Mastoid view shows the lesion; confirmed on MRI', 'Punctate to large haemorrhages'] },
  // White matter / HIE / stroke
  { cat: 'White matter & HIE', title: 'White matter: normal vs mild injury', img: 'eu-agu-f2-mild', src: 'ag', fig: 2, link: 'wmi',
    keys: ['Normal: optic radiations visible, normal subcentral echogenicity', 'Mild: homogeneous flaring, optic radiations obscured'] },
  { cat: 'White matter & HIE', title: 'White matter: moderate injury', img: 'eu-agu-f3-moderate', src: 'ag', fig: 3, link: 'wmi',
    keys: ['Persistent, patchy echogenicity', 'Small localised cysts; MRI correlation'] },
  { cat: 'White matter & HIE', title: 'White matter: severe injury (cystic PVL)', img: 'eu-agu-f4-severe', src: 'ag', fig: 4, link: 'wmi',
    keys: ['Extensive bilateral fronto-parietal and occipital cysts', 'Ventricular enlargement from white matter loss'] },
  { cat: 'White matter & HIE', title: 'HIE: thalami over the first days', img: 'eu-dud-f1-hie-thalami', src: 'du', fig: 1, link: 'echo',
    keys: ['Day 1: subtle thalamic brightness in coronal plane only', 'Day 3: clearly bright thalami, separated from basal ganglia by the internal capsule'] },
  { cat: 'White matter & HIE', title: 'HIE ultrasound scoring examples', img: 'eu-ann-f1-hie-score', src: 'an', fig: 1, link: 'echo',
    keys: ['Oedema, periventricular and subcortical white matter, thalamus, putamen', 'Moderate (1 point) vs severe (2 points) examples'] },
  { cat: 'White matter & HIE', title: 'Arterial ischaemic stroke', img: 'eu-dud-f2-stroke', src: 'du', fig: 2, link: 'infarct',
    keys: ['Top: left MCA stroke (US and MRI)', 'Bottom: posterior cerebral artery stroke after herniation'] },
  { cat: 'White matter & HIE', title: 'Pathological periventricular echogenicity', img: 'lc-pathological-pve', src: 'lc', fig: 0, link: 'wmi',
    keys: ['Brighter than choroid, patchy, less symmetrical', 'Indicates white matter injury'] },
  { cat: 'White matter & HIE', title: 'PVL case – day 1', img: 'lc-pvl-day1', src: 'lc', fig: 0, link: 'wmi',
    keys: ['Early periventricular echogenicity', 'Follow up for cystic change'] },
  { cat: 'White matter & HIE', title: 'Term HIE – coronal and parasagittal', img: 'lc-term-hie', src: 'lc', fig: 0, link: 'echo',
    keys: ['Diffuse echogenicity, poor grey–white differentiation', 'Check RI at 24–72 h (< 0.55 = poor prognosis)'] },
  { cat: 'White matter & HIE', title: 'Periventricular echogenicity → cystic PVL', img: 'tp-fig18-pvl', src: 'tp', fig: 18, link: 'wmi',
    keys: ['Day 7: increased periventricular echogenicity', '3 weeks later: multiple small cysts in the same area', 'de Vries grade III if extensive'] },
  { cat: 'White matter & HIE', title: 'PVL – early and late phases', img: 'fi-fig09-pvl-evolution', src: 'fi', fig: 9, link: 'wmi',
    keys: ['Early: hyperechoic peritrigonal white matter', 'Late: cystic change', 'Compare brightness with choroid plexus'] },
  { cat: 'White matter & HIE', title: 'Term HIE – periventricular echogenicity', img: 'fi-fig12-hie-periventricular', src: 'fi', fig: 12, link: 'echo',
    keys: ['Fuzzy periventricular hyperechogenic areas', 'MRI shows the full injury pattern'] },
  { cat: 'White matter & HIE', title: 'Term HIE – basal ganglia/thalami', img: 'tp-fig20-hie-basal-ganglia', src: 'tp', fig: 20, link: 'echo',
    keys: ['Bright basal ganglia/thalami in a term baby', 'Ventrolateral thalami brighter than medial = poor prognosis', 'Slit ventricles from oedema; DWI MRI confirms'] },
  { cat: 'White matter & HIE', title: 'Term asphyxia – cortical injury', img: 'tp-fig19-term-asphyxia-cortex', src: 'tp', fig: 19, link: 'echo',
    keys: ['Bright, swollen cortex and subcortical white matter', 'Linear probe shows loss of grey–white differentiation'] },
  { cat: 'White matter & HIE', title: 'Arterial ischaemic stroke (MCA)', img: 'tp-fig21-mca-stroke', src: 'tp', fig: 21, link: 'infarct',
    keys: ['Swollen perisylvian cortex with loss of grey–white differentiation', 'Mild mass effect', 'CUS can be normal early – MRI/DWI if suspected'] },
  // Cysts & variants
  { cat: 'Normal variants & cysts', title: 'Cavum septum pellucidum & cavum vergae', img: 'tp-fig10-csp-cv', src: 'tp', fig: 10, link: 'anat', variant: true,
    keys: ['CSP: between frontal horns, in front of foramen of Monro', 'Cavum vergae: behind it, between ventricular bodies', 'Closes back-to-front; CSP may persist months after birth – normal'] },
  { cat: 'Normal variants & cysts', title: 'Cavum septum pellucidum', img: 'fi-fig01-csp', src: 'fi', fig: 1, link: 'anat', variant: true,
    keys: ['Do not confuse with the 3rd ventricle'] },
  { cat: 'Normal variants & cysts', title: 'Cavum veli interpositi', img: 'fi-fig02-cavum-veli-interpositi', src: 'fi', fig: 2, link: 'anat', variant: true,
    keys: ['Midline cyst above and behind the thalami', 'Normal variant'] },
  { cat: 'Normal variants & cysts', title: 'Mega cisterna magna', img: 'tp-fig11-mega-cisterna', src: 'tp', fig: 11, link: 'cbh', variant: true,
    keys: ['Cisterna magna > 8–10 mm', 'Normal vermis, normal-size posterior fossa, no mass effect', 'Dandy–Walker: enlarged posterior fossa, cyst communicating with 4th ventricle, vermian hypoplasia'] },
  { cat: 'Normal variants & cysts', title: 'Mega cisterna magna (sagittal)', img: 'fi-fig03-mega-cisterna', src: 'fi', fig: 3, link: 'cbh', variant: true,
    keys: ['Anechoic posterior fossa space below the vermis'] },
  { cat: 'Normal variants & cysts', title: 'Lateral ventricle asymmetry', img: 'tp-fig08-ventricle-asymmetry', src: 'tp', fig: 8, link: 'vent', variant: true,
    keys: ['Seen in up to two-thirds of normal neonates', 'Usually left > right, or occipital > frontal horn', 'Dependent side looks smaller if the head is turned'] },
  { cat: 'Normal variants & cysts', title: 'Connatal (coarctation) cysts', img: 'tp-fig09-connatal-cysts', src: 'tp', fig: 9, link: 'cysts', variant: true,
    keys: ['At the outer angle of the frontal horns, in front of the foramen of Monro', 'GMH/germinolytic cysts lie behind the foramen of Monro; PVL cysts lie above the ventricles', 'Normal variant – no follow-up needed'] },
  { cat: 'Normal variants & cysts', title: 'Connatal cysts – "string of pearls"', img: 'fi-fig05-connatal-cysts', src: 'fi', fig: 5, link: 'cysts', variant: true,
    keys: ['Multiple rounded cysts along frontal horns', 'String-of-pearls on sagittal'] },
  { cat: 'Normal variants & cysts', title: 'Choroid plexus cysts', img: 'tp-fig12-choroid-cyst', src: 'tp', fig: 12, link: 'cysts', variant: true,
    keys: ['Small anechoic cyst in the choroid glomus (< 1 cm)', 'Single and isolated: incidental', 'Multiple, bilateral or > 1 cm: look for other anomalies'] },
  { cat: 'Normal variants & cysts', title: 'Choroid plexus cyst & split choroid', img: 'fi-fig04-choroid-cyst', src: 'fi', fig: 4, link: 'cysts', variant: true,
    keys: ['Well-defined cyst in choroid', 'Split choroid (central cleft) is a normal variant', 'Colour Doppler: choroid has flow, clot does not'] },
  { cat: 'Normal variants & cysts', title: 'Connatal cysts – coronal', img: 'cg-connatal-cor', src: 'cg', fig: 0, link: 'cysts', variant: true,
    keys: ['Rounded cysts at the superolateral margins of the frontal horns', 'Normal variant'] },
  { cat: 'Normal variants & cysts', title: 'Choroid plexus cyst – coronal', img: 'cg-choroid-cyst-cor', src: 'cg', fig: 0, link: 'cysts', variant: true,
    keys: ['Small anechoic cyst within the choroid', 'Usually incidental if single and < 1 cm'] },
  { cat: 'Normal variants & cysts', title: 'Choroid plexus cyst – parasagittal', img: 'cg-choroid-cyst-sag', src: 'cg', fig: 0, link: 'cysts', variant: true,
    keys: ['Cyst in the choroid near the caudothalamic groove (arrow)'] },
  { cat: 'Haemorrhage', title: 'Dilated ventricles with VI and AHW measured', img: 'cg-vi-ahw-dilated', src: 'cg', fig: 0, link: 'vent',
    keys: ['Rounded, ballooned frontal horns', 'On-screen VI 14.9 / 15.1 mm, AHW 10.6 / 11.1 mm', 'Plot on PHVD chart; senior review'] },
  { cat: 'Normal variants & cysts', title: 'Arachnoid cyst', img: 'tp-fig28-arachnoid-cyst', src: 'tp', fig: 28, link: 'cysts',
    keys: ['Large extra-axial cyst (middle cranial fossa)', 'Mild mass effect'] },
  { cat: 'Normal variants & cysts', title: 'Where is the cyst? (position guide)', img: 'lc-cyst-locations', src: 'lc', fig: 0, link: 'cysts',
    keys: ['1+2 germinolytic/subependymal: at or below upper ventricular border', '3 cystic PVL: above it, in white matter', '4 porencephalic: large, any level'] },
  { cat: 'Normal variants & cysts', title: 'Normal preterm: bright basal ganglia, bulky choroid', img: 'lc-bg-choroid-preterm', src: 'lc', fig: 0, link: 'anat', variant: true,
    keys: ['Basal ganglia can be subtly hyperechoic until TEA', 'Bulky choroid plexus is normal in preterms'] },
  // Congenital / extra-axial
  { cat: 'Congenital & extra-axial', title: 'Holoprosencephaly', img: 'tp-fig29-holoprosencephaly', src: 'tp', fig: 29, link: 'cong',
    keys: ['Fused hemispheres and thalami, single ventricle', 'Septum pellucidum absent in all types', 'Alobar: no falx or interhemispheric fissure'] },
  { cat: 'Congenital & extra-axial', title: 'Enlarged extra-axial spaces (benign)', img: 'fi-fig15-benign-extra-axial', src: 'fi', fig: 15, link: 'extra',
    keys: ['Symmetric frontal/parietal subarachnoid fluid, normal brain', 'Macrocephaly in a well infant, often familial', 'Doppler: bridging veins cross the fluid (subdural collection pushes them against the cortex)'] }
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
  'Sodhi KS (ed). Neonatal Ultrasound. Springer Nature Singapore 2025 – Ch 1 Laya BF et al. Cranial ultrasound: technique, anatomy and variants; Ch 2 Sherwani P et al. Cranial ultrasound: applications.',
  'Caro-Domínguez P, Lecacheux C, Hernandez-Herrera C, Llorens-Salvador R. Cranial ultrasound for beginners. Transl Pediatr 2021;10(4):1117-37.',
  'Fichera G, et al. Neonatal cerebral ultrasound: anatomical variants and age-related diseases. J Ultrasound 2024;27:993-1002.',
  'James AC. Practical guide to neonatal cranial ultrasound (CrUS): basics. Paediatr Child Health 2018.',
  'El-Dib M, Limbrick DD, Inder T, et al. Management of post-hemorrhagic ventricular dilatation in the infant born preterm. J Pediatr 2020;226:16-27.',
  'Papile LA, et al. Incidence and evolution of subependymal and intraventricular hemorrhage. J Pediatr 1978;92:529-34.',
  'Volpe JJ. Intracranial hemorrhage: germinal matrix–intraventricular hemorrhage of the premature infant. Neurology of the Newborn.',
  'de Vries LS, Eken P, Dubowitz LM. The spectrum of leukomalacia using cranial ultrasound. Behav Brain Res 1992;49:1-6.',
  'Boswinkel V, et al. The CHOPIn study: cerebellar haemorrhage classification. Neonatology 2019.',
  'Levene MI. Measurement of the growth of the lateral ventricles in preterm infants with real-time ultrasound. Arch Dis Child 1981;56:900-4.',
  'Hospital Miri NICU – Neonatal Cranial Ultrasound Protocol.'
];


/* ---------- Step-by-step learning path ----------------------------------- */
const LEARN = [
  { title: 'Prepare the baby and the machine', goal: 'Set up for a safe, quick, good-quality scan.',
    imgs: [['tp-fig01-coronal-normal', 'tp', 1, 'Target: a symmetrical, well-exposed coronal set']],
    points: ["Scan at the cot side, supine, with warmed gel and the lightest possible probe pressure.",
      "Preterm / small babies: 7–10 MHz sector or curved probe. Term babies or a small fontanelle: drop to ~5 MHz for penetration.",
      "High-frequency linear probe (≥ 7.5 MHz) for near-field detail: cortex, extra-axial spaces, superior sagittal sinus.",
      "Most GMH appears in the first week, so screen early (≤ 72 h), repeat around day 7–10, and again at 4–6 weeks."],
    ref: "Ch 1 \u00a71.2\u20131.3; Ch 2 \u00a72.4.1.1",
    check: ['Which probe gives the best view of the cortex and extra-axial space?', 'A high-frequency linear probe (7–12 MHz+).'] },
  { title: 'Optimise depth', goal: 'Fill the screen with brain, from vertex to skull base.',
    imgs: [['eu-fum-f1-freq-focus', 'fu', 1, 'Adjusting frequency and focus to see the posterior fossa from the anterior fontanelle'], ['lc-depth', 'lc', 0, 'Too shallow → appropriate → too deep']],
    points: ["Higher frequency = better resolution but less penetration; choose depth and frequency together.",
      "Set depth so the skull base and posterior fossa are just in view.",
      "Too deep shrinks the brain and wastes pixels; too shallow cuts off the posterior fossa."],
    ref: "Ch 1 \u00a71.2.1",
    check: ['What structure should just be included at the bottom of the image?', 'The skull base / posterior fossa.'] },
  { title: 'Gain and time-gain compensation (TGC)', goal: 'Make the parenchyma an even mid-grey from top to bottom.',
    imgs: [['eu-dud-f3-settings', 'du', 3, 'Top: increasing gain · middle: decreasing dynamic range · bottom: correcting TGC and sector width'], ['lc-gain-tgc', 'lc', 0, 'Effect of overall gain and TGC settings']],
    points: ["Aim for mid-grey parenchyma and black CSF across the whole image.",
      "Use TGC to tame the bright near field and lift the far field.",
      "Over-gain can hide haemorrhage and create false periventricular echogenicity; under-gain hides subtle lesions."],
    ref: "Ch 1 \u00a71.3.1",
    check: ['Why is over-gain dangerous?', 'It can mask haemorrhage and create false periventricular echogenicity.'] },
  { title: 'Coronal sweep C1 → C6', goal: 'Recognise each coronal level and its landmarks.',
    imgs: [['eu-dud-f4-coronal', 'du', 4, 'Standard coronal sections, anterior → posterior, with the planes shown on the scheme'], ['lc-coronal-c2', 'lc', 0, 'Planes C1–C6 and labelled C2 (frontal horns)'], ['lc-coronal-c4', 'lc', 0, 'Labelled C4 (thalami / posterior fossa)'], ['tp-fig01-coronal-normal', 'tp', 1, 'Full normal set C1–C6']],
    points: ["Convention: baby’s right on screen left. Sweep front to back, keeping both hemispheres symmetrical.",
      "C1 frontal lobes · C2 frontal horns · C3 foramen of Monro (CSP, caudate, Sylvian fissures) – measure VI and AHW here.",
      "C4 posterior 3rd ventricle/thalami: the \"three-dot sign\" = choroid in both ventricular floors and 3rd ventricle roof; then quadrigeminal cistern and cerebellum.",
      "C5 trigones with choroid glomus · C6 parieto-occipital lobes. (Some texts use 7 stations by splitting the C4 level.)",
      "Symmetry is the goal, but a symmetrical image does not exclude pathology."],
    ref: "Ch 1 \u00a71.3.1.1, Figs 1.2\u20131.9",
    check: ['At which coronal level do you measure the ventricular index?', 'At the foramen of Monro (C3).'] },
  { title: 'Sagittal sweep S1 → S5', goal: 'Midline, then each lateral ventricle and insula.',
    imgs: [['eu-dud-f5-sagittal', 'du', 5, 'Midline, lateral ventricle and insula sections'], ['lc-sagittal-s1', 'lc', 0, 'Sagittal planes and midline S1'], ['tp-fig02-sagittal-normal', 'tp', 2, 'Midline, parasagittal (CTG), insula']],
    points: ["Rotate 90°, anterior on screen left; label right and left clearly.",
      "Midline: corpus callosum, CSP, 3rd and 4th ventricles, aqueduct, vermis.",
      "Parasagittal through the caudothalamic junction: the thin bright line where caudate meets thalamus – GMH arises just in front of it. Caudate is slightly brighter than thalamus.",
      "Next laterally: atrium with choroid glomus (measure TOD here), then insula, then fronto-temporo-parietal lobes with the Sylvian fissure."],
    ref: "Ch 1 \u00a71.3.1.1, Figs 1.10\u20131.15",
    check: ['Where does germinal matrix haemorrhage usually arise?', 'At the caudothalamic groove, seen best on parasagittal view.'] },
  { title: 'Supplementary windows', goal: 'Know when to add mastoid, posterior and temporal windows.',
    imgs: [['eu-fum-f2-mastoid-views', 'fu', 2, 'Mastoid probe position and normal posterior fossa views'], ['eu-dud-f6-posterior-fontanelle', 'du', 6, 'Posterior fontanelle views at 24 weeks'], ['tp-fig03-mastoid-normal', 'tp', 3, 'Mastoid fontanelle – posterior fossa'], ['lc-temporal-doppler', 'lc', 0, 'Temporal window with colour Doppler (circle of Willis)'], ['lc-temporal-bw', 'lc', 0, 'Temporal window – B-mode']],
    points: ["Mastoid fontanelle (behind the ear): cerebellum, vermis, 4th ventricle, cisterna magna, transverse/sigmoid sinuses – best window for cerebellar haemorrhage.",
      "Posterior fontanelle: occipital horns and posterior white matter – clot in the occipital horn, posterior PVL.",
      "Temporal window (in front of the tragus): thalami, midbrain, circle of Willis; best Doppler angle for the MCA.",
      "Linear probe on the anterior fontanelle: extra-axial spaces and superior sagittal sinus (with colour Doppler)."],
    ref: "Ch 1 \u00a71.3.1.2, Figs 1.17\u20131.20",
    check: ['Which window should be used to look for cerebellar haemorrhage?', 'The mastoid fontanelle.'] },
  { title: 'Quality rules', goal: 'Avoid false positives.',
    imgs: [['lc-two-planes', 'lc', 0, 'Confirm in coronal (a) and sagittal (b)']],
    points: ["Symmetric, centred images; save cine loops for anything doubtful.",
      "Confirm every finding in two planes or a second window – one-plane findings are often artefact.",
      "Classic pseudolesions: tangential sulcus (bright patch, coronal), peritrigonal halo (fades on posterior fontanelle view), thalamic pseudolesion (posterior fontanelle view), calcar avis (mimics occipital horn clot).",
      "Bulky, lobulated or split choroid can mimic clot – colour Doppler shows flow in choroid, none in clot."],
    ref: "Ch 1 \u00a71.3.1.1, \u00a71.5.3\u20131.5.4, Figs 1.44\u20131.50",
    check: ['A bright focus is seen only in the coronal plane. What is it most likely to be?', 'An artefact – confirm in a second plane before reporting.'] },
  { title: 'Normal maturation', goal: 'Don’t call normal preterm findings abnormal.',
    imgs: [['lc-term-vs-preterm', 'lc', 0, 'Term (a) vs preterm (b)'], ['lc-bg-choroid-preterm', 'lc', 0, 'Subtly bright basal ganglia; bulky choroid in preterm'], ['tp-fig04-sulcation', 'tp', 4, 'Sulcation preterm vs term']],
    points: ["Very preterm cortex is smooth; sulci appear from ~26 wk, cingulate sulcus by ~28 wk, secondary sulci ~31–33 wk; term = complex branching sulci.",
      "Basal ganglia and thalami are normally brighter than white matter before ~32 wk.",
      "Ventricles are larger in preterms; slit-like ventricles are normal in most term babies (and can reopen over 1–3 days).",
      "Mild asymmetry (usually left > right) is seen in up to two-thirds of normal neonates.",
      "Bulky choroid and a symmetric peritrigonal \"blush\" are normal preterm findings."],
    ref: "Ch 1 \u00a71.4.1\u20131.4.3, \u00a71.5.1, Figs 1.26\u20131.34",
    check: ['Is a bulky choroid plexus in a 28-week infant abnormal?', 'No – it is a normal preterm finding.'] },
  { title: 'Measure the ventricles', goal: 'VI, AHW and TOD every time ventricles look big or IVH is present.',
    imgs: [['eu-par-f8-phvd', 'pa', 8, 'Ventricular index (Levene), roof-to-floor index and TOD on dilated ventricles'], ['lc-vi-measure', 'lc', 0, 'VI: midline (falx) → lateral wall of ventricle'], ['cg-vi-ahw-dilated', 'cg', 0, 'Measured on screen: VI 14.9/15.1 mm, AHW 10.6/11.1 mm – dilated ventricles'], ['lc-vi-ahw-tod', 'lc', 0, 'Coronal – VI, AHW; parasagittal – TOD']],
    points: ["VI (Levene): coronal at foramen of Monro, falx → lateral wall of lateral ventricle, each side; plot against PMA.",
      "AHW: same plane, diagonal width of frontal horn (normal ~1–3 mm; 6–10 mm moderate, > 10 mm severe).",
      "TOD: parasagittal, back of thalamus → tip of occipital horn (normal ~15–20 mm). Occipital horns dilate first.",
      "Serial measurements on the PHVD chart matter more than any single value; ballooned (rounded) horns favour raised pressure, irregular outline favours atrophy."],
    ref: "Ch 1 \u00a71.4.3, Fig 1.35; Ch 2 \u00a72.3.1, Fig 2.1",
    check: ['What AHW suggests ventricular dilatation?', '> 6 mm (≥ 10 mm = high-risk zone).'], link: 'vent' },
  { title: 'Doppler – resistive index', goal: 'Add haemodynamics when the picture is unclear.',
    imgs: [['lc-doppler-waveform', 'lc', 0, 'ACA spectral Doppler waveform']],
    points: ["RI = (peak systolic − end-diastolic velocity) ÷ peak systolic velocity; insonate the same vessel each time.",
      "Normal ≈ 0.65–0.85 (large cerebral arteries mostly 0.71–0.80); RI does not change much with GA.",
      "Probe pressure on the fontanelle raises RI (~5%) – press lightly.",
      "↑ RI: raised pressure, e.g. progressive PHVD (serial RI can guide intervention). ↓ RI < 0.55 at 24–72 h in HIE: poor prognosis.",
      "RI is also affected by CO₂, PDA, anaemia, ventilation and arousal – interpret in context."],
    ref: "Ch 1 \u00a71.3.2, Figs 1.21\u20131.24; Ch 2 \u00a72.3.1",
    check: ['A cooled term baby has RI 0.48 at 48 h. Significance?', 'Low RI (< 0.55) – associated with death or major disability.'], link: 'dop' },
  { title: 'White matter echogenicity (PVE)', goal: 'Separate physiological flare from white matter injury.',
    imgs: [['eu-agu-f2-mild', 'ag', 2, 'Normal periventricular echogenicity vs mild white matter injury (labelled)'], ['eu-agu-f3-moderate', 'ag', 3, 'Moderate injury – persistent patchy echogenicity, small cysts'], ['eu-agu-f4-severe', 'ag', 4, 'Severe injury – extensive cystic PVL'], ['lc-pathological-pve', 'lc', 0, 'Pathological PVE – patchy, bright'], ['lc-pvl-day1', 'lc', 0, 'PVL case – day 1'], ['tp-fig18-pvl', 'tp', 18, 'Echogenicity → cystic PVL 3 weeks later']],
    table: [['Physiological PVE', 'Pathological PVE'], ['Echogenicity < choroid plexus', 'Echogenicity ≥ choroid plexus'], ['Homogeneous', 'Inhomogeneous'], ['Symmetrical (shape, location)', 'Less symmetrical'], ['Linear', 'Patchy'], ['Well defined', 'Less defined'], ['Short duration, before TEA', '≥ 7 days and/or ≥ TEA']],
    points: ["Physiological blush: symmetric, homogeneous, less bright than choroid, fades on posterior fontanelle view.",
      "Pathological PVE: as bright or brighter than choroid, patchy, asymmetric, inhomogeneous – indicates white matter injury.",
      "Duration matters: echogenicity persisting ≥ 7 days = PVL grade I; scan serially for cysts, which appear at 2–6 weeks.",
      "In very small preterms the choroid itself is bulky and bright, so the comparison is harder – rely on serial scans.",
      "Late signs: ventriculomegaly with wavy (undulating) ventricular margins from white matter loss."],
    ref: "Ch 1 \u00a71.5.3.3; Ch 2 \u00a72.4.1.3, Figs 2.8\u20132.9",
    check: ['Periventricular echogenicity is brighter than choroid and patchy on day 10. Grade?', 'Pathological – de Vries grade I PVL (≥ 7 days); watch for cysts.'], link: 'wmi' },
  { title: 'Haemorrhage and grading', goal: 'Grade GMH-IVH and recognise PVHI.',
    imgs: [['eu-par-f3-gmh-grading', 'pa', 3, 'Ultrasound grading I–III (arrowheads: GMH; arrows: clot; asterisk: choroid)'], ['tp-fig13-gmh', 'tp', 13, 'Grade I – germinal matrix only'], ['fi-fig06-gmh-grade1-2', 'fi', 6, 'Grade I (left) and II (right)'], ['lc-ivh-grade3', 'lc', 0, 'Grade III – IVH > 50% of ventricle on parasagittal view'], ['tp-fig15-pvhi', 'tp', 15, 'PVHI (Papile IV)']],
    points: ["Grade I: echogenic focus at the caudothalamic groove, brighter than choroid. Choroid never extends into frontal or occipital horns – brightness there is blood.",
      "Grade II: blood in the ventricle without dilatation. Grade III: blood > 50% of the ventricle with dilatation.",
      "PVHI (grade IV): fan-shaped periventricular echodensity, usually unilateral, from venous infarction – not simple extension of IVH. Evolves to a single porencephalic cyst.",
      "Grades do not have to progress in order; follow all grades, especially III/IV, for PHVD.",
      "Late markers of old IVH: germinolytic cyst, echogenic ventricular walls, enlarged asymmetric choroid."],
    ref: "Ch 2 \u00a72.4.1.1\u20132.4.1.2, Table 2.2, Figs 2.4\u20132.7",
    check: ['IVH fills > 50% of the ventricle on parasagittal view. Grade?', 'Grade III.'], link: 'ivh' },
  { title: 'Cysts – where is it?', goal: 'Use cyst position to tell benign from pathological.',
    imgs: [['lc-cyst-locations', 'lc', 0, 'Cyst position relative to the upper lateral ventricle'], ['eu-agu-f5-differential', 'ag', 5, 'Differential: germinolysis, porencephaly, perforator stroke vs cystic PVL'], ['cg-connatal-cor', 'cg', 0, 'Connatal cysts beside the frontal horns (coronal)'], ['cg-choroid-cyst-sag', 'cg', 0, 'Choroid plexus cyst (arrow), parasagittal'], ['tp-fig09-connatal-cysts', 'tp', 9, 'Connatal cysts (normal variant)'], ['fi-fig08-gmh-evolution', 'fi', 8, 'GMH → subependymal cyst']],
    points: ["Connatal cysts: at the outer angle of the frontal horns, in front of the foramen of Monro – normal variant.",
      "Germinolytic / subependymal cysts: at the caudothalamic notch, behind the foramen of Monro – often after GMH.",
      "Cystic PVL: multiple small cysts above and lateral to the ventricles, mostly posterior.",
      "Porencephalic cyst: single, large, asymmetric, communicates with the ventricle (after PVHI).",
      "Choroid plexus cysts < 1 cm, single, in a well baby are incidental; multiple, bilateral or > 1 cm → look for other anomalies."],
    ref: "Ch 1 \u00a71.5.1.1, \u00a71.5.4.4, Figs 1.38, 1.51; Ch 2 \u00a72.4.1.2",
    check: ['Small cysts lie above the upper border of the lateral ventricle in the white matter. Most likely?', 'Cystic PVL.'], link: 'cysts' },
  { title: 'Term infant with HIE', goal: 'Recognise early CUS signs and use RI.',
    imgs: [['eu-dud-f1-hie-thalami', 'du', 1, 'HIE: subtle thalamic brightness on admission, clearly abnormal 3 days later'], ['eu-ann-f1-hie-score', 'an', 1, 'HIE ultrasound score examples (oedema, white matter, thalamus, putamen)'], ['lc-term-hie', 'lc', 0, 'Term HIE – coronal and parasagittal'], ['tp-fig20-hie-basal-ganglia', 'tp', 20, 'Bright basal ganglia, slit ventricles']],
    points: ["Mild–moderate HIE: watershed (peripheral) pattern – bright subcortical white matter, accentuated or lost grey–white distinction.",
      "Severe HIE: central pattern – bright basal ganglia and thalami; ventrolateral thalami brighter than medial is a poor sign.",
      "Oedema: effaced sulci and slit ventricles. Reversal of grey–white echogenicity = very severe injury.",
      "Remember BG/thalami are normally bright before 32 wk – this sign applies to term babies.",
      "RI < 0.55 at 24–72 h predicts death or major disability (PPV ~60%, NPV ~78% after cooling); MRI remains the reference."],
    ref: "Ch 2 \u00a72.4.2, Fig 2.10",
    check: ['When should RI be checked in HIE?', 'At 24–72 hours of life.'], link: 'echo' },
  { title: 'Document the scan', goal: 'Every report covers the same essentials.',
    imgs: [],
    points: ["Day of life and PMA at scan; windows used and image quality.",
      "Midline: CSP and corpus callosum (absent CSP or parallel ventricles → consider callosal agenesis).",
      "GMH-IVH grade each side; PVHI; PVE/PVL changes.",
      "VI, AHW, TOD (plot serially); 3rd ventricle.",
      "Other findings: cysts (with location), calcification, LSV, extra-axial spaces; Doppler RI; trans-cerebellar diameter.",
      "Clear impression and follow-up plan."],
    ref: "Ch 1 \u00a71.4.4; Ch 2 \u00a72.9.1",
    check: null, link: 'start' }
];
