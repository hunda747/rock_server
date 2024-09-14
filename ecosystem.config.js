module.exports = {
  apps: [
    {
      name: process.env.COMPANY_NAME,
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      args: ['--master'],
      env: {
        NODE_ENV: 'production',
        COMPANY_NAME: process.env.COMPANY_NAME,
        PORT: process.env.PORT,
      },
    },
    {
      name: `${process.env.COMPANY_NAME}-worker`,
      script: './index.js',
      instances: 3,
      exec_mode: 'cluster',
      args: ['--worker'],
      env: {
        NODE_ENV: 'production',
        COMPANY_NAME: process.env.COMPANY_NAME,
        PORT: process.env.PORT,
      },
    },
  ],
};