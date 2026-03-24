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

const KEY = "email-triage";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const r = getRedis();
    const raw = await r.get(KEY);
    const allRuns = raw ? JSON.parse(raw) : [];
    const runs = allRuns.slice(-limit);
    const emails = [];
    for (const run of runs) {
      if (run.emails) {
        for (const email of run.emails) {
          emails.push({ ...email, triageTime: run.timestamp });
        }
      }
    }
    return NextResponse.json({
      runs: runs.length,
      emails,
      buckets: {
        needs_response: emails.filter(e => e.bucket === "NEEDS_RESPONSE"),
        vendor_ad: emails.filter(e => e.bucket === "VENDOR_AD"),
        lccs: emails.filter(e => e.bucket === "LCCS_RELATED"),
        financial: emails.filter(e => e.bucket === "FINANCIAL"),
        archive: emails.filter(e => e.bucket === "OK_TO_ARCHIVE"),
      },
      updated: new Date().toISOString()
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const run = await req.json();
    run.timestamp = run.timestamp || new Date().toISOString();
    const r = getRedis();
    const raw = await r.get(KEY);
    const allRuns = raw ? JSON.parse(raw) : [];
    allRuns.push(run);
    const trimmed = allRuns.slice(-50);
    await r.set(KEY, JSON.stringify(trimmed));
    return NextResponse.json({ ok: true, totalRuns: trimmed.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const r = getRedis();
    await r.del(KEY);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
