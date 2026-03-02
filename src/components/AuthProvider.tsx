import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_ROUTES, type UserRole } from '@/lib/constants';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setSession, setRole, setProfile, setLoading, user } = useAuthStore();

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch role and profile using setTimeout to avoid deadlock
        setTimeout(async () => {
          try {
            const [{ data: roleData }, { data: profileData }] = await Promise.all([
              supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle(),
              supabase
                .from('profiles')
                .select('full_name, avatar_url, city')
                .eq('id', session.user.id)
                .maybeSingle(),
            ]);

            let role = (roleData?.role as UserRole) ?? null;

            // If no role yet, check if user signed up with a role in metadata
            if (!role) {
              const metaRole = session.user.user_metadata?.signup_role;
              if (metaRole && ['parent', 'student', 'pro_athlete'].includes(metaRole)) {
                try {
                  await supabase.rpc('assign_initial_role', { _role: metaRole });
                  role = metaRole as UserRole;
                } catch {
                  // Role assignment failed — user may already have a role
                }
              }
            }

            setRole(role);
            setProfile(profileData);
            setLoading(false);

            // Redirect on login if at auth page or root
            if (role && (location.pathname === '/auth/login' || location.pathname === '/')) {
              navigate(ROLE_ROUTES[role], { replace: true });
            }
          } catch {
            setLoading(false);
          }
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Then check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
