import { NextResponse } from "next/server";
import { runDueEmailAutomation } from "@/lib/emailAutomation";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await runDueEmailAutomation();
  return NextResponse.json({ results });
}
