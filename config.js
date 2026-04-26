module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  openclaw_api: process.env.OPENCLAW_API || 'http://localhost:9999',
  openclaw_token: process.env.OPENCLAW_TOKEN || '',
  // Optional: set CLAWDASH_TOKEN env var to enable bearer auth on the dashboard
  dash_token: process.env.CLAWDASH_TOKEN || null,
  refresh_interval: 5000,
};
