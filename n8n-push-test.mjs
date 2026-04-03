import https from 'https';
import { readFileSync } from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YzFlYTNiOC1hYjdiLTRhYzgtYWQwZC1mMDMyZWVkZmZiNzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNWI1YTZjYjQtNjJmNi00MzIwLTljNzMtY2I4YWE5ZGNlMzNlIiwiaWF0IjoxNzc0MTMwNTkyLCJleHAiOjE3ODE4OTkyMDB9.cfEydwlhOYv3KWV-hXUk07roz4IAVblsEgD_UZuRcWw';

function req(method, path, body, host) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: host || 'profitlab.app.n8n.cloud', path, method,
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

async function main() {
  const json = JSON.parse(readFileSync('n8n-workflows/00_agent_main_v3.json', 'utf8'));

  await req('POST', '/api/v1/workflows/229WT1YDBRqqFPl3/deactivate');
  const up = await req('PUT', '/api/v1/workflows/229WT1YDBRqqFPl3', {
    name: json.name, nodes: json.nodes, connections: json.connections,
    settings: { executionOrder: 'v1' }
  });
  console.log('Update:', up.status);
  const act = await req('POST', '/api/v1/workflows/229WT1YDBRqqFPl3/activate');
  console.log('Activate:', act.status);

  console.log('\nTesting...');
  const test = await new Promise((resolve, reject) => {
    const body = JSON.stringify({task: 'Generate weekly revenue report'});
    const r = https.request({
      hostname: 'profitlab.app.n8n.cloud', path: '/webhook/agent-task', method: 'POST',
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
    r.write(body);
    r.end();
  });

  console.log('HTTP:', test.status);
  console.log('Body length:', test.data.length);
  console.log('Response:', test.data.substring(0, 1000));
}

main().catch(e => console.error('Fatal:', e));
