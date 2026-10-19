import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), from: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), del: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: mocks.from } }));
import { EMPTY_PRIVATE_CHECKIN, savePrivateCheckin, loadPrivateCheckin, deletePrivateCheckin, deleteAllPrivateCheckins, validatePrivateCheckin } from '@/data/wellness/privateCheckins';
beforeEach(() => {
  vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }); mocks.rpc.mockResolvedValue({ error: null });
  const query = { eq: mocks.eq, select: mocks.select, maybeSingle: mocks.maybeSingle, delete: mocks.del, error: null };
  mocks.from.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.del.mockReturnValue(query); mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});
describe('optional private check-in boundary', () => {
  it('saves only allowlisted values for the current authenticated owner', async () => {
    await savePrivateCheckin('owner','2026-10-19',{...EMPTY_PRIVATE_CHECKIN,mood:'okay'});
    expect(mocks.rpc).toHaveBeenCalledWith('save_private_wellness_checkin',{p_user_id:'owner',p_local_date:'2026-10-19',p_sleep_rating:null,p_sleep_hours:null,p_mood:'okay',p_note:null});
  });
  it('rejects account switches and anonymous use before touching records', async () => {
    await expect(savePrivateCheckin('another','2026-10-19',EMPTY_PRIVATE_CHECKIN)).rejects.toThrow('Sign in again');
    mocks.getUser.mockResolvedValue({data:{user:null},error:null});
    await expect(loadPrivateCheckin('owner','2026-10-19')).rejects.toThrow('Sign in again');
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('loads and deletes only the owner, with date or explicit all-date scope', async () => {
    await loadPrivateCheckin('owner','2026-10-19'); await deletePrivateCheckin('owner','2026-10-19'); await deleteAllPrivateCheckins('owner');
    expect(mocks.eq).toHaveBeenCalledWith('user_id','owner'); expect(mocks.eq).toHaveBeenCalledWith('local_date','2026-10-19');
    expect(mocks.from).toHaveBeenCalledTimes(3); expect(mocks.from).toHaveBeenCalledWith('wellness_private_checkins');
  });
  it('validates optional values and refuses invalid data before auth or storage', async () => {
    expect(validatePrivateCheckin(EMPTY_PRIVATE_CHECKIN)).toBe(true);
    for (const patch of [{sleep_rating:0},{sleep_rating:2.5},{sleep_hours:25},{sleep_hours:NaN},{note:'x'.repeat(281)}]) {
      await expect(savePrivateCheckin('owner','2026-10-19',{...EMPTY_PRIVATE_CHECKIN,...patch})).rejects.toThrow('optional values');
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
