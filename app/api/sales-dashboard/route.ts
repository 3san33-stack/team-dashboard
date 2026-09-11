import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { validateSalesData, type SalesRecord } from "@/lib/sales-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const setupMessage = "공용 저장소가 아직 준비되지 않았습니다. 관리자에게 판매 데이터 저장소 설정을 요청하세요.";

export async function GET() {
  try {
    const { data, error } = await db().from("sales_dashboard_data").select("payload,updated_at,updated_by").eq("id", 1).maybeSingle();
    if (error && error.code !== "PGRST205" && error.code !== "42P01") return json({ error: "공용 판매 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요." }, 503);
    if (data) {
      validateSalesData(data.payload);
      return json({ ...data, available: true });
    }
    const html = await readFile(path.join(process.cwd(), "public/sales-dashboard.html"), "utf8");
    const match = html.match(/const DATA = (.*);/);
    if (!match) throw new Error("Missing baseline");
    const payload = JSON.parse(match[1]);
    // Historical exports contain multiple rows per product/year. Preserve totals.
    const merged = new Map<string, SalesRecord>();
    for (const record of payload.records as SalesRecord[]) {
      const key = `${record.y}\t${record.n}`;
      const previous = merged.get(key);
      if (previous) previous.m = previous.m.map((quantity, month) => quantity + record.m[month]);
      else merged.set(key, { ...record, m: [...record.m] });
    }
    payload.records = [...merged.values()];
    validateSalesData(payload);
    return json({ payload, updated_at: null, updated_by: null, available: !error, message: error ? setupMessage : "기본 판매 데이터 · 아직 공용 업로드 없음" });
  } catch {
    return json({ error: "판매 데이터를 불러오지 못했습니다." }, 503);
  }
}

export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "허용되지 않은 요청입니다." }, 403);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 3500000) return json({ error: "판매 데이터가 너무 큽니다. 연도별로 나눠 업로드하세요." }, 413);
    const { payload, expectedVersion, updatedBy } = JSON.parse(raw);
    validateSalesData(payload);
    if (expectedVersion !== null && (typeof expectedVersion !== "string" || !Number.isFinite(Date.parse(expectedVersion)))) return json({ error: "저장 버전을 다시 확인하세요." }, 400);
    const value = { id: 1, payload, updated_by: typeof updatedBy === "string" ? updatedBy.slice(0, 50) : null, updated_at: new Date().toISOString() };
    const client = db();
    const query = expectedVersion === null
      ? client.from("sales_dashboard_data").insert(value)
      : client.from("sales_dashboard_data").update(value).eq("id", 1).eq("updated_at", expectedVersion);
    const { data, error } = await query.select("updated_at").maybeSingle();
    if (error?.code === "PGRST205" || error?.code === "42P01") return json({ error: setupMessage }, 503);
    if (error?.code === "23505" || (!error && !data)) return json({ error: "다른 팀원이 먼저 데이터를 저장했습니다. 새로고침 후 파일을 다시 선택하세요." }, 409);
    if (error || !data) return json({ error: "공용 저장에 실패했습니다. 기존 데이터는 유지됩니다. 다시 시도하세요." }, 503);
    return json({ updated_at: data.updated_at });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "파일을 확인해 주세요." }, 400);
  }
}
