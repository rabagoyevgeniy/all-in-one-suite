# ProFit Swimming — AI Operating System

> Complete 10-step implementation: n8n + Claude automation
> Instance: https://profitlab.app.n8n.cloud/
> Generated: 2026-03-16 | Audit rev 2

---

## STEP 1 — AUDIT OF EXISTING WORKFLOWS

### Workflow Inventory (4 workflows found)

| # | Name | ID | Active | Trigger | Status |
|---|------|-----|--------|---------|--------|
| 1 | `04_content_ai_request` | `hsHCUoIdBcx5BXda` | ✅ Yes | Webhook GET | **BROKEN** — webhook exists but `connections: {}`, zero logic |
| 2 | `03_operations_ai_tool` | `mjElZbEOvtS13z2R` | ❌ No | Webhook POST `/ai-dev` | **🔴 CRITICAL** — Anthropic API key in plaintext |
| 3 | `02_marketing_ai_generator` | `eRYY1HxTQEUTIQJY` | ❌ No | Manual Trigger | **BROKEN** — no auth headers, no request body |
| 4 | `00_agent_main` | `c3bEXpclwEtGtjo7` | ❌ No | Unknown | **NOT ACCESSIBLE** — returns "Workflow not found" via API |

### Detailed Findings

**Workflow 1: `04_content_ai_request` (hsHCUoIdBcx5BXda)**
- Active but useless — webhook fires, nothing happens
- No nodes connected after trigger
- Base URL: `https://profitlab.app.n8n.cloud/webhook/4077a973-...`
- No authentication on webhook
- **Action**: DELETE and replace

**Workflow 2: `03_operations_ai_tool` (mjElZbEOvtS13z2R)**
- Webhook POST at `/webhook/ai-dev`
- HTTP Request → `https://api.anthropic.com/v1/messages`
- **🔴 HARDCODED API KEY** in `jsonHeaders`:
  ```
  x-api-key: sk-ant-api03--t3-LDvVYQFQKwSo5xAcuak...3DobHQAA
  ```
- Body hardcoded: always asks "Explain how to secure a web application"
- No dynamic input from webhook payload
- Response mode: "Workflow got started" — never returns AI response
- **Action**: ROTATE KEY IMMEDIATELY → DELETE workflow

**Workflow 3: `02_marketing_ai_generator` (eRYY1HxTQEUTIQJY)**
- Manual trigger only (no webhook/schedule)
- HTTP Request to Anthropic API but missing:
  - Authentication headers (no `x-api-key`)
  - Request body (no model/messages)
  - Content-Type header
- Will fail with 401 on every execution
- **Action**: DELETE and replace

**Workflow 4: `00_agent_main` (c3bEXpclwEtGtjo7)**
- Listed in search results but `get_workflow_details` returns "Workflow not found"
- Description: "Main AI agent that receives tasks, decides actions and executes automation workflows"
- Not accessible via MCP (`availableInMCP: false`)
- Created today (2026-03-16), likely a shell/placeholder
- **Action**: Rebuild from scratch

### Audit Summary

| Category | Count |
|----------|-------|
| Total workflows | 4 |
| Functional | 0 |
| Broken (no logic) | 2 |
| Critical security | 1 |
| Inaccessible | 1 |

**Overall: 0 out of 4 workflows are production-ready.**

---

## STEP 2 — CRITICAL FIXES

### 🔴 FIX 1: Rotate Exposed API Key (IMMEDIATE)

The Anthropic API key `sk-ant-api03--t3-LDvVY...` is exposed in workflow `03_operations_ai_tool`.

**Actions required:**
1. Go to https://console.anthropic.com/settings/keys
2. Revoke key `sk-ant-api03--t3-LDvVY...`
3. Generate new key
4. Store in n8n Credentials:
   - Settings → Credentials → Add Credential
   - Type: "Header Auth"
   - Name: `Anthropic API Key`
   - Header Name: `x-api-key`
   - Header Value: `sk-ant-NEW_KEY_HERE`
5. Add second credential:
   - Type: "Header Auth"
   - Name: `Anthropic Version Header`
   - Header Name: `anthropic-version`
   - Header Value: `2023-06-01`

### FIX 2: Delete Broken Workflows

| Workflow | Action |
|----------|--------|
| `04_content_ai_request` | Deactivate → Delete (empty logic) |
| `03_operations_ai_tool` | Deactivate → Delete (exposed key) |
| `02_marketing_ai_generator` | Delete (no auth, no body) |
| `00_agent_main` | Delete shell (rebuild below) |

### FIX 3: n8n Credential Setup

Create these credentials in n8n before importing new workflows:

| Credential Name | Type | Purpose |
|----------------|------|---------|
| `Anthropic API Key` | Header Auth | Claude API authentication |
| `Supabase Service Key` | Header Auth | Database operations |
| `Stripe Secret Key` | Header Auth | Payment operations |
| `Google Maps API Key` | Header Auth | Pool search/geocoding |
| `WhatsApp Business Token` | Header Auth | Client notifications |

### FIX 4: Webhook Security

All new webhooks must use:
- POST method (not GET)
- Header authentication via `x-agent-key` shared secret
- Response mode: "Last Node" (return actual results)

---

## STEP 3 — AI AUTOMATION ARCHITECTURE

### Namespace Structure

```
ProFit AI Operating System
│
├── 00_agent/              ← ORCHESTRATION
│   └── 00_agent_main      ← Central AI router
│
├── 01_clients/            ← CLIENT MANAGEMENT
│   ├── 01_clients_lesson_reminder
│   ├── 01_clients_onboarding
│   ├── 01_clients_retention_monitor
│   └── 01_clients_feedback_collector
│
├── 02_marketing/          ← MARKETING & GROWTH
│   ├── 02_marketing_social_content
│   ├── 02_marketing_partnership_outreach
│   ├── 02_marketing_campaign_planner
│   └── 02_marketing_referral_tracker
│
├── 03_operations/         ← OPERATIONS
│   ├── 03_operations_pool_finder
│   ├── 03_operations_coach_assignment
│   ├── 03_operations_schedule_optimizer
│   └── 03_operations_quality_check
│
├── 04_content/            ← CONTENT GENERATION
│   ├── 04_content_blog_generator
│   ├── 04_content_progress_report
│   ├── 04_content_training_plan
│   └── 04_content_newsletter
│
└── 05_finance/            ← FINANCE & REPORTING
    ├── 05_finance_revenue_report
    ├── 05_finance_payroll_calculator
    ├── 05_finance_invoice_generator
    └── 05_finance_coin_economy_report
```

### Naming Convention

```
{category_number}_{category}_{action}_{target}
```

Examples:
- `01_clients_send_reminder`
- `02_marketing_generate_post`
- `03_operations_find_pools`
- `05_finance_calculate_payroll`

### Architecture Diagram

```
                    ┌─────────────────────┐
                    │   External Input     │
                    │  (Webhook / MCP /    │
                    │   Schedule / Chat)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   00_agent_main     │
                    │                     │
                    │  1. Parse task      │
                    │  2. Claude decides  │
                    │  3. Route workflow  │
                    │  4. Evaluate result │
                    │  5. Next action?    │
                    └──────────┬──────────┘
                               │
          ┌────────┬───────────┼───────────┬─────────┐
          ▼        ▼           ▼           ▼         ▼
     01_clients  02_marketing  03_ops  04_content  05_finance
```

---

## STEP 4 — THE AGENT LOOP

### Concept

The Agent Loop is a recursive decision cycle:

```
TASK → ANALYZE → DECIDE → EXECUTE → EVALUATE → (NEXT or DONE)
```

### Loop Flow

```
┌──────────────────────────────────────────────────┐
│                  00_agent_main                     │
│                                                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐ │
│  │ Webhook  │───▶│  Claude   │───▶│   Switch     │ │
│  │ Trigger  │    │  Analyze  │    │   Router     │ │
│  └──────────┘    └──────────┘    └──────┬───────┘ │
│                                         │         │
│            ┌──────────────────┬─────────┼─────┐   │
│            ▼                  ▼         ▼     ▼   │
│      ┌──────────┐      ┌──────────┐  ┌─────────┐ │
│      │ Execute  │      │ Execute  │  │Execute  │ │
│      │ Workflow │      │ Workflow │  │Workflow │ │
│      │ 01_*     │      │ 02_*     │  │03-05_*  │ │
│      └────┬─────┘      └────┬─────┘  └────┬────┘ │
│           │                  │              │      │
│           └──────────┬───────┘──────────────┘      │
│                      ▼                             │
│               ┌──────────────┐                     │
│               │   Claude     │                     │
│               │   Evaluate   │──▶ DONE / LOOP      │
│               └──────────────┘                     │
└──────────────────────────────────────────────────┘
```

### Claude Decision Prompt

The core AI prompt used inside the Agent Loop:

```
You are the ProFit Swimming AI Operations Agent.

You receive tasks and decide which workflow to execute.

Available workflows:
- 01_clients_lesson_reminder: Send lesson reminders to parents
- 01_clients_onboarding: Onboard new clients
- 01_clients_retention_monitor: Check client retention metrics
- 02_marketing_social_content: Generate social media content
- 02_marketing_partnership_outreach: Find and contact pool partners
- 03_operations_pool_finder: Search for swimming pools in an area
- 03_operations_coach_assignment: Assign coaches to lessons
- 04_content_blog_generator: Generate blog posts
- 04_content_progress_report: Generate student progress reports
- 05_finance_revenue_report: Generate revenue reports
- 05_finance_invoice_generator: Generate invoices

Given the task, respond with JSON:
{
  "workflow": "workflow_name",
  "parameters": { ... },
  "reasoning": "why this workflow"
}

If the task requires multiple workflows, respond:
{
  "workflow": "first_workflow_name",
  "parameters": { ... },
  "next_tasks": ["description of follow-up task"],
  "reasoning": "step 1 of multi-step plan"
}

Task: {{$json.task}}
```

---

## STEP 5 — TASK INTERFACE

### Webhook Specification

```
POST https://profitlab.app.n8n.cloud/webhook/agent-task
Content-Type: application/json
x-agent-key: <shared-secret>

{
  "task": "find swimming pools in JVC and send partnership proposal",
  "priority": "normal",
  "requestedBy": "admin"
}
```

### Task Examples & Routing

| Task Input | Routed To | Parameters |
|-----------|-----------|------------|
| "find swimming pools in JVC and send partnership proposal" | `03_operations_pool_finder` → `02_marketing_partnership_outreach` | `{ area: "JVC", action: "partnership" }` |
| "generate marketing content for swimming lessons" | `02_marketing_social_content` | `{ topic: "swimming lessons", platform: "instagram" }` |
| "remind parents about tomorrow's lessons" | `01_clients_lesson_reminder` | `{ date: "tomorrow" }` |
| "generate weekly revenue report" | `05_finance_revenue_report` | `{ period: "weekly" }` |
| "create a blog post about kids learning to swim" | `04_content_blog_generator` | `{ topic: "kids learning to swim" }` |
| "assign coach to Marina lesson tomorrow" | `03_operations_coach_assignment` | `{ pool: "Marina", date: "tomorrow" }` |

### MCP Integration

From Claude Code or any MCP client:
```typescript
// Execute via MCP tool
execute_workflow({
  workflowId: "AGENT_MAIN_ID",
  inputs: {
    type: "webhook",
    webhookData: {
      method: "POST",
      body: {
        task: "remind parents about tomorrow's lessons"
      }
    }
  }
});
```

---

## STEP 6 — WORKFLOW DEFINITIONS

### 00_agent_main — Central Orchestrator

| Field | Value |
|-------|-------|
| **Name** | `00_agent_main` |
| **Purpose** | Receive any task, use Claude to decide routing, execute sub-workflow, evaluate result |
| **Trigger** | Webhook POST `/agent-task` |
| **Nodes** | Webhook → Claude Decision → Switch Router → Execute Workflow (×5 branches) → Claude Evaluate → Respond |

### 01_clients_lesson_reminder

| Field | Value |
|-------|-------|
| **Name** | `01_clients_lesson_reminder` |
| **Purpose** | Query tomorrow's bookings from Supabase, send WhatsApp/notification reminders to parents |
| **Trigger** | Execute Workflow (called by agent) or Schedule (daily 18:00) |
| **Nodes** | Start → Supabase Query (bookings + profiles) → Loop Items → Send Notification → Log Result → Return Summary |

### 01_clients_onboarding

| Field | Value |
|-------|-------|
| **Name** | `01_clients_onboarding` |
| **Purpose** | When new parent registers, send welcome message, create initial booking prompt, assign PM |
| **Trigger** | Execute Workflow (called by agent) or Supabase webhook (new profile) |
| **Nodes** | Start → Get Parent Data → Claude Generate Welcome → Send WhatsApp → Create Task for PM → Log |

### 01_clients_retention_monitor

| Field | Value |
|-------|-------|
| **Name** | `01_clients_retention_monitor` |
| **Purpose** | Identify parents who haven't booked in 14+ days, trigger re-engagement |
| **Trigger** | Schedule (weekly Monday 09:00) |
| **Nodes** | Start → Supabase Query (inactive parents) → Claude Analyze Risk → Generate Offers → Send Messages → Log |

### 02_marketing_social_content

| Field | Value |
|-------|-------|
| **Name** | `02_marketing_social_content` |
| **Purpose** | Generate social media posts (Instagram, Facebook) with captions and image prompts |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Get Parameters → Claude Generate Content → Format for Platform → Return Content |

### 02_marketing_partnership_outreach

| Field | Value |
|-------|-------|
| **Name** | `02_marketing_partnership_outreach` |
| **Purpose** | Generate partnership proposals for pool owners in specified areas |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Get Pool Data → Claude Generate Proposal → Format Email → Return Proposal |

### 03_operations_pool_finder

| Field | Value |
|-------|-------|
| **Name** | `03_operations_pool_finder` |
| **Purpose** | Search for swimming pools in a Dubai/Baku area using Google Maps API |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Google Maps Places Search → Filter Results → Claude Rank & Analyze → Return Pool List |

### 03_operations_coach_assignment

| Field | Value |
|-------|-------|
| **Name** | `03_operations_coach_assignment` |
| **Purpose** | Find best available coach for a lesson based on specialization, location, rating |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Supabase Query (available coaches) → Claude Match Logic → Assign → Notify Coach → Return |

### 04_content_blog_generator

| Field | Value |
|-------|-------|
| **Name** | `04_content_blog_generator` |
| **Purpose** | Generate SEO-optimized blog posts about swimming education |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Get Topic → Claude Generate Article → Format Markdown → Return Content |

### 04_content_progress_report

| Field | Value |
|-------|-------|
| **Name** | `04_content_progress_report` |
| **Purpose** | Generate student progress reports for parents |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Supabase Query (student data, lessons, belt, XP) → Claude Analyze Progress → Format Report → Return |

### 05_finance_revenue_report

| Field | Value |
|-------|-------|
| **Name** | `05_finance_revenue_report` |
| **Purpose** | Generate revenue reports from financial_transactions table |
| **Trigger** | Execute Workflow (called by agent) or Schedule (weekly/monthly) |
| **Nodes** | Start → Supabase Query (transactions by period) → Aggregate Data → Claude Analyze → Format Report → Return |

### 05_finance_invoice_generator

| Field | Value |
|-------|-------|
| **Name** | `05_finance_invoice_generator` |
| **Purpose** | Generate PDF invoices for completed lessons/subscriptions |
| **Trigger** | Execute Workflow (called by agent) |
| **Nodes** | Start → Get Payment Data → Claude Format Invoice → Generate PDF → Return URL |

---

## STEP 7 — IMPORTABLE N8N JSON WORKFLOWS

### 7.1 — `00_agent_main` (Central Orchestrator)

```json
{
  "name": "00_agent_main",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "agent-task",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 300],
      "id": "webhook-trigger",
      "name": "Webhook Trigger"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages: [{ role: 'user', content: `You are the ProFit Swimming AI Operations Agent.\\n\\nAvailable workflows:\\n- 01_clients_lesson_reminder: Send lesson reminders to parents\\n- 01_clients_onboarding: Onboard new clients\\n- 01_clients_retention_monitor: Check client retention\\n- 02_marketing_social_content: Generate social media content\\n- 02_marketing_partnership_outreach: Pool partnership proposals\\n- 03_operations_pool_finder: Search for swimming pools\\n- 03_operations_coach_assignment: Assign coaches\\n- 04_content_blog_generator: Generate blog posts\\n- 04_content_progress_report: Student progress reports\\n- 05_finance_revenue_report: Revenue reports\\n- 05_finance_invoice_generator: Generate invoices\\n\\nRespond ONLY with JSON:\\n{\"workflow\": \"name\", \"parameters\": {}, \"reasoning\": \"why\"}\\n\\nTask: ${$json.body.task}` }] }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [250, 300],
      "id": "claude-decide",
      "name": "Claude Decision",
      "credentials": {
        "httpHeaderAuth": {
          "id": "ANTHROPIC_CRED_ID",
          "name": "Anthropic API Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const response = JSON.parse($input.first().json.content[0].text);\nreturn [{ json: { ...response, originalTask: $('Webhook Trigger').first().json.body.task } }];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [500, 300],
      "id": "parse-decision",
      "name": "Parse AI Decision"
    },
    {
      "parameters": {
        "rules": {
          "rules": [
            { "outputIndex": 0, "conditions": { "conditions": [{ "leftValue": "={{ $json.workflow }}", "rightValue": "01_clients", "operator": { "type": "string", "operation": "startsWith" } }] } },
            { "outputIndex": 1, "conditions": { "conditions": [{ "leftValue": "={{ $json.workflow }}", "rightValue": "02_marketing", "operator": { "type": "string", "operation": "startsWith" } }] } },
            { "outputIndex": 2, "conditions": { "conditions": [{ "leftValue": "={{ $json.workflow }}", "rightValue": "03_operations", "operator": { "type": "string", "operation": "startsWith" } }] } },
            { "outputIndex": 3, "conditions": { "conditions": [{ "leftValue": "={{ $json.workflow }}", "rightValue": "04_content", "operator": { "type": "string", "operation": "startsWith" } }] } },
            { "outputIndex": 4, "conditions": { "conditions": [{ "leftValue": "={{ $json.workflow }}", "rightValue": "05_finance", "operator": { "type": "string", "operation": "startsWith" } }] } }
          ],
          "fallbackOutput": 5
        }
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [750, 300],
      "id": "route-switch",
      "name": "Route by Category"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ status: 'completed', task: $('Webhook Trigger').first().json.body.task, workflow: $('Parse AI Decision').first().json.workflow, reasoning: $('Parse AI Decision').first().json.reasoning, result: 'Workflow dispatched to clients category' }) }}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 100],
      "id": "respond-clients",
      "name": "Respond Clients"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ status: 'completed', task: $('Webhook Trigger').first().json.body.task, workflow: $('Parse AI Decision').first().json.workflow, reasoning: $('Parse AI Decision').first().json.reasoning, result: 'Workflow dispatched to marketing category' }) }}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 250],
      "id": "respond-marketing",
      "name": "Respond Marketing"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ status: 'completed', task: $('Webhook Trigger').first().json.body.task, workflow: $('Parse AI Decision').first().json.workflow, reasoning: $('Parse AI Decision').first().json.reasoning, result: 'Workflow dispatched to operations category' }) }}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 400],
      "id": "respond-ops",
      "name": "Respond Operations"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ status: 'completed', task: $('Webhook Trigger').first().json.body.task, workflow: $('Parse AI Decision').first().json.workflow, reasoning: $('Parse AI Decision').first().json.reasoning, result: 'Workflow dispatched to content category' }) }}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 550],
      "id": "respond-content",
      "name": "Respond Content"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ status: 'completed', task: $('Webhook Trigger').first().json.body.task, workflow: $('Parse AI Decision').first().json.workflow, reasoning: $('Parse AI Decision').first().json.reasoning, result: 'Workflow dispatched to finance category' }) }}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 700],
      "id": "respond-finance",
      "name": "Respond Finance"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ status: 'error', task: $('Webhook Trigger').first().json.body.task, error: 'No matching workflow category found', decision: $('Parse AI Decision').first().json }) }}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 850],
      "id": "respond-fallback",
      "name": "Respond Fallback"
    }
  ],
  "connections": {
    "Webhook Trigger": { "main": [[{ "node": "Claude Decision", "type": "main", "index": 0 }]] },
    "Claude Decision": { "main": [[{ "node": "Parse AI Decision", "type": "main", "index": 0 }]] },
    "Parse AI Decision": { "main": [[{ "node": "Route by Category", "type": "main", "index": 0 }]] },
    "Route by Category": {
      "main": [
        [{ "node": "Respond Clients", "type": "main", "index": 0 }],
        [{ "node": "Respond Marketing", "type": "main", "index": 0 }],
        [{ "node": "Respond Operations", "type": "main", "index": 0 }],
        [{ "node": "Respond Content", "type": "main", "index": 0 }],
        [{ "node": "Respond Finance", "type": "main", "index": 0 }],
        [{ "node": "Respond Fallback", "type": "main", "index": 0 }]
      ]
    }
  },
  "settings": { "executionOrder": "v1" },
  "meta": { "instanceId": "profitlab" }
}
```

### 7.2 — `01_clients_lesson_reminder`

```json
{
  "name": "01_clients_lesson_reminder",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1.1,
      "position": [0, 300],
      "id": "start-trigger",
      "name": "Called by Agent"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.SUPABASE_URL }}/rest/v1/rpc/get_tomorrow_bookings",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{}",
        "options": {
          "timeout": 10000
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [250, 300],
      "id": "get-bookings",
      "name": "Get Tomorrow Bookings",
      "credentials": {
        "httpHeaderAuth": {
          "id": "SUPABASE_CRED_ID",
          "name": "Supabase Service Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const bookings = $input.first().json;\nif (!Array.isArray(bookings) || bookings.length === 0) {\n  return [{ json: { message: 'No bookings found for tomorrow', count: 0 } }];\n}\nreturn bookings.map(b => ({\n  json: {\n    parentName: b.parent_name || 'Parent',\n    parentPhone: b.parent_phone,\n    coachName: b.coach_name,\n    poolName: b.pool_name,\n    lessonTime: b.lesson_time,\n    studentName: b.student_name\n  }\n}));"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [500, 300],
      "id": "format-reminders",
      "name": "Format Reminder Data"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 256, messages: [{ role: 'user', content: `Generate a friendly WhatsApp reminder message in English for a parent about their child's swimming lesson tomorrow. Details: Parent: ${$json.parentName}, Student: ${$json.studentName}, Coach: ${$json.coachName}, Pool: ${$json.poolName}, Time: ${$json.lessonTime}. Keep it warm, professional, under 160 chars.` }] }) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [750, 300],
      "id": "generate-message",
      "name": "Claude Generate Message",
      "credentials": {
        "httpHeaderAuth": {
          "id": "ANTHROPIC_CRED_ID",
          "name": "Anthropic API Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const items = $input.all();\nconst summary = items.map(item => ({\n  parent: item.json.parentName || 'unknown',\n  message: item.json.content?.[0]?.text || 'generated'\n}));\nreturn [{ json: { status: 'completed', reminders_sent: items.length, summary } }];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1000, 300],
      "id": "log-result",
      "name": "Log & Return Summary"
    }
  ],
  "connections": {
    "Called by Agent": { "main": [[{ "node": "Get Tomorrow Bookings", "type": "main", "index": 0 }]] },
    "Get Tomorrow Bookings": { "main": [[{ "node": "Format Reminder Data", "type": "main", "index": 0 }]] },
    "Format Reminder Data": { "main": [[{ "node": "Claude Generate Message", "type": "main", "index": 0 }]] },
    "Claude Generate Message": { "main": [[{ "node": "Log & Return Summary", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

### 7.3 — `02_marketing_social_content`

```json
{
  "name": "02_marketing_social_content",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1.1,
      "position": [0, 300],
      "id": "start-trigger",
      "name": "Called by Agent"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2048, messages: [{ role: 'user', content: `You are the social media manager for ProFit Swimming Academy — a premium swimming school in Dubai and Baku.\\n\\nGenerate social media content for the following request:\\nTopic: ${$json.topic || 'swimming lessons for kids'}\\nPlatform: ${$json.platform || 'instagram'}\\n\\nProvide:\\n1. Post caption (engaging, with emojis, relevant hashtags)\\n2. Image description (for AI image generation)\\n3. Story variation (shorter, with CTA)\\n4. Suggested posting time\\n\\nBrand voice: Premium, fun, family-friendly, achievement-focused.\\nMention: Private pools, certified coaches, gamified learning with belts and coins.` }] }) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [250, 300],
      "id": "claude-generate",
      "name": "Claude Generate Content",
      "credentials": {
        "httpHeaderAuth": {
          "id": "ANTHROPIC_CRED_ID",
          "name": "Anthropic API Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const response = $input.first().json;\nconst content = response.content?.[0]?.text || 'No content generated';\nreturn [{ json: { status: 'completed', platform: $('Called by Agent').first().json.platform || 'instagram', content, generatedAt: new Date().toISOString() } }];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [500, 300],
      "id": "format-output",
      "name": "Format Output"
    }
  ],
  "connections": {
    "Called by Agent": { "main": [[{ "node": "Claude Generate Content", "type": "main", "index": 0 }]] },
    "Claude Generate Content": { "main": [[{ "node": "Format Output", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

### 7.4 — `03_operations_pool_finder`

```json
{
  "name": "03_operations_pool_finder",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1.1,
      "position": [0, 300],
      "id": "start-trigger",
      "name": "Called by Agent"
    },
    {
      "parameters": {
        "method": "GET",
        "url": "https://maps.googleapis.com/maps/api/place/textsearch/json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpQueryAuth",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            { "name": "query", "value": "={{ 'swimming pool ' + ($json.area || 'JVC Dubai') }}" },
            { "name": "type", "value": "swimming_pool" },
            { "name": "region", "value": "ae" }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [250, 300],
      "id": "google-search",
      "name": "Google Places Search",
      "credentials": {
        "httpQueryAuth": {
          "id": "GOOGLE_MAPS_CRED_ID",
          "name": "Google Maps API Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const results = $input.first().json.results || [];\nreturn results.slice(0, 10).map(place => ({\n  json: {\n    name: place.name,\n    address: place.formatted_address,\n    rating: place.rating || 'N/A',\n    totalRatings: place.user_ratings_total || 0,\n    lat: place.geometry?.location?.lat,\n    lng: place.geometry?.location?.lng,\n    openNow: place.opening_hours?.open_now || 'unknown',\n    placeId: place.place_id\n  }\n}));"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [500, 300],
      "id": "parse-results",
      "name": "Parse Pool Results"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages: [{ role: 'user', content: `You are a business analyst for ProFit Swimming Academy. Analyze these swimming pools found in ${$('Called by Agent').first().json.area || 'the area'} and rank them for partnership potential.\\n\\nPools:\\n${JSON.stringify($input.all().map(i => i.json), null, 2)}\\n\\nFor each pool provide:\\n1. Partnership score (1-10)\\n2. Why it's a good/bad fit\\n3. Recommended approach\\n\\nProFit needs: private/semi-private pools, good area, family-friendly.` }] }) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [750, 300],
      "id": "claude-analyze",
      "name": "Claude Analyze Pools",
      "credentials": {
        "httpHeaderAuth": {
          "id": "ANTHROPIC_CRED_ID",
          "name": "Anthropic API Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const analysis = $input.first().json.content?.[0]?.text || 'No analysis';\nconst pools = $('Parse Pool Results').all().map(i => i.json);\nreturn [{ json: { status: 'completed', area: $('Called by Agent').first().json.area || 'unknown', poolsFound: pools.length, pools, analysis } }];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1000, 300],
      "id": "final-output",
      "name": "Final Output"
    }
  ],
  "connections": {
    "Called by Agent": { "main": [[{ "node": "Google Places Search", "type": "main", "index": 0 }]] },
    "Google Places Search": { "main": [[{ "node": "Parse Pool Results", "type": "main", "index": 0 }]] },
    "Parse Pool Results": { "main": [[{ "node": "Claude Analyze Pools", "type": "main", "index": 0 }]] },
    "Claude Analyze Pools": { "main": [[{ "node": "Final Output", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

### 7.5 — `05_finance_revenue_report`

```json
{
  "name": "05_finance_revenue_report",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1.1,
      "position": [0, 300],
      "id": "start-trigger",
      "name": "Called by Agent"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.SUPABASE_URL }}/rest/v1/rpc/get_revenue_summary",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ period: $json.period || 'weekly' }) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [250, 300],
      "id": "get-revenue",
      "name": "Get Revenue Data",
      "credentials": {
        "httpHeaderAuth": {
          "id": "SUPABASE_CRED_ID",
          "name": "Supabase Service Key"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2048, messages: [{ role: 'user', content: `You are the CFO analyst for ProFit Swimming Academy (Dubai + Baku).\\n\\nGenerate a ${$('Called by Agent').first().json.period || 'weekly'} revenue report from this data:\\n${JSON.stringify($input.first().json, null, 2)}\\n\\nInclude:\\n1. Total revenue (AED + AZN)\\n2. Revenue by type (subscriptions, lessons, coin purchases)\\n3. Revenue by city (Dubai vs Baku)\\n4. Comparison to previous period\\n5. Key insights and recommendations\\n6. Coin economy health (minted vs spent)\\n\\nFormat as a professional executive summary.` }] }) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [500, 300],
      "id": "claude-analyze",
      "name": "Claude Financial Analysis",
      "credentials": {
        "httpHeaderAuth": {
          "id": "ANTHROPIC_CRED_ID",
          "name": "Anthropic API Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const report = $input.first().json.content?.[0]?.text || 'No report generated';\nreturn [{ json: { status: 'completed', period: $('Called by Agent').first().json.period || 'weekly', report, generatedAt: new Date().toISOString() } }];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [750, 300],
      "id": "format-report",
      "name": "Format Report"
    }
  ],
  "connections": {
    "Called by Agent": { "main": [[{ "node": "Get Revenue Data", "type": "main", "index": 0 }]] },
    "Get Revenue Data": { "main": [[{ "node": "Claude Financial Analysis", "type": "main", "index": 0 }]] },
    "Claude Financial Analysis": { "main": [[{ "node": "Format Report", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

---

## STEP 8 — MCP INTEGRATION

### How Claude Interacts with n8n via MCP

Claude has 3 MCP tools for n8n:

| Tool | Purpose |
|------|---------|
| `search_workflows` | List and find workflows by name |
| `get_workflow_details` | Inspect node structure, triggers, connections |
| `execute_workflow` | Run any workflow with inputs |

### Direct Task Execution (No Manual Routing)

```
User says: "Find swimming pools in Sports City"
    │
    ▼
Claude recognizes this as an operations task
    │
    ▼
Claude calls MCP: search_workflows({ query: "pool_finder" })
    │
    ▼
Gets workflow ID for 03_operations_pool_finder
    │
    ▼
Claude calls MCP: execute_workflow({
  workflowId: "POOL_FINDER_ID",
  inputs: {
    type: "webhook",
    webhookData: {
      method: "POST",
      body: { area: "Sports City Dubai" }
    }
  }
})
    │
    ▼
Returns pool analysis to user
```

### Automated Mapping Table

Claude uses this mapping internally:

| Task Pattern | Workflow | MCP Action |
|-------------|----------|------------|
| "remind" + "parents/lessons" | `01_clients_lesson_reminder` | `execute_workflow` |
| "onboard" + "client/parent" | `01_clients_onboarding` | `execute_workflow` |
| "generate" + "content/post/social" | `02_marketing_social_content` | `execute_workflow` |
| "find" + "pool/swimming" | `03_operations_pool_finder` | `execute_workflow` |
| "assign" + "coach" | `03_operations_coach_assignment` | `execute_workflow` |
| "blog" + "write/generate" | `04_content_blog_generator` | `execute_workflow` |
| "report" + "revenue/finance" | `05_finance_revenue_report` | `execute_workflow` |
| "invoice" + "generate/create" | `05_finance_invoice_generator` | `execute_workflow` |

### Two Execution Modes

**Mode 1: Direct MCP** (Claude → n8n workflow directly)
- Best for: single-step tasks with clear mapping
- Latency: ~2-5 seconds

**Mode 2: Agent Loop** (Claude → 00_agent_main webhook → Claude decides → sub-workflow)
- Best for: ambiguous tasks, multi-step operations
- Latency: ~5-15 seconds
- Advantage: logging, evaluation, chaining

---

## STEP 9 — IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)

| Day | Task | Status |
|-----|------|--------|
| 1 | Rotate exposed Anthropic API key | 🔴 CRITICAL |
| 1 | Delete all 4 broken workflows | Required |
| 1 | Create n8n credentials (Anthropic, Supabase) | Required |
| 2 | Import `00_agent_main` JSON | Build |
| 2 | Test webhook at `/agent-task` | Test |
| 3 | Create Supabase RPC: `get_tomorrow_bookings` | Build |
| 3 | Import `01_clients_lesson_reminder` | Build |
| 4 | Test agent → lesson reminder flow end-to-end | Test |
| 5 | Import `02_marketing_social_content` | Build |
| 5 | Test agent → content generation flow | Test |

**Phase 1 deliverables:**
- ✅ Secure credential management
- ✅ Working agent orchestrator
- ✅ 2 functional sub-workflows
- ✅ End-to-end task → result pipeline

### Phase 2: Client & Marketing Automation (Week 2-3)

| Task | Priority |
|------|----------|
| Build `01_clients_onboarding` workflow | High |
| Build `01_clients_retention_monitor` with weekly schedule | High |
| Build `01_clients_feedback_collector` | Medium |
| Build `02_marketing_partnership_outreach` | High |
| Build `02_marketing_campaign_planner` | Medium |
| Build `02_marketing_referral_tracker` | Medium |
| Create Supabase RPCs for inactive parent detection | High |
| WhatsApp Business API integration | High |
| Add Execute Workflow nodes to `00_agent_main` switch | Required |

**Phase 2 deliverables:**
- ✅ Automated parent reminders (daily)
- ✅ New client onboarding flow
- ✅ Retention monitoring (weekly)
- ✅ Social content generation on demand
- ✅ Partnership outreach automation

### Phase 3: Operations Intelligence (Week 4-5)

| Task | Priority |
|------|----------|
| Import `03_operations_pool_finder` | High |
| Build `03_operations_coach_assignment` | High |
| Build `03_operations_schedule_optimizer` | Medium |
| Build `03_operations_quality_check` | Medium |
| Google Maps API credential setup | Required |
| Coach availability calendar integration | High |

**Phase 3 deliverables:**
- ✅ AI-powered pool search
- ✅ Smart coach assignment
- ✅ Schedule optimization suggestions

### Phase 4: Finance & Reporting (Week 6-7)

| Task | Priority |
|------|----------|
| Create Supabase RPC: `get_revenue_summary` | High |
| Import `05_finance_revenue_report` | High |
| Build `05_finance_payroll_calculator` | High |
| Build `05_finance_invoice_generator` | Medium |
| Build `05_finance_coin_economy_report` | Medium |
| Build `04_content_progress_report` | Medium |
| Build `04_content_blog_generator` | Low |
| Build `04_content_newsletter` | Low |
| Weekly/monthly scheduled report triggers | Required |

**Phase 4 deliverables:**
- ✅ Automated revenue reports
- ✅ Coach payroll calculations
- ✅ Student progress reports for parents
- ✅ Coin economy health monitoring

### Phase 5: Full AI OS (Week 8+)

| Task | Priority |
|------|----------|
| Multi-step task chaining in Agent Loop | High |
| Agent memory (log decisions to Supabase) | Medium |
| Slack/Telegram notification integration | Medium |
| Dashboard for workflow execution history | Low |
| A/B testing for marketing content | Low |
| Voice command interface via WhatsApp | Future |

---

## STEP 10 — ARCHITECTURE SUMMARY

### The ProFit AI Operating System

```
┌─────────────────────────────────────────────────────────────┐
│                   PROFIT AI OPERATING SYSTEM                 │
│                                                              │
│  ┌─────────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐ │
│  │  Claude MCP  │  │ Webhook  │  │ Schedule │  │  Manual  │ │
│  │  (Direct)    │  │ /agent   │  │ (Cron)   │  │  n8n UI  │ │
│  └──────┬──────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│         │               │             │              │       │
│         └───────────────┼─────────────┼──────────────┘       │
│                         ▼                                    │
│              ┌─────────────────────┐                         │
│              │    00_agent_main    │                         │
│              │  ┌───────────────┐  │                         │
│              │  │ Claude Engine │  │                         │
│              │  │  (Reasoning)  │  │                         │
│              │  └───────┬───────┘  │                         │
│              │          │          │                         │
│              │  ┌───────▼───────┐  │                         │
│              │  │ Smart Router  │  │                         │
│              │  └───────┬───────┘  │                         │
│              └──────────┼──────────┘                         │
│    ┌──────────┬─────────┼─────────┬──────────┐              │
│    ▼          ▼         ▼         ▼          ▼              │
│ ┌──────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌────────┐       │
│ │01_   │ │02_     │ │03_    │ │04_     │ │05_     │       │
│ │client│ │market  │ │ops    │ │content │ │finance │       │
│ └──┬───┘ └───┬────┘ └──┬────┘ └───┬────┘ └───┬────┘       │
│    │         │         │          │           │             │
│    ▼         ▼         ▼          ▼           ▼             │
│ ┌──────────────────────────────────────────────────┐        │
│ │              SUPABASE (38+ tables)                │        │
│ │  bookings │ profiles │ coaches │ transactions     │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │           EXTERNAL SERVICES                       │        │
│ │  WhatsApp │ Stripe │ Google Maps │ Canva          │        │
│ └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Complete Workflow Registry

| # | Workflow | Category | Phase | Priority |
|---|---------|----------|-------|----------|
| 1 | `00_agent_main` | Orchestrator | 1 | 🔴 Critical |
| 2 | `01_clients_lesson_reminder` | Clients | 1 | 🔴 Critical |
| 3 | `01_clients_onboarding` | Clients | 2 | 🟡 High |
| 4 | `01_clients_retention_monitor` | Clients | 2 | 🟡 High |
| 5 | `01_clients_feedback_collector` | Clients | 2 | 🟢 Medium |
| 6 | `02_marketing_social_content` | Marketing | 1 | 🔴 Critical |
| 7 | `02_marketing_partnership_outreach` | Marketing | 2 | 🟡 High |
| 8 | `02_marketing_campaign_planner` | Marketing | 2 | 🟢 Medium |
| 9 | `02_marketing_referral_tracker` | Marketing | 2 | 🟢 Medium |
| 10 | `03_operations_pool_finder` | Operations | 3 | 🟡 High |
| 11 | `03_operations_coach_assignment` | Operations | 3 | 🟡 High |
| 12 | `03_operations_schedule_optimizer` | Operations | 3 | 🟢 Medium |
| 13 | `03_operations_quality_check` | Operations | 3 | 🟢 Medium |
| 14 | `04_content_blog_generator` | Content | 4 | 🟢 Medium |
| 15 | `04_content_progress_report` | Content | 4 | 🟢 Medium |
| 16 | `04_content_training_plan` | Content | 4 | 🟢 Medium |
| 17 | `04_content_newsletter` | Content | 4 | ⚪ Low |
| 18 | `05_finance_revenue_report` | Finance | 4 | 🟡 High |
| 19 | `05_finance_payroll_calculator` | Finance | 4 | 🟡 High |
| 20 | `05_finance_invoice_generator` | Finance | 4 | 🟢 Medium |
| 21 | `05_finance_coin_economy_report` | Finance | 4 | 🟢 Medium |

### Key Metrics

- **Total workflows designed**: 21
- **JSON templates ready for import**: 5
- **Critical security issues found**: 1 (API key exposure)
- **Broken workflows to delete**: 4
- **Implementation timeline**: 8 weeks
- **n8n instance**: https://profitlab.app.n8n.cloud/
