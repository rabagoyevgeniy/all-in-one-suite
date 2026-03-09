import { useState } from 'react';
import {
  CheckSquare, Square, Plus, Sparkles, X,
  ChevronDown, ChevronRight, Check,
} from 'lucide-react';
import { useAITasks, type AITask } from '@/hooks/useAITasks';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
  high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  low: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
};

export function AITaskPanel({
  onClose,
  onAskAI,
}: {
  onClose: () => void;
  onAskAI: (text: string) => void;
}) {
  const { activeTasks, completedTasks, urgentCount, createTask, updateTask, toggleStep } = useAITasks();
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPriority, setNewPriority] = useState<string>('medium');

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

  const handleAIHelp = (task: AITask) => {
    onClose();
    onAskAI(`Help me complete this task: "${task.title}". ${task.description ? 'Context: ' + task.description : ''} Give me specific next steps and what to watch out for.`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Tasks</h2>
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
        {activeTasks.length === 0 && !showAddForm && (
          <div className="text-center py-12">
            <CheckSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-xs text-primary hover:text-primary/80"
            >
              + Add your first task
            </button>
          </div>
        )}

        {activeTasks.map((task) => {
          const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
          return (
            <div key={task.id} className="bg-background border border-border rounded-xl p-3">
              {/* Task header */}
              <div className="flex items-start gap-2">
                <button
                  onClick={() => updateTask.mutateAsync({ id: task.id, status: 'done', completed_at: new Date().toISOString() })}
                  className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Square className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full', pCfg.dot)} />
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  </div>
                  {task.due_date && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAIHelp(task)}
                    title="Ask AI for help"
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                  </button>
                  {task.steps.length > 0 && (
                    <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                      {expandedTask === task.id
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Steps progress */}
              {task.steps.length > 0 && (
                <div className="mt-2 ml-6">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(task.steps.filter((s) => s.done).length / task.steps.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {task.steps.filter((s) => s.done).length}/{task.steps.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Expanded steps */}
              {expandedTask === task.id && task.steps.length > 0 && (
                <div className="mt-2 ml-6 space-y-1.5">
                  {task.steps.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => toggleStep(task.id, i)}
                      className="w-full flex items-center gap-2 text-left group"
                    >
                      {step.done
                        ? <CheckSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        : <Square className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />}
                      <span className={cn('text-xs', step.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                        {step.text}
                      </span>
                    </button>
                  ))}
                  {task.ai_notes && (
                    <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-medium text-primary">AI notes</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{task.ai_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Completed */}
        {completedTasks.length > 0 && (
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
                  <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
