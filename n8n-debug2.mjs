import https from 'https';
import { readFileSync } from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YzFlYTNiOC1hYjdiLTRhYzgtYWQwZC1mMDMyZWVkZmZiNzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNWI1YTZjYjQtNjJmNi00MzIwLTljNzMtY2I4YWE5ZGNlMzNlIiwiaWF0IjoxNzc0MTMwNTkyLCJleHAiOjE3ODE4OTkyMDB9.cfEydwlhOYv3KWV-hXUk07roz4IAVblsEgD_UZuRcWw';
const WF_ID = '229WT1YDBRqqFPl3';
const HOST = 'profitlab.app.n8n.cloud';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST, path, method,
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function webhookPost(body) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST, path: '/webhook/agent-task', method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    r.setTimeout(90000);
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
    r.write(JSON.stringify(body));
    r.end();
  });
}

async function deploy(wf) {
  await req('POST', `/api/v1/workflows/${WF_ID}/deactivate`);
  const up = await req('PUT', `/api/v1/workflows/${WF_ID}`, wf);
  await req('POST', `/api/v1/workflows/${WF_ID}/activate`);
  return up.status;
}

// Shared nodes
const webhook = {
  parameters: { httpMethod: 'POST', path: 'agent-task', responseMode: 'responseNode' },
  type: 'n8n-nodes-base.webhook', typeVersion: 1.1,
  position: [0, 400], id: 'n-webhook', name: 'POST /agent-task',
  webhookId: 'agent-task-v3'
};
const normalize = {
  parameters: {
    jsCode: "const body = $input.first().json.body || $input.first().json;\nconst task = body.task || body.message || 'No task provided';\nconst priority = body.priority || 'normal';\nconst requestedBy = body.requestedBy || 'mcp';\nconst retryCount = body._retryCount || 0;\nconst parentLogId = body._parentLogId || null;\nreturn [{ json: { task, priority, requestedBy, retryCount, parentLogId, startTime: Date.now() } }];"
  },
  type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [220, 400], id: 'n-normalize', name: 'Normalize Input'
};
const prepare = {
  parameters: {
    jsCode: "const prev = $input.first().json;\nreturn [{ json: { ...prev, logId: null, startTime: Date.now() } }];"
  },
  type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [440, 400], id: 'n-log-start', name: 'Prepare Task'
};
const claude = {
  parameters: {
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'x-api-key', value: '={{ $vars.ANTHROPIC_API_KEY }}' },
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'content-type', value: 'application/json' }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 256, system: 'You are a strict intent classifier. Respond with ONLY a raw JSON object. category must be one of: clients, marketing, operations, content, finance. Example: {\"category\":\"finance\",\"confidence\":99,\"reason\":\"financial reporting\"}', messages: [{ role: 'user', content: 'Classify: ' + $json.task }] }) }}"
  },
  type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
  position: [880, 400], id: 'n-claude', name: 'Claude → Decide Workflow'
};

async function main() {
  // ======== TEST A: Claude + Parse Decision ========
  console.log('=== TEST A: Claude + Parse Decision ===');
  const parseCode = `const prev = $('Prepare Task').first().json;
const VALID = ['clients', 'marketing', 'operations', 'content', 'finance'];
try {
  const raw = $input.first().json.content[0].text;
  let cleaned = raw.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, '').trim();
  const i = cleaned.indexOf('{');
  const j = cleaned.lastIndexOf('}');
  if (i >= 0 && j > i) cleaned = cleaned.substring(i, j + 1);
  const d = JSON.parse(cleaned);
  let cat = (d.category || '').toLowerCase().trim();
  if (!VALID.includes(cat)) cat = 'clients';
  return [{ json: { ...prev, category: cat, confidence: d.confidence || 80, reason: d.reason || 'ai', workflow: cat, parameters: {}, next_tasks: [], _parseOk: true } }];
} catch(e) {
  return [{ json: { ...prev, category: 'clients', confidence: 40, reason: 'PARSE_ERROR: ' + e.message, workflow: 'clients', parameters: {}, next_tasks: [], _parseOk: false } }];
}`;

  const testA = {
    name: '00_agent_main_v3',
    nodes: [
      webhook, normalize, prepare, claude,
      {
        parameters: { jsCode: parseCode },
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1100, 400], id: 'n-parse', name: 'Parse Decision'
      },
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "parse", data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1320, 400], id: 'n-respond', name: 'Respond'
      }
    ],
    connections: {
      'POST /agent-task': { main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]] },
      'Normalize Input': { main: [[{ node: 'Prepare Task', type: 'main', index: 0 }]] },
      'Prepare Task': { main: [[{ node: 'Claude → Decide Workflow', type: 'main', index: 0 }]] },
      'Claude → Decide Workflow': { main: [[{ node: 'Parse Decision', type: 'main', index: 0 }]] },
      'Parse Decision': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  let s = await deploy(testA);
  console.log('Deploy:', s);
  let t = await webhookPost({ task: 'Generate weekly revenue report' });
  console.log('HTTP:', t.status, 'Len:', t.data.length);
  console.log('Response:', t.data.substring(0, 500));
  if (t.data.length === 0) { console.log('\nFAIL at Parse Decision'); return; }
  console.log('OK!\n');

  // ======== TEST B: + Route (Switch) ========
  console.log('=== TEST B: + Route Switch ===');
  const testB = {
    name: '00_agent_main_v3',
    nodes: [
      webhook, normalize, prepare, claude,
      testA.nodes[4], // Parse Decision
      {
        parameters: {
          dataType: 'string', value1: '={{ $json.category }}',
          rules: { rules: [
            { value2: 'clients' }, { value2: 'marketing' },
            { value2: 'operations' }, { value2: 'content' }, { value2: 'finance' }
          ]},
          fallbackOutput: 'extra'
        },
        type: 'n8n-nodes-base.switch', typeVersion: 2,
        position: [1320, 400], id: 'n-switch', name: 'Route → Category'
      },
      // One respond node for each output
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "route", routed: $json.category, data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1560, 100], id: 'n-r1', name: 'R Clients'
      },
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "route", routed: "marketing", data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1560, 250], id: 'n-r2', name: 'R Marketing'
      },
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "route", routed: "operations", data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1560, 400], id: 'n-r3', name: 'R Operations'
      },
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "route", routed: "content", data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1560, 550], id: 'n-r4', name: 'R Content'
      },
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "route", routed: "finance", data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1560, 700], id: 'n-r5', name: 'R Finance'
      },
      {
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ test: "route", routed: "fallback", data: $json }) }}' },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [1560, 900], id: 'n-r6', name: 'R Fallback'
      }
    ],
    connections: {
      'POST /agent-task': { main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]] },
      'Normalize Input': { main: [[{ node: 'Prepare Task', type: 'main', index: 0 }]] },
      'Prepare Task': { main: [[{ node: 'Claude → Decide Workflow', type: 'main', index: 0 }]] },
      'Claude → Decide Workflow': { main: [[{ node: 'Parse Decision', type: 'main', index: 0 }]] },
      'Parse Decision': { main: [[{ node: 'Route → Category', type: 'main', index: 0 }]] },
      'Route → Category': { main: [
        [{ node: 'R Clients', type: 'main', index: 0 }],
        [{ node: 'R Marketing', type: 'main', index: 0 }],
        [{ node: 'R Operations', type: 'main', index: 0 }],
        [{ node: 'R Content', type: 'main', index: 0 }],
        [{ node: 'R Finance', type: 'main', index: 0 }],
        [{ node: 'R Fallback', type: 'main', index: 0 }]
      ]}
    },
    settings: { executionOrder: 'v1' }
  };

  s = await deploy(testB);
  console.log('Deploy:', s);
  t = await webhookPost({ task: 'Generate weekly revenue report' });
  console.log('HTTP:', t.status, 'Len:', t.data.length);
  console.log('Response:', t.data.substring(0, 500));
  if (t.data.length === 0) { console.log('\nFAIL at Route Switch'); return; }
  console.log('OK!\n');

  // ======== TEST C: + Mock Execute (no real sub-workflow) ========
  console.log('=== TEST C: Mock Execute + Evaluate + Loop + Respond ===');
  // Use the full workflow JSON but replace Execute Workflow nodes with mock Code nodes
  const fullJson = JSON.parse(readFileSync('n8n-workflows/00_agent_main_v3.json', 'utf8'));

  // Find and replace Execute Workflow nodes with mock Code nodes
  const mockNodes = fullJson.nodes.map(n => {
    if (n.type === 'n8n-nodes-base.executeWorkflow') {
      return {
        parameters: {
          jsCode: `// Mock: ${n.name}\nreturn [{ json: { mockResult: true, workflow: '${n.name}', message: 'Mock execution successful' } }];`
        },
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: n.position,
        id: n.id,
        name: n.name
      };
    }
    return n;
  });

  const testC = {
    name: '00_agent_main_v3',
    nodes: mockNodes,
    connections: fullJson.connections,
    settings: { executionOrder: 'v1' }
  };

  s = await deploy(testC);
  console.log('Deploy:', s);
  t = await webhookPost({ task: 'Generate weekly revenue report' });
  console.log('HTTP:', t.status, 'Len:', t.data.length);
  console.log('Response:', t.data.substring(0, 1000));
  if (t.data.length === 0) {
    console.log('\nFAIL: Evaluate/Loop/Respond chain crashes with mock data.');
  } else {
    console.log('\nOK: Full chain works with mocks!');
    console.log('Problem is in sub-workflow execution. Sub-workflows crash.');

    // Restore full workflow
    console.log('\n=== Restoring full workflow ===');
    await deploy({
      name: fullJson.name, nodes: fullJson.nodes,
      connections: fullJson.connections, settings: { executionOrder: 'v1' }
    });
    console.log('Full workflow restored and activated.');
  }
}

main().catch(e => console.error('Fatal:', e));
