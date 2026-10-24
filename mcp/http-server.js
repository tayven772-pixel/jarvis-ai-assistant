#!/usr/bin/env node
/**
 * JARVIS remote MCP endpoint using Streamable HTTP's JSON response mode.
 * Public endpoint: no bearer token required. Exposes read-only tools only.
 * Read-only tools only. No arbitrary shell, file writes, or device control.
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const SERVER_INFO = { name: 'jarvis-mcp-server', version: '0.3.0' };
const PROTOCOL_VERSION = '2024-11-05';

const tools = [
  { name: 'jarvis_status', description: 'Check whether the JARVIS MCP bridge is running and see its safe capabilities.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_check_local_ai', description: 'Check whether Ollama is reachable on this same host and list installed model names. Read-only.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_connection_guide', description: 'Explain the current JARVIS MCP connection and safety limits.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_server_time', description: 'Get the current UTC time and date from the hosted MCP server.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_capabilities', description: 'List what this hosted MCP server can and cannot do, including its security boundaries.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_provider_guide', description: 'Give a safe checklist for configuring AI providers in the JARVIS app on Android or Windows.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_troubleshoot', description: 'Return a read-only checklist for common JARVIS MCP connection problems.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
];

function resultText(text, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

async function callTool(name) {
  if (name === 'jarvis_status') return resultText(JSON.stringify({
    status: 'online', server: SERVER_INFO.name, version: SERVER_INFO.version,
    transport: 'streamable-http', availableTools: tools.map((tool) => tool.name),
    permissions: 'read-only starter tools; no arbitrary shell, file writes, or device control',
  }, null, 2));
  if (name === 'jarvis_check_local_ai') {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2500) });
      if (!response.ok) return resultText('Local Ollama responded with HTTP ' + response.status + '.');
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models.map((model) => model.name).filter(Boolean) : [];
      return resultText(JSON.stringify({ reachable: true, models, message: models.length ? 'Ollama is reachable and has models installed.' : 'Ollama is reachable, but no installed models were reported.' }, null, 2));
    } catch {
      return resultText(JSON.stringify({ reachable: false, endpoint: '127.0.0.1:11434', message: 'No local Ollama service was reachable on the hosting server.' }, null, 2));
    }
  }
  if (name === 'jarvis_connection_guide') return resultText([
    'This is the hosted JARVIS MCP endpoint using Streamable HTTP.',
    'This endpoint is public and does not require a bearer token.',
    'Tools are read-only and do not expose arbitrary shell commands, file writes, or device control.',
    'This hosted server does not control the owner’s Android phone or Windows PC.',
  ].join('\\n'));
  if (name === 'jarvis_server_time') return resultText(JSON.stringify({
    utc: new Date().toISOString(),
    timezone: 'UTC',
    note: 'This is the hosted server time, not necessarily the user device local time.',
  }, null, 2));
  if (name === 'jarvis_capabilities') return resultText(JSON.stringify({
    available: ['MCP health and status', 'Hosted server UTC time', 'Read-only local Ollama discovery on the host', 'AI provider setup guidance', 'MCP troubleshooting checklist'],
    unavailable: ['Controlling Android or Windows devices', 'Executing shell commands', 'Reading or writing arbitrary files', 'Managing API keys or accounts', 'Calling private local services on the user device'],
    security: ['Public endpoint: do not add secrets to tool arguments.', 'Only fixed, read-only operations are exposed.', 'The Ollama check targets localhost on the hosted server, not the user phone or PC.'],
  }, null, 2));
  if (name === 'jarvis_provider_guide') return resultText([
    'JARVIS AI provider setup checklist:',
    '1. Open JARVIS Settings > Configure AI link.',
    '2. Select a provider supported by the installed app build.',
    '3. Create an API key on that provider’s official developer site; never paste keys into MCP chat or commit them to GitHub.',
    '4. Enter a model ID supported by that provider account.',
    '5. Save and send a simple test prompt; check provider usage limits if it fails.',
    'For custom OpenAI-compatible endpoints, verify the HTTPS base URL and documented /chat/completions support. Auto-detect additionally requires /models.',
    'On Android, 127.0.0.1 refers to the phone itself; on Windows, it refers to that Windows computer.',
    'API access may be billed separately from a consumer chat subscription. Review the provider’s current pricing.',
  ].join('\\n'));
  if (name === 'jarvis_troubleshoot') return resultText(JSON.stringify({
    endpoint: 'https://jarvis-mcp-remote.onrender.com/mcp',
    checks: [
      'Confirm the Render service is deployed and /health returns status ok.',
      'In Claude, use Streamable HTTP and No sign-in for this public endpoint.',
      'A browser GET to /mcp may return 405 because MCP requests use POST; use /health to check basic uptime.',
      'If the connector fails after health succeeds, inspect Claude’s connector error details and retry after a Render cold start if needed.',
    ],
    security: 'The endpoint is public. Do not send API keys, passwords, or private data in tool calls.',
  }, null, 2));
  return resultText('Unknown tool: ' + name, true);
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
function error(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

const server = http.createServer(async (req, res) => {
  // Parse only the pathname so query strings or a trailing slash don't break routing.
  let pathname;
  try { pathname = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/'; }
  catch { pathname = '/'; }
  if ((pathname === '/health' || pathname === '/healthz') && req.method === 'GET') {
    return send(res, 200, { status: 'ok', service: SERVER_INFO.name });
  }
  if (pathname === '/' && req.method === 'GET') {
    return send(res, 200, { service: SERVER_INFO.name, status: 'online', health: '/health', mcp: '/mcp' });
  }
  if (pathname !== '/mcp') return send(res, 404, { error: 'Not found', path: pathname });
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return send(res, 405, { error: 'Use POST for MCP requests.' });
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return send(res, 415, { error: 'Content-Type must be application/json.' });
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) return send(res, 413, { error: 'Request too large.' });
  }
  let request;
  try { request = JSON.parse(raw); } catch { return send(res, 400, error(null, -32700, 'Parse error')); }
  if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') return send(res, 400, error(request?.id, -32600, 'Invalid request'));
  const { id, method, params = {} } = request;
  if (method.startsWith('notifications/')) return send(res, 202);
  if (method === 'initialize') {
    return send(res, 200, { jsonrpc: '2.0', id, result: {
      protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO, instructions: 'JARVIS read-only MCP bridge. No device control is exposed.',
    }});
  }
  if (method === 'ping') return send(res, 200, { jsonrpc: '2.0', id, result: {} });
  if (method === 'tools/list') return send(res, 200, { jsonrpc: '2.0', id, result: { tools } });
  if (method === 'tools/call') {
    if (!params || typeof params.name !== 'string' || (params.arguments && Object.keys(params.arguments).length)) {
      return send(res, 200, error(id, -32602, 'Tool arguments are not supported; call tools without arguments.'));
    }
    return send(res, 200, { jsonrpc: '2.0', id, result: await callTool(params.name) });
  }
  return send(res, 200, error(id, -32601, 'Method not found: ' + method));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('JARVIS remote MCP server listening on port ' + PORT);
});
