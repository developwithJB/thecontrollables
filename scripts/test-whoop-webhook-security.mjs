import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const name = "whoop_webhook_qa_" + randomUUID().replaceAll("-", ""),
  admin = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", {
    max: 1,
  });
let sql,
  created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  sql = postgres("postgresql://postgres:postgres@127.0.0.1:55322/" + name);
  await sql.unsafe(
    "CREATE TABLE whoop_webhook_events(id uuid DEFAULT gen_random_uuid(),payload jsonb);GRANT ALL ON whoop_webhook_events TO anon,authenticated,service_role;INSERT INTO whoop_webhook_events(payload) VALUES('{\"historical\":true}');",
  );
  const migration = readFileSync(
    "supabase/migrations/20261021000600_whoop_webhook_integrity.sql",
    "utf8",
  );
  await sql.unsafe(migration);
  await sql.unsafe(migration);
  console.log("PASS migration applies twice and preserves historical events");
  assert.equal(
    (await sql`SELECT count(*)::int AS n FROM whoop_webhook_events`)[0].n,
    1,
  );
  for (const role of ["anon", "authenticated"]) {
    for (const query of [
      "SELECT * FROM whoop_webhook_events",
      "INSERT INTO whoop_webhook_events DEFAULT VALUES",
    ])
      await assert.rejects(
        sql.begin(async (tx) => {
          await tx.unsafe("SET LOCAL ROLE " + role);
          return tx.unsafe(query);
        }),
        /permission denied/,
      );
  }
  console.log("PASS anonymous and authenticated event reads/writes are denied");
  await sql.begin(async (tx) => {
    await tx`SET LOCAL ROLE service_role`;
    await tx`INSERT INTO whoop_webhook_events(delivery_key) VALUES('synthetic-delivery')`;
  });
  await assert.rejects(
    sql`INSERT INTO whoop_webhook_events(delivery_key) VALUES('synthetic-delivery')`,
    /duplicate key/,
  );
  console.log(
    "PASS provider delivery identity deduplicates privileged inserts",
  );
  console.log("3 WHOOP database checks passed");
} finally {
  if (sql) await sql.end();
  if (created) await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
