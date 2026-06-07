import { NextResponse } from "next/server";
import { runMonitor } from "@/lib/monitor/runner";

// Trigger one monitoring pass. Protect with MONITOR_SECRET so only your
// scheduler (cron / GitHub Action / Vercel Cron) can invoke it.
//
//   curl -X POST https://<host>/api/monitor/run \
//        -H "Authorization: Bearer $MONITOR_SECRET"
//
// GET is also supported (handy for Vercel Cron) using ?secret=... or the header.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.MONITOR_SECRET;
  if (!secret) return true; // no secret configured => open (dev only)
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "");
  const url = new URL(req.url);
  const query = url.searchParams.get("secret") ?? "";
  return bearer === secret || query === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runMonitor("api");
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("monitor run failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "run failed" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
