const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, verifyClient: verifyWsOrigin });

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const DASH_TOKEN = process.env.CLAWDASH_TOKEN || config.dash_token || null;

function requireAuth(req, res, next) {
  if (!DASH_TOKEN) return next(); // no token configured = local-only mode
  const auth = req.headers['authorization'] || '';
  if (auth === `Bearer ${DASH_TOKEN}`) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ─── WebSocket Origin Check ───────────────────────────────────────────────────
function verifyWsOrigin(info) {
  if (!DASH_TOKEN) return true; // local-only mode, skip check
  const origin = info.origin || '';
  const allowed = [`http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`];
  return allowed.includes(origin);
}

// Middleware — no CORS (localhost only), parse JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ──────────────────────────────────────────────────────────────────
let isGatewayAvailable = false;

async function proxyGateway(endpoint, res, fallback) {
  try {
    const response = await fetch(`${config.openclaw_api}${endpoint}`, {
      timeout: 2000,
      headers: config.openclaw_token ? { Authorization: `Bearer ${config.openclaw_token}` } : {},
    });
    if (response.ok) {
      isGatewayAvailable = true;
      return res.json(await response.json());
    }
  } catch (_) {
    isGatewayAvailable = false;
  }
  // Explicit error instead of silent mock fallback
  res.status(503).json({ error: 'OpenClaw gateway unavailable', fallback });
}

// ─── API Routes (auth-protected) ──────────────────────────────────────────────
app.get('/api/status',   requireAuth, (req, res) => proxyGateway('/api/status',   res, null));
app.get('/api/sessions', requireAuth, (req, res) => proxyGateway('/api/sessions', res, { sessions: [] }));
app.get('/api/tokens',   requireAuth, (req, res) => proxyGateway('/api/tokens',   res, null));
app.get('/api/crons',    requireAuth, (req, res) => proxyGateway('/api/crons',     res, { crons: [] }));

app.get('/api/memory', requireAuth, (req, res) => {
  const memoryPath = '/root/.openclaw/workspace/MEMORY.md';
  const memoryDir  = '/root/.openclaw/workspace/memory';
  const data = { memory_path: memoryPath, memory_md_size: 0, daily_notes_count: 0, lastUpdated: new Date().toISOString() };
  try { if (fs.existsSync(memoryPath)) data.memory_md_size = fs.statSync(memoryPath).size; } catch (_) {}
  try { if (fs.existsSync(memoryDir))  data.daily_notes_count = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).length; } catch (_) {}
  res.json(data);
});

app.get('/api/gateway-status', requireAuth, (req, res) => {
  res.json({ available: isGatewayAvailable });
});

// ─── Health (no auth — safe, no data) ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  // Token check on WS upgrade (via ?token= query param)
  if (DASH_TOKEN) {
    const url = new URL(req.url, `http://localhost:${config.port}`);
    const token = url.searchParams.get('token');
    if (token !== DASH_TOKEN) {
      ws.close(4401, 'Unauthorized');
      return;
    }
  }

  console.log('[WS] Client connected');

  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        timestamp: new Date().toISOString(),
        gatewayAvailable: isGatewayAvailable,
      }));
    }
  }, config.refresh_interval);

  ws.on('close', () => { console.log('[WS] Client disconnected'); clearInterval(interval); });
  ws.on('error', (err) => { console.error('[WS] Error:', err.message); clearInterval(interval); });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = config.port;
const HOST = '127.0.0.1'; // bind localhost only — not 0.0.0.0

server.listen(PORT, HOST, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ClawDash — OpenClaw Real-Time Observability Dashboard`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  URL:       http://${HOST}:${PORT}`);
  console.log(`  Gateway:   ${config.openclaw_api}`);
  console.log(`  Auth:      ${DASH_TOKEN ? 'Bearer token required' : 'local-only (no token)'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
