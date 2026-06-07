import { NextResponse } from "next/server";
import { getMonitorOverview } from "@/lib/monitor/queries";

// Public read-only status feed for the dashboard / external clients.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = await getMonitorOverview();
    return NextResponse.json(overview);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 },
    );
  }
}
