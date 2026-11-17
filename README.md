# NeoCranial USG – Neonatal Cranial Ultrasound

<img src="icons/icon-192.png" width="96" alt="NeoCranial USG icon">

**Live app:** https://anncheng1.github.io/NeoCranial/

Offline-capable web app (PWA) for neonatal cranial ultrasound, built for the NICU & Special Care Nursery, Hospital Miri.

## Four components
1. **Scanning guide** – a **15-step Learn path** (prepare → depth → gain/TGC → coronal → sagittal → supplementary windows → quality rules → maturation → measurements → Doppler RI → PVE → haemorrhage grading → cysts → term HIE → documentation) with unit teaching images, quick self-checks and saved progress; plus real ultrasound images of the standard coronal C1–C6, sagittal S1–S3 and mastoid views with panel keys, plus an **image atlas** of 27 normal variants and abnormalities (GMH-IVH grades, PVHI, PVL, cerebellar haemorrhage, HIE, stroke, cysts, congenital). Tap to zoom; swipe between images. See [IMAGE_CREDITS.md](IMAGE_CREDITS.md).
2. **Findings** – structured pro forma: patient details (auto PNA / PMA), indication, technique, views obtained, brain anatomy checklist, abnormalities (GMH-IVH, PVHI, ventricular measurements, white matter injury, cerebellum, cysts, echogenicity, infarction, congenital, extra-axial, Doppler).
3. **Interpretation** – automatic classification:
   - Papile grade I–IV per side (with Volpe equivalent)
   - VI / AHW / TOD against PMA reference → normal / moderate-risk / high-risk zone (El-Dib 2020 risk-zone tool, Brouwer data)
   - Periventricular haemorrhagic infarction
   - White matter injury / cystic PVL (de Vries grade I–IV)
   - Cerebellar haemorrhage (punctate / limited / massive)
   - **PHVD monitoring** – serial VI, AHW, TOD plotted on risk-zone charts per MRN (CSV export)
5. **NeoMaturity – Brain Maturation & GA Assessment** (Maturity tab)
   - **Transverse cerebellar diameter:** right/left hemisphere, up to 3 maximum TCD readings (mean used). Plotted on a GA growth chart (mean ± 1.96 SD) with estimated GA, plausible range, and z-score/centile at the clinical GA. Selectable references: Prasad 2025 (≤ 10 d or ≤ 21 d, 22–40 wk), Davies 1999 regression (23–32 wk), Imamoglu 2013 (slot – published values must be entered; not open access). Warns if day of life exceeds the reference window.
   - **Ultrasound Score of Brain Development (Stein 2023):** interopercular opening, insular height, cingulate sulcus depth → 0–6 score with the published PMA for that score; flags ceiling (≈ 36 wk) and absent sulcus.
   - **Additional markers:** cingulate gyrus height (trend only, no reference values), visual sulcation stage, measurement schematic.
   - Each method is shown separately with its source. **No combined GA is generated**; concordance is not claimed.
4. **Report generator** – formatted A4 report (patient details → recommendation) with auto-generated, editable impression and recommendation. Print / save PDF, copy text, download .txt, save/load case (.json).

## Beginner Mode (default) – guided 6-step examination
Designed for junior doctors with little or no CUS experience. Switch to **Experienced – full form** at any time; both modes share the same record.

1. **Patient information** – GA, DOL, PMA and birth weight calculated and summarised; tap-to-select indication.
2. **Scanning technique** – pre-scan checklist (baby, gel, probe, preset, gain, labelling) and image quality.
3. **Standard views** – C1–C6, S1, S2/S3 right & left, each with reference image, probe-orientation drawing, structures to identify, quick checklist and *Image obtained / Not obtained*. Mastoid and posterior fontanelle as optional modules.
4. **Measurement assistant** – animated calliper guides for VI, AHW, TOD; unit/plausibility checks; PMA-specific reference zones; add to serial PHVD chart; senior-review flag. The app does not diagnose or recommend treatment from measurements alone.
5. **Findings** – structure-by-structure choices with plain-language explanations (ventricles, GMH-IVH each side ± PVHI, white matter, corpus callosum, basal ganglia/thalami, posterior fossa, extra-axial). Every structure has **Not visualised / Not assessed / Limited view** – normal is never forced.
6. **Impression and report** – narrative report ("No significant abnormality detected in the visualised structures"), limitations stated, senior-review triggers listed.

**Abnormality Recognition Atlas** (Guide → Atlas): for each abnormality – images, where to look, what it looks like, how to grade, common pitfalls, when to seek senior review.

## iPhone use
- Bottom tab bar, large touch targets, no zoom-on-focus.
- **✓ Normal scan** fills a normal study in one tap; section headers show status (e.g. *Grade III*, *High risk*).
- **📷 Examples** in each findings section opens matching reference images.
- **Share** sends the report to WhatsApp, Mail, Notes, etc. **PDF / Print** uses the iOS print sheet (pinch out to save as PDF).

## Install from GitHub (GitHub Pages)
1. Create a new public repository, e.g. `NeoCranial`.
2. Upload **all files in this folder** (keep the `css/`, `js/`, `icons/` folders) to the repository root.
3. Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
4. Open `https://<username>.github.io/NeoCranial/` after ~1 minute.
5. On a phone: Share → *Add to Home Screen* (iOS) or menu → *Install app* (Android). Works offline after the first load.

To run locally without GitHub, open `index.html` in a browser (offline caching needs http/https).

## Editing thresholds
All reference values and classification text are in `js/data.js` (`REF`, `PAPILE`, `DEVRIES`, `CBH`, `GUIDE`). After changing files, bump `VERSION` in `sw.js` so installed copies update.

## Privacy
No server, no analytics. Case data, settings and PHVD series are stored only in the browser's localStorage on that device. Saved .json/.txt/PDF files contain patient identifiers – handle per hospital policy.

## Disclaimer
Clinical decision-support tool. Ventricular reference curves are digitised from published charts and are approximate; verify against source references and local protocol. Final interpretation rests with the reporting clinician.

## Key references
- James AC. Practical guide to neonatal cranial ultrasound: basics. Paediatr Child Health 2018.
- El-Dib M et al. Management of post-hemorrhagic ventricular dilatation in the infant born preterm. J Pediatr 2020;226:16-27.
- Papile LA et al. J Pediatr 1978;92:529-34.
- de Vries LS et al. Behav Brain Res 1992;49:1-6.
- Levene MI. Arch Dis Child 1981;56:900-4.
- Stein A, Sody E, Bruns N, Felderhoff-Müser U. Development of an ultrasound scoring system to describe brain maturation in preterm infants. AJNR 2023;44(7):846-52.
- Prasad et al. Gestational age determination in neonates – transcerebellar ultrasound measurements help: a retrospective study of 671 neonates. Pediatr Radiol 2025. doi:10.1007/s00247-025-06426-9
- Davies MW, Swaminathan M, Betheras FR. J Paediatr Child Health 1999;35:346-9.
- Imamoglu EY, Gursoy T, Ovali F, et al. Early Hum Dev 2013;89:919-23 (values not included).
- Sodhi KS (ed). *Neonatal Ultrasound.* Springer 2025, Ch 1–2 – teaching points paraphrased and cited by section/figure (no images reproduced).
