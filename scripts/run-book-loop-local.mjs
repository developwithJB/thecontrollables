import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const file = process.argv[2];
if (!file) throw new Error('Pass a local supabase status --output json file. Do not commit that file.');
const status = JSON.parse(readFileSync(file, 'utf8'));
if (!['127.0.0.1', 'localhost'].includes(new URL(status.API_URL).hostname)) throw new Error('Refusing non-local Supabase.');
const result = spawnSync('npx', ['playwright', 'test', '--config=playwright.book-loop.config.ts'], { stdio: 'inherit', env: { ...process.env, LOCAL_SUPABASE_URL: status.API_URL, LOCAL_SUPABASE_ANON_KEY: status.ANON_KEY, LOCAL_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY } });
process.exit(result.status ?? 1);
