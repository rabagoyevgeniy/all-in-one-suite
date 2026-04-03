// XP thresholds balanced for 2-4 year progression
// Assuming ~3 lessons/week, ~2 duels/month, ~5 tasks/week
// Year 1: ~2000-3000 XP → Blue/Green
// Year 2: ~5000-8000 XP → Yellow/Orange  
// Year 3-4: ~12000-20000 XP → Red/Black
export const SWIM_BELTS = [
  { id: 'white', name: 'Aqua Starter', color: '#FFFFFF', borderColor: '#E2E8F0', coinsOnEarn: 300, minXP: 0, maxXP: 1500, classCode: 'B', className: 'Beginner' },
  { id: 'sky_blue', name: 'Water Explorer', color: '#7DD3FC', borderColor: '#0EA5E9', coinsOnEarn: 500, minXP: 1500, maxXP: 4000, classCode: 'N', className: 'Novice' },
  { id: 'green', name: 'Wave Rider', color: '#86EFAC', borderColor: '#22C55E', coinsOnEarn: 800, minXP: 4000, maxXP: 8000, classCode: 'I', className: 'Intermediate' },
  { id: 'yellow', name: 'Current Master', color: '#FDE047', borderColor: '#EAB308', coinsOnEarn: 1200, minXP: 8000, maxXP: 13000, classCode: 'A', className: 'Advanced' },
  { id: 'orange', name: 'Tide Champion', color: '#FB923C', borderColor: '#F97316', coinsOnEarn: 2000, minXP: 13000, maxXP: 20000, classCode: 'E', className: 'Expert' },
  { id: 'red', name: 'ProFit Athlete', color: '#F87171', borderColor: '#EF4444', coinsOnEarn: 3500, minXP: 20000, maxXP: 30000, classCode: 'P', className: 'Pro Athlete' },
  { id: 'black', name: 'ProFit Legend', color: '#1F2937', borderColor: '#111827', coinsOnEarn: 7500, minXP: 30000, maxXP: 50000, classCode: 'L', className: 'Legend' },
] as const;

// Balanced XP formula:
// Win: +15 XP, Participation: +5 XP, Coins earned: 0.05x multiplier
// ~3 wins/month = 45 XP, ~6 duels/month = 30 XP, ~200 coins/month = 10 XP
// Monthly total ≈ 85 XP → ~1000 XP/year from duels alone
// Tasks add ~5 XP each → ~25/week = ~1300/year
// Total ≈ 2300 XP/year → White→Blue in ~8 months, Black in ~4 years
export function calculateXP(student: { wins?: number | null; losses?: number | null; total_coins_earned?: number | null }): number {
  const wins = student.wins || 0;
  const losses = student.losses || 0;
  const totalDuels = wins + losses;
  const totalCoinsEarned = student.total_coins_earned || 0;
  return wins * 15 + totalDuels * 5 + Math.round(totalCoinsEarned * 0.05);
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

export type UserRole = 'admin' | 'head_manager' | 'personal_manager' | 'coach' | 'freelancer' | 'parent' | 'student' | 'pro_athlete';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  head_manager: 'Head Manager',
  personal_manager: 'Personal Manager',
  coach: 'Coach',
  freelancer: 'Freelancer',
  parent: 'Parent',
  student: 'Student',
  pro_athlete: 'Pro Athlete',
};

export const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  head_manager: '/admin',
  personal_manager: '/pm',
  coach: '/coach',
  freelancer: '/freelancer',
  parent: '/parent',
  student: '/student',
  pro_athlete: '/pro',
};
