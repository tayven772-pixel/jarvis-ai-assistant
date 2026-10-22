#!/usr/bin/env node
/**
 * JARVIS remote MCP endpoint using Streamable HTTP's JSON response mode.
 * Requires JARVIS_MCP_TOKEN; never deploy this endpoint without a strong token.
 * Read-only tools only. No arbitrary shell, file writes, or device control.
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.JARVIS_MCP_TOKEN || '';
const SERVER_INFO = { name: 'jarvis-mcp-server', version: '0.2.0' };
const PROTOCOL_VERSION = '2024-11-05';

const tools = [
  { name: 'jarvis_status', description: 'Check whether the JARVIS MCP bridge is running and see its safe capabilities.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_check_local_ai', description: 'Check whether Ollama is reachable on this same host and list installed model names. Read-only.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'jarvis_connection_guide', description: 'Explain the current JARVIS MCP connection and safety limits.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
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
    'The endpoint requires a bearer token configured by the owner.',
    'Only read-only status and local Ollama discovery tools are exposed.',
    'This hosted server does not control the owner’s Android phone or Windows PC.',
  ].join('\n'));
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
  if (!TOKEN || TOKEN.length < 32) return send(res, 503, { error: 'Server authentication is not configured safely.' });
  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer ' + TOKEN) return send(res, 401, { error: 'Unauthorized' });
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
