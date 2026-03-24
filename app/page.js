"use client";
import { useState, useEffect, useCallback } from "react";

const CATEGORIES = ["Today", "This Week", "Upcoming", "Done"];
const PRIORITY_COLORS = { high: "#f85149", normal: "#58a6ff", low: "#8b949e" };
const CATEGORY_COLORS = {
  Today: "#f0883e",
  "This Week": "#58a6ff",
  Upcoming: "#8b949e",
  Done: "#3fb950",
};

export default function TodoBoard() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("Today");
  const [newPriority, setNewPriority] = useState("normal");
  const [showAdd, setShowAdd] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      if (data.todos) { setTodos(data.todos); setLastUpdated(data.updated); }
    } catch (e) { console.error("Failed to fetch todos:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const apiPatch = async (body) => {
    const res = await fetch("/api/todos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.todos) setTodos(data.todos);
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    await apiPatch({ action: "add", todo: { text: newText.trim(), category: newCategory, priority: newPriority, source: "manual" } });
    setNewText(""); setShowAdd(false);
  };

  const toggleTodo = (id) => apiPatch({ action: "toggle", id });
  const deleteTodo = (id) => apiPatch({ action: "delete", id });
  const startEdit = (todo) => { setEditingId(todo.id); setEditText(todo.text); };
  const saveEdit = async (id) => { if (editText.trim()) { await apiPatch({ action: "update", id, todo: { text: editText.trim() } }); } setEditingId(null); };
  const moveTodo = async (todoId, toCategory) => { await apiPatch({ action: "reorder", todo: { todoId, toCategory } }); };
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, category) => { e.preventDefault(); if (draggedId) { moveTodo(draggedId, category); setDraggedId(null); } };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const todosInCategory = (cat) => todos.filter((t) => (cat === "Done" ? t.done : t.category === cat && !t.done));

  if (loading) {
    return (<div style={styles.loadingContainer}><div style={styles.spinner} /><p style={{ color: "#8b949e", marginTop: 16 }}>Loading your board...</p></div>);
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Jon&apos;s Board</h1>
          {lastUpdated && (<span style={styles.lastUpdated}>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>)}
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={styles.addButton}>{showAdd ? "\u2715" : "+ Add"}</button>
      </header>

      {showAdd && (
        <form onSubmit={addTodo} style={styles.addForm}>
          <input type="text" placeholder="What needs to get done?" value={newText} onChange={(e) => setNewText(e.target.value)} style={styles.input} autoFocus />
          <div style={styles.addFormRow}>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={styles.select}>
              {CATEGORIES.filter((c) => c !== "Done").map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={styles.select}>
              <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
            </select>
            <button type="submit" style={styles.submitButton}>Add</button>
          </div>
        </form>
      )}

      <div style={styles.board}>
        {CATEGORIES.map((cat) => {
          const items = todosInCategory(cat);
          return (
            <div key={cat} style={styles.column} onDrop={(e) => handleDrop(e, cat)} onDragOver={handleDragOver}>
              <div style={styles.columnHeader}>
                <span style={{ ...styles.columnDot, backgroundColor: CATEGORY_COLORS[cat] }} />
                <h2 style={styles.columnTitle}>{cat}</h2>
                <span style={styles.columnCount}>{items.length}</span>
              </div>
              <div style={styles.cardList}>
                {items.map((todo) => (
                  <div key={todo.id} draggable onDragStart={(e) => handleDragStart(e, todo.id)} style={{ ...styles.card, borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.normal}`, opacity: todo.done ? 0.6 : 1 }}>
                    <div style={styles.cardTop}>
                      <button onClick={() => toggleTodo(todo.id)} style={{ ...styles.checkbox, backgroundColor: todo.done ? "#3fb950" : "transparent", borderColor: todo.done ? "#3fb950" : "#484f58" }}>{todo.done && "\u2713"}</button>
                      {editingId === todo.id ? (
                        <input value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={() => saveEdit(todo.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(todo.id)} style={styles.editInput} autoFocus />
                      ) : (
                        <span onClick={() => startEdit(todo)} style={{ ...styles.cardText, textDecoration: todo.done ? "line-through" : "none", cursor: "pointer" }}>{todo.text}</span>
                      )}
                    </div>
                    <div style={styles.cardBottom}>
                      <span style={styles.cardMeta}>{todo.source === "claude" ? "\ud83e\udd16" : ""}{" "}{todo.createdAt && new Date(todo.createdAt).toLocaleDateString()}</span>
                      <div style={styles.cardActions}>
                        {!todo.done && CATEGORIES.filter((c) => c !== "Done" && c !== todo.category).map((c) => (
                          <button key={c} onClick={() => moveTodo(todo.id, c)} style={styles.moveButton} title={`Move to ${c}`}>\u2192{c.charAt(0)}</button>
                        ))}
                        <button onClick={() => deleteTodo(todo.id)} style={styles.deleteButton}>\u2715</button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (<div style={styles.emptyState}>{cat === "Done" ? "Complete tasks to see them here" : "No items yet"}</div>)}
              </div>
            </div>
          );
        })}
      </div>

      <footer style={styles.footer}>
        <span>Synced with Claude Cowork</span>
        <button onClick={fetchTodos} style={styles.refreshButton}>\u21bb Refresh</button>
      </footer>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1200, margin: "0 auto", padding: "16px", minHeight: "100vh" },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },
  spinner: { width: 32, height: 32, border: "3px solid #30363d", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #21262d" },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 12 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: "#e6edf3" },
  lastUpdated: { fontSize: 12, color: "#8b949e" },
  addButton: { padding: "8px 16px", backgroundColor: "#238636", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  addForm: { backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16, marginBottom: 16 },
  input: { width: "100%", padding: "10px 12px", backgroundColor: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", fontSize: 14, marginBottom: 10, boxSizing: "border-box" },
  addFormRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  select: { padding: "8px 12px", backgroundColor: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", fontSize: 13, flex: 1, minWidth: 100 },
  submitButton: { padding: "8px 20px", backgroundColor: "#238636", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  board: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  column: { backgroundColor: "#161b22", borderRadius: 8, padding: 12, minHeight: 200 },
  columnHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #21262d" },
  columnDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  columnTitle: { fontSize: 14, fontWeight: 600, margin: 0, color: "#e6edf3" },
  columnCount: { fontSize: 12, color: "#8b949e", backgroundColor: "#21262d", padding: "1px 8px", borderRadius: 10, marginLeft: "auto" },
  cardList: { display: "flex", flexDirection: "column", gap: 8 },
  card: { backgroundColor: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: "10px 12px", cursor: "grab", transition: "border-color 0.15s" },
  cardTop: { display: "flex", alignItems: "flex-start", gap: 8 },
  checkbox: { width: 18, height: 18, border: "2px solid #484f58", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 11, color: "#fff", fontWeight: 700, marginTop: 1, padding: 0 },
  cardText: { fontSize: 13, lineHeight: "1.4", color: "#e6edf3", flex: 1 },
  editInput: { flex: 1, padding: "4px 8px", backgroundColor: "#0d1117", border: "1px solid #58a6ff", borderRadius: 4, color: "#e6edf3", fontSize: 13 },
  cardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  cardMeta: { fontSize: 11, color: "#484f58" },
  cardActions: { display: "flex", gap: 4 },
  moveButton: { padding: "2px 6px", backgroundColor: "transparent", border: "1px solid #30363d", borderRadius: 4, color: "#8b949e", fontSize: 10, cursor: "pointer" },
  deleteButton: { padding: "2px 6px", backgroundColor: "transparent", border: "1px solid #30363d", borderRadius: 4, color: "#f85149", fontSize: 11, cursor: "pointer" },
  emptyState: { textAlign: "center", color: "#484f58", fontSize: 13, padding: "24px 0" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #21262d", color: "#484f58", fontSize: 12 },
  refreshButton: { padding: "6px 12px", backgroundColor: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", cursor: "pointer", fontSize: 12 },
};
