export const SWIM_BELTS = [
  { id: 'white', name: 'Aqua Starter', color: '#FFFFFF', borderColor: '#E2E8F0', coinsOnEarn: 300 },
  { id: 'sky_blue', name: 'Water Explorer', color: '#7DD3FC', borderColor: '#0EA5E9', coinsOnEarn: 500 },
  { id: 'green', name: 'Wave Rider', color: '#86EFAC', borderColor: '#22C55E', coinsOnEarn: 800 },
  { id: 'yellow', name: 'Current Master', color: '#FDE047', borderColor: '#EAB308', coinsOnEarn: 1200 },
  { id: 'orange', name: 'Tide Champion', color: '#FB923C', borderColor: '#F97316', coinsOnEarn: 2000 },
  { id: 'red', name: 'ProFit Athlete', color: '#F87171', borderColor: '#EF4444', coinsOnEarn: 3500 },
  { id: 'black', name: 'ProFit Legend', color: '#1F2937', borderColor: '#111827', coinsOnEarn: 7500 },
] as const;

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
