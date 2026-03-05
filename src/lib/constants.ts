export const SWIM_BELTS = [
  { id: 'white', name: 'Aqua Starter', color: '#FFFFFF', borderColor: '#E2E8F0', coinsOnEarn: 300, minXP: 0, maxXP: 1000 },
  { id: 'sky_blue', name: 'Water Explorer', color: '#7DD3FC', borderColor: '#0EA5E9', coinsOnEarn: 500, minXP: 1000, maxXP: 3000 },
  { id: 'green', name: 'Wave Rider', color: '#86EFAC', borderColor: '#22C55E', coinsOnEarn: 800, minXP: 3000, maxXP: 6000 },
  { id: 'yellow', name: 'Current Master', color: '#FDE047', borderColor: '#EAB308', coinsOnEarn: 1200, minXP: 6000, maxXP: 10000 },
  { id: 'orange', name: 'Tide Champion', color: '#FB923C', borderColor: '#F97316', coinsOnEarn: 2000, minXP: 10000, maxXP: 15000 },
  { id: 'red', name: 'ProFit Athlete', color: '#F87171', borderColor: '#EF4444', coinsOnEarn: 3500, minXP: 15000, maxXP: 25000 },
  { id: 'black', name: 'ProFit Legend', color: '#1F2937', borderColor: '#111827', coinsOnEarn: 7500, minXP: 25000, maxXP: 50000 },
] as const;

export function calculateXP(student: { wins?: number | null; losses?: number | null; total_coins_earned?: number | null }): number {
  const wins = student.wins || 0;
  const losses = student.losses || 0;
  const totalDuels = wins + losses;
  const totalCoinsEarned = student.total_coins_earned || 0;
  return wins * 100 + totalDuels * 30 + Math.round(totalCoinsEarned * 0.5);
}

export function getBeltByXP(xp: number) {
  for (let i = SWIM_BELTS.length - 1; i >= 0; i--) {
    if (xp >= SWIM_BELTS[i].minXP) return SWIM_BELTS[i];
  }
  return SWIM_BELTS[0];
}

export function getBeltIndex(xp: number): number {
  for (let i = SWIM_BELTS.length - 1; i >= 0; i--) {
    if (xp >= SWIM_BELTS[i].minXP) return i;
  }
  return 0;
}

export const COACH_RANKS = [
  { id: 'trainee', label: 'Trainee', color: '#64748B' },
  { id: 'junior', label: 'Junior', color: '#0EA5E9' },
  { id: 'senior', label: 'Senior', color: '#3B82F6' },
  { id: 'elite', label: 'Elite', color: '#F59E0B' },
  { id: 'profitelite', label: 'ProFit Elite', color: '#FFD700' },
] as const;

export type UserRole = 'admin' | 'head_manager' | 'personal_manager' | 'coach' | 'parent' | 'student' | 'pro_athlete';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  head_manager: 'Head Manager',
  personal_manager: 'Personal Manager',
  coach: 'Coach',
  parent: 'Parent',
  student: 'Student',
  pro_athlete: 'Pro Athlete',
};

export const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  head_manager: '/admin',
  personal_manager: '/pm',
  coach: '/coach',
  parent: '/parent',
  student: '/student',
  pro_athlete: '/pro',
};
