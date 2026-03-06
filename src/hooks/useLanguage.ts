import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

type Lang = 'en' | 'ru';

export function useLanguage() {
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['user-language', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user!.id)
        .single();
      if (error) return 'en';
      return (data?.language as Lang) || 'en';
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  const language: Lang = (data as Lang) || 'en';

  const t = (en: string, ru: string) => language === 'ru' ? ru : en;

  return { language, t };
}
