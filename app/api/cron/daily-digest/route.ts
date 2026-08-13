import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { memberSummary } from "@/lib/derived";
import { MEMBERS } from "@/lib/types";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type Subscription = { id: string; member: string; endpoint: string; p256dh: string; auth: string };

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: tasks, error: tasksError }, { data: subs, error: subsError }] = await Promise.all([
    supabase.from("tasks").select("*"),
    supabase.from("push_subscriptions").select("*"),
  ]);
  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

  const subscriptions = (subs ?? []) as Subscription[];
  const staleIds: string[] = [];
  let sent = 0;

  for (const member of MEMBERS) {
    const memberSubs = subscriptions.filter((s) => s.member === member);
    if (memberSubs.length === 0) continue;

    const s = memberSummary(tasks ?? [], member);
    const payload = JSON.stringify({
      title: `${member}님, 오늘의 업무 현황`,
      body: `전체 ${s.total}건 · 진행중 ${s.inProgress} · 완료 ${s.completed} · 지연 ${s.overdue} · 평균진행률 ${s.avgProgress}%`,
    });

    for (const sub of memberSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        // 410/404 = the browser unsubscribed or the endpoint expired; drop it.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) staleIds.push(sub.id);
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent, removedStale: staleIds.length });
}
