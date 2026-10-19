import { describe, expect, it } from 'vitest';
import { ORDERED_CONTROLLABLE_GUIDES } from '@/lib/controllables';
describe('canonical Controllable names and emoji', () => {
  it('preserves all five product identities in their canonical order', () => {
    expect(ORDERED_CONTROLLABLE_GUIDES.map(({ name, emoji }) => [name, emoji])).toEqual([
      ['Awareness', '🦉'], ['Perspective', '🐢'], ['Habit', '🦈'], ['Wellness', '🛰️'], ['Environment', '🚀'],
    ]);
  });
});
