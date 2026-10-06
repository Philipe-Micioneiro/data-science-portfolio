/* ============================================================
   UI primitives — shared across screens
   Exposes a set of components + helpers on window.
   ============================================================ */
const { useState, useEffect, useRef, createContext, useContext, useCallback } = React;

/* ---- Avatar w/ deterministic color ---- */
const AV_COLORS = ["#2563EB","#7C3AED","#0EA5E9","#059669","#D97706","#DB2777","#4F46E5","#0891B2","#CA8A04","#DC2626"];
function avColor(seed) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[p.length - 1]?.[0] || "")).toUpperCase();
}
function Avatar({ name, size = "md", color }) {
  return (
    <span className={"av av-" + size} style={{ background: color || avColor(name) }}>
      {initials(name)}
    </span>
  );
}

/* ---- Status badge (aluno + financeiro) ---- */
const STATUS_MAP = {
  "Ativo": "badge-green",
  "Atrasado": "badge-red",
  "Pendente de Validação": "badge-amber",
  "Inativo": "badge-gray",
  "Pago": "badge-green",
};
function StatusBadge({ status, short }) {
  const cls = STATUS_MAP[status] || "badge-gray";
  const label = short && status === "Pendente de Validação" ? "Pendente" : status;
  return <span className={"badge " + cls}><span className="dot"></span>{label}</span>;
}

/* ---- KPI card ---- */
function KpiCard({ label, value, icon, tone = "blue", delta, sub, onClick, active }) {
  const tones = {
    blue: { c: "var(--blue)", bg: "var(--blue-50)" },
    green: { c: "var(--green-text)", bg: "var(--green-bg)" },
    red: { c: "var(--red-text)", bg: "var(--red-bg)" },
    amber: { c: "var(--amber-text)", bg: "var(--amber-bg)" },
    gray: { c: "var(--muted)", bg: "var(--hover)" },
  };
  const t = tones[tone] || tones.blue;
  return (
    <div className="card" onClick={onClick}
      style={{ padding: 18, cursor: onClick ? "pointer" : "default",
        outline: active ? "2px solid var(--blue)" : "none", transition: "box-shadow .14s, outline .1s" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = "var(--sh)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = "var(--sh-sm)")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: t.bg, color: t.c,
          display: "grid", placeItems: "center" }}>
          <Icon name={icon} size={17} />
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
        <span style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {delta != null && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12.5, fontWeight: 600,
            color: delta >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
            <Icon name={delta >= 0 ? "trendUp" : "trendDown"} size={13} />{Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ---- Section header inside cards ---- */
function CardHead({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/* ---- Search input ---- */
function SearchInput({ value, onChange, placeholder = "Buscar…", width = 280 }) {
  return (
    <div style={{ position: "relative", width }}>
      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)", pointerEvents: "none" }}>
        <Icon name="search" size={16} />
      </span>
      <input className="input" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ paddingLeft: 34, height: 38 }} />
    </div>
  );
}

/* ---- Segmented filter chips ---- */
function FilterChips({ options, value, onChange, counts }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{ height: 32, padding: "0 12px", borderRadius: 99, fontSize: 13, fontWeight: 500,
              border: "1px solid " + (on ? "var(--blue)" : "var(--line-2)"),
              background: on ? "var(--blue)" : "var(--surface)",
              color: on ? "#fff" : "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 7,
              boxShadow: on ? "none" : "var(--sh-sm)", transition: "all .12s" }}>
            {o.label}
            {counts && counts[o.value] != null &&
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                background: on ? "rgba(255,255,255,.22)" : "var(--hover)", color: on ? "#fff" : "var(--muted)" }}>
                {counts[o.value]}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Modal ---- */
function Modal({ open, onClose, children, width = 520, title, sub, icon }) {
  useEffect(() => {
    if (!open) return;
    const h = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="card fade-in" onMouseDown={e => e.stopPropagation()}
        style={{ width, maxWidth: "100%", boxShadow: "var(--sh-lg)", marginTop: 12 }}>
        {title && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
            {icon && <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--blue-50)", color: "var(--blue)", display: "grid", placeItems: "center" }}><Icon name={icon} size={19} /></span>}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16.5 }}>{title}</div>
              {sub && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
            </div>
            <button className="btn btn-subtle btn-icon btn-sm" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---- Toast system ---- */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span style={{ color: t.kind === "err" ? "#FCA5A5" : t.kind === "warn" ? "#FCD34D" : "#86EFAC", display: "flex" }}>
              <Icon name={t.kind === "err" ? "xCircle" : t.kind === "warn" ? "alert" : "checkCircle"} size={18} />
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

/* ---- Empty state ---- */
function Empty({ icon = "inbox", title, sub }) {
  return (
    <div style={{ padding: "56px 20px", textAlign: "center", color: "var(--muted)" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--hover)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "var(--muted-2)" }}>
        <Icon name={icon} size={24} />
      </div>
      <div style={{ fontWeight: 600, color: "var(--ink-2)", fontSize: 15 }}>{title}</div>
      {sub && <div style={{ fontSize: 13.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ============================================================
   Charts (simple SVG — line + bars)
   ============================================================ */
function LineChart({ series, height = 200, color = "var(--blue)", fill = "rgba(37,99,235,.10)", valueFmt = v => v }) {
  const w = 640, h = height, pad = { t: 16, r: 12, b: 26, l: 44 };
  const xs = series.map(d => d.valor);
  const max = Math.max(...xs) * 1.1, min = Math.min(...xs) * 0.85;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const X = i => pad.l + (i / (series.length - 1)) * iw;
  const Y = v => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const pts = series.map((d, i) => [X(i), Y(d.valor)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${X(series.length - 1).toFixed(1)} ${(pad.t + ih).toFixed(1)} L ${pad.l} ${(pad.t + ih).toFixed(1)} Z`;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = min + (i / ticks) * (max - min); const y = Y(v);
        return <g key={i}>
          <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--line)" strokeWidth="1" />
          <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--muted-2)">{valueFmt(Math.round(v))}</text>
        </g>;
      })}
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={color} strokeWidth="2" />)}
      {series.map((d, i) => <text key={i} x={X(i)} y={h - 7} textAnchor="middle" fontSize="10.5" fill="var(--muted-2)">{d.mes}</text>)}
    </svg>
  );
}

function BarsChart({ series, height = 200, valueFmt = v => v }) {
  const w = 640, h = height, pad = { t: 16, r: 12, b: 26, l: 48 };
  const max = Math.max(...series.map(d => Math.max(d.prevista || d.valor || 0, d.recebida || 0))) * 1.1;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const step = iw / series.length;
  const dual = series[0].recebida != null;
  const bw = dual ? step * 0.28 : step * 0.46;
  const Y = v => pad.t + ih - (v / (max || 1)) * ih;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = (i / ticks) * max; const y = Y(v);
        return <g key={i}>
          <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--line)" strokeWidth="1" />
          <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--muted-2)">{valueFmt(Math.round(v))}</text>
        </g>;
      })}
      {series.map((d, i) => {
        const cx = pad.l + step * i + step / 2;
        if (dual) {
          return <g key={i}>
            <rect x={cx - bw - 2} y={Y(d.prevista)} width={bw} height={pad.t + ih - Y(d.prevista)} rx="3" fill="var(--blue-100)" />
            <rect x={cx + 2} y={Y(d.recebida)} width={bw} height={pad.t + ih - Y(d.recebida)} rx="3" fill="var(--blue)" />
            <text x={cx} y={h - 7} textAnchor="middle" fontSize="10.5" fill="var(--muted-2)">{d.mes}</text>
          </g>;
        }
        return <g key={i}>
          <rect x={cx - bw} y={Y(d.valor)} width={bw * 2} height={pad.t + ih - Y(d.valor)} rx="3" fill="var(--red)" opacity="0.85" />
          <text x={cx} y={h - 7} textAnchor="middle" fontSize="10.5" fill="var(--muted-2)">{d.mes}</text>
        </g>;
      })}
    </svg>
  );
}

/* ============================================================
   Export helpers — CSV + simple .xls (SpreadsheetML) download
   ============================================================ */
function downloadBlob(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
function exportCSV(filename, columns, rows) {
  const esc = v => { v = v == null ? "" : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const lines = [columns.map(c => esc(c.label)).join(";")];
  rows.forEach(r => lines.push(columns.map(c => esc(c.get(r))).join(";")));
  downloadBlob(filename + ".csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8;");
}
function exportXLSX(filename, columns, rows) {
  // Minimal Excel-readable HTML table (.xls) — opens natively in Excel/Sheets.
  const esc = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let t = '<table border="1"><thead><tr>';
  columns.forEach(c => t += `<th style="background:#2563EB;color:#fff;font-family:Inter,Arial">${esc(c.label)}</th>`);
  t += "</tr></thead><tbody>";
  rows.forEach(r => { t += "<tr>"; columns.forEach(c => t += `<td>${esc(c.get(r))}</td>`); t += "</tr>"; });
  t += "</tbody></table>";
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${t}</body></html>`;
  downloadBlob(filename + ".xls", html, "application/vnd.ms-excel");
}

/* ---- Export menu button ---- */
function ExportMenu({ onExport, label = "Exportar" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
        <Icon name="download" size={15} />{label}<Icon name="chevD" size={14} />
      </button>
      {open && (
        <div className="card fade-in" style={{ position: "absolute", right: 0, top: 42, width: 184, zIndex: 30, boxShadow: "var(--sh-lg)", padding: 5 }}>
          {[["xlsx", "sheet", "Exportar XLSX"], ["csv", "file", "Exportar CSV"]].map(([k, ic, lab]) => (
            <button key={k} onClick={() => { setOpen(false); onExport(k); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", background: "transparent", borderRadius: 8, fontSize: 13.5, color: "var(--ink-2)", fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Icon name={ic} size={16} />{lab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  Avatar, avColor, initials, StatusBadge, KpiCard, CardHead, SearchInput, FilterChips,
  Modal, ToastProvider, useToast, Empty, LineChart, BarsChart,
  exportCSV, exportXLSX, ExportMenu, downloadBlob,
});
