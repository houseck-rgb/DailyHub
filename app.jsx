const { useState, useMemo, useRef, useEffect } = React;

/* ---------- 설정 ---------- */
const STORES = ["종로", "여의도", "영등포", "가산", "구로"];

const DENOMS = [
  { key: "w50000", label: "5만원", value: 50000 },
  { key: "w5000", label: "5천원", value: 5000 },
  { key: "w1000", label: "천원", value: 1000 },
  { key: "w500", label: "500원", value: 500 },
  { key: "w100", label: "100원", value: 100 },
];

const ADMIN_PIN = "5324";

const fmt = (n) => n.toLocaleString("ko-KR");

/* ---------- 공통 컴포넌트 ---------- */
function Header({ title, subtitle }) {
  return (
    <div style={styles.header}>
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
            style={{
              ...styles.storeChip,
              ...(value === s ? styles.storeChipActive : {}),
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function DenomRow({ denom, qty, onChange }) {
  const subtotal = denom.value * (qty || 0);
  return (
    <div style={styles.denomRow}>
      <div style={styles.denomLabel}>{denom.label}</div>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="0"
        value={qty === 0 ? "" : qty}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "");
          onChange(denom.key, v === "" ? 0 : parseInt(v, 10));
        }}
        style={styles.denomInput}
      />
      <div style={styles.denomUnit}>장(개)</div>
      <div style={styles.denomSubtotal}>{fmt(subtotal)}원</div>
    </div>
  );
}

/* ---------- 관리자 잠금 화면 ---------- */
function AdminGate({ onUnlock, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin === ADMIN_PIN) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.gateCard}>
        <div style={styles.gateTitle}>관리자 확인</div>
        <div style={styles.gateDesc}>비밀번호를 입력해 주세요</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setError(false);
            setPin(e.target.value.replace(/[^0-9]/g, ""));
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={styles.gateInput}
          placeholder="••••"
        />
        {error && <div style={styles.gateError}>비밀번호가 올바르지 않습니다</div>}
        <div style={styles.gateBtnRow}>
          <button style={styles.gateBtnGhost} onClick={onCancel}>
            취소
          </button>
          <button style={styles.gateBtnPrimary} onClick={submit}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 공유 완료 화면 ---------- */
function ShareDoneOverlay({ time, store, onClose }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.doneCard}>
        <div style={styles.doneIcon}>✓</div>
        <div style={styles.doneTitle}>공유 완료</div>
        <div style={styles.doneMeta}>{store}점</div>
        <div style={styles.doneMeta}>{time}</div>
        <button style={styles.gateBtnPrimary} onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}

/* ---------- 메인 앱 ---------- */
function App() {
  const [store, setStore] = useState(STORES[0]);
  const [qtys, setQtys] = useState(
    Object.fromEntries(DENOMS.map((d) => [d.key, 0]))
  );
  const [note, setNote] = useState("");
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [shareDone, setShareDone] = useState(null);

  const setQty = (key, val) => setQtys((prev) => ({ ...prev, [key]: val }));

  const total = useMemo(
    () => DENOMS.reduce((sum, d) => sum + d.value * (qtys[d.key] || 0), 0),
    [qtys]
  );

  const buildShareText = () => {
    const now = new Date();
    const dateStr = now
      .toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/\. /g, "-")
      .replace(".", "")
      .replace(/-(\d{2}):/, " $1:");

    const lines = [
      `[아침 시재 보고 - ${store}점]`,
      dateStr,
      "",
      ...DENOMS.map(
        (d) => `${d.label} x ${qtys[d.key] || 0} = ${fmt(d.value * (qtys[d.key] || 0))}원`
      ),
      "",
      `총 시재금액: ${fmt(total)}원`,
    ];
    if (note.trim()) {
      lines.push("", `메모: ${note.trim()}`);
    }
    return { text: lines.join("\n"), dateStr };
  };

  const handleShare = async () => {
    const { text, dateStr } = buildShareText();
    const shareData = {
      title: `아침 시재 보고 - ${store}점`,
      text,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareDone({ time: dateStr, store });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("이 기기는 공유 기능을 지원하지 않아 내용을 클립보드에 복사했습니다.");
      } else {
        alert(text);
      }
    } catch (err) {
      // 사용자가 공유를 취소한 경우는 조용히 무시
      if (err && err.name !== "AbortError") {
        console.warn("공유 실패:", err);
      }
    }
  };

  return (
    <div style={styles.app}>
      <Header title="시재" subtitle="아침 시재 보고" />

      <div style={styles.body}>
        <StoreSelect value={store} onChange={setStore} />

        <div style={styles.card}>
          <div style={styles.cardLabel}>화폐 수량 입력</div>
          {DENOMS.map((d) => (
            <DenomRow key={d.key} denom={d} qty={qtys[d.key]} onChange={setQty} />
          ))}

          <div style={styles.totalRow}>
            <div style={styles.totalLabel}>총 시재금액</div>
            <div style={styles.totalValue}>{fmt(total)}원</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>메모 (선택)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이상 사항이 있으면 입력해 주세요"
            style={styles.textarea}
          />
        </div>

        <div style={styles.card}>
          <button
            style={styles.adminLink}
            onClick={() => setShowAdminGate(true)}
          >
            관리자 화면
          </button>
        </div>
      </div>

      <div style={styles.shareBar}>
        <button style={styles.shareBtn} onClick={handleShare}>
          공유하기
        </button>
      </div>

      {showAdminGate && (
        <AdminGate
          onUnlock={() => {
            setShowAdminGate(false);
            setAdminOpen(true);
          }}
          onCancel={() => setShowAdminGate(false)}
        />
      )}

      {adminOpen && (
        <div style={styles.overlay}>
          <div style={styles.gateCard}>
            <div style={styles.gateTitle}>관리자 화면</div>
            <div style={styles.gateDesc}>
              오늘 총 시재금액: {fmt(total)}원
              <br />
              매장: {store}점
            </div>
            <div style={styles.gateBtnRow}>
              <button
                style={{ ...styles.gateBtnPrimary, width: "100%" }}
                onClick={() => setAdminOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {shareDone && (
        <ShareDoneOverlay
          time={shareDone.time}
          store={shareDone.store}
          onClose={() => setShareDone(null)}
        />
      )}
    </div>
  );
}

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
    fontFamily:
      "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif",
    color: INK,
    paddingBottom: "96px",
    boxSizing: "border-box",
  },
  header: {
    padding: "28px 20px 20px",
    textAlign: "center",
    borderBottom: `1px solid ${LINE}`,
    background: "#FFFFFF",
  },
  headerTitle: {
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "2px",
    color: INK,
  },
  headerSubtitle: {
    marginTop: "6px",
    fontSize: "14px",
    color: "#8A8272",
  },
  body: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
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
  storeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
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
  storeChipActive: {
    background: GOLD,
    borderColor: GOLD,
    color: "#FFFFFF",
  },
  denomRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    borderBottom: `1px solid ${LINE}`,
  },
  denomLabel: {
    width: "56px",
    fontSize: "16px",
    fontWeight: 700,
    flexShrink: 0,
  },
  denomInput: {
    width: "70px",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "10px",
    border: `1px solid ${LINE}`,
    textAlign: "right",
    boxSizing: "border-box",
  },
  denomUnit: {
    fontSize: "13px",
    color: "#8A8272",
    flexShrink: 0,
  },
  denomSubtotal: {
    marginLeft: "auto",
    fontSize: "15px",
    fontWeight: 700,
    color: GOLD_DARK,
    whiteSpace: "nowrap",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: `2px solid ${INK}`,
  },
  totalLabel: {
    fontSize: "16px",
    fontWeight: 800,
  },
  totalValue: {
    fontSize: "22px",
    fontWeight: 800,
    color: GOLD_DARK,
  },
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
  adminLink: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "none",
    color: "#8A8272",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
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
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },
  gateCard: {
    background: "#FFFFFF",
    borderRadius: "18px",
    padding: "28px 22px",
    width: "100%",
    maxWidth: "340px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  gateTitle: {
    fontSize: "19px",
    fontWeight: 800,
    marginBottom: "6px",
  },
  gateDesc: {
    fontSize: "14px",
    color: "#8A8272",
    marginBottom: "18px",
    lineHeight: 1.6,
  },
  gateInput: {
    width: "100%",
    padding: "14px",
    fontSize: "22px",
    letterSpacing: "8px",
    textAlign: "center",
    borderRadius: "12px",
    border: `1px solid ${LINE}`,
    boxSizing: "border-box",
  },
  gateError: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#C0392B",
  },
  gateBtnRow: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
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
  doneCard: {
    background: "#FFFFFF",
    borderRadius: "18px",
    padding: "32px 24px",
    width: "100%",
    maxWidth: "320px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  doneIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: GOLD,
    color: "#FFFFFF",
    fontSize: "28px",
    lineHeight: "56px",
    margin: "0 auto 16px",
  },
  doneTitle: {
    fontSize: "19px",
    fontWeight: 800,
    marginBottom: "10px",
  },
  doneMeta: {
    fontSize: "14px",
    color: "#8A8272",
    marginBottom: "4px",
  },
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
