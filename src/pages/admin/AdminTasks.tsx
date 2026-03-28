import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, CheckCircle2, Clock, ChevronDown, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { awardCoins } from '@/hooks/useCoins';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function AdminTasks() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [evaluatingTask, setEvaluatingTask] = useState<any>(null);

  // Form state
  const [assignTo, setAssignTo] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coinReward, setCoinReward] = useState(10);
  const [xpReward, setXpReward] = useState(5);

  // All profiles for assignment
  const { data: allProfiles } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // All task assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['admin-task-assignments', filterStatus],
    queryFn: async () => {
      let q = supabase
        .from('task_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Create assignment
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!assignTo) throw new Error('Select a user');
      if (!title.trim()) throw new Error('Title is required');
      if (coinReward > 100) throw new Error('Max 100 coins');

      const { error } = await supabase.from('task_assignments').insert({
        assigned_by: user!.id,
        assigned_to: assignTo,
        title: title.trim(),
        description: description.trim() || null,
        coin_reward: coinReward,
        xp_reward: xpReward,
        status: 'assigned',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-assignments'] });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setAssignTo('');
      setCoinReward(10);
      setXpReward(5);
      toast({ title: 'Task assigned! ✅' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Evaluate (complete) a task
  const evaluateMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes: string }) => {
      const task = (assignments || []).find((a: any) => a.id === taskId);
      if (!task) throw new Error('Task not found');

      // Update task status
      const { error } = await supabase.from('task_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          evaluated_at: new Date().toISOString(),
          admin_notes: notes || null,
        } as any)
        .eq('id', taskId);
      if (error) throw error;

      // Award coins to the user
      if (task.coin_reward > 0) {
        // Determine role for coin award
        const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: task.assigned_to });
        const role = roleData || 'student';
        await awardCoins(
          task.assigned_to, role, task.coin_reward,
          'admin_task', task.title, task.id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-assignments'] });
      setEvaluatingTask(null);
      toast({ title: 'Task evaluated & coins awarded! 🪙' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const profileMap = new Map((allProfiles || []).map((p: any) => [p.id, p]));

  const filteredAssignments = (assignments || []).filter((a: any) => {
    if (!searchQuery) return true;
    const profile = profileMap.get(a.assigned_to);
    const name = profile?.full_name?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || a.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="px-4 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="Task Management" subtitle="Assign & evaluate tasks for users" />
      </motion.div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button onClick={() => setShowCreate(true)} size="sm" className="rounded-xl">
          <Plus size={16} className="mr-1" /> Assign Task
        </Button>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9 rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="assigned">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or task..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Assignments List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAssignments.map((task: any, i: number) => {
              const assignee = profileMap.get(task.assigned_to);
              const assigner = profileMap.get(task.assigned_by);
              const statusStyle = STATUS_COLORS[task.status] || '';
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Assigned to: <span className="font-medium text-foreground">{assignee?.full_name || 'Unknown'}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        By: {assigner?.full_name || 'Admin'} · {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusStyle}`}>
                      {task.status === 'assigned' ? '⏳ Pending' : task.status === 'completed' ? '✅ Done' : '❌ Cancelled'}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2 mb-2">{task.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-coin font-bold">🪙 {task.coin_reward}</span>
                      <span className="text-primary font-bold">⚡ {task.xp_reward} XP</span>
                    </div>
                    {task.status === 'assigned' && (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-[10px] rounded-xl"
                        onClick={() => setEvaluatingTask(task)}
                      >
                        <CheckCircle2 size={12} className="mr-1" /> Evaluate
                      </Button>
                    )}
                  </div>

                  {task.status === 'completed' && task.completed_at && (
                    <p className="text-[10px] text-success mt-2">
                      Completed: {new Date(task.completed_at).toLocaleDateString()}
                      {task.admin_notes && ` · Notes: ${task.admin_notes}`}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredAssignments.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Clock size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold text-foreground">No tasks found</p>
              <p className="text-sm text-muted-foreground mt-1">Assign a task to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">📋 Assign New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(allProfiles || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Task Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Complete 10 laps freestyle"
                className="rounded-xl mt-1"
                maxLength={100}
              />
            </div>

            <div>
              <Label className="text-xs">Description (how to complete)</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed instructions..."
                className="rounded-xl mt-1 min-h-[80px]"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coin Reward (max 100)</Label>
                <Input
                  type="number"
                  value={coinReward}
                  onChange={e => setCoinReward(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="rounded-xl mt-1"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label className="text-xs">XP Reward</Label>
                <Input
                  type="number"
                  value={xpReward}
                  onChange={e => setXpReward(Math.max(0, Number(e.target.value)))}
                  className="rounded-xl mt-1"
                  min={0}
                  max={50}
                />
              </div>
            </div>

            <Button
              className="w-full rounded-xl"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !assignTo || !title.trim()}
            >
              {createMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
              Assign Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evaluate Task Dialog */}
      <Dialog open={!!evaluatingTask} onOpenChange={() => setEvaluatingTask(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-center">✅ Evaluate Task</DialogTitle>
          </DialogHeader>
          {evaluatingTask && (
            <EvaluateForm
              task={evaluatingTask}
              profileMap={profileMap}
              onSubmit={(notes: string) => evaluateMutation.mutate({ taskId: evaluatingTask.id, notes })}
              isPending={evaluateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvaluateForm({ task, profileMap, onSubmit, isPending }: any) {
  const [notes, setNotes] = useState('');
  const assignee = profileMap.get(task.assigned_to);

  return (
    <div className="space-y-3 py-2">
      <div className="bg-muted/30 rounded-xl p-3 text-sm">
        <p className="font-semibold">{task.title}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Assigned to: {assignee?.full_name || 'Unknown'}
        </p>
        <div className="flex gap-3 mt-2 text-[11px]">
          <span className="text-coin font-bold">🪙 {task.coin_reward}</span>
          <span className="text-primary font-bold">⚡ {task.xp_reward} XP</span>
        </div>
      </div>
      <div>
        <Label className="text-xs">Admin Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Performance notes..."
          className="rounded-xl mt-1 min-h-[60px]"
          maxLength={300}
        />
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1 rounded-xl"
          onClick={() => onSubmit(notes)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          Complete & Award 🪙
        </Button>
      </div>
    </div>
  );
}
