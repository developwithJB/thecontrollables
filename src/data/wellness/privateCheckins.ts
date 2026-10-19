import { supabase } from '@/integrations/supabase/client';
export const CHECKIN_MOODS = ['peaceful', 'okay', 'heavy', 'anxious', 'worn_out'] as const;
export type CheckinMood = typeof CHECKIN_MOODS[number];
export interface PrivateCheckin {
  sleep_rating: number | null;
  sleep_hours: number | null;
  mood: CheckinMood | null;
  note: string | null;
}
export const EMPTY_PRIVATE_CHECKIN: PrivateCheckin = { sleep_rating: null, sleep_hours: null, mood: null, note: null };
export function validatePrivateCheckin(value: PrivateCheckin): boolean {
  return (value.sleep_rating === null || (Number.isInteger(value.sleep_rating) && value.sleep_rating >= 1 && value.sleep_rating <= 5)) &&
    (value.sleep_hours === null || (Number.isFinite(value.sleep_hours) && value.sleep_hours >= 0 && value.sleep_hours <= 24)) &&
    (value.mood === null || (CHECKIN_MOODS as readonly string[]).includes(value.mood)) && (value.note === null || value.note.length <= 280);
}
async function owner(expectedUserId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== expectedUserId) throw new Error('Sign in again before changing this check-in.');
  return data.user.id;
}
export async function loadPrivateCheckin(userId: string, date: string): Promise<PrivateCheckin | null> {
  const id = await owner(userId);
  const { data, error } = await supabase.from('wellness_private_checkins').select('sleep_rating,sleep_hours,mood,note').eq('user_id', id).eq('local_date', date).maybeSingle();
  if (error) throw new Error('Private check-in could not be loaded.');
  return data as PrivateCheckin | null;
}
export async function savePrivateCheckin(userId: string, date: string, value: PrivateCheckin) {
  if (!validatePrivateCheckin(value)) throw new Error('Check the optional values and note length.');
  const id = await owner(userId);
  const { error } = await supabase.rpc('save_private_wellness_checkin', { p_user_id: id, p_local_date: date, p_sleep_rating: value.sleep_rating, p_sleep_hours: value.sleep_hours, p_mood: value.mood, p_note: value.note });
  if (error) throw new Error('Private check-in could not be saved.');
}
export async function deletePrivateCheckin(userId: string, date: string) {
  const id = await owner(userId);
  const { error } = await supabase.from('wellness_private_checkins').delete().eq('user_id', id).eq('local_date', date);
  if (error) throw new Error('Private check-in could not be deleted.');
}

export async function deleteAllPrivateCheckins(userId: string) {
  const id = await owner(userId);
  const { error } = await supabase.from('wellness_private_checkins').delete().eq('user_id', id);
  if (error) throw new Error('Private check-ins could not be deleted.');
}
