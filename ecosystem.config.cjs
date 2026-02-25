module.exports = {
  apps: [
    {
      name: 'openclaw-monitor-server',
      cwd: '/Users/aaronan/.openclaw/workspace/projects/openclaw-monitor',
      script: 'npm',
      args: 'run dev:server',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        WS_PORT: 3012,
        DEMO_MODE: 'false',
        ENABLE_LOG_WATCHER: 'true'
      },
      restart_delay: 5000,
      max_restarts: 10,
      watch: false,
      autorestart: true
    },
    {
      name: 'openclaw-monitor-client',
      cwd: '/Users/aaronan/.openclaw/workspace/projects/openclaw-monitor',
      script: 'npm',
      args: 'run dev:client',
      interpreter: 'none',
      restart_delay: 5000,
      max_restarts: 10,
      watch: false,
      autorestart: true
    }
  ]
};
