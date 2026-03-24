import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY = "todos";

export async function GET() {
  try {
    const todos = (await redis.get(KEY)) || [];
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
    await redis.set(KEY, todos);
    return NextResponse.json({ ok: true, count: todos.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { action, todo, id } = await req.json();
    let todos = (await redis.get(KEY)) || [];

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

    await redis.set(KEY, todos);
    return NextResponse.json({ ok: true, todos });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
