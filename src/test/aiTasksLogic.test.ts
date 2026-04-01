import { describe, it, expect } from "vitest";
import type { AITask, AITaskStep } from "@/hooks/useAITasks";

// Extract and test the PURE LOGIC from useAITasks without Supabase dependencies
// These functions mirror the logic inside the hook

function calculateProgress(steps: AITaskStep[]): number {
  if (steps.length === 0) return 0;
  const doneCount = steps.filter(s => s.done).length;
  return Math.round((doneCount / steps.length) * 100);
}

function isAllDone(steps: AITaskStep[]): boolean {
  return steps.length > 0 && steps.every(s => s.done);
}

function filterActiveTasks(tasks: AITask[]): AITask[] {
  return tasks.filter(t => t.status !== "done");
}

function filterCompletedTasks(tasks: AITask[]): AITask[] {
  return tasks.filter(t => t.status === "done");
}

function countUrgent(tasks: AITask[]): number {
  return tasks.filter(t => t.priority === "urgent" && t.status !== "done").length;
}

function filterOverdue(tasks: AITask[]): AITask[] {
  return tasks.filter(
    t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  );
}

function createMockTask(overrides: Partial<AITask> = {}): AITask {
  return {
    id: "t1",
    user_id: "u1",
    title: "Test task",
    status: "todo",
    priority: "medium",
    category: "general",
    progress_percent: 0,
    steps: [],
    ai_check_count: 0,
    reminder_sent: false,
    notify_admin: false,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("AI Tasks — Progress Calculation", () => {
  it("returns 0 for empty steps array", () => {
    expect(calculateProgress([])).toBe(0);
  });

  it("returns 0 when no steps done", () => {
    const steps: AITaskStep[] = [
      { id: "1", text: "Step 1", done: false },
      { id: "2", text: "Step 2", done: false },
    ];
    expect(calculateProgress(steps)).toBe(0);
  });

  it("returns 50 when half done", () => {
    const steps: AITaskStep[] = [
      { id: "1", text: "Step 1", done: true },
      { id: "2", text: "Step 2", done: false },
    ];
    expect(calculateProgress(steps)).toBe(50);
  });

  it("returns 100 when all done", () => {
    const steps: AITaskStep[] = [
      { id: "1", text: "Step 1", done: true },
      { id: "2", text: "Step 2", done: true },
    ];
    expect(calculateProgress(steps)).toBe(100);
  });

  it("rounds correctly for 3 steps with 1 done", () => {
    const steps: AITaskStep[] = [
      { id: "1", text: "A", done: true },
      { id: "2", text: "B", done: false },
      { id: "3", text: "C", done: false },
    ];
    expect(calculateProgress(steps)).toBe(33); // 33.33 → 33
  });

  it("rounds correctly for 3 steps with 2 done", () => {
    const steps: AITaskStep[] = [
      { id: "1", text: "A", done: true },
      { id: "2", text: "B", done: true },
      { id: "3", text: "C", done: false },
    ];
    expect(calculateProgress(steps)).toBe(67); // 66.66 → 67
  });
});

describe("AI Tasks — isAllDone detection", () => {
  it("returns false for empty steps", () => {
    expect(isAllDone([])).toBe(false);
  });

  it("returns false when not all done", () => {
    expect(isAllDone([
      { id: "1", text: "A", done: true },
      { id: "2", text: "B", done: false },
    ])).toBe(false);
  });

  it("returns true when all done", () => {
    expect(isAllDone([
      { id: "1", text: "A", done: true },
      { id: "2", text: "B", done: true },
    ])).toBe(true);
  });
});

describe("AI Tasks — Filtering Logic", () => {
  const tasks: AITask[] = [
    createMockTask({ id: "1", status: "todo", priority: "urgent" }),
    createMockTask({ id: "2", status: "in progress", priority: "high" }),
    createMockTask({ id: "3", status: "done", priority: "medium" }),
    createMockTask({ id: "4", status: "todo", priority: "urgent", due_date: "2020-01-01" }),
    createMockTask({ id: "5", status: "done", priority: "urgent" }),
  ];

  it("filterActiveTasks excludes done tasks", () => {
    const active = filterActiveTasks(tasks);
    expect(active).toHaveLength(3);
    expect(active.every(t => t.status !== "done")).toBe(true);
  });

  it("filterCompletedTasks returns only done tasks", () => {
    const completed = filterCompletedTasks(tasks);
    expect(completed).toHaveLength(2);
    expect(completed.every(t => t.status === "done")).toBe(true);
  });

  it("countUrgent counts only urgent AND not done", () => {
    expect(countUrgent(tasks)).toBe(2); // task 1 and 4 (5 is done)
  });

  it("filterOverdue finds tasks past due date and not done", () => {
    const overdue = filterOverdue(tasks);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe("4");
  });

  it("BUG CHECK: task without due_date is not overdue", () => {
    const overdue = filterOverdue([createMockTask({ status: "todo" })]);
    expect(overdue).toHaveLength(0);
  });

  it("BUG CHECK: done task with past due_date is NOT overdue", () => {
    const overdue = filterOverdue([
      createMockTask({ status: "done", due_date: "2020-01-01" }),
    ]);
    expect(overdue).toHaveLength(0);
  });

  it("BUG CHECK: future due_date is NOT overdue", () => {
    const overdue = filterOverdue([
      createMockTask({ status: "todo", due_date: "2099-01-01" }),
    ]);
    expect(overdue).toHaveLength(0);
  });
});

describe("AI Tasks — Step ID generation", () => {
  it("new step ID is based on current steps length", () => {
    // mirrors addStep logic: id = String(task.steps.length + 1)
    const existingSteps: AITaskStep[] = [
      { id: "1", text: "Step 1", done: false },
      { id: "2", text: "Step 2", done: true },
    ];
    const newStepId = String(existingSteps.length + 1);
    expect(newStepId).toBe("3");
  });

  it("BUG CHECK: step IDs can collide if steps are deleted and re-added", () => {
    // If step "2" is deleted, steps = [{id:"1"}, {id:"3"}], length = 2
    // Next step would get id = "3" → collision!
    const stepsAfterDelete: AITaskStep[] = [
      { id: "1", text: "Step 1", done: false },
      { id: "3", text: "Step 3", done: false },
    ];
    const newId = String(stepsAfterDelete.length + 1);
    const existingIds = stepsAfterDelete.map(s => s.id);
    // This documents the bug — newId "3" collides with existing "3"
    expect(existingIds.includes(newId)).toBe(true); // BUG: collision detected
  });
});
