/*
  window.storage 호환 레이어 (로컬 전용)
  ------------------------------------------------
  Claude 아티팩트 안에서 쓰이던 window.storage API와 동일한 형태를
  그대로 유지해, app.jsx 코드를 수정하지 않고 독립 실행형 웹앱/PWA로
  옮길 수 있게 해주는 어댑터입니다.

  주의: 이 버전은 브라우저 localStorage 기반이라 "같은 기기, 같은 브라우저"
  안에서만 데이터가 유지됩니다. 매장 간 실시간 동기화(공유 현황판)가
  실제로 여러 기기에서 동작하려면 Firebase Firestore 같은 실시간 DB로
  교체해야 합니다. (귀하의 다른 앱들 — 안전관리, 워킹퍼밋 — 과 동일한 패턴)
*/
(function () {
  function keyFor(key) {
    return "appshare:" + key;
  }

  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(keyFor(key));
      if (raw === null) return null;
      return { key, value: raw, shared: true };
    },
    async set(key, value) {
      localStorage.setItem(keyFor(key), value);
      return { key, value, shared: true };
    },
    async delete(key) {
      const existed = localStorage.getItem(keyFor(key)) !== null;
      localStorage.removeItem(keyFor(key));
      return { key, deleted: existed, shared: true };
    },
    async list(prefix) {
      const p = keyFor(prefix || "");
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(p)) keys.push(k.replace("appshare:", ""));
      }
      return { keys, shared: true };
    },
  };
})();
