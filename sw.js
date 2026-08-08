const CACHE_NAME = 'sijae-report-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-192-maskable.png', './icons/icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// 네트워크 우선: 온라인이면 항상 서버의 최신 파일을 먼저 시도하고,
// 오프라인일 때만 캐시된 버전을 보여준다. (예전 cache-first 방식은
// 배포 후에도 기기에 예전 화면이 계속 남는 원인이었음)
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
