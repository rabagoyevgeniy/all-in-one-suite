import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface ExpiringSubscription {
  id: string;
  expires_at: string;
  package_type: string | null;
  used_lessons: number | null;
  total_lessons: number | null;
  student_id: string | null;
  currency: string | null;
}

const PACKAGES = [
  { key: 'package_8', label: 'Package 8', lessons: 8, aed: 2000, azn: 200 },
  { key: 'package_12', label: 'Package 12', lessons: 12, aed: 2800, azn: 280 },
  { key: 'package_vip', label: 'Package VIP', lessons: 16, aed: 4500, azn: 350 },
];

function getDaysLeft(expiresAt: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysBadge(daysLeft: number) {
  if (daysLeft <= 0) return { text: 'Expires today', className: 'bg-destructive text-destructive-foreground' };
  if (daysLeft <= 1) return { text: '1 day left', className: 'bg-destructive text-destructive-foreground' };
  if (daysLeft <= 3) return { text: `${daysLeft} days left`, className: 'bg-warning text-warning-foreground' };
  return { text: `${daysLeft} days left`, className: 'bg-warning/80 text-warning-foreground' };
}

export default function ParentPayments() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    subId: string;
    pkg: typeof PACKAGES[0];
    currency: string;
  } | null>(null);

  const currency = profile?.city?.toLowerCase().includes('baku') ? 'AZN' : 'AED';

  const { data: expiringSubs, isLoading } = useQuery({
    queryKey: ['expiring-subscriptions-payments', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, expires_at, package_type, used_lessons, total_lessons, student_id, currency')
        .eq('parent_id', user!.id)
        .eq('status', 'active')
        .lte('expires_at', sevenDays)
        .gte('expires_at', today);

      if (error) throw error;
      return (data || []) as ExpiringSubscription[];
    },
    enabled: !!user?.id,
  });

  const { data: studentProfiles } = useQuery({
    queryKey: ['student-profiles-for-renewal', user?.id],
    queryFn: async () => {
      const studentIds = (expiringSubs || []).map(s => s.student_id).filter(Boolean);
      if (studentIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds as string[]);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
    enabled: !!expiringSubs && expiringSubs.length > 0,
  });

  const renewMutation = useMutation({
    mutationFn: async ({ subId, pkg }: { subId: string; pkg: typeof PACKAGES[0] }) => {
      const newExpiry = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
      const { error } = await supabase
        .from('subscriptions')
        .update({
          expires_at: newExpiry,
          status: 'active',
          penalty_applied: false,
          warnings_sent: [],
          package_type: pkg.key,
          total_lessons: pkg.lessons,
          used_lessons: 0,
          price: currency === 'AZN' ? pkg.azn : pkg.aed,
          currency,
        } as any)
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Package renewed successfully! ✅' });
      queryClient.invalidateQueries({ queryKey: ['expiring-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-subscriptions-payments'] });
      queryClient.invalidateQueries({ queryKey: ['parent-subscription'] });
      setConfirmDialog(null);
    },
    onError: () => {
      toast({ title: 'Renewal failed', description: 'Please try again.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h2 className="font-display font-bold text-xl text-foreground">Payments & Renewals</h2>

      {(!expiringSubs || expiringSubs.length === 0) ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle size={40} className="mx-auto text-success mb-3" />
            <p className="text-sm text-muted-foreground">All subscriptions are up to date!</p>
          </CardContent>
        </Card>
      ) : (
        expiringSubs.map((sub) => {
          const daysLeft = getDaysLeft(sub.expires_at);
          const badge = getDaysBadge(daysLeft);
          const studentName = studentProfiles?.[sub.student_id || ''] || 'Student';

          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Current subscription info */}
              <Card className="border-warning/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Renew Subscription</CardTitle>
                    <Badge className={badge.className}>{badge.text}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧒</span>
                    <span className="font-semibold text-foreground">{studentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    <span>Expires: {new Date(sub.expires_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lessons used: {sub.used_lessons || 0} / {sub.total_lessons || 0}
                  </p>
                </CardContent>
              </Card>

              {/* Package options */}
              <div className="grid gap-3">
                {PACKAGES.map((pkg) => {
                  const price = currency === 'AZN' ? pkg.azn : pkg.aed;
                  return (
                    <Card
                      key={pkg.key}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setConfirmDialog({ subId: sub.id, pkg, currency })}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-display font-bold text-foreground">{pkg.label}</p>
                          <p className="text-xs text-muted-foreground">{pkg.lessons} lessons</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-lg text-foreground">
                            {price.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">{currency}</span>
                          <CreditCard size={16} className="text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          );
        })
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renew Package?</AlertDialogTitle>
            <AlertDialogDescription>
              Renew <strong>{confirmDialog?.pkg.label}</strong> for{' '}
              <strong>
                {confirmDialog?.currency === 'AZN'
                  ? confirmDialog?.pkg.azn.toLocaleString()
                  : confirmDialog?.pkg.aed.toLocaleString()}{' '}
                {confirmDialog?.currency}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={renewMutation.isPending}
              onClick={() => {
                if (confirmDialog) {
                  renewMutation.mutate({ subId: confirmDialog.subId, pkg: confirmDialog.pkg });
                }
              }}
            >
              {renewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
