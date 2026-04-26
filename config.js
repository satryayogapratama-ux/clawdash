module.exports = {
  port: 3001,
  openclaw_api: process.env.OPENCLAW_API || 'http://localhost:9999',
  openclaw_token: process.env.OPENCLAW_TOKEN || '',
  refresh_interval: 5000,
};
