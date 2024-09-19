const company = process.env.COMPANY_NAME;

module.exports = {
  apps: [
    {
      name: 'Chess',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      args: '--master',
      env: {
        NODE_ENV: 'production',
        COMPANY_NAME: 'Chess',
        PORT: process.env.PORT,
      },
    },
    {
      name: `chess-worker`,
      script: './index.js',
      instances: 3,
      exec_mode: 'cluster',
      args: '--worker',
      env: {
        NODE_ENV: 'production',
        COMPANY_NAME: 'chess',
        // PORT: process.env.PORT,
      },
    },
  ],
};