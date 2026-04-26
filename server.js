const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data for fallback
const generateMockData = () => ({
  status: {
    uptime: Math.floor(Math.random() * 86400000),
    connections: Math.floor(Math.random() * 50) + 5,
    memory: Math.floor(Math.random() * 500) + 100,
    version: '2026.1.0',
    timestamp: new Date().toISOString(),
  },
  sessions: [
    { id: 'sess_001', model: 'claude-opus', tokens: 15420, lastActivity: new Date(Date.now() - 120000).toISOString(), status: 'active' },
    { id: 'sess_002', model: 'claude-sonnet', tokens: 8950, lastActivity: new Date(Date.now() - 300000).toISOString(), status: 'active' },
    { id: 'sess_003', model: 'claude-haiku', tokens: 3200, lastActivity: new Date(Date.now() - 600000).toISOString(), status: 'idle' },
    { id: 'sess_004', model: 'claude-opus', tokens: 22100, lastActivity: new Date(Date.now() - 45000).toISOString(), status: 'active' },
    { id: 'sess_005', model: 'claude-sonnet', tokens: 5600, lastActivity: new Date(Date.now() - 900000).toISOString(), status: 'idle' },
  ],
  tokens: {
    today: 55270,
    hourly: [4200, 3800, 5100, 4500, 3200, 4800, 5200, 4100, 3900, 4600, 5400, 4100],
    estimate: '$2.76',
    breakdown: {
      'claude-opus': 37520,
      'claude-sonnet': 14550,
      'claude-haiku': 3200,
    },
  },
  crons: [
    { id: 'cron_001', name: 'Daily Digest', schedule: '0 9 * * *', lastRun: new Date(Date.now() - 3600000).toISOString(), status: 'completed' },
    { id: 'cron_002', name: 'Cache Cleanup', schedule: '0 */6 * * *', lastRun: new Date(Date.now() - 7200000).toISOString(), status: 'completed' },
    { id: 'cron_003', name: 'Stats Sync', schedule: '*/30 * * * *', lastRun: new Date(Date.now() - 600000).toISOString(), status: 'running' },
    { id: 'cron_004', name: 'Backup Check', schedule: '0 2 * * 0', lastRun: new Date(Date.now() - 86400000).toISOString(), status: 'completed' },
  ],
  memory: {
    memory_md_size: 5240,
    daily_notes_count: 42,
    memory_path: '/root/.openclaw/workspace/MEMORY.md',
    lastUpdated: new Date().toISOString(),
  },
});

let mockData = generateMockData();
let isGatewayAvailable = false;

// API Routes

app.get('/api/status', async (req, res) => {
  try {
    const response = await fetch(`${config.openclaw_api}/api/status`, {
      timeout: 2000,
      headers: config.openclaw_token ? { Authorization: `Bearer ${config.openclaw_token}` } : {},
    });
    if (response.ok) {
      const data = await response.json();
      isGatewayAvailable = true;
      return res.json(data);
    }
  } catch (err) {
    isGatewayAvailable = false;
  }
  res.json(mockData.status);
});

app.get('/api/sessions', async (req, res) => {
  try {
    const response = await fetch(`${config.openclaw_api}/api/sessions`, {
      timeout: 2000,
      headers: config.openclaw_token ? { Authorization: `Bearer ${config.openclaw_token}` } : {},
    });
    if (response.ok) {
      const data = await response.json();
      isGatewayAvailable = true;
      return res.json(data);
    }
  } catch (err) {
    isGatewayAvailable = false;
  }
  res.json({ sessions: mockData.sessions });
});

app.get('/api/tokens', async (req, res) => {
  try {
    const response = await fetch(`${config.openclaw_api}/api/tokens`, {
      timeout: 2000,
      headers: config.openclaw_token ? { Authorization: `Bearer ${config.openclaw_token}` } : {},
    });
    if (response.ok) {
      const data = await response.json();
      isGatewayAvailable = true;
      return res.json(data);
    }
  } catch (err) {
    isGatewayAvailable = false;
  }
  res.json(mockData.tokens);
});

app.get('/api/crons', async (req, res) => {
  try {
    const response = await fetch(`${config.openclaw_api}/api/crons`, {
      timeout: 2000,
      headers: config.openclaw_token ? { Authorization: `Bearer ${config.openclaw_token}` } : {},
    });
    if (response.ok) {
      const data = await response.json();
      isGatewayAvailable = true;
      return res.json(data);
    }
  } catch (err) {
    isGatewayAvailable = false;
  }
  res.json({ crons: mockData.crons });
});

app.get('/api/memory', (req, res) => {
  const memoryPath = '/root/.openclaw/workspace/MEMORY.md';
  const memoryDir = '/root/.openclaw/workspace/memory';

  const data = { ...mockData.memory };

  try {
    if (fs.existsSync(memoryPath)) {
      const stats = fs.statSync(memoryPath);
      data.memory_md_size = stats.size;
    }
  } catch (err) {
    // Use mock data
  }

  try {
    if (fs.existsSync(memoryDir)) {
      const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.md'));
      data.daily_notes_count = files.length;
    }
  } catch (err) {
    // Use mock data
  }

  data.lastUpdated = new Date().toISOString();
  res.json(data);
});

app.get('/api/gateway-status', (req, res) => {
  res.json({ available: isGatewayAvailable });
});

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  const interval = setInterval(() => {
    const update = {
      timestamp: new Date().toISOString(),
      gatewayAvailable: isGatewayAvailable,
      data: mockData,
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(update));
    }
  }, config.refresh_interval);

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clearInterval(interval);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clearInterval(interval);
  });
});

// Periodic mock data refresh (for when API is unavailable)
setInterval(() => {
  mockData = generateMockData();
}, 10000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ClawDash — OpenClaw Real-Time Observability Dashboard`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  URL:       http://localhost:${PORT}`);
  console.log(`  Gateway:   ${config.openclaw_api}`);
  console.log(`  Refresh:   ${config.refresh_interval}ms`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
