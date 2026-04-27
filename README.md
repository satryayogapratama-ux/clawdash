# ClawDash - OpenClaw Real-Time Observability Dashboard

> **Status: Production · Self-hosted** — Actively used in production by the author. Open-source and available for deployment.

![Status](https://img.shields.io/badge/Status-Production%20Self--hosted-brightgreen.svg)

A lightweight, real-time web dashboard for monitoring OpenClaw deployments. ClawDash provides instant visibility into active sessions, token usage, costs, cron jobs, and workspace memory metrics.

## Features

- Real-time session monitoring with model and token tracking
- Token usage statistics and cost estimation
- Active cron job display with schedules and status
- Workspace memory analytics (MEMORY.md size, daily notes count)
- Live 24-hour token usage chart
- WebSocket-based automatic updates every 5 seconds
- Graceful fallback with mock data when OpenClaw API is unavailable
- Dark theme, responsive design (desktop and mobile)
- Zero external JavaScript dependencies (Chart.js via CDN)

## System Requirements

- Node.js 14.0 or higher
- OpenClaw 2026.x or compatible
- OpenClaw Gateway running (default: http://localhost:9999)

## Installation

```bash
cd clawdash
npm install
npm start
```

Dashboard will be available at: http://localhost:3001

## Configuration

Configure via environment variables:

```bash
export OPENCLAW_API=http://localhost:9999
export OPENCLAW_TOKEN=your_token_here
npm start
```

Or edit `config.js` directly for persistent configuration.

## Dashboard Metrics

### Summary Cards
- **Active Sessions**: Current number of running OpenClaw sessions
- **Total Tokens Today**: Cumulative token consumption for the day
- **Estimated Cost**: Daily cost estimation based on current token usage
- **Cron Jobs Active**: Count of scheduled cron jobs currently active

### Token Usage Chart
24-hour rolling chart showing token consumption trends over time.

### Active Sessions Table
- Session ID
- Model in use
- Tokens consumed
- Last activity timestamp

### Cron Jobs Table
- Job name
- Schedule (cron expression)
- Last execution time
- Current status

### Memory Panel
- MEMORY.md file size
- Total daily notes count
- Last updated timestamp

## Architecture

### Backend (server.js)
Express server with REST endpoints and WebSocket support:
- `GET /api/status` - OpenClaw gateway status
- `GET /api/sessions` - Active sessions list
- `GET /api/tokens` - Token usage statistics
- `GET /api/crons` - Cron jobs list
- `GET /api/memory` - Memory metrics
- `WS /ws` - Real-time updates

### Frontend (public/index.html)
Single-file HTML/CSS/JavaScript dashboard with:
- Live clock and connection status indicator
- Chart.js for token usage visualization
- Responsive grid layout
- Real-time WebSocket updates

## Graceful Degradation

If OpenClaw Gateway is unavailable, ClawDash automatically switches to mock data mode, allowing you to:
- Test the dashboard interface
- View demo metrics
- Verify connectivity when gateway comes back online

## Performance

- Minimal memory footprint
- Efficient WebSocket polling (5-second intervals)
- No database required
- Works seamlessly with existing OpenClaw deployments

## License

Proprietary Evaluation License. See LICENSE file for details.

## Troubleshooting

### Dashboard won't connect
1. Verify OpenClaw Gateway is running: `curl http://localhost:9999/api/status`
2. Check `OPENCLAW_API` environment variable matches your gateway URL
3. Ensure firewall allows connections to port 3001

### Mock data showing
This is normal when OpenClaw Gateway is unavailable. The dashboard will auto-connect once the gateway is back online.

### Port already in use
To use a different port, modify `config.js` or use environment variables in a future release.

---

For support and feature requests, visit the OpenClaw documentation or contact the development team.
