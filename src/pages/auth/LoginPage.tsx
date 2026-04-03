import { useState, useCallback } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves, Eye, EyeOff, Loader2, Users, GraduationCap, Trophy, ArrowLeft, Dumbbell, Briefcase, KeyRound, Star, Shield } from 'lucide-react';
import { toast } from 'sonner';
import loginHero from '@/assets/login-hero-new.png';

type SignUpRole = 'parent' | 'student' | 'pro_athlete' | 'coach' | 'freelancer' | 'personal_manager';

const INVITE_ONLY_ROLES: SignUpRole[] = ['coach', 'personal_manager'];

const ROLE_OPTIONS: { role: SignUpRole; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    role: 'parent',
    label: 'Parent',
    description: 'Manage lessons & track your child\'s progress',
    icon: <Users className="h-6 w-6" />,
    color: 'from-sky-400 to-blue-500',
  },
  {
    role: 'student',
    label: 'Student',
    description: 'Train, earn coins & compete in duels',
    icon: <GraduationCap className="h-6 w-6" />,
    color: 'from-violet-400 to-purple-500',
  },
  {
    role: 'freelancer',
    label: 'Freelance Coach',
    description: 'Find clients, set your rates & grow your brand',
    icon: <Waves className="h-6 w-6" />,
    color: 'from-cyan-400 to-teal-500',
  },
  {
    role: 'coach',
    label: 'Coach',
    description: 'Manage your schedule, track students & earn',
    icon: <Dumbbell className="h-6 w-6" />,
    color: 'from-emerald-400 to-green-500',
  },
  {
    role: 'personal_manager',
    label: 'Personal Manager',
    description: 'Manage clients & earn commissions',
    icon: <Briefcase className="h-6 w-6" />,
    color: 'from-amber-400 to-orange-500',
  },
  {
    role: 'pro_athlete',
    label: 'Pro Athlete',
    description: 'Compete professionally & build your ranking',
    icon: <Trophy className="h-6 w-6" />,
    color: 'from-rose-400 to-red-500',
  },
];

/* ── Wave SVG decoration ── */
function WaveDivider() {
  return (
    <>
      {/* Solid color strip to eliminate any gap */}
      <div className="absolute bottom-0 left-0 right-0 h-4 z-20 pointer-events-none" style={{ backgroundColor: '#060a14' }} />
      {/* Animated wave sitting on top of the strip */}
      <div className="absolute bottom-3 left-0 right-0 overflow-hidden leading-[0] z-20 pointer-events-none">
        <svg
          className="relative block w-[200%] animate-wave"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          style={{ height: '32px' }}
        >
          <path
            d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z"
            fill="#060a14"
          />
        </svg>
      </div>
    </>
  );
}

/* ── Dev Quick Login Component ── */
const DEV_ACCOUNTS = [
  { label: 'Coach Alex', email: 'coach.alex@profit.test', password: 'Test1234!', role: 'coach', route: '/coach', emoji: '🏊' },
  { label: 'Parent Sarah', email: 'parent.sarah@profit.test', password: 'Test1234!', role: 'parent', route: '/parent', emoji: '👨‍👩‍👧' },
  { label: 'Student Emma', email: 'student.emma@profit.test', password: 'Test1234!', role: 'student', route: '/student', emoji: '🎓' },
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
          options: { data: { full_name: acc.label } },
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
    <div className="mt-6 border border-border/40 rounded-xl overflow-hidden bg-muted/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Dev Testing
        </span>
        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-1.5">
              {DEV_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => handleDevLogin(acc)}
                  disabled={!!busy}
                  className="w-full text-left px-3 py-2.5 text-sm rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/20 transition-all disabled:opacity-50 flex items-center gap-2.5"
                >
                  {busy === acc.email ? (
                    <Loader2 size={14} className="animate-spin text-primary" />
                  ) : (
                    <span>{acc.emoji}</span>
                  )}
                  <span className="font-medium text-foreground">{acc.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{acc.role}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm card-elevated rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-display font-bold text-lg text-foreground mb-1">Reset Password</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Enter your email and we'll send you a reset link
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resetEmail" className="text-gray-300 text-sm font-medium">Email</Label>
            <Input
              id="resetEmail"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl font-display font-semibold btn-gradient-primary border-0">
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
    <div className="min-h-screen w-full" style={{ backgroundColor: '#060a14' }}>
    <div className="flex flex-col relative max-w-md mx-auto min-h-screen">
      {/* Full-bleed hero — negative margin for seamless blend with form */}
      <div className="relative h-[48vh] min-h-[300px] overflow-hidden mb-[-12px]">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          src={loginHero}
          alt="ProFit Swimming Academy"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        />
        {/* Multi-layer gradient overlays — seamless blend into form */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,10,20,0.2) 0%, transparent 40%, rgba(6,10,20,0.95) 85%, #060a14 100%)' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(6,182,212,0.06)_0%,_transparent_60%)]" />

        {/* Animated neon line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]">
          <div className="h-full bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>

        {/* Brand badge — right side, above wave */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute bottom-12 right-5 z-30"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Waves className="text-white" size={18} />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white leading-none">ProFit</span>
              <p className="text-[10px] text-cyan-400/80 font-medium">Swimming Academy</p>
            </div>
          </div>
        </motion.div>

        {/* Trust badges — top right */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="absolute top-4 right-4 flex gap-1.5"
        >
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xl text-white text-[10px] font-medium border border-white/5">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            4.9
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xl text-white text-[10px] font-medium border border-white/5">
            <Shield size={9} className="text-cyan-400" />
            Verified
          </div>
        </motion.div>

        {/* Global tag — bottom left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute bottom-12 left-5 z-30"
        >
          <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase">Worldwide</p>
          <p className="text-[9px] text-cyan-500/50 font-mono mt-0.5">Premium Private Coaching</p>
        </motion.div>

        {/* Animated wave divider */}
        <WaveDivider />
      </div>

      {/* Form / Role selection section */}
      <AnimatePresence mode="wait">
        {showRoleSelect ? (
          <motion.div
            key="role-select"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex-1 mx-3 mt-2 rounded-t-3xl px-4 pt-6 pb-8 text-white relative z-30 login-card-border" style={{ backgroundColor: '#060a14' }}
          >
            <button
              onClick={() => setShowRoleSelect(false)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h2 className="font-display font-bold text-2xl text-white mb-1">
              Choose Your Role
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Select how you'll use ProFit
            </p>
            <div className="space-y-2.5">
              {ROLE_OPTIONS.map((opt, i) => (
                <motion.button
                  key={opt.role}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRoleSelect(opt.role)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    selectedRole === opt.role
                      ? 'border-cyan-500/50 bg-cyan-500/5 shadow-md shadow-cyan-500/10'
                      : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'
                  }`}
                >
                  <div className={`flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center text-white shadow-sm`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                  {INVITE_ONLY_ROLES.includes(opt.role) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium flex items-center gap-1 border border-amber-500/20">
                      <KeyRound size={9} /> Invite
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="auth-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ delay: 0.15 }}
            className="flex-1 mx-3 mt-2 rounded-t-3xl px-4 pt-6 pb-8 text-white relative z-30 login-card-border" style={{ backgroundColor: '#060a14' }}
          >
            {/* Inner wave glow — floating light behind content */}
            <div className="login-card-waves">
              <div className="wave-1" />
              <div className="wave-2" />
              <div className="wave-3" />
            </div>

            <div className="relative">
              <h2 className="font-display font-bold text-2xl text-white mb-1">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {isSignUp ? 'Join the ProFit family today' : 'Sign in to continue your journey'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Label htmlFor="fullName" className="text-gray-300 text-sm font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                    required
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-cyan-500/50 transition-colors"
                  />
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300 text-sm font-medium">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
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
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-cyan-500/50 pr-12 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Role badge when selected */}
              {isSignUp && selectedRole && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ROLE_OPTIONS.find(r => r.role === selectedRole)?.color || ''} flex items-center justify-center text-white`}>
                    {ROLE_OPTIONS.find(r => r.role === selectedRole)?.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-white capitalize">
                      {selectedRole === 'pro_athlete' ? 'Pro Athlete' : selectedRole === 'personal_manager' ? 'Personal Manager' : selectedRole}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRoleSelect(true)}
                    className="text-xs text-cyan-400 font-medium hover:underline"
                  >
                    Change
                  </button>
                </motion.div>
              )}

              {/* Invite code field for coach/PM */}
              {isSignUp && needsInviteCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Label htmlFor="inviteCode" className="text-gray-300 text-sm font-medium flex items-center gap-1.5">
                    <KeyRound size={14} className="text-cyan-400" />
                    Invite Code
                  </Label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter your invite code"
                    value={form.inviteCode}
                    onChange={(e) => setForm(p => ({ ...p, inviteCode: e.target.value }))}
                    required
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-cyan-500/50 transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Coach and Personal Manager accounts require an invite code from an admin.
                  </p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-display font-semibold text-base border-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_28px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp
                  ? selectedRole
                    ? 'Create Account'
                    : 'Continue'
                  : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[11px] text-gray-600 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* OAuth buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin + '/' },
                  });
                  if (error) toast.error(error.message);
                }}
                className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'apple',
                    options: { redirectTo: window.location.origin + '/' },
                  });
                  if (error) toast.error(error.message);
                }}
                className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={12} /> 500+ families
              </span>
              <span className="w-px h-3 bg-gray-700" />
              <span className="flex items-center gap-1">
                <Star size={12} className="text-amber-500" /> 4.9 rating
              </span>
              <span className="w-px h-3 bg-gray-700" />
              <span className="flex items-center gap-1">
                <Shield size={12} /> Secure
              </span>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setSelectedRole(null);
                  setShowRoleSelect(false);
                  setForm(p => ({ ...p, inviteCode: '' }));
                }}
                className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
              >
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span className="font-semibold text-cyan-400">
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
    </div>
  );
}
