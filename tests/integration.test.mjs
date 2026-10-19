import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "DATABASE_URL is required for API integration tests");

const db = new Pool({ connectionString, max: 1 });
const phoneDigits = `37529${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
const phone = `+${phoneDigits}`;
let app;

before(async () => {
  await db.query(await readFile("db/init/001_create_leads.sql", "utf8"));
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"], {
    env: { ...process.env, PORT: "3000" },
    stdio: "ignore",
  });

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (app.exitCode !== null) throw new Error(`Next.js server exited with code ${app.exitCode}`);
    try {
      const response = await fetch("http://127.0.0.1:3000/");
      if (response.ok) return;
    } catch {
      // Wait until the production server accepts requests.
    }
    await delay(500);
  }
  throw new Error("Next.js production server did not become ready within 45 seconds");
});

after(async () => {
  await db.query("DELETE FROM public.leads WHERE phone_digits = $1", [phoneDigits]);
  await db.end();
  app?.kill("SIGTERM");
});

async function submit(body) {
  return fetch("http://127.0.0.1:3000/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("landing page renders the product section and lead form", async () => {
  const response = await fetch("http://127.0.0.1:3000/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<h1[^>]*id="hero-title"/);
  assert.match(html, /id="coffee"/);
  assert.equal((html.match(/class="coffee-card/g) ?? []).length, 3);
  assert.match(html, /name="phone"/);
  assert.match(html, /name="interest"/);
  assert.match(html, /<option value="Вопрос по кофе">Вопрос по кофе<\/option>/);
  assert.match(html, /<option value="Уила">Колумбия Уила<\/option>/);
});

test("lead records are protected by row-level security", async () => {
  const result = await db.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.leads'::regclass");
  assert.equal(result.rows[0]?.relrowsecurity, true);
});

test("API rejects an invalid phone without creating a lead", async () => {
  const response = await submit({ name: "Тест", phone: "+375 17 123-45-67", interest: "Эспрессо" });
  assert.equal(response.status, 422);
  const rows = await db.query("SELECT id FROM public.leads WHERE phone_digits = $1", [phoneDigits]);
  assert.equal(rows.rowCount, 0);
});

test("API saves a lead with allowed attribution and blocks a repeated submission", async () => {
  const payload = {
    name: "Интеграционный тест",
    phone,
    interest: "Зерно для эспрессо",
    comment: "Проверка сохранения",
    attribution: { utm_source: "ci-test", arbitrary: "must not persist" },
  };
  const created = await submit(payload);
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { ok: true });

  const saved = await db.query(
    "SELECT name, phone, interest, comment, attribution FROM public.leads WHERE phone_digits = $1",
    [phoneDigits],
  );
  assert.equal(saved.rowCount, 1);
  assert.deepEqual(saved.rows[0], {
    name: payload.name,
    phone,
    interest: payload.interest,
    comment: payload.comment,
    attribution: { utm_source: "ci-test" },
  });

  const repeated = await submit(payload);
  assert.equal(repeated.status, 409);
});
