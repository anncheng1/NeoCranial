/* =========================================================================
   NeoCUS — application logic (vanilla JS, no dependencies, offline PWA)
   ========================================================================= */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS_CASE = 'neocus.case', LS_SET = 'neocus.settings', LS_SERIES = 'neocus.series';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const fmt1 = v => v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1);

function load(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }
function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

let settings = Object.assign({ hosp: 'Hospital Miri', dept: 'Department of Paediatrics & Neonatology', rep: '', des: '' }, load(LS_SET, {}));
let S = {};                // current case state
let I = {};                // current interpretation

/* ---------------- Build dynamic form parts ---------------- */
function buildForm() {
  $('#indList').innerHTML = INDICATIONS.map(([v, t]) =>
    `<label class="ck"><input type="checkbox" data-g="ind" value="${v}"> ${t}</label>`).join('');
  $('#corList').innerHTML = CORONAL_VIEWS.map(v =>
    `<label class="ck"><input type="checkbox" data-g="views" value="${v}"> ${v}</label>`).join('');
  $('#sagList').innerHTML = SAGITTAL_VIEWS.map(([v, t]) =>
    `<label class="ck"><input type="checkbox" data-g="views" value="${v}"> ${t}</label>`).join('');
  const hk = ['gs_vent', 'gs_gmhR', 'gs_gmhL', 'gs_wm', 'gs_cc', 'gs_bg', 'gs_pf', 'gs_ext', 'wz_meas', 'wz_other', 'wz_done',
    ...VIEW_STEPS.map(v => 'gv_' + v.id), ...EXTRA_VIEWS.map(v => 'gv_' + v.id), ...TECH_CHECK.map(t => t[0])];
  $('#hiddenKeys').innerHTML = hk.map(k => `<input type="hidden" data-k="${k}">`).join('');
  $('#anatList').innerHTML = ANATOMY.map(([k, t, opts]) =>
    `<label>${t}<select data-k="an_${k}">${opts.map((o, i) => `<option value="${i}">${o}</option>`).join('')}</select></label>`).join('');
}

/* ---------------- Serialise / restore ---------------- */
function readForm() {
  const o = {};
  $$('#form [data-k], #nmForm [data-k]').forEach(el => {
    o[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
  });
  $$('#form [data-g]').forEach(el => {
    const g = el.dataset.g; o[g] = o[g] || [];
    if (el.checked) o[g].push(el.value);
  });
  o.impression = S.impression || ''; o.recommendation = S.recommendation || '';
  o.impEdited = !!S.impEdited; o.recEdited = !!S.recEdited;
  return o;
}
function writeForm(o) {
  $$('#form [data-k], #nmForm [data-k]').forEach(el => {
    const v = o[el.dataset.k];
    if (el.type === 'checkbox') el.checked = !!v;
    else if (v !== undefined) el.value = v;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = el.defaultValue || '';
  });
  $$('#form [data-g]').forEach(el => {
    const arr = o[el.dataset.g];
    el.checked = Array.isArray(arr) ? arr.includes(el.value) : el.defaultChecked;
  });
}

/* ---------------- Ages ---------------- */
function ages(o) {
  const gaW = num(o.gaW), gaD = num(o.gaD) || 0;
  const dob = o.dob ? new Date(o.dob + 'T00:00') : null;
  const sd = o.scanDate ? new Date(o.scanDate + 'T00:00') : null;
  let pna = null, pmaDays = null;
  if (dob && sd) pna = Math.round((sd - dob) / 86400000);
  if (gaW != null) pmaDays = gaW * 7 + gaD + (pna != null && pna >= 0 ? pna : 0);
  const pma = pmaDays != null ? pmaDays / 7 : null;
  const pmaTxt = pmaDays != null ? `${Math.floor(pmaDays / 7)}+${pmaDays % 7} wk` : '–';
  const gaTxt = gaW != null ? `${gaW}+${gaD} wk` : '–';
  let cga = null;
  if (pmaDays != null && pmaDays >= 280) {
    const corr = pmaDays - 280; cga = `${Math.floor(corr / 7)} wk ${corr % 7} d corrected`;
  }
  return { pna, pma, pmaTxt, gaTxt, cga, preterm: gaW != null && gaW < 37,
    screenEligible: (gaW != null && gaW < 32) || (num(o.bw) != null && num(o.bw) < 1500) };
}

/* ---------------- Interpretation engine ---------------- */
function papileSide(ivh, vd, phi) {
  if (phi) return 4;
  if (ivh === 'none' || !ivh) return 0;
  if (ivh === 'gmh') return 1;
  if (ivh === 'ivh50plus' || vd) return 3;
  return 2;
}
function volpeSide(ivh, vd) {
  if (!ivh || ivh === 'none') return 0;
  if (ivh === 'gmh') return 1;
  if (ivh === 'ivh50') return vd ? 3 : 2;
  return 3;
}
function deVries(o) {
  if (o.pvlCysts === 'subcortical') return 4;
  if (o.pvlCysts === 'periventricular') return 3;
  if (o.pvlCysts === 'localised') return 2;
  if (o.pve && o.pve !== 'none') {
    const d = num(o.pveDays);
    if (d != null && d >= 7) return 1;
    return 0.5;
  }
  return 0;
}

function interpret(o) {
  const a = ages(o);
  const r = { a };
  const phiR = !!o.phiR, phiL = !!o.phiL;
  r.papR = papileSide(o.ivhR, o.vdR, phiR);
  r.papL = papileSide(o.ivhL, o.vdL, phiL);
  r.papile = Math.max(r.papR, r.papL);
  r.volR = volpeSide(o.ivhR, o.vdR); r.volL = volpeSide(o.ivhL, o.vdL);
  r.anyIVH = r.papile > 0 || (o.ivhR && o.ivhR !== 'none') || (o.ivhL && o.ivhL !== 'none');

  // Ventricles
  r.vent = {}; let worst = null; const rank = { normal: 0, moderate: 1, high: 2 };
  ['VI', 'AHW', 'TOD'].forEach(k => {
    const kk = k.toLowerCase();
    r.vent[k] = {
      R: a.pma != null ? classifyVent(k, num(o[kk + 'R']), a.pma) : null,
      L: a.pma != null ? classifyVent(k, num(o[kk + 'L']), a.pma) : null
    };
    ['R', 'L'].forEach(s => {
      const c = r.vent[k][s];
      if (c && (worst == null || rank[c.zone] > rank[worst])) worst = c.zone;
    });
  });
  r.ventZone = worst;                       // null if nothing measured
  r.anyVentMeasured = worst != null;
  r.ventDilated = worst === 'moderate' || worst === 'high';
  r.v3 = num(o.v3);
  r.v3Abn = r.v3 != null && r.v3 >= OTHER_REF.thirdVentricle.normalMax;
  r.ventMissingPMA = a.pma == null && ['viR','viL','ahwR','ahwL','todR','todL'].some(k => num(o[k]) != null);

  // PHI
  r.phi = [];
  if (phiR) r.phi.push({ side: 'Right', ext: o.phiExtR, loc: o.phiLocR || [] });
  if (phiL) r.phi.push({ side: 'Left', ext: o.phiExtL, loc: o.phiLocL || [] });

  // WMI
  r.devries = deVries(o);

  // Cerebellum
  r.cbh = o.cbh || 'none';
  r.tcdExp = expectedTCD(a.pma);
  r.tcd = num(o.tcd); r.cm = num(o.cm);
  r.cmAbn = r.cm != null && (r.cm > OTHER_REF.cisternaMagna.max);

  // Doppler
  r.ri = num(o.ri);
  r.riTxt = null;
  if (o.edv === 'Absent' || o.edv === 'Reversed') r.riTxt = `${o.edv} end-diastolic flow – severe haemodynamic compromise; correlate urgently`;
  else if (r.ri != null) {
    if (r.ri > OTHER_REF.riHigh) r.riTxt = `High resistance (RI ${r.ri.toFixed(2)} > 0.85) – consider raised ICP / evolving PHVD`;
    else if (r.ri < OTHER_REF.riLow) r.riTxt = `Low resistance (RI ${r.ri.toFixed(2)} < 0.55) – consider PDA, hypercapnia, or (in HIE) luxury perfusion`;
    else r.riTxt = `Normal resistance (RI ${r.ri.toFixed(2)})`;
  }

  // Anatomy abnormal flags (index > 0 = deviation from normal)
  r.notAssessed = ANATOMY.filter(([k, , opts]) => NV_LABELS.includes(opts[+o['an_' + k] || 0]))
    .map(([k, t, opts]) => ({ k, t, s: opts[+o['an_' + k]] }));
  r.anatAbn = ANATOMY.filter(([k, , opts]) => +o['an_' + k] > 0 && !NV_LABELS.includes(opts[+o['an_' + k]]))
    .map(([k, t, opts]) => `${t}: ${opts[+o['an_' + k]]}`);
  // Ignore anatomy entries fully explained by structured sections / normal variants
  r.anatAbn = r.anatAbn.filter(t => !/normal variant/i.test(t));

  r.cysts = o.cysts || []; r.echo = o.echo || []; r.cong = (o.cong || []).slice();
  if (o.congOther) r.cong.push(o.congOther);
  r.extra = o.extra || [];
  r.infarct = o.infarct ? `${o.infarct}${o.infarctSide ? ' (' + o.infarctSide.toLowerCase() + ')' : ''}` : null;

  r.abnormal = r.anyIVH || r.ventDilated || r.v3Abn || r.phi.length || r.devries > 0 || r.cbh !== 'none' ||
    r.cysts.length || r.echo.length || r.cong.length || r.extra.length || r.infarct || r.anatAbn.length || r.cmAbn ||
    (r.ri != null && r.riTxt && !/^Normal/.test(r.riTxt)) || !!o.edv;
  return r;
}

/* ---------------- Text builders ---------------- */
const sideName = s => s === 'R' ? 'right' : 'left';
function ivhDesc(o, r) {
  const parts = [];
  ['R', 'L'].forEach(s => {
    const p = s === 'R' ? r.papR : r.papL;
    if (p > 0) parts.push(`${sideName(s)} grade ${['', 'I', 'II', 'III', 'IV'][p]}`);
  });
  return parts;
}

function buildImpression(o, r) {
  const L = [];
  const pma = r.a.pmaTxt !== '–' ? ` at ${r.a.pmaTxt} PMA` : '';
  const limLine = r.notAssessed && r.notAssessed.length ? `Limited assessment: ${r.notAssessed.map(x => `${x.t.toLowerCase()} (${x.s.toLowerCase()})`).join('; ')}.` : '';
  if (!r.abnormal) {
    L.push(`No significant abnormality detected in the visualised structures${pma}.`);
    if (limLine) L.push(limLine);
    if (!(o.win || []).includes('MF')) L.push('Mastoid views not obtained – small cerebellar haemorrhage cannot be excluded.');
    return L.join('\n');
  }
  L.push(`Abnormal cranial ultrasound${pma}:`);
  if (r.papile > 0) {
    const roman = ['', 'I', 'II', 'III', 'IV'][r.papile];
    const sides = ivhDesc(o, r);
    const bil = r.papR > 0 && r.papL > 0;
    L.push(`• ${bil ? 'Bilateral ' : ''}GMH-IVH, Papile grade ${roman} (${sides.join('; ')})${o.ivhStage ? ' – ' + o.ivhStage.toLowerCase() : ''}.`);
  }
  r.phi.forEach(p => L.push(`• Periventricular haemorrhagic infarction, ${p.side.toLowerCase()}${p.loc.length ? ' ' + p.loc.join('/') : ''}${p.ext ? ' – ' + p.ext.toLowerCase() : ''}${o.phiEvo ? '; ' + o.phiEvo.toLowerCase() : ''}.`));
  if (r.ventDilated) {
    const z = r.ventZone === 'high' ? 'high-risk zone' : 'moderate-risk zone';
    const det = [];
    ['VI', 'AHW', 'TOD'].forEach(k => ['R', 'L'].forEach(s => {
      const c = r.vent[k][s]; if (c && c.zone !== 'normal') det.push(`${k} ${s} ${fmt1(c.value)} mm`);
    }));
    const kind = r.anyIVH || r.phi.length ? 'Post-haemorrhagic ventricular dilatation' : 'Ventricular dilatation';
    L.push(`• ${kind} – ${z} (${det.join(', ')})${o.ventShape && o.ventShape !== 'Normal' ? ', ' + o.ventShape.toLowerCase() + ' configuration' : ''}.`);
  } else if (r.anyVentMeasured && (r.anyIVH)) {
    L.push('• Ventricular measurements within reference range (≤ p97) for PMA.');
  }
  if (r.v3Abn) L.push(`• Dilated 3rd ventricle (${fmt1(r.v3)} mm).`);
  if (r.devries >= 1) L.push(`• White matter injury: ${DEVRIES[r.devries]}${o.wmSide ? ' – ' + o.wmSide.toLowerCase() : ''}${(o.wmLoc || []).length ? ', ' + o.wmLoc.join('/') : ''}.`);
  else if (r.devries === 0.5) L.push(`• Periventricular echogenicity${o.pveDays ? ' (' + o.pveDays + ' days)' : ''} – not yet meeting criteria for PVL grade I; requires follow-up.`);
  if (r.cbh !== 'none') L.push(`• ${CBH[r.cbh]}${o.cbhSide ? ', ' + o.cbhSide.toLowerCase() : ''}.`);
  if (r.cmAbn) L.push(`• Enlarged cisterna magna (${fmt1(r.cm)} mm).`);
  if (r.infarct) L.push(`• ${r.infarct}.`);
  if (r.echo.length) L.push(`• ${r.echo.join('; ')}.`);
  if (r.cysts.length) L.push(`• ${r.cysts.join('; ')}${o.cystNote ? ' (' + o.cystNote + ')' : ''}.`);
  if (r.cong.length) L.push(`• Congenital: ${r.cong.join('; ')}.`);
  if (r.extra.length) L.push(`• ${r.extra.join('; ')}.`);
  if (r.riTxt && !/^Normal/.test(r.riTxt)) L.push(`• Doppler: ${r.riTxt}.`);
  r.anatAbn.forEach(t => L.push(`• ${t}.`));
  if (limLine) L.push(limLine);
  if (o.interval && o.comparison === 'Compared with previous') L.push(`Compared with previous scan${o.prevDate ? ' (' + fmtDate(o.prevDate) + ')' : ''}: ${o.interval.toLowerCase()}.`);
  return L.join('\n');
}

function buildRecommendation(o, r) {
  const R = [];
  const ind = o.ind || [];
  const add = t => { if (!R.includes(t)) R.push(t); };

  if (r.ventZone === 'high') {
    add('Ventricular measurements in the high-risk zone – senior / neonatologist review today. Any management decision (including specialist referral) is made by the senior team per unit protocol.');
    add('Plot serial measurements on the PHVD chart; daily head circumference; repeat CUS as directed by senior.');
  } else if (r.ventZone === 'moderate') {
    add('Ventricular measurements above the 97th centile (moderate-risk zone) – discuss with senior / neonatologist.');
    add('Plot serial measurements on the PHVD chart; daily head circumference; repeat CUS as directed by senior.');
  }
  if (r.papile >= 3 && !r.ventDilated) add('Repeat CUS at least twice weekly until ventricular size stable for 2 weeks, then every 1–2 weeks until 34 wk PMA (monitor for PHVD).');
  else if (r.papile >= 1 && r.papile <= 2 && !r.ventDilated) add('Repeat CUS in 1 week to assess progression and ventricular size.');
  if (r.phi.length) add('MRI brain at term-equivalent age; refer for early neurodevelopmental follow-up (high risk of unilateral cerebral palsy – consider General Movements Assessment / HINE).');
  if (r.devries >= 2) add('MRI brain at term-equivalent age; high-risk neurodevelopmental follow-up (cystic PVL).');
  else if (r.devries === 1) add('Repeat CUS in 2 weeks to look for cystic evolution; consider term-equivalent MRI.');
  else if (r.devries === 0.5) add('Repeat CUS in 1 week to assess persistence of periventricular echogenicity (≥ 7 days = grade I PVL) and cystic evolution at 2–6 weeks.');
  if (r.cbh !== 'none') add('MRI brain at term-equivalent age to define cerebellar injury (CUS underestimates cerebellar haemorrhage); neurodevelopmental follow-up.');
  if (r.infarct) add('MRI brain with diffusion-weighted imaging (ideally within the first week) and paediatric neurology review.');
  if (r.echo.some(e => /thalamic|Diffusely/.test(e)) || ind.includes('hie')) add('MRI brain (day 5–7 / after rewarming if cooled) per HIE protocol; repeat CUS before discharge.');
  if (r.echo.some(e => /Lenticulostriate|Calcification/.test(e))) add('Consider congenital infection screen (e.g. CMV) and metabolic/genetic evaluation as clinically indicated.');
  if (r.cong.length) add('MRI brain for further characterisation; refer to neurosurgery / paediatric neurology / clinical genetics as appropriate.');
  if (r.extra.length) add('Clinical correlation (coagulation, platelet count, birth history); consider MRI if collection significant or symptomatic.');
  if (r.v3Abn || r.cmAbn) add('Correlate with clinical findings; consider MRI if persistent.');
  if (r.ventMissingPMA) add('Enter GA at birth and dates to enable ventricular risk-zone classification.');
  if (r.notAssessed && r.notAssessed.length) add('Limited study – consider repeat scan or senior scan to complete assessment.');
  const sf = seniorFlags(o, r);
  if (sf.length) R.unshift('Senior review: ' + sf.join('; ') + '.');

  if (!r.abnormal) {
    if (r.a.screenEligible) add('Continue routine preterm CUS screening per unit protocol (e.g. day 3, 7, 14, 28, then at 36 wk PMA / before discharge, or term-equivalent age).');
    if (ind.includes('seizures') || ind.includes('abnNeuro')) add('Normal CUS does not exclude cortical, posterior fossa or subtle injury; consider MRI brain if clinically indicated.');
    if (ind.includes('hie')) add('MRI brain (day 5–7 / after rewarming if cooled) per HIE protocol.');
    if (!R.length) add('No further imaging required unless clinically indicated.');
  } else if (r.a.screenEligible && !R.some(t => /Repeat CUS/.test(t))) {
    add('Continue routine preterm CUS screening per unit protocol, including scan at 36 wk PMA / term-equivalent age.');
  }
  return R.map(t => '• ' + t).join('\n');
}

/* ---------------- Rendering: interpretation ---------------- */
function zoneBadge(c) {
  if (!c) return '<span class="muted">–</span>';
  const z = ZONE_TEXT[c.zone];
  return `<span class="badge ${z.cls}">${fmt1(c.value)} mm</span>`;
}

function renderVentTable(r, compact) {
  if (r.a.pma == null) return '<p class="warn small">Enter GA at birth, DOB and scan date to calculate PMA and classify ventricular size.</p>';
  if (!r.anyVentMeasured) return '<p class="muted small">No ventricular measurements entered.</p>';
  const oor = r.a.pma < 24 || r.a.pma > 42 ? `<p class="warn small">PMA ${r.a.pmaTxt} is outside the 24–42 wk reference range – nearest reference values used. After 40 wk consider frontal horn ratio.</p>` : '';
  const rows = ['VI', 'AHW', 'TOD'].map(k => {
    const c = r.vent[k].R || r.vent[k].L;
    const p97 = c ? c.p97 : interp(REF[k].p97, r.a.pma), hi = c ? c.high : interp(REF[k].high, r.a.pma);
    return `<tr><td>${k}</td><td>${zoneBadge(r.vent[k].R)}</td><td>${zoneBadge(r.vent[k].L)}</td><td>${fmt1(p97)}</td><td>${fmt1(hi)}</td></tr>`;
  }).join('');
  return `${oor}<table class="tbl vt"><tr><th></th><th>Right</th><th>Left</th><th>p97</th><th>High-risk</th></tr>${rows}</table>
    ${compact ? '' : '<p class="muted small">Reference digitised from El-Dib et al. 2020 risk-zone tool (Brouwer data). AHW thresholds fixed at 6 and 10 mm.</p>'}`;
}

function card(title, body, level = '') {
  return `<div class="card icard ${level}"><h3>${title}</h3>${body}</div>`;
}

function renderInterp() {
  const o = S, r = I;
  const out = [];
  const a = r.a;
  out.push(`<div class="card summary ${r.abnormal ? 'abn' : 'nrm'}">
    <div class="sum-head"><span class="pill ${r.abnormal ? 'pill-abn' : 'pill-nrm'}">${r.abnormal ? 'ABNORMAL' : 'NORMAL'}</span>
    <span>${esc(o.name || 'Unnamed')} · GA ${a.gaTxt} · PNA ${a.pna ?? '–'} d · PMA ${a.pmaTxt}</span></div>
    <pre class="imp">${esc(buildImpression(o, r))}</pre></div>`);

  // IVH
  const sev = r.papile >= 3 ? 'lv-high' : r.papile >= 1 ? 'lv-mod' : 'lv-ok';
  out.push(card('GMH-IVH (Papile)', `
    <div class="kv"><span>Right</span><b>${PAPILE[r.papR]}</b></div>
    <div class="kv"><span>Left</span><b>${PAPILE[r.papL]}</b></div>
    <details class="small"><summary>Volpe equivalent</summary>
      <div class="kv"><span>Right</span><span>${VOLPE[r.volR]}${o.phiR ? ' + PVHI' : ''}</span></div>
      <div class="kv"><span>Left</span><span>${VOLPE[r.volL]}${o.phiL ? ' + PVHI' : ''}</span></div>
    </details>
    <details class="small ref"><summary>Papile criteria</summary><ol class="tight">
      <li>Subependymal / germinal matrix haemorrhage only</li><li>IVH without ventricular dilatation</li>
      <li>IVH with ventricular dilatation</li><li>IVH with parenchymal haemorrhage (PVHI)</li></ol></details>`, sev));

  // Ventricles
  const vz = r.ventZone === 'high' ? 'lv-high' : r.ventZone === 'moderate' ? 'lv-mod' : 'lv-ok';
  let phvdTxt = '';
  if (r.ventZone === 'high') phvdTxt = '<p class="z-high-t"><b>High-risk zone.</b> Senior / neonatologist review today. Management is a senior decision – the app does not recommend treatment from measurements alone.</p>';
  else if (r.ventZone === 'moderate') phvdTxt = '<p class="z-mod-t"><b>Above 97th centile.</b> Discuss with senior; plot serially.</p>';
  else if (r.ventZone === 'normal' && r.anyIVH) phvdTxt = '<p>Within reference. If IVH present: CUS ≥ twice weekly until stable for 2 weeks, then 1–2 weekly until 34 wk PMA.</p>';
  out.push(card('Ventricular size / PHVD risk zone', renderVentTable(r) + phvdTxt +
    (r.v3 != null ? `<div class="kv"><span>3rd ventricle</span><b>${fmt1(r.v3)} mm ${r.v3Abn ? '<span class="badge z-moderate">≥ 3 mm</span>' : '<span class="badge z-normal">normal</span>'}</b></div>` : ''), vz));

  // PHI
  out.push(card('Periventricular haemorrhagic infarction', r.phi.length
    ? r.phi.map(p => `<div class="kv"><span>${p.side}</span><b>${p.ext || 'Present'}${p.loc.length ? ' – ' + p.loc.join(', ') : ''}</b></div>`).join('') +
      (o.phiEvo ? `<p class="small">${esc(o.phiEvo)}</p>` : '') +
      '<p class="muted small">Fan-shaped, usually unilateral, periventricular echodensity from venous infarction of medullary veins. Grade as Papile IV; consider extent and laterality for prognosis.</p>'
    : '<p class="muted">Not present.</p>', r.phi.length ? 'lv-high' : 'lv-ok'));

  // WMI
  out.push(card('White matter injury / PVL (de Vries)', `<p><b>${DEVRIES[r.devries]}</b></p>
    <details class="small ref"><summary>de Vries grading</summary><ol class="tight">
      <li>Periventricular echodensity persisting ≥ 7 days</li><li>Echodensity evolving into small localised fronto-parietal cysts</li>
      <li>Extensive periventricular cystic lesions (occipital and fronto-parietal)</li><li>Extensive cysts extending into subcortical white matter</li></ol>
      <p>Compare echogenicity with choroid plexus. Cysts typically appear 2–6 weeks after insult.</p></details>`,
    r.devries >= 2 ? 'lv-high' : r.devries > 0 ? 'lv-mod' : 'lv-ok'));

  // Cerebellum
  const mf = (o.win || []).includes('MF');
  out.push(card('Cerebellar haemorrhage', `<p><b>${CBH[r.cbh]}</b>${o.cbhSide && r.cbh !== 'none' ? ' – ' + esc(o.cbhSide) : ''}</p>
    ${!mf ? '<p class="warn small">Mastoid view not recorded – sensitivity for cerebellar haemorrhage is reduced.</p>' : ''}
    ${r.tcd != null ? `<div class="kv"><span>TCD</span><b>${fmt1(r.tcd)} mm</b></div>` : ''}
    ${r.tcdExp != null ? `<div class="kv"><span>Rule-of-thumb expected TCD</span><span>≈ ${Math.round(r.tcdExp)} mm</span></div>` : ''}
    ${r.cm != null ? `<div class="kv"><span>Cisterna magna</span><b>${fmt1(r.cm)} mm ${r.cmAbn ? '<span class="badge z-moderate">&gt; 10 mm</span>' : ''}</b></div>` : ''}
    <details class="small ref"><summary>Classification</summary><ul class="tight"><li>Punctate: &lt; 4 mm</li><li>Limited: ≥ 4 mm, &lt; 1/3 hemisphere</li><li>Massive: ≥ 1/3 hemisphere</li></ul></details>`,
    r.cbh === 'massive' ? 'lv-high' : r.cbh !== 'none' ? 'lv-mod' : 'lv-ok'));

  // Other
  const other = [];
  if (r.infarct) other.push(`<li>${esc(r.infarct)}</li>`);
  r.echo.forEach(t => other.push(`<li>${esc(t)}</li>`));
  r.cysts.forEach(t => other.push(`<li>${esc(t)}</li>`));
  r.cong.forEach(t => other.push(`<li>${esc(t)}</li>`));
  r.extra.forEach(t => other.push(`<li>${esc(t)}</li>`));
  r.anatAbn.forEach(t => other.push(`<li>${esc(t)}</li>`));
  if (r.riTxt) other.push(`<li>Doppler: ${esc(r.riTxt)}</li>`);
  out.push(card('Other abnormalities', other.length ? `<ul>${other.join('')}</ul>` : '<p class="muted">None recorded.</p>', other.length ? 'lv-mod' : 'lv-ok'));

  out.push(card('Suggested recommendation', `<pre class="imp">${esc(buildRecommendation(o, r))}</pre>
    <p class="muted small">Decision support only – adapt to clinical context and unit protocol.</p>`, 'wide'));

  $('#interpOut').innerHTML = `<div class="icards">${out.join('')}</div>`;
}

function renderVentLive() {
  $('#ventLive').innerHTML = renderVentTable(I, true);
}

/* ---------------- Rendering: age calc + chip ---------------- */
function renderAges() {
  const a = I.a;
  $('#ageCalc').innerHTML = `<span>Postnatal age: <b>${a.pna != null ? a.pna + ' days' : '–'}</b></span>
    <span>PMA: <b>${a.pmaTxt}</b></span>${a.cga ? `<span>Corrected age: <b>${a.cga}</b></span>` : ''}
    ${a.pna != null && a.pna < 0 ? '<span class="warn">Scan date is before DOB</span>' : ''}`;
  $('#patientBar').innerHTML = S.name || S.mrn ? `<b>${esc(S.name || '')}</b>${S.mrn ? ' · ' + esc(S.mrn) : ''} <span>GA ${a.gaTxt} · D${a.pna ?? '–'} · PMA ${a.pmaTxt}</span>` : '';
}

/* ---------------- Report ---------------- */
function fmtDate(d) {
  if (!d) return '–';
  const x = new Date(d + 'T00:00');
  return isNaN(x) ? d : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function indText(o) {
  const m = Object.fromEntries(INDICATIONS);
  const t = (o.ind || []).map(v => m[v]);
  if (o.indOther) t.push(o.indOther);
  return t.join('; ') || '–';
}
function viewsText(o) {
  const v = o.views || [];
  const cor = CORONAL_VIEWS.filter(x => v.includes(x));
  const sag = SAGITTAL_VIEWS.filter(([x]) => v.includes(x)).map(([, t]) => t);
  return {
    cor: cor.length === 6 ? 'C1–C6 (complete)' : cor.length ? cor.join(', ') + ' (incomplete)' : 'Not recorded',
    sag: sag.length === 5 ? 'Midline, right & left parasagittal (ventricle and insula) – complete' : sag.length ? sag.join('; ') : 'Not recorded'
  };
}
function windowsText(o) {
  const m = { AF: 'Anterior fontanelle', PF: 'Posterior fontanelle', MF: 'Mastoid fontanelle', Doppler: 'Doppler' };
  return (o.win || []).map(w => m[w]).join(', ') || '–';
}
function anatomyRows(o) {
  return ANATOMY.map(([k, t, opts]) => {
    const i = +(o['an_' + k] || 0);
    return [t, opts[i], i > 0 && !/normal variant/i.test(opts[i])];
  });
}
function measRow(o, k) {
  const kk = k.toLowerCase();
  const c = I.vent[k] || {};
  const cell = s => {
    const v = num(o[kk + s]); if (v == null) return '–';
    const z = c[s] ? ` <span class="rz ${ZONE_TEXT[c[s].zone].cls}">${c[s].zone === 'normal' ? 'N' : c[s].zone === 'moderate' ? 'Mod' : 'High'}</span>` : '';
    return fmt1(v) + z;
  };
  const p97 = I.a.pma != null ? fmt1(interp(REF[k].p97, I.a.pma)) : '–';
  return `<tr><td>${k}</td><td>${cell('R')}</td><td>${cell('L')}</td><td>${p97}</td></tr>`;
}

function abnormalityRows(o, r) {
  const rows = [];
  rows.push(['GMH-IVH', r.papile ? `Right: ${r.papR ? 'Grade ' + ['', 'I', 'II', 'III', 'IV'][r.papR] : 'none'}; Left: ${r.papL ? 'Grade ' + ['', 'I', 'II', 'III', 'IV'][r.papL] : 'none'} (Papile)${o.ivhStage ? ' – ' + o.ivhStage : ''}` : 'None', r.papile > 0]);
  rows.push(['Periventricular haemorrhagic infarction', r.phi.length ? r.phi.map(p => `${p.side}${p.loc.length ? ' ' + p.loc.join('/') : ''}${p.ext ? ' (' + p.ext.toLowerCase() + ')' : ''}`).join('; ') : 'None', r.phi.length > 0]);
  rows.push(['Ventricular dilatation', r.ventZone == null ? 'Not measured' : r.ventDilated ? (r.ventZone === 'high' ? 'Present – high-risk zone' : 'Present – moderate-risk zone') + (o.ventShape && o.ventShape !== 'Normal' ? '; ' + o.ventShape.toLowerCase() : '') : 'None (≤ p97)', r.ventDilated]);
  rows.push(['White matter injury / PVL', r.devries ? DEVRIES[r.devries] : 'None', r.devries > 0]);
  rows.push(['Cerebellar haemorrhage', CBH[r.cbh] + (r.cbh !== 'none' && o.cbhSide ? ' – ' + o.cbhSide : ''), r.cbh !== 'none']);
  rows.push(['Cysts', r.cysts.length ? r.cysts.join('; ') + (o.cystNote ? ' (' + o.cystNote + ')' : '') : 'None', r.cysts.length > 0]);
  rows.push(['Echogenicity', r.echo.length ? r.echo.join('; ') : 'Normal', r.echo.length > 0]);
  rows.push(['Infarction', r.infarct || 'None', !!r.infarct]);
  rows.push(['Congenital abnormalities', r.cong.length ? r.cong.join('; ') : 'None', r.cong.length > 0]);
  rows.push(['Extra-axial', r.extra.length ? r.extra.join('; ') : 'Normal', r.extra.length > 0]);
  if (r.riTxt) rows.push(['Doppler (ACA)', r.riTxt, !/^Normal/.test(r.riTxt)]);
  return rows;
}

function renderReport() {
  const o = S, r = I, a = r.a;
  const v = viewsText(o);
  const imp = $('#impression').value, rec = $('#recommendation').value;
  const tr = (k, val, abn) => `<tr><th>${k}</th><td class="${abn ? 'abn' : ''}">${esc(val)}</td></tr>`;
  $('#reportSheet').innerHTML = `
  <div class="rep-head">
    <div><div class="rep-hosp">${esc(settings.hosp)}</div><div class="rep-dept">${esc(settings.dept)}</div></div>
    <div class="rep-title">NEONATAL CRANIAL ULTRASOUND REPORT</div>
  </div>
  <h4>1. Patient details</h4>
  <table class="rt two">
    <tr><th>Name</th><td>${esc(o.name || '–')}</td><th>MRN</th><td>${esc(o.mrn || '–')}</td></tr>
    <tr><th>Date of birth</th><td>${fmtDate(o.dob)}</td><th>Sex</th><td>${esc(o.sex || '–')}</td></tr>
    <tr><th>Gestational age</th><td>${a.gaTxt}</td><th>Birth weight</th><td>${o.bw ? esc(o.bw) + ' g' : '–'}</td></tr>
    <tr><th>Postnatal age</th><td>${a.pna != null ? a.pna + ' days' : '–'}</td><th>PMA at scan</th><td>${a.pmaTxt}${a.cga ? ' (' + a.cga + ')' : ''}</td></tr>
    <tr><th>Scan date</th><td>${fmtDate(o.scanDate)}</td><th>Scan no. / location</th><td>${esc(o.scanNo || '–')} / ${esc(o.ward || '–')}</td></tr>
  </table>
  <h4>2. Indication</h4><p>${esc(indText(o))}</p>
  <h4>3. Technique</h4>
  <table class="rt">
    ${tr('Windows', windowsText(o))}
    ${tr('Equipment', [o.machine, o.probe].filter(Boolean).join(' – ') || '–')}
    ${tr('Image quality', o.quality + (o.qualityNote ? ' – ' + o.qualityNote : ''), o.quality === 'Limited')}
    ${tr('Comparison', o.comparison === 'Compared with previous' ? `Previous scan ${fmtDate(o.prevDate)}${o.interval ? ' – ' + o.interval.toLowerCase() : ''}` : 'First scan')}
  </table>
  <h4>4. Standard views</h4>
  <table class="rt">${tr('Coronal', v.cor)}${tr('Sagittal', v.sag)}</table>
  ${(() => { const n = buildNarrative(o, r); return `<h4>Findings</h4><p class="small"><i>${esc(n.tech)}</i></p><ul class="narr">${n.findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`; })()}
  <h4>5. Brain anatomy checklist</h4>
  <table class="rt">${anatomyRows(o).map(([t, val, abn]) => tr(t, val, abn)).join('')}${o.anatNotes ? tr('Notes', o.anatNotes) : ''}</table>
  <h4>6. Measurements (mm)</h4>
  <table class="rt meas"><tr><th></th><th>Right</th><th>Left</th><th>p97 for PMA</th></tr>
    ${measRow(o, 'VI')}${measRow(o, 'AHW')}${measRow(o, 'TOD')}</table>
  <p class="small">${[r.v3 != null ? `3rd ventricle ${fmt1(r.v3)} mm` : '', o.v4 && o.v4 !== 'Normal' ? `4th ventricle ${o.v4.toLowerCase()}` : '', r.tcd != null ? `TCD ${fmt1(r.tcd)} mm` : '', r.cm != null ? `cisterna magna ${fmt1(r.cm)} mm` : '', o.hc ? `HC ${o.hc} cm` : ''].filter(Boolean).join(' · ')}</p>
  <h4>7. Abnormalities</h4>
  <table class="rt">${abnormalityRows(o, r).map(([k, val, abn]) => tr(k, val, abn)).join('')}${o.notes ? tr('Additional', o.notes) : ''}</table>
  ${maturityReportHTML()}
  ${(() => { const f = seniorFlags(o, r); return f.length ? `<div class="box abn-b"><b>Senior review recommended:</b> ${esc(f.join('; '))}.</div>` : ''; })()}
  <h4>8. Impression</h4><div class="box ${r.abnormal ? 'abn-b' : ''}">${esc(imp).replace(/\n/g, '<br>')}</div>
  <h4>9. Recommendation</h4><div class="box">${esc(rec).replace(/\n/g, '<br>')}</div>
  <div class="sign">
    <div><div class="line"></div>${esc(o.reporter || settings.rep || 'Reported by')}<br><span class="small">${esc(o.designation || settings.des || '')}</span></div>
    <div class="small">Report generated ${new Date().toLocaleString('en-GB')}<br>NeoCranial USG v2.1</div>
  </div>`;
}

function reportText() {
  const o = S, r = I, a = r.a, v = viewsText(o);
  const L = [];
  L.push(`${settings.hosp} – ${settings.dept}`, 'NEONATAL CRANIAL ULTRASOUND REPORT', '');
  L.push(`Name: ${o.name || '-'}    MRN: ${o.mrn || '-'}    Sex: ${o.sex || '-'}`);
  L.push(`DOB: ${fmtDate(o.dob)}    GA: ${a.gaTxt}    BW: ${o.bw ? o.bw + ' g' : '-'}`);
  L.push(`Scan date: ${fmtDate(o.scanDate)}    PNA: ${a.pna ?? '-'} d    PMA: ${a.pmaTxt}`, '');
  L.push(`INDICATION: ${indText(o)}`);
  L.push(`TECHNIQUE: ${windowsText(o)}. Quality: ${o.quality}${o.qualityNote ? ' (' + o.qualityNote + ')' : ''}.`);
  L.push(`VIEWS: Coronal ${v.cor}. Sagittal: ${v.sag}.`, '');
  const nar = buildNarrative(o, r);
  L.push('TECHNIQUE: ' + nar.tech, '', 'FINDINGS:'); nar.findings.forEach(f => L.push('  ' + f)); L.push('');
  L.push('ANATOMY CHECKLIST:');
  anatomyRows(o).forEach(([t, val]) => L.push(`  ${t}: ${val}`));
  L.push('', 'MEASUREMENTS (mm)   R / L');
  ['VI', 'AHW', 'TOD'].forEach(k => {
    const kk = k.toLowerCase();
    L.push(`  ${k}: ${o[kk + 'R'] || '-'} / ${o[kk + 'L'] || '-'}` + (I.vent[k] && (I.vent[k].R || I.vent[k].L) ? `   [p97 ${fmt1(interp(REF[k].p97, a.pma))}]` : ''));
  });
  L.push('', 'ABNORMALITIES:');
  abnormalityRows(o, r).forEach(([k, val]) => L.push(`  ${k}: ${val}`));
  const mt = maturityText(); if (mt) L.push('', 'BRAIN MATURATION & GA ASSESSMENT (NeoMaturity):', mt);
  L.push('', 'IMPRESSION:', $('#impression').value, '', 'RECOMMENDATION:', $('#recommendation').value, '');
  L.push(`Reported by: ${o.reporter || settings.rep || ''} ${o.designation || settings.des || ''}`);
  return L.join('\n');
}

/* ---------------- PHVD series + charts ---------------- */
function getSeries() { return load(LS_SERIES, {}); }
function seriesFor(mrn) { return (getSeries()[mrn || '_'] || []).sort((x, y) => x.pma - y.pma); }

function addToSeries() {
  if (!S.mrn) return toast('Enter an MRN first');
  if (I.a.pma == null) return toast('PMA required (GA, DOB, scan date)');
  const keys = ['viR', 'viL', 'ahwR', 'ahwL', 'todR', 'todL'];
  if (!keys.some(k => num(S[k]) != null)) return toast('No measurements entered');
  const all = getSeries(); const arr = all[S.mrn] || [];
  const rec = { date: S.scanDate || '', pma: +I.a.pma.toFixed(3), pmaTxt: I.a.pmaTxt };
  keys.forEach(k => rec[k] = num(S[k]));
  const i = arr.findIndex(x => x.date === rec.date && rec.date);
  if (i >= 0) arr[i] = rec; else arr.push(rec);
  all[S.mrn] = arr; store(LS_SERIES, all);
  renderSeries(); toast('Scan added to PHVD chart');
}

function renderSeries() {
  const arr = seriesFor(S.mrn);
  // include current (unsaved) scan as hollow points
  const cur = I.a.pma != null ? { pma: I.a.pma, viR: num(S.viR), viL: num(S.viL), ahwR: num(S.ahwR), ahwL: num(S.ahwL), todR: num(S.todR), todL: num(S.todL) } : null;
  drawChart($('#chVI'), 'VI', arr, cur);
  drawChart($('#chAHW'), 'AHW', arr, cur);
  drawChart($('#chTOD'), 'TOD', arr, cur);
  if (!arr.length) { $('#seriesTable').innerHTML = `<p class="muted small">${S.mrn ? 'No saved scans for MRN ' + esc(S.mrn) + '.' : 'Enter MRN to track serial scans.'} Current scan shown as hollow markers.</p>`; return; }
  $('#seriesTable').innerHTML = `<table class="tbl"><tr><th>Date</th><th>PMA</th><th>VI R/L</th><th>AHW R/L</th><th>TOD R/L</th><th></th></tr>
    ${arr.map((x, i) => `<tr><td>${fmtDate(x.date)}</td><td>${x.pmaTxt}</td><td>${x.viR ?? '–'} / ${x.viL ?? '–'}</td><td>${x.ahwR ?? '–'} / ${x.ahwL ?? '–'}</td><td>${x.todR ?? '–'} / ${x.todL ?? '–'}</td>
    <td><button class="btn ghost xs" data-del="${i}">✕</button></td></tr>`).join('')}</table>
    <div class="row-end"><button class="btn ghost sm" id="exportCsv">Export CSV</button></div>`;
  $$('#seriesTable [data-del]').forEach(b => b.onclick = () => {
    if (!confirm('Delete this scan from the series?')) return;
    const all = getSeries(); const list = seriesFor(S.mrn); list.splice(+b.dataset.del, 1);
    all[S.mrn] = list; store(LS_SERIES, all); renderSeries();
  });
  $('#exportCsv').onclick = () => {
    const rows = [['MRN', 'Date', 'PMA', 'VI_R', 'VI_L', 'AHW_R', 'AHW_L', 'TOD_R', 'TOD_L']];
    arr.forEach(x => rows.push([S.mrn, x.date, x.pmaTxt, x.viR, x.viL, x.ahwR, x.ahwL, x.todR, x.todL].map(v => v ?? '')));
    download(`PHVD_${S.mrn}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
  };
}

function drawChart(cv, key, arr, cur) {
  const dpr = window.devicePixelRatio || 1;
  const W = 420, H = 260;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = '100%'; cv.style.maxWidth = W + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const col = n => css.getPropertyValue(n).trim();
  const ref = REF[key];
  const m = { l: 34, r: 10, t: 10, b: 28 };
  const x0 = 24, x1 = 42, y0 = ref.yMin, y1 = ref.yMax;
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
  ctx.clearRect(0, 0, W, H);
  // zones
  const band = (lowFn, highFn, fill) => {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 0.25) ctx.lineTo(X(x), Y(Math.min(y1, highFn(x))));
    for (let x = x1; x >= x0; x -= 0.25) ctx.lineTo(X(x), Y(Math.max(y0, lowFn(x))));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  band(() => y0, x => interp(ref.p97, x), col('--zg'));
  band(x => interp(ref.p97, x), x => interp(ref.high, x), col('--za'));
  band(x => interp(ref.high, x), () => y1, col('--zr'));
  // grid
  ctx.strokeStyle = col('--grid'); ctx.lineWidth = 1; ctx.fillStyle = col('--muted'); ctx.font = '10px system-ui';
  for (let x = x0; x <= x1; x += 2) { ctx.beginPath(); ctx.moveTo(X(x), Y(y0)); ctx.lineTo(X(x), Y(y1)); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(x, X(x), H - m.b + 13); }
  const step = (y1 - y0) > 20 ? 4 : 2;
  for (let y = y0; y <= y1; y += step) { ctx.beginPath(); ctx.moveTo(X(x0), Y(y)); ctx.lineTo(X(x1), Y(y)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(y, m.l - 4, Y(y) + 3); }
  ctx.textAlign = 'center'; ctx.fillText('PMA (weeks)', (m.l + W - m.r) / 2, H - 3);
  ctx.save(); ctx.translate(10, (m.t + H - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('mm', 0, 0); ctx.restore();
  // lines
  const line = (pts, c, w, dash) => {
    ctx.beginPath(); ctx.setLineDash(dash || []);
    for (let x = x0; x <= x1; x += 0.25) ctx.lineTo(X(x), Y(interp(pts, x)));
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([]);
  };
  line(ref.mean, col('--lgreen'), 1.5, [4, 3]); line(ref.p97, col('--lamber'), 2); line(ref.high, col('--lred'), 2);
  // data
  const k = key.toLowerCase();
  const plot = (pts, side, hollow) => {
    const c = side === 'R' ? col('--ptR') : col('--ptL');
    const valid = pts.filter(p => p[k + side] != null);
    if (!hollow && valid.length > 1) {
      ctx.beginPath(); valid.forEach((p, i) => { const fn = i ? 'lineTo' : 'moveTo'; ctx[fn](X(clamp(p.pma)), Y(p[k + side])); });
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke();
    }
    valid.forEach(p => {
      const px = X(clamp(p.pma)), py = Y(Math.max(y0, Math.min(y1, p[k + side])));
      ctx.beginPath();
      if (side === 'R') ctx.arc(px, py, 4, 0, Math.PI * 2);
      else { ctx.moveTo(px, py - 5); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 5); ctx.lineTo(px - 5, py); ctx.closePath(); }
      if (hollow) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = c; ctx.fill(); }
    });
  };
  const clamp = p => Math.max(x0, Math.min(x1, p));
  plot(arr, 'R'); plot(arr, 'L');
  if (cur) { plot([cur], 'R', true); plot([cur], 'L', true); }
}

/* ---------------- Guide: real images, atlas, viewer ---------------- */
const imgPath = n => `images/${n}.jpg`;
const credit = (src, fig) => !SOURCES[src].url ? (SOURCES[src].short ? `Image: ${SOURCES[src].short} – ${SOURCES[src].licence}` : '') : `Fig ${fig}: <a href="${SOURCES[src].url}" target="_blank" rel="noopener">${SOURCES[src].short}</a> · <a href="${SOURCES[src].licUrl}" target="_blank" rel="noopener">${SOURCES[src].licence}</a>`;
let vList = [], vIdx = 0;

function renderViews() {
  $('#guideViews').innerHTML = VIEWS.map((v, i) => `
    <article class="card vcard">
      <h3>${v.title}</h3>
      <div class="muted small">${v.window}</div>
      <button class="img-btn" data-view="${i}"><img src="${imgPath(v.img)}" alt="${esc(v.title)}" loading="lazy"><span class="zoom">⤢</span></button>
      <div class="credit">${credit(v.src, v.fig)}</div>
      <p class="small">${v.how}</p>
      <ul class="plist">${v.panels.map(([p, t, d]) => `<li>${p ? `<b class="pl">${p}</b>` : ''}<div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ul>
    </article>`).join('');
  $$('[data-view]').forEach(b => b.onclick = () => openViewer(VIEWS.map(v => ({ ...v, keys: v.panels.map(p => `${p[0] ? p[0] + ': ' : ''}${p[1]}`) })), +b.dataset.view));
}

let atlasCat = 'Recognition';
function renderAtlas() {
  const cats = ['Recognition', 'All images', ...new Set(ATLAS.map(a => a.cat))];
  $('#atlasCats').innerHTML = cats.map(c => `<button class="chipb ${c === atlasCat ? 'on' : ''}" data-cat="${c}">${c === 'Recognition' ? '🔎 Abnormality recognition' : c}</button>`).join('');
  $$('#atlasCats [data-cat]').forEach(b => b.onclick = () => { atlasCat = b.dataset.cat; renderAtlas(); });
  if (atlasCat === 'Recognition') {
    $('#atlasList').className = 'abn-list';
    $('#atlasList').innerHTML = ABN_ATLAS.map(e => `
      <details class="card abn">
        <summary><img src="${imgPath(e.imgs[0][0])}" alt="" loading="lazy"><div><b>${e.title}</b><span class="muted small">${e.looks[0]}</span></div></summary>
        <div class="lstrip">${e.imgs.map(([img, src, fig, cap], k) => `<figure><button class="img-btn" data-ab="${e.id}" data-k="${k}"><img src="${imgPath(img)}" alt="${esc(cap)}" loading="lazy"><span class="zoom">⤢</span></button><figcaption>${cap}${credit(src, fig) ? `<div class="credit">${credit(src, fig)}</div>` : ''}</figcaption></figure>`).join('')}</div>
        <div class="abn-sec"><h4>📍 Where to look</h4><p>${e.where}</p></div>
        <div class="abn-sec"><h4>👁 What it looks like</h4><ul>${e.looks.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="abn-sec"><h4>📏 How to grade / describe</h4><p>${e.grade}</p></div>
        <div class="abn-sec pit"><h4>⚠ Common pitfalls</h4><ul>${e.pitfalls.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="abn-sec sen"><h4>⚑ When to seek senior review</h4><p>${e.senior}</p></div>
      </details>`).join('');
    $$('#atlasList [data-ab]').forEach(b => b.onclick = e => {
      e.preventDefault(); const en = ABN_ATLAS.find(x => x.id === b.dataset.ab);
      openViewer(en.imgs.map(([img, src, fig, cap]) => ({ img, src, fig, title: `${en.title} – ${cap}`, keys: en.looks })), +b.dataset.k);
    });
    return;
  }
  $('#atlasList').className = 'atlas';
  const list = ATLAS.filter(a => atlasCat === 'All images' || a.cat === atlasCat);
  $('#atlasList').innerHTML = list.map((a, i) => `
    <button class="acard" data-atlas="${i}">
      <img src="${imgPath(a.img)}" alt="" loading="lazy">
      <div><b>${a.title}</b>${a.variant ? '<span class="tag-var">Normal variant</span>' : ''}<span class="muted small">${a.keys[0]}</span></div>
    </button>`).join('');
  $$('#atlasList [data-atlas]').forEach(b => b.onclick = () => openViewer(list, +b.dataset.atlas));
}

function openViewer(list, i) {
  vList = list; vIdx = i; showV(); const d = $('#viewer'); if (!d.open) d.showModal();
}
function showV() {
  const a = vList[vIdx];
  $('#vImg').src = imgPath(a.img); $('#vImg').alt = a.title;
  $('#vCount').textContent = vList.length > 1 ? `${vIdx + 1} / ${vList.length}` : '';
  $('#vCap').innerHTML = `<b>${a.title}</b>${a.variant ? ' <span class="tag-var">Normal variant</span>' : ''}
    <ul>${(a.keys || []).map(k => `<li>${k}</li>`).join('')}</ul>${credit(a.src, a.fig) ? `<div class="credit">${credit(a.src, a.fig)}${SOURCES[a.src].note ? '. ' + SOURCES[a.src].note : ''}</div>` : ''}`;
  $('#vPrev').disabled = vIdx === 0; $('#vNext').disabled = vIdx === vList.length - 1;
  $('.v-img').scrollTo(0, 0);
}
function initViewer() {
  const d = $('#viewer');
  $('#vClose').onclick = () => d.close();
  $('#vPrev').onclick = () => { if (vIdx > 0) { vIdx--; showV(); } };
  $('#vNext').onclick = () => { if (vIdx < vList.length - 1) { vIdx++; showV(); } };
  let x0 = null;
  $('.v-img').addEventListener('touchstart', e => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  $('.v-img').addEventListener('touchend', e => {
    if (x0 == null || window.visualViewport && visualViewport.scale > 1.05) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (dx < -60) $('#vNext').click(); else if (dx > 60) $('#vPrev').click();
  });
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  $$('.ex-btn').forEach(b => b.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const links = b.dataset.ex.split(' ');
    const list = ATLAS.filter(a => links.includes(a.link));
    if (list.length) openViewer(list, 0);
  });
}

function renderCredits() {
  $('#imgCredits').innerHTML = Object.values(SOURCES).filter(s => s.url || s.short).map(s => !s.url ? `<p>${s.short} – ${s.licence}.</p>` :
    `<p><a href="${s.url}" target="_blank" rel="noopener">${s.short}</a> – licensed under <a href="${s.licUrl}" target="_blank" rel="noopener">${s.licence}</a>. ${s.note}</p>`).join('') +
    '<p class="muted">Images are reproduced for non-commercial education. See IMAGE_CREDITS.md.</p>';
}

/* ---------------- Learn: step-by-step ---------------- */
const LS_LEARN = 'neocranial.learn';
let learn = Object.assign({ step: 0, done: [] }, load(LS_LEARN, {}));
function renderLearn() {
  const i = Math.min(learn.step, LEARN.length - 1), st = LEARN[i];
  const pct = Math.round(learn.done.length / LEARN.length * 100);
  const imgs = st.imgs.map(([img, src, fig, cap]) => ({ img, src, fig, title: cap, keys: [] }));
  $('#guideLearn').innerHTML = `
    <div class="card lcard">
      <div class="lhead">
        <select id="lJump" aria-label="Jump to step">${LEARN.map((l, k) => `<option value="${k}" ${k === i ? 'selected' : ''}>${learn.done.includes(k) ? '✓ ' : ''}${k + 1}. ${l.title}</option>`).join('')}</select>
        <div class="lprog"><span style="width:${pct}%"></span></div>
        <div class="muted small">Step ${i + 1} of ${LEARN.length} · ${learn.done.length} completed</div>
      </div>
      <h2>${i + 1}. ${st.title}</h2>
      <p class="lgoal">${st.goal}</p>
      ${imgs.length ? `<div class="lstrip ${imgs.length === 1 ? 'one' : ''}">${imgs.map((m, k) => `
        <figure><button class="img-btn" data-li="${k}"><img src="${imgPath(m.img)}" alt="${esc(m.title)}" loading="lazy"><span class="zoom">⤢</span></button>
        <figcaption>${m.title}${credit(m.src, m.fig) ? `<div class="credit">${credit(m.src, m.fig)}</div>` : ''}</figcaption></figure>`).join('')}</div>
        ${imgs.length > 1 ? '<div class="muted small swipe-hint">Swipe for more images →</div>' : ''}` : ''}
      ${st.table ? `<table class="tbl ltable"><tr>${st.table[0].map(h => `<th>${h}</th>`).join('')}</tr>${st.table.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>` : ''}
      <ul class="lpoints">${st.points.map(p => `<li>${p}</li>`).join('')}</ul>
      ${st.ref ? `<div class="lref">📖 Further reading: Sodhi (ed.) <i>Neonatal Ultrasound</i>, Springer 2025 – ${st.ref}</div>` : ''}
      ${st.check ? `<details class="lcheck"><summary>Check yourself: ${st.check[0]}</summary><p>${st.check[1]}</p></details>` : ''}
      ${st.link === 'start' ? '<button class="btn full-w" id="lStart">Start a scan in Findings →</button>' :
        st.link ? `<button class="btn ghost full-w" id="lEx">📷 More examples in the atlas</button>` : ''}
    </div>
    <div class="lnav">
      <button class="btn ghost" id="lPrev" ${i === 0 ? 'disabled' : ''}>‹ Back</button>
      <button class="btn" id="lNext">${i === LEARN.length - 1 ? 'Finish ✓' : 'Got it – next ›'}</button>
    </div>`;
  $$('#guideLearn [data-li]').forEach(b => b.onclick = () => openViewer(imgs, +b.dataset.li));
  const go = k => { learn.step = Math.max(0, Math.min(LEARN.length - 1, k)); store(LS_LEARN, learn); renderLearn(); window.scrollTo({ top: 0 }); };
  $('#lJump').onchange = e => go(+e.target.value);
  $('#lPrev').onclick = () => go(i - 1);
  $('#lNext').onclick = () => {
    if (!learn.done.includes(i)) learn.done.push(i);
    if (i === LEARN.length - 1) { store(LS_LEARN, learn); toast(`Completed ${learn.done.length}/${LEARN.length} steps`); renderLearn(); }
    else go(i + 1);
  };
  if ($('#lStart')) $('#lStart').onclick = () => showTab('findings');
  if ($('#lEx')) $('#lEx').onclick = () => { const list = ATLAS.filter(a => a.link === st.link); if (list.length) openViewer(list, 0); else showTab('guide'); };
}

/* ---------------- Section status (shown on collapsed headers) ---------------- */
function renderSums() {
  const o = S, r = I, set = (k, t, cls = '') => { const el = $(`[data-sum="${k}"]`); if (el) { el.textContent = t; el.className = 'sum ' + cls; } };
  const a = r.a;
  set('pt', o.name || o.mrn ? `${a.pmaTxt}` : 'Required', o.name || o.mrn ? 'ok' : 'todo');
  set('ind', (o.ind || []).length ? `${o.ind.length} selected` : '', '');
  set('tech', (o.win || []).join(' · '), '');
  const nv = (o.views || []).length; set('views', `${nv}/11`, nv >= 11 ? 'ok' : nv ? 'warn' : 'todo');
  set('anat', r.anatAbn.length ? `${r.anatAbn.length} abnormal` : 'Normal', r.anatAbn.length ? 'bad' : 'ok');
  set('ivh', r.papile ? `Grade ${['', 'I', 'II', 'III', 'IV'][r.papile]}` : 'None', r.papile >= 3 ? 'bad' : r.papile ? 'warn' : 'ok');
  set('phi', r.phi.length ? r.phi.map(p => p.side).join(' + ') : 'None', r.phi.length ? 'bad' : 'ok');
  set('vent', r.ventZone == null ? '–' : r.ventZone === 'high' ? 'High risk' : r.ventZone === 'moderate' ? 'Moderate' : 'Normal', r.ventZone === 'high' ? 'bad' : r.ventZone === 'moderate' ? 'warn' : r.ventZone ? 'ok' : '');
  set('wmi', r.devries >= 1 ? `PVL ${['', 'I', 'II', 'III', 'IV'][r.devries]}` : r.devries ? 'PVE' : 'None', r.devries >= 2 ? 'bad' : r.devries ? 'warn' : 'ok');
  set('cbh', r.cbh === 'none' ? 'None' : r.cbh, r.cbh === 'none' ? 'ok' : 'bad');
  const oth = r.cysts.length + r.echo.length + (r.infarct ? 1 : 0); set('other', oth ? `${oth} finding${oth > 1 ? 's' : ''}` : 'None', oth ? 'warn' : 'ok');
  const cg = r.cong.length + r.extra.length; set('cong', cg ? `${cg} finding${cg > 1 ? 's' : ''}` : 'None', cg ? 'bad' : 'ok');
  set('dop', r.ri != null ? 'RI ' + r.ri.toFixed(2) : '', '');
}

function setNormal() {
  const keep = new Set(['pt', 'ind', 'tech']);
  $$('#form details.sec').forEach(d => {
    const sum = d.querySelector('[data-sum]'); if (!sum || keep.has(sum.dataset.sum)) return;
    d.querySelectorAll('[data-k]').forEach(el => {
      if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (!['reporter', 'designation'].includes(el.dataset.k)) el.value = '';
    });
    d.querySelectorAll('[data-g]').forEach(el => el.checked = el.dataset.g === 'views');
    d.open = false;
  });
  S.impEdited = S.recEdited = false;
  update(); toast('Set to normal – add measurements if taken');
}

/* ---------------- NeoMaturity ---------------- */
function nmVals() {
  const o = S, t = ['nm_t1', 'nm_t2', 'nm_t3'].map(k => num(o[k])).filter(v => v != null);
  const gaW = num(o.gaW), gaD = num(o.gaD) || 0;
  const status = o.nm_gaStatus || 'known';
  const ga = gaW != null && status !== 'unknown' ? gaW + gaD / 7 : null;
  return {
    tcds: t, tcd: t.length ? t.reduce((a, b) => a + b, 0) / t.length : null,
    hR: num(o.nm_hR), hL: num(o.nm_hL), ref: o.nm_ref || 'prasad10', status,
    ctx: { dol: I.a.pna, ga, pma: I.a.pma },
    usbdIn: { io: num(o.nm_io), ins: num(o.nm_ins), cs: o.nm_csVis === 'absent' ? 0 : num(o.nm_cs) },
    cgC: num(o.nm_cgC), cgS: num(o.nm_cgS), sulc: o.nm_sulc || ''
  };
}
function nmCompute() {
  const v = nmVals();
  const tcd = v.tcd != null ? tcdEstimate(v.ref, v.tcd, v.ctx) : null;
  const usbd = usbdCalc(v.usbdIn);
  if (usbd.complete && v.ctx.pma != null && v.status !== 'unknown') {
    usbd.pmaIn = v.ctx.pma >= usbd.ref.lo - 1e-6 && v.ctx.pma <= usbd.ref.hi + 1e-6;
  }
  return { v, tcd, usbd };
}
const fmtMm = x => x == null ? '–' : (Math.round(x * 10) / 10).toFixed(1);

function renderMaturity() {
  const { v, tcd, usbd } = nmCompute(), r = TCD_REFS[v.ref], a = I.a;
  $('#nmCtx').innerHTML = `<span>DOB <b>${fmtDate(S.dob)}</b></span><span>Scan <b>${fmtDate(S.scanDate)}</b></span>
    <span>Day of life <b>${a.pna ?? '–'}</b></span><span>GA (clinical) <b>${a.gaTxt}</b></span><span>PMA <b>${a.pmaTxt}</b></span>
    ${a.pna == null ? '<span class="warn">Enter DOB and scan date in Findings → Patient details</span>' : ''}`;

  // A. TCD
  const hemi = v.hR != null && v.hL != null;
  let h = '';
  if (v.tcd == null) h = '<p class="muted small">Enter at least one maximum TCD measurement.</p>';
  else {
    h += `<div class="kv"><span>Mean of ${v.tcds.length} measurement${v.tcds.length > 1 ? 's' : ''}</span><b>${fmtMm(v.tcd)} mm</b></div>`;
    if (v.tcds.length > 1) { const sp = Math.max(...v.tcds) - Math.min(...v.tcds); h += `<div class="kv"><span>Spread between measurements</span><span>${fmtMm(sp)} mm${sp > 2 ? ' <span class="badge z-moderate">re-measure?</span>' : ''}</span></div>`; }
    if (hemi) h += `<div class="kv"><span>Hemispheres R / L</span><span>${fmtMm(v.hR)} / ${fmtMm(v.hL)} mm · difference ${fmtMm(Math.abs(v.hR - v.hL))} mm</span></div>`;
    if (tcd.unavailable) h += `<p class="warn small">${esc(r.note)}</p>`;
    else {
      const est = tcd.est != null ? `${wkTxt(tcd.est)} wk` : '–';
      const rng = tcd.lo != null ? `${tcd.loEdge ? '≤ ' : ''}${wkTxt(tcd.lo)} – ${tcd.hiEdge ? '≥ ' : ''}${wkTxt(tcd.hi)} wk` : null;
      h += `<div class="nm-est"><div class="muted small">Estimated GA · ${esc(r.short)}</div><div class="big">${est}</div>
        ${rng ? `<div class="small">Plausible range (measurement within mean ± 1.96 SD): <b>${rng}</b></div>` : ''}</div>`;
      if (tcd.z != null) h += `<div class="kv"><span>At clinical GA ${a.gaTxt}: expected mean</span><span>${fmtMm(tcd.expected)} mm</span></div>
        <div class="kv"><span>Z-score / centile</span><b>${tcd.z.toFixed(2)} · ${tcd.centile < 1 ? '< 1st' : tcd.centile > 99 ? '> 99th' : Math.round(tcd.centile) + 'th'}${Math.abs(tcd.z) > 1.96 ? ' <span class="badge z-moderate">outside ±1.96 SD</span>' : ''}</b></div>`;
      else if (tcd.expected != null) h += `<div class="kv"><span>Regression value at clinical GA</span><span>${fmtMm(tcd.expected)} mm</span></div>`;
      tcd.flags.forEach(f => h += `<p class="warn small">⚠ ${esc(f)}</p>`);
    }
    if (v.status === 'uncertain') h += '<p class="muted small">GA marked uncertain – z-score is relative to the recorded GA.</p>';
  }
  h += `<p class="credit">${esc(r.method)} ${esc(r.note || '')}<br><a href="${r.url}" target="_blank" rel="noopener">${esc(r.cite)}</a></p>`;
  $('#nmTcdOut').innerHTML = h;
  drawTcdChart(v, tcd);

  // B. USBD
  const it = USBD.items;
  let u = `<table class="tbl nm-tbl"><tr><th>Measure</th><th>Value</th><th>Points</th></tr>${['io', 'ins', 'cs'].map(k => {
    const val = v.usbdIn[k];
    return `<tr><td>${it[k].label}<div class="muted small">${it[k].bands}</div></td><td>${k === 'cs' && S.nm_csVis === 'absent' ? 'Not visible' : val != null ? fmtMm(val) + ' mm' : '–'}</td><td><b>${usbd.parts[k] ?? '–'}</b></td></tr>`;
  }).join('')}</table>`;
  if (usbd.complete) {
    const t = usbd.ref;
    u += `<div class="nm-est"><div class="muted small">USBD total (0–6)</div><div class="big">${usbd.total} / 6</div>
      <div class="small">In the derivation cohort this score was seen at PMA <b>${t.mean} ± ${t.sd} wk</b> (mean ± SD; observed ${t.range}; ${t.n} scans).</div></div>`;
    if (usbd.pmaIn != null) u += `<div class="kv"><span>Infant's PMA ${a.pmaTxt}</span><b>${usbd.pmaIn ? '<span class="badge z-normal">within observed range</span>' : '<span class="badge z-moderate">outside observed range</span>'}</b></div>`;
    if (usbd.total === 6) u += '<p class="warn small">⚠ Score at ceiling (≈ 36 wk) – cannot discriminate older PMAs.</p>';
    if (S.nm_csVis === 'absent' || (v.usbdIn.cs != null && v.usbdIn.cs <= 1)) u += '<p class="warn small">⚠ Cingulate sulcus not yet formed – this item cannot separate earlier PMAs.</p>';
    if (a.pma != null && a.pma > 39.2) u += '<p class="warn small">⚠ PMA beyond the derivation range (23–39 wk).</p>';
    if (num(S.gaW) != null && num(S.gaW) > 32) u += '<p class="warn small">⚠ Score derived in infants born ≤ 32 wk.</p>';
  } else u += '<p class="muted small">Enter all three measurements to calculate the score.</p>';
  u += `<details class="small ref"><summary>Method notes &amp; limitations</summary><ul class="tight">${USBD.notes.map(n => `<li>${n}</li>`).join('')}</ul></details>
    <p class="credit"><a href="${USBD.url}" target="_blank" rel="noopener">${USBD.cite}</a></p>`;
  $('#nmUsbdOut').innerHTML = u;

  // C. visual reference
  $('#nmVisual').innerHTML = `<div class="nm-visual">${MAT_SVG}</div>
    <p class="muted small">Schematic of the midcoronal plane (foramina of Monro). ①–③ are the USBD measurements; ④ cingulate gyrus height is recorded separately (correlates with PMA, R = 0.72 coronal, but no reference values published).</p>
    <button type="button" class="img-btn" id="nmSulcImg"><img src="images/tp-fig04-sulcation.jpg" alt="Sulcation preterm vs term" loading="lazy"><span class="zoom">⤢</span></button>
    <div class="credit">${credit('tp', 4)}</div>
    <ul class="small tight"><li>Cortex smooth in extreme prematurity; sulci begin ~26 wk.</li><li>Cingulate sulcus well seen from ~28 wk; secondary branching ~31–33 wk.</li><li>Term: tortuous, "cobblestone" cingulate region.</li></ul>
    <div class="lref">📖 Sodhi (ed.) <i>Neonatal Ultrasound</i>, Springer 2025 – Ch 1 §1.4.1, Figs 1.26–1.34</div>`;
  $('#nmSulcImg').onclick = () => openViewer([{ img: 'tp-fig04-sulcation', src: 'tp', fig: 4, title: 'Sulcation: preterm vs term', keys: ['A, C preterm – few shallow sulci', 'B, D term – complex branching sulci'] }], 0);

  // Summary
  const rows = [];
  if (tcd && !tcd.unavailable) rows.push(['Transverse cerebellar diameter', `${fmtMm(v.tcd)} mm`,
    tcd.est != null ? `GA ≈ ${wkTxt(tcd.est)} wk${tcd.lo != null ? ` (${wkTxt(tcd.lo)}–${wkTxt(tcd.hi)})` : ''}${tcd.z != null ? ` · z ${tcd.z.toFixed(2)} at clinical GA` : ''}` : 'Outside reference', r.short]);
  if (usbd.complete) rows.push(['USBD (cortical maturation)', `${usbd.total}/6`, `PMA ${usbd.ref.mean} ± ${usbd.ref.sd} wk (observed ${usbd.ref.range})${usbd.pmaIn != null ? (usbd.pmaIn ? ' · consistent with PMA' : ' · not consistent with PMA') : ''}`, 'Stein 2023']);
  if (v.cgC != null || v.cgS != null) rows.push(['Cingulate gyrus height', [v.cgC != null ? `${fmtMm(v.cgC)} mm cor` : '', v.cgS != null ? `${fmtMm(v.cgS)} mm sag` : ''].filter(Boolean).join(' · '), 'Trend only – no reference', '—']);
  if (v.sulc) rows.push(['Sulcation (visual)', v.sulc, 'Qualitative', 'Sodhi 2025']);
  $('#nmSummary').innerHTML = `<h2>Overall interpretation</h2>
    ${rows.length ? rows.map(r => `<div class="nm-row"><div class="nm-m">${r[0]} <span class="nm-src">${r[3]}</span></div><div class="nm-r"><b>${esc(r[1])}</b> → ${esc(r[2])}</div></div>`).join('') : '<p class="muted">No measurements yet.</p>'}
    <p class="nm-warn">Estimates are shown <b>separately</b>. They are <b>not combined</b> into a single GA, and agreement between methods has not been validated. TCD relates to GA at birth (scan early in life); USBD relates to PMA at the time of the scan.</p>`;
}

function drawTcdChart(v, tcd) {
  const cv = $('#nmChart'); if (!cv) return;
  const dpr = window.devicePixelRatio || 1, W = 420, H = 280;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = '100%'; cv.style.maxWidth = W + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
  const m = { l: 36, r: 10, t: 10, b: 30 }, x0 = 22, x1 = 42, y0 = 15, y1 = 60;
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = col('--grid'); ctx.fillStyle = col('--muted'); ctx.font = '10px system-ui'; ctx.lineWidth = 1;
  for (let x = x0; x <= x1; x += 2) { ctx.beginPath(); ctx.moveTo(X(x), Y(y0)); ctx.lineTo(X(x), Y(y1)); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(x, X(x), H - m.b + 13); }
  for (let y = y0; y <= y1; y += 5) { ctx.beginPath(); ctx.moveTo(X(x0), Y(y)); ctx.lineTo(X(x1), Y(y)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(y, m.l - 4, Y(y) + 3); }
  ctx.textAlign = 'center'; ctx.fillText('Gestational age (weeks)', (m.l + W - m.r) / 2, H - 3);
  ctx.save(); ctx.translate(10, (m.t + H - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('TCD (mm)', 0, 0); ctx.restore();
  const rk = v.ref === 'davies' || TCD_REFS[v.ref].loaded === false ? 'prasad10' : v.ref, r = TCD_REFS[rk];
  // band mean ± 1.96 SD
  ctx.beginPath();
  r.ga.forEach((g, i) => ctx.lineTo(X(g), Y(r.mean[i] + 1.96 * r.sd[i])));
  for (let i = r.ga.length - 1; i >= 0; i--) ctx.lineTo(X(r.ga[i]), Y(r.mean[i] - 1.96 * r.sd[i]));
  ctx.closePath(); ctx.fillStyle = col('--zg'); ctx.fill();
  ctx.beginPath(); r.ga.forEach((g, i) => ctx.lineTo(X(g), Y(r.mean[i]))); ctx.strokeStyle = col('--lgreen'); ctx.lineWidth = 2; ctx.stroke();
  if (v.ref === 'davies') {
    const d = TCD_REFS.davies; ctx.beginPath(); ctx.moveTo(X(23), Y(d.eq(23))); ctx.lineTo(X(32), Y(d.eq(32)));
    ctx.strokeStyle = '#6b2fd6'; ctx.setLineDash([5, 3]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  if (v.tcd != null) {
    ctx.strokeStyle = col('--ptR'); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(X(x0), Y(v.tcd)); ctx.lineTo(X(x1), Y(v.tcd)); ctx.stroke(); ctx.setLineDash([]);
    if (tcd && tcd.lo != null) { ctx.fillStyle = 'rgba(29,95,209,.15)'; ctx.fillRect(X(tcd.lo), Y(v.tcd) - 6, X(tcd.hi) - X(tcd.lo), 12); }
    if (tcd && tcd.est != null) { ctx.beginPath(); ctx.moveTo(X(tcd.est), Y(v.tcd) - 9); ctx.lineTo(X(tcd.est) + 7, Y(v.tcd)); ctx.lineTo(X(tcd.est), Y(v.tcd) + 9); ctx.lineTo(X(tcd.est) - 7, Y(v.tcd)); ctx.closePath(); ctx.fillStyle = col('--ptR'); ctx.fill(); }
    if (v.ctx.ga != null) { ctx.beginPath(); ctx.arc(X(Math.min(x1, Math.max(x0, v.ctx.ga))), Y(v.tcd), 5, 0, 7); ctx.fillStyle = col('--acc'); ctx.fill(); }
  }
  $('#nmChartCap').innerHTML = `Green: ${esc(r.short)} mean and ± 1.96 SD${v.ref === 'davies' ? '; purple dashed: Davies 1999 regression' : ''}. Blue line: measured TCD; ◆ estimated GA (blue bar = plausible range)${v.ctx.ga != null ? '; ● clinical GA' : ''}.`;
}

function maturityRows() {
  const { v, tcd, usbd } = nmCompute(), r = TCD_REFS[v.ref], out = [];
  if (v.tcd != null && tcd && !tcd.unavailable) out.push(['Transverse cerebellar diameter',
    `${fmtMm(v.tcd)} mm (mean of ${v.tcds.length})${v.hR != null && v.hL != null ? `; hemispheres R ${fmtMm(v.hR)} / L ${fmtMm(v.hL)} mm` : ''}. Estimated GA ${tcd.est != null ? wkTxt(tcd.est) + ' wk' : 'outside reference'}${tcd.lo != null ? ` (range ${wkTxt(tcd.lo)}–${wkTxt(tcd.hi)})` : ''}${tcd.z != null ? `; z ${tcd.z.toFixed(2)} at clinical GA` : ''} [${r.short}]${tcd.flags.length ? ' – ' + tcd.flags.join(' ') : ''}`]);
  if (usbd.complete) out.push(['USBD (Stein 2023)', `${usbd.total}/6 (IO ${fmtMm(v.usbdIn.io)}, insula ${fmtMm(v.usbdIn.ins)}, cingulate sulcus ${S.nm_csVis === 'absent' ? 'not visible' : fmtMm(v.usbdIn.cs)} mm) – reference PMA ${usbd.ref.mean} ± ${usbd.ref.sd} wk${usbd.pmaIn != null ? (usbd.pmaIn ? '; consistent with PMA' : '; not consistent with PMA') : ''}`]);
  if (v.cgC != null || v.cgS != null) out.push(['Cingulate gyrus height', `${v.cgC != null ? fmtMm(v.cgC) + ' mm coronal ' : ''}${v.cgS != null ? fmtMm(v.cgS) + ' mm sagittal' : ''} (no reference values)`]);
  if (v.sulc) out.push(['Sulcation', v.sulc]);
  return out;
}
function maturityReportHTML() {
  const rows = maturityRows(); if (!rows.length) return '';
  return `<h4>Brain maturation &amp; GA assessment</h4><table class="rt">${rows.map(([k, x]) => `<tr><th>${k}</th><td>${esc(x)}</td></tr>`).join('')}</table>
    <p class="small">Methods reported separately; no combined GA is derived.</p>`;
}
function maturityText() {
  const rows = maturityRows(); if (!rows.length) return '';
  return rows.map(([k, x]) => `  ${k}: ${x}`).join('\n') + '\n  (Methods reported separately; no combined GA derived.)';
}
function maturitySums() {
  const { v, tcd, usbd } = nmCompute();
  const set = (k, t, c = '') => { const el = $(`[data-sum="${k}"]`); if (el) { el.textContent = t; el.className = 'sum ' + c; } };
  set('nm_tcd', tcd && tcd.est != null ? `≈ ${wkTxt(tcd.est)} wk` : v.tcd != null ? fmtMm(v.tcd) + ' mm' : '', tcd && tcd.flags && tcd.flags.length ? 'warn' : 'ok');
  set('nm_usbd', usbd.complete ? `${usbd.total}/6` : '', usbd.pmaIn === false ? 'warn' : 'ok');
  set('nm_add', v.cgC != null || v.cgS != null || v.sulc ? 'Recorded' : '', '');
}

/* =================== Narrative findings & senior review =================== */
const anLabel = (o, k) => { const a = ANATOMY.find(x => x[0] === k); return a[2][+o['an_' + k] || 0]; };
const isNV = (o, k) => NV_LABELS.includes(anLabel(o, k));
const nvTxt = (o, k) => anLabel(o, k).toLowerCase();

function buildNarrative(o, r) {
  const win = o.win || [], views = o.views || [];
  const allAF = VIEW_STEPS.every(v => views.includes(v.id));
  const missing = VIEW_STEPS.filter(v => !views.includes(v.id)).map(v => v.id);
  let tech = 'Examination performed through the anterior fontanelle using coronal and sagittal planes';
  const sup = [win.includes('MF') ? 'mastoid fontanelle' : '', win.includes('PF') ? 'posterior fontanelle' : ''].filter(Boolean);
  if (sup.length) tech += `, with supplementary ${sup.join(' and ')} views`;
  tech += '.';
  if (views.length && !allAF) tech += ` Standard views not obtained: ${missing.join(', ')}.`;
  if (o.quality === 'Limited') tech += ` Image quality limited${o.qualityNote ? ' (' + o.qualityNote + ')' : ''}.`;

  const F = [];
  // ventricles
  if (isNV(o, 'ventricles')) F.push(`Lateral ventricles: ${nvTxt(o, 'ventricles')}.`);
  else if (r.ventDilated) F.push(`Lateral ventricles are dilated (${r.ventZone === 'high' ? 'high-risk zone' : 'above the 97th centile'} for PMA – see measurements).`);
  else {
    const v = +o.an_ventricles || 0;
    F.push(v === 2 ? 'Mild asymmetry of the lateral ventricles, within normal variation.' : v === 3 ? 'Slit-like lateral ventricles.' : v === 1 ? 'Lateral ventricles appear enlarged.' : v === 4 ? 'Lateral ventricles have a ballooned configuration.' : v === 5 ? 'Lateral ventricles have an irregular outline.' : 'Lateral ventricles are normal in size and configuration.');
    if (r.anyVentMeasured && !r.ventDilated) F[F.length - 1] = F[F.length - 1].replace(/\.$/, '; measurements within the reference range for PMA.');
  }
  // GMH-IVH
  if (isNV(o, 'ctg')) F.push(`Germinal matrix / caudothalamic regions: ${nvTxt(o, 'ctg')}.`);
  else if (r.papile === 0) F.push('No germinal matrix or intraventricular haemorrhage identified.');
  else {
    const sd = s => { const p = s === 'R' ? r.papR : r.papL; return p ? `${s === 'R' ? 'right' : 'left'} Papile grade ${['', 'I', 'II', 'III', 'IV'][p]}` : null; };
    F.push(`Germinal matrix–intraventricular haemorrhage: ${[sd('R'), sd('L')].filter(Boolean).join('; ')}.`);
  }
  r.phi.forEach(p => F.push(`Periventricular haemorrhagic infarction on the ${p.side.toLowerCase()}${p.loc.length ? ' (' + p.loc.join('/') + ')' : ''}.`));
  // white matter
  if (isNV(o, 'pvwm')) F.push(`Periventricular white matter: ${nvTxt(o, 'pvwm')}.`);
  else if (r.devries >= 1) F.push(`${DEVRIES[r.devries]}.`);
  else if (r.devries === 0.5) F.push(`Increased periventricular echogenicity${o.pveDays ? ' (present ' + o.pveDays + ' days)' : ''} – requires follow-up.`);
  else if (o.gs_wm === 'blush') F.push('Mild symmetric periventricular echogenicity, less than choroid plexus – in keeping with a physiological appearance.');
  else F.push('Periventricular white matter appears unremarkable.');
  // corpus callosum
  const acc = (o.cong || []).some(c => /corpus callosum/i.test(c));
  if (isNV(o, 'csp')) F.push(`Corpus callosum / cavum septum pellucidum: ${nvTxt(o, 'csp')}.`);
  else if (acc) F.push('Corpus callosum not clearly identified – possible callosal anomaly.');
  else if (+o.an_csp === 2) F.push('Cavum septum pellucidum absent; corpus callosum to be confirmed.');
  else F.push('Corpus callosum appears intact.');
  // basal ganglia
  const echo = o.echo || [];
  if (isNV(o, 'deepgrey')) F.push(`Basal ganglia and thalami: ${nvTxt(o, 'deepgrey')}.`);
  else if (echo.some(e => /thalamic/.test(e))) F.push('Increased echogenicity of the basal ganglia and thalami.');
  else if (echo.some(e => /Lenticulostriate/.test(e))) F.push('Linear echogenic streaks in the basal ganglia (lenticulostriate vasculopathy).');
  else if (+o.an_deepgrey === 3) F.push('Asymmetric basal ganglia / thalami.');
  else if (o.gs_bg === 'pretermBright') F.push('Mildly echogenic basal ganglia, in keeping with prematurity.');
  else F.push('Basal ganglia and thalami appear unremarkable.');
  // parenchyma
  const foc = [r.infarct, ...(o.cysts || []), ...echo.filter(e => /Calcification|Diffusely/.test(e))].filter(Boolean);
  F.push(foc.length ? `Other parenchymal findings: ${foc.join('; ')}.` : 'No focal parenchymal abnormality identified.');
  // posterior fossa
  const mf = win.includes('MF');
  if (isNV(o, 'cerebellum')) F.push(`Posterior fossa: ${nvTxt(o, 'cerebellum')}.`);
  else if (r.cbh !== 'none') F.push(`${CBH[r.cbh]}${o.cbhSide ? ' – ' + o.cbhSide.toLowerCase() : ''}.`);
  else if (+o.an_cerebellum === 2) F.push('Small cerebellum / vermis – possible hypoplasia.');
  else if (+o.an_cerebellum === 4) F.push('Enlarged cisterna magna.');
  else F.push(mf ? 'Cerebellum and posterior fossa appear normal on mastoid fontanelle views.' : 'Posterior fossa appears normal through the anterior fontanelle; mastoid views not obtained – small cerebellar haemorrhage cannot be excluded.');
  // extra-axial
  if (isNV(o, 'extraaxial')) F.push(`Extra-axial spaces: ${nvTxt(o, 'extraaxial')}.`);
  else if ((o.extra || []).length) F.push(`${o.extra.join('; ')}.`);
  else F.push('Extra-axial spaces are normal.');
  if ((o.cong || []).filter(c => !/corpus callosum/i.test(c)).length) F.push(`Congenital: ${o.cong.filter(c => !/corpus callosum/i.test(c)).join('; ')}.`);
  if (r.riTxt) F.push(`Doppler: ${r.riTxt}.`);
  return { tech, findings: F };
}

function seniorFlags(o, r) {
  const f = [];
  if (r.papile) f.push(`Haemorrhage identified (Papile grade ${['', 'I', 'II', 'III', 'IV'][r.papile]})`);
  if (r.ventZone === 'high') f.push('Ventricular measurements in the high-risk zone');
  else if (r.ventZone === 'moderate') f.push('Ventricular measurements above the 97th centile');
  if (o.gs_vent === 'dilated' && !r.anyVentMeasured) f.push('Ventricles look enlarged but have not been measured');
  measWarnings(o).forEach(w => f.push(w));
  if (r.devries >= 0.5) f.push('Pathological periventricular echogenicity / cysts');
  if (r.cbh !== 'none') f.push('Cerebellar haemorrhage');
  if ((o.echo || []).some(e => /thalamic|Diffusely/.test(e))) f.push('Abnormal basal ganglia / parenchymal echogenicity');
  if (r.infarct) f.push('Possible infarction');
  if (r.cong.length) f.push('Possible congenital anomaly');
  if ((o.extra || []).some(e => /Subdural|Subarachnoid/.test(e))) f.push('Extra-axial collection / haemorrhage');
  if (r.v3Abn) f.push('Dilated 3rd ventricle');
  if (+o.an_cerebellum === 4 || +o.an_cerebellum === 2 || r.cmAbn) f.push('Posterior fossa abnormality');
  if (r.riTxt && !/^Normal/.test(r.riTxt)) f.push('Abnormal Doppler');
  if (r.notAssessed.length) f.push(`Limited study – ${r.notAssessed.map(x => x.t.toLowerCase()).join(', ')} not adequately assessed`);
  const missV = VIEW_STEPS.filter(v => o['gv_' + v.id] === 'no').map(v => v.id);
  if (missV.length) f.push(`Standard views not obtained: ${missV.join(', ')}`);
  return f;
}

function measWarnings(o) {
  const w = [];
  [['vi', 'VI'], ['ahw', 'AHW'], ['tod', 'TOD']].forEach(([k, L]) => ['R', 'L'].forEach(s => {
    const v = num(o[k + s]); if (v == null) return;
    const [lo, hi] = MEAS_RANGE[k];
    if (v <= 0) w.push(`${L} ${s}: invalid value`);
    else if (v < lo) w.push(`${L} ${s} ${v} mm is unusually small – check units (mm, not cm) and calliper placement`);
    else if (v > hi) w.push(`${L} ${s} ${v} mm is unusually large – check units and calliper placement`);
  }));
  return w;
}

/* ========================== Beginner Mode wizard ========================== */
const WZ_STEPS = ['Patient information', 'Scanning technique', 'Standard views', 'Measurements', 'Findings', 'Impression and report'];
let wzStep = 0, wzView = 0;

function setK(k, v) {
  const el = $(`#form [data-k="${k}"], #nmForm [data-k="${k}"]`);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
}
function setG(g, val, on) {
  const el = $(`#form [data-g="${g}"][value="${CSS.escape(val)}"]`);
  if (el) el.checked = !!on;
}
function gHas(g, val) { return (S[g] || []).includes(val); }

function applyStructure(key, val, side) {
  const nvMap = { nv: 'Not visualised', na: 'Not assessed', lim: 'Limited view' };
  const anOf = { gs_vent: 'ventricles', gs_wm: 'pvwm', gs_cc: 'csp', gs_bg: 'deepgrey', gs_pf: 'cerebellum', gs_ext: 'extraaxial' };
  if (key === 'gs_gmh') {
    const s = side; setK('gs_gmh' + s, val);
    if (nvMap[val]) { setK('ivh' + s, 'none'); setK('vd' + s, false); }
    else {
      setK('ivh' + s, { none: 'none', gmh: 'gmh', ivh: 'ivh50', ivhd: 'ivh50plus' }[val]);
      setK('vd' + s, val === 'ivhd');
    }
    const r = $('#form [data-k="gs_gmhR"]').value, l = $('#form [data-k="gs_gmhL"]').value;
    const nvs = [r, l].find(x => nvMap[x]);
    setK('an_ctg', nvs ? anIdx('ctg', nvMap[nvs]) : 0);
    return;
  }
  setK(key, val);
  const an = anOf[key];
  if (nvMap[val]) { setK('an_' + an, anIdx(an, nvMap[val])); }
  else setK('an_' + an, 0);
  if (key === 'gs_vent') setK('an_ventricles', { normal: 0, asym: 2, slit: 3, dilated: 1 }[val] ?? +$('#form [data-k="an_ventricles"]').value);
  if (key === 'gs_wm') {
    if (val === 'pve') { setK('pve', 'eq'); setK('pvlCysts', 'none'); }
    else if (/^cyst/.test(val)) { setK('pve', 'gt'); setK('pvlCysts', { cystL: 'localised', cystE: 'periventricular', cystS: 'subcortical' }[val]); }
    else { setK('pve', 'none'); setK('pvlCysts', 'none'); }
  }
  if (key === 'gs_cc') {
    setG('cong', 'Agenesis / dysgenesis of corpus callosum', val === 'ccAbn');
    if (val === 'csp0') setK('an_csp', 2);
  }
  if (key === 'gs_bg') {
    setG('echo', 'Increased thalamic / basal ganglia echogenicity', val === 'bright');
    setG('echo', 'Lenticulostriate vasculopathy', val === 'lsv');
    if (val === 'asym') setK('an_deepgrey', 3);
  }
  if (key === 'gs_pf') {
    setK('cbh', ['punctate', 'limited', 'massive'].includes(val) ? val : 'none');
    if (val === 'small') setK('an_cerebellum', 2);
    if (val === 'bigCM') setK('an_cerebellum', 4);
    if (val === 'normalMF') setG('win', 'MF', true);
  }
  if (key === 'gs_ext') {
    setG('extra', 'Enlarged extra-axial space', val === 'wide');
    setG('extra', 'Subdural haemorrhage / collection', val === 'coll');
  }
}

function stepDone(i) {
  const o = S;
  if (i === 0) return !!(o.gaW && o.dob && o.scanDate && (o.ind || []).length);
  if (i === 1) return TECH_CHECK.every(t => o[t[0]] === '1') && !!o.quality;
  if (i === 2) return VIEW_STEPS.every(v => o['gv_' + v.id]);
  if (i === 3) return o.wz_meas === 'skip' || ['viR', 'viL'].every(k => num(o[k]) != null);
  if (i === 4) return STRUCTURES.every(st => st.perSide ? o.gs_gmhR && o.gs_gmhL : o[st.k]) && !!o.wz_other;
  if (i === 5) return o.wz_done === '1';
}

function wzProgress() {
  const n = WZ_STEPS.filter((_, i) => stepDone(i)).length;
  return `<div class="wz-prog card">
    <div class="wz-prog-head"><b>EXAMINATION PROGRESS</b><span>${n}/6</span></div>
    <div class="wz-bar"><span style="width:${n / 6 * 100}%"></span></div>
    <ol class="wz-steps">${WZ_STEPS.map((t, i) => `<li class="${stepDone(i) ? 'done' : ''} ${i === wzStep ? 'cur' : ''}"><button type="button" data-wzgo="${i}"><span class="dot">${stepDone(i) ? '✓' : i + 1}</span>${t}</button></li>`).join('')}</ol>
  </div>`;
}

const inp = (k, label, type = 'text', extra = '') => `<label>${label}<input data-proxy="${k}" type="${type}" value="${esc(S[k] ?? '')}" ${extra}></label>`;
const choice = (k, val, label, desc, sev, cur, side = '') => `<button type="button" class="opt sev-${sev} ${cur === val ? 'on' : ''}" data-struct="${k}" data-val="${val}" ${side ? `data-side="${side}"` : ''}>
  <span class="opt-r"></span><span><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</span></button>`;

function wzFlagsBox() {
  const f = seniorFlags(S, I);
  return f.length ? `<div class="senior"><b>⚑ Senior review recommended</b><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
}

function wzStepHTML() {
  const o = S, a = I.a;
  switch (wzStep) {
  case 0: return `
    <p class="wz-lead">Enter the basic information before starting the examination.</p>
    <div class="grid">${inp('name', 'Name')}${inp('mrn', 'MRN')}${inp('dob', 'Date of birth', 'date')}${inp('scanDate', 'Scan date', 'date')}
      ${inp('gaW', 'GA at birth – weeks', 'number', 'inputmode="numeric" min="22" max="44"')}${inp('gaD', '+ days', 'number', 'inputmode="numeric" min="0" max="6"')}
      ${inp('bw', 'Birth weight (g)', 'number', 'inputmode="numeric"')}</div>
    <div id="wzAge" class="wz-summary"></div>
    <div class="sub">Indication (tap all that apply)</div>
    <div class="chips-wrap">${INDICATIONS.map(([v, t]) => `<button type="button" class="chipb ${gHas('ind', v) ? 'on' : ''}" data-tg="ind" data-v="${v}">${t}</button>`).join('')}</div>`;
  case 1: return `
    <p class="wz-lead">Check each item before you start scanning.</p>
    <div class="checklist">${TECH_CHECK.map(([k, t]) => `<button type="button" class="chk ${o[k] === '1' ? 'on' : ''}" data-tk="${k}"><span class="box">${o[k] === '1' ? '✓' : ''}</span>${t}</button>`).join('')}</div>
    <div class="grid">${inp('probe', 'Probe used')}${inp('machine', 'Machine')}</div>
    <div class="sub">Image quality</div>
    <div class="opts row">${['Optimal', 'Adequate', 'Limited'].map(q => `<button type="button" class="opt ${o.quality === q ? 'on' : ''}" data-set="quality" data-val="${q}"><span class="opt-r"></span><b>${q}</b></button>`).join('')}</div>
    ${o.quality === 'Limited' ? inp('qualityNote', 'Why is it limited? (e.g. small fontanelle, unsettled baby)') : ''}
    <details class="tipbox"><summary>Why these settings matter</summary><ul class="tight small"><li>Higher frequency = sharper image but less depth.</li><li>Over-gain hides haemorrhage and creates false bright white matter.</li><li>Pressing hard on the fontanelle changes Doppler values.</li></ul><button type="button" class="btn ghost sm" data-learn="1">Open Learn step: depth & gain</button></details>`;
  case 2: {
    const v = VIEW_STEPS[wzView];
    const list = VIEW_STEPS.map((x, i) => `<button type="button" class="vchip ${o['gv_' + x.id] === 'yes' ? 'ok' : o['gv_' + x.id] === 'no' ? 'no' : ''} ${i === wzView ? 'cur' : ''}" data-vi="${i}">${x.id}</button>`).join('');
    const extra = EXTRA_VIEWS.map(x => `
      <details class="card xview"><summary><b>${x.title}</b> <span class="sum ${o['gv_' + x.id] === 'yes' ? 'ok' : ''}">${o['gv_' + x.id] === 'yes' ? 'Done' : o['gv_' + x.id] === 'no' ? 'Skipped' : 'Optional'}</span></summary>
        <p class="small">${x.why}</p>
        ${x.img ? `<button type="button" class="img-btn" data-img="${x.img}" data-src="${x.src}" data-fig="${x.fig}" data-t="${esc(x.title)}"><img src="images/${x.img}.jpg" alt="" loading="lazy"><span class="zoom">⤢</span></button>${credit(x.src, x.fig) ? `<div class="credit">${credit(x.src, x.fig)}</div>` : ''}` : ''}
        <p class="small"><b>Probe:</b> ${x.probe}</p>
        <div class="sub">Identify</div><ul class="tight small">${x.find.map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="sub">Check</div><ul class="tight small">${x.check.map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="vbtns"><button type="button" class="btn ok" data-xv="${x.id}" data-st="yes">✓ Obtained</button><button type="button" class="btn ghost" data-xv="${x.id}" data-st="no">Skip</button></div>
      </details>`).join('');
    const done = VIEW_STEPS.filter(x => o['gv_' + x.id]).length;
    return `
    <p class="wz-lead">Anterior fontanelle – ${done}/${VIEW_STEPS.length} views recorded. Work through each view; tap a chip to jump.</p>
    <div class="vchips">${list}</div>
    <div class="card vcard2">
      <div class="vhead"><span class="gtag ${v.plane === 'cor' ? 'coronal' : 'sagittal'}">${v.group}</span><h3>${v.title}</h3></div>
      <button type="button" class="img-btn" data-img="${v.img}" data-src="${v.src}" data-fig="${v.fig}" data-t="${esc(v.title)}"><img src="images/${v.img}.jpg" alt="Reference ${v.title}" loading="lazy"><span class="zoom">⤢</span></button>
      <div class="credit">Reference image – ${v.panel}${credit(v.src, v.fig) ? ' · ' + credit(v.src, v.fig) : ''}</div>
      ${v.extra ? `<button type="button" class="link-btn" data-img="${v.extra}" data-src="${v.extraSrc || (v.extra.startsWith('tp') ? 'tp' : 'lc')}" data-fig="${v.extraFig ?? (v.extra.startsWith('tp') ? 2 : 0)}" data-t="${esc(v.title)} – additional reference">+ another reference image</button>` : ''}
      <div class="probe-row">${probeSVG(v.plane, v.tilt, v.id)}<div><div class="sub">Probe orientation</div><p class="small">${v.probe}</p></div></div>
      <div class="sub">Identify these structures</div>
      <ul class="tight small">${v.find.map(t => `<li>${t}</li>`).join('')}</ul>
      <div class="sub">Quick checklist</div>
      <ul class="cl small">${v.check.map(t => `<li>☐ ${t}</li>`).join('')}</ul>
      <div class="vbtns"><button type="button" class="btn ok" data-vs="yes">✓ Image obtained</button><button type="button" class="btn ghost" data-vs="no">✗ Not obtained</button></div>
      ${o['gv_' + v.id] ? `<p class="small muted">Recorded: <b>${o['gv_' + v.id] === 'yes' ? 'obtained' : 'not obtained'}</b></p>` : ''}
    </div>
    <div class="sub">Additional modules</div>${extra}`;
  }
  case 3: return `
    <p class="wz-lead">Freeze the right image, place callipers as shown, then enter values in millimetres.</p>
    ${['VI', 'AHW', 'TOD'].map(m => { const c = CALIPER[m], k = m.toLowerCase(); return `
      <div class="card mcard">
        <h3>${c.title}</h3><div class="muted small">${c.plane}</div>
        <details class="calguide"><summary>How to place the callipers</summary>
          <div class="cal-wrap">${c.svg}</div><ol class="small tight">${c.steps.map(s => `<li>${s}</li>`).join('')}</ol>
          <button type="button" class="link-btn" data-img="${c.img}" data-src="${c.src || 'lc'}" data-fig="0" data-t="${c.title} – real example">See a real example</button></details>
        <div class="lr2">${inp(k + 'R', 'Right (mm)', 'number', 'step="0.1" inputmode="decimal"')}${inp(k + 'L', 'Left (mm)', 'number', 'step="0.1" inputmode="decimal"')}</div>
      </div>`; }).join('')}
    <div class="grid">${inp('v3', '3rd ventricle (mm) – optional', 'number', 'step="0.1" inputmode="decimal"')}${inp('hc', 'Head circumference (cm)', 'number', 'step="0.1" inputmode="decimal"')}</div>
    <div id="wzMeasOut"></div>
    <button type="button" class="chk ${o.wz_meas === 'skip' ? 'on' : ''}" data-measskip="1"><span class="box">${o.wz_meas === 'skip' ? '✓' : ''}</span>Ventricles look normal – measurements not taken this scan</button>`;
  case 4: return `
    <p class="wz-lead">Pick the description closest to what you see. If you cannot assess a structure, say so – do not choose "normal".</p>
    ${STRUCTURES.map(st => {
      const exBtn = `<button type="button" class="link-btn" data-abn="${st.atlas}">📷 What does abnormal look like?</button>`;
      const nvRow = side => `<div class="nvrow">${NV_OPTS.map(([v, l]) => `<button type="button" class="nvb ${(side ? o[st.k + side] : o[st.k]) === v ? 'on' : ''}" data-struct="${st.k}" data-val="${v}" ${side ? `data-side="${side}"` : ''}>${l}</button>`).join('')}</div>`;
      if (st.perSide) return `<div class="card scard"><h3>${st.title}</h3><div class="muted small">Look: ${st.where}</div>${exBtn}
        <div class="sides">${['R', 'L'].map(sd => `<div><div class="side-h">${sd === 'R' ? 'Right' : 'Left'}</div>
          <div class="opts">${st.opts.map(([v, l, d, sev]) => choice(st.k, v, l, d, sev, o[st.k + sd], sd)).join('')}</div>
          <button type="button" class="chk sm ${o['phi' + sd] ? 'on' : ''}" data-phi="${sd}"><span class="box">${o['phi' + sd] ? '✓' : ''}</span>Plus bright area in the white matter beside it (PVHI)</button>
          ${nvRow(sd)}</div>`).join('')}</div></div>`;
      return `<div class="card scard"><h3>${st.title}</h3><div class="muted small">Look: ${st.where}</div>${exBtn}
        <div class="opts">${st.opts.map(([v, l, d, sev]) => choice(st.k, v, l, d, sev, o[st.k])).join('')}</div>
        ${st.k === 'gs_wm' && o.gs_wm === 'pve' ? inp('pveDays', 'How many days has it been present?', 'number', 'inputmode="numeric"') : ''}
        ${st.k === 'gs_pf' && ['punctate', 'limited', 'massive'].includes(o.gs_pf) ? `<label>Side<select data-proxy="cbhSide">${['', 'Right hemisphere', 'Left hemisphere', 'Bilateral', 'Vermis'].map(x => `<option ${o.cbhSide === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
        ${nvRow()}</div>`;
    }).join('')}
    <div class="card scard"><h3>Anything else?</h3>
      <div class="opts row">${choice('wz_other', 'none', 'Nothing else seen', '', 'ok', o.wz_other)}${choice('wz_other', 'yes', 'Yes – record it', '', 'warn', o.wz_other)}</div>
      ${o.wz_other === 'yes' ? `
        <div class="sub">Cysts</div><div class="chips-wrap">${['Choroid plexus cyst', 'Subependymal (germinolytic) pseudocyst', 'Connatal (coarctation) cysts', 'Porencephalic cyst', 'Arachnoid cyst'].map(c => `<button type="button" class="chipb ${gHas('cysts', c) ? 'on' : ''}" data-tg="cysts" data-v="${c}">${c}</button>`).join('')}</div>
        <div class="sub">Other</div><div class="chips-wrap">${['Calcification', 'Diffusely increased parenchymal echogenicity (loss of grey-white differentiation)'].map(c => `<button type="button" class="chipb ${gHas('echo', c) ? 'on' : ''}" data-tg="echo" data-v="${c}">${c.replace(/ \(.*/, '')}</button>`).join('')}</div>
        <label>Infarction<select data-proxy="infarct">${['', 'Arterial ischaemic stroke – MCA main branch', 'Arterial ischaemic stroke – cortical branch', 'Lenticulostriate (perforator) infarct', 'Watershed injury', 'Venous infarction / sinovenous thrombosis'].map(x => `<option value="${x}" ${o.infarct === x ? 'selected' : ''}>${x || 'None'}</option>`).join('')}</select></label>
        <div class="sub">Congenital</div><div class="chips-wrap">${['Holoprosencephaly', 'Dandy–Walker malformation', 'Vermian hypoplasia', 'Chiari II malformation', 'Congenital hydrocephalus (e.g. aqueductal stenosis)'].map(c => `<button type="button" class="chipb ${gHas('cong', c) ? 'on' : ''}" data-tg="cong" data-v="${c}">${c.replace(/ \(.*/, '')}</button>`).join('')}</div>
        <label>Describe briefly<textarea data-proxy="notes" rows="2">${esc(o.notes || '')}</textarea></label>` : ''}
    </div>
    <div id="wzFlags5"></div>`;
  case 5: {
    const nar = buildNarrative(o, I);
    return `
    <div id="wzFlags6"></div>
    <div class="card rep-prev">
      <div class="rp-title">NEONATAL CRANIAL ULTRASOUND REPORT</div>
      <p><b>Technique:</b> ${esc(nar.tech)}</p>
      <p><b>Findings:</b></p><ul>${nar.findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <p><b>Impression:</b></p><div class="imp-box">${esc($('#impression').value).replace(/\n/g, '<br>')}</div>
      <p><b>Recommendation:</b></p><div class="imp-box">${esc($('#recommendation').value).replace(/\n/g, '<br>')}</div>
    </div>
    <div class="grid">${inp('reporter', 'Your name')}${inp('designation', 'Designation')}</div>
    <div class="vbtns"><button type="button" class="btn ok" data-final="1">${o.wz_done === '1' ? '✓ Reviewed' : 'I have reviewed this report'}</button><button type="button" class="btn ghost" data-goto2="report">Edit / share report →</button></div>
    <p class="muted small">Decision support only. A senior must verify abnormal or limited studies.</p>`;
  }
  }
}

function wzRender() {
  const w = $('#wizard'); if (!w || w.hidden) return;
  w.innerHTML = `${wzProgress()}
    <div class="card wz-card"><div class="wz-step">STEP ${wzStep + 1} OF 6 · ${WZ_STEPS[wzStep].toUpperCase()}</div><h2>${WZ_STEPS[wzStep]}</h2>${wzStepHTML()}</div>
    <div class="wz-nav"><button type="button" class="btn ghost" data-wznav="-1" ${wzStep === 0 ? 'disabled' : ''}>‹ Back</button>
      <button type="button" class="btn" data-wznav="1">${wzStep === 5 ? 'Open report ›' : 'Next: ' + WZ_STEPS[wzStep + 1] + ' ›'}</button></div>`;
  wzLive();
}

function wzLive() {
  const a = I.a;
  const age = $('#wzAge');
  if (age) age.innerHTML = `<div><span>Gestational age</span><b>${S.gaW ? `${S.gaW} weeks + ${S.gaD || 0} days` : '–'}</b></div>
    <div><span>Postnatal age</span><b>${a.pna != null ? 'DOL ' + a.pna : '–'}</b></div>
    <div><span>PMA today</span><b>${a.pmaTxt}</b></div>
    <div><span>Birth weight</span><b>${S.bw ? S.bw + ' g' : '–'}</b></div>
    <div><span>Indication</span><b>${(S.ind || []).length ? esc(indText(S)) : '–'}</b></div>`;
  const mo = $('#wzMeasOut');
  if (mo) {
    const w = measWarnings(S);
    mo.innerHTML = (w.length ? `<div class="warnbox">${w.map(x => `<div>⚠ ${esc(x)}</div>`).join('')}</div>` : '') +
      `<div class="card"><h3>Reference for PMA ${a.pmaTxt}</h3>${renderVentTable(I, false)}
       ${I.ventZone && I.ventZone !== 'normal' ? `<div class="senior"><b>⚑ Senior review recommended</b><div class="small">Measurement above the 97th centile${I.ventZone === 'high' ? ' (high-risk zone)' : ''}. The app does not diagnose or recommend treatment from measurements alone.</div></div>` : ''}
       <button type="button" class="btn ghost sm" id="wzAddSeries">+ Add to serial PHVD chart</button></div>`;
    $('#wzAddSeries').onclick = () => { addToSeries(); };
  }
  ['#wzFlags5', '#wzFlags6'].forEach(id => { const el = $(id); if (el) el.innerHTML = wzFlagsBox() || (id === '#wzFlags6' ? '<div class="okbox">No senior-review triggers identified.</div>' : ''); });
  const pg = $('.wz-prog'); if (pg) pg.outerHTML = wzProgress();
}

function openAbn(id) {
  const e = ABN_ATLAS.find(x => x.id === id); if (!e) return;
  const keys = [...e.looks, `Where: ${e.where}`, `Grade: ${e.grade}`, ...e.pitfalls.map(p => 'Pitfall: ' + p), `Senior review: ${e.senior}`];
  openViewer(e.imgs.map(([img, src, fig, cap]) => ({ img, src, fig, title: `${e.title} – ${cap}`, keys })), 0);
}

function initWizard() {
  const w = $('#wizard');
  const mode = () => settings.mode || 'beginner';
  const applyMode = () => {
    $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode()));
    w.hidden = mode() !== 'beginner'; $('#form').hidden = mode() === 'beginner';
    if (!w.hidden) wzRender();
  };
  $$('#modeSeg button').forEach(b => b.onclick = () => { settings.mode = b.dataset.mode; store(LS_SET, settings); applyMode(); window.scrollTo({ top: 0 }); });
  const act = () => { update(); wzRender(); };
  w.addEventListener('input', e => {
    const k = e.target.dataset.proxy; if (!k) return;
    setK(k, e.target.value); update(); wzLive();
  });
  w.addEventListener('change', e => { if (e.target.tagName === 'SELECT' && e.target.dataset.proxy) { setK(e.target.dataset.proxy, e.target.value); act(); } });
  w.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.wzgo) { wzStep = +d.wzgo; wzRender(); window.scrollTo({ top: 0 }); }
    else if (d.wznav) {
      if (+d.wznav > 0 && wzStep === 5) return showTab('report');
      wzStep = Math.max(0, Math.min(5, wzStep + +d.wznav)); wzRender(); window.scrollTo({ top: 0 });
    }
    else if (d.tg) { setG(d.tg, d.v, !gHas(d.tg, d.v)); act(); }
    else if (d.tk) { setK(d.tk, S[d.tk] === '1' ? '' : '1'); act(); }
    else if (d.set) { setK(d.set, d.val); act(); }
    else if (d.vi) { wzView = +d.vi; wzRender(); }
    else if (d.vs) {
      const v = VIEW_STEPS[wzView]; setK('gv_' + v.id, d.vs); setG('views', v.id, d.vs === 'yes'); setG('win', 'AF', true);
      update(); if (wzView < VIEW_STEPS.length - 1) wzView++; wzRender();
      $('.vcard2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    else if (d.xv) { setK('gv_' + d.xv, d.st); setG('win', d.xv, d.st === 'yes'); act(); }
    else if (d.img) openViewer([{ img: d.img, src: d.src, fig: +d.fig, title: d.t, keys: [] }], 0);
    else if (d.abn) openAbn(d.abn);
    else if (d.struct) {
      if (d.struct === 'wz_other') { setK('wz_other', d.val); act(); return; }
      applyStructure(d.struct, d.val, d.side); act();
    }
    else if (d.phi) { setK('phi' + d.phi, !S['phi' + d.phi]); act(); }
    else if (d.measskip) { setK('wz_meas', S.wz_meas === 'skip' ? '' : 'skip'); act(); }
    else if (d.final) { setK('wz_done', '1'); act(); }
    else if (d.goto2) showTab(d.goto2);
    else if (d.learn) { showTab('guide'); }
  });
  applyMode();
}

/* ---------------- Update cycle ---------------- */
let saveTimer;
function update() {
  S = readForm();
  I = interpret(S);
  renderAges(); renderVentLive(); renderSums(); maturitySums();
  if (!S.impEdited) { S.impression = buildImpression(S, I); $('#impression').value = S.impression; }
  if (!S.recEdited) { S.recommendation = buildRecommendation(S, I); $('#recommendation').value = S.recommendation; }
  const active = $('.bottom-nav .active')?.dataset.tab;
  if (active === 'interp') { renderInterp(); renderSeries(); }
  if (active === 'report') renderReport();
  if (active === 'mature') renderMaturity();
  if (active === 'findings' && !$('#wizard').hidden) wzLive();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => store(LS_CASE, S), 300);
}

function showTab(t) {
  $$('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $$('.tab-panel').forEach(p => p.hidden = p.id !== 'tab-' + t);
  if (t === 'interp') { renderInterp(); renderSeries(); }
  if (t === 'report') renderReport();
  if (t === 'mature') renderMaturity();
  if (t === 'findings') wzRender();
  window.scrollTo({ top: 0 });
  document.body.dataset.tab = t;
  try { history.replaceState(null, '', '#' + t); } catch {}
}

function newCase() {
  if (!confirm('Start a new case? Unsaved changes to the current case will be cleared (PHVD series are kept).')) return;
  S = { reporter: settings.rep, designation: settings.des, scanDate: new Date().toISOString().slice(0, 10) };
  writeForm(S); S.impEdited = S.recEdited = false; update(); showTab('findings');
}

/* ---------------- Utilities ---------------- */
function download(name, text, type = 'text/plain') {
  const blob = new Blob([text], { type }); const u = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: u, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
}
const fileBase = () => `CUS_${(S.mrn || 'case').replace(/\W+/g, '')}_${S.scanDate || 'undated'}`;

/* ---------------- Init ---------------- */
function init() {
  buildForm();
  $('#guideTips').innerHTML = GUIDE_TIPS.map(t => `<li>${t}</li>`).join('');
  $('#guideRefs').innerHTML = GUIDE_REFS.map(t => `<li>${t}</li>`).join('');
  renderLearn(); renderViews(); renderAtlas(); renderCredits(); initViewer();
  $$('#guideMode button').forEach(b => b.onclick = () => {
    $$('#guideMode button').forEach(x => x.classList.toggle('on', x === b));
    $('#guideLearn').hidden = b.dataset.m !== 'learn'; $('#guideViews').hidden = b.dataset.m !== 'views'; $('#guideAtlas').hidden = b.dataset.m !== 'atlas'; $('#guideTech').hidden = b.dataset.m !== 'tech';
    window.scrollTo({ top: 0 });
  });

  const saved = load(LS_CASE, null);
  if (saved) { writeForm(saved); S = saved; }
  else { S = { reporter: settings.rep, designation: settings.des, scanDate: new Date().toISOString().slice(0, 10) }; writeForm(S); }

  $('#form').addEventListener('input', update);
  $('#form').addEventListener('change', update);
  $('#nmForm').addEventListener('input', update);
  $('#nmForm').addEventListener('change', update);
  $('#nmRef').innerHTML = Object.entries(TCD_REFS).map(([k, r]) => `<option value="${k}" ${r.loaded === false ? 'disabled' : ''}>${r.name}</option>`).join('');
  $$('.bottom-nav button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $('#btnNormal').onclick = setNormal;
  $$('[data-goto]').forEach(b => b.onclick = () => showTab(b.dataset.goto));
  $('#allViews').onclick = () => { $$('[data-g="views"]').forEach(c => c.checked = true); update(); };

  $('#impression').addEventListener('input', e => { S.impression = e.target.value; S.impEdited = true; store(LS_CASE, S); renderReport(); });
  $('#recommendation').addEventListener('input', e => { S.recommendation = e.target.value; S.recEdited = true; store(LS_CASE, S); renderReport(); });
  $('#btnRegen').onclick = () => { S.impEdited = S.recEdited = false; update(); renderReport(); toast('Regenerated from findings'); };

  $('#btnPrint').onclick = () => { renderReport(); window.print(); };
  $('#btnShare').onclick = async () => {
    const text = reportText();
    if (navigator.share) { try { await navigator.share({ title: 'Cranial US report' + (S.mrn ? ' – ' + S.mrn : ''), text }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); toast('Report copied'); } catch { download(fileBase() + '.txt', text); } }
  };
  $('#btnCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(reportText()); toast('Report copied'); }
    catch { download(fileBase() + '.txt', reportText()); }
  };
  $('#btnTxt').onclick = () => download(fileBase() + '.txt', reportText());
  $('#btnSave').onclick = () => download(fileBase() + '.json', JSON.stringify({ app: 'NeoCranial', v: 1, case: S }, null, 2), 'application/json');
  $('#fileLoad').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t); const c = d.case || d;
      writeForm(c); S = c; update(); showTab('findings'); toast('Case loaded');
    }).catch(() => toast('Could not read file')).finally(() => e.target.value = '');
  };
  $('#addSeries').onclick = addToSeries;
  $('#btnNew').onclick = newCase;

  const dlg = $('#settingsDlg');
  $('#btnSettings').onclick = () => {
    $('#setHosp').value = settings.hosp; $('#setDept').value = settings.dept;
    $('#setRep').value = settings.rep; $('#setDes').value = settings.des; dlg.showModal();
  };
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'ok') return;
    settings = { hosp: $('#setHosp').value, dept: $('#setDept').value, rep: $('#setRep').value, des: $('#setDes').value };
    store(LS_SET, settings); renderReport(); toast('Settings saved');
  });

  update();
  initWizard();
  const h = location.hash.slice(1);
  showTab(['guide', 'findings', 'interp', 'report', 'mature'].includes(h) ? h : 'findings');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// expose for testing
window.NeoCUS = { interpret, buildImpression, buildRecommendation, ages };
document.addEventListener('DOMContentLoaded', init);
})();
