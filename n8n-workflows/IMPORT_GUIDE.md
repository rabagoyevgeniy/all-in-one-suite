# ProFit AI Operating System — n8n Import Guide v2

> Target: https://profitlab.app.n8n.cloud/
> Total Workflows: 6 (5 sub-workflows + 1 orchestrator)
> Estimated Time: 15-20 minutes

---

## Prerequisites

### 1. Rotate Exposed API Key (CRITICAL)

The old workflow `03_operations_ai_tool` contains an exposed Anthropic API key.

1. Go to https://console.anthropic.com/settings/keys
2. **Revoke** any exposed keys
3. Generate a new key — save it for Step 2

### 2. Create Credentials in n8n

Go to **Settings → Credentials → Add Credential**

| # | Credential Name | Type | Config |
|---|----------------|------|--------|
| 1 | `Anthropic API Key` | Header Auth | Name: `x-api-key` / Value: `sk-ant-YOUR_NEW_KEY` |
| 2 | `Supabase Service Key` | Header Auth | Name: `Authorization` / Value: `Bearer YOUR_SERVICE_ROLE_KEY` |
| 3 | `Google Maps API Key` | Query String Auth | Name: `key` / Value: `YOUR_GOOGLE_MAPS_KEY` |

### 3. Set Environment Variables

Go to **Settings → Variables**

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://hawbkqjdnvaoffbhihnt.supabase.co` |
| `SUPABASE_ANON_KEY` | Your project anon key (starts with `eyJ...`) |

### 4. Delete Old Broken Workflows

Delete these 4 non-functional workflows from your n8n instance:

| Workflow | ID | Why |
|----------|----|-----|
| `00_agent_main` | `c3bEXpclwEtGtjo7` | Placeholder shell |
| `02_marketing_ai_generator` | `eRYY1HxTQEUTIQJY` | Missing auth |
| `03_operations_ai_tool` | `mjElZbEOvtS13z2R` | EXPOSED API KEY |
| `04_content_ai_request` | `hsHCUoIdBcx5BXda` | Empty logic |

### 5. Deploy Supabase Migration (if not done)

Run the full migration in Supabase SQL Editor:
- File: `supabase/migrations/20260316200000_ai_operating_system.sql`
- Creates: `agent_workflow_logs`, `agent_task_queue`, 5 RPCs, RLS policies

---

## Import Steps

### Round 1 — Sub-workflows (import BEFORE orchestrator)

**For each file: Workflows → Import from File → select file → Save**

#### Step 1: Import `01_clients_lesson_reminder.json`

1. Click **Workflows → Import from File**
2. Select `01_clients_lesson_reminder.json`
3. Open the imported workflow
4. Click **Supabase → Tomorrow Bookings** node:
   - Authentication → Generic Credential → select **Supabase Service Key**
5. Click **Claude → Generate Message** node:
   - Authentication → Generic Credential → select **Anthropic API Key**
6. Click **Save**
7. Note the workflow name in the URL bar

#### Step 2: Import `02_marketing_social_content.json`

1. Import the file
2. Click **Claude → Generate Content** node:
   - Select **Anthropic API Key** credential
3. **Save**

#### Step 3: Import `03_operations_pool_finder.json`

1. Import the file
2. Click **Google Maps → Search** node:
   - Select **Google Maps API Key** credential
3. Click **Claude → Rank Pools** node:
   - Select **Anthropic API Key** credential
4. **Save**

#### Step 4: Import `04_content_training_plan.json`

1. Import the file
2. Click **Supabase → Student Progress** node:
   - Select **Supabase Service Key** credential
3. Click **Claude → Training Plan** node:
   - Select **Anthropic API Key** credential
4. Click **Save → Supabase** node:
   - Select **Supabase Service Key** credential
5. **Save**

#### Step 5: Import `05_finance_revenue_report.json`

1. Import the file
2. Click **Supabase → Revenue Data** node:
   - Select **Supabase Service Key** credential
3. Click **Claude → Financial Analysis** node:
   - Select **Anthropic API Key** credential
4. **Save**

---

### Round 2 — Orchestrator

#### Step 6: Import `00_agent_main_v3.json`

1. Import the file
2. **Wire Execute Workflow nodes** (critical step):

   | Node | Select Workflow from Dropdown |
   |------|------------------------------|
   | → Clients Workflow | `01_clients_lesson_reminder` |
   | → Marketing Workflow | `02_marketing_social_content` |
   | → Operations Workflow | `03_operations_pool_finder` |
   | → Content Workflow | `04_content_training_plan` |
   | → Finance Workflow | `05_finance_revenue_report` |

   For each: click the node → Workflow dropdown → select the matching sub-workflow.

3. **Set credentials** on HTTP nodes:

   | Node | Credential |
   |------|-----------|
   | Log Start → Supabase | Supabase Service Key |
   | Claude → Decide Workflow | Anthropic API Key |
   | Log Complete → Supabase | Supabase Service Key |

4. **Save**
5. **Activate** — toggle the workflow ON (top right)

---

## Post-Import Verification

### Quick Test Commands

After activating the orchestrator, test each category:

```bash
# Test 1: Clients — Lesson Reminders
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "remind parents about tomorrow lessons"}'

# Test 2: Marketing — Social Content
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "generate instagram content about kids swimming lessons in Dubai"}'

# Test 3: Operations — Pool Search
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "find swimming pools in JVC Dubai for partnership"}'

# Test 4: Finance — Revenue Report
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "generate weekly revenue report"}'

# Test 5: Content — Training Plan (use a real student UUID)
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "create training plan for student YOUR-STUDENT-UUID"}'
```

### Expected Response Format

```json
{
  "status": "completed",
  "agent_version": "3.1",
  "log_id": "uuid",
  "task": "...",
  "workflow_executed": "finance",
  "category": "finance",
  "confidence": 95,
  "reasoning": "financial reporting",
  "result": { "...": "..." },
  "execution_time_ms": 8200,
  "next_tasks": [],
  "completedAt": "2026-03-17T..."
}
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 from Anthropic | Credential not set | Click node → Authentication → select credential |
| Empty Supabase response | Variables not set | Settings → Variables → set `SUPABASE_URL` + `SUPABASE_ANON_KEY` |
| "Workflow not found" in Execute node | Sub-workflow not selected | Open orchestrator → click Execute node → select workflow |
| "No Match" fires | Classification failed (should not happen in v3.1) | Check Parse Decision output — fallback defaults to "clients" |
| Log Start fails with 400 | RPC not deployed | Run migration in Supabase SQL Editor |
| Retry loop (3x then fail) | Sub-workflow has an error | Check sub-workflow execution log |
| Google Maps 403 | API key invalid or billing not enabled | Verify at console.cloud.google.com |

---

## Credential Summary per Workflow

| Workflow | Anthropic | Supabase | Google Maps |
|----------|-----------|----------|------------|
| 00_agent_main_v3 | 1 node | 2 nodes | — |
| 01_clients_lesson_reminder | 1 node | 1 node | — |
| 02_marketing_social_content | 1 node | — | — |
| 03_operations_pool_finder | 1 node | — | 1 node |
| 04_content_training_plan | 1 node | 2 nodes | — |
| 05_finance_revenue_report | 1 node | 1 node | — |
| **Total** | **6 nodes** | **6 nodes** | **1 node** |
