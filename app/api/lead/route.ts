import { Pool } from "pg";
import { NextResponse } from "next/server";
import { normalizeByMobilePhone } from "@/lib/phone.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATTRIBUTION_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "gclid", "fbclid", "yclid", "landingPage", "submittedPage", "referrer",
] as const;

declare global {
  // Reuse a small pool while a serverless function instance stays warm.
  // eslint-disable-next-line no-var
  var kvartaPostgresPool: Pool | undefined;
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  if (!globalThis.kvartaPostgresPool) {
    globalThis.kvartaPostgresPool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 6000,
      idleTimeoutMillis: 10000,
    });
  }
  return globalThis.kvartaPostgresPool;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Проверьте данные формы и попробуйте ещё раз.", 400);
  }

  if (!body || typeof body !== "object") return jsonError("Проверьте данные формы и попробуйте ещё раз.", 400);
  const values = body as Record<string, unknown>;
  const name = typeof values.name === "string" ? values.name.trim().slice(0, 80) : "";
  const rawPhone = typeof values.phone === "string" ? values.phone : "";
  const phone = normalizeByMobilePhone(rawPhone);
  const interest = typeof values.interest === "string" ? values.interest.trim().slice(0, 100) : "";
  const comment = typeof values.comment === "string" ? values.comment.trim().slice(0, 500) : "";

  if (!phone) {
    return NextResponse.json({ error: "Введите белорусский мобильный номер в формате +375 29 123-45-67." }, { status: 422 });
  }
  if (!name) return jsonError("Укажите, как к вам обращаться.", 422);
  if (!interest) return jsonError("Выберите, какой кофе вас заинтересовал.", 422);

  const attribution: Record<string, string> = {};
  if (values.attribution && typeof values.attribution === "object") {
    const input = values.attribution as Record<string, unknown>;
    for (const key of ATTRIBUTION_KEYS) {
      const value = input[key];
      if (typeof value === "string" && value.length > 0) attribution[key] = value.slice(0, 500);
    }
  }

  try {
    const result = await getPool().query<{ lead_id: string | null; duplicate: boolean }>(
      `SELECT lead_id, duplicate
       FROM public.create_kvarta_lead($1, $2, $3, $4, $5, $6::jsonb)`,
      [name, phone, phone.slice(1), interest, comment, JSON.stringify(attribution)],
    );
    const lead = result.rows[0];
    if (lead?.duplicate) {
      return NextResponse.json({ error: "Для этого номера заявка уже отправлена." }, { status: 409 });
    }
    if (!lead?.lead_id) throw new Error("Database did not return a lead id");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Lead database write failed", error instanceof Error ? error.message : "unknown error");
    return jsonError("Не получилось сохранить заявку. Попробуйте ещё раз чуть позже.", 503);
  }
}
