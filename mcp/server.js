#!/usr/bin/env node
/**
 * JARVIS MCP server (stdio transport).
 * Safe starter tools only: reports server status and checks a local Ollama endpoint.
 * stdout is reserved for MCP JSON-RPC messages.
 */
import readline from 'node:readline';

const SERVER_INFO = { name: 'jarvis-mcp-server', version: '0.1.0' };
const PROTOCOL_VERSION = '2024-11-05';

const tools = [
  { name: 'jarvis_status', description: 'Check whether the JARVIS MCP bridge is running and see its safe capabilities.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  {
    name: 'jarvis_check_local_ai',
    description: 'Check whether Ollama is reachable on this computer and list installed model names. Read-only; does not start or install anything.',
    inputSchema: { type: 'object', properties: { baseUrl: { type: 'string', description: 'Optional Ollama URL; defaults to http://127.0.0.1:11434' } }, additionalProperties: false },
  },
  { name: 'jarvis_connection_guide', description: 'Explain how to connect this local JARVIS MCP server to a compatible MCP client.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
];

function resultText(text) {
  return { content: [{ type: 'text', text }], isError: false };
}

async function callTool(name, args = {}) {
  if (name === 'jarvis_status') {
    return resultText(JSON.stringify({
      status: 'online', server: SERVER_INFO.name, version: SERVER_INFO.version, transport: 'stdio',
      availableTools: tools.map((tool) => tool.name),
      permissions: 'read-only starter tools; no arbitrary shell, file writes, or device control',
    }, null, 2));
  }

  if (name === 'jarvis_check_local_ai') {
    const baseUrl = String(args.baseUrl || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    let parsed;
    try { parsed = new URL(baseUrl); } catch {
      return { content: [{ type: 'text', text: 'Invalid URL. Use a local Ollama URL such as http://127.0.0.1:11434.' }], isError: true };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { content: [{ type: 'text', text: 'Only HTTP or HTTPS URLs are supported.' }], isError: true };
    }
    try {
      const response = await fetch(baseUrl + '/api/tags', { signal: AbortSignal.timeout(3500) });
      if (!response.ok) return resultText('Ollama responded with HTTP ' + response.status + '.');
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models.map((model) => model.name).filter(Boolean) : [];
      return resultText(JSON.stringify({ reachable: true, endpoint: baseUrl, models,
        message: models.length ? 'Ollama is reachable and has models installed.' : 'Ollama is reachable, but no installed models were reported.' }, null, 2));
    } catch (error) {
      return resultText(JSON.stringify({ reachable: false, endpoint: baseUrl,
        message: 'Could not reach Ollama. Check that it is installed and running on this same computer.',
        detail: error?.name === 'TimeoutError' ? 'Connection timed out.' : 'Connection failed.' }, null, 2));
    }
  }

  if (name === 'jarvis_connection_guide') {
    return resultText([
      'JARVIS MCP Server uses the local stdio transport.',
      '1. Install Node.js 20 or newer.',
      '2. Clone the jarvis-ai-assistant repository and run npm install.',
      '3. Configure your MCP client to launch node with the absolute path to mcp/server.js as its argument.',
      '4. Restart the MCP client and approve the JARVIS tools.',
      'This local stdio version is suitable for MCP clients that can launch local processes. ChatGPT remote MCP connections require a separately hosted, reachable server using a supported remote transport; this local process is not directly reachable by ChatGPT.',
      'Only read-only status and local-model discovery tools are exposed in this starter version.',
    ].join('\n'));
  }
  return { content: [{ type: 'text', text: 'Unknown tool: ' + name }], isError: true };
}

function send(message) { process.stdout.write(JSON.stringify(message) + '\n'); }
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async (line) => {
  let request;
  try { request = JSON.parse(line); } catch { return; }
  const { id, method, params = {} } = request;
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: {
      protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions: 'JARVIS read-only MCP bridge. This server does not expose device control.',
    }});
    return;
  }
  if (method === 'ping') { send({ jsonrpc: '2.0', id, result: {} }); return; }
  if (method === 'tools/list') { send({ jsonrpc: '2.0', id, result: { tools } }); return; }
  if (method === 'tools/call') {
    try { send({ jsonrpc: '2.0', id, result: await callTool(params.name, params.arguments || {}) }); }
    catch { send({ jsonrpc: '2.0', id, error: { code: -32603, message: 'Tool execution failed.' } }); }
    return;
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
});
