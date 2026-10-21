// Apply the exact migration twice to a new disposable database on the local QA cluster.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const name = "security_qa_" + randomUUID().replaceAll("-", "");
const admin = postgres(
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  { max: 1 },
);
let sql,
  created = false,
  passed = 0;
const owner = randomUUID(),
  other = randomUUID();
const check = async (name, fn) => {
  await fn();
  passed++;
  console.log("PASS " + name);
};
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  sql = postgres("postgresql://postgres:postgres@127.0.0.1:55322/" + name, {
    max: 8,
  });
  await sql.unsafe(`CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$SELECT string_to_array($1,'/')$$;
 GRANT USAGE ON SCHEMA auth,storage,public TO anon,authenticated,service_role;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);INSERT INTO storage.buckets VALUES('certificates',true);
 CREATE TABLE storage.objects(bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT SELECT ON storage.objects TO anon,authenticated,service_role;
 CREATE POLICY "Certificates are publicly accessible" ON storage.objects FOR SELECT USING(bucket_id='certificates');`);
  for (const table of [
    "app_events",
    "app_errors",
    "page_views",
    "daily_readings",
    "daily_scriptures",
  ])
    await sql.unsafe(
      `CREATE TABLE public.${table}(id int);ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;GRANT ALL ON public.${table} TO anon,authenticated,service_role;`,
    );
  const migration = readFileSync(
    "supabase/migrations/20261021000100_customer_launch_security.sql",
    "utf8",
  );
  await check("migration applies twice safely", async () => {
    await sql.unsafe(migration);
    await sql.unsafe(migration);
    // Emulate the separate supported Storage updateBucket({public:false}) operation.
    await sql`UPDATE storage.buckets SET public=false WHERE id='certificates'`;
  });
  for (const role of ["anon", "authenticated"])
    await check(
      role + " cannot directly insert telemetry or read legacy content",
      async () => {
        for (const table of ["app_events", "app_errors", "page_views"])
          await assert.rejects(
            sql.begin(async (tx) => {
              await tx.unsafe("SET LOCAL ROLE " + role);
              await tx.unsafe("INSERT INTO " + table + " VALUES(1)");
            }),
            /permission denied/,
          );
        for (const table of ["daily_readings", "daily_scriptures"])
          await assert.rejects(
            sql.begin(async (tx) => {
              await tx.unsafe("SET LOCAL ROLE " + role);
              await tx.unsafe("SELECT * FROM " + table);
            }),
            /permission denied/,
          );
        await assert.rejects(
          sql.begin(async (tx) => {
            await tx.unsafe("SET LOCAL ROLE " + role);
            await tx`SELECT take_telemetry_ingest_slot(${owner})`;
          }),
          /permission denied/,
        );
      },
    );
  await check(
    "service role retains server telemetry and reminder access",
    async () => {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE service_role`;
        await tx`INSERT INTO app_events VALUES(1)`;
        await tx`SELECT * FROM daily_scriptures`;
      });
    },
  );
  await sql`INSERT INTO storage.objects VALUES('certificates',${owner + "/own.svg"}),('certificates',${other + "/private.svg"}),('certificates','Certificate Template.png')`;
  await check("private bucket and owner-only certificate access", async () => {
    assert.equal(
      (await sql`SELECT public FROM storage.buckets WHERE id='certificates'`)[0]
        .public,
      false,
    );
    const rows = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claim.sub',${owner},true)`;
      return tx`SELECT name FROM storage.objects`;
    });
    assert.deepEqual(
      rows.map((r) => r.name).sort(),
      ["Certificate Template.png", owner + "/own.svg"].sort(),
    );
    const anonRows = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      return tx`SELECT * FROM storage.objects`;
    });
    assert.equal(anonRows.length, 0);
  });
  const actor = "a".repeat(64);
  await check(
    "atomic actor limit allows exactly 120 of 125 concurrent writes",
    async () => {
      const r = await Promise.all(
        Array.from({ length: 125 }, () =>
          sql.begin(async (tx) => {
            await tx`SET LOCAL ROLE service_role`;
            return tx`SELECT take_telemetry_ingest_slot(${actor}) AS ok`;
          }),
        ),
      );
      assert.equal(r.filter((v) => v[0].ok).length, 120);
    },
  );
  await check("global ceiling bounds spoofed actor identities", async () => {
    await sql`UPDATE telemetry_ingest_limits SET count=999 WHERE actor='project'`;
    assert.equal(
      (await sql`SELECT take_telemetry_ingest_slot(${"b".repeat(64)}) AS ok`)[0]
        .ok,
      true,
    );
    assert.equal(
      (await sql`SELECT take_telemetry_ingest_slot(${"c".repeat(64)}) AS ok`)[0]
        .ok,
      false,
    );
  });
  await sql.unsafe(`CREATE TABLE public.certificates(id uuid,user_id uuid);CREATE TABLE public.completion_certificates(id uuid,user_id uuid);GRANT ALL ON public.certificates,public.completion_certificates TO anon,authenticated,service_role;`);
  const ownership=readFileSync('supabase/migrations/20261021000200_security_ownership.sql','utf8');
  await check('ownership migration applies twice and disables public admin bootstrap',async()=>{
    await sql.unsafe(ownership);await sql.unsafe(ownership);
    for(const role of ['anon','authenticated'])await assert.rejects(sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE '+role);await tx`SELECT bootstrap_admin(${owner})`}),/permission denied/);
    assert.equal((await sql`SELECT bootstrap_admin(${owner}) AS ok`)[0].ok,false);
  });
  await check('customers cannot self-issue, alter or truncate certificate records',async()=>{
    for(const role of ['anon','authenticated'])for(const table of ['certificates','completion_certificates'])for(const command of ['INSERT INTO '+table+' VALUES(gen_random_uuid(),gen_random_uuid())','UPDATE '+table+' SET id=gen_random_uuid()','DELETE FROM '+table,'TRUNCATE '+table])await assert.rejects(sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE '+role);await tx.unsafe(command)}),/permission denied/);
    await sql.begin(async tx=>{await tx`SET LOCAL ROLE service_role`;await tx`INSERT INTO certificates VALUES(${randomUUID()},${owner})`});
  });
  await check('certificate policy has no shared template exception',async()=>{
    const rows=await sql.begin(async tx=>{await tx`SET LOCAL ROLE authenticated`;await tx`SELECT set_config('request.jwt.claim.sub',${owner},true)`;return tx`SELECT name FROM storage.objects`});
    assert.deepEqual(rows.map(r=>r.name),[owner+'/own.svg']);
  });
  console.log(`${passed} security database checks passed`);
} finally {
  await sql?.end();
  if (created) await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
