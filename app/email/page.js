"use client";
import { useState, useEffect, useCallback } from "react";

const BUCKETS = {
  needs_response: { label: "Needs Response", color: "#e74c3c", bg: "#2d1518", icon: "🔴" },
  financial: { label: "Financial", color: "#f39c12", bg: "#2d2415", icon: "💰" },
  lccs: { label: "LCCS", color: "#3498db", bg: "#152a2d", icon: "🏫" },
  vendor_ad: { label: "Vendor / Ad", color: "#95a5a6", bg: "#1e2124", icon: "📢" },
  archive: { label: "OK to Archive", color: "#27ae60", bg: "#152d1a", icon: "✅" },
};

const PRIORITY_COLORS = { HIGH: "#e74c3c", MEDIUM: "#f39c12", LOW: "#7f8c8d" };

export default function EmailDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBucket, setActiveBucket] = useState("needs_response");
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/email-triage?limit=20");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const styles = {
    container: { minHeight: "100vh", backgroundColor: "#0d1117", color: "#e6edf3", padding: "16px", maxWidth: "1200px", margin: "0 auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" },
    title: { fontSize: "24px", fontWeight: "bold", margin: 0 },
    subtitle: { fontSize: "13px", color: "#8b949e", marginTop: "4px" },
    refreshBtn: { padding: "8px 16px", backgroundColor: "#21262d", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", cursor: "pointer", fontSize: "14px" },
    tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
    tab: (active, color) => ({ padding: "8px 16px", borderRadius: "20px", border: "1px solid " + (active ? color : "#30363d"), backgroundColor: active ? color + "22" : "#161b22", color: active ? color : "#8b949e", cursor: "pointer", fontSize: "13px", fontWeight: active ? "600" : "400", transition: "all 0.15s" }),
    badge: (color) => ({ backgroundColor: color, color: "#fff", borderRadius: "10px", padding: "1px 8px", fontSize: "11px", marginLeft: "6px", fontWeight: "bold" }),
    emailCard: { backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "14px 16px", marginBottom: "8px" },
    emailFrom: { fontSize: "15px", fontWeight: "600", color: "#e6edf3" },
    emailSubject: { fontSize: "14px", color: "#8b949e", marginTop: "4px" },
    emailSnippet: { fontSize: "13px", color: "#6e7681", marginTop: "8px", lineHeight: "1.4" },
    emailMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px", color: "#6e7681" },
    priority: (p) => ({ fontSize: "11px", fontWeight: "bold", color: PRIORITY_COLORS[p] || "#8b949e", textTransform: "uppercase", letterSpacing: "0.5px" }),
    draftBadge: { backgroundColor: "#1f6feb22", color: "#58a6ff", border: "1px solid #1f6feb44", borderRadius: "4px", padding: "2px 8px", fontSize: "11px" },
    emptyState: { textAlign: "center", padding: "60px 20px", color: "#6e7681" },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "20px" },
    statCard: (color) => ({ backgroundColor: "#161b22", border: "1px solid " + color + "44", borderRadius: "8px", padding: "12px", textAlign: "center" }),
    statNum: (color) => ({ fontSize: "28px", fontWeight: "bold", color }),
    statLabel: { fontSize: "11px", color: "#8b949e", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" },
  };

  if (loading && !data) {
    return (<div style={styles.container}><div style={styles.emptyState}><div style={{ fontSize: "36px", marginBottom: "12px" }}>📨</div><p>Loading email triage data...</p></div></div>);
  }

  const buckets = data?.buckets || {};
  const totalEmails = data?.emails?.length || 0;
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Email Triage</h1>
          <div style={styles.subtitle}>
            {totalEmails} emails processed across {data?.runs || 0} runs
            {data?.updated && (" · Last updated " + fmtTime(data.updated))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <a href="/" style={{ ...styles.refreshBtn, textDecoration: "none" }}>← Board</a>
          <button onClick={fetchData} style={styles.refreshBtn}>↻ Refresh</button>
        </div>
      </div>

      <div style={styles.statsRow}>
        {Object.entries(BUCKETS).map(([key, { label, color, icon }]) => (
          <div key={key} style={styles.statCard(color)}>
            <div style={styles.statNum(color)}>{(buckets[key] || []).length}</div>
            <div style={styles.statLabel}>{icon} {label}</div>
          </div>
        ))}
      </div>

      <div style={styles.tabs}>
        {Object.entries(BUCKETS).map(([key, { label, color, icon }]) => (
          <button key={key} onClick={() => setActiveBucket(key)} style={styles.tab(activeBucket === key, color)}>
            {icon} {label}
            <span style={styles.badge(color)}>{(buckets[key] || []).length}</span>
          </button>
        ))}
      </div>

      {error && (<div style={{ ...styles.emailCard, borderColor: "#e74c3c" }}><span style={{ color: "#e74c3c" }}>Error: {error}</span></div>)}

      {(buckets[activeBucket] || []).length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>{BUCKETS[activeBucket]?.icon}</div>
          <p style={{ fontSize: "16px", marginBottom: "4px" }}>No emails in {BUCKETS[activeBucket]?.label}</p>
          <p style={{ fontSize: "13px" }}>Emails will appear here after the triage agent runs.</p>
        </div>
      ) : (
        (buckets[activeBucket] || []).sort((a, b) => {
          const pOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          return (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3);
        }).map((email, i) => (
          <div key={i} style={styles.emailCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={styles.emailFrom}>{email.from || "Unknown"}</div>
              {email.priority && <span style={styles.priority(email.priority)}>{email.priority}</span>}
            </div>
            <div style={styles.emailSubject}>{email.subject || "(no subject)"}</div>
            {email.snippet && <div style={styles.emailSnippet}>{email.snippet.slice(0, 200)}{email.snippet.length > 200 ? "..." : ""}</div>}
            <div style={styles.emailMeta}>
              <span>{fmtTime(email.date || email.triageTime)}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {email.draftCreated && <span style={styles.draftBadge}>Draft created</span>}
                {email.todoCreated && <span style={{ ...styles.draftBadge, borderColor: "#2ea04344", color: "#3fb950" }}>Todo added</span>}
              </div>
            </div>
          </div>
        ))
      )}

      <div style={{ textAlign: "center", padding: "24px", color: "#6e7681", fontSize: "13px", borderTop: "1px solid #21262d", marginTop: "24px" }}>
        Synced with Claude Cowork · Triage runs every 30 min
      </div>
    </div>
  );
              }
