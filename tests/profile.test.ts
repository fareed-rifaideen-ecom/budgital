import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, normalizeProfile, profileInitials } from '../src/profile';

describe('local profile', () => {
  it('creates readable initials from a display name', () => {
    expect(profileInitials('Fareed Rifaideen')).toBe('FR');
    expect(profileInitials('Fareed')).toBe('F');
    expect(profileInitials('')).toBe('YN');
  });

  it('normalizes blank or unsafe values to a safe local profile', () => {
    expect(normalizeProfile({ displayName: '  ', workspaceName: '' })).toMatchObject({ ...DEFAULT_PROFILE, updatedAt: expect.any(String) });
    expect(normalizeProfile({ displayName: 'A'.repeat(100), avatarStyle: 'unsupported' as never, avatarColor: '#fff' }).displayName).toHaveLength(60);
  });
});
