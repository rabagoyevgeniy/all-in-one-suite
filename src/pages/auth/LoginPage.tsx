import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves, Eye, EyeOff, Loader2, Users, GraduationCap, Trophy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import loginHero from '@/assets/login-hero.jpg';

type SignUpRole = 'parent' | 'student' | 'pro_athlete';

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
    role: 'pro_athlete',
    label: 'Pro Athlete',
    description: 'Compete professionally & build your ranking',
    icon: <Trophy className="h-7 w-7" />,
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SignUpRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp && !selectedRole) {
      setShowRoleSelect(true);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.fullName, signup_role: selectedRole },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // If auto-confirm is on, assign role immediately
        if (data.session) {
          const { error: roleError } = await supabase.rpc('assign_initial_role', {
            _role: selectedRole!,
          });
          if (roleError) throw roleError;
          navigate('/');
        } else {
          toast.success('Check your email to verify your account!');
        }
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
                  <div>
                    <p className="font-display font-semibold text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
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
                <Label htmlFor="password" className="text-foreground">Password</Label>
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
                    {selectedRole === 'pro_athlete' ? 'Pro Athlete' : selectedRole}
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
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span className="font-semibold text-primary">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
