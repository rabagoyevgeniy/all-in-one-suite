import { useState } from 'react';
import {
  CheckSquare, Square, Plus, Sparkles, X,
  ChevronDown, ChevronRight, Check, Clock,
  AlertTriangle, ArrowLeft, Bell, BellOff,
  Play, CircleCheck,
} from 'lucide-react';
import { useAITasks, type AITask, type AITaskStep } from '@/hooks/useAITasks';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
  high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  low: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
};

type FilterTab = 'all' | 'today' | 'high' | 'done';

function TaskDetailView({
  task,
  onBack,
  onAskAI,
  onToggleStep,
  onAddStep,
  onUpdate,
}: {
  task: AITask;
  onBack: () => void;
  onAskAI: (text: string) => void;
  onToggleStep: (taskId: string, stepIndex: number) => void;
  onAddStep: (taskId: string, text: string) => void;
  onUpdate: (data: Partial<AITask> & { id: string }) => void;
}) {
  const [newStepText, setNewStepText] = useState('');
  const [notes, setNotes] = useState(task.description || '');
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    onAddStep(task.id, newStepText.trim());
    setNewStepText('');
  };

  const setQuickReminder = (hours: number) => {
    const reminderAt = new Date(Date.now() + hours * 3600000).toISOString();
    onUpdate({ id: task.id, reminder_at: reminderAt });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h2 className="font-bold text-foreground text-sm flex-1 truncate">{task.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', pCfg.bg, pCfg.color)}>
            {pCfg.label}
          </span>
          {task.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              📂 {task.category}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
            )}>
              📅 {isOverdue ? 'Overdue' : 'Due'} {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">📋 Steps</p>
            <span className="text-[10px] text-muted-foreground">
              Progress {task.progress_percent}%
            </span>
          </div>
          <Progress value={task.progress_percent} className="h-2 mb-3" />

          <div className="space-y-1.5">
            {task.steps.map((step, i) => (
              <button
                key={step.id || i}
                onClick={() => onToggleStep(task.id, i)}
                className="w-full flex items-center gap-2 text-left group p-1.5 rounded-lg hover:bg-muted/50"
              >
                {step.done
                  ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  : <Square className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />}
                <span className={cn('text-xs flex-1', step.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {step.text}
                </span>
              </button>
            ))}
          </div>

          {/* Add step */}
          <div className="flex gap-1.5 mt-2">
            <input
              value={newStepText}
              onChange={(e) => setNewStepText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
              placeholder="+ Add step..."
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {newStepText.trim() && (
              <button onClick={handleAddStep} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-lg">
                Add
              </button>
            )}
          </div>
        </div>

        {/* AI Guidance */}
        {task.ai_last_advice && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary">AI Guidance</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{task.ai_last_advice}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onAskAI(`Help me complete this task: "${task.title}". ${task.description || ''} Current progress: ${task.progress_percent}%. Give me specific next steps.`)}
            className="flex-1 text-xs bg-primary/10 text-primary px-3 py-2 rounded-xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" /> Ask AI for help
          </button>
          <button
            onClick={() => onAskAI(`Check my progress on task "${task.title}" — ${task.progress_percent}% done, ${task.steps.filter(s => s.done).length}/${task.steps.length} steps. What should I focus on next?`)}
            className="flex-1 text-xs bg-muted text-muted-foreground px-3 py-2 rounded-xl hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-3 h-3" /> Get next steps
          </button>
        </div>

        {/* Reminders */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">🔔 Reminders</p>
          <div className="flex gap-1.5">
            {[
              { label: '1h', hours: 1 },
              { label: '3h', hours: 3 },
              { label: 'Tomorrow', hours: 24 },
            ].map((r) => (
              <button
                key={r.label}
                onClick={() => setQuickReminder(r.hours)}
                className="text-[10px] px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={task.notify_admin}
              onChange={(e) => onUpdate({ id: task.id, notify_admin: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Notify Admin when done</span>
          </label>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">📝 Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (task.description || '')) {
                onUpdate({ id: task.id, description: notes });
              }
            }}
            placeholder="Personal notes..."
            className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[60px]"
          />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 border-t border-border flex gap-2">
        {task.status === 'todo' && (
          <button
            onClick={() => onUpdate({ id: task.id, status: 'in_progress' })}
            className="flex-1 text-xs bg-muted text-foreground px-3 py-2.5 rounded-xl hover:bg-accent transition-colors flex items-center justify-center gap-1.5 font-medium"
          >
            <Play className="w-3 h-3" /> Start
          </button>
        )}
        <button
          onClick={() => onUpdate({ id: task.id, status: 'done', completed_at: new Date().toISOString(), progress_percent: 100 })}
          className="flex-1 text-xs bg-primary text-primary-foreground px-3 py-2.5 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 font-medium"
        >
          <CircleCheck className="w-3 h-3" /> Complete ✓
        </button>
      </div>
    </div>
  );
}

export function AITaskPanel({
  onClose,
  onAskAI,
}: {
  onClose: () => void;
  onAskAI: (text: string) => void;
}) {
  const { activeTasks, completedTasks, urgentCount, overdueTasks, createTask, updateTask, toggleStep, addStep } = useAITasks();
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPriority, setNewPriority] = useState<string>('medium');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const selectedTaskData = [...activeTasks, ...completedTasks].find((t) => t.id === selectedTask);

  if (selectedTaskData) {
    return (
      <TaskDetailView
        task={selectedTaskData}
        onBack={() => setSelectedTask(null)}
        onAskAI={(text) => { onClose(); onAskAI(text); }}
        onToggleStep={toggleStep}
        onAddStep={addStep}
        onUpdate={(data) => updateTask.mutateAsync(data)}
      />
    );
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await createTask.mutateAsync({
      title: newTaskTitle,
      priority: newPriority,
      status: 'todo',
      steps: [],
    });
    const title = newTaskTitle;
    setNewTaskTitle('');
    setShowAddForm(false);
    onAskAI(`I just added a task: "${title}". Help me break it down into actionable steps and suggest a realistic timeline.`);
  };

  // Filter tasks
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const filteredTasks = filterTab === 'done'
    ? completedTasks
    : activeTasks.filter((t) => {
        if (filterTab === 'today') return t.due_date && new Date(t.due_date) <= today;
        if (filterTab === 'high') return t.priority === 'urgent' || t.priority === 'high';
        return true;
      });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Task Manager</h2>
          {urgentCount > 0 && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
              {urgentCount} urgent
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 text-primary-foreground" />
          </button>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {([
          { key: 'all' as FilterTab, label: 'All' },
          { key: 'today' as FilterTab, label: 'Today' },
          { key: 'high' as FilterTab, label: 'Priority' },
          { key: 'done' as FilterTab, label: 'Done' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={cn(
              'text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors',
              filterTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add task form */}
      {showAddForm && (
        <div className="p-4 border-b border-border bg-muted/30">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Task title..."
            className="w-full px-3 py-2 bg-background rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring mb-2"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['urgent', 'high', 'medium', 'low'] as const).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-lg font-medium transition-colors border',
                      newPriority === p
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'bg-background text-muted-foreground border-border'
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:bg-primary/90 disabled:opacity-40"
              >
                Add + Ask AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Overdue warning */}
        {overdueTasks.length > 0 && filterTab !== 'done' && (
          <div className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/10 mb-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[11px] font-medium text-destructive">
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && !showAddForm && (
          <div className="text-center py-12">
            <CheckSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterTab === 'done' ? 'No completed tasks' : 'No tasks yet'}
            </p>
            {filterTab === 'all' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-xs text-primary hover:text-primary/80"
              >
                + Add your first task
              </button>
            )}
          </div>
        )}

        {filteredTasks.map((task) => {
          const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
          return (
            <div key={task.id} className="bg-background border border-border rounded-xl p-3">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => updateTask.mutateAsync({ id: task.id, status: 'done', completed_at: new Date().toISOString(), progress_percent: 100 })}
                  className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {task.status === 'done'
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', pCfg.dot)} />
                    <p className={cn('text-sm font-medium truncate', task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {task.title}
                    </p>
                    {isOverdue && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                        Overdue
                      </span>
                    )}
                    {task.status === 'in_progress' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        In Progress
                      </span>
                    )}
                  </div>
                  {task.due_date && !isOverdue && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      📅 Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTask(task.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              {task.steps.length > 0 && task.status !== 'done' && (
                <div className="mt-2 ml-6">
                  <div className="flex items-center gap-2">
                    <Progress value={task.progress_percent} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground">
                      {task.progress_percent}%
                    </span>
                  </div>
                </div>
              )}

              {/* Quick actions on hover */}
              <div className="flex gap-1 mt-2 ml-6">
                {task.status === 'todo' && (
                  <button
                    onClick={() => updateTask.mutateAsync({ id: task.id, status: 'in_progress' })}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5" /> Start
                  </button>
                )}
                <button
                  onClick={() => { onClose(); onAskAI(`Help me with task: "${task.title}". Give me specific next steps.`); }}
                  className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </button>
                <button
                  onClick={() => {
                    const reminderAt = new Date(Date.now() + 3600000).toISOString();
                    updateTask.mutateAsync({ id: task.id, reminder_at: reminderAt });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1"
                >
                  <Bell className="w-2.5 h-2.5" /> Remind
                </button>
              </div>
            </div>
          );
        })}

        {/* Completed toggle (only in 'all' filter) */}
        {filterTab === 'all' && completedTasks.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full"
            >
              {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Completed ({completedTasks.length})
            </button>
            {showCompleted && (
              <div className="mt-2 space-y-1.5">
                {completedTasks.slice(0, 10).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-left"
                  >
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground line-through flex-1 truncate">{task.title}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
