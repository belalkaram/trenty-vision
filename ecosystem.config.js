module.exports = {
  apps: [
    {
      name: 'kenooz-crm',
      script: 'dist/server.js',
      instances: 1, // Single instance to prevent conflicting WhatsApp sessions
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
