// Smoke test: drive the MCP server over stdio — initialize, tools/list, lint call.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const srv = spawn('node', ['src/server.mjs'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] });
let buf = ''; const got = [];
srv.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) got.push(JSON.parse(l)); } });
const send = (m) => srv.stdin.write(JSON.stringify(m) + '\n');
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
send({ jsonrpc: '2.0', method: 'notifications/initialized' });
setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'tools/list' }), 200);
setTimeout(() => send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'lint_artifact', arguments: { format: 'openapi', content: 'openapi: "3.0.3"\ninfo: {title: T, version: "1"}\npaths: {}\n' } } }), 400);
setTimeout(() => {
  srv.kill();
  const tools = got.find((g) => g.id === 2)?.result?.tools?.map((t) => t.name) || [];
  const call = JSON.parse(got.find((g) => g.id === 3)?.result?.content?.[0]?.text || '{}');
  const ok = got.find((g) => g.id === 1)?.result && tools.includes('lint_artifact') && tools.includes('validate_ruleset') && typeof call.total === 'number';
  console.log('tools:', tools.join(', '), '| lint findings:', call.total);
  if (!ok) { console.error('SMOKE FAILED'); process.exit(1); }
  console.log('smoke ok');
  process.exit(0);
}, 1200);
