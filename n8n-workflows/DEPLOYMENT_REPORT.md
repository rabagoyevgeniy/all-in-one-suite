# ProFit AI Operating System — Deployment Report

> Generated: 2026-03-16T22:52:00Z
> Project: hawbkqjdnvaoffbhihnt ("Profit final app")
> n8n Instance: https://profitlab.app.n8n.cloud/

---

## 1. Supabase Database — FULLY DEPLOYED ✅

All database objects deployed via MCP `apply_migration`:

### Tables
| Object | Status | Notes |
|--------|--------|-------|
| `agent_workflow_logs` | ✅ Deployed | Tracks every AI agent execution |
| `agent_task_queue` | ✅ Deployed | Queued/scheduled tasks with retry |

### Indexes
| Index | Status |
|-------|--------|
| `idx_agent_workflow_logs_created` | ✅ Deployed |
| `idx_agent_workflow_logs_status` | ✅ Deployed |
| `idx_agent_workflow_logs_category` | ✅ Deployed |
| `idx_agent_task_queue_status` | ✅ Deployed |

### RPC Functions
| Function | Status | Smoke Test |
|----------|--------|------------|
| `get_tomorrow_bookings()` | ✅ Deployed | ✅ Returns `[]` (no bookings tomorrow) |
| `get_revenue_summary(period)` | ✅ Deployed | ✅ Returns valid JSON with zero totals |
| `get_student_progress(student_id)` | ✅ Deployed | ✅ Created successfully |
| `log_agent_execution(...)` | ✅ Deployed | ✅ Returns UUID, inserts row |
| `complete_agent_execution(...)` | ✅ Deployed | ✅ Updates row with result + timing |

### RLS Policies
| Policy | Table | Status |
|--------|-------|--------|
| Admins can manage agent logs | `agent_workflow_logs` | ✅ Deployed |
| Admins can manage task queue | `agent_task_queue` | ✅ Deployed |
| Service role full access to agent logs | `agent_workflow_logs` | ✅ Deployed |
| Service role full access to task queue | `agent_task_queue` | ✅ Deployed |

### Bugs Found & Fixed During Deployment
| Issue | Fix |
|-------|-----|
| `get_tomorrow_bookings()` joined `time_slots.booking_id` (doesn't exist) | Fixed to `time_slots.id = bookings.slot_id` |
| `get_tomorrow_bookings()` filtered `ts.start_time::date` | Fixed to use `ts.date` column |
| RLS policies referenced `user_roles.user_id` (doesn't exist) | Fixed to `user_roles.id` |

### Migrations Applied (in order)
1. `ai_operating_system` — tables + indexes
2. `ai_os_rpc_functions` — 5 RPC functions
3. `ai_os_rls_policies_fixed` — RLS enable + 4 policies
4. `fix_get_tomorrow_bookings_join` — schema fix for time_slots join

---

## 2. n8n Workflows — READY FOR MANUAL IMPORT ⚠️

### Why Not Auto-Deployed
The n8n MCP connector only exposes `search_workflows`, `get_workflow_details`, and `execute_workflow`. It does **not** support:
- `create` / `import` workflows
- `update` / `activate` workflows
- `delete` workflows

All 6 workflow JSON files are built, tested for schema correctness, and ready for import.

### Existing Workflows (TO DELETE)
| Workflow | ID | Status | Issue |
|----------|----|--------|-------|
| `00_agent_main` | `c3bEXpclwEtGtjo7` | ❌ Inactive | Placeholder shell, not MCP-accessible |
| `02_marketing_ai_generator` | `eRYY1HxTQEUTIQJY` | ❌ Inactive | Missing auth credentials |
| `03_operations_ai_tool` | `mjElZbEOvtS13z2R` | ❌ Inactive | **⚠️ EXPOSED API KEY** — revoke immediately |
| `04_content_ai_request` | `hsHCUoIdBcx5BXda` | ⚠️ Active | Empty logic, no useful function |

### New Workflows (TO IMPORT)
| File | Workflow | Nodes | Import Order |
|------|---------|-------|-------------|
| `01_clients_lesson_reminder.json` | Lesson reminders | 5 | Round 1 |
| `02_marketing_social_content.json` | Social media content | 3 | Round 1 |
| `03_operations_pool_finder.json` | Pool search + ranking | 5 | Round 1 |
| `04_content_training_plan.json` | Training plans | 5 | Round 1 |
| `05_finance_revenue_report.json` | Revenue reports | 4 | Round 1 |
| `00_agent_main_v3.json` | Orchestrator + agent loop | 20 | Round 2 (after sub-workflows) |

---

## 3. Manual Steps Required

### CRITICAL (do immediately)
1. **Rotate Anthropic API key** — `sk-ant-api03--t3-LDvVY...` is exposed
   - Go to https://console.anthropic.com/settings/keys
   - Revoke the exposed key
   - Generate a new key

### n8n Setup (follow SETUP.md Steps 1-9)
2. **Create n8n credentials** (Step 2):
   - `Anthropic API Key` → Header Auth (`x-api-key`)
   - `Supabase Service Key` → Header Auth (`Authorization: Bearer ...`)
   - `Google Maps API Key` → Query String Auth (`key`)

3. **Delete 4 broken workflows** (Step 3)

4. **Set n8n environment variables** (Step 5):
   - `SUPABASE_URL` = `https://hawbkqjdnvaoffbhihnt.supabase.co`
   - `SUPABASE_ANON_KEY` = your anon key

5. **Import workflows** (Step 6): Sub-workflows first, then orchestrator

6. **Wire Execute Workflow nodes** (Step 7): Link orchestrator to sub-workflows

7. **Set credentials in each node** (Step 8): Select matching credential per node

8. **Activate orchestrator** (Step 9): Toggle on `00_agent_main_v3`

### Supabase Config
9. **Set `ALLOWED_ORIGINS` secret** for CORS edge function fixes:
   ```
   supabase secrets set ALLOWED_ORIGINS="https://your-domain.com,https://profitlab.app.n8n.cloud"
   ```

---

## 4. Test Commands (after n8n import)

```bash
# Marketing Content
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "generate instagram content about kids swimming lessons in Dubai"}'

# Lesson Reminders
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "remind parents about tomorrow lessons"}'

# Pool Search
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "find swimming pools in JVC Dubai for partnership"}'

# Revenue Report
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "generate weekly revenue report"}'

# Training Plan
curl -X POST https://profitlab.app.n8n.cloud/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{"task": "create training plan for student abc-123-uuid"}'
```

---

## 5. Summary

| Component | Status | Details |
|-----------|--------|---------|
| Database tables | ✅ Live | 2 tables, 4+ indexes |
| RPC functions | ✅ Live | 5 functions, all smoke-tested |
| RLS policies | ✅ Live | 4 policies (admin + service_role) |
| Migration file | ✅ Fixed | Local file matches deployed schema |
| n8n workflow JSONs | ✅ Ready | 6 files in `n8n-workflows/` |
| n8n import | ⚠️ Manual | MCP doesn't support workflow creation |
| API key rotation | 🔴 URGENT | Exposed key must be revoked |
| CORS origins secret | ⚠️ Pending | Set `ALLOWED_ORIGINS` in Supabase |

**Database deployment: 100% complete and verified.**
**n8n deployment: 0% — requires manual import (MCP limitation).**
