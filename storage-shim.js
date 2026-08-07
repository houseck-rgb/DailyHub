// 시재 앱은 "저장" 대신 "공유"로 동작합니다.
// 추후 로컬 임시 저장이 필요할 경우를 대비한 최소 셰임입니다.
window.storageShim = {
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("storage-shim save 실패:", e);
    }
  },
  load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("storage-shim load 실패:", e);
      return null;
    }
  },
};
