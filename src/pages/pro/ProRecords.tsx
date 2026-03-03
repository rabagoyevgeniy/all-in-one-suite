import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Timer, Medal } from 'lucide-react';
import { toast } from 'sonner';

const SWIM_STYLES = ['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley'];
const DISTANCES = [25, 50, 100, 200, 400];

// Simplified world records for FINA point estimation (in ms)
const WORLD_RECORDS: Record<string, number> = {
  'freestyle_50': 20910, 'freestyle_100': 46910, 'freestyle_200': 102000,
  'backstroke_50': 24000, 'backstroke_100': 51850, 'backstroke_200': 111000,
  'breaststroke_50': 25950, 'breaststroke_100': 56880, 'breaststroke_200': 125000,
  'butterfly_50': 22270, 'butterfly_100': 49450, 'butterfly_200': 110000,
  'medley_200': 114000, 'medley_400': 243000,
};

function calcFinaPoints(style: string, distance: number, timeMs: number): number {
  const key = `${style}_${distance}`;
  const wr = WORLD_RECORDS[key];
  if (!wr || timeMs <= 0) return 0;
  return Math.round(1000 * Math.pow(wr / timeMs, 3));
}

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`;
}

export default function ProRecords() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ swimStyle: 'freestyle', distance: '50', minutes: '0', seconds: '', dateAchieved: '', isDuel: false });

  const { data: records, isLoading } = useQuery({
    queryKey: ['pro-records', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_personal_records')
        .select('*')
        .eq('athlete_id', user!.id)
        .order('swim_style')
        .order('distance_meters');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const secParts = form.seconds.split('.');
      const wholeSec = parseInt(secParts[0]) || 0;
      const ms = parseInt((secParts[1] || '0').padEnd(3, '0').substring(0, 3));
      const totalMs = (parseInt(form.minutes) * 60 + wholeSec) * 1000 + ms;
      const fina = calcFinaPoints(form.swimStyle, parseInt(form.distance), totalMs);

      const { error } = await supabase.from('pro_personal_records').insert({
        athlete_id: user!.id,
        swim_style: form.swimStyle,
        distance_meters: parseInt(form.distance),
        time_ms: totalMs,
        fina_points: fina,
        achieved_at: form.dateAchieved || new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-records'] });
      setOpen(false);
      toast.success('Record added! 🏅');
    },
    onError: () => toast.error('Failed to add record'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Group by swim style
  const grouped: Record<string, any[]> = {};
  SWIM_STYLES.forEach(s => { grouped[s] = []; });
  (records || []).forEach((r: any) => {
    if (grouped[r.swim_style]) grouped[r.swim_style].push(r);
  });

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">🏅 Personal Records</h2>
          <p className="text-sm text-muted-foreground">Track your best times</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1"><Plus size={16} /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Personal Record</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Swim Style</Label>
                  <Select value={form.swimStyle} onValueChange={v => setForm(p => ({ ...p, swimStyle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SWIM_STYLES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Distance</Label>
                  <Select value={form.distance} onValueChange={v => setForm(p => ({ ...p, distance: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DISTANCES.map(d => <SelectItem key={d} value={String(d)}>{d}m</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Minutes</Label>
                  <Input type="number" min={0} value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: e.target.value }))} />
                </div>
                <div>
                  <Label>Seconds (SS.ms)</Label>
                  <Input placeholder="24.32" value={form.seconds} onChange={e => setForm(p => ({ ...p, seconds: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Date Achieved</Label>
                <Input type="date" value={form.dateAchieved} onChange={e => setForm(p => ({ ...p, dateAchieved: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.isDuel} onCheckedChange={v => setForm(p => ({ ...p, isDuel: !!v }))} />
                <Label className="text-sm">Achieved during a duel</Label>
              </div>
              <Button className="w-full" disabled={!form.seconds || addRecord.isPending} onClick={() => addRecord.mutate()}>
                {addRecord.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {SWIM_STYLES.map((style, si) => (
        <motion.div key={style} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}>
          <h3 className="font-display font-semibold text-sm text-foreground capitalize mb-2">🏊 {style}</h3>
          {grouped[style].length > 0 ? (
            <div className="space-y-2">
              {grouped[style].map((r: any) => (
                <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer size={16} className="text-primary" />
                    <div>
                      <p className="font-display font-bold text-sm text-foreground">{formatTime(r.time_ms)}</p>
                      <p className="text-[10px] text-muted-foreground">{r.distance_meters}m · {r.achieved_at || 'Unknown date'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.fina_points > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Medal size={10} /> {r.fina_points} FINA
                      </Badge>
                    )}
                    {r.is_verified && <p className="text-[9px] text-success mt-0.5">✓ Verified</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-3 text-center text-[11px] text-muted-foreground">No record yet</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
