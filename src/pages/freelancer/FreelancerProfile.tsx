import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Save, Loader2, MapPin, Clock, DollarSign, Globe, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function FreelancerProfile() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: freelancer, isLoading } = useQuery({
    queryKey: ['freelancer-profile-edit', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelancers')
        .select('*, profiles!freelancers_id_fkey(full_name, avatar_url, city)')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({
    bio: '',
    hourly_rate: '',
    group_rate: '',
    city: 'dubai',
    experience_years: '0',
    languages: 'English',
    specializations: '',
    age_groups: '',
    cancellation_policy: 'flexible',
    travel_radius_km: '20',
    min_booking_minutes: '45',
  });

  // Populate form when data loads
  const profile = (freelancer as any)?.profiles;
  if (freelancer && !form.bio && freelancer.bio) {
    setForm({
      bio: freelancer.bio || '',
      hourly_rate: String(freelancer.hourly_rate || ''),
      group_rate: String(freelancer.group_rate || ''),
      city: freelancer.city || 'dubai',
      experience_years: String(freelancer.experience_years || 0),
      languages: (freelancer.languages || ['English']).join(', '),
      specializations: (freelancer.specializations || []).join(', '),
      age_groups: (freelancer.age_groups || []).join(', '),
      cancellation_policy: freelancer.cancellation_policy || 'flexible',
      travel_radius_km: String(freelancer.travel_radius_km || 20),
      min_booking_minutes: String(freelancer.min_booking_minutes || 45),
    });
  }

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('freelancers').update({
        bio: form.bio,
        hourly_rate: parseFloat(form.hourly_rate) || null,
        group_rate: parseFloat(form.group_rate) || null,
        city: form.city,
        experience_years: parseInt(form.experience_years) || 0,
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
        age_groups: form.age_groups.split(',').map(s => s.trim()).filter(Boolean),
        cancellation_policy: form.cancellation_policy,
        travel_radius_km: parseInt(form.travel_radius_km) || 20,
        min_booking_minutes: parseInt(form.min_booking_minutes) || 45,
      } as any).eq('id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['freelancer-profile'] });
      toast({ title: t('Profile saved!', 'Профиль сохранён!') });
    } catch (err: any) {
      toast({ title: t('Error', 'Ошибка'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-lg text-foreground">{t('Edit Profile', 'Редактировать профиль')}</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
            {profile?.full_name?.[0] || '?'}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
            <Camera size={14} />
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-foreground">{t('Bio', 'О себе')}</Label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
            placeholder={t('Tell clients about yourself...', 'Расскажите о себе...')}
            className="w-full h-24 px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={300}
          />
          <p className="text-[10px] text-muted-foreground text-right">{form.bio.length}/300</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1"><DollarSign size={12} /> {t('Hourly Rate', 'Ставка/час')}</Label>
            <Input value={form.hourly_rate} onChange={(e) => setForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="200" type="number" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1"><DollarSign size={12} /> {t('Group Rate', 'Групповая')}</Label>
            <Input value={form.group_rate} onChange={(e) => setForm(p => ({ ...p, group_rate: e.target.value }))} placeholder="150" type="number" className="h-10 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-1"><Award size={12} /> {t('Specializations', 'Специализации')}</Label>
          <Input value={form.specializations} onChange={(e) => setForm(p => ({ ...p, specializations: e.target.value }))} placeholder="Freestyle, Backstroke, Kids" className="h-10 rounded-xl" />
          <p className="text-[10px] text-muted-foreground">{t('Comma separated', 'Через запятую')}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">{t('Age Groups', 'Возрастные группы')}</Label>
          <Input value={form.age_groups} onChange={(e) => setForm(p => ({ ...p, age_groups: e.target.value }))} placeholder="Kids 5-8, Teens, Adults" className="h-10 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1"><MapPin size={12} /> {t('City', 'Город')}</Label>
            <select value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm">
              <option value="dubai">Dubai</option>
              <option value="baku">Baku</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1"><Clock size={12} /> {t('Experience', 'Опыт (лет)')}</Label>
            <Input value={form.experience_years} onChange={(e) => setForm(p => ({ ...p, experience_years: e.target.value }))} type="number" className="h-10 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-1"><Globe size={12} /> {t('Languages', 'Языки')}</Label>
          <Input value={form.languages} onChange={(e) => setForm(p => ({ ...p, languages: e.target.value }))} placeholder="English, Russian, Arabic" className="h-10 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-foreground">{t('Min Session', 'Мин. сессия (мин)')}</Label>
            <Input value={form.min_booking_minutes} onChange={(e) => setForm(p => ({ ...p, min_booking_minutes: e.target.value }))} type="number" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">{t('Travel Radius', 'Радиус (км)')}</Label>
            <Input value={form.travel_radius_km} onChange={(e) => setForm(p => ({ ...p, travel_radius_km: e.target.value }))} type="number" className="h-10 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">{t('Cancellation Policy', 'Политика отмены')}</Label>
          <select value={form.cancellation_policy} onChange={(e) => setForm(p => ({ ...p, cancellation_policy: e.target.value }))} className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm">
            <option value="flexible">{t('Flexible — free cancel 24h before', 'Гибкая — бесплатная отмена за 24ч')}</option>
            <option value="moderate">{t('Moderate — free cancel 48h before', 'Умеренная — за 48ч')}</option>
            <option value="strict">{t('Strict — no refunds', 'Строгая — без возврата')}</option>
          </select>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-semibold text-base">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
        {t('Save Profile', 'Сохранить профиль')}
      </Button>
    </div>
  );
}
