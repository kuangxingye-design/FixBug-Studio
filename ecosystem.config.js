module.exports = {
  apps: [
    {
      name: "blog",
      script: "node_modules/.bin/next",
      args: "start -H 127.0.0.1",
      cwd: "/workspaces/FixBug-Studio",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
    },
  ],
};
