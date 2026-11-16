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
  lc: { short: '', url: '', licence: '', licUrl: '', note: '' }   // unit teaching images (CUS Overview lecture)
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
    keys: ['Echogenic focus at the caudothalamic groove', 'As bright as or brighter than choroid plexus', 'Confirm in coronal and parasagittal planes'] },
  { cat: 'Haemorrhage', title: 'GMH grade I (left) and grade II (right)', img: 'fi-fig06-gmh-grade1-2', src: 'fi', fig: 6, link: 'ivh',
    keys: ['Bilateral caudothalamic haemorrhage', 'Grade II: blood within the ventricle, no dilatation'] },
  { cat: 'Haemorrhage', title: 'IVH grade III with ventricular dilatation', img: 'tp-fig14-ivh-dilated', src: 'tp', fig: 14, link: 'ivh',
    keys: ['Clot filling dilated frontal horns', 'Extends into 3rd ventricle', 'Measure VI/AHW/TOD and start PHVD chart'] },
  { cat: 'Haemorrhage', title: 'IVH grade III – US and MRI', img: 'fi-fig07-ivh-grade3', src: 'fi', fig: 7, link: 'ivh',
    keys: ['Haemorrhage > 50% of ventricle', 'MRI confirmation shown alongside'] },
  { cat: 'Haemorrhage', title: 'Periventricular haemorrhagic infarction (Papile IV)', img: 'tp-fig15-pvhi', src: 'tp', fig: 15, link: 'phi',
    keys: ['Large fan-/globular-shaped echodensity in periventricular white matter', 'Usually unilateral, same side as IVH', 'Evolves to porencephalic cyst'] },
  { cat: 'Haemorrhage', title: 'GMH evolution → subependymal cyst', img: 'fi-fig08-gmh-evolution', src: 'fi', fig: 8, link: 'ivh',
    keys: ['Clot liquefies, then forms a germinolytic cyst', 'Cyst at caudothalamic notch – a residual, not PVL'] },
  { cat: 'Haemorrhage', title: 'Cerebellar haemorrhage (mastoid view)', img: 'tp-fig16-cerebellar-haem', src: 'tp', fig: 16, link: 'cbh',
    keys: ['Often invisible through the anterior fontanelle', 'Mastoid view shows the lesion', 'MRI confirmation'] },
  { cat: 'Haemorrhage', title: 'Thalamic haemorrhage (term)', img: 'fi-fig13-thalamic-haem', src: 'fi', fig: 13, link: 'echo',
    keys: ['Unilateral thalamic echogenic area', 'Consider sinovenous thrombosis', 'MRI to confirm'] },
  { cat: 'Haemorrhage', title: 'IVH grade III – coronal and parasagittal', img: 'lc-ivh-grade3', src: 'lc', fig: 0, link: 'ivh',
    keys: ['IVH > 50% of ventricular area on parasagittal view', 'Dilated ventricles'] },
  // White matter / HIE / stroke
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
    keys: ['Diffusely bright basal ganglia', 'Slit-like ventricles (oedema)', 'DWI MRI confirms'] },
  { cat: 'White matter & HIE', title: 'Term asphyxia – cortical injury', img: 'tp-fig19-term-asphyxia-cortex', src: 'tp', fig: 19, link: 'echo',
    keys: ['Bright, swollen cortex and subcortical white matter', 'Linear probe shows loss of grey–white differentiation'] },
  { cat: 'White matter & HIE', title: 'Arterial ischaemic stroke (MCA)', img: 'tp-fig21-mca-stroke', src: 'tp', fig: 21, link: 'infarct',
    keys: ['Swollen perisylvian cortex with loss of grey–white differentiation', 'Mild mass effect', 'CUS can be normal early – MRI/DWI if suspected'] },
  // Cysts & variants
  { cat: 'Normal variants & cysts', title: 'Cavum septum pellucidum & cavum vergae', img: 'tp-fig10-csp-cv', src: 'tp', fig: 10, link: 'anat', variant: true,
    keys: ['Midline fluid between frontal horns (CSP)', 'Posterior extension = cavum vergae', 'Normal, especially in preterms'] },
  { cat: 'Normal variants & cysts', title: 'Cavum septum pellucidum', img: 'fi-fig01-csp', src: 'fi', fig: 1, link: 'anat', variant: true,
    keys: ['Do not confuse with the 3rd ventricle'] },
  { cat: 'Normal variants & cysts', title: 'Cavum veli interpositi', img: 'fi-fig02-cavum-veli-interpositi', src: 'fi', fig: 2, link: 'anat', variant: true,
    keys: ['Midline cyst above and behind the thalami', 'Normal variant'] },
  { cat: 'Normal variants & cysts', title: 'Mega cisterna magna', img: 'tp-fig11-mega-cisterna', src: 'tp', fig: 11, link: 'cbh', variant: true,
    keys: ['Large posterior fossa CSF space', 'Normal vermis, no mass effect', 'Differentiate from Dandy–Walker spectrum'] },
  { cat: 'Normal variants & cysts', title: 'Mega cisterna magna (sagittal)', img: 'fi-fig03-mega-cisterna', src: 'fi', fig: 3, link: 'cbh', variant: true,
    keys: ['Anechoic posterior fossa space below the vermis'] },
  { cat: 'Normal variants & cysts', title: 'Lateral ventricle asymmetry', img: 'tp-fig08-ventricle-asymmetry', src: 'tp', fig: 8, link: 'vent', variant: true,
    keys: ['Mild asymmetry (often left > right) is normal', 'Becomes symmetric on follow-up'] },
  { cat: 'Normal variants & cysts', title: 'Connatal (coarctation) cysts', img: 'tp-fig09-connatal-cysts', src: 'tp', fig: 9, link: 'cysts', variant: true,
    keys: ['Superolateral to frontal horns, at or anterior to foramen of Monro', 'Normal variant – compare locations of PVL and subependymal cysts (panel C)'] },
  { cat: 'Normal variants & cysts', title: 'Connatal cysts – "string of pearls"', img: 'fi-fig05-connatal-cysts', src: 'fi', fig: 5, link: 'cysts', variant: true,
    keys: ['Multiple rounded cysts along frontal horns', 'String-of-pearls on sagittal'] },
  { cat: 'Normal variants & cysts', title: 'Choroid plexus cysts', img: 'tp-fig12-choroid-cyst', src: 'tp', fig: 12, link: 'cysts', variant: true,
    keys: ['Small simple cysts within choroid', 'Usually incidental'] },
  { cat: 'Normal variants & cysts', title: 'Choroid plexus cyst & split choroid', img: 'fi-fig04-choroid-cyst', src: 'fi', fig: 4, link: 'cysts', variant: true,
    keys: ['Well-defined cyst in choroid', 'Central cleft (split choroid) is normal'] },
  { cat: 'Normal variants & cysts', title: 'Arachnoid cyst', img: 'tp-fig28-arachnoid-cyst', src: 'tp', fig: 28, link: 'cysts',
    keys: ['Large extra-axial cyst (middle cranial fossa)', 'Mild mass effect'] },
  { cat: 'Normal variants & cysts', title: 'Where is the cyst? (position guide)', img: 'lc-cyst-locations', src: 'lc', fig: 0, link: 'cysts',
    keys: ['1+2 germinolytic/subependymal: at or below upper ventricular border', '3 cystic PVL: above it, in white matter', '4 porencephalic: large, any level'] },
  { cat: 'Normal variants & cysts', title: 'Normal preterm: bright basal ganglia, bulky choroid', img: 'lc-bg-choroid-preterm', src: 'lc', fig: 0, link: 'anat', variant: true,
    keys: ['Basal ganglia can be subtly hyperechoic until TEA', 'Bulky choroid plexus is normal in preterms'] },
  // Congenital / extra-axial
  { cat: 'Congenital & extra-axial', title: 'Holoprosencephaly', img: 'tp-fig29-holoprosencephaly', src: 'tp', fig: 29, link: 'cong',
    keys: ['No separation of hemispheres and thalami', 'Single ventricle, absent septum pellucidum'] },
  { cat: 'Congenital & extra-axial', title: 'Enlarged extra-axial spaces (benign)', img: 'fi-fig15-benign-extra-axial', src: 'fi', fig: 15, link: 'extra',
    keys: ['Increased interhemispheric/subarachnoid space', 'Macrocephaly, otherwise well', 'Colour Doppler: vessels cross the space'] }
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
    points: ['Warm gel; scan when settled, ideally after cares/feeds; minimal handling in VLBW infants.',
      'Microconvex 5–8 MHz for standard views; linear 7–12 MHz for cortex and extra-axial spaces.',
      'Turn on harmonics/compounding; save cine loops.'],
    check: ['Which probe gives the best view of the cortex and extra-axial space?', 'A high-frequency linear probe (7–12 MHz+).'] },
  { title: 'Optimise depth', goal: 'Fill the screen with brain, from vertex to skull base.',
    imgs: [['lc-depth', 'lc', 0, 'Too shallow → appropriate → too deep']],
    points: ['Set depth to just include the skull base / posterior fossa.',
      'Too deep wastes resolution and makes the brain small; too shallow cuts off the posterior fossa.'],
    check: ['What structure should just be included at the bottom of the image?', 'The skull base / posterior fossa.'] },
  { title: 'Gain and time-gain compensation (TGC)', goal: 'Make the parenchyma an even mid-grey from top to bottom.',
    imgs: [['lc-gain-tgc', 'lc', 0, 'Effect of overall gain and TGC settings']],
    points: ['Overall gain: parenchyma mid-grey; CSF black.',
      'Over-gain hides haemorrhage and mimics periventricular echogenicity; under-gain hides subtle lesions.',
      'Use TGC to reduce near-field brightness and boost the far field.'],
    check: ['Why is over-gain dangerous?', 'It can mask haemorrhage and create false periventricular echogenicity.'] },
  { title: 'Coronal sweep C1 → C6', goal: 'Recognise each coronal level and its landmarks.',
    imgs: [['lc-coronal-c2', 'lc', 0, 'Planes C1–C6 and labelled C2 (frontal horns)'], ['lc-coronal-c4', 'lc', 0, 'Labelled C4 (thalami / posterior fossa)'], ['tp-fig01-coronal-normal', 'tp', 1, 'Full normal set C1–C6']],
    points: ['C1 frontal lobes · C2 frontal horns + CSP · C3 foramen of Monro / 3rd ventricle.',
      'C4 thalami, tentorium, cerebellum · C5 trigones with choroid glomus · C6 occipital lobes.',
      'Keep the interhemispheric fissure central and the image symmetrical.'],
    check: ['At which coronal level do you measure the ventricular index?', 'At the foramen of Monro (C3).'] },
  { title: 'Sagittal sweep S1 → S5', goal: 'Midline, then each lateral ventricle and insula.',
    imgs: [['lc-sagittal-s1', 'lc', 0, 'Sagittal planes and midline S1'], ['tp-fig02-sagittal-normal', 'tp', 2, 'Midline, parasagittal (CTG), insula']],
    points: ['Rotate 90°, marker to the nose – anterior on image left.',
      'S1 midline: corpus callosum, CSP, 3rd/4th ventricles, vermis, cisterna magna.',
      'S2/S3 right & left lateral ventricle: caudothalamic groove – the GMH site. S4/S5 insula.'],
    check: ['Where does germinal matrix haemorrhage usually arise?', 'At the caudothalamic groove, seen best on parasagittal view.'] },
  { title: 'Supplementary windows', goal: 'Know when to add mastoid, posterior and temporal windows.',
    imgs: [['tp-fig03-mastoid-normal', 'tp', 3, 'Mastoid fontanelle – posterior fossa'], ['lc-temporal-doppler', 'lc', 0, 'Temporal window with colour Doppler (circle of Willis)'], ['lc-temporal-bw', 'lc', 0, 'Temporal window – B-mode']],
    points: ['Mastoid fontanelle: cerebellum, 4th ventricle, cisterna magna – essential for cerebellar haemorrhage, especially < 32 wk.',
      'Posterior fontanelle: occipital horns (clot, occipital PVL).',
      'Temporal window: brainstem, circle of Willis, MCA Doppler.'],
    check: ['Which window should be used to look for cerebellar haemorrhage?', 'The mastoid fontanelle.'] },
  { title: 'Quality rules', goal: 'Avoid false positives.',
    imgs: [['lc-two-planes', 'lc', 0, 'Confirm in coronal (a) and sagittal (b)']],
    points: ['Obtain a symmetric and centred image.',
      'Any suspected abnormality must be seen in TWO planes or through a supplementary window.',
      'Seen in only one plane → likely artefact or anamorphosis.'],
    check: ['A bright focus is seen only in the coronal plane. What is it most likely to be?', 'An artefact – confirm in a second plane before reporting.'] },
  { title: 'Normal maturation', goal: 'Don’t call normal preterm findings abnormal.',
    imgs: [['lc-term-vs-preterm', 'lc', 0, 'Term (a) vs preterm (b)'], ['lc-bg-choroid-preterm', 'lc', 0, 'Subtly bright basal ganglia; bulky choroid in preterm'], ['tp-fig04-sulcation', 'tp', 4, 'Sulcation preterm vs term']],
    points: ['Preterm brain: fewer sulci, open Sylvian fissure, larger CSP and ventricles.',
      'Basal ganglia can be subtly hyperechoic until term-equivalent age (TEA).',
      'Bulky choroid plexus is normal in preterms; a periventricular "blush" may be physiological.'],
    check: ['Is a bulky choroid plexus in a 28-week infant abnormal?', 'No – it is a normal preterm finding.'] },
  { title: 'Measure the ventricles', goal: 'VI, AHW and TOD every time ventricles look big or IVH is present.',
    imgs: [['lc-vi-measure', 'lc', 0, 'VI: midline (falx) → lateral wall of ventricle'], ['lc-vi-ahw-tod', 'lc', 0, 'Coronal – VI, AHW; parasagittal – TOD']],
    points: ['VI: coronal at foramen of Monro, falx to lateral ventricular wall, each side.',
      'AHW: same plane, diagonal width of frontal horn. TOD: parasagittal, thalamus to occipital horn tip.',
      'Key numbers: VI > 97th centile · AHW > 6 mm · TOD > 25 mm → plot on PHVD chart.'],
    check: ['What AHW suggests ventricular dilatation?', '> 6 mm (≥ 10 mm = high-risk zone).'], link: 'vent' },
  { title: 'Doppler – resistive index', goal: 'Add haemodynamics when the picture is unclear.',
    imgs: [['lc-doppler-waveform', 'lc', 0, 'ACA spectral Doppler waveform']],
    points: ['RI = (peak systolic − end-diastolic velocity) ÷ peak systolic velocity.',
      'Normal ≈ 0.65–0.85.',
      '↑ RI: raised pressure (e.g. progressive PHVD). ↓ RI < 0.55: HIE – predictive of cerebral injury and abnormal outcome.'],
    check: ['A cooled term baby has RI 0.48 at 48 h. Significance?', 'Low RI (< 0.55) – associated with death or major disability.'], link: 'dop' },
  { title: 'White matter echogenicity (PVE)', goal: 'Separate physiological flare from white matter injury.',
    imgs: [['lc-pathological-pve', 'lc', 0, 'Pathological PVE – patchy, bright'], ['lc-pvl-day1', 'lc', 0, 'PVL case – day 1'], ['tp-fig18-pvl', 'tp', 18, 'Echogenicity → cystic PVL 3 weeks later']],
    table: [['Physiological PVE', 'Pathological PVE'], ['Echogenicity < choroid plexus', 'Echogenicity ≥ choroid plexus'], ['Homogeneous', 'Inhomogeneous'], ['Symmetrical (shape, location)', 'Less symmetrical'], ['Linear', 'Patchy'], ['Well defined', 'Less defined'], ['Short duration, before TEA', '≥ 7 days and/or ≥ TEA']],
    points: ['Pathological PVE indicates white matter injury – it is a finding, not a diagnosis.',
      'Persisting ≥ 7 days = PVL grade I; repeat scans for cysts at 2–6 weeks.'],
    check: ['Periventricular echogenicity is brighter than choroid and patchy on day 10. Grade?', 'Pathological – de Vries grade I PVL (≥ 7 days); watch for cysts.'], link: 'wmi' },
  { title: 'Haemorrhage and grading', goal: 'Grade GMH-IVH and recognise PVHI.',
    imgs: [['tp-fig13-gmh', 'tp', 13, 'Grade I – germinal matrix only'], ['fi-fig06-gmh-grade1-2', 'fi', 6, 'Grade I (left) and II (right)'], ['lc-ivh-grade3', 'lc', 0, 'Grade III – IVH > 50% of ventricle on parasagittal view'], ['tp-fig15-pvhi', 'tp', 15, 'PVHI (Papile IV)']],
    points: ['Grade I: germinal matrix only. Grade II: IVH without dilatation.',
      'Grade III: IVH > 50% of ventricular area on parasagittal view, with dilatation.',
      'PVHI: periventricular parenchymal echodensity (venous infarction) – usually unilateral.'],
    check: ['IVH fills > 50% of the ventricle on parasagittal view. Grade?', 'Grade III.'], link: 'ivh' },
  { title: 'Cysts – where is it?', goal: 'Use cyst position to tell benign from pathological.',
    imgs: [['lc-cyst-locations', 'lc', 0, 'Cyst position relative to the upper lateral ventricle'], ['tp-fig09-connatal-cysts', 'tp', 9, 'Connatal cysts (normal variant)'], ['fi-fig08-gmh-evolution', 'fi', 8, 'GMH → subependymal cyst']],
    points: ['1 + 2: germinolytic / subependymal pseudocysts – at or below the upper ventricular border.',
      '3: cystic PVL – mostly above this level, in periventricular white matter.',
      '4: porencephalic cysts (after venous infarct) – large, can be at any level.',
      'Benign periventricular cysts are common on routine scans.'],
    check: ['Small cysts lie above the upper border of the lateral ventricle in the white matter. Most likely?', 'Cystic PVL.'], link: 'cysts' },
  { title: 'Term infant with HIE', goal: 'Recognise early CUS signs and use RI.',
    imgs: [['lc-term-hie', 'lc', 0, 'Term HIE – coronal and parasagittal'], ['tp-fig20-hie-basal-ganglia', 'tp', 20, 'Bright basal ganglia, slit ventricles']],
    points: ['Look for diffuse echogenicity, loss of grey–white differentiation, bright basal ganglia/thalami, slit ventricles.',
      'CUS at 24–72 h: RI < 0.55 predicts mortality or major disability (PPV 60%, NPV 78% after cooling).',
      'MRI (day 5–7 / after rewarming) remains the reference.'],
    check: ['When should RI be checked in HIE?', 'At 24–72 hours of life.'], link: 'echo' },
  { title: 'Document the scan', goal: 'Every report covers the same essentials.',
    imgs: [],
    points: ['CUS day of life.', 'Midline structures – CSP, corpus callosum.', 'IVH and grade; PVL / PVE changes.',
      'Ventricular index, AHW, TOD.', 'Other abnormalities – PVE, calcification, cysts.', 'Doppler RI; trans-cerebellar diameter.'],
    check: null, link: 'start' }
];
