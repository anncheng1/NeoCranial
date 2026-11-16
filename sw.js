/* NeoCranial USG service worker – offline cache. Bump VERSION when files change. */
const VERSION = 'neocranial-v1.2.0';
const ASSETS = ['./', './index.html', './css/styles.css', './js/data.js', './js/app.js',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './images/fi-fig01-csp.jpg',
  './images/fi-fig02-cavum-veli-interpositi.jpg',
  './images/fi-fig03-mega-cisterna.jpg',
  './images/fi-fig04-choroid-cyst.jpg',
  './images/fi-fig05-connatal-cysts.jpg',
  './images/fi-fig06-gmh-grade1-2.jpg',
  './images/fi-fig07-ivh-grade3.jpg',
  './images/fi-fig08-gmh-evolution.jpg',
  './images/fi-fig09-pvl-evolution.jpg',
  './images/fi-fig12-hie-periventricular.jpg',
  './images/fi-fig13-thalamic-haem.jpg',
  './images/fi-fig15-benign-extra-axial.jpg',
  './images/tp-fig01-coronal-normal.jpg',
  './images/tp-fig02-sagittal-normal.jpg',
  './images/tp-fig03-mastoid-normal.jpg',
  './images/tp-fig04-sulcation.jpg',
  './images/tp-fig08-ventricle-asymmetry.jpg',
  './images/tp-fig09-connatal-cysts.jpg',
  './images/tp-fig10-csp-cv.jpg',
  './images/tp-fig11-mega-cisterna.jpg',
  './images/tp-fig12-choroid-cyst.jpg',
  './images/tp-fig13-gmh.jpg',
  './images/tp-fig14-ivh-dilated.jpg',
  './images/tp-fig15-pvhi.jpg',
  './images/tp-fig16-cerebellar-haem.jpg',
  './images/tp-fig18-pvl.jpg',
  './images/tp-fig19-term-asphyxia-cortex.jpg',
  './images/tp-fig20-hie-basal-ganglia.jpg',
  './images/tp-fig21-mca-stroke.jpg',
  './images/tp-fig28-arachnoid-cyst.jpg',
  './images/tp-fig29-holoprosencephaly.jpg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
