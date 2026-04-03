# ProFit AI Operating System — Setup Guide

> Version 3.0 | Agent Loop + Logging + Retry
> Instance: https://profitlab.app.n8n.cloud/

---

## Architecture Overview

```
POST /webhook/agent-task
  │
  ▼
┌────────────────────────────────────────────────────────┐
│                  00_agent_main_v3                        │
│                                                          │
│  Normalize → Log Start → Claude Decide → Parse → Route  │
│                                                          │
│  ┌─────────┬──────────┬──────────┬─────────┬─────────┐ │
│  │Clients  │Marketing │Operations│Content  │Finance  │ │
│  │01_*     │02_*      │03_*      │04_*     │05_*     │ │
│  └────┬────┴────┬─────┴────┬─────┴────┬────┴────┬────┘ │
│       └─────────┴──────────┴──────────┴─────────┘       │
│                         │                                │
│  Evaluate → Log Complete → Agent Loop Decision           │
│                         │                                │
│              ┌──────────┼──────────┐                     │
│              ▼          ▼          ▼                     │
│           ✅ Done    🔄 Retry   ⛓ Chain                 │
└────────────────────────────────────────────────────────┘
```

**v3 features over v2:**
- Supabase logging (`log_agent_execution` / `complete_agent_execution`)
- Retry logic (up to 3 attempts on failure)
- Agent Loop (multi-step task chaining via `next_tasks`)
- Normalized input handling (webhook body or Execute Workflow trigger)
- `anthropic-version` header sent inline (no second credential needed)

---

## Step 1: Rotate Exposed API Key

⚠️ **CRITICAL** — Anthropic key `sk-ant-api03--t3-LDvVY...` is exposed in workflow `03_operations_ai_tool`.

1. Go to https://console.anthropic.com/settings/keys
2. **Revoke** the exposed key
3. Generate a new key
4. Save it for Step 2

## Step 2: Create n8n Credentials

**Settings → Credentials → Add Credential**

| Credential Name | Type | Config |
|----------------|------|--------|
| `Anthropic API Key` | Header Auth | Name: `x-api-key` / Value: `sk-ant-YOUR_NEW_KEY` |
| `Supabase Service Key` | Header Auth | Name: `Authorization` / Value: `Bearer YOUR_SERVICE_ROLE_KEY` |
| `Google Maps API Key` | Query String Auth | Name: `key` / Value: `YOUR_GOOGLE_KEY` |

> The `anthropic-version: 2023-06-01` header is now sent inline in each node — no separate credential needed.

## Step 3: Delete Old Workflows

Delete these 4 broken workflows from your n8n instance:

| Workflow | ID | Reason |
|----------|----|--------|
| `04_content_ai_request` | `hsHCUoIdBcx5BXda` | Empty logic |
| `03_operations_ai_tool` | `mjElZbEOvtS13z2R` | **Exposed API key** |
| `02_marketing_ai_generator` | `eRYY1HxTQEUTIQJY` | Missing auth |
| `00_agent_main` | `c3bEXpclwEtGtjo7` | Placeholder shell |

## Step 4: Apply Database Migration

Run in Supabase SQL Editor or via CLI:

```bash
supabase db push
```

Migration `20260316200000_ai_operating_system.sql` creates:

| Object | Type |
|--------|------|
| `agent_workflow_logs` | Table — tracks every execution |
| `agent_task_queue` | Table — queued tasks with retry |
| `get_tomorrow_bookings()` | RPC — lesson reminder data |
| `get_revenue_summary(period)` | RPC — financial aggregation |
| `get_student_progress(student_id)` | RPC — student data for training plans |
| `log_agent_execution()` | RPC — create execution log |
| `complete_agent_execution()` | RPC — update with result |
| 4 RLS policies | Security — admin + service_role |

## Step 5: Set n8n Environment Variables

**Settings → Variables**

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` (anon key) |

## Step 6: Import Workflows

**Import order matters** — sub-workflows first, then orchestrator.

In n8n: **Workflows → Import from File**

### Round 1 — Sub-workflows:
```
01_clients_lesson_reminder.json
02_marketing_social_content.json
03_operations_pool_finder.json
04_content_training_plan.json
05_finance_revenue_report.json
```

### Round 2 — Orchestrator:
```
00_agent_main_v3.json
```

## Step 7: Wire Execute Workflow Nodes

Open `00_agent_main_v3` in the editor:

1. Click **→ Clients Workflow** → select `01_clients_lesson_reminder`
2. Click **→ Marketing Workflow** → select `02_marketing_social_content`
3. Click **→ Operations Workflow** → select `03_operations_pool_finder`
4. Click **→ Content Workflow** → select `04_content_training_plan`
5. Click **→ Finance Workflow** → select `05_finance_revenue_report`
6. **Save**

## Step 8: Set Credentials in Each Node

For every HTTP Request node in every workflow:

1. Click the node
2. Under **Authentication** → Generic Credential → select matching credential
3. **Anthropic nodes** → select `Anthropic API Key`
4. **Supabase nodes** → select `Supabase Service Key`
5. **Google Maps node** (pool finder only) → select `Google Maps API Key`
6. Save each workflow after configuring

## Step 9: Activate & Test

1. **Activate** `00_agent_main_v3` (toggle on)
2. Test each task type:

### Test 1: Marketing Content
```bash
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "generate instagram content about kids swimming lessons in Dubai"}'
```

### Test 2: Lesson Reminders
```bash
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "remind parents about tomorrow lessons"}'
```

### Test 3: Pool Search
```bash
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "find swimming pools in JVC Dubai for partnership"}'
```

### Test 4: Revenue Report
```bash
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "generate weekly revenue report"}'
```

### Test 5: Training Plan
```bash
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "create training plan for student abc-123-uuid"}'
```

### Expected Response (v3)
```json
{
  "status": "completed",
  "agent_version": "3.0",
  "log_id": "uuid-of-execution-log",
  "task": "generate weekly revenue report",
  "workflow_executed": "05_finance_revenue_report",
  "category": "finance",
  "reasoning": "Task requests a revenue report for the weekly period",
  "result": {
    "status": "completed",
    "workflow": "05_finance_revenue_report",
    "period": "weekly",
    "data_summary": { ... },
    "report": "## ProFit Swimming — Weekly Revenue Report ..."
  },
  "execution_time_ms": 8200,
  "next_tasks": [],
  "completedAt": "2026-03-16T20:00:00.000Z"
}
```

## Step 10: MCP Integration

From Claude Code, trigger tasks directly:

```
execute_workflow({
  workflowId: "V3_WORKFLOW_ID",
  inputs: {
    type: "webhook",
    webhookData: {
      method: "POST",
      body: { task: "find pools in Sports City Dubai" }
    }
  }
})
```

Or search first, then execute:
```
search_workflows({ query: "agent_main" })
→ returns ID
execute_workflow({ workflowId: "ID", ... })
```

---

## File Inventory

| File | Workflow | Nodes | Data Sources |
|------|---------|-------|-------------|
| `00_agent_main_v3.json` | Orchestrator with logging + agent loop | 20 | Supabase + Claude |
| `01_clients_lesson_reminder.json` | Lesson reminders | 5 | Supabase RPC + Claude |
| `02_marketing_social_content.json` | Social media content | 3 | Claude |
| `03_operations_pool_finder.json` | Pool search + ranking | 5 | Google Maps + Claude |
| `04_content_training_plan.json` | AI training plans | 5 | Supabase RPC + Claude + Supabase write |
| `05_finance_revenue_report.json` | Revenue reports | 4 | Supabase RPC + Claude |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **401 from Anthropic** | Credential not configured. Click node → Authentication → select `Anthropic API Key` |
| **Empty Supabase result** | Run the migration first. Check that Service Role key is correct |
| **Switch → Fallback** | Claude returned unexpected category. Check `Parse Decision` node output |
| **"Workflow not found"** | Orchestrator not activated, or sub-workflow ID doesn't match |
| **Log Start fails** | `SUPABASE_URL` / `SUPABASE_ANON_KEY` not set in n8n Variables |
| **Retry loop** | Check sub-workflow for errors. Max 3 retries then fails |
