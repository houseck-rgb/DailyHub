const { useState, useMemo, useEffect } = React;

/* ---------- 설정 ---------- */
const STORES = ["종로", "여의도", "영등포", "가산", "구로"];

const DENOMS = [
  { key: "w50000", label: "5만원", value: 50000 },
  { key: "w5000", label: "5천원", value: 5000 },
  { key: "w1000", label: "천원", value: 1000 },
  { key: "w500", label: "500원", value: 500 },
  { key: "w100", label: "100원", value: 100 },
];

const STORAGE_KEY = "sijaeRecords";
const KEEP_DAYS = 3;

const fmt = (n) => n.toLocaleString("ko-KR");
const emptyQtys = () => Object.fromEntries(DENOMS.map((d) => [d.key, 0]));
const pad2 = (n) => String(n).padStart(2, "0");
const dateKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dateLabelOf = (d) =>
  `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const shortLabelOf = (d) =>
  `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/* ---------- 로컬 저장소 ---------- */
function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function pruneOld(list) {
  const cutoffKey = dateKeyOf(addDays(new Date(), -(KEEP_DAYS - 1)));
  return list.filter((r) => r.dateKey >= cutoffKey);
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return pruneOld(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return [];
  }
}

function saveRecord(record) {
  try {
    const list = pruneOld(loadRecords());
    list.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.warn("로컬 저장 실패:", e);
    return loadRecords();
  }
}

/* ---------- 계산 ---------- */
function calcTotals(opening, deposit, withdrawal) {
  const o = opening || {};
  const dep = deposit || {};
  const wd = withdrawal || {};
  let totalOpening = 0;
  let totalDeposit = 0;
  let totalWithdrawal = 0;
  DENOMS.forEach((d) => {
    totalOpening += d.value * (o[d.key] || 0);
    totalDeposit += d.value * (dep[d.key] || 0);
    totalWithdrawal += d.value * (wd[d.key] || 0);
  });
  return {
    totalOpening,
    totalDeposit,
    totalWithdrawal,
    finalTotal: totalOpening + totalDeposit - totalWithdrawal,
  };
}

function buildShareText({ store, dateLabel, opening, deposit, withdrawal, note }) {
  const { totalOpening, totalDeposit, totalWithdrawal, finalTotal } = calcTotals(
    opening, deposit, withdrawal
  );
  const lines = [`[${store}점 시재 보고]`, "", dateLabel, ""];

  const openingLines = DENOMS.filter((d) => ((opening || {})[d.key] || 0) > 0).map(
    (d) => `${d.label} × ${opening[d.key]}장 = ${fmt(d.value * opening[d.key])}원`
  );
  if (openingLines.length) {
    lines.push("기존 시재", ...openingLines, "", `기존 시재 합계: ${fmt(totalOpening)}원`, "");
  }

  const depositLines = DENOMS.filter((d) => (deposit[d.key] || 0) > 0).map(
    (d) => `${d.label} × ${deposit[d.key]}장 = ${fmt(d.value * deposit[d.key])}원`
  );
  if (depositLines.length) {
    lines.push("입금", ...depositLines, "", `총 입금액: ${fmt(totalDeposit)}원`, "");
  }

  const withdrawalLines = DENOMS.filter((d) => (withdrawal[d.key] || 0) > 0).map(
    (d) => `${d.label} × ${withdrawal[d.key]}장 = ${fmt(d.value * withdrawal[d.key])}원`
  );
  if (withdrawalLines.length) {
    lines.push("출금", ...withdrawalLines, "", `총 출금액: ${fmt(totalWithdrawal)}원`, "");
  }

  lines.push(`최종 시재금액: ${fmt(finalTotal)}원`);
  if (note && note.trim()) lines.push("", `메모: ${note.trim()}`);
  return lines.join("\n");
}

/* ---------- 공통 컴포넌트 ---------- */
function Header({ title, subtitle, onHistoryClick }) {
  return (
    <div style={styles.header}>
      <button style={styles.historyBtn} onClick={onHistoryClick}>최근 기록</button>
      <div style={styles.headerTitle}>{title}</div>
      {subtitle && <div style={styles.headerSubtitle}>{subtitle}</div>}
    </div>
  );
}

function StoreSelect({ value, onChange }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>매장 선택</div>
      <div style={styles.storeRow}>
        {STORES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{ ...styles.storeChip, ...(value === s ? styles.storeChipActive : {}) }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function DenomTable({ opening, deposit, withdrawal, onChangeOpening, onChangeDeposit, onChangeWithdrawal }) {
  const cell = (obj, onChange, key, extraStyle) => (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      placeholder="0"
      value={obj[key] === 0 ? "" : obj[key]}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, "");
        onChange(key, v === "" ? 0 : parseInt(v, 10));
      }}
      style={{ ...styles.denomInput, ...extraStyle }}
    />
  );

  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>화폐 수량 입력 (장/개수)</div>
      <div style={styles.denomHeaderRow}>
        <div style={styles.denomHeaderCoin}></div>
        <div style={styles.denomHeaderCell}>기존</div>
        <div style={styles.denomHeaderCell}>입금</div>
        <div style={styles.denomHeaderCell}>출금</div>
      </div>
      {DENOMS.map((d) => (
        <div key={d.key} style={styles.denomRow}>
          <div style={styles.denomLabel}>{d.label}</div>
          {cell(opening, onChangeOpening, d.key, styles.openingInput)}
          {cell(deposit, onChangeDeposit, d.key, styles.depositInput)}
          {cell(withdrawal, onChangeWithdrawal, d.key, styles.withdrawalInput)}
        </div>
      ))}
    </div>
  );
}

function TotalsCard({ opening, deposit, withdrawal }) {
  const { totalOpening, totalDeposit, totalWithdrawal, finalTotal } = calcTotals(
    opening, deposit, withdrawal
  );
  return (
    <div style={styles.card}>
      <div style={styles.totalLineRow}>
        <div style={styles.totalLineLabel}>기존 시재</div>
        <div style={{ ...styles.totalLineValue, color: "#5B6B7A" }}>{fmt(totalOpening)}원</div>
      </div>
      <div style={styles.totalLineRow}>
        <div style={styles.totalLineLabel}>총 입금액</div>
        <div style={{ ...styles.totalLineValue, color: "#2E7D4F" }}>{fmt(totalDeposit)}원</div>
      </div>
      <div style={styles.totalLineRow}>
        <div style={styles.totalLineLabel}>총 출금액</div>
        <div style={{ ...styles.totalLineValue, color: "#B0442E" }}>{fmt(totalWithdrawal)}원</div>
      </div>
      <div style={styles.totalRow}>
        <div style={styles.totalLabel}>최종 시재금액</div>
        <div style={styles.totalValue}>{fmt(finalTotal)}원</div>
      </div>
    </div>
  );
}

/* ---------- 최근 기록 ---------- */
function HistoryOverlay({ records, onSelect, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetTitle}>최근 기록 (최근 3일)</div>
        <div style={styles.sheetList}>
          {records.length === 0 && <div style={styles.boardEmpty}>저장된 기록이 없습니다</div>}
          {records.map((r) => {
            const { finalTotal } = calcTotals(r.opening, r.deposit, r.withdrawal);
            return (
              <button key={r.id} style={styles.historyRow} onClick={() => onSelect(r)}>
                <div style={styles.historyRowTop}>
                  <span style={styles.historyRowDate}>{shortLabelOf(new Date(r.timestampMs))}</span>
                  <span style={styles.historyRowStore}>· {r.store}</span>
                </div>
                <div style={styles.historyRowTotal}>총 시재 {fmt(finalTotal)}원</div>
              </button>
            );
          })}
        </div>
        <button style={styles.gateBtnGhost} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

/* ---------- 미리보기 ---------- */
function PreviewOverlay({ record, onLoad, onShare, onClose, sharing }) {
  const opening = record.opening || {};
  const { totalOpening, totalDeposit, totalWithdrawal, finalTotal } = calcTotals(
    opening, record.deposit, record.withdrawal
  );
  const openingRows = DENOMS.filter((d) => (opening[d.key] || 0) > 0);
  const depositRows = DENOMS.filter((d) => (record.deposit[d.key] || 0) > 0);
  const withdrawalRows = DENOMS.filter((d) => (record.withdrawal[d.key] || 0) > 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetTitle}>{record.store}점 시재 보고</div>
        <div style={styles.previewDate}>{record.dateLabel}</div>
        <div style={styles.previewScroll}>
          {openingRows.length > 0 && (
            <>
              <div style={styles.previewSection}>기존 시재</div>
              {openingRows.map((d) => (
                <div key={d.key} style={styles.previewLine}>
                  {d.label} × {opening[d.key]}장 = {fmt(d.value * opening[d.key])}원
                </div>
              ))}
              <div style={styles.previewSubtotal}>기존 시재 합계 {fmt(totalOpening)}원</div>
            </>
          )}
          {depositRows.length > 0 && (
            <>
              <div style={styles.previewSection}>입금</div>
              {depositRows.map((d) => (
                <div key={d.key} style={styles.previewLine}>
                  {d.label} × {record.deposit[d.key]}장 = {fmt(d.value * record.deposit[d.key])}원
                </div>
              ))}
              <div style={styles.previewSubtotal}>총 입금액 {fmt(totalDeposit)}원</div>
            </>
          )}
          {withdrawalRows.length > 0 && (
            <>
              <div style={styles.previewSection}>출금</div>
              {withdrawalRows.map((d) => (
                <div key={d.key} style={styles.previewLine}>
                  {d.label} × {record.withdrawal[d.key]}장 = {fmt(d.value * record.withdrawal[d.key])}원
                </div>
              ))}
              <div style={styles.previewSubtotal}>총 출금액 {fmt(totalWithdrawal)}원</div>
            </>
          )}
          <div style={styles.previewFinal}>최종 시재금액 {fmt(finalTotal)}원</div>
          {record.note && <div style={styles.previewNote}>메모: {record.note}</div>}
        </div>
        <div style={styles.gateBtnRow}>
          <button style={styles.gateBtnGhost} onClick={onLoad}>불러오기</button>
          <button style={styles.gateBtnPrimary} onClick={onShare} disabled={sharing}>
            {sharing ? "공유 중..." : "공유하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 메인 앱 ---------- */
function App() {
  const [store, setStore] = useState(STORES[0]);
  const [opening, setOpening] = useState(emptyQtys());
  const [deposit, setDeposit] = useState(emptyQtys());
  const [withdrawal, setWithdrawal] = useState(emptyQtys());
  const [note, setNote] = useState("");
  const [records, setRecords] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => { setRecords(loadRecords()); }, []);

  const setOpeningQty = (k, v) => setOpening((p) => ({ ...p, [k]: v }));
  const setDepositQty = (k, v) => setDeposit((p) => ({ ...p, [k]: v }));
  const setWithdrawalQty = (k, v) => setWithdrawal((p) => ({ ...p, [k]: v }));

  const shareCurrent = async () => {
    if (sharing) return;
    setSharing(true);
    const now = new Date();
    const dateLabel = dateLabelOf(now);
    const text = buildShareText({ store, dateLabel, opening, deposit, withdrawal, note });
    const { totalOpening, totalDeposit, totalWithdrawal, finalTotal } = calcTotals(
      opening, deposit, withdrawal
    );
    const record = {
      id: `${now.getTime()}`,
      store,
      dateKey: dateKeyOf(now),
      dateLabel,
      timestampMs: now.getTime(),
      opening: { ...opening },
      deposit: { ...deposit },
      withdrawal: { ...withdrawal },
      totalOpening, totalDeposit, totalWithdrawal, finalTotal,
      note: note.trim() || null,
    };
    try {
      if (navigator.share) {
        await navigator.share({ title: `${store}점 시재 보고`, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("공유 기능을 지원하지 않는 기기라 내용을 클립보드에 복사했습니다.");
      } else {
        alert(text);
      }
      setRecords(saveRecord(record));
    } catch (err) {
      if (err && err.name !== "AbortError") console.warn("공유 실패:", err);
    } finally {
      setSharing(false);
    }
  };

  const shareRecord = async (record) => {
    if (sharing) return;
    setSharing(true);
    const text = buildShareText(record);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${record.store}점 시재 보고`, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("공유 기능을 지원하지 않는 기기라 내용을 클립보드에 복사했습니다.");
      } else {
        alert(text);
      }
    } catch (err) {
      if (err && err.name !== "AbortError") console.warn("공유 실패:", err);
    } finally {
      setSharing(false);
    }
  };

  const loadFromRecord = (record) => {
    setStore(record.store);
    setOpening({ ...emptyQtys(), ...(record.opening || {}) });
    setDeposit({ ...record.deposit });
    setWithdrawal({ ...record.withdrawal });
    setNote(record.note || "");
    setPreviewRecord(null);
    setShowHistory(false);
  };

  return (
    <div style={styles.app}>
      <Header title="시재" subtitle="아침 시재 보고" onHistoryClick={() => setShowHistory(true)} />
      <div style={styles.body}>
        <StoreSelect value={store} onChange={setStore} />
        <DenomTable
          opening={opening}
          deposit={deposit}
          withdrawal={withdrawal}
          onChangeOpening={setOpeningQty}
          onChangeDeposit={setDepositQty}
          onChangeWithdrawal={setWithdrawalQty}
        />
        <TotalsCard opening={opening} deposit={deposit} withdrawal={withdrawal} />
        <div style={styles.card}>
          <div style={styles.cardLabel}>메모 (선택)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이상 사항이 있으면 입력해 주세요"
            style={styles.textarea}
          />
        </div>
      </div>
      <div style={styles.shareBar}>
        <button style={styles.shareBtn} onClick={shareCurrent} disabled={sharing}>
          {sharing ? "공유 중..." : "공유하기"}
        </button>
      </div>
      {showHistory && (
        <HistoryOverlay
          records={records}
          onSelect={(r) => { setShowHistory(false); setPreviewRecord(r); }}
          onClose={() => setShowHistory(false)}
        />
      )}
      {previewRecord && (
        <PreviewOverlay
          record={previewRecord}
          sharing={sharing}
          onLoad={() => loadFromRecord(previewRecord)}
          onShare={() => shareRecord(previewRecord)}
          onClose={() => setPreviewRecord(null)}
        />
      )}
    </div>
    /* ---------- 스타일 ---------- */
const GOLD = "#A9824F";
const GOLD_DARK = "#8C6A3F";
const BG = "#FAF9F6";
const INK = "#2B2621";
const LINE = "#E9E4DA";

const styles = {
  app: {
    minHeight: "100vh",
    background: BG,
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif",
    color: INK,
    boxSizing: "border-box",
  },
  header: {
    position: "relative",
    padding: "28px 20px 20px",
    textAlign: "center",
    borderBottom: `1px solid ${LINE}`,
    background: "#FFFFFF",
  },
  historyBtn: {
    position: "absolute",
    right: "16px",
    top: "24px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: `1px solid ${LINE}`,
    background: "#FAF9F6",
    color: GOLD_DARK,
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  headerTitle: { fontSize: "28px", fontWeight: 800, letterSpacing: "2px", color: INK },
  headerSubtitle: { marginTop: "6px", fontSize: "14px", color: "#8A8272" },
  body: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    paddingBottom: "110px",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
    border: `1px solid ${LINE}`,
  },
  cardLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#8A8272",
    marginBottom: "12px",
    letterSpacing: "0.5px",
  },
  storeRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  storeChip: {
    padding: "10px 16px",
    borderRadius: "999px",
    border: `1px solid ${LINE}`,
    background: "#FAF9F6",
    color: INK,
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  storeChipActive: { background: GOLD, borderColor: GOLD, color: "#FFFFFF" },
  denomHeaderRow: { display: "flex", alignItems: "center", gap: "6px", paddingBottom: "6px" },
  denomHeaderCoin: { width: "50px", flexShrink: 0 },
  denomHeaderCell: {
    flex: 1,
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#8A8272",
  },
  denomRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 0",
    borderBottom: `1px solid ${LINE}`,
  },
  denomLabel: { width: "50px", fontSize: "14px", fontWeight: 700, flexShrink: 0 },
  denomInput: {
    flex: 1,
    padding: "10px 4px",
    fontSize: "16px",
    borderRadius: "10px",
    border: `1px solid ${LINE}`,
    textAlign: "center",
    boxSizing: "border-box",
    minWidth: 0,
  },
  openingInput: { background: "#F2F4F7", borderColor: "#D7DCE3" },
  depositInput: { background: "#F1F8F3", borderColor: "#CFE8D6" },
  withdrawalInput: { background: "#FBF1EF", borderColor: "#F0D3CC" },
  totalLineRow: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
  totalLineLabel: { fontSize: "14px", fontWeight: 600, color: "#8A8272" },
  totalLineValue: { fontSize: "15px", fontWeight: 800 },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
    paddingTop: "12px",
    borderTop: `2px solid ${INK}`,
  },
  totalLabel: { fontSize: "16px", fontWeight: 800 },
  totalValue: { fontSize: "24px", fontWeight: 800, color: GOLD_DARK },
  textarea: {
    width: "100%",
    minHeight: "70px",
    padding: "12px",
    fontSize: "15px",
    borderRadius: "10px",
    border: `1px solid ${LINE}`,
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
  },
  shareBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
    background: "#FFFFFF",
    borderTop: `1px solid ${LINE}`,
  },
  shareBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    background: GOLD,
    color: "#FFFFFF",
    fontSize: "17px",
    fontWeight: 800,
    letterSpacing: "1px",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(20,16,10,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1000,
  },
  sheetCard: {
    background: "#FFFFFF",
    borderRadius: "20px 20px 0 0",
    padding: "22px 20px calc(20px + env(safe-area-inset-bottom))",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "82vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -10px 30px rgba(0,0,0,0.2)",
  },
  sheetTitle: { fontSize: "18px", fontWeight: 800, marginBottom: "4px", textAlign: "center" },
  sheetList: { overflowY: "auto", marginTop: "12px", marginBottom: "14px" },
  historyRow: {
    width: "100%",
    textAlign: "left",
    padding: "14px 12px",
    borderRadius: "12px",
    border: `1px solid ${LINE}`,
    background: "#FAF9F6",
    marginBottom: "8px",
    cursor: "pointer",
  },
  historyRowTop: { fontSize: "13px", color: "#8A8272", marginBottom: "4px" },
  historyRowDate: { fontWeight: 700, color: INK },
  historyRowStore: { marginLeft: "4px" },
  historyRowTotal: { fontSize: "16px", fontWeight: 800, color: GOLD_DARK },
  boardEmpty: { padding: "20px 0", textAlign: "center", fontSize: "13px", color: "#B7AF9E" },
  previewDate: { textAlign: "center", fontSize: "13px", color: "#8A8272", marginBottom: "10px" },
  previewScroll: { overflowY: "auto", padding: "4px 2px" },
  previewSection: {
    fontSize: "13px",
    fontWeight: 800,
    color: GOLD_DARK,
    marginTop: "12px",
    marginBottom: "4px",
  },
  previewLine: { fontSize: "14px", padding: "3px 0", color: INK },
  previewSubtotal: { fontSize: "14px", fontWeight: 700, marginTop: "6px", color: "#8A8272" },
  previewFinal: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: `2px solid ${INK}`,
    fontSize: "18px",
    fontWeight: 800,
    color: GOLD_DARK,
  },
  previewNote: {
    marginTop: "12px",
    fontSize: "13px",
    color: "#8A8272",
    background: "#FAF9F6",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  gateBtnRow: { display: "flex", gap: "10px", marginTop: "16px" },
  gateBtnGhost: {
    flex: 1,
    padding: "13px",
    borderRadius: "12px",
    border: `1px solid ${LINE}`,
    background: "#FFFFFF",
    color: INK,
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  gateBtnPrimary: {
    flex: 1,
    padding: "13px",
    borderRadius: "12px",
    border: "none",
    background: GOLD,
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
  );
}
