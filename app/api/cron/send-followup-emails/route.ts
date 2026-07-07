import { NextResponse } from "next/server";
import { runDueEmailAutomation } from "@/lib/emailAutomation";

// cronから毎回叩かれるルートなので、Next.jsのキャッシュに載せず必ず生きた状態で実行する
export const dynamic = "force-dynamic";
// SMTP送信が複数件に及ぶとコールドスタート込みで時間がかかるため、実行時間の上限を伸ばす
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDueEmailAutomation();
    return NextResponse.json({ results });
  } catch (err) {
    console.error("send-followup-emails cron failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
