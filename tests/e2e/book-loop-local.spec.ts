import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
const url = process.env.LOCAL_SUPABASE_URL!;
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Local test only');
const anon = process.env.LOCAL_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const password = 'LocalIntegration-Only-2026!';
const users: { id: string; email: string }[] = [];
test.beforeAll(async () => {
  for (const name of ['a', 'b']) {
    const email = `dashboard-${name}-${Date.now()}@example.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    users.push({ id: data.user.id, email });
  }
});
test.afterAll(async () => { for (const user of users) await admin.auth.admin.deleteUser(user.id); });
async function login(page: Page, email: string) {
  await page.goto('/tests/fixtures/book-loop-local.html');
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('two browser sessions sync one account, isolate another account, and preserve browser import', async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  try {
    const [a, second, b] = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]); contexts.push(a, second, b);
    await a.addInitScript(({ id }) => { if (!localStorage.getItem('local-fixture-seeded')) { localStorage.setItem(`control_release_move_${id}_2026-10-19`, JSON.stringify({ control: '', release: '', move: 'Browser backup', keptPromise: false })); localStorage.setItem('local-fixture-seeded', 'true'); } }, { id: users[0].id });
    const pa = await a.newPage(), psecond = await second.newPage(), pb = await b.newPage();
    await login(pa, users[0].email);
    await expect(pa.getByRole('alertdialog')).toBeVisible();
    const owner = createClient(url, anon, { auth: { persistSession: false } });
    await owner.auth.signInWithPassword({ email: users[0].email, password });
    expect((await owner.from('controllables_book_records').select('*')).data).toHaveLength(0);
    await pa.getByRole('button', { name: 'Import browser progress', exact: true }).click();
    await expect(pa.getByTestId('saved-move')).toHaveText('Browser backup');
    await expect.poll(() => pa.evaluate(id => localStorage.getItem(`control_release_move_${id}_2026-10-19`), users[0].id)).toContain('Browser backup');
    await login(psecond, users[0].email); await expect(psecond.getByTestId('saved-move')).toHaveText('Browser backup');
    await pa.getByLabel('Move', { exact: true }).fill('Confirmed cross-device save'); await pa.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(pa.getByRole('status')).toHaveText('Saved');
    await psecond.reload(); await expect(psecond.getByTestId('saved-move')).toHaveText('Confirmed cross-device save');
    await login(pb, users[1].email); await expect(pb.getByTestId('saved-move')).toHaveText('(empty)');
    await pb.getByLabel('Move', { exact: true }).fill('Second account only'); await pb.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(pb.getByRole('status')).toHaveText('Saved');
    await pa.reload(); await expect(pa.getByTestId('saved-move')).toHaveText('Confirmed cross-device save');
    const other = createClient(url, anon, { auth: { persistSession: false } }); await other.auth.signInWithPassword({ email: users[1].email, password });
    expect((await other.from('controllables_book_records').select('*').eq('user_id', users[0].id)).data).toEqual([]);
    const anonymous = createClient(url, anon, { auth: { persistSession: false } }); expect((await anonymous.from('controllables_book_records').select('*')).error).toBeTruthy();
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
test('PostgREST rejects a stale revision and a mismatched account', async () => {
  const client = createClient(url, anon, { auth: { persistSession: false } }); await client.auth.signInWithPassword({ email: users[0].email, password });
  const change = (move: string, revision: number) => ({ p_user_id: users[0].id, p_changes: [{ kind: 'crm', record_key: 'cas-test', payload: { move }, expected_revision: revision }] });
  expect((await client.rpc('save_book_loop_changes', change('first', 0))).error).toBeNull();
  const { data } = await client.from('controllables_book_records').select('revision').eq('record_key', 'cas-test').single();
  expect((await client.rpc('save_book_loop_changes', change('second', data!.revision))).error).toBeNull();
  expect((await client.rpc('save_book_loop_changes', change('stale', data!.revision))).error?.code).toBe('40001');
  expect((await client.rpc('save_book_loop_changes', { p_user_id: users[1].id, p_changes: [] })).error).toBeTruthy();
});
