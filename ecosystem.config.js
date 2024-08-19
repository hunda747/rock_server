module.exports = {
  apps: [
    {
      name: 'master',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      args: ['--master'],
    },
    {
      name: 'worker',
      script: './index.js',
      instances: 3,
      exec_mode: 'cluster',
      args: ['--worker'],
    },
  ],
};