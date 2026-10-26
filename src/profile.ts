export type AvatarStyle = 'initials' | 'gradient' | 'minimal';

export type BudgitalProfile = {
  displayName: string;
  workspaceName: string;
  avatarStyle: AvatarStyle;
  avatarColor: string;
  updatedAt: string;
};

export const PROFILE_COLORS = ['#c8ee68', '#8cc4ff', '#caa7f8', '#75d2c1', '#ffb59d', '#f3cc69'];

export const DEFAULT_PROFILE: BudgitalProfile = {
  displayName: 'Your name',
  workspaceName: 'Personal workspace',
  avatarStyle: 'initials',
  avatarColor: PROFILE_COLORS[0],
  updatedAt: new Date(0).toISOString(),
};

export function normalizeProfile(value?: Partial<BudgitalProfile> | null): BudgitalProfile {
  const displayName = String(value?.displayName ?? '').trim().slice(0, 60) || DEFAULT_PROFILE.displayName;
  const workspaceName = String(value?.workspaceName ?? '').trim().slice(0, 60) || DEFAULT_PROFILE.workspaceName;
  const avatarStyle: AvatarStyle = value?.avatarStyle === 'gradient' || value?.avatarStyle === 'minimal' ? value.avatarStyle : 'initials';
  const avatarColor = PROFILE_COLORS.includes(String(value?.avatarColor)) ? String(value?.avatarColor) : DEFAULT_PROFILE.avatarColor;
  return { displayName, workspaceName, avatarStyle, avatarColor, updatedAt: value?.updatedAt || new Date().toISOString() };
}

export function profileInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'YN';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}
