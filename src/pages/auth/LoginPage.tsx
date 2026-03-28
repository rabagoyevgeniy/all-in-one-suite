import { useState, useCallback } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves, Eye, EyeOff, Loader2, Users, GraduationCap, Trophy, ArrowLeft, Dumbbell, Briefcase, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import loginHero from '@/assets/login-hero.jpg';

type SignUpRole = 'parent' | 'student' | 'pro_athlete' | 'coach' | 'personal_manager';

const INVITE_ONLY_ROLES: SignUpRole[] = ['coach', 'personal_manager'];

const ROLE_OPTIONS: { role: SignUpRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    role: 'parent',
    label: 'Parent',
    description: 'Manage lessons & track your child\'s progress',
    icon: <Users className="h-7 w-7" />,
  },
  {
    role: 'student',
    label: 'Student',
    description: 'Train, earn coins & compete in duels',
    icon: <GraduationCap className="h-7 w-7" />,
  },
  {
    role: 'coach',
    label: 'Coach',
    description: 'Manage your schedule, track students & earn',
    icon: <Dumbbell className="h-7 w-7" />,
  },
  {
    role: 'personal_manager',
    label: 'Personal Manager',
    description: 'Manage clients & earn commissions',
    icon: <Briefcase className="h-7 w-7" />,
  },
  {
    role: 'pro_athlete',
    label: 'Pro Athlete',
    description: 'Compete professionally & build your ranking',
    icon: <Trophy className="h-7 w-7" />,
  },
];

/* ── Dev Quick Login Component ── */
const DEV_ACCOUNTS = [
  { label: '🏊 Coach Alex', email: 'coach.alex@profit.test', password: 'Test1234!', role: 'coach', route: '/coach' },
  { label: '👨‍👩‍👧 Parent Sarah', email: 'parent.sarah@profit.test', password: 'Test1234!', role: 'parent', route: '/parent' },
  { label: '🎓 Student Emma', email: 'student.emma@profit.test', password: 'Test1234!', role: 'student', route: '/student' },
];

function DevQuickLogin({ navigate }: { navigate: NavigateFunction }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleDevLogin = useCallback(async (acc: typeof DEV_ACCOUNTS[0]) => {
    setBusy(acc.email);
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: acc.email,
        password: acc.password,
      });

      if (error && (error.message.includes('Invalid login') || error.message.includes('Email not confirmed'))) {
        await supabase.auth.signUp({
          email: acc.email,
          password: acc.password,
          options: { data: { full_name: acc.label.replace(/^[^\w]*\s*/, '') } },
        });

        const result = await supabase.auth.signInWithPassword({
          email: acc.email,
          password: acc.password,
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data?.session) {
        try {
          await supabase.rpc('assign_initial_role', { _role: acc.role });
        } catch {
          // Role may already exist
        }
        navigate(acc.route, { replace: true });
        setTimeout(() => window.location.reload(), 100);
      }
    } catch (err: unknown) {
      console.error('Dev login error:', err);
      toast.error((err as any)?.message || 'Dev login failed');
    } finally {
      setBusy(null);
    }
  }, [navigate]);

  return (
    <div className="mt-6 border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-xs text-muted-foreground flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <span>🛠 Dev Testing</span>
        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          {DEV_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              onClick={() => handleDevLogin(acc)}
              disabled={!!busy}
              className="w-full text-left px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted/40 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {busy === acc.email ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              <span className="font-medium">{acc.label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{acc.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Forgot Password Modal ── */
function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      });
      if (error) throw error;
      toast.success('Check your email for a reset link');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-card rounded-2xl p-6 border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg text-foreground mb-1">Reset Password</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your email and we'll send you a reset link
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resetEmail" className="text-foreground">Email</Label>
            <Input
              id="resetEmail"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl bg-background border-border"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl font-display font-semibold">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Link
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SignUpRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', inviteCode: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const needsInviteCode = selectedRole && INVITE_ONLY_ROLES.includes(selectedRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp && !selectedRole) {
      setShowRoleSelect(true);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Validate invite code for coach/PM before signup
        if (needsInviteCode) {
          if (!form.inviteCode.trim()) {
            throw new Error('Invite code is required for this role');
          }

          const { data: codeData, error: codeError } = await supabase
            .from('invite_codes')
            .select('id, target_role')
            .eq('code', form.inviteCode.trim())
            .eq('is_active', true)
            .eq('target_role', selectedRole as any)
            .maybeSingle();

          if (codeError) throw codeError;
          if (!codeData) throw new Error('Invalid or expired invite code');
        }

        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.fullName, signup_role: selectedRole },
          },
        });
        if (signUpError) throw signUpError;

        // Immediately sign in (auto-confirm is enabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;

        // Mark invite code as used before assigning role
        if (needsInviteCode) {
          const userId = signUpData.user?.id;
          if (userId) {
            await supabase
              .from('invite_codes' as any)
              .update({ is_active: false, used_by: userId, used_at: new Date().toISOString() } as Record<string, unknown>)
              .eq('code', form.inviteCode.trim());
          }
        }

        // Assign role
        const { error: roleError } = await supabase.rpc('assign_initial_role', {
          _role: selectedRole!,
        });
        if (roleError) throw roleError;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: SignUpRole) => {
    setSelectedRole(role);
    setShowRoleSelect(false);
  };

  return (
    <div className="min-h-screen bg-gradient-operations flex flex-col">
      {/* Hero image section */}
      <div className="relative h-[40vh] min-h-[260px] overflow-hidden">
        <img
          src={loginHero}
          alt="Underwater swimming"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-6 left-6 right-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Waves className="text-primary" size={28} />
            <span className="font-display font-bold text-2xl text-foreground">ProFit</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Premium Swimming Academy
          </p>
        </motion.div>
      </div>

      {/* Form / Role selection section */}
      <AnimatePresence mode="wait">
        {showRoleSelect ? (
          <motion.div
            key="role-select"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex-1 px-6 pt-6 pb-8"
          >
            <button
              onClick={() => setShowRoleSelect(false)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h2 className="font-display font-bold text-2xl text-foreground mb-1">
              Choose Your Role
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Select how you'll use ProFit
            </p>
            <div className="space-y-3">
              {ROLE_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.role}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRoleSelect(opt.role)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedRole === opt.role
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                  {INVITE_ONLY_ROLES.includes(opt.role) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                      <KeyRound size={10} /> Invite
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="auth-form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ delay: 0.4 }}
            className="flex-1 px-6 pt-6 pb-8"
          >
            <h2 className="font-display font-bold text-2xl text-foreground mb-1">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isSignUp ? 'Join the ProFit family today' : 'Sign in to continue your journey'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                    required
                    className="h-12 rounded-xl bg-card border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  className="h-12 rounded-xl bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                    className="h-12 rounded-xl bg-card border-border pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Role badge when selected */}
              {isSignUp && selectedRole && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-xs text-muted-foreground">Role:</span>
                  <span className="text-sm font-semibold text-primary capitalize">
                    {selectedRole === 'pro_athlete' ? 'Pro Athlete' : selectedRole === 'personal_manager' ? 'Personal Manager' : selectedRole}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRoleSelect(true)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Invite code field for coach/PM */}
              {isSignUp && needsInviteCode && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-foreground flex items-center gap-1.5">
                    <KeyRound size={14} className="text-primary" />
                    Invite Code
                  </Label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter your invite code"
                    value={form.inviteCode}
                    onChange={(e) => setForm(p => ({ ...p, inviteCode: e.target.value }))}
                    required
                    className="h-12 rounded-xl bg-card border-border"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Coach and Personal Manager accounts require an invite code from an admin.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-display font-semibold text-base"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp
                  ? selectedRole
                    ? 'Create Account'
                    : 'Continue'
                  : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setSelectedRole(null);
                  setShowRoleSelect(false);
                  setForm(p => ({ ...p, inviteCode: '' }));
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span className="font-semibold text-primary">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </span>
              </button>
            </div>

            {/* Dev Testing Section */}
            {(window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com') || window.location.hostname === 'localhost') && (
              <DevQuickLogin navigate={navigate} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <ForgotPasswordModal open={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
