import https from 'https';

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

async function main() {
  // ======== STEP 1: Deploy minimal workflow (webhook → respond) ========
  console.log('=== STEP 1: Minimal webhook test ===');
  const minimalWorkflow = {
    name: '00_agent_main_v3',
    nodes: [
      {
        parameters: { httpMethod: 'POST', path: 'agent-task', responseMode: 'responseNode' },
        type: 'n8n-nodes-base.webhook', typeVersion: 1.1,
        position: [0, 400], id: 'n-webhook', name: 'POST /agent-task',
        webhookId: 'agent-task-v3'
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify({ ok: true, received: $json }) }}'
        },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [300, 400], id: 'n-respond', name: 'Respond'
      }
    ],
    connections: {
      'POST /agent-task': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  await req('POST', `/api/v1/workflows/${WF_ID}/deactivate`);
  let up = await req('PUT', `/api/v1/workflows/${WF_ID}`, minimalWorkflow);
  console.log('Deploy minimal:', up.status);
  await req('POST', `/api/v1/workflows/${WF_ID}/activate`);

  let test = await webhookPost({ task: 'test' });
  console.log('Minimal test - HTTP:', test.status, 'Body:', test.data.substring(0, 200));

  if (test.data.length === 0) {
    console.log('FAIL: Even minimal webhook returns empty. Check n8n webhook config.');
    return;
  }
  console.log('OK: Webhook works!\n');

  // ======== STEP 2: Add Normalize + Prepare + respond ========
  console.log('=== STEP 2: Normalize + Prepare Task ===');
  const step2 = {
    name: '00_agent_main_v3',
    nodes: [
      {
        parameters: { httpMethod: 'POST', path: 'agent-task', responseMode: 'responseNode' },
        type: 'n8n-nodes-base.webhook', typeVersion: 1.1,
        position: [0, 400], id: 'n-webhook', name: 'POST /agent-task',
        webhookId: 'agent-task-v3'
      },
      {
        parameters: {
          jsCode: "const body = $input.first().json.body || $input.first().json;\nconst task = body.task || body.message || 'No task provided';\nreturn [{ json: { task, startTime: Date.now() } }];"
        },
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [220, 400], id: 'n-normalize', name: 'Normalize Input'
      },
      {
        parameters: {
          jsCode: "const prev = $input.first().json;\nreturn [{ json: { ...prev, logId: null } }];"
        },
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [440, 400], id: 'n-prepare', name: 'Prepare Task'
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify({ step: "prepare", data: $json }) }}'
        },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [660, 400], id: 'n-respond', name: 'Respond'
      }
    ],
    connections: {
      'POST /agent-task': { main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]] },
      'Normalize Input': { main: [[{ node: 'Prepare Task', type: 'main', index: 0 }]] },
      'Prepare Task': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  await req('POST', `/api/v1/workflows/${WF_ID}/deactivate`);
  up = await req('PUT', `/api/v1/workflows/${WF_ID}`, step2);
  console.log('Deploy step2:', up.status);
  await req('POST', `/api/v1/workflows/${WF_ID}/activate`);

  test = await webhookPost({ task: 'Generate weekly revenue report' });
  console.log('Step2 test - HTTP:', test.status, 'Body:', test.data.substring(0, 300));

  if (test.data.length === 0) {
    console.log('FAIL: Normalize/Prepare nodes crash.');
    return;
  }
  console.log('OK: Code nodes work!\n');

  // ======== STEP 3: Add Claude API call ========
  console.log('=== STEP 3: Claude API call ===');
  const step3 = {
    name: '00_agent_main_v3',
    nodes: [
      ...step2.nodes.slice(0, 3),  // webhook, normalize, prepare
      {
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
          jsonBody: "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 50, messages: [{ role: 'user', content: 'Reply with just: {\"category\":\"finance\",\"confidence\":99,\"reason\":\"test\"}' }] }) }}"
        },
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [660, 400], id: 'n-claude', name: 'Claude Test'
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify({ step: "claude", status: "ok", response: $json }) }}'
        },
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [880, 400], id: 'n-respond', name: 'Respond'
      }
    ],
    connections: {
      'POST /agent-task': { main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]] },
      'Normalize Input': { main: [[{ node: 'Prepare Task', type: 'main', index: 0 }]] },
      'Prepare Task': { main: [[{ node: 'Claude Test', type: 'main', index: 0 }]] },
      'Claude Test': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  await req('POST', `/api/v1/workflows/${WF_ID}/deactivate`);
  up = await req('PUT', `/api/v1/workflows/${WF_ID}`, step3);
  console.log('Deploy step3:', up.status);
  await req('POST', `/api/v1/workflows/${WF_ID}/activate`);

  test = await webhookPost({ task: 'Generate weekly revenue report' });
  console.log('Step3 test - HTTP:', test.status, 'Body length:', test.data.length);
  console.log('Step3 response:', test.data.substring(0, 500));

  if (test.data.length === 0) {
    console.log('\nFAIL: Claude API call crashes. Check $vars.ANTHROPIC_API_KEY in n8n.');
    console.log('Go to: n8n Settings → Variables → check ANTHROPIC_API_KEY exists');
    return;
  }
  console.log('OK: Claude API works!\n');

  // ======== STEP 4: Restore full workflow ========
  console.log('=== STEP 4: Restoring full workflow ===');
  const { readFileSync } = await import('fs');
  const fullJson = JSON.parse(readFileSync('n8n-workflows/00_agent_main_v3.json', 'utf8'));

  await req('POST', `/api/v1/workflows/${WF_ID}/deactivate`);
  up = await req('PUT', `/api/v1/workflows/${WF_ID}`, {
    name: fullJson.name, nodes: fullJson.nodes, connections: fullJson.connections,
    settings: { executionOrder: 'v1' }
  });
  console.log('Deploy full:', up.status);
  await req('POST', `/api/v1/workflows/${WF_ID}/activate`);

  test = await webhookPost({ task: 'Generate weekly revenue report' });
  console.log('Full test - HTTP:', test.status, 'Body length:', test.data.length);
  console.log('Full response:', test.data.substring(0, 1000));

  if (test.data.length === 0) {
    console.log('\nFAIL: Full workflow crashes after Claude. Issue is in Parse/Route/Execute/Evaluate chain.');
  } else {
    console.log('\nSUCCESS! Full workflow works end-to-end.');
  }
}

main().catch(e => console.error('Fatal:', e));
