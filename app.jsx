const { useState, useEffect, useCallback, useMemo } = React;

const STORES = ["종로점", "여의도점", "가산점", "영등포점", "구로점"];
const STORAGE_PREFIX = "appshare:v2:";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
`;

const INK = "#1E1C18";
const MUTED = "#8C8272";
const PAPER = "#FAF9F6";
const CARD = "#FFFFFF";
const LINE = "#E7E2D8";
const GOLD = "#A9824F";
const GOLD_SOFT = "#F3EBDC";
const JADE = "#3C6E58";
const WINE = "#8A3B3B";

function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtDateTime(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const day = pad(dt.getDate());
  const h = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  const s = pad(dt.getSeconds());
  return { date: `${y}-${m}-${day}`, time: `${h}:${mi}:${s}` };
}
function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function won(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("ko-KR") + "원";
}

const emptyFields = () => ({ withdrawal: "", bill10000: "", bill5000: "", bill1000: "", ok: true, note: "" });
const emptyRecord = () => ({ fields: emptyFields(), sharedAt: null, history: [] });

function computeTotal(f) {
  return (Number(f.bill10000) || 0) * 10000 + (Number(f.bill5000) || 0) * 5000 + (Number(f.bill1000) || 0) * 1000;
}

const MANAGER_PIN = "12";

function AppShareDemo() {
  const [role, setRole] = useState("staff");
  const [managerUnlocked, setManagerUnlocked] = useState(false);
  const [now, setNow] = useState(new Date());
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(() => {
    const init = {};
    STORES.forEach((s) => (init[s] = emptyRecord()));
    return init;
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const store of STORES) {
        try {
          const res = await window.storage.get(STORAGE_PREFIX + store, true);
          next[store] = res && res.value ? JSON.parse(res.value) : emptyRecord();
        } catch (e) {
          next[store] = emptyRecord();
        }
      }
      if (!cancelled) {
        setData(next);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setInterval(async () => {
      const next = {};
      for (const store of STORES) {
        try {
          const res = await window.storage.get(STORAGE_PREFIX + store, true);
          next[store] = res && res.value ? JSON.parse(res.value) : emptyRecord();
        } catch (e) {
          next[store] = data[store] || emptyRecord();
        }
      }
      setData(next);
    }, 4000);
    return () => clearInterval(t);
  }, [loaded, data]);

  const persist = useCallback(async (store, record) => {
    setData((prev) => ({ ...prev, [store]: record }));
    try {
      await window.storage.set(STORAGE_PREFIX + store, JSON.stringify(record), true);
    } catch (e) {
      console.error("공유 저장 실패", e);
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "'Noto Serif KR', serif" }}>
      <style>{FONT_IMPORT}</style>
      <TopBar
        role={role}
        setRole={(r) => {
          if (r === "staff") setManagerUnlocked(false);
          setRole(r);
        }}
        now={now}
      />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 80px" }}>
        {role === "staff" ? (
          <StaffView data={data} persist={persist} loaded={loaded} />
        ) : managerUnlocked ? (
          <ManagerView data={data} persist={persist} now={now} />
        ) : (
          <ManagerPinGate onSuccess={() => setManagerUnlocked(true)} />
        )}
      </div>
      <footer style={{ textAlign: "center", color: MUTED, fontSize: 12, padding: "20px 20px 48px", fontFamily: "'Noto Sans KR'", fontWeight: 300, letterSpacing: 0.4 }}>
        Android · iPhone · 태블릿 · Windows · Mac — 모든 기기에서 동일한 공유 내역을 실시간으로 확인합니다
      </footer>
    </div>
  );
}

function TopBar({ role, setRole, now }) {
  const { time } = fmtDateTime(now);
  return (
    <div style={{ borderBottom: `1px solid ${LINE}`, position: "sticky", top: 0, background: `${PAPER}f2`, backdropFilter: "blur(6px)", zIndex: 10 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: GOLD, fontFamily: "'Noto Sans KR'", fontWeight: 600, letterSpacing: 3, marginBottom: 6 }}>CHOI WOOYOUNG SEAFOOD GROUP</div>
          <div style={{ fontWeight: 700, fontSize: 30, letterSpacing: -0.5 }}>앱 공유</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, fontFamily: "'Noto Sans KR'", fontWeight: 300, letterSpacing: 0.3 }}>저장 대신 공유 — 아침 시재 실시간 보고</div>
        </div>
        <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 7, fontWeight: 400, letterSpacing: 0.5 }}>
          <LivePulse size={6} />
          {time}
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 18px", display: "flex", gap: 10 }}>
        <RoleTab label="직원 화면" active={role === "staff"} onClick={() => setRole("staff")} />
        <RoleTab label="관리자 화면" active={role === "manager"} onClick={() => setRole("manager")} />
      </div>
    </div>
  );
}

function RoleTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "11px 0",
        borderRadius: 3,
        border: `1px solid ${active ? GOLD : LINE}`,
        background: active ? GOLD_SOFT : "transparent",
        color: active ? "#7A5C2E" : MUTED,
        fontFamily: "'Noto Sans KR'",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: 0.5,
        cursor: "pointer",
        transition: "all .15s ease",
      }}
    >
      {label}
    </button>
  );
}

function LivePulse({ size = 8, color = JADE }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.45, animation: "pulseRing 1.8s ease-out infinite" }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }} />
      <style>{`@keyframes pulseRing { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(2.8); opacity: 0; } }`}</style>
    </span>
  );
}

/* ---------------- 직원 화면 ---------------- */

function StaffView({ data, persist, loaded }) {
  const [store, setStore] = useState(STORES[0]);
  const [tab, setTab] = useState("report"); // report | history
  const [draft, setDraft] = useState(emptyFields());
  const [preview, setPreview] = useState(false);
  const [justShared, setJustShared] = useState(null);

  const record = data[store] || emptyRecord();
  const sharedToday = record.sharedAt && isSameDay(record.sharedAt, new Date());

  useEffect(() => {
    setDraft(record.fields || emptyFields());
    setPreview(false);
    setJustShared(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, record.sharedAt]);

  if (!loaded) {
    return <div style={{ padding: "72px 0", textAlign: "center", color: MUTED, fontFamily: "'Noto Sans KR'" }}>동기화 중…</div>;
  }

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const total = computeTotal(draft);
  const filled = draft.withdrawal !== "" || draft.bill10000 !== "" || draft.bill5000 !== "" || draft.bill1000 !== "";

  const handleShare = async () => {
    const sharedAt = new Date().toISOString();
    const next = {
      fields: draft,
      sharedAt,
      history: [...(record.history || []), { fields: draft, editedAt: sharedAt, editor: "직원" }],
    };
    await persist(store, next);
    setJustShared(sharedAt);
  };

  let content;
  if (tab === "history") {
    content = <StaffHistoryPanel store={store} record={record} />;
  } else if (sharedToday && !justShared) {
    content = <SharedLockedCard record={record} store={store} />;
  } else if (justShared) {
    content = <ShareCompleteCard store={store} sharedAt={justShared} />;
  } else {
    content = (
      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, padding: "30px 28px", marginTop: 16, boxShadow: "0 1px 3px rgba(30,28,24,0.04)" }}>
        <ReportTitle store={store} />

        {!preview ? (
          <div style={{ marginTop: 22 }}>
            <FieldGroup label="전날 영수증 보고 합계">
              <MoneyInput label="어제 출금 총금액" value={draft.withdrawal} onChange={set("withdrawal")} />
            </FieldGroup>

            <FieldGroup label="돈통에 준비된 현금 (시재)">
              <CountInput label="만원권" unit="장" value={draft.bill10000} onChange={set("bill10000")} />
              <CountInput label="오천원권" unit="장" value={draft.bill5000} onChange={set("bill5000")} />
              <CountInput label="천원권" unit="장" value={draft.bill1000} onChange={set("bill1000")} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
                <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, color: MUTED, letterSpacing: 0.4 }}>시재 합계</span>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>{won(total)}</span>
              </div>
            </FieldGroup>

            <FieldGroup label="특이사항">
              <div style={{ display: "flex", gap: 8, marginBottom: draft.ok ? 0 : 10 }}>
                <StatusChip label="이상 없음" active={draft.ok} color={JADE} onClick={() => setDraft((d) => ({ ...d, ok: true, note: "" }))} />
                <StatusChip label="특이사항 있음" active={!draft.ok} color={WINE} onClick={() => setDraft((d) => ({ ...d, ok: false }))} />
              </div>
              {!draft.ok && (
                <textarea
                  value={draft.note}
                  onChange={set("note")}
                  placeholder="특이사항을 입력하세요"
                  style={{ width: "100%", minHeight: 70, border: `1px solid ${LINE}`, borderRadius: 3, padding: 12, fontFamily: "'Noto Sans KR'", fontSize: 14, color: INK, resize: "vertical", boxSizing: "border-box" }}
                />
              )}
            </FieldGroup>
          </div>
        ) : (
          <ReportPreview store={store} fields={draft} />
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
          <button onClick={() => setPreview((p) => !p)} style={ghostBtn}>
            {preview ? "수정으로 돌아가기" : "미리보기"}
          </button>
          <button onClick={handleShare} disabled={!filled} style={{ ...goldBtn, opacity: filled ? 1 : 0.4, cursor: filled ? "pointer" : "not-allowed" }}>
            앱 공유
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 14, textAlign: "center", fontFamily: "'Noto Sans KR'", fontWeight: 300, letterSpacing: 0.3 }}>
          별도의 저장 버튼은 없습니다 · 공유 시 관리자 앱에 즉시 전달됩니다
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 22 }}>
      <StoreSelector store={store} setStore={setStore} />
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <SmallTab label="보고" active={tab === "report"} onClick={() => setTab("report")} />
        <SmallTab label="공유 내역" active={tab === "history"} onClick={() => setTab("history")} />
      </div>
      {content}
    </div>
  );
}

const ghostBtn = {
  flex: 1,
  padding: "14px 0",
  borderRadius: 3,
  border: `1px solid ${LINE}`,
  background: "transparent",
  color: INK,
  fontFamily: "'Noto Sans KR'",
  fontWeight: 600,
  fontSize: 14,
  letterSpacing: 0.3,
  cursor: "pointer",
};
const goldBtn = {
  flex: 1.3,
  padding: "14px 0",
  borderRadius: 3,
  border: "none",
  background: `linear-gradient(180deg, #C4A06B, ${GOLD})`,
  color: "#241A05",
  fontFamily: "'Noto Sans KR'",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: 0.5,
};

function ReportTitle({ store }) {
  return (
    <div style={{ textAlign: "center", paddingBottom: 18, borderBottom: `2px solid ${INK}` }}>
      <div style={{ fontSize: 11, color: GOLD, fontFamily: "'Noto Sans KR'", fontWeight: 600, letterSpacing: 3, marginBottom: 8 }}>MORNING CASH REPORT</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{store} 아침 시재 보고</div>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>{label}</div>
      {children}
    </div>
  );
}

function MoneyInput({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${LINE}`, paddingBottom: 10 }}>
      <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 15, color: INK }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          placeholder="0"
          style={{ width: 130, border: "none", outline: "none", textAlign: "right", fontSize: 20, fontFamily: "'Noto Serif KR'", fontWeight: 600, color: INK, background: "transparent", fontVariantNumeric: "tabular-nums" }}
        />
        <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, color: MUTED }}>원</span>
      </span>
    </label>
  );
}

function CountInput({ label, unit, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${LINE}` }}>
      <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 14.5, color: "#57503F" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          placeholder="0"
          style={{ width: 70, border: "none", outline: "none", textAlign: "right", fontSize: 17, fontFamily: "'Noto Serif KR'", fontWeight: 600, color: INK, background: "transparent", fontVariantNumeric: "tabular-nums" }}
        />
        <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, color: MUTED }}>{unit}</span>
      </span>
    </label>
  );
}

function StatusChip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 16px",
        borderRadius: 999,
        border: `1px solid ${active ? color : LINE}`,
        background: active ? `${color}14` : "transparent",
        color: active ? color : MUTED,
        fontFamily: "'Noto Sans KR'",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ReportPreview({ store, fields }) {
  const total = computeTotal(fields);
  return (
    <div style={{ marginTop: 20, background: PAPER, border: `1px dashed ${LINE}`, borderRadius: 4, padding: "24px 22px" }}>
      <div style={{ fontSize: 10.5, color: GOLD, fontFamily: "'Noto Sans KR'", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>미리보기 · 대표에게 보이는 화면과 동일</div>
      <PreviewLine label="어제 출금 총금액" value={won(fields.withdrawal)} />
      <PreviewLine label="시재 합계" value={won(total)} strong />
      <div style={{ paddingLeft: 14, marginTop: 4, marginBottom: 10 }}>
        <PreviewLine small label="만원" value={`${fields.bill10000 || 0}장`} />
        <PreviewLine small label="오천원" value={`${fields.bill5000 || 0}장`} />
        <PreviewLine small label="천원" value={`${fields.bill1000 || 0}장`} />
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${LINE}`, fontFamily: "'Noto Sans KR'", fontSize: 14, color: fields.ok ? JADE : WINE, fontWeight: 600 }}>
        {fields.ok ? "이상 없음" : fields.note || "특이사항 있음"}
      </div>
    </div>
  );
}

function PreviewLine({ label, value, strong, small }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: small ? "3px 0" : "6px 0", fontFamily: "'Noto Sans KR'" }}>
      <span style={{ fontSize: small ? 12.5 : 14, color: small ? MUTED : "#57503F" }}>{label}</span>
      <span style={{ fontSize: small ? 12.5 : strong ? 18 : 14, fontWeight: strong ? 700 : 500, color: INK, fontFamily: strong ? "'Noto Serif KR'" : "'Noto Sans KR'", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

const STAFF_RANGE_OPTIONS = [
  { key: "today", label: "오늘" },
  { key: "yesterday", label: "어제" },
  { key: "3d", label: "3일 전" },
  { key: "7d", label: "7일 전" },
];

function StaffHistoryPanel({ store, record }) {
  const [range, setRange] = useState("today");

  const entries = useMemo(() => (record.history || []).slice().sort((a, b) => new Date(b.editedAt) - new Date(a.editedAt)), [record.history]);

  const filtered = useMemo(() => {
    const nowD = new Date();
    if (range === "today" || range === "yesterday") {
      const target = range === "today" ? nowD : daysAgo(1);
      return entries.filter((e) => isSameDay(e.editedAt, target));
    }
    const rangeMap = { "3d": 3, "7d": 7 };
    const cutoff = daysAgo(rangeMap[range]);
    return entries.filter((e) => new Date(e.editedAt) >= cutoff);
  }, [entries, range]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {STAFF_RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setRange(o.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${range === o.key ? GOLD : LINE}`,
              background: range === o.key ? GOLD_SOFT : CARD,
              color: range === o.key ? "#7A5C2E" : "#78705F",
              fontFamily: "'Noto Sans KR'",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(30,28,24,0.04)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: 13.5, fontFamily: "'Noto Sans KR'" }}>해당 기간에 공유된 내역이 없습니다.</div>
        ) : (
          filtered.map((e, i) => {
            const t = fmtDateTime(e.editedAt);
            const total = computeTotal(e.fields || emptyFields());
            return (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i === filtered.length - 1 ? "none" : `1px solid ${LINE}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{store}</span>
                  <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 11.5, color: e.editor === "관리자" ? GOLD : JADE, fontWeight: 600 }}>
                    {t.date} {t.time}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontFamily: "'Noto Sans KR'" }}>{e.editor === "관리자" ? "관리자 수정" : "직원 공유"}</div>
                <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, color: "#57503F", display: "flex", justifyContent: "space-between" }}>
                  <span>시재 합계</span>
                  <span style={{ fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" }}>{won(total)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StoreSelector({ store, setStore }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
      {STORES.map((s) => (
        <button
          key={s}
          onClick={() => setStore(s)}
          style={{
            whiteSpace: "nowrap",
            padding: "9px 16px",
            borderRadius: 999,
            border: `1px solid ${store === s ? GOLD : LINE}`,
            background: store === s ? GOLD_SOFT : CARD,
            color: store === s ? "#7A5C2E" : "#78705F",
            fontFamily: "'Noto Sans KR'",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function ShareCompleteCard({ store, sharedAt }) {
  const { date, time } = fmtDateTime(sharedAt);
  return (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, padding: "48px 24px", marginTop: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(30,28,24,0.04)" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${JADE}`, color: JADE, fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        ✓
      </div>
      <div style={{ fontWeight: 700, fontSize: 21, marginBottom: 6 }}>공유 완료</div>
      <div style={{ color: MUTED, fontSize: 13.5, marginBottom: 24, fontFamily: "'Noto Sans KR'", fontWeight: 300 }}>{store}의 아침 시재 보고가 관리자 앱에 실시간 전달되었습니다</div>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: "14px 32px" }}>
        <span style={{ fontSize: 17, color: INK, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{date}</span>
        <span style={{ fontSize: 14, color: JADE, fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
    </div>
  );
}

function SharedLockedCard({ record, store }) {
  const { date, time } = fmtDateTime(record.sharedAt);
  return (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, padding: "28px 26px", marginTop: 16, boxShadow: "0 1px 3px rgba(30,28,24,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 11.5, color: MUTED, fontWeight: 600, letterSpacing: 0.5 }}>오늘 공유 완료 · 수정은 관리자만 가능</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Noto Sans KR'", fontSize: 11.5, color: JADE }}>
          <LivePulse size={5} />
          {time}
        </span>
      </div>
      <ReportPreview store={store} fields={record.fields} />
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 12, fontFamily: "'Noto Sans KR'" }}>
        {store} · {date} {time} 공유됨
      </div>
    </div>
  );
}

/* ---------------- 관리자 잠금 ---------------- */

function ManagerPinGate({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin === MANAGER_PIN) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div style={{ paddingTop: 60, display: "flex", justifyContent: "center" }}>
      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, padding: "40px 36px", textAlign: "center", boxShadow: "0 1px 3px rgba(30,28,24,0.04)", width: 320 }}>
        <div style={{ fontSize: 11, color: GOLD, fontFamily: "'Noto Sans KR'", fontWeight: 600, letterSpacing: 3, marginBottom: 10 }}>MANAGER ACCESS</div>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 24 }}>관리자 비밀번호</div>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          autoFocus
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••"
          style={{
            width: "100%",
            textAlign: "center",
            fontSize: 32,
            letterSpacing: 12,
            border: "none",
            borderBottom: `2px solid ${error ? WINE : GOLD}`,
            outline: "none",
            padding: "8px 0",
            fontFamily: "'Noto Serif KR'",
            fontWeight: 700,
            color: INK,
            background: "transparent",
            boxSizing: "border-box",
          }}
        />
        {error && <div style={{ color: WINE, fontFamily: "'Noto Sans KR'", fontSize: 12, marginTop: 10 }}>비밀번호가 올바르지 않습니다</div>}
        <button onClick={submit} style={{ ...goldBtn, width: "100%", marginTop: 26 }}>
          확인
        </button>
      </div>
    </div>
  );
}

/* ---------------- 관리자 화면 ---------------- */

function ManagerView({ data, persist, now }) {
  const [tab, setTab] = useState("board");
  const sharedCount = STORES.filter((s) => data[s]?.sharedAt && isSameDay(data[s].sharedAt, now)).length;

  return (
    <div style={{ paddingTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 19 }}>실시간 공유 현황</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4, fontFamily: "'Noto Sans KR'", fontWeight: 300 }}>
            오늘 {sharedCount} / {STORES.length}개 매장 공유 완료
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <SmallTab label="현황판" active={tab === "board"} onClick={() => setTab("board")} />
          <SmallTab label="공유 내역" active={tab === "history"} onClick={() => setTab("history")} />
        </div>
      </div>

      {tab === "board" ? <DispatchBoard data={data} persist={persist} now={now} /> : <HistoryPanel data={data} />}
    </div>
  );
}

function SmallTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 3,
        border: `1px solid ${active ? GOLD : LINE}`,
        background: active ? GOLD_SOFT : "transparent",
        color: active ? "#7A5C2E" : MUTED,
        fontFamily: "'Noto Sans KR'",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function DispatchBoard({ data, persist, now }) {
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(() => {
    return STORES.map((s) => {
      const r = data[s] || emptyRecord();
      const shared = r.sharedAt && isSameDay(r.sharedAt, now);
      return { store: s, record: r, shared };
    }).sort((a, b) => (a.shared === b.shared ? a.store.localeCompare(b.store) : a.shared ? -1 : 1));
  }, [data, now]);

  return (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(30,28,24,0.04)" }}>
      {rows.map(({ store, record, shared }, i) => (
        <DispatchRow key={store} store={store} record={record} shared={shared} isLast={i === rows.length - 1} expanded={expanded === store} onToggle={() => setExpanded(expanded === store ? null : store)} persist={persist} />
      ))}
    </div>
  );
}

function DispatchRow({ store, record, shared, isLast, expanded, onToggle, persist }) {
  const [editMode, setEditMode] = useState(false);
  const [editVal, setEditVal] = useState(record.fields || emptyFields());
  const { time } = record.sharedAt ? fmtDateTime(record.sharedAt) : { time: null };
  const total = computeTotal(record.fields || emptyFields());

  const set = (key) => (e) => setEditVal((d) => ({ ...d, [key]: e.target.value }));

  const saveEdit = async () => {
    const editedAt = new Date().toISOString();
    const next = { ...record, fields: editVal, history: [...(record.history || []), { fields: editVal, editedAt, editor: "관리자" }] };
    await persist(store, next);
    setEditMode(false);
  };

  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${LINE}` }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "17px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: shared ? JADE : WINE }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>{store}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {shared && <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 13.5, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{won(total)}</span>}
          <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 12.5, color: shared ? JADE : WINE, fontWeight: 600 }}>{shared ? time : "미공유"}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 22px" }}>
          {!editMode ? (
            <>
              <ReportPreview store={store} fields={record.fields || emptyFields()} />
              <button
                onClick={() => {
                  setEditVal(record.fields || emptyFields());
                  setEditMode(true);
                }}
                style={{ marginTop: 12, padding: "8px 16px", borderRadius: 3, border: `1px solid ${GOLD}`, background: "transparent", color: "#7A5C2E", fontFamily: "'Noto Sans KR'", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                관리자 수정
              </button>
            </>
          ) : (
            <div style={{ background: PAPER, border: `1px solid ${GOLD}`, borderRadius: 4, padding: 18, marginTop: 8 }}>
              <MoneyInput label="어제 출금 총금액" value={editVal.withdrawal} onChange={set("withdrawal")} />
              <CountInput label="만원권" unit="장" value={editVal.bill10000} onChange={set("bill10000")} />
              <CountInput label="오천원권" unit="장" value={editVal.bill5000} onChange={set("bill5000")} />
              <CountInput label="천원권" unit="장" value={editVal.bill1000} onChange={set("bill1000")} />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 3, border: `1px solid ${LINE}`, background: "transparent", color: MUTED, fontFamily: "'Noto Sans KR'", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  취소
                </button>
                <button onClick={saveEdit} style={{ flex: 1, padding: "9px 0", borderRadius: 3, border: "none", background: GOLD, color: "#241A05", fontFamily: "'Noto Sans KR'", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  수정 저장 (이력 기록)
                </button>
              </div>
            </div>
          )}

          {record.history && record.history.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'Noto Sans KR'", fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>수정 이력</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {record.history.slice().reverse().map((h, idx) => {
                  const t = fmtDateTime(h.editedAt);
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: MUTED, fontFamily: "'Noto Sans KR'" }}>
                      <span>{h.editor === "관리자" ? "관리자 수정" : "직원 공유"}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{t.date} {t.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "today", label: "오늘" },
  { key: "yesterday", label: "어제" },
  { key: "3d", label: "3일 전" },
  { key: "7d", label: "7일 전" },
  { key: "30d", label: "30일 전" },
  { key: "custom", label: "직접 날짜 선택" },
];

function HistoryPanel({ data }) {
  const [range, setRange] = useState("today");
  const [customDate, setCustomDate] = useState(() => fmtDateTime(new Date()).date);

  const allEntries = useMemo(() => {
    const entries = [];
    STORES.forEach((store) => {
      const r = data[store] || emptyRecord();
      (r.history || []).forEach((h) => entries.push({ store, ...h }));
    });
    return entries.sort((a, b) => new Date(b.editedAt) - new Date(a.editedAt));
  }, [data]);

  const filtered = useMemo(() => {
    const nowD = new Date();
    if (range === "custom") return allEntries.filter((e) => fmtDateTime(e.editedAt).date === customDate);
    if (range === "today" || range === "yesterday") {
      const target = range === "today" ? nowD : daysAgo(1);
      return allEntries.filter((e) => isSameDay(e.editedAt, target));
    }
    const rangeMap = { "3d": 3, "7d": 7, "30d": 30 };
    const cutoff = daysAgo(rangeMap[range]);
    return allEntries.filter((e) => new Date(e.editedAt) >= cutoff);
  }, [allEntries, range, customDate]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setRange(o.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${range === o.key ? GOLD : LINE}`,
              background: range === o.key ? GOLD_SOFT : CARD,
              color: range === o.key ? "#7A5C2E" : "#78705F",
              fontFamily: "'Noto Sans KR'",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          style={{ marginBottom: 16, background: CARD, border: `1px solid ${LINE}`, borderRadius: 3, color: INK, padding: "9px 12px", fontFamily: "'Noto Sans KR'", fontSize: 13 }}
        />
      )}

      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(30,28,24,0.04)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: 13.5, fontFamily: "'Noto Sans KR'" }}>해당 기간에 공유된 내역이 없습니다.</div>
        ) : (
          filtered.map((e, i) => {
            const t = fmtDateTime(e.editedAt);
            const total = computeTotal(e.fields || emptyFields());
            return (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i === filtered.length - 1 ? "none" : `1px solid ${LINE}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{e.store}</span>
                  <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 11.5, color: e.editor === "관리자" ? GOLD : JADE, fontWeight: 600 }}>
                    {t.date} {t.time}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontFamily: "'Noto Sans KR'" }}>{e.editor === "관리자" ? "관리자 수정" : "직원 공유"}</div>
                <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, color: "#57503F", display: "flex", justifyContent: "space-between" }}>
                  <span>시재 합계</span>
                  <span style={{ fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" }}>{won(total)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


ReactDOM.createRoot(document.getElementById("root")).render(<AppShareDemo />);
