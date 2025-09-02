module.exports = {
  apps: [{
    name: 'invizio-wms',
    script: 'server.js',
    cwd: '/var/www/invizio-wms/server',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/invizio-wms/error.log',
    out_file: '/var/log/invizio-wms/out.log',
    log_file: '/var/log/invizio-wms/combined.log',
    time: true,
    
    // Restart policy
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};