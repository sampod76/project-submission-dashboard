module.exports = {
  apps: [
    {
      name: "doctor-tracking-dashboard",
      script: "server.js",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      restart_delay: 3000,

      max_memory_restart: "512M",

      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: 3000,
      },
    },
  ],
};
