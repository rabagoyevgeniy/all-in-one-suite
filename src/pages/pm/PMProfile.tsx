import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PMProfile() {
  const { user, profile: authProfile } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['pm-profile-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, city, phone, notification_prefs')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({ full_name: '', city: '', phone: '' });
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, sms: false });

  useEffect(() => {
    if (profileData) {
      setForm({
        full_name: profileData.full_name || '',
        city: profileData.city || '',
        phone: (profileData as any).phone || '',
      });
      const prefs = (profileData.notification_prefs as any) || {};
      setNotifPrefs({ email: prefs.email ?? true, push: prefs.push ?? true, sms: prefs.sms ?? false });
    }
  }, [profileData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          city: form.city,
          notification_prefs: notifPrefs as any,
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profile-settings'] });
      toast.success('Profile saved!');
    },
    onError: () => toast.error('Failed to save profile'),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">⚙️ Profile & Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </motion.div>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {profileData?.avatar_url ? (
            <img src={profileData.avatar_url} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <User size={28} className="text-primary" />
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{form.full_name || 'Manager'}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </motion.div>

      {/* Personal Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card rounded-xl p-4 space-y-4"
      >
        <h3 className="font-semibold text-sm text-foreground">Personal Information</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Full Name</Label>
            <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl mt-1" placeholder="Dubai" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl mt-1" placeholder="+971..." />
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-4 space-y-4"
      >
        <h3 className="font-semibold text-sm text-foreground">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: 'email', label: 'Email notifications' },
            { key: 'push', label: 'Push notifications' },
            { key: 'sms', label: 'SMS notifications' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{item.label}</span>
              <Switch
                checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                onCheckedChange={v => setNotifPrefs(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </motion.div>

      <Button
        className="w-full rounded-xl gap-2"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
        Save Changes
      </Button>
    </div>
  );
}
