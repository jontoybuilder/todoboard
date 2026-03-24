import Redis from "ioredis";
import { NextResponse } from "next/server";

let redis;
function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.KV_REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

const KEY = "todos";

export async function GET() {
  try {
    const r = getRedis();
    const raw = await r.get(KEY);
    const todos = raw ? JSON.parse(raw) : [];
    return NextResponse.json({ todos, updated: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { todos } = await req.json();
    if (!Array.isArray(todos)) {
      return NextResponse.json({ error: "todos must be an array" }, { status: 400 });
    }
    const r = getRedis();
    await r.set(KEY, JSON.stringify(todos));
    return NextResponse.json({ ok: true, count: todos.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { action, todo, id } = await req.json();
    const r = getRedis();
    const raw = await r.get(KEY);
    let todos = raw ? JSON.parse(raw) : [];

    if (action === "add") {
      const newTodo = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: todo.text,
        category: todo.category || "Today",
        priority: todo.priority || "normal",
        done: false,
        createdAt: new Date().toISOString(),
        source: todo.source || "manual",
      };
      todos.push(newTodo);
    } else if (action === "toggle" && id) {
      todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null } : t));
    } else if (action === "update" && id) {
      todos = todos.map((t) => (t.id === id ? { ...t, ...todo } : t));
    } else if (action === "delete" && id) {
      todos = todos.filter((t) => t.id !== id);
    } else if (action === "reorder") {
      const { fromCategory, toCategory, todoId } = todo;
      todos = todos.map((t) => (t.id === todoId ? { ...t, category: toCategory } : t));
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await r.set(KEY, JSON.stringify(todos));
    return NextResponse.json({ ok: true, todos });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
